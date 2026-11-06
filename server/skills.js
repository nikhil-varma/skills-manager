import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import os from 'os';
import { contractHome } from './config.js';

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
        if (skillFile && isValid) {
          try {
            const raw = fs.readFileSync(skillFile, 'utf-8');
            parsed = matter(raw);
          } catch (err) {
            console.error(`Failed to parse frontmatter for ${skillFile}`, err);
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
          files
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
        parsed = matter(rawContent);
      } catch (err) {
        console.error('Error reading skill file:', err);
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
      files,
      fileCount
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
  if (fs.existsSync(trashDir)) {
    const trashTarget = path.join(trashDir, `${skillName}-${Date.now()}`);
    fs.renameSync(targetDir, trashTarget);
    return { success: true, trashedTo: trashTarget };
  } else {
    // Fallback: platform .trash folder
    const fallbackTrash = path.join(platformPath, '.trash');
    if (!fs.existsSync(fallbackTrash)) fs.mkdirSync(fallbackTrash, { recursive: true });
    const fallbackTarget = path.join(fallbackTrash, `${skillName}-${Date.now()}`);
    fs.renameSync(targetDir, fallbackTarget);
    return { success: true, trashedTo: fallbackTarget };
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
