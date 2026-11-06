import express from 'express';
import cors from 'cors';
import path from 'path';
import { exec } from 'child_process';
import { getPlatforms, savePlatforms, expandHome, contractHome } from './config.js';
import { discoverAllOSTools } from './discover.js';
import {
  scanPlatforms,
  getSkillDetail,
  linkSkill,
  copySkill,
  moveSkill,
  trashSkill,
  updateSkillFile,
  createNewSkill
} from './skills.js';

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
    const currentPaths = new Set(currentPlatforms.map(p => expandHome(p.path)));

    // Mark whether each discovered tool is already added
    const markAdded = (item) => ({
      ...item,
      isAdded: currentPaths.has(expandHome(item.path))
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

      let id = tool.id || tool.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      if (existingIds.has(id)) {
        id = `${id}-${Date.now().toString(36)}`;
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
    res.json({ success: true, platforms: newPlatforms });
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

// Trash / Unlink skill
app.post('/api/skills/trash', (req, res) => {
  try {
    const { skillName, platformId } = req.body;
    const platforms = getPlatforms();

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

// Reveal in macOS Finder
app.post('/api/actions/reveal-in-finder', (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: 'filePath is required' });

    const safePath = expandHome(filePath);
    exec(`open -R "${safePath}"`, (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

app.listen(PORT, () => {
  console.log(`⚡ SkillDesk Backend API running on http://localhost:${PORT}`);
});
