import React, { useState, useEffect } from 'react';
import { 
  X, 
  Layers, 
  Sparkles, 
  Check, 
  Plus, 
  Trash2, 
  Loader2, 
  Search, 
  CheckCircle2, 
  FolderPlus, 
  AlertCircle,
  ExternalLink,
  Cpu,
  Shield,
  Bot
} from 'lucide-react';
import { fetchStacks, saveStacks, applyStack } from '../api.js';

export default function SkillStacksModal({
  allSkills = [],
  platforms = [],
  preselectedSkills = [],
  onClose,
  onSuccess,
  showToast
}) {
  const [stacks, setStacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'create'
  const [targetPlatformId, setTargetPlatformId] = useState(platforms[0]?.id || 'shared');
  const [applyingStackId, setApplyingStackId] = useState(null);

  // New Stack Form state
  const [newStackName, setNewStackName] = useState('');
  const [newStackDesc, setNewStackDesc] = useState('');
  const [newStackColor, setNewStackColor] = useState('#007AFF');
  const [selectedSkills, setSelectedSkills] = useState(new Set(preselectedSkills));
  const [skillSearch, setSkillSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadStacks = async () => {
    try {
      setLoading(true);
      const res = await fetchStacks();
      setStacks(res.stacks || []);
    } catch (err) {
      showToast('Failed to load stacks: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStacks();
    if (preselectedSkills && preselectedSkills.length > 0) {
      setSelectedSkills(new Set(preselectedSkills));
      setActiveTab('create');
      setNewStackName(`Custom Stack (${preselectedSkills.length} skills)`);
    }
  }, []);

  const handleApply = async (stackId) => {
    if (!targetPlatformId) return;
    try {
      setApplyingStackId(stackId);
      const res = await applyStack({ stackId, targetPlatformId });
      const appliedCount = res.applied?.length || 0;
      showToast(`Applied ${appliedCount} skills from "${res.stackName}" to ${res.targetPlatform}!`, 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setApplyingStackId(null);
    }
  };

  const toggleSkillSelection = (skillName) => {
    setSelectedSkills(prev => {
      const next = new Set(prev);
      if (next.has(skillName)) next.delete(skillName);
      else next.add(skillName);
      return next;
    });
  };

  const handleCreateStack = async (e) => {
    e.preventDefault();
    if (!newStackName.trim()) {
      showToast('Stack name is required', 'error');
      return;
    }
    if (selectedSkills.size === 0) {
      showToast('Please select at least one skill for this stack', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const stackId = newStackName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const newStack = {
        id: stackId,
        name: newStackName.trim(),
        description: newStackDesc.trim() || 'Custom workflow profile',
        icon: 'Layers',
        color: newStackColor,
        skills: Array.from(selectedSkills)
      };

      const updated = [...stacks.filter(s => s.id !== stackId), newStack];
      await saveStacks(updated);
      setStacks(updated);
      showToast(`Created stack "${newStack.name}"!`, 'success');
      setActiveTab('browse');
      setNewStackName('');
      setNewStackDesc('');
      setSelectedSkills(new Set());
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStack = async (stackId) => {
    try {
      const updated = stacks.filter(s => s.id !== stackId);
      await saveStacks(updated);
      setStacks(updated);
      showToast('Stack removed', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredSkillsForPicker = allSkills.filter(s => {
    const term = skillSearch.toLowerCase().trim();
    return !term || s.name.toLowerCase().includes(term) || s.displayName?.toLowerCase().includes(term);
  });

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-black/10 dark:border-white/10 bg-[#fbfcfd] dark:bg-[#1a1c24] shadow-2xl overflow-hidden macos-glass">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0 shadow-xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Skill Stacks & Workflow Profiles
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                  {stacks.length} Profiles
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Save, manage, and 1-click activate curated skill bundles for specific project stacks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/10 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('browse')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'browse'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Browse Stacks
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  activeTab === 'create'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Stack</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-[#007AFF] mb-2" />
              Loading skill stacks...
            </div>
          ) : activeTab === 'browse' ? (
            /* BROWSE STACKS */
            <div className="space-y-4">
              {/* Target assistant selector bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-[#007AFF]" />
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">Target Assistant to Mount:</span>
                </div>
                <select
                  value={targetPlatformId}
                  onChange={(e) => setTargetPlatformId(e.target.value)}
                  className="bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/35"
                >
                  {platforms.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.path})
                    </option>
                  ))}
                </select>
              </div>

              {/* Stacks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stacks.map(stack => {
                  const isApplying = applyingStackId === stack.id;

                  return (
                    <div
                      key={stack.id}
                      className="group flex flex-col justify-between p-4 rounded-xl border border-black/[0.08] dark:border-white/10 bg-white/70 dark:bg-white/[0.03] hover:border-[#007AFF]/40 dark:hover:border-[#007AFF]/40 transition-all shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="h-8 w-8 rounded-lg flex items-center justify-center text-white shadow-2xs flex-shrink-0"
                              style={{ backgroundColor: stack.color || '#007AFF' }}
                            >
                              <Layers className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                                {stack.name}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {stack.skills.length} skills bundled
                              </span>
                            </div>
                          </div>

                          {stack.id.startsWith('custom') || !['fullstack-web', 'devops-sre', 'qa-security'].includes(stack.id) ? (
                            <button
                              onClick={() => handleDeleteStack(stack.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                              title="Delete stack"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                          {stack.description}
                        </p>

                        {/* Skill Pills */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {stack.skills.map(skillName => (
                            <span
                              key={skillName}
                              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/5 border border-black/[0.04] dark:border-white/5 text-slate-700 dark:text-slate-300"
                            >
                              {skillName}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-black/[0.05] dark:border-white/5 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          Mounts as symlinks
                        </span>

                        <button
                          type="button"
                          onClick={() => handleApply(stack.id)}
                          disabled={isApplying}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold shadow-xs shadow-[#007AFF]/25 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          <span>{isApplying ? 'Applying...' : 'Apply Stack'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* CREATE CUSTOM STACK */
            <form onSubmit={handleCreateStack} className="space-y-4 max-w-2xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Stack Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newStackName}
                    onChange={(e) => setNewStackName(e.target.value)}
                    placeholder="e.g. Data Science & Machine Learning"
                    className="w-full bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/35"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Theme Color
                  </label>
                  <div className="flex items-center gap-2">
                    {['#007AFF', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewStackColor(color)}
                        className={`h-7 w-7 rounded-lg transition-transform ${newStackColor === color ? 'ring-2 ring-offset-2 ring-[#007AFF] scale-110' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newStackDesc}
                  onChange={(e) => setNewStackDesc(e.target.value)}
                  placeholder="Short summary of what this stack contains..."
                  className="w-full bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/35"
                />
              </div>

              {/* Skill Picker */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Select Skills ({selectedSkills.size} chosen)
                  </label>

                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                    <input
                      type="text"
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      placeholder="Filter skills..."
                      className="w-full bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/10 rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-black/[0.04] dark:divide-white/5 border border-black/[0.08] dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.02]">
                  {filteredSkillsForPicker.map(s => {
                    const isChecked = selectedSkills.has(s.name);

                    return (
                      <label
                        key={s.name}
                        className={`flex items-center justify-between p-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] cursor-pointer transition-colors ${isChecked ? 'bg-[#007AFF]/5' : ''}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSkillSelection(s.name)}
                            className="rounded border-slate-300 text-[#007AFF] focus:ring-[#007AFF]"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-slate-900 dark:text-white truncate block">
                              {s.displayName || s.name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 truncate block">
                              {s.name}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-slate-400">
                          {s.metadata?.version ? `v${s.metadata.version}` : ''}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.08] dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('browse')}
                  className="px-3.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !newStackName.trim() || selectedSkills.size === 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold shadow-xs shadow-[#007AFF]/25 disabled:opacity-50 transition-all"
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}
                  <span>Save Stack</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-t border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
          <span className="text-xs text-slate-500">
            {stacks.length} stacks configured • Symlinks keep all assistants synchronized
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
