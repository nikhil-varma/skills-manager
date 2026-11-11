const isTauri = typeof window !== 'undefined' && (
  Boolean(window.__TAURI_INTERNALS__) ||
  Boolean(window.__TAURI__) ||
  window.location.protocol === 'tauri:' ||
  window.location.hostname === 'tauri.localhost'
);
const BASE = isTauri ? 'http://127.0.0.1:3001/api' : '/api';

export async function fetchSkills() {
  const res = await fetch(`${BASE}/skills`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchPlatforms() {
  const res = await fetch(`${BASE}/platforms`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updatePlatforms(platforms) {
  const res = await fetch(`${BASE}/platforms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platforms })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchSkillDetail(name, platformId) {
  const url = platformId 
    ? `${BASE}/skills/${encodeURIComponent(name)}?platformId=${platformId}`
    : `${BASE}/skills/${encodeURIComponent(name)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function linkSkill({ skillName, sourcePlatformId, targetPlatformId, makeSharedCanonical }) {
  const res = await fetch(`${BASE}/skills/link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillName, sourcePlatformId, targetPlatformId, makeSharedCanonical })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to link' }));
    throw new Error(err.error || 'Failed to link skill');
  }
  return res.json();
}

export async function copySkill({ skillName, sourcePlatformId, targetPlatformId, overwrite }) {
  const res = await fetch(`${BASE}/skills/copy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillName, sourcePlatformId, targetPlatformId, overwrite })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to copy' }));
    throw new Error(err.error || 'Failed to copy skill');
  }
  return res.json();
}

export async function moveSkill({ skillName, sourcePlatformId, targetPlatformId }) {
  const res = await fetch(`${BASE}/skills/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillName, sourcePlatformId, targetPlatformId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to move' }));
    throw new Error(err.error || 'Failed to move skill');
  }
  return res.json();
}

export async function syncAllSkills({ skillName, sourcePlatformId, mode }) {
  const res = await fetch(`${BASE}/skills/sync-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillName, sourcePlatformId, mode })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to sync' }));
    throw new Error(err.error || 'Failed to sync to all');
  }
  return res.json();
}

export async function unlinkSkill({ skillName, platformId, detach = false }) {
  const res = await fetch(`${BASE}/skills/unlink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillName, platformId, detach })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to unlink' }));
    throw new Error(err.error || 'Failed to unlink skill');
  }
  return res.json();
}

export async function trashSkill({ skillName, platformId }) {
  const res = await fetch(`${BASE}/skills/trash`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillName, platformId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to remove' }));
    throw new Error(err.error || 'Failed to remove skill');
  }
  return res.json();
}

export async function deleteSkillCompletely({ skillName }) {
  const res = await fetch(`${BASE}/skills/delete-completely`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillName })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete skill' }));
    throw new Error(err.error || 'Failed to delete skill');
  }
  return res.json();
}

export async function updateSkillContent(name, platformId, content) {
  const res = await fetch(`${BASE}/skills/${encodeURIComponent(name)}/content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platformId, content })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update content' }));
    throw new Error(err.error || 'Failed to update content');
  }
  return res.json();
}

export async function createSkill(payload) {
  const res = await fetch(`${BASE}/skills/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create skill' }));
    throw new Error(err.error || 'Failed to create skill');
  }
  return res.json();
}

export async function fetchDiscoverTools() {
  const res = await fetch(`${BASE}/discover`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function addDiscoveredTools(tools) {
  const res = await fetch(`${BASE}/discover/add-selected`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tools })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function syncDiscoveredSelection(selectedTools) {
  const res = await fetch(`${BASE}/discover/sync-selection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedTools })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function revealInFinder(filePath) {
  const res = await fetch(`${BASE}/actions/reveal-in-finder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath })
  });
  return res.json();
}

export async function openInEditor(filePath, editor = null) {
  const res = await fetch(`${BASE}/actions/open-in-editor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath, editor })
  });
  return res.json();
}

// AI Assistant endpoints
export async function fetchLLMConfig() {
  const res = await fetch(`${BASE}/ai/config`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function saveLLMConfig(config) {
  const res = await fetch(`${BASE}/ai/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function testLLMConnection(config) {
  try {
    const res = await fetch(`${BASE}/ai/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
      signal: AbortSignal.timeout(60000) // 1 minute timeout
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Connection test failed' }));
      throw new Error(err.error || 'Connection test failed');
    }
    return res.json();
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError' || err.message?.includes('aborted') || err.message?.includes('timeout')) {
      throw new Error('Connection test timed out after 1 minute. The endpoint is unreachable or not responding.');
    }
    throw err;
  }
}

export async function sendAIChat(messages, signal) {
  const res = await fetch(`${BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'AI service failed' }));
    throw new Error(errData.error || 'Failed to communicate with AI');
  }
  return res.json();
}

export async function fetchCommunitySkills() {
  const res = await fetch(`${BASE}/community/skills`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchRemoteSkill(url) {
  const res = await fetch(`${BASE}/community/fetch-remote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'Fetch failed' }));
    throw new Error(errData.error || 'Failed to fetch remote skill');
  }
  return res.json();
}

export async function installCommunitySkill({ skillName, content, targetPlatformId, linkToOthers = true }) {
  const res = await fetch(`${BASE}/community/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillName, content, targetPlatformId, linkToOthers })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'Installation failed' }));
    throw new Error(errData.error || 'Failed to install skill');
  }
  return res.json();
}

export async function forkSkill({ sourceSkillName, sourcePlatformId, newSkillName, targetPlatformId, newDescription }) {
  const res = await fetch(`${BASE}/skills/fork`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceSkillName, sourcePlatformId, newSkillName, targetPlatformId, newDescription })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'Fork failed' }));
    throw new Error(errData.error || 'Failed to fork skill');
  }
  return res.json();
}

export async function alignSkillWithCanonical({ skillName, canonicalPlatformId, mode = 'overwrite', targetPlatformIds }) {
  const res = await fetch(`${BASE}/skills/align`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillName, canonicalPlatformId, mode, targetPlatformIds })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'Align failed' }));
    throw new Error(errData.error || 'Failed to align skill with chosen source');
  }
  return res.json();
}
