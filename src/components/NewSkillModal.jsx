import React, { useState } from 'react';
import { X, Sparkles, Plus, Terminal } from 'lucide-react';
import { createSkill } from '../api.js';

export default function NewSkillModal({
  platforms,
  onClose,
  onSuccess,
  showToast
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [targetPlatformId, setTargetPlatformId] = useState(platforms[0]?.id || 'shared');
  const [linkToOthers, setLinkToOthers] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Skill name is required', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await createSkill({
        name: name.trim(),
        description: description.trim(),
        author: author.trim(),
        targetPlatformId,
        linkToOthers
      });
      showToast(`Skill "${res.name}" created successfully!`, 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50/90 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Create New Agent Skill</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Standard SKILL.md template with YAML frontmatter</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Skill Name / Identifier <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. react-performance-audit"
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Will create folder name and name field in SKILL.md
            </p>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a clear description of when and how the AI should trigger this skill..."
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Author
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Your name or team"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Primary Platform
              </label>
              <select
                value={targetPlatformId}
                onChange={(e) => setTargetPlatformId(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {platforms.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto-link option */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer bg-indigo-50/70 dark:bg-indigo-500/5 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-3">
              <input
                type="checkbox"
                checked={linkToOthers}
                onChange={(e) => setLinkToOthers(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 dark:border-white/20 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-900"
              />
              <div>
                <span className="font-semibold text-indigo-900 dark:text-indigo-300 block">
                  Automatically share with other assistants
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 block mt-0.5">
                  Places canonical files in your Shared Hub and creates symlinks for Claude and OpenCode so it works everywhere.
                </span>
              </div>
            </label>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{loading ? 'Creating...' : 'Create Skill'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
