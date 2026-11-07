import fs from 'fs';
import path from 'path';
import os from 'os';
import { expandHome, contractHome } from './config.js';

const HOME = process.env.HOST_HOME || os.homedir();

// Known global AI assistant paths
const KNOWN_GLOBAL_TOOLS = [
  {
    id: 'claude',
    name: 'Claude Code',
    badge: 'Claude',
    path: '~/.claude/skills',
    color: '#D97706', // amber
    icon: 'Bot',
    description: 'Claude Code CLI skills'
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    badge: 'OpenCode',
    path: '~/.config/opencode/skills',
    color: '#059669', // emerald
    icon: 'Terminal',
    description: 'OpenCode Interpreter global skills'
  },
  {
    id: 'cursor',
    name: 'Cursor',
    badge: 'Cursor',
    path: '~/.cursor/skills-cursor',
    color: '#3B82F6', // blue
    icon: 'Terminal',
    description: 'Cursor IDE custom and agent skills'
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    badge: 'Codex',
    path: '~/.codex/skills',
    color: '#10B981', // green
    icon: 'Bot',
    description: 'OpenAI Codex user skills'
  },
  {
    id: 'codex-system',
    name: 'Codex System',
    badge: 'Codex Sys',
    path: '~/.codex/skills/.system',
    color: '#047857', // dark green
    icon: 'Bot',
    description: 'OpenAI Codex bundled system skills'
  },
  {
    id: 'antigravity-builtin',
    name: 'Antigravity Built-in',
    badge: 'AGY Builtin',
    path: '~/.gemini/antigravity/builtin/skills',
    color: '#0284C7', // sky blue
    icon: 'Sparkles',
    description: 'Google Antigravity bundled skills'
  },
  {
    id: 'antigravity',
    name: 'Antigravity Custom',
    badge: 'Antigravity',
    path: '~/.gemini/antigravity/skills',
    color: '#2563EB', // royal blue
    icon: 'Sparkles',
    description: 'Google Antigravity custom user skills'
  },
  {
    id: 'shared',
    name: 'Shared Hub',
    badge: 'Shared Hub',
    path: '~/.agents/skills',
    color: '#7C3AED', // purple
    icon: 'Share2',
    description: 'Canonical shared agent skills repo'
  }
];

// Search user development directories for project-level skill folders
const SCAN_ROOTS = [
  '~/Desktop/work/projects',
  '~/Desktop/work',
  '~/Desktop',
  '~/Projects',
  '~/Developer',
  '~/repos',
  '~/src'
];

function getProjectInfo(fullPath) {
  const home = os.homedir();
  let curr = path.dirname(fullPath);

  while (curr && curr !== '/' && curr !== home) {
    const base = path.basename(curr);
    if (base === 'skills' || base === 'skills-cursor' || base.startsWith('.')) {
      curr = path.dirname(curr);
      continue;
    }
    break;
  }

  let searchDir = curr;
  let repoRoot = null;

  while (searchDir && searchDir !== '/' && searchDir !== home && 
         !['projects', 'work', 'Desktop', 'Projects', 'Developer', 'repos'].includes(path.basename(searchDir))) {
    const hasGit = fs.existsSync(path.join(searchDir, '.git'));
    const hasPkg = fs.existsSync(path.join(searchDir, 'package.json'));
    const hasCargo = fs.existsSync(path.join(searchDir, 'Cargo.toml'));
    const hasPy = fs.existsSync(path.join(searchDir, 'pyproject.toml'));

    if (hasGit) {
      repoRoot = searchDir;
      break;
    }
    if ((hasPkg || hasCargo || hasPy) && !repoRoot) {
      repoRoot = searchDir;
    }

    searchDir = path.dirname(searchDir);
  }

  const projectRoot = repoRoot || curr;
  const projectName = path.basename(projectRoot);
  const relPath = path.relative(projectRoot, fullPath);

  return {
    projectRoot: contractHome(projectRoot),
    projectName,
    relPath: relPath || path.basename(fullPath)
  };
}

function scanProjectSkills(rootDir, maxDepth = 4, seenPaths = new Set()) {
  const absRoot = expandHome(rootDir);
  if (!fs.existsSync(absRoot)) return [];

  const results = [];

  function walk(currentDir, depth) {
    if (depth > maxDepth) return;

    try {
      let realDir = currentDir;
      try { realDir = fs.realpathSync(currentDir); } catch (e) {}
      if (seenPaths.has(realDir)) return;
      seenPaths.add(realDir);

      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.Trash') continue;

        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // If the directory itself is named skills or matches agent patterns
          if (entry.name === 'skills' || entry.name === 'skills-cursor') {
            // Check if it has any subdirectories or SKILL.md
            try {
              const subItems = fs.readdirSync(fullPath);
              if (subItems.some(i => !i.startsWith('.'))) {
                const { projectRoot, projectName, relPath } = getProjectInfo(fullPath);
                const count = subItems.filter(i => !i.startsWith('.')).length;
                const displayName = relPath === 'skills' ? `${projectName} (skills)` : `${projectName} (${relPath})`;

                results.push({
                  id: `project-${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${relPath.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                  name: displayName,
                  projectName,
                  projectRoot,
                  relPath,
                  badge: projectName.slice(0, 12),
                  path: contractHome(fullPath),
                  expandedPath: fullPath,
                  color: '#8B5CF6',
                  icon: 'Folder',
                  description: `${projectName} / ${relPath}`,
                  count,
                  exists: true
                });
                continue; // don't recurse into skills folder itself
              }
            } catch (e) {}
          }

          walk(fullPath, depth + 1);
        }
      }
    } catch (err) {}
  }

  walk(absRoot, 1);
  return results;
}

export function discoverAllOSTools() {
  const discoveredTools = [];
  const discoveredProjects = [];

  // 1. Check known global tools
  for (const tool of KNOWN_GLOBAL_TOOLS) {
    const fullPath = expandHome(tool.path);
    if (fs.existsSync(fullPath)) {
      try {
        const items = fs.readdirSync(fullPath);
        const count = items.filter(i => !i.startsWith('.')).length;
        discoveredTools.push({
          ...tool,
          expandedPath: fullPath,
          exists: true,
          count
        });
      } catch (err) {
        discoveredTools.push({
          ...tool,
          expandedPath: fullPath,
          exists: true,
          count: 0
        });
      }
    }
  }

  // 2. Scan project workspaces
  const seenPaths = new Set();
  for (const root of SCAN_ROOTS) {
    const projects = scanProjectSkills(root, 4, seenPaths);
    for (const p of projects) {
      if (!discoveredProjects.some(existing => existing.path === p.path)) {
        try {
          const items = fs.readdirSync(p.expandedPath);
          const count = items.filter(i => !i.startsWith('.')).length;
          discoveredProjects.push({ ...p, exists: true, count });
        } catch (e) {
          discoveredProjects.push({ ...p, exists: true, count: 0 });
        }
      }
    }
  }

  return {
    globalTools: discoveredTools,
    projectWorkspaces: discoveredProjects,
    allDiscovered: [...discoveredTools, ...discoveredProjects]
  };
}
