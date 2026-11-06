const BASE = '/api';

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

export async function revealInFinder(filePath) {
  const res = await fetch(`${BASE}/actions/reveal-in-finder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath })
  });
  return res.json();
}
