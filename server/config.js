import path from 'path';
import os from 'os';
import fs from 'fs';

const HOME = process.env.HOST_HOME || os.homedir();

export function expandHome(filePath) {
  if (!filePath) return filePath;
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(HOME, filePath.slice(1));
  }
  return path.resolve(filePath);
}

export function contractHome(filePath) {
  if (!filePath) return filePath;
  const abs = path.resolve(filePath);
  if (abs.startsWith(HOME)) {
    return '~' + abs.slice(HOME.length);
  }
  return abs;
}

export const DEFAULT_PLATFORMS = [
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
    path: '~/.codex/skills/.system',
    color: '#10B981', // green
    icon: 'Bot',
    description: 'OpenAI Codex system and agent skills'
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

const CONFIG_DIR = path.join(HOME, '.config', 'skills-manager');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');

export function getPlatforms() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      if (Array.isArray(data.platforms) && data.platforms.length > 0) {
        return data.platforms.map(p => ({
          ...p,
          expandedPath: expandHome(p.path)
        }));
      }
    }
  } catch (err) {
    console.error('Error reading settings:', err);
  }

  return DEFAULT_PLATFORMS.map(p => ({
    ...p,
    expandedPath: expandHome(p.path)
  }));
}

export function savePlatforms(platforms) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ platforms }, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving settings:', err);
    return false;
  }
}
