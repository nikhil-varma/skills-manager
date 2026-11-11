import path from 'path';
import os from 'os';
import fs from 'fs';

const HOME = process.env.HOST_HOME || os.homedir();

export function expandHome(filePath) {
  if (!filePath) return filePath;
  // Handle and repair accidental nested tildes like /.../~/path
  const tildeIdx = filePath.indexOf('/~/');
  if (tildeIdx !== -1) {
    filePath = '~/' + filePath.slice(tildeIdx + 3);
  }
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(HOME, filePath.slice(1));
  }
  return path.resolve(filePath);
}

export function contractHome(filePath) {
  if (!filePath) return filePath;
  const exp = expandHome(filePath);
  const abs = path.resolve(exp);
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
  let rawPlatforms = DEFAULT_PLATFORMS;

  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      if (Array.isArray(data.platforms) && data.platforms.length > 0) {
        rawPlatforms = data.platforms;
      }
    }
  } catch (err) {
    console.error('Error reading settings:', err);
  }

  // Deduplicate by path and guarantee strictly unique IDs
  const seenPaths = new Set();
  const seenIds = new Set();
  const clean = [];

  for (const p of rawPlatforms) {
    const exp = expandHome(p.path);
    if (seenPaths.has(exp)) continue;
    seenPaths.add(exp);

    let id = p.id || 'plat';
    let counter = 1;
    while (seenIds.has(id)) {
      id = `${p.id}-${counter++}`;
    }
    seenIds.add(id);

    clean.push({
      ...p,
      id,
      expandedPath: exp
    });
  }

  return clean;
}

export function savePlatforms(platforms) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Deduplicate before saving
    const seenPaths = new Set();
    const seenIds = new Set();
    const clean = [];

    for (const p of platforms) {
      const exp = expandHome(p.path);
      if (seenPaths.has(exp)) continue;
      seenPaths.add(exp);

      let id = p.id || 'plat';
      let counter = 1;
      while (seenIds.has(id)) {
        id = `${p.id}-${counter++}`;
      }
      seenIds.add(id);

      clean.push({
        ...p,
        id,
        path: contractHome(p.path)
      });
    }

    // Preserve other settings if present
    let current = {};
    if (fs.existsSync(SETTINGS_FILE)) {
      try {
        current = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      } catch (e) {}
    }
    current.platforms = clean;

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2), 'utf-8');
    return clean;
  } catch (err) {
    console.error('Error saving settings:', err);
    return [];
  }
}

export const DEFAULT_LLM_CONFIG = {
  provider: 'custom', // 'custom', 'ollama', 'openai', 'gemini'
  baseUrl: 'http://localhost:1234/v1',
  apiKey: '',
  model: 'local-model',
  temperature: 0.2
};

export function getLLMConfig() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      if (data.llmProvider) {
        return {
          ...DEFAULT_LLM_CONFIG,
          ...data.llmProvider
        };
      }
    }
  } catch (err) {
    console.error('Error reading llmProvider settings:', err);
  }
  return { ...DEFAULT_LLM_CONFIG };
}

export function saveLLMConfig(llmConfig) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    let current = {};
    if (fs.existsSync(SETTINGS_FILE)) {
      try {
        current = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      } catch (e) {}
    }

    current.llmProvider = {
      ...DEFAULT_LLM_CONFIG,
      ...llmConfig
    };

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving llm settings:', err);
    return false;
  }
}

export const DEFAULT_STACKS = [
  {
    id: 'fullstack-web',
    name: 'Fullstack Web Engineer',
    icon: 'Layers',
    color: '#007AFF',
    description: 'React component refactoring, Tailwind tokens, API schema validation, and git workflows',
    skills: ['tailwind-theme-craft', 'react-component-refactor', 'api-contract-validator', 'git-commit-sage']
  },
  {
    id: 'devops-sre',
    name: 'DevOps & SRE Guild',
    icon: 'Cpu',
    color: '#10B981',
    description: 'Multi-service Docker architectures, zero-downtime DB migrations, post-mortems',
    skills: ['docker-compose-architect', 'database-migration-helper', 'incident-postmortem-scribe', 'security-vulnerability-auditor']
  },
  {
    id: 'qa-security',
    name: 'Code Review & Security',
    icon: 'Shield',
    color: '#8B5CF6',
    description: 'Deep PR audits, OWASP top 10 scanner, and comprehensive unit test generation',
    skills: ['pr-review-expert', 'unit-test-synthesizer', 'security-vulnerability-auditor']
  }
];

export function getStacks() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      if (Array.isArray(data.stacks) && data.stacks.length > 0) {
        return data.stacks;
      }
    }
  } catch (err) {
    console.error('Error reading stacks from settings:', err);
  }
  return [...DEFAULT_STACKS];
}

export function saveStacks(stacks) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    let current = {};
    if (fs.existsSync(SETTINGS_FILE)) {
      try {
        current = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      } catch (e) {}
    }

    current.stacks = stacks;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving stacks:', err);
    return false;
  }
}
