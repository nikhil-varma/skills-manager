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
  Plus
} from 'lucide-react';
import { fetchSkillDetail, alignSkillWithCanonical, revealInFinder } from '../api.js';

function formatTimestamp(isoStr) {
  if (!isoStr) return 'Unknown';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return isoStr;
  }
}

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
  platforms,
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
  const [alignMode, setAlignMode] = useState('overwrite'); // 'overwrite' | 'symlink'
  const [selectedTargets, setSelectedTargets] = useState(new Set());
  const [isAligning, setIsAligning] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchSkillDetail(skillName);
      setDetail(data);

      const installs = data.allInstallations || [];
      if (installs.length > 0) {
        // Default source selection: prioritize most recently modified or shared hub
        let bestSource = installs[0];
        const shared = installs.find(i => i.platformId === 'shared');
        if (shared) {
          bestSource = shared;
        } else {
          // Sort by mtime descending
          const sortedByTime = [...installs].sort((a, b) => {
            const timeA = a.mtime ? new Date(a.mtime).getTime() : 0;
            const timeB = b.mtime ? new Date(b.mtime).getTime() : 0;
            return timeB - timeA;
          });
          bestSource = sortedByTime[0] || installs[0];
        }

        setSelectedSourceId(bestSource.platformId);

        // Select comparison target: first platform with differing hash
        const diverged = installs.find(i => i.platformId !== bestSource.platformId && i.fileHash !== bestSource.fileHash) ||
                         installs.find(i => i.platformId !== bestSource.platformId) ||
                         installs[0];
        setCompareTargetId(diverged?.platformId || '');

        // Select all other platforms as targets by default
        const otherIds = new Set(installs.filter(i => i.platformId !== bestSource.platformId).map(i => i.platformId));
        setSelectedTargets(otherIds);
      }
    } catch (err) {
      showToast('Failed to load drift information: ' + err.message, 'error');
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

  const handleAlign = async () => {
    if (!selectedSourceId) {
      showToast('Please select a source platform', 'error');
      return;
    }
    if (selectedTargets.size === 0) {
      showToast('Please select at least one target location to align', 'error');
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
      showToast(`Aligned ${updatedCount} location${updatedCount === 1 ? '' : 's'} with source "${res.sourcePlatform}"!`, 'success');
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

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-black/10 dark:border-white/10 bg-[#fbfcfd] dark:bg-[#1a1c24] shadow-2xl overflow-hidden macos-glass">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 flex-shrink-0 shadow-xs">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                  Drift Analyser & Source Alignment
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex-shrink-0">
                  {distinctHashCount > 1 ? `${distinctHashCount} Divergent Copies` : 'In Parity'}
                </span>
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
              Inspecting file hashes across locations...
            </div>
          ) : viewMode === 'list' ? (
            /* LIST VIEW: Source selection & target alignment breakdown */
            <>
              {/* Guidance Banner */}
              <div className="p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold text-xs">
                    Choose an Authoritative Source of Truth
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                    Different copies of <code className="font-mono font-bold">{skillName}</code> have diverged across assistants. 
                    Select the location whose version you wish to keep, or switch to <strong>Visual Diff</strong> to inspect changes line-by-line.
                  </p>
                </div>
              </div>

              {/* Step 1: Source Selection */}
              <div>
                <label className="block font-semibold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                  1. Select Source Location (Authoritative Copy)
                </label>

                <div className="space-y-2">
                  {detail?.allInstallations?.map(inst => {
                    const isSource = inst.platformId === selectedSourceId;
                    const isSym = inst.isSymlink;

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
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: inst.color || '#007AFF' }}
                              />
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {inst.platformName}
                              </span>

                              {isSource && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.2 rounded-full bg-[#007AFF] text-white shadow-2xs">
                                  <Check className="h-2.5 w-2.5" />
                                  Source
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
                              {inst.path}
                            </p>
                          </div>
                        </div>

                        {/* Metadata Pills */}
                        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-start sm:justify-end text-[11px] font-mono text-slate-500 dark:text-slate-400 flex-shrink-0">
                          {inst.mtime && (
                            <span className="flex items-center gap-1" title={`Modified: ${inst.mtime}`}>
                              <Clock className="h-3 w-3 text-slate-400" />
                              {formatTimestamp(inst.mtime)}
                            </span>
                          )}

                          {inst.shortHash && (
                            <span className="px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/5 border border-black/5 dark:border-white/5" title={`MD5 Hash: ${inst.fileHash}`}>
                              hash: {inst.shortHash}
                            </span>
                          )}

                          {inst.fileSize > 0 && (
                            <span>{formatBytes(inst.fileSize)}</span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onRevealPath) onRevealPath(inst.dirPath);
                              else revealInFinder(inst.dirPath);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
                            title="Reveal in Finder"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Target Locations & Alignment Strategy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Targets to align */}
                <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02]">
                  <label className="block font-semibold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                    2. Target Locations to Overwrite
                  </label>

                  <div className="space-y-1.5">
                    {detail?.allInstallations
                      ?.filter(i => i.platformId !== selectedSourceId)
                      .map(inst => {
                        const isChecked = selectedTargets.has(inst.platformId);
                        const isIdentical = selectedSourceInstallation?.fileHash && inst.fileHash === selectedSourceInstallation.fileHash;

                        return (
                          <label
                            key={inst.platformId}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleTarget(inst.platformId)}
                                className="rounded border-slate-300 text-[#007AFF] focus:ring-[#007AFF]"
                              />
                              <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                                {inst.platformName}
                              </span>
                            </div>

                            {isIdentical ? (
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                Matches source
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                Diverged
                              </span>
                            )}
                          </label>
                        );
                      })}
                  </div>
                </div>

                {/* Alignment Method */}
                <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02]">
                  <label className="block font-semibold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                    3. Alignment Method
                  </label>

                  <div className="space-y-2.5">
                    <label className={`block p-2.5 rounded-lg border transition-all cursor-pointer ${
                      alignMode === 'overwrite'
                        ? 'border-[#007AFF] bg-[#007AFF]/5 text-slate-900 dark:text-white'
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
                        <span className="font-semibold text-xs">Overwrite Physical Files</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 pl-5">
                        Keeps standalone directories in targets, but synchronizes their content to match the chosen source.
                      </p>
                    </label>

                    <label className={`block p-2.5 rounded-lg border transition-all cursor-pointer ${
                      alignMode === 'symlink'
                        ? 'border-[#007AFF] bg-[#007AFF]/5 text-slate-900 dark:text-white'
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
                        <span className="font-semibold text-xs">Convert to Symlinks (Recommended)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 pl-5">
                        Replaces target copies with symlinks pointing to the chosen source for zero future drift.
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
                    className="flex items-center gap-1 text-[#007AFF] hover:underline"
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
            Source: <strong className="text-slate-800 dark:text-slate-200">{selectedSourceInstallation?.platformName || 'None selected'}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAlign}
              disabled={isAligning || !selectedSourceId || selectedTargets.size === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs shadow-amber-500/25 transition-all disabled:opacity-50 active:scale-95"
            >
              {isAligning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              <span>
                {isAligning ? 'Aligning...' : `Align ${selectedTargets.size} Targets from ${selectedSourceInstallation?.platformName || 'Source'}`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
