import React, { useState, useEffect } from 'react';
import { 
  X, 
  Radar, 
  CheckCircle2, 
  Plus, 
  Bot, 
  Folder, 
  Sparkles, 
  ExternalLink,
  Layers,
  ArrowRight,
  Check
} from 'lucide-react';
import { fetchDiscoverTools, syncDiscoveredSelection, revealInFinder } from '../api.js';

export default function AutoDiscoverModal({
  onClose,
  onSuccess,
  showToast,
  onRevealPath
}) {
  const [data, setData] = useState({ globalTools: [], projectWorkspaces: [], totalFound: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTools, setSelectedTools] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('global'); // 'global' | 'projects'

  useEffect(() => {
    loadDiscovery();
  }, []);

  const loadDiscovery = async () => {
    try {
      setLoading(true);
      const res = await fetchDiscoverTools();
      setData(res);

      // Check all items that are currently already added in SkillDesk
      const toSelect = new Set();
      [...res.globalTools, ...res.projectWorkspaces].forEach(t => {
        if (t.isAdded) {
          toSelect.add(t.path);
        }
      });
      setSelectedTools(toSelect);
    } catch (err) {
      showToast('Failed to scan macOS for tools: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (path) => {
    const next = new Set(selectedTools);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    setSelectedTools(next);
  };

  const selectAll = (items) => {
    const next = new Set(selectedTools);
    items.forEach(i => next.add(i.path));
    setSelectedTools(next);
  };

  const deselectAll = (items) => {
    const next = new Set(selectedTools);
    items.forEach(i => next.delete(i.path));
    setSelectedTools(next);
  };

  const handleSave = async () => {
    const all = [...data.globalTools, ...data.projectWorkspaces];
    const itemsToKeep = all.filter(item => selectedTools.has(item.path));

    try {
      setSaving(true);
      await syncDiscoveredSelection(itemsToKeep);
      showToast(`Updated active locations in SkillDesk (${itemsToKeep.length} active)`, 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const currentList = activeTab === 'global' ? data.globalTools : data.projectWorkspaces;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-2xl border border-black/10 dark:border-white/15 bg-[#fafbfc]/95 dark:bg-[#1c1e26]/95 shadow-2xl backdrop-blur-2xl overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/10 px-4 sm:px-6 py-3.5 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-[#007AFF]/15 border border-[#007AFF]/30 flex items-center justify-center text-[#007AFF] shadow-xs flex-shrink-0">
              <Radar className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2 truncate">
                <span>Tool & Skill Discovery</span>
                <span className="text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  {data.totalFound} found
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Check or uncheck locations to add or remove them from SkillDesk
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0 ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs & Bulk Action (macOS Segmented Capsule Control) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/[0.06] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.015] px-4 sm:px-6 py-2.5 gap-2">
          <div className="p-1 rounded-xl bg-black/[0.04] dark:bg-black/40 border border-black/[0.06] dark:border-white/10 inline-flex gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('global')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'global'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bot className="h-3.5 w-3.5 text-[#007AFF]" />
              <span>Global Assistants ({data.globalTools.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'projects'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Folder className="h-3.5 w-3.5 text-[#AF52DE]" />
              <span>Project Repositories ({data.projectWorkspaces.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => selectAll(currentList)}
              className="text-[#007AFF] hover:underline font-medium"
            >
              Select All
            </button>
            <span className="text-black/20 dark:text-white/20">|</span>
            <button
              type="button"
              onClick={() => deselectAll(currentList)}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          {loading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Radar className="h-8 w-8 text-[#007AFF] animate-spin" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Scanning macOS filesystem for AI assistants & skills...</p>
            </div>
          ) : currentList.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              No matching locations found in this category.
            </div>
          ) : (
            currentList.map((item) => {
              const isChecked = selectedTools.has(item.path);

              return (
                <div
                  key={item.path}
                  onClick={() => toggleSelect(item.path)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-[#007AFF]/5 border-[#007AFF]/40 dark:border-[#007AFF]/50 shadow-2xs'
                      : 'bg-white/70 dark:bg-white/5 border-black/[0.06] dark:border-white/10 hover:border-black/15 dark:hover:border-white/20 hover:bg-black/[0.02] dark:hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.path);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-black/20 dark:border-white/20 text-[#007AFF] focus:ring-[#007AFF] bg-white dark:bg-black/50 h-4 w-4 cursor-pointer accent-[#007AFF]"
                    />

                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: `${item.color || '#007AFF'}20` }}
                    >
                      {activeTab === 'global' ? (
                        <Bot className="h-4 w-4" style={{ color: item.color }} />
                      ) : (
                        <Folder className="h-4 w-4 text-[#AF52DE]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">
                          {item.name}
                        </span>
                        {isChecked && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-medium">
                            <Check className="h-3 w-3" /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-md mt-0.5">
                        {item.path}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0 ml-2">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/10 border border-black/[0.06] dark:border-white/10 text-slate-700 dark:text-slate-300">
                      {item.count} skills
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onRevealPath) {
                          onRevealPath(item.path);
                        } else {
                          revealInFinder(item.path);
                        }
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      title="Reveal in Finder or Copy Path"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between text-xs">
          <div className="text-slate-500 text-[11px]">
            <strong className="text-[#007AFF] font-mono">{selectedTools.size}</strong> locations active in SkillDesk
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066d6] text-white font-semibold shadow-xs transition-all disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{saving ? 'Saving...' : 'Apply Selection'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
