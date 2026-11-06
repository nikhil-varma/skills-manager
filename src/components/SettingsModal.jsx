import React, { useState } from 'react';
import { X, Plus, Trash2, Folder, Save, Undo } from 'lucide-react';
import { updatePlatforms } from '../api.js';

export default function SettingsModal({
  platforms,
  onClose,
  onSuccess,
  showToast
}) {
  const [platformList, setPlatformList] = useState(
    platforms.map(p => ({
      id: p.id,
      name: p.name,
      badge: p.badge || p.name,
      path: p.path,
      color: p.color || '#6366F1',
      icon: p.icon || 'Folder',
      description: p.description || ''
    }))
  );

  const [newPlatformName, setNewPlatformName] = useState('');
  const [newPlatformPath, setNewPlatformPath] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddCustom = () => {
    if (!newPlatformName.trim() || !newPlatformPath.trim()) {
      showToast('Please provide both name and directory path', 'error');
      return;
    }

    const id = newPlatformName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    setPlatformList([
      ...platformList,
      {
        id,
        name: newPlatformName.trim(),
        badge: newPlatformName.trim().slice(0, 8),
        path: newPlatformPath.trim(),
        color: '#10B981',
        icon: 'Folder',
        description: 'Custom skills folder'
      }
    ]);

    setNewPlatformName('');
    setNewPlatformPath('');
  };

  const handleRemove = (id) => {
    setPlatformList(platformList.filter(p => p.id !== id));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updatePlatforms(platformList);
      showToast('Platform paths saved successfully', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/80">
          <div>
            <h3 className="font-bold text-sm text-white">Assistant & Skill Locations</h3>
            <p className="text-xs text-slate-400">Configure where SkillDesk scans for skills on your Mac</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs max-h-[70vh] overflow-y-auto">
          {/* Platform paths list */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Configured Locations
            </h4>
            <div className="space-y-2">
              {platformList.map((plat) => (
                <div
                  key={plat.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/5 bg-slate-900/60"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: plat.color }}
                    />
                    <div>
                      <div className="font-semibold text-slate-200">{plat.name}</div>
                      <div className="font-mono text-[11px] text-slate-400">{plat.path}</div>
                    </div>
                  </div>

                  {/* Allow removing custom ones */}
                  {!['claude', 'opencode', 'antigravity', 'shared'].includes(plat.id) && (
                    <button
                      onClick={() => handleRemove(plat.id)}
                      className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Remove custom location"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add custom location */}
          <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4 space-y-3">
            <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-indigo-400" />
              Add Custom Project or Tool Location
            </h4>
            <p className="text-[11px] text-slate-400">
              Add any directory containing skills (e.g., a specific workspace repo <code className="bg-white/10 px-1 py-0.5 rounded text-indigo-300">~/my-repo/.claude/skills</code>).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Display Name (e.g. My Repo Skills)"
                value={newPlatformName}
                onChange={(e) => setNewPlatformName(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="Path (e.g. ~/projects/app/.claude/skills)"
                value={newPlatformPath}
                onChange={(e) => setNewPlatformPath(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              type="button"
              onClick={handleAddCustom}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 text-xs font-medium transition-colors"
            >
              Add Location to List
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-slate-900/60 flex items-center justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
