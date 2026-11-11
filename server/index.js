import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { getPlatforms, savePlatforms, expandHome, contractHome, getLLMConfig, saveLLMConfig } from './config.js';
import { discoverAllOSTools } from './discover.js';
import { testLLMConnection, chatWithSkills } from './llm.js';
import {
  scanPlatforms,
  getSkillDetail,
  linkSkill,
  copySkill,
  moveSkill,
  trashSkill,
  deleteSkillEverywhere,
  unlinkSkill,
  updateSkillFile,
  createNewSkill,
  forkSkill,
  alignSkillWithCanonical,
  installCommunitySkill,
  validateSkillSpec
} from './skills.js';
import { COMMUNITY_SKILLS } from './communityCatalog.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Status check
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// OS Auto-discovery endpoint
app.get('/api/discover', (req, res) => {
  try {
    const discovered = discoverAllOSTools();
    const currentPlatforms = getPlatforms();
    const currentPaths = new Set(currentPlatforms.map(p => path.resolve(expandHome(p.path))));

    // Mark whether each discovered tool is already added
    const markAdded = (item) => ({
      ...item,
      isAdded: currentPaths.has(path.resolve(expandHome(item.path)))
    });

    res.json({
      globalTools: discovered.globalTools.map(markAdded),
      projectWorkspaces: discovered.projectWorkspaces.map(markAdded),
      totalFound: discovered.allDiscovered.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync selection: adds newly checked and removes unchecked tools
app.post('/api/discover/sync-selection', (req, res) => {
  try {
    const { selectedTools } = req.body;
    if (!Array.isArray(selectedTools)) {
      return res.status(400).json({ error: 'selectedTools must be an array' });
    }

    const currentPlatforms = getPlatforms();
    const selectedPaths = new Set(selectedTools.map(t => path.resolve(expandHome(t.path))));

    const updated = [];
    const processedPaths = new Set();

    for (const tool of selectedTools) {
      const expPath = path.resolve(expandHome(tool.path));
      if (processedPaths.has(expPath)) continue;
      processedPaths.add(expPath);

      const existing = currentPlatforms.find(p => path.resolve(expandHome(p.path)) === expPath);
      if (existing) {
        updated.push(existing);
      } else {
        const id = tool.id || tool.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        updated.push({
          id,
          name: tool.name,
          badge: tool.badge || tool.name.slice(0, 10),
          path: contractHome(tool.path),
          color: tool.color || '#6366F1',
          icon: tool.icon || 'Folder',
          description: tool.description || ''
        });
      }
    }

    savePlatforms(updated);
    const cleanPlatforms = getPlatforms();
    res.json({ success: true, platforms: cleanPlatforms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add selected discovered tools to active platforms
app.post('/api/discover/add-selected', (req, res) => {
  try {
    const { tools } = req.body; // array of tool objects to add
    if (!Array.isArray(tools)) {
      return res.status(400).json({ error: 'tools must be an array' });
    }

    const currentPlatforms = getPlatforms();
    const existingIds = new Set(currentPlatforms.map(p => p.id));
    const existingPaths = new Set(currentPlatforms.map(p => expandHome(p.path)));

    const newPlatforms = [...currentPlatforms];

    for (const tool of tools) {
      const expPath = expandHome(tool.path);
      if (existingPaths.has(expPath)) continue;

      let baseId = tool.id || tool.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      let id = baseId;
      let counter = 1;
      while (existingIds.has(id)) {
        id = `${baseId}-${counter++}`;
      }
      existingIds.add(id);
      existingPaths.add(expPath);

      newPlatforms.push({
        id,
        name: tool.name,
        badge: tool.badge || tool.name.slice(0, 10),
        path: contractHome(tool.path),
        color: tool.color || '#6366F1',
        icon: tool.icon || 'Folder',
        description: tool.description || ''
      });
    }

    savePlatforms(newPlatforms);
    const cleanPlatforms = getPlatforms();
    res.json({ success: true, platforms: cleanPlatforms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get configured platforms & counts
app.get('/api/platforms', (req, res) => {
  try {
    const platforms = getPlatforms();
    const result = scanPlatforms(platforms);
    res.json({
      platforms: result.platforms,
      totalSkills: result.totalSkills
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update / add platforms
app.post('/api/platforms', (req, res) => {
  try {
    const { platforms } = req.body;
    if (!Array.isArray(platforms)) {
      return res.status(400).json({ error: 'platforms must be an array' });
    }
    const cleanPlatforms = platforms.map(p => ({
      id: p.id || p.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: p.name,
      badge: p.badge || p.name,
      path: p.path,
      color: p.color || '#6366F1',
      icon: p.icon || 'Folder',
      description: p.description || ''
    }));

    savePlatforms(cleanPlatforms);
    res.json({ success: true, platforms: cleanPlatforms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all scanned skills with platform matrix
app.get('/api/skills', (req, res) => {
  try {
    const platforms = getPlatforms();
    const result = scanPlatforms(platforms);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single skill detail
app.get('/api/skills/:name', (req, res) => {
  try {
    const { name } = req.params;
    const { platformId } = req.query;
    const platforms = getPlatforms();
    const detail = getSkillDetail(name, platforms, platformId);

    if (!detail) {
      return res.status(404).json({ error: `Skill ${name} not found` });
    }
    res.json(detail);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Symlink skill from sourcePlatform to targetPlatform
app.post('/api/skills/link', (req, res) => {
  try {
    const { skillName, sourcePlatformId, targetPlatformId, makeSharedCanonical = false } = req.body;
    const platforms = getPlatforms();

    const sourcePlat = platforms.find(p => p.id === sourcePlatformId);
    const targetPlat = platforms.find(p => p.id === targetPlatformId);
    const sharedPlat = platforms.find(p => p.id === 'shared');

    if (!sourcePlat || !targetPlat) {
      return res.status(400).json({ error: 'Invalid source or target platform' });
    }

    const result = linkSkill({
      skillName,
      sourcePlatformPath: sourcePlat.expandedPath,
      targetPlatformPath: targetPlat.expandedPath,
      makeSharedCanonical,
      sharedPath: sharedPlat ? sharedPlat.expandedPath : null
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Copy skill from source to target
app.post('/api/skills/copy', (req, res) => {
  try {
    const { skillName, sourcePlatformId, targetPlatformId, overwrite = false } = req.body;
    const platforms = getPlatforms();

    const sourcePlat = platforms.find(p => p.id === sourcePlatformId);
    const targetPlat = platforms.find(p => p.id === targetPlatformId);

    if (!sourcePlat || !targetPlat) {
      return res.status(400).json({ error: 'Invalid source or target platform' });
    }

    const result = copySkill({
      skillName,
      sourcePlatformPath: sourcePlat.expandedPath,
      targetPlatformPath: targetPlat.expandedPath,
      overwrite
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Move skill from source to target
app.post('/api/skills/move', (req, res) => {
  try {
    const { skillName, sourcePlatformId, targetPlatformId } = req.body;
    const platforms = getPlatforms();

    const sourcePlat = platforms.find(p => p.id === sourcePlatformId);
    const targetPlat = platforms.find(p => p.id === targetPlatformId);

    if (!sourcePlat || !targetPlat) {
      return res.status(400).json({ error: 'Invalid source or target platform' });
    }

    const result = moveSkill({
      skillName,
      sourcePlatformPath: sourcePlat.expandedPath,
      targetPlatformPath: targetPlat.expandedPath
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync to all platforms (symlink or copy)
app.post('/api/skills/sync-all', (req, res) => {
  try {
    const { skillName, sourcePlatformId, mode = 'symlink' } = req.body;
    const platforms = getPlatforms();

    const sourcePlat = platforms.find(p => p.id === sourcePlatformId);
    if (!sourcePlat) {
      return res.status(400).json({ error: 'Invalid source platform' });
    }

    const sharedPlat = platforms.find(p => p.id === 'shared');
    const results = [];

    for (const target of platforms) {
      if (target.id === sourcePlatformId) continue;

      try {
        if (mode === 'symlink') {
          const resLink = linkSkill({
            skillName,
            sourcePlatformPath: sourcePlat.expandedPath,
            targetPlatformPath: target.expandedPath,
            makeSharedCanonical: true,
            sharedPath: sharedPlat ? sharedPlat.expandedPath : null
          });
          results.push({ platform: target.id, success: true, action: 'linked' });
        } else {
          const resCopy = copySkill({
            skillName,
            sourcePlatformPath: sourcePlat.expandedPath,
            targetPlatformPath: target.expandedPath,
            overwrite: true
          });
          results.push({ platform: target.id, success: true, action: 'copied' });
        }
      } catch (err) {
        results.push({ platform: target.id, success: false, error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unlink / Detach symlink
app.post('/api/skills/unlink', (req, res) => {
  try {
    const { skillName, platformId, detach = false } = req.body;
    const platforms = getPlatforms();

    const plat = platforms.find(p => p.id === platformId);
    if (!plat) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const result = unlinkSkill({
      skillName,
      platformPath: plat.expandedPath,
      detach
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trash / Remove skill from a specific platform or everywhere
app.post('/api/skills/trash', (req, res) => {
  try {
    const { skillName, platformId, deleteAll } = req.body;
    const platforms = getPlatforms();

    if (platformId === 'all' || deleteAll) {
      const result = deleteSkillEverywhere({ skillName, platforms });
      return res.json(result);
    }

    const plat = platforms.find(p => p.id === platformId);
    if (!plat) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const result = trashSkill({
      skillName,
      platformPath: plat.expandedPath
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete skill completely across all platforms
app.post('/api/skills/delete-completely', (req, res) => {
  try {
    const { skillName } = req.body;
    if (!skillName) return res.status(400).json({ error: 'skillName is required' });

    const platforms = getPlatforms();
    const result = deleteSkillEverywhere({ skillName, platforms });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update SKILL.md file content
app.put('/api/skills/:name/content', (req, res) => {
  try {
    const { name } = req.params;
    const { platformId, content } = req.body;
    const platforms = getPlatforms();

    const plat = platforms.find(p => p.id === platformId);
    if (!plat) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const result = updateSkillFile({
      skillName: name,
      platformPath: plat.expandedPath,
      content
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new skill
app.post('/api/skills/create', (req, res) => {
  try {
    const { name, description, author, targetPlatformId, linkToOthers = false } = req.body;
    const platforms = getPlatforms();

    const targetPlat = platforms.find(p => p.id === targetPlatformId);
    if (!targetPlat) {
      return res.status(400).json({ error: 'Invalid target platform' });
    }

    const result = createNewSkill({
      name,
      description,
      author,
      targetPlatformPath: targetPlat.expandedPath
    });

    if (linkToOthers) {
      const sharedPlat = platforms.find(p => p.id === 'shared');
      for (const p of platforms) {
        if (p.id === targetPlatformId) continue;
        try {
          linkSkill({
            skillName: result.name,
            sourcePlatformPath: targetPlat.expandedPath,
            targetPlatformPath: p.expandedPath,
            makeSharedCanonical: true,
            sharedPath: sharedPlat ? sharedPlat.expandedPath : null
          });
        } catch (e) {
          console.warn(`Could not link new skill to ${p.id}:`, e.message);
        }
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Community Catalog: List curated skills (inspired by xingkongliang & smithery-ai)
app.get('/api/community/skills', (req, res) => {
  try {
    const platforms = getPlatforms();
    const scanned = scanPlatforms(platforms);
    const installedSkillNames = new Set(scanned.skills.map(s => s.name));

    // Enrich catalog with installation status
    const enriched = COMMUNITY_SKILLS.map(item => ({
      ...item,
      isInstalled: installedSkillNames.has(item.name)
    }));

    res.json({ skills: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Community Catalog: Fetch raw remote markdown (GitHub or web)
app.post('/api/community/fetch-remote', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid URL is required' });
    }

    // Convert github.com blob URLs to raw.githubusercontent.com
    let fetchUrl = url.trim();
    if (fetchUrl.includes('github.com') && fetchUrl.includes('/blob/')) {
      fetchUrl = fetchUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch remote skill: HTTP ${response.status}`);
    }

    const rawMarkdown = await response.text();
    res.json({ rawMarkdown });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Install curated or custom community skill
app.post('/api/community/install', (req, res) => {
  try {
    const { skillName, content, targetPlatformId, linkToOthers = true } = req.body;
    const platforms = getPlatforms();

    const targetPlat = platforms.find(p => p.id === targetPlatformId);
    if (!targetPlat) {
      return res.status(400).json({ error: 'Invalid target platform' });
    }

    const otherPlatIds = linkToOthers 
      ? platforms.filter(p => p.id !== targetPlatformId).map(p => p.id)
      : [];

    const result = installCommunitySkill({
      skillName,
      content,
      targetPlatformPath: targetPlat.expandedPath,
      linkToPlatforms: otherPlatIds,
      platforms
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fork / Clone skill (inspired by landn172/skill-manager)
app.post('/api/skills/fork', (req, res) => {
  try {
    const { sourceSkillName, sourcePlatformId, newSkillName, targetPlatformId, newDescription } = req.body;
    const platforms = getPlatforms();

    const sourcePlat = platforms.find(p => p.id === sourcePlatformId);
    const targetPlat = platforms.find(p => p.id === targetPlatformId);

    if (!sourcePlat || !targetPlat) {
      return res.status(400).json({ error: 'Invalid source or target platform' });
    }

    const result = forkSkill({
      sourceSkillName,
      sourcePlatformPath: sourcePlat.expandedPath,
      newSkillName,
      targetPlatformPath: targetPlat.expandedPath,
      newDescription
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Align Drift with Chosen Source Platform (inspired by wanghuan9/skilldock)
app.post('/api/skills/align', (req, res) => {
  try {
    const { skillName, canonicalPlatformId, mode = 'overwrite', targetPlatformIds } = req.body;
    const platforms = getPlatforms();

    const result = alignSkillWithCanonical({
      skillName,
      platforms,
      canonicalPlatformId,
      mode,
      targetPlatformIds
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reveal in macOS Finder or fallback to clipboard
app.post('/api/actions/reveal-in-finder', (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: 'filePath is required' });

    const safePath = expandHome(filePath);
    const friendlyPath = contractHome(filePath);

    // If running in Docker (Linux container), GUI Finder cannot be invoked directly from container
    if (process.platform !== 'darwin') {
      return res.json({ 
        success: false, 
        inDocker: true, 
        path: friendlyPath,
        message: `Running inside Docker: host Finder cannot be opened directly. Path: ${friendlyPath}`
      });
    }

    if (!fs.existsSync(safePath)) {
      return res.json({ 
        success: false, 
        notFound: true, 
        path: friendlyPath,
        message: `Folder does not exist yet: ${friendlyPath}` 
      });
    }

    exec(`open -R "${safePath}"`, (err) => {
      if (err) {
        // Fallback to opening directory directly
        exec(`open "${safePath}"`, (fallbackErr) => {
          if (fallbackErr) {
            return res.json({ success: false, error: err.message, path: friendlyPath });
          }
          res.json({ success: true, opened: true });
        });
        return;
      }
      res.json({ success: true, revealed: true });
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Open in Code Editor (Cursor, VS Code, or default editor)
app.post('/api/actions/open-in-editor', (req, res) => {
  try {
    const { filePath, editor } = req.body;
    if (!filePath) return res.status(400).json({ error: 'filePath is required' });

    const safePath = expandHome(filePath);
    if (!fs.existsSync(safePath)) {
      return res.json({ success: false, error: 'File or directory does not exist' });
    }

    let cmd = `open -a "Cursor" "${safePath}" || open -a "Visual Studio Code" "${safePath}" || open "${safePath}"`;
    if (editor === 'cursor') {
      cmd = `open -a "Cursor" "${safePath}"`;
    } else if (editor === 'vscode' || editor === 'code') {
      cmd = `open -a "Visual Studio Code" "${safePath}"`;
    } else if (editor === 'zed') {
      cmd = `open -a "Zed" "${safePath}"`;
    }

    exec(cmd, (err) => {
      if (err) {
        exec(`open "${safePath}"`, () => {});
      }
      res.json({ success: true, opened: true });
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// --- AI Skill Assistant Endpoints ---

// Get current AI LLM config
app.get('/api/ai/config', (req, res) => {
  try {
    const config = getLLMConfig();
    const isConfigured = Boolean(
      config.provider === 'ollama' ||
      config.provider === 'custom' ||
      (config.apiKey && config.apiKey.trim().length > 0) ||
      config.baseUrl?.includes('localhost') ||
      config.baseUrl?.includes('127.0.0.1')
    );
    res.json({ config, isConfigured });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save updated AI LLM config
app.post('/api/ai/config', (req, res) => {
  try {
    const { config } = req.body;
    if (!config) return res.status(400).json({ error: 'config is required' });
    const success = saveLLMConfig(config);
    if (!success) return res.status(500).json({ error: 'Failed to save LLM settings' });
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test connection to configured LLM
app.post('/api/ai/test', async (req, res) => {
  try {
    const configToTest = req.body.config || getLLMConfig();
    const result = await testLLMConnection(configToTest);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Chat with SkillDesk AI scoped strictly to user skills
app.post('/api/ai/chat', async (req, res) => {
  console.log(`[AI Chat] Incoming chat request with ${req.body?.messages?.length || 0} messages`);
  
  // Disable socket and request timeout so long-running local LLM generations don't get terminated
  if (req.socket) {
    req.socket.setTimeout(0);
    req.socket.setKeepAlive(true, 10000);
  }
  if (typeof req.setTimeout === 'function') {
    req.setTimeout(0);
  }

  const abortController = new AbortController();
  
  // Abort only when client disconnects (res 'close' before response is sent)
  res.on('close', () => {
    if (!res.writableEnded) {
      console.log(`[AI Chat] Client disconnected before response ended. Aborting LLM request.`);
      abortController.abort();
    }
  });

  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const config = getLLMConfig();
    const platforms = getPlatforms();
    const { skills } = scanPlatforms(platforms);

    console.log(`[AI Chat] Calling chatWithSkills (${skills.length} skills)...`);
    const reply = await chatWithSkills({
      messages,
      skills,
      config,
      signal: abortController.signal
    });

    console.log(`[AI Chat] Got reply (${reply?.content?.length || 0} chars). Sending response...`);
    if (!res.writableEnded) {
      res.json({ success: true, message: reply });
    }
  } catch (err) {
    if (abortController.signal.aborted) {
      console.log(`[AI Chat] Request was aborted by client.`);
      return;
    }
    console.error('AI Chat Error:', err);
    if (!res.writableEnded) {
      res.status(500).json({ error: err.message });
    }
  }
});

// Serve static Vite build if present
const distPath = path.resolve('dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = app.listen(PORT, () => {
  console.log(`⚡ SkillDesk Backend API running on http://localhost:${PORT}`);
});

// Ensure HTTP server does not drop long-lived connections for local LLMs
server.timeout = 0;
server.requestTimeout = 0;
server.headersTimeout = 0;
