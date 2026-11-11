import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import matter from 'gray-matter';
import os from 'os';
import { contractHome } from './config.js';

/**
 * Validate Anthropic Agent Skills Specification
 * Checks frontmatter compliance, description quality, and markdown structure
 */
export function validateSkillSpec(skillName, data = {}, markdownBody = '') {
  const issues = [];
  const name = data.name || skillName;
  const isKebab = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name);
  if (!isKebab) {
    issues.push('Name should be lowercase kebab-case (e.g. pr-review-helper)');
  }
  const desc = data.description || '';
  if (!desc.trim()) {
    issues.push('Missing description in frontmatter');
  } else if (desc.length < 15) {
    issues.push('Description is short; explain when the AI agent should trigger this skill');
  }
  const hasHeadings = /^(#{1,3})\s+/m.test(markdownBody || '');
  if (!hasHeadings && (!markdownBody || markdownBody.length < 40)) {
    issues.push('Documentation lacks markdown sections (## Instructions, ## Usage)');
  }
  return {
    isValid: issues.length === 0,
    issues,
    badge: issues.length === 0 ? 'Spec Valid' : `${issues.length} Notice${issues.length > 1 ? 's' : ''}`
  };
}

// Helper to safely find SKILL.md in a directory
function findSkillFile(dirPath) {
  const candidates = ['SKILL.md', 'skill.md', 'Skill.md'];
  for (const c of candidates) {
    const full = path.join(dirPath, c);
    if (fs.existsSync(full)) {
      return full;
    }
  }
  return null;
}

// Helper to count files and subfolders
function inspectSkillDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    let fileCount = 0;
    const files = [];

    for (const item of items) {
      if (item.name === '.DS_Store' || item.name === '.git') continue;
      files.push({
        name: item.name,
        isDirectory: item.isDirectory()
      });
      fileCount++;
    }
    return { fileCount, files };
  } catch (err) {
    return { fileCount: 0, files: [] };
  }
}

// Resilient frontmatter parser that handles unquoted colons and special YAML edge cases
function safeParseMatter(raw) {
  if (!raw || typeof raw !== 'string') {
    return { data: {}, content: '' };
  }

  try {
    return matter(raw);
  } catch (yamlErr) {
    // Fallback: manually parse frontmatter when YAML contains unquoted colons like "roles: Create"
    try {
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
      if (match) {
        const frontmatterBlock = match[1];
        const markdownBody = match[2] || '';
        const data = {};

        // Extract description
        const descMatch = frontmatterBlock.match(/description:\s*([\s\S]*?)(?=\n[a-zA-Z0-9_-]+:|\r?\n$|$)/);
        if (descMatch) {
          data.description = descMatch[1].trim().replace(/^["']|["']$/g, '');
        }

        // Extract name
        const nameMatch = frontmatterBlock.match(/name:\s*(.*)/);
        if (nameMatch) {
          data.name = nameMatch[1].trim().replace(/^["']|["']$/g, '');
        }

        // Extract license
        const licMatch = frontmatterBlock.match(/license:\s*(.*)/);
        if (licMatch) {
          data.license = licMatch[1].trim().replace(/^["']|["']$/g, '');
        }

        // Extract version
        const verMatch = frontmatterBlock.match(/version:\s*(.*)/);
        if (verMatch) {
          data.version = verMatch[1].trim().replace(/^["']|["']$/g, '');
        }

        // Extract author
        const authMatch = frontmatterBlock.match(/author:\s*(.*)/);
        if (authMatch) {
          data.author = authMatch[1].trim().replace(/^["']|["']$/g, '');
        }

        return { data, content: markdownBody };
      }
    } catch (fallbackErr) {}

    return { data: {}, content: raw };
  }
}

export function scanPlatforms(platforms) {
  const skillsMap = new Map();
  const platformStats = [];

  for (const platform of platforms) {
    const pPath = platform.expandedPath;
    const exists = fs.existsSync(pPath);
    let count = 0;

    platformStats.push({
      id: platform.id,
      name: platform.name,
      badge: platform.badge,
      path: platform.path,
      expandedPath: pPath,
      color: platform.color,
      icon: platform.icon,
      exists,
      count: 0
    });

    if (!exists) continue;

    try {
      const entries = fs.readdirSync(pPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

        const entryPath = path.join(pPath, entry.name);
        let isSymlink = false;
        let symlinkTarget = null;
        let resolvedPath = entryPath;
        let isValid = true;

        try {
          const lstat = fs.lstatSync(entryPath);
          if (lstat.isSymbolicLink()) {
            isSymlink = true;
            try {
              symlinkTarget = fs.readlinkSync(entryPath);
              resolvedPath = fs.realpathSync(entryPath);
            } catch (err) {
              isValid = false;
            }
          } else if (!lstat.isDirectory()) {
            continue; // Not a skill folder
          }
        } catch (err) {
          continue;
        }

        const skillFile = findSkillFile(entryPath);
        if (!skillFile && !isSymlink) {
          // If not a symlink and doesn't have SKILL.md, skip non-skill folders
          continue;
        }

        let parsed = { data: {}, content: '' };
        let fileHash = null;
        let mtime = null;
        let fileSize = 0;
        if (skillFile && isValid) {
          try {
            const raw = fs.readFileSync(skillFile, 'utf-8');
            parsed = safeParseMatter(raw);
            fileHash = crypto.createHash('md5').update(raw).digest('hex');
            const stat = fs.statSync(skillFile);
            mtime = stat.mtime.toISOString();
            fileSize = stat.size;
          } catch (err) {
            // Silently recover
          }
        }

        const skillName = entry.name;
        const displayName = parsed.data.name || skillName;
        const description = parsed.data.description || '';
        const metadata = {
          version: parsed.data.version || parsed.data.metadata?.version || '1.0',
          author: parsed.data.author || parsed.data.metadata?.author || '',
          license: parsed.data.license || '',
          tools: parsed.data.tools || [],
          tags: parsed.data.tags || []
        };

        const { fileCount, files } = inspectSkillDirectory(entryPath);

        count++;

        if (!skillsMap.has(skillName)) {
          skillsMap.set(skillName, {
            name: skillName,
            displayName,
            description,
            metadata,
            hasSkillFile: !!skillFile,
            platforms: {},
            allPlatformsCount: 0,
            hasSymlink: false,
            primaryPath: entryPath
          });
        }

        const skill = skillsMap.get(skillName);
        if (!skill.description && description) {
          skill.description = description;
        }
        if (!skill.metadata.author && metadata.author) {
          skill.metadata = metadata;
        }

        skill.platforms[platform.id] = {
          installed: true,
          isSymlink,
          symlinkTarget,
          symlinkDisplay: symlinkTarget ? contractHome(path.resolve(path.dirname(entryPath), symlinkTarget)) : null,
          resolvedPath,
          path: entryPath,
          displayPath: contractHome(entryPath),
          isValid,
          fileCount,
          files,
          fileHash,
          shortHash: fileHash ? fileHash.slice(0, 7) : null,
          mtime,
          fileSize
        };

        if (isSymlink) skill.hasSymlink = true;
        skill.allPlatformsCount++;
      }
    } catch (err) {
      console.error(`Error scanning platform ${platform.id}:`, err);
    }

    const stat = platformStats.find(p => p.id === platform.id);
    if (stat) stat.count = count;
  }

  // Compute cross-platform drift and specification compliance (inspired by skilldock & anthropics/skills)
  for (const skill of skillsMap.values()) {
    const installed = Object.values(skill.platforms).filter(p => p.installed && p.isValid);
    const hashes = new Set();
    for (const inst of installed) {
      if (inst.fileHash) hashes.add(inst.fileHash);
    }
    // Drift occurs when skill is installed in >1 platform with differing content hashes
    skill.hasDrift = hashes.size > 1;
    skill.driftCount = hashes.size;
    skill.specValidation = validateSkillSpec(skill.name, skill.metadata, skill.description);
  }

  // Convert map to sorted array
  const skillsList = Array.from(skillsMap.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );

  return {
    skills: skillsList,
    platforms: platformStats,
    totalSkills: skillsList.length
  };
}

export function getSkillDetail(skillName, platforms, preferredPlatformId) {
  for (const platform of platforms) {
    if (preferredPlatformId && platform.id !== preferredPlatformId) continue;

    const skillDir = path.join(platform.expandedPath, skillName);
    if (!fs.existsSync(skillDir)) continue;

    const skillFile = findSkillFile(skillDir);
    let rawContent = '';
    let parsed = { data: {}, content: '' };

    if (skillFile) {
      try {
        rawContent = fs.readFileSync(skillFile, 'utf-8');
        parsed = safeParseMatter(rawContent);
      } catch (err) {
        // Silently recover
      }
    }

    const { fileCount, files } = inspectSkillDirectory(skillDir);

    let isSymlink = false;
    let symlinkTarget = null;
    let resolvedPath = skillDir;

    try {
      const lstat = fs.lstatSync(skillDir);
      if (lstat.isSymbolicLink()) {
        isSymlink = true;
        symlinkTarget = fs.readlinkSync(skillDir);
        resolvedPath = fs.realpathSync(skillDir);
      }
    } catch (err) {}

    const allInstallations = [];
    const hashes = new Set();
    for (const p of platforms) {
      const pDir = path.join(p.expandedPath, skillName);
      if (fs.existsSync(pDir)) {
        let isLink = false;
        let fileHash = null;
        let mtime = null;
        let fileSize = 0;
        try {
          isLink = fs.lstatSync(pDir).isSymbolicLink();
          const targetSkillFile = findSkillFile(pDir);
          if (targetSkillFile) {
            fileHash = crypto.createHash('md5').update(fs.readFileSync(targetSkillFile)).digest('hex');
            hashes.add(fileHash);
            const stat = fs.statSync(targetSkillFile);
            mtime = stat.mtime.toISOString();
            fileSize = stat.size;
          }
        } catch (e) {}
        allInstallations.push({
          platformId: p.id,
          platformName: p.name,
          badge: p.badge,
          color: p.color,
          path: p.path,
          expandedPath: p.expandedPath,
          dirPath: pDir,
          isSymlink: isLink,
          fileHash,
          shortHash: fileHash ? fileHash.slice(0, 7) : null,
          mtime,
          fileSize
        });
      }
    }

    const hasDrift = hashes.size > 1;
    const specValidation = validateSkillSpec(skillName, parsed.data, parsed.content);

    return {
      name: skillName,
      displayName: parsed.data.name || skillName,
      description: parsed.data.description || '',
      frontmatter: parsed.data,
      markdownBody: parsed.content,
      rawContent,
      skillFilePath: skillFile,
      isSymlink,
      symlinkTarget,
      resolvedPath,
      dirPath: skillDir,
      platformId: platform.id,
      platformName: platform.name,
      files,
      fileCount,
      allInstallations,
      hasDrift,
      driftCount: hashes.size,
      specValidation
    };
  }

  return null;
}

export function linkSkill({ skillName, sourcePlatformPath, targetPlatformPath, makeSharedCanonical, sharedPath }) {
  if (!fs.existsSync(targetPlatformPath)) {
    fs.mkdirSync(targetPlatformPath, { recursive: true });
  }

  const sourceDir = path.join(sourcePlatformPath, skillName);
  const targetDir = path.join(targetPlatformPath, skillName);

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source skill directory does not exist: ${sourceDir}`);
  }

  if (fs.existsSync(targetDir)) {
    // Check if target is already a symlink or directory
    const lstat = fs.lstatSync(targetDir);
    if (lstat.isSymbolicLink()) {
      fs.unlinkSync(targetDir);
    } else {
      throw new Error(`Target skill already exists: ${targetDir}. Please move or delete it first.`);
    }
  }

  let canonicalPath = sourceDir;

  if (makeSharedCanonical && sharedPath) {
    if (!fs.existsSync(sharedPath)) {
      fs.mkdirSync(sharedPath, { recursive: true });
    }
    const sharedTarget = path.join(sharedPath, skillName);

    // If sourceDir is NOT already in sharedPath
    if (path.resolve(sourceDir) !== path.resolve(sharedTarget)) {
      if (!fs.existsSync(sharedTarget)) {
        // Move or copy physical files into sharedPath
        const realSource = fs.realpathSync(sourceDir);
        fs.cpSync(realSource, sharedTarget, { recursive: true });
      }

      // Re-link sourceDir to sharedTarget
      const sourceLstat = fs.lstatSync(sourceDir);
      if (sourceLstat.isSymbolicLink()) {
        fs.unlinkSync(sourceDir);
      } else {
        // Backup original directory by moving to trash or rename
        fs.rmSync(sourceDir, { recursive: true, force: true });
      }
      fs.symlinkSync(sharedTarget, sourceDir, 'dir');
    }
    canonicalPath = sharedTarget;
  } else {
    canonicalPath = fs.realpathSync(sourceDir);
  }

  // Create symlink in targetPlatform
  fs.symlinkSync(canonicalPath, targetDir, 'dir');

  return { success: true, targetDir, canonicalPath };
}

export function copySkill({ skillName, sourcePlatformPath, targetPlatformPath, overwrite = false }) {
  if (!fs.existsSync(targetPlatformPath)) {
    fs.mkdirSync(targetPlatformPath, { recursive: true });
  }

  const sourceDir = path.join(sourcePlatformPath, skillName);
  const targetDir = path.join(targetPlatformPath, skillName);

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source skill not found: ${sourceDir}`);
  }

  if (fs.existsSync(targetDir)) {
    if (!overwrite) {
      throw new Error(`Target skill "${skillName}" already exists in destination.`);
    }
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  const realSource = fs.realpathSync(sourceDir);
  fs.cpSync(realSource, targetDir, { recursive: true });

  return { success: true, targetDir };
}

export function moveSkill({ skillName, sourcePlatformPath, targetPlatformPath }) {
  const sourceDir = path.join(sourcePlatformPath, skillName);
  const targetDir = path.join(targetPlatformPath, skillName);

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source skill not found: ${sourceDir}`);
  }

  if (fs.existsSync(targetDir)) {
    throw new Error(`Target already exists: ${targetDir}`);
  }

  if (!fs.existsSync(targetPlatformPath)) {
    fs.mkdirSync(targetPlatformPath, { recursive: true });
  }

  const lstat = fs.lstatSync(sourceDir);
  if (lstat.isSymbolicLink()) {
    // If it's a symlink, create a new symlink at target and remove the old symlink
    const targetLink = fs.readlinkSync(sourceDir);
    fs.symlinkSync(targetLink, targetDir, 'dir');
    fs.unlinkSync(sourceDir);
  } else {
    fs.renameSync(sourceDir, targetDir);
  }

  return { success: true, targetDir };
}

export function trashSkill({ skillName, platformPath }) {
  const targetDir = path.join(platformPath, skillName);

  if (!fs.existsSync(targetDir)) {
    throw new Error(`Skill folder does not exist: ${targetDir}`);
  }

  const lstat = fs.lstatSync(targetDir);
  if (lstat.isSymbolicLink()) {
    // For symlinks, we simply remove the link without touching canonical files
    fs.unlinkSync(targetDir);
    return { success: true, unlinked: true };
  }

  // Safe removal to ~/.Trash or platform .trash
  const homeDir = process.env.HOST_HOME || os.homedir();
  const trashDir = path.join(homeDir, '.Trash');

  const removeOrMove = (source, dest) => {
    try {
      fs.renameSync(source, dest);
      return true;
    } catch (err) {
      // EXDEV fallback for cross-device moves or Docker volume mounts
      try {
        fs.cpSync(source, dest, { recursive: true });
        fs.rmSync(source, { recursive: true, force: true });
        return true;
      } catch (cpErr) {
        return false;
      }
    }
  };

  if (fs.existsSync(trashDir)) {
    const trashTarget = path.join(trashDir, `${skillName}-${Date.now()}`);
    if (removeOrMove(targetDir, trashTarget)) {
      return { success: true, trashedTo: trashTarget };
    }
  }

  // Fallback: platform .trash folder
  try {
    const fallbackTrash = path.join(platformPath, '.trash');
    if (!fs.existsSync(fallbackTrash)) fs.mkdirSync(fallbackTrash, { recursive: true });
    const fallbackTarget = path.join(fallbackTrash, `${skillName}-${Date.now()}`);
    if (removeOrMove(targetDir, fallbackTarget)) {
      return { success: true, trashedTo: fallbackTarget };
    }
  } catch (err) {
    // ignore
  }

  // Final fallback: delete directly if trash fails
  fs.rmSync(targetDir, { recursive: true, force: true });
  return { success: true, deleted: true };
}

export function deleteSkillEverywhere({ skillName, platforms }) {
  const deletedFrom = [];

  // 1. Remove all symlinks first so broken symlinks are cleaned up cleanly
  for (const plat of platforms) {
    const targetDir = path.join(plat.expandedPath, skillName);
    try {
      if (fs.existsSync(targetDir)) {
        const lstat = fs.lstatSync(targetDir);
        if (lstat.isSymbolicLink()) {
          fs.unlinkSync(targetDir);
          deletedFrom.push({ platformId: plat.id, platformName: plat.name, type: 'symlink' });
        }
      }
    } catch (err) {
      // continue
    }
  }

  // 2. Remove actual directory or remaining copies
  for (const plat of platforms) {
    const targetDir = path.join(plat.expandedPath, skillName);
    try {
      if (fs.existsSync(targetDir)) {
        trashSkill({ skillName, platformPath: plat.expandedPath });
        deletedFrom.push({ platformId: plat.id, platformName: plat.name, type: 'source' });
      }
    } catch (err) {
      // continue
    }
  }

  return { success: true, deletedFrom };
}

export function unlinkSkill({ skillName, platformPath, detach = false }) {
  const targetDir = path.join(platformPath, skillName);

  let isSymlink = false;
  try {
    const lstat = fs.lstatSync(targetDir);
    isSymlink = lstat.isSymbolicLink();
  } catch (err) {
    throw new Error(`Skill not found at: ${targetDir}`);
  }

  if (!isSymlink) {
    // If it's a real directory and user asked to remove
    throw new Error(`Skill is a standalone directory, not a symlink.`);
  }

  if (detach) {
    // Detach: resolve canonical files and replace symlink with an independent real copy
    const realSource = fs.realpathSync(targetDir);
    fs.unlinkSync(targetDir);
    fs.cpSync(realSource, targetDir, { recursive: true });
    return { success: true, detached: true, targetDir };
  } else {
    // Unlink: just remove the symlink pointer
    fs.unlinkSync(targetDir);
    return { success: true, unlinked: true, targetDir };
  }
}

export function updateSkillFile({ skillName, platformPath, content }) {
  const skillDir = path.join(platformPath, skillName);
  if (!fs.existsSync(skillDir)) {
    throw new Error(`Skill folder does not exist: ${skillDir}`);
  }

  let skillFile = findSkillFile(skillDir);
  if (!skillFile) {
    skillFile = path.join(skillDir, 'SKILL.md');
  }

  fs.writeFileSync(skillFile, content, 'utf-8');
  return { success: true, path: skillFile };
}

export function createNewSkill({ name, description, author = '', targetPlatformPath }) {
  const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  if (!cleanName) throw new Error('Skill name must be non-empty and alphanumeric');

  if (!fs.existsSync(targetPlatformPath)) {
    fs.mkdirSync(targetPlatformPath, { recursive: true });
  }

  const skillDir = path.join(targetPlatformPath, cleanName);
  if (fs.existsSync(skillDir)) {
    throw new Error(`Skill "${cleanName}" already exists in target directory`);
  }

  fs.mkdirSync(skillDir, { recursive: true });
  const skillFile = path.join(skillDir, 'SKILL.md');

  const content = `---
name: ${cleanName}
description: ${description || 'Custom agent skill'}
metadata:
  version: "1.0.0"
  author: "${author || os.userInfo().username}"
---

# ${cleanName}

${description || 'Detailed instructions and guide for this skill.'}

## Instructions

1. Define step-by-step instructions for the AI assistant here.
2. Provide examples or edge case handling.

## Usage

Describe when the assistant should trigger or recommend this skill.
`;

  fs.writeFileSync(skillFile, content, 'utf-8');
  return { success: true, path: skillDir, skillFile, name: cleanName };
}

/**
 * Fork / Clone an existing skill to a new name and destination
 * (Inspired by landn172/skill-manager)
 */
export function forkSkill({ sourceSkillName, sourcePlatformPath, newSkillName, targetPlatformPath, newDescription }) {
  const cleanName = newSkillName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  if (!cleanName) throw new Error('New skill name must be valid alphanumeric or dashes');

  const sourceDir = path.join(sourcePlatformPath, sourceSkillName);
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source skill not found at: ${sourceDir}`);
  }

  const targetDir = path.join(targetPlatformPath, cleanName);
  if (fs.existsSync(targetDir)) {
    throw new Error(`Target skill "${cleanName}" already exists`);
  }

  const realSource = fs.realpathSync(sourceDir);
  fs.cpSync(realSource, targetDir, { recursive: true });

  // Update SKILL.md in cloned directory
  const skillFile = findSkillFile(targetDir) || path.join(targetDir, 'SKILL.md');
  if (fs.existsSync(skillFile)) {
    let content = fs.readFileSync(skillFile, 'utf-8');
    // Replace name in frontmatter
    content = content.replace(/^name:\s*.*$/m, `name: ${cleanName}`);
    if (newDescription) {
      content = content.replace(/^description:\s*.*$/m, `description: ${newDescription.trim()}`);
    }
    fs.writeFileSync(skillFile, content, 'utf-8');
  }

  return { success: true, newSkillName: cleanName, path: targetDir };
}

/**
 * Align with Chosen Source Platform
 * Reconcile detached copies or symlinks across assistants with the selected authoritative source
 * (Inspired by wanghuan9/skilldock)
 */
export function alignSkillWithCanonical({ skillName, platforms, canonicalPlatformId, mode = 'overwrite', targetPlatformIds = null }) {
  const canonicalPlat = platforms.find(p => p.id === canonicalPlatformId) || 
                        platforms.find(p => p.id === 'shared') || 
                        platforms.find(p => fs.existsSync(path.join(p.expandedPath, skillName)));

  if (!canonicalPlat) {
    throw new Error(`Chosen source platform "${canonicalPlatformId}" not found`);
  }

  const canonicalDir = path.join(canonicalPlat.expandedPath, skillName);
  if (!fs.existsSync(canonicalDir)) {
    throw new Error(`Skill "${skillName}" does not exist in chosen source: ${canonicalPlat.name}`);
  }

  const realCanonical = fs.realpathSync(canonicalDir);
  const updatedPlatforms = [];

  for (const plat of platforms) {
    if (plat.id === canonicalPlat.id) continue;
    if (targetPlatformIds && Array.isArray(targetPlatformIds) && !targetPlatformIds.includes(plat.id)) {
      continue;
    }

    const targetDir = path.join(plat.expandedPath, skillName);
    if (fs.existsSync(targetDir)) {
      try {
        if (mode === 'symlink') {
          // Replace with symlink pointing to canonicalDir
          fs.rmSync(targetDir, { recursive: true, force: true });
          fs.symlinkSync(canonicalDir, targetDir, 'dir');
          updatedPlatforms.push({ platformId: plat.id, platformName: plat.name, mode: 'symlink' });
        } else {
          // Overwrite mode
          const lstat = fs.lstatSync(targetDir);
          if (lstat.isSymbolicLink()) {
            // Already a symlink: ensure it points to canonical
            const currentTarget = fs.readlinkSync(targetDir);
            const resolvedTarget = path.resolve(path.dirname(targetDir), currentTarget);
            if (resolvedTarget !== realCanonical && resolvedTarget !== canonicalDir) {
              fs.unlinkSync(targetDir);
              fs.symlinkSync(canonicalDir, targetDir, 'dir');
              updatedPlatforms.push({ platformId: plat.id, platformName: plat.name, mode: 'symlink' });
            }
          } else {
            // Detached directory: overwrite content from canonical
            fs.rmSync(targetDir, { recursive: true, force: true });
            fs.cpSync(realCanonical, targetDir, { recursive: true });
            updatedPlatforms.push({ platformId: plat.id, platformName: plat.name, mode: 'overwrite' });
          }
        }
      } catch (err) {
        console.warn(`Could not align platform ${plat.name}:`, err.message);
      }
    }
  }

  return { success: true, skillName, sourcePlatform: canonicalPlat.name, updatedPlatforms };
}

/**
 * Install a curated or custom community skill directly
 * (Inspired by xingkongliang/skills-manager & smithery-ai)
 */
export function installCommunitySkill({ skillName, content, targetPlatformPath, linkToPlatforms = [], platforms = [] }) {
  const cleanName = skillName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  if (!cleanName) throw new Error('Skill name must be non-empty');

  if (!fs.existsSync(targetPlatformPath)) {
    fs.mkdirSync(targetPlatformPath, { recursive: true });
  }

  const targetDir = path.join(targetPlatformPath, cleanName);
  if (fs.existsSync(targetDir)) {
    throw new Error(`Skill "${cleanName}" already exists in target destination`);
  }

  fs.mkdirSync(targetDir, { recursive: true });
  const skillFile = path.join(targetDir, 'SKILL.md');
  fs.writeFileSync(skillFile, content, 'utf-8');

  // If symlinking to other platforms requested
  const linkedTo = [];
  if (Array.isArray(linkToPlatforms) && linkToPlatforms.length > 0) {
    for (const platId of linkToPlatforms) {
      const plat = platforms.find(p => p.id === platId);
      if (!plat) continue;
      const linkDest = path.join(plat.expandedPath, cleanName);
      if (!fs.existsSync(linkDest)) {
        try {
          fs.symlinkSync(targetDir, linkDest, 'dir');
          linkedTo.push(plat.name);
        } catch (e) {
          console.warn(`Could not symlink to ${plat.name}:`, e.message);
        }
      }
    }
  }

  return { success: true, name: cleanName, path: targetDir, linkedTo };
}
