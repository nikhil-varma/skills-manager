import React, { useState, useEffect } from 'react';
import { 
  X, 
  Radar, 
  CheckCircle2, 
  Plus, 
  Bot, 
  Terminal, 
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
  const activeCountInCurrent = currentList.filter(i => selectedTools.has(i.path)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Radar className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                macOS Tool & Skill Discovery
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {data.totalFound} locations found
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Check or uncheck locations to add or remove them from SkillDesk
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs & Bulk Action */}
        <div className="flex items-center justify-between border-b border-white/5 bg-slate-900/50 px-6 py-2.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('global')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'global'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Global Assistants ({data.globalTools.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'projects'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Folder className="h-3.5 w-3.5" />
              <span>Project Repositories ({data.projectWorkspaces.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => selectAll(currentList)}
              className="text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Select All
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={() => deselectAll(currentList)}
              className="text-slate-400 hover:text-slate-200"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Radar className="h-8 w-8 text-indigo-400 animate-spin" />
              <p className="text-sm">Scanning macOS filesystem for AI assistants & skills...</p>
            </div>
          ) : currentList.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              No matching locations found in this category.
            </div>
          ) : (
            currentList.map((item) => {
              const isChecked = selectedTools.has(item.path);

              return (
                <div
                  key={item.path}
                  onClick={() => toggleSelect(item.path)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-500/5 ring-1 ring-indigo-500/30'
                      : 'bg-slate-900/60 border-white/5 hover:border-white/15 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.path);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-white/20 text-indigo-600 focus:ring-indigo-500 bg-slate-900 h-4 w-4 cursor-pointer"
                    />

                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: `${item.color || '#6366F1'}25` }}
                    >
                      {activeTab === 'global' ? (
                        <Bot className="h-4 w-4" style={{ color: item.color }} />
                      ) : (
                        <Folder className="h-4 w-4 text-purple-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 text-sm">
                          {item.name}
                        </span>
                        {isChecked && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-medium">
                            <Check className="h-3 w-3" /> Added to SkillDesk
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 truncate max-w-md mt-0.5">
                        {item.path}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
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
                      className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
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
        <div className="p-4 border-t border-white/5 bg-slate-900/60 flex items-center justify-between text-xs">
          <div className="text-slate-400">
            <strong className="text-indigo-400 font-mono">{selectedTools.size}</strong> locations selected in SkillDesk
          </div>

          <div className="flex items-center gap-2">
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
              <Sparkles className="h-3.5 w-3.5" />
              <span>{saving ? 'Saving...' : 'Apply Selection'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
