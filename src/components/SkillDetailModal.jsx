import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  AlertCircle
} from 'lucide-react';
import { fetchSkillDetail, updateSkillContent, linkSkill, copySkill, moveSkill, trashSkill, unlinkSkill, revealInFinder } from '../api.js';

export default function SkillDetailModal({
  skillName,
  platforms,
  onClose,
  onRefresh,
  showToast,
  onRevealPath,
  onTrashSkill,
  onDeleteCompletely
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
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ml-2">
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
                  {/* Frontmatter summary card */}
                  {detail.frontmatter && Object.keys(detail.frontmatter).length > 0 && (
                    <div className="rounded-xl border border-black/[0.06] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02] p-4">
                      <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Skill Metadata
                      </h4>
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
                        {detail.isSymlink && (
                          <div className="col-span-2 sm:col-span-3 text-[11px] font-mono text-[#AF52DE] flex items-center gap-1.5 bg-purple-500/10 px-2.5 py-1.5 rounded-xl border border-purple-500/20">
                            <Link2 className="h-3.5 w-3.5" />
                            <span>Target: {detail.symlinkTarget}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Markdown content */}
                  <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {detail.markdownBody || detail.rawContent || '_No documentation found in SKILL.md_'}
                    </ReactMarkdown>
                  </div>
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
