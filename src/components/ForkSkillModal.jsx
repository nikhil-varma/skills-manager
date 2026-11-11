import React, { useState } from 'react';
import { 
  X, 
  GitFork, 
  Loader2, 
  Check, 
  AlertCircle,
  FolderPlus
} from 'lucide-react';
import { forkSkill } from '../api.js';

export default function ForkSkillModal({
  skill,
  platforms,
  onClose,
  onSuccess,
  showToast
}) {
  const [newSkillName, setNewSkillName] = useState(`${skill.name}-copy`);
  const [newDescription, setNewDescription] = useState(skill.description || '');
  
  // Pick source platform where skill is currently installed
  const installedPlatforms = platforms.filter(p => skill.platforms && skill.platforms[p.id]?.installed);
  const [sourcePlatformId, setSourcePlatformId] = useState(
    installedPlatforms[0]?.id || platforms[0]?.id || ''
  );
  const [targetPlatformId, setTargetPlatformId] = useState(
    installedPlatforms[0]?.id || platforms[0]?.id || ''
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = newSkillName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!cleanName) {
      setError('Please provide a valid alphanumeric name');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await forkSkill({
        sourceSkillName: skill.name,
        sourcePlatformId,
        newSkillName: cleanName,
        targetPlatformId,
        newDescription
      });

      showToast(`Forked "${skill.name}" into "${cleanName}"!`, 'success');
      if (onSuccess) onSuccess(cleanName);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg flex flex-col rounded-2xl border border-black/10 dark:border-white/10 bg-[#fbfcfd] dark:bg-[#1a1c24] shadow-2xl overflow-hidden macos-glass">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.08] dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
              <GitFork className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Fork & Duplicate Skill
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clone <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{skill.name}</span> to a custom variation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              New Skill Identifier
            </label>
            <input
              type="text"
              required
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="e.g. pr-review-team"
              className="w-full bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/35"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Source Location
              </label>
              <select
                value={sourcePlatformId}
                onChange={(e) => setSourcePlatformId(e.target.value)}
                className="w-full bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/35"
              >
                {installedPlatforms.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Location
              </label>
              <select
                value={targetPlatformId}
                onChange={(e) => setTargetPlatformId(e.target.value)}
                className="w-full bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/35"
              >
                {platforms.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description / Role for AI Assistant
            </label>
            <textarea
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Describe when the AI assistant should trigger this forked skill..."
              className="w-full bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/10 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/35"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.08] dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !newSkillName.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold shadow-xs shadow-[#007AFF]/25 disabled:opacity-50 transition-all active:scale-95"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}
              <span>Fork Skill</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
