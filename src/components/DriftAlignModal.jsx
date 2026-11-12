import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  AlertTriangle, 
  Zap, 
  Check, 
  Link2, 
  Folder, 
  FileCode, 
  Clock, 
  Hash, 
  HardDrive, 
  Loader2, 
  CheckCircle2, 
  ExternalLink,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  GitCompare,
  ListFilter,
  ArrowLeftRight,
  Columns,
  Minus,
  Plus,
  RefreshCw,
  Star
} from 'lucide-react';
import { fetchSkillDetail, alignSkillWithCanonical, revealInFinder } from '../api.js';
import { formatTimeAgo, formatDateTime } from '../utils/time.js';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// Myers / LCS line-by-line diff algorithm
function computeLineDiff(textA = '', textB = '') {
  const linesA = textA ? textA.split(/\r?\n/) : [];
  const linesB = textB ? textB.split(/\r?\n/) : [];

  const m = linesA.length;
  const n = linesB.length;
  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (linesA[i - 1] === linesB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const diff = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      diff.unshift({ type: 'same', lineA: i, lineB: j, text: linesA[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({ type: 'added', lineB: j, text: linesB[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diff.unshift({ type: 'removed', lineA: i, text: linesA[i - 1] });
      i--;
    }
  }
  return diff;
}

export default function DriftAlignModal({
  skillName,
  initialSkill,
  platforms = [],
  onClose,
  onSuccess,
  showToast,
  onRevealPath
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'diff'
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [compareTargetId, setCompareTargetId] = useState('');
  const [alignMode, setAlignMode] = useState('symlink'); // 'symlink' | 'overwrite'
  const [selectedTargets, setSelectedTargets] = useState(new Set());
  const [isAligning, setIsAligning] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchSkillDetail(skillName);
      setDetail(data);

      const installs = data.allInstallations || [];
      const missing = data.missingPlatforms || [];

      if (installs.length > 0) {
        // Preferred canonical source:
        const suggestedId = data.canonicalSource?.platformId || installs[0].platformId;
        setSelectedSourceId(suggestedId);

        // Select comparison target: first platform with differing hash
        const diverged = installs.find(i => i.platformId !== suggestedId && i.fileHash !== installs.find(s => s.platformId === suggestedId)?.fileHash) ||
                         installs.find(i => i.platformId !== suggestedId) ||
                         installs[0];
        setCompareTargetId(diverged?.platformId || '');

        // Select all other targets by default (both existing copies and missing platforms)
        const targets = new Set();
        installs.forEach(i => {
          if (i.platformId !== suggestedId) targets.add(i.platformId);
        });
        missing.forEach(m => {
          targets.add(m.platformId);
        });
        setSelectedTargets(targets);
      }
    } catch (err) {
      showToast('Failed to load skill details: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [skillName]);

  // When source changes, ensure it's removed from targets
  const handleSelectSource = (platId) => {
    setSelectedSourceId(platId);
    setSelectedTargets(prev => {
      const next = new Set(prev);
      next.delete(platId);
      if (detail?.allInstallations) {
        for (const inst of detail.allInstallations) {
          if (inst.platformId !== platId) next.add(inst.platformId);
        }
      }
      if (detail?.missingPlatforms) {
        for (const m of detail.missingPlatforms) {
          if (m.platformId !== platId) next.add(m.platformId);
        }
      }
      return next;
    });

    // If compare target was source, pick another
    if (compareTargetId === platId && detail?.allInstallations) {
      const other = detail.allInstallations.find(i => i.platformId !== platId);
      if (other) setCompareTargetId(other.platformId);
    }
  };

  const toggleTarget = (platId) => {
    setSelectedTargets(prev => {
      const next = new Set(prev);
      if (next.has(platId)) {
        next.delete(platId);
      } else {
        next.add(platId);
      }
      return next;
    });
  };

  const selectAllTargets = () => {
    const next = new Set();
    if (detail?.allInstallations) {
      for (const inst of detail.allInstallations) {
        if (inst.platformId !== selectedSourceId) next.add(inst.platformId);
      }
    }
    if (detail?.missingPlatforms) {
      for (const m of detail.missingPlatforms) {
        if (m.platformId !== selectedSourceId) next.add(m.platformId);
      }
    }
    setSelectedTargets(next);
  };

  const deselectAllTargets = () => {
    setSelectedTargets(new Set());
  };

  const handleAlign = async () => {
    if (!selectedSourceId) {
      showToast('Please select a source platform', 'error');
      return;
    }
    if (selectedTargets.size === 0) {
      showToast('Please select at least one target location to sync', 'error');
      return;
    }

    try {
      setIsAligning(true);
      const res = await alignSkillWithCanonical({
        skillName,
        canonicalPlatformId: selectedSourceId,
        mode: alignMode,
        targetPlatformIds: Array.from(selectedTargets)
      });

      const updatedCount = res.updatedPlatforms?.length || 0;
      showToast(`Synchronized ${updatedCount} location${updatedCount === 1 ? '' : 's'} with source "${res.sourcePlatform}"!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsAligning(false);
    }
  };

  const selectedSourceInstallation = useMemo(() => {
    return detail?.allInstallations?.find(i => i.platformId === selectedSourceId);
  }, [detail, selectedSourceId]);

  const compareTargetInstallation = useMemo(() => {
    return detail?.allInstallations?.find(i => i.platformId === compareTargetId);
  }, [detail, compareTargetId]);

  const newestInstallation = useMemo(() => {
    if (!detail?.allInstallations) return null;
    const sorted = [...detail.allInstallations]
      .filter(i => i.mtime)
      .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
    return sorted[0] || null;
  }, [detail]);

  // Count distinct hashes across installations
  const distinctHashCount = useMemo(() => {
    const hashes = new Set();
    if (detail?.allInstallations) {
      for (const inst of detail.allInstallations) {
        if (inst.fileHash) hashes.add(inst.fileHash);
      }
    }
    return hashes.size;
  }, [detail]);

  // Compute visual line diff between Source and Compare Target
  const lineDiff = useMemo(() => {
    if (!selectedSourceInstallation || !compareTargetInstallation) return [];
    const sourceText = selectedSourceInstallation.content || detail?.rawContent || '';
    const targetText = compareTargetInstallation.content || '';
    return computeLineDiff(sourceText, targetText);
  }, [selectedSourceInstallation, compareTargetInstallation, detail]);

  const diffStats = useMemo(() => {
    let added = 0, removed = 0, same = 0;
    for (const d of lineDiff) {
      if (d.type === 'added') added++;
      else if (d.type === 'removed') removed++;
      else same++;
    }
    return { added, removed, same };
  }, [lineDiff]);

  const existingOtherTargets = useMemo(() => {
    return (detail?.allInstallations || []).filter(i => i.platformId !== selectedSourceId);
  }, [detail, selectedSourceId]);

  const missingTargets = useMemo(() => {
    return (detail?.missingPlatforms || []).filter(m => m.platformId !== selectedSourceId);
  }, [detail, selectedSourceId]);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-black/10 dark:border-white/10 bg-[#fbfcfd] dark:bg-[#1a1c24] shadow-2xl overflow-hidden macos-glass">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-[#007AFF]/15 border border-[#007AFF]/30 flex items-center justify-center text-[#007AFF] flex-shrink-0 shadow-xs">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                  Skill Synchronization & Alignment
                </h3>
                {distinctHashCount > 1 ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex-shrink-0">
                    {distinctHashCount} Divergent Copies (Drift)
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex-shrink-0">
                    Copies In Parity
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Skill: <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{skillName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Locations List vs Visual Diff */}
            <div className="p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/10 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ListFilter className="h-3.5 w-3.5 text-[#007AFF]" />
                <span>Locations</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('diff')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'diff'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <GitCompare className="h-3.5 w-3.5 text-amber-500" />
                <span>Visual Diff</span>
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
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Loader2 className="h-6 w-6 animate-spin text-[#007AFF] mb-2" />
              Scanning locations and modification timestamps...
            </div>
          ) : viewMode === 'list' ? (
            /* LIST VIEW: Source selection & target alignment breakdown */
            <>
              {/* Recommended Source of Truth Banner */}
              {detail?.canonicalSource && (
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-300">
                          ★ Suggested Source of Truth:
                        </span>
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {detail.canonicalSource.platformName}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
                          {detail.canonicalSource.reason}
                        </span>
                      </div>
                      
                      {detail.canonicalSource.mtime && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span>Last updated: <strong>{formatDateTime(detail.canonicalSource.mtime)}</strong> ({formatTimeAgo(detail.canonicalSource.mtime)})</span>
                        </p>
                      )}

                      <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {detail.canonicalSource.displayPath || detail.canonicalSource.path}
                      </p>
                    </div>
                  </div>

                  {selectedSourceId !== detail.canonicalSource.platformId ? (
                    <button
                      type="button"
                      onClick={() => handleSelectSource(detail.canonicalSource.platformId)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-xs flex-shrink-0 flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Use Suggested Source</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex-shrink-0 border border-emerald-500/30">
                      <Check className="h-3.5 w-3.5" />
                      <span>Selected Source</span>
                    </span>
                  )}
                </div>
              )}

              {/* Step 1: Where all it exists */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      1. Where All It Exists ({detail?.allInstallations?.length || 0} Locations)
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Select which location to use as the source of truth to sync everything else with:
                    </p>
                  </div>

                  {newestInstallation && newestInstallation.platformId !== selectedSourceId && (
                    <button
                      type="button"
                      onClick={() => handleSelectSource(newestInstallation.platformId)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition-all active:scale-95 self-start sm:self-auto cursor-pointer"
                    >
                      <Zap className="h-3 w-3 fill-amber-500 text-amber-500" />
                      <span>Pick Newest: {newestInstallation.platformName} ({formatTimeAgo(newestInstallation.mtime)})</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {detail?.allInstallations?.map(inst => {
                    const isSource = inst.platformId === selectedSourceId;
                    const isSym = inst.isSymlink;
                    const isNewest = newestInstallation && inst.platformId === newestInstallation.platformId;
                    const isIdenticalToSource = selectedSourceInstallation?.fileHash && inst.fileHash === selectedSourceInstallation.fileHash;

                    return (
                      <div
                        key={inst.platformId}
                        onClick={() => handleSelectSource(inst.platformId)}
                        className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSource
                            ? 'bg-[#007AFF]/10 dark:bg-[#007AFF]/15 border-[#007AFF] ring-1 ring-[#007AFF]/40 shadow-xs'
                            : 'bg-white dark:bg-white/[0.03] hover:bg-black/[0.02] dark:hover:bg-white/[0.06] border-black/[0.08] dark:border-white/10'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          {/* Radio circle */}
                          <div className={`h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0 transition-colors ${
                            isSource
                              ? 'border-[#007AFF] bg-[#007AFF]'
                              : 'border-slate-300 dark:border-white/30 bg-transparent'
                          }`}>
                            {isSource && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>

                          {/* Platform badge */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: inst.color || '#007AFF' }}
                              />
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {inst.platformName}
                              </span>

                              {isSource && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.2 rounded-full bg-[#007AFF] text-white shadow-2xs">
                                  <Star className="h-2.5 w-2.5 fill-white" />
                                  Source of Truth
                                </span>
                              )}

                              {isNewest && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                  <Zap className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
                                  ⚡ Newest Revision
                                </span>
                              )}

                              {isSym ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                  <Link2 className="h-2.5 w-2.5" />
                                  Symlink
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                  <Folder className="h-2.5 w-2.5" />
                                  Standalone Directory
                                </span>
                              )}
                            </div>

                            <p className="font-mono text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-sm sm:max-w-md mt-0.5">
                              {inst.displayPath || inst.path}
                            </p>
                          </div>
                        </div>

                        {/* Metadata Pills: Modification Time, Hash & Finder */}
                        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-start sm:justify-end text-[11px] font-mono text-slate-500 dark:text-slate-400 flex-shrink-0">
                          {inst.mtime && (
                            <span 
                              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${
                                isNewest 
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20' 
                                  : 'text-slate-600 dark:text-slate-400 bg-black/[0.03] dark:bg-white/[0.05]'
                              }`} 
                              title={`Exact modification timestamp: ${inst.mtime} (${formatDateTime(inst.mtime)})`}
                            >
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              <span className="font-sans font-medium">Updated:</span>
                              <span className="font-sans font-bold">{formatTimeAgo(inst.mtime)}</span>
                              <span className="opacity-75 font-normal text-[10px] hidden md:inline">({formatDateTime(inst.mtime)})</span>
                            </span>
                          )}

                          {!isSource && selectedSourceInstallation && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              isIdenticalToSource
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                            }`}>
                              {isIdenticalToSource ? 'Matches Source' : 'Diverged'}
                            </span>
                          )}

                          {inst.fileSize > 0 && (
                            <span className="hidden sm:inline">{formatBytes(inst.fileSize)}</span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onRevealPath) onRevealPath(inst.dirPath);
                              else revealInFinder(inst.dirPath);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            title="Reveal in macOS Finder"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Active Source of Truth Callout */}
                {selectedSourceInstallation && (
                  <div className="mt-3 p-3 rounded-xl bg-[#007AFF]/10 border border-[#007AFF]/25 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-[#007AFF] tracking-wider block">
                        Everything else will be synced with:
                      </span>
                      <code className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                        {selectedSourceInstallation.displayPath || selectedSourceInstallation.path}
                      </code>
                    </div>
                    {onRevealPath && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRevealPath(selectedSourceInstallation.dirPath); }}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-black/40 hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold text-[11px] border border-black/10 dark:border-white/10 transition-colors flex-shrink-0 cursor-pointer"
                      >
                        Reveal in Finder
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Target Locations & Sync Strategy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Targets to sync */}
                <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      2. Targets to Sync ({selectedTargets.size} selected)
                    </label>
                    <div className="flex items-center gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={selectAllTargets}
                        className="text-[#007AFF] hover:underline font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={deselectAllTargets}
                        className="text-slate-500 hover:underline"
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {/* Existing other locations */}
                    {existingOtherTargets.length > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Existing Copies to Overwrite / Re-link:
                        </div>
                        <div className="space-y-1">
                          {existingOtherTargets.map(inst => {
                            const isChecked = selectedTargets.has(inst.platformId);
                            const isIdentical = selectedSourceInstallation?.fileHash && inst.fileHash === selectedSourceInstallation.fileHash;

                            return (
                              <label
                                key={inst.platformId}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleTarget(inst.platformId)}
                                    className="rounded border-slate-300 text-[#007AFF] focus:ring-[#007AFF]"
                                  />
                                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: inst.color || '#007AFF' }} />
                                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                                    {inst.platformName}
                                  </span>
                                </div>

                                {isIdentical ? (
                                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                                    Matches source
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex-shrink-0">
                                    Diverged
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Missing platforms */}
                    {missingTargets.length > 0 && (
                      <div className="pt-2 border-t border-black/[0.04] dark:border-white/5">
                        <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Plus className="h-3 w-3" />
                          <span>Missing Assistants to Deploy / Link into:</span>
                        </div>
                        <div className="space-y-1">
                          {missingTargets.map(m => {
                            const isChecked = selectedTargets.has(m.platformId);
                            return (
                              <label
                                key={m.platformId}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleTarget(m.platformId)}
                                    className="rounded border-slate-300 text-[#007AFF] focus:ring-[#007AFF]"
                                  />
                                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color || '#007AFF' }} />
                                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                                    {m.platformName}
                                  </span>
                                </div>
                                <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20 flex-shrink-0">
                                  New Link
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Alignment Method */}
                <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02]">
                  <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                    3. Synchronization Strategy
                  </label>

                  <div className="space-y-2.5">
                    <label className={`block p-2.5 rounded-lg border transition-all cursor-pointer ${
                      alignMode === 'symlink'
                        ? 'border-[#007AFF] bg-[#007AFF]/5 text-slate-900 dark:text-white ring-1 ring-[#007AFF]/30'
                        : 'border-black/[0.06] dark:border-white/10 text-slate-600 dark:text-slate-400'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="alignMode"
                          value="symlink"
                          checked={alignMode === 'symlink'}
                          onChange={() => setAlignMode('symlink')}
                          className="text-[#007AFF] focus:ring-[#007AFF]"
                        />
                        <span className="font-bold text-xs">Symlink across all (Recommended)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 pl-5 leading-relaxed">
                        Replaces target copies with symlinks pointing to the chosen source for seamless, zero-drift synchronization.
                      </p>
                    </label>

                    <label className={`block p-2.5 rounded-lg border transition-all cursor-pointer ${
                      alignMode === 'overwrite'
                        ? 'border-[#007AFF] bg-[#007AFF]/5 text-slate-900 dark:text-white ring-1 ring-[#007AFF]/30'
                        : 'border-black/[0.06] dark:border-white/10 text-slate-600 dark:text-slate-400'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="alignMode"
                          value="overwrite"
                          checked={alignMode === 'overwrite'}
                          onChange={() => setAlignMode('overwrite')}
                          className="text-[#007AFF] focus:ring-[#007AFF]"
                        />
                        <span className="font-bold text-xs">Copy & Overwrite Physical Files</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 pl-5 leading-relaxed">
                        Keeps standalone directories in targets, but copies the files from the chosen source to bring them into identical parity.
                      </p>
                    </label>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* VISUAL DIFF VIEW: Side-by-side / Unified Git diff */
            <div className="space-y-4">
              {/* Diff Control Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">Source:</span>
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedSourceInstallation?.color || '#007AFF' }} />
                      {selectedSourceInstallation?.platformName}
                    </span>
                  </div>

                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">Compare with:</span>
                    <select
                      value={compareTargetId}
                      onChange={(e) => setCompareTargetId(e.target.value)}
                      className="bg-white dark:bg-black/50 border border-black/[0.08] dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                    >
                      {detail?.allInstallations
                        ?.filter(i => i.platformId !== selectedSourceId)
                        .map(i => (
                          <option key={i.platformId} value={i.platformId}>
                            {i.platformName} ({i.shortHash ? `hash:${i.shortHash}` : 'copy'})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Diff Stats */}
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Plus className="h-3 w-3" />
                    {diffStats.added} added
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    <Minus className="h-3 w-3" />
                    {diffStats.removed} removed
                  </span>
                  <span className="text-slate-400">
                    {diffStats.same} matching
                  </span>
                </div>
              </div>

              {/* Diff Code Container */}
              <div className="rounded-xl border border-black/[0.08] dark:border-white/10 bg-[#f8f9fa] dark:bg-[#12141a] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[11px] font-mono text-slate-500">
                  <span>SKILL.md Unified Diff</span>
                  <button
                    onClick={() => {
                      if (compareTargetId) {
                        handleSelectSource(compareTargetId);
                      }
                    }}
                    className="flex items-center gap-1 text-[#007AFF] hover:underline cursor-pointer"
                  >
                    <ArrowLeftRight className="h-3 w-3" />
                    <span>Make {compareTargetInstallation?.platformName || 'Target'} the Source instead</span>
                  </button>
                </div>

                <div className="p-2 overflow-x-auto max-h-[50vh] font-mono text-[11px] leading-relaxed">
                  {lineDiff.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      Both files are identical. No content drift between these two locations.
                    </div>
                  ) : (
                    lineDiff.map((d, idx) => {
                      if (d.type === 'added') {
                        return (
                          <div key={idx} className="flex items-start bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded border-l-2 border-emerald-500">
                            <span className="w-8 text-right pr-3 select-none text-emerald-500/60 font-mono text-[10px]">+{d.lineB}</span>
                            <span className="select-none pr-2 font-bold">+</span>
                            <span className="whitespace-pre-wrap break-all flex-1">{d.text || ' '}</span>
                          </div>
                        );
                      }
                      if (d.type === 'removed') {
                        return (
                          <div key={idx} className="flex items-start bg-rose-500/15 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded border-l-2 border-rose-500">
                            <span className="w-8 text-right pr-3 select-none text-rose-500/60 font-mono text-[10px]">-{d.lineA}</span>
                            <span className="select-none pr-2 font-bold">-</span>
                            <span className="whitespace-pre-wrap break-all flex-1">{d.text || ' '}</span>
                          </div>
                        );
                      }
                      return (
                        <div key={idx} className="flex items-start text-slate-600 dark:text-slate-400 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] px-2 py-0.5">
                          <span className="w-8 text-right pr-3 select-none text-slate-400/50 font-mono text-[10px]">{d.lineA}</span>
                          <span className="select-none pr-2 text-transparent"> </span>
                          <span className="whitespace-pre-wrap break-all flex-1">{d.text || ' '}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
          <span className="text-xs text-slate-500">
            Source of Truth: <strong className="text-slate-900 dark:text-white font-semibold">{selectedSourceInstallation?.platformName || 'None selected'}</strong>
            {selectedSourceInstallation?.mtime && (
              <span className="opacity-75 ml-1">({formatTimeAgo(selectedSourceInstallation.mtime)})</span>
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAlign}
              disabled={isAligning || !selectedSourceId || selectedTargets.size === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0066d6] text-white text-xs font-semibold shadow-xs shadow-[#007AFF]/25 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {isAligning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span>
                {isAligning ? 'Synchronizing...' : `Sync All (${selectedTargets.size}) with ${selectedSourceInstallation?.platformName || 'Source'}`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}