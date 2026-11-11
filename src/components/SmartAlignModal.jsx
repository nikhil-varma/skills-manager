import React, { useState, useEffect } from 'react';
import { 
  X, 
  Zap, 
  AlertTriangle, 
  Check, 
  RefreshCw, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Layers, 
  ShieldAlert, 
  Link2, 
  Copy, 
  Loader2,
  FileText
} from 'lucide-react';
import { fetchSmartAlignPreview, applySmartAlign } from '../api.js';

export default function SmartAlignModal({
  platforms = [],
  onClose,
  onSuccess,
  showToast
}) {
  const [strategy, setStrategy] = useState('newest'); // 'newest' | 'fixed'
  const [preferredSourceId, setPreferredSourceId] = useState(
    platforms.find(p => p.id === 'shared')?.id || platforms[0]?.id || ''
  );
  const [mode, setMode] = useState('symlink'); // 'symlink' | 'overwrite'
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState(new Set());

  const loadPreview = async (strat = strategy, prefId = preferredSourceId) => {
    try {
      setLoading(true);
      const res = await fetchSmartAlignPreview({
        strategy: strat,
        preferredSourceId: strat === 'fixed' ? prefId : null
      });
      setPreviewData(res);
      // Default: select all items
      setSelectedSkills(new Set((res.items || []).map(i => i.skillName)));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview(strategy, preferredSourceId);
  }, [strategy, preferredSourceId]);

  const handleToggleSkill = (skillName) => {
    setSelectedSkills(prev => {
      const next = new Set(prev);
      if (next.has(skillName)) next.delete(skillName);
      else next.add(skillName);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!previewData?.items) return;
    if (selectedSkills.size === previewData.items.length) {
      setSelectedSkills(new Set());
    } else {
      setSelectedSkills(new Set(previewData.items.map(i => i.skillName)));
    }
  };

  const handleApply = async () => {
    if (selectedSkills.size === 0) {
      showToast('Please select at least one skill to align', 'error');
      return;
    }

    const itemsToAlign = (previewData?.items || []).filter(item => 
      selectedSkills.has(item.skillName)
    );

    try {
      setApplying(true);
      const res = await applySmartAlign({
        items: itemsToAlign.map(i => ({
          skillName: i.skillName,
          sourcePlatformId: i.sourcePlatformId,
          targetPlatformIds: i.targets.map(t => t.platformId)
        })),
        mode
      });

      showToast(
        `Successfully smart-aligned ${res.reconciledCount} skills via ${mode === 'symlink' ? 'symlinks' : 'copies'}!`,
        'success'
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setApplying(false);
    }
  };

  const items = previewData?.items || [];
  const isAllSelected = items.length > 0 && selectedSkills.size === items.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white/95 dark:bg-[#1a1c24]/95 border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
              <Zap className="h-5 w-5 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                  Smart Drift Reconciler
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                  {items.length} Drifted
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automatically identify the latest edits and synchronize skills across your coding assistants.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Strategy & Mode Configuration Card */}
        <div className="p-5 border-b border-black/[0.06] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.015] space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              1. Authoritative Source Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setStrategy('newest')}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                  strategy === 'newest'
                    ? 'border-[#007AFF] bg-[#007AFF]/[0.06] ring-1 ring-[#007AFF]/40 text-slate-900 dark:text-white'
                    : 'border-black/[0.08] dark:border-white/10 bg-white/60 dark:bg-black/20 text-slate-600 dark:text-slate-400 hover:border-black/20 dark:hover:border-white/20'
                }`}
              >
                <div className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  strategy === 'newest' ? 'border-[#007AFF] bg-[#007AFF] text-white' : 'border-slate-400'
                }`}>
                  {strategy === 'newest' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="font-semibold text-xs flex items-center gap-1.5">
                    <span>⚡ Latest Modification</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Inspects file timestamps and uses the most recently modified copy per skill.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStrategy('fixed')}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                  strategy === 'fixed'
                    ? 'border-[#007AFF] bg-[#007AFF]/[0.06] ring-1 ring-[#007AFF]/40 text-slate-900 dark:text-white'
                    : 'border-black/[0.08] dark:border-white/10 bg-white/60 dark:bg-black/20 text-slate-600 dark:text-slate-400 hover:border-black/20 dark:hover:border-white/20'
                }`}
              >
                <div className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  strategy === 'fixed' ? 'border-[#007AFF] bg-[#007AFF] text-white' : 'border-slate-400'
                }`}>
                  {strategy === 'fixed' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs">
                    <span>🎯 Master Assistant</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed mb-2">
                    Enforce one chosen platform as the source of truth across all drifted skills.
                  </p>
                  {strategy === 'fixed' && (
                    <select
                      value={preferredSourceId}
                      onChange={(e) => setPreferredSourceId(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-[#15171e] border border-black/15 dark:border-white/15 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                    >
                      {platforms.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.id === 'shared' ? '(Shared Hub)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Alignment Method:
            </span>
            <div className="p-1 rounded-xl bg-black/[0.04] dark:bg-black/40 border border-black/[0.06] dark:border-white/10 inline-flex gap-1">
              <button
                type="button"
                onClick={() => setMode('symlink')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  mode === 'symlink'
                    ? 'bg-white dark:bg-white/15 text-purple-600 dark:text-purple-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Converts target copies to symlinks so future edits stay synchronized forever"
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>Symlink (Permanent Sync)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('overwrite')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  mode === 'overwrite'
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Copies content over target directories, keeping files independent"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>File Overwrite</span>
              </button>
            </div>
          </div>
        </div>

        {/* Drifted Skills Review List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold text-[#007AFF] hover:underline"
              >
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-xs text-slate-400">
                ({selectedSkills.size} of {items.length} selected)
              </span>
            </div>
            <button
              onClick={() => loadPreview(strategy, preferredSourceId)}
              disabled={loading}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Re-scan</span>
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin mx-auto mb-2 text-[#007AFF]" />
              <p className="text-xs font-medium">Analyzing timestamps and file revisions...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-dashed border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
              <CheckCircle2 className="h-9 w-9 text-emerald-500 mx-auto mb-2" />
              <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                Zero Drift Detected!
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                All skills across your assistants are perfectly aligned.
              </p>
            </div>
          ) : (
            items.map(item => {
              const isSelected = selectedSkills.has(item.skillName);
              return (
                <div
                  key={item.skillName}
                  onClick={() => handleToggleSkill(item.skillName)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-[#007AFF]/50 bg-[#007AFF]/[0.03] ring-1 ring-[#007AFF]/30'
                      : 'border-black/[0.06] dark:border-white/10 bg-white/60 dark:bg-black/20 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleToggleSkill(item.skillName); }}
                      className={`h-4 w-4 rounded border transition-colors flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-[#007AFF] border-[#007AFF] text-white'
                          : 'border-black/25 dark:border-white/25 bg-white/80 dark:bg-black/40'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {item.displayName || item.skillName}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 truncate">
                          {item.skillName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {/* Source Badge */}
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          <Zap className="h-3 w-3 fill-emerald-500" />
                          <span>Source: {item.sourcePlatformName}</span>
                          <span className="opacity-75 font-mono">({item.sourceRelativeTime})</span>
                        </div>

                        <ArrowRight className="h-3 w-3 text-slate-400" />

                        {/* Target Platforms */}
                        <div className="inline-flex items-center gap-1">
                          <span className="text-[10px] text-slate-500">Sync to:</span>
                          {item.targets.map(t => (
                            <span 
                              key={t.platformId}
                              className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-black/[0.04] dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-black/5 dark:border-white/10"
                              title={`Target: ${t.platformName} (edited ${t.relativeTime})`}
                            >
                              {t.platformName}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {selectedSkills.size > 0 ? (
              <>
                Will reconcile <strong>{selectedSkills.size}</strong> skills using{' '}
                <span className="font-mono text-purple-600 dark:text-purple-400">
                  {mode === 'symlink' ? 'Symlinks' : 'Copy'}
                </span>
              </>
            ) : (
              'No skills selected'
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={applying}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={applying || selectedSkills.size === 0}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-xs shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {applying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Reconciling...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 fill-white" />
                  <span>Smart Align {selectedSkills.size} Skills</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
