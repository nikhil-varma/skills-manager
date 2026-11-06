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
  onRevealPath
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('doc'); // 'doc', 'edit', 'files', 'manage'

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
        makeSharedCanonical: true
      });
      showToast(`Symlinked ${skillName} to ${targetPlatformId}`, 'success');
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
        targetPlatformId,
        overwrite: true
      });
      showToast(`Copied ${skillName} to ${targetPlatformId}`, 'success');
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
      await unlinkSkill({ skillName, platformId: pId, detach });
      showToast(detach ? `Detached ${skillName} to standalone copy` : `Un-symlinked ${skillName} from ${pId}`, 'success');
      onRefresh();
      await loadDetail();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleTrash = async (pId) => {
    if (!confirm(`Are you sure you want to remove "${skillName}" from ${pId}?`)) return;
    try {
      setActionProcessing(true);
      await trashSkill({ skillName, platformId: pId });
      showToast(`Removed ${skillName} from ${pId}`, 'success');
      onRefresh();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  {detail?.displayName || skillName}
                </h3>
                {detail?.isSymlink && (
                  <span className="flex items-center gap-1 rounded bg-purple-500/20 px-2 py-0.5 text-[11px] font-mono text-purple-300 border border-purple-500/30">
                    <Link2 className="h-3 w-3" />
                    Symlink
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5 truncate max-w-lg">
                {detail?.dirPath}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {detail?.dirPath && (
              <button
                onClick={() => {
                  if (onRevealPath) {
                    onRevealPath(detail.dirPath);
                  } else {
                    revealInFinder(detail.dirPath);
                  }
                }}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                title="Reveal in macOS Finder or Copy Path"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/5 bg-slate-900/50 px-6 py-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setActiveTab('doc'); setIsEditing(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'doc' && !isEditing
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Documentation
            </button>
            <button
              onClick={() => { setActiveTab('edit'); setIsEditing(true); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                isEditing
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit SKILL.md</span>
            </button>
            <button
              onClick={() => { setActiveTab('files'); setIsEditing(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'files'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Folder className="h-3.5 w-3.5" />
              <span>Files ({detail?.fileCount || 0})</span>
            </button>
            <button
              onClick={() => { setActiveTab('manage'); setIsEditing(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'manage'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Move & Sync</span>
            </button>
          </div>

          {isEditing && (
            <button
              onClick={handleSaveContent}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 text-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              Loading skill specification...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">
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
                    <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Skill Metadata
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500">Name:</span>
                          <span className="ml-1.5 font-mono text-indigo-300">{detail.name}</span>
                        </div>
                        {detail.frontmatter.description && (
                          <div className="col-span-2">
                            <span className="text-slate-500">Description:</span>
                            <span className="ml-1.5 text-slate-200">{detail.frontmatter.description}</span>
                          </div>
                        )}
                        {detail.frontmatter.license && (
                          <div>
                            <span className="text-slate-500">License:</span>
                            <span className="ml-1.5 text-slate-200">{detail.frontmatter.license}</span>
                          </div>
                        )}
                        {detail.frontmatter.metadata?.author && (
                          <div>
                            <span className="text-slate-500">Author:</span>
                            <span className="ml-1.5 text-slate-200">{detail.frontmatter.metadata.author}</span>
                          </div>
                        )}
                        {detail.isSymlink && (
                          <div className="col-span-2 sm:col-span-3 text-[11px] font-mono text-purple-300 flex items-center gap-1.5 bg-purple-500/10 px-2.5 py-1.5 rounded-lg border border-purple-500/20">
                            <Link2 className="h-3.5 w-3.5" />
                            <span>Target: {detail.symlinkTarget}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Markdown content */}
                  <div className="prose prose-invert prose-indigo max-w-none text-slate-200">
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
                    className="w-full h-[55vh] font-mono text-xs bg-slate-950 border border-white/10 rounded-xl p-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 leading-relaxed resize-none"
                    placeholder="Enter SKILL.md content..."
                  />
                  <p className="text-[11px] text-slate-500 mt-2">
                    Editing this file updates the physical SKILL.md on disk. If this skill is symlinked, changes reflect across all assistants.
                  </p>
                </div>
              )}

              {/* Tab: Contained Files */}
              {activeTab === 'files' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Files in Skill Directory
                  </h4>
                  <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-slate-900/60 overflow-hidden">
                    {detail.files && detail.files.length > 0 ? (
                      detail.files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2.5 text-xs">
                          <div className="flex items-center gap-2">
                            {f.isDirectory ? (
                              <Folder className="h-4 w-4 text-amber-400" />
                            ) : (
                              <FileText className="h-4 w-4 text-indigo-400" />
                            )}
                            <span className="font-mono text-slate-200">{f.name}</span>
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
                  <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5 space-y-4">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-400" />
                      Sync & Transfer Across Assistants
                    </h4>
                    <p className="text-xs text-slate-400">
                      Transfer this skill between Claude, OpenCode, and Antigravity. Using <strong>Symlink (Recommended)</strong> keeps canonical files in <code className="bg-white/10 px-1 py-0.5 rounded text-indigo-300">~/.agents/skills</code> so any changes stay synchronized across all tools without drift.
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                      <div className="flex-1">
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Select Destination Assistant:
                        </label>
                        <select
                          value={targetPlatformId}
                          onChange={(e) => setTargetPlatformId(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {platforms.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.path})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end gap-2">
                        <button
                          onClick={handleLink}
                          disabled={actionProcessing || targetPlatformId === detail.platformId}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-40"
                          title="Create symlink pointing to this skill"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          <span>Symlink (Share)</span>
                        </button>

                        <button
                          onClick={handleCopy}
                          disabled={actionProcessing || targetPlatformId === detail.platformId}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/10 transition-colors disabled:opacity-40"
                          title="Copy independent copy to target platform"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </button>

                        <button
                          onClick={handleMove}
                          disabled={actionProcessing || targetPlatformId === detail.platformId}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors disabled:opacity-40"
                          title="Move skill completely to target platform"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          <span>Move</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Active Platforms & Unlinking */}
                  <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5 space-y-3">
                    <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-purple-400" />
                      Manage Active Platforms & Symlinks
                    </h4>
                    <p className="text-xs text-slate-400">
                      Un-symlink to disconnect an assistant, or detach it into an independent physical folder.
                    </p>
                    <div className="divide-y divide-white/5 border border-white/5 rounded-xl bg-slate-950/60">
                      {platforms.map(p => {
                        const platDir = `${p.expandedPath}/${skillName}`;
                        const isCurrentPlatform = detail.platformId === p.id;

                        return (
                          <div key={p.id} className="flex items-center justify-between p-3 text-xs">
                            <div className="flex items-center gap-2.5">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                              <div>
                                <span className="font-semibold text-slate-200">{p.name}</span>
                                <span className="ml-2 font-mono text-[11px] text-slate-500">{p.path}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {detail.isSymlink && isCurrentPlatform ? (
                                <>
                                  <button
                                    onClick={() => handleUnlink(p.id, false)}
                                    disabled={actionProcessing}
                                    className="px-2.5 py-1 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-colors"
                                    title="Remove this symlink without touching the canonical files"
                                  >
                                    Un-symlink
                                  </button>
                                  <button
                                    onClick={() => handleUnlink(p.id, true)}
                                    disabled={actionProcessing}
                                    className="px-2.5 py-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 transition-colors"
                                    title="Convert this symlink to a standalone directory"
                                  >
                                    Detach to Copy
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleTrash(p.id)}
                                  disabled={actionProcessing}
                                  className="px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
