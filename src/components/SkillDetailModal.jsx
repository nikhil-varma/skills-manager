import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SkillExecutiveReader from './SkillExecutiveReader.jsx';
import { 
  X, 
  FileText, 
  Edit3, 
  Save, 
  Folder, 
  Link2, 
  Copy, 
  ArrowRightLeft, 
  Trash2, 
  ExternalLink, 
  Sparkles,
  Check,
  AlertCircle,
  AlertTriangle,
  Zap,
  CheckCircle2,
  GitFork,
  FlaskConical,
  Play,
  Terminal,
  Clock,
  CopyCheck,
  RefreshCw
} from 'lucide-react';
import { fetchSkillDetail, updateSkillContent, linkSkill, copySkill, moveSkill, trashSkill, unlinkSkill, revealInFinder, alignSkillWithCanonical, runSkillTest } from '../api.js';
import { formatTimeAgo, formatDateTime } from '../utils/time.js';

export default function SkillDetailModal({
  skillName,
  platforms,
  onClose,
  onRefresh,
  showToast,
  onRevealPath,
  onTrashSkill,
  onDeleteCompletely,
  onForkSkill,
  onOpenDriftModal
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('doc'); // 'doc', 'edit', 'files', 'manage'
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Manage actions state
  const [targetPlatformId, setTargetPlatformId] = useState(platforms[0]?.id || '');
  const [actionProcessing, setActionProcessing] = useState(false);
  const [driftSourceId, setDriftSourceId] = useState('');

  // Interactive Skill Sandbox state
  const [testPrompt, setTestPrompt] = useState('Demonstrate this skill with a realistic example scenario.');
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState(null);
  const [copiedTestOutput, setCopiedTestOutput] = useState(false);

  const handleRunSkillTest = async () => {
    if (!testPrompt.trim()) return;
    try {
      setTestLoading(true);
      setTestError(null);
      const res = await runSkillTest({
        skillName,
        platformId: detail?.platformId,
        userPrompt: testPrompt.trim()
      });
      setTestResult(res);
      showToast(`Skill test completed in ${(res.latencyMs / 1000).toFixed(1)}s!`, 'success');
    } catch (err) {
      setTestError(err.message);
      showToast(err.message, 'error');
    } finally {
      setTestLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [skillName]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSkillDetail(skillName);
      setDetail(data);
      setEditedContent(data.rawContent || '');
      if (data.allInstallations?.length) {
        setDriftSourceId(data.platformId || data.allInstallations[0].platformId);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContent = async () => {
    try {
      setSaving(true);
      await updateSkillContent(skillName, detail.platformId, editedContent);
      showToast('SKILL.md updated successfully', 'success');
      setIsEditing(false);
      await loadDetail();
      onRefresh();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLink = async () => {
    try {
      setActionProcessing(true);
      await linkSkill({
        skillName,
        sourcePlatformId: detail.platformId,
        targetPlatformId,
        symlink: true
      });
      showToast(`Linked ${skillName} to ${targetPlatformId}`, 'success');
      onRefresh();
      await loadDetail();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleCopy = async () => {
    try {
      setActionProcessing(true);
      await copySkill({
        skillName,
        sourcePlatformId: detail.platformId,
        targetPlatformId
      });
      showToast(`Copied standalone ${skillName} to ${targetPlatformId}`, 'success');
      onRefresh();
      await loadDetail();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleMove = async () => {
    try {
      setActionProcessing(true);
      await moveSkill({
        skillName,
        sourcePlatformId: detail.platformId,
        targetPlatformId
      });
      showToast(`Moved ${skillName} to ${targetPlatformId}`, 'success');
      onRefresh();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleUnlink = async (pId, detach = false) => {
    try {
      setActionProcessing(true);
      await unlinkSkill({
        skillName,
        platformId: pId,
        detach
      });
      showToast(detach ? `Detached ${skillName} into a standalone copy` : `Un-symlinked ${skillName} from ${pId}`, 'success');
      onRefresh();
      await loadDetail();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleTrash = async (pId) => {
    try {
      setActionProcessing(true);
      if (onTrashSkill) {
        await onTrashSkill(skillName, pId);
      } else {
        await trashSkill({ skillName, platformId: pId });
      }
      showToast(`Removed ${skillName} from ${pId}`, 'success');
      onRefresh();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleDeleteEverywhere = async () => {
    try {
      setActionProcessing(true);
      if (onDeleteCompletely) {
        await onDeleteCompletely(skillName);
      } else {
        await trashSkill({ skillName, platformId: 'all' });
      }
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionProcessing(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] flex flex-col rounded-2xl border border-black/10 dark:border-white/15 bg-[#fafbfc]/95 dark:bg-[#1c1e26]/95 shadow-2xl backdrop-blur-2xl overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/10 px-4 sm:px-6 py-3.5 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-[#007AFF]/15 border border-[#007AFF]/30 flex items-center justify-center text-[#007AFF] flex-shrink-0">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                  {detail?.displayName || skillName}
                </h3>
                {detail?.isSymlink && (
                  <span className="flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-mono text-[#AF52DE] border border-purple-500/25 flex-shrink-0">
                    <Link2 className="h-3 w-3" />
                    Symlink
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs sm:max-w-lg">
                {detail?.dirPath}
              </p>
              {detail?.canonicalSource && (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <div 
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.06] text-[11px] font-mono border border-black/[0.06] dark:border-white/10 text-slate-700 dark:text-slate-300"
                    title={`Authoritative Source of Truth: ${detail.canonicalSource.path}`}
                  >
                    <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">Source of Truth:</span>
                    <span className="text-[#007AFF] dark:text-[#0A84FF] font-semibold">
                      {detail.canonicalSource.displayPath || detail.canonicalSource.path}
                    </span>
                    {detail.canonicalSource.reason && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-medium">
                        ({detail.canonicalSource.reason})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ml-2">
            {onForkSkill && (
              <button
                onClick={() => {
                  onForkSkill({
                    name: skillName,
                    description: detail?.description,
                    platforms: detail?.allInstallations 
                      ? Object.fromEntries(detail.allInstallations.map(i => [i.platformId, { installed: true }]))
                      : {}
                  });
                }}
                className="p-1.5 sm:p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors"
                title="Fork / Duplicate this skill"
              >
                <GitFork className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}
            {detail?.dirPath && (
              <button
                onClick={() => {
                  if (onRevealPath) {
                    onRevealPath(detail.dirPath);
                  } else {
                    revealInFinder(detail.dirPath);
                  }
                }}
                className="p-1.5 sm:p-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-black/5 dark:border-white/10 transition-colors"
                title="Reveal in macOS Finder"
              >
                <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-1.5 sm:p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
              title="Delete this skill"
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs (macOS Segmented Capsule Control) */}
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.015] px-4 sm:px-6 py-3 sm:py-3.5 overflow-x-auto no-scrollbar gap-2">
          <div className="p-1 rounded-xl bg-black/[0.04] dark:bg-black/40 border border-black/[0.06] dark:border-white/10 inline-flex gap-1 flex-nowrap">
            <button
              onClick={() => { setActiveTab('doc'); setIsEditing(false); }}
              className={`h-9 px-3.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'doc' && !isEditing
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="h-4 w-4 text-[#007AFF]" />
              <span>Documentation</span>
            </button>
            <button
              onClick={() => { setActiveTab('edit'); setIsEditing(true); }}
              className={`h-9 px-3.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all flex items-center gap-1.5 ${
                isEditing
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Edit3 className="h-4 w-4 text-amber-500" />
              <span>Edit SKILL.md</span>
            </button>
            <button
              onClick={() => { setActiveTab('files'); setIsEditing(false); }}
              className={`h-9 px-3.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'files'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Folder className="h-4 w-4 text-[#AF52DE]" />
              <span>Files ({detail?.fileCount || 0})</span>
            </button>
            <button
              onClick={() => { setActiveTab('manage'); setIsEditing(false); }}
              className={`h-9 px-3.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'manage'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
              <span>Move & Sync</span>
            </button>
            <button
              onClick={() => { setActiveTab('sandbox'); setIsEditing(false); }}
              className={`h-9 px-3.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'sandbox'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FlaskConical className="h-4 w-4 text-emerald-500" />
              <span>Test Sandbox</span>
            </button>
          </div>

          {isEditing && (
            <button
              onClick={handleSaveContent}
              disabled={saving}
              className="h-9 flex items-center gap-1.5 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0066d6] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-xs">
              Loading skill specification...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-500">
              <p className="font-semibold">Failed to load skill details</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          ) : (
            <>
              {/* Tab: Documentation View */}
              {activeTab === 'doc' && !isEditing && (
                <div className="space-y-6">
                  {/* Content Drift Alert (inspired by wanghuan9/skilldock) */}
                  {detail.hasDrift && (
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-xs">Content Drift Detected Across Assistants</p>
                            {detail.newestInstallation && (
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 flex items-center gap-1">
                                <Zap className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
                                <span>Newest: {detail.newestInstallation.platformName} ({formatTimeAgo(detail.newestInstallation.mtime)})</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                            Physical copies of this skill have diverged. Choose which platform is the authoritative source to reconcile.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full lg:w-auto justify-end">
                        <div className="flex items-center gap-1.5 bg-white/80 dark:bg-black/40 border border-amber-500/30 rounded-lg px-2 py-1">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">Source:</span>
                          <select
                            value={driftSourceId || detail.platformId}
                            onChange={(e) => setDriftSourceId(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                          >
                            {detail.allInstallations?.map(inst => {
                              const isNewest = detail.newestInstallation && inst.platformId === detail.newestInstallation.platformId;
                              return (
                                <option key={inst.platformId} value={inst.platformId} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                  {inst.platformName} — {formatTimeAgo(inst.mtime) || 'unknown'} {isNewest ? '★ (Newest)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <button
                          onClick={async () => {
                            try {
                              setActionProcessing(true);
                              const chosen = driftSourceId || detail.platformId;
                              await alignSkillWithCanonical({ skillName, canonicalPlatformId: chosen });
                              const sourceName = platforms.find(p => p.id === chosen)?.name || chosen;
                              showToast(`Aligned copies with source "${sourceName}"!`, 'success');
                              onRefresh();
                              await loadDetail();
                            } catch (err) {
                              showToast(err.message, 'error');
                            } finally {
                              setActionProcessing(false);
                            }
                          }}
                          disabled={actionProcessing}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50 flex-shrink-0"
                          title="Align all locations using chosen source"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          <span>{actionProcessing ? 'Aligning...' : 'Align with Source'}</span>
                        </button>

                        {onOpenDriftModal && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenDriftModal({ name: skillName, ...detail });
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 text-xs font-semibold transition-colors flex-shrink-0"
                            title="Open interactive Drift Analyser modal"
                          >
                            Analyser...
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Frontmatter summary card */}
                  {detail.frontmatter && Object.keys(detail.frontmatter).length > 0 && (
                    <div className="rounded-xl border border-black/[0.06] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Skill Metadata
                        </h4>
                        {detail.specValidation && (
                          <span 
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              detail.specValidation.isValid
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            }`}
                            title={detail.specValidation.issues?.join(' • ') || 'Anthropic Agent Skills Specification compliant'}
                          >
                            {detail.specValidation.isValid ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Anthropic Spec Valid</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3" />
                                <span>{detail.specValidation.badge}</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500">Name:</span>
                          <span className="ml-1.5 font-mono text-[#007AFF]">{detail.name}</span>
                        </div>
                        {detail.frontmatter.description && (
                          <div className="col-span-2">
                            <span className="text-slate-500">Description:</span>
                            <span className="ml-1.5 text-slate-800 dark:text-slate-200">{detail.frontmatter.description}</span>
                          </div>
                        )}
                        {detail.frontmatter.license && (
                          <div>
                            <span className="text-slate-500">License:</span>
                            <span className="ml-1.5 text-slate-800 dark:text-slate-200">{detail.frontmatter.license}</span>
                          </div>
                        )}
                        {detail.frontmatter.metadata?.author && (
                          <div>
                            <span className="text-slate-500">Author:</span>
                            <span className="ml-1.5 text-slate-800 dark:text-slate-200">{detail.frontmatter.metadata.author}</span>
                          </div>
                        )}
                        {detail.latestMtime && (
                          <div className="col-span-2 sm:col-span-3 flex items-center gap-1.5 text-xs text-slate-500 pt-1 border-t border-black/[0.04] dark:border-white/5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>Last Updated:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {formatDateTime(detail.latestMtime)} ({formatTimeAgo(detail.latestMtime)})
                            </span>
                            {detail.newestInstallation && (
                              <span className="text-[11px] text-[#007AFF] font-mono">
                                • newest in {detail.newestInstallation.platformName}
                              </span>
                            )}
                          </div>
                        )}
                        {detail.isSymlink && (
                          <div className="col-span-2 sm:col-span-3 text-[11px] font-mono text-[#AF52DE] flex items-center gap-1.5 bg-purple-500/10 px-2.5 py-1.5 rounded-xl border border-purple-500/20">
                            <Link2 className="h-3.5 w-3.5" />
                            <span>Target: {detail.symlinkTarget}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Executive Reader 2.0 with Bento Anatomy & 3-Tier Switcher */}
                  <SkillExecutiveReader
                    skillName={skillName}
                    detail={detail}
                    rawMarkdown={detail.markdownBody || detail.rawContent || ''}
                    onRunInSandbox={(prompt) => {
                      setTestPrompt(prompt);
                      setIsEditing(false);
                      setActiveTab('sandbox');
                    }}
                  />
                </div>
              )}

              {/* Tab: Edit SKILL.md */}
              {isEditing && (
                <div className="h-full flex flex-col">
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-[55vh] font-mono text-xs bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl p-4 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#007AFF] leading-relaxed resize-none"
                    placeholder="Enter SKILL.md content..."
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    Editing this file updates the physical SKILL.md on disk. If this skill is symlinked, changes reflect across all assistants.
                  </p>
                </div>
              )}

              {/* Tab: Contained Files */}
              {activeTab === 'files' && (
                <div className="space-y-4">
                  <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Files in Skill Directory
                  </h4>
                  <div className="divide-y divide-black/[0.04] dark:divide-white/5 rounded-xl border border-black/[0.06] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02] overflow-hidden">
                    {detail.files && detail.files.length > 0 ? (
                      detail.files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2.5 text-xs">
                          <div className="flex items-center gap-2">
                            {f.isDirectory ? (
                              <Folder className="h-4 w-4 text-amber-500" />
                            ) : (
                              <FileText className="h-4 w-4 text-[#007AFF]" />
                            )}
                            <span className="font-mono text-slate-800 dark:text-slate-200">{f.name}</span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {f.isDirectory ? 'directory' : 'file'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-xs text-slate-500">No additional files in directory.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Move & Sync Management */}
              {activeTab === 'manage' && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-black/[0.06] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02] p-5 space-y-4">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#007AFF]" />
                      Sync & Transfer Across Assistants
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Transfer this skill between Claude, OpenCode, and Antigravity. Using <strong>Symlink (Recommended)</strong> keeps canonical files in <code className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded text-[#007AFF] font-mono">~/.agents/skills</code> so any changes stay synchronized across all tools without drift.
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                      <div className="flex-1">
                        <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-400 mb-1">
                          Select Destination Assistant:
                        </label>
                        <select
                          value={targetPlatformId}
                          onChange={(e) => setTargetPlatformId(e.target.value)}
                          className="w-full bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                        >
                          {platforms.map((p, idx) => (
                            <option key={`${p.id}-${idx}`} value={p.id}>
                              {p.name} ({p.path})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end gap-2">
                        <button
                          onClick={handleLink}
                          disabled={actionProcessing || targetPlatformId === detail.platformId}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066d6] text-white text-xs font-semibold transition-colors disabled:opacity-40 shadow-xs"
                          title="Create symlink pointing to this skill"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          <span>Symlink (Share)</span>
                        </button>

                        <button
                          onClick={handleCopy}
                          disabled={actionProcessing || targetPlatformId === detail.platformId}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-black/5 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-medium border border-black/10 dark:border-white/10 transition-colors disabled:opacity-40 shadow-xs"
                          title="Copy independent copy to target platform"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </button>

                        <button
                          onClick={handleMove}
                          disabled={actionProcessing || targetPlatformId === detail.platformId}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors disabled:opacity-40 shadow-xs"
                          title="Move skill completely to target platform"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          <span>Move</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Active Platforms & Unlinking */}
                  <div className="rounded-xl border border-black/[0.06] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02] p-5 space-y-3">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-[#AF52DE]" />
                      Installed Locations ({detail.allInstallations?.length || 1})
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Un-symlink to disconnect an assistant, or detach it into an independent physical folder.
                    </p>
                    <div className="divide-y divide-black/[0.04] dark:divide-white/5 border border-black/[0.06] dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/5 overflow-hidden">
                      {(detail.allInstallations || [
                        {
                          platformId: detail.platformId,
                          platformName: detail.platformName || detail.platformId,
                          path: detail.dirPath,
                          isSymlink: detail.isSymlink,
                          color: '#007AFF'
                        }
                      ]).map(inst => (
                        <div key={inst.platformId} className="flex items-center justify-between p-3 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0 shadow-2xs" style={{ backgroundColor: inst.color || '#007AFF' }} />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{inst.platformName}</div>
                              <div className="text-[10px] text-slate-500 font-mono truncate">{inst.path}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {inst.isSymlink ? (
                              <>
                                <button
                                  onClick={() => handleUnlink(inst.platformId, false)}
                                  disabled={actionProcessing}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-medium transition-colors"
                                  title="Un-symlink from this assistant"
                                >
                                  Un-symlink
                                </button>
                                <button
                                  onClick={() => handleUnlink(inst.platformId, true)}
                                  disabled={actionProcessing}
                                  className="px-2.5 py-1 rounded-lg bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] border border-[#007AFF]/20 text-[11px] font-medium transition-colors"
                                  title="Convert symlink into an independent folder"
                                >
                                  Detach to Copy
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleTrash(inst.platformId)}
                                disabled={actionProcessing}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-medium transition-colors"
                                title="Remove physical folder"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Interactive Skill Sandbox / Test Runner */}
              {activeTab === 'sandbox' && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <FlaskConical className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            Interactive Skill Sandbox
                            <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Live Test
                            </span>
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Test this skill with your configured LLM in isolation before deploying it across assistants.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Test Prompt Input */}
                    <div className="space-y-2 pt-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Test User Scenario / Prompt:
                      </label>
                      <textarea
                        rows={3}
                        value={testPrompt}
                        onChange={(e) => setTestPrompt(e.target.value)}
                        placeholder="e.g. Test this skill by processing sample inputs..."
                        className="w-full bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/35 font-mono"
                      />

                      {/* Quick Prompt Suggestions */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[11px] text-slate-400">Quick tests:</span>
                        {[
                          'Demonstrate this skill with a realistic example scenario',
                          'Test edge case handling and error conditions',
                          'Verify strict adherence to output formatting rules'
                        ].map((promptText, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setTestPrompt(promptText)}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/5 hover:bg-black/[0.08] dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-black/[0.04] dark:border-white/5 transition-colors"
                          >
                            {promptText.slice(0, 36)}...
                          </button>
                        ))}
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[11px] text-slate-400 font-mono">
                          System prompt: {skillName} (SKILL.md instructions)
                        </span>

                        <button
                          type="button"
                          onClick={handleRunSkillTest}
                          disabled={testLoading || !testPrompt.trim()}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs shadow-emerald-600/25 transition-all disabled:opacity-50 active:scale-95"
                        >
                          {testLoading ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              <span>Executing Skill...</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5 fill-white" />
                              <span>Run Skill Test</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Test Results Output */}
                  {testError && (
                    <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 text-xs flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">Test Run Failed</p>
                        <p className="text-[11px] mt-0.5">{testError}</p>
                        <p className="text-[10px] text-rose-400/80 mt-1">
                          Make sure your LLM provider (Ollama, LMStudio, OpenAI, or Gemini) is running and configured in Settings.
                        </p>
                      </div>
                    </div>
                  )}

                  {testResult && (
                    <div className="rounded-xl border border-black/[0.08] dark:border-white/10 bg-white/70 dark:bg-white/[0.03] overflow-hidden shadow-xs">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                          <Terminal className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="font-semibold text-xs text-slate-900 dark:text-white">AI Agent Response</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/[0.04] dark:bg-white/10 text-slate-500">
                            {(testResult.latencyMs / 1000).toFixed(2)}s
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/[0.04] dark:bg-white/10 text-slate-500">
                            {testResult.model || 'local'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(testResult.reply || '');
                              setCopiedTestOutput(true);
                              setTimeout(() => setCopiedTestOutput(false), 2000);
                            }
                          }}
                          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        >
                          {copiedTestOutput ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedTestOutput ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <div className="p-4 prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed max-h-[45vh] overflow-y-auto">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {testResult.reply || ''}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Skill Modal (macOS Sheet Style) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-black/10 dark:border-white/15 bg-[#fafbfc]/95 dark:bg-[#1c1e26]/95 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-left text-slate-900 dark:text-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 flex-shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Delete Skill</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{skillName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Choose to remove this skill from a specific location or delete it everywhere:
              </p>

              <div className="max-h-60 overflow-y-auto space-y-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-black/30 p-2.5">
                {(detail?.allInstallations || [
                  {
                    platformId: detail?.platformId,
                    platformName: detail?.platformName || detail?.platformId,
                    path: detail?.dirPath,
                    isSymlink: detail?.isSymlink,
                    color: '#007AFF'
                  }
                ]).map(inst => (
                  <div key={inst.platformId} className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-black/[0.06] dark:border-white/10 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0 shadow-2xs" style={{ backgroundColor: inst.color || '#007AFF' }} />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{inst.platformName}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{inst.path}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${inst.isSymlink ? 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>
                        {inst.isSymlink ? 'Symlink' : 'Source'}
                      </span>
                      <button
                        onClick={async () => {
                          await handleTrash(inst.platformId);
                          setShowDeleteModal(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-medium transition-colors"
                        title={`Remove from ${inst.platformName}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-black/10 dark:border-white/10 gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteEverywhere}
                disabled={actionProcessing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Everywhere</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
