import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Download, 
  Check, 
  Search, 
  Tag, 
  ExternalLink, 
  FileText, 
  Globe, 
  Bot, 
  FolderPlus, 
  Loader2,
  AlertCircle,
  Eye,
  CheckCircle2,
  Copy
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchCommunitySkills, fetchRemoteSkill, installCommunitySkill } from '../api.js';

export default function SkillHubModal({
  platforms,
  onClose,
  onSuccess,
  showToast
}) {
  const [activeTab, setActiveTab] = useState('curated'); // 'curated' | 'import'
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Preview Drawer/Modal State
  const [previewSkill, setPreviewSkill] = useState(null);

  // Install Dialog State
  const [installingSkill, setInstallingSkill] = useState(null);
  const [targetPlatformId, setTargetPlatformId] = useState(platforms[0]?.id || 'shared');
  const [linkToOthers, setLinkToOthers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Import State
  const [importUrl, setImportUrl] = useState('');
  const [importContent, setImportContent] = useState('');
  const [importName, setImportName] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const res = await fetchCommunitySkills();
      setCatalog(res.skills || []);
    } catch (err) {
      showToast('Failed to load community skills: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(['All']);
    for (const item of catalog) {
      if (item.category) set.add(item.category);
    }
    return Array.from(set);
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter(item => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch = !term || 
        item.name.toLowerCase().includes(term) ||
        item.displayName.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(term)));
      return matchCat && matchSearch;
    });
  }, [catalog, selectedCategory, searchTerm]);

  const handleStartInstall = (skill) => {
    setInstallingSkill(skill);
    // Prefer shared hub as primary target if available
    const defaultTarget = platforms.find(p => p.id === 'shared')?.id || platforms[0]?.id || '';
    setTargetPlatformId(defaultTarget);
  };

  const handleConfirmInstall = async () => {
    if (!installingSkill || !targetPlatformId) return;
    try {
      setIsSubmitting(true);
      await installCommunitySkill({
        skillName: installingSkill.name,
        content: installingSkill.skillContent,
        targetPlatformId,
        linkToOthers
      });
      showToast(`Installed "${installingSkill.displayName}" successfully!`, 'success');
      setInstallingSkill(null);
      await loadCatalog();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFetchRemote = async () => {
    if (!importUrl.trim()) return;
    try {
      setIsFetchingUrl(true);
      const res = await fetchRemoteSkill(importUrl.trim());
      setImportContent(res.rawMarkdown);
      // Auto-extract name from frontmatter or URL
      const nameMatch = res.rawMarkdown.match(/^name:\s*(.+)$/m);
      if (nameMatch) {
        setImportName(nameMatch[1].trim().replace(/['"]/g, ''));
      } else {
        const urlParts = importUrl.split('/');
        const lastPart = urlParts[urlParts.length - 1].replace(/\.(md|markdown)$/i, '');
        setImportName(lastPart.toLowerCase().replace(/[^a-z0-9_-]/g, '-'));
      }
      showToast('Remote skill fetched successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleConfirmCustomInstall = async () => {
    const cleanName = importName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!cleanName) {
      showToast('Skill name is required', 'error');
      return;
    }
    if (!importContent.trim()) {
      showToast('Skill content is required', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      await installCommunitySkill({
        skillName: cleanName,
        content: importContent,
        targetPlatformId,
        linkToOthers
      });
      showToast(`Custom skill "${cleanName}" installed successfully!`, 'success');
      setImportUrl('');
      setImportContent('');
      setImportName('');
      setActiveTab('curated');
      await loadCatalog();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border border-black/10 dark:border-white/10 bg-[#fbfcfd] dark:bg-[#1a1c24] shadow-2xl overflow-hidden macos-glass">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-black/[0.08] dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#007AFF] to-[#5856D6] flex items-center justify-center shadow-md shadow-[#007AFF]/25">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Community Skill Hub</h3>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#007AFF]/15 text-[#007AFF] dark:text-[#0A84FF] border border-[#007AFF]/20">
                  Anthropic Spec Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Browse, preview, and 1-click install production-grade agent skills across your assistants
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="px-5 sm:px-6 py-3 border-b border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-xl border border-black/[0.06] dark:border-white/10 w-fit">
            <button
              onClick={() => setActiveTab('curated')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'curated'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-[#007AFF]" />
              Curated Catalog ({catalog.length})
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'import'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Globe className="h-3.5 w-3.5 text-emerald-500" />
              Import from GitHub / Raw
            </button>
          </div>

          {activeTab === 'curated' && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search skills, tags, keywords..."
                className="w-full bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/35"
              />
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          
          {activeTab === 'curated' && (
            <>
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/30'
                        : 'bg-black/[0.04] dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 hover:bg-black/[0.08] dark:hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Loader2 className="h-6 w-6 animate-spin text-[#007AFF] mb-2" />
                  Loading community catalog...
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  No community skills match your filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredCatalog.map(skill => (
                    <div
                      key={skill.id}
                      className="group flex flex-col justify-between p-4 rounded-xl border border-black/[0.08] dark:border-white/10 bg-white/70 dark:bg-white/[0.03] hover:bg-white dark:hover:bg-white/[0.06] hover:border-[#007AFF]/40 dark:hover:border-[#007AFF]/40 transition-all shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-[#007AFF] transition-colors">
                                {skill.displayName}
                              </h4>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                v{skill.version}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              by {skill.author}
                            </span>
                          </div>

                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                            {skill.category}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">
                          {skill.description}
                        </p>

                        {/* Tags */}
                        {skill.tags && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {skill.tags.map(t => (
                              <span
                                key={t}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] text-slate-500 dark:text-slate-400"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-black/[0.05] dark:border-white/5">
                        <button
                          onClick={() => setPreviewSkill(skill)}
                          className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Preview SKILL.md</span>
                        </button>

                        {skill.isInstalled ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                            Installed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleStartInstall(skill)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold shadow-xs shadow-[#007AFF]/25 transition-all active:scale-95"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Install</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-[#007AFF]" />
                  Fetch from GitHub or Raw Markdown URL
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Enter a GitHub URL (e.g. <code className="font-mono text-[11px] bg-slate-200 dark:bg-white/10 px-1 py-0.5 rounded">github.com/user/repo/blob/main/skills/my-skill/SKILL.md</code>) or raw file link.
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://github.com/.../SKILL.md or raw.githubusercontent.com/..."
                    className="flex-1 bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/35"
                  />
                  <button
                    onClick={handleFetchRemote}
                    disabled={isFetchingUrl || !importUrl.trim()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#007AFF] text-white text-xs font-semibold hover:bg-[#0071E3] disabled:opacity-50 transition-colors"
                  >
                    {isFetchingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    <span>Fetch</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Skill Name (kebab-case)
                    </label>
                    <input
                      type="text"
                      value={importName}
                      onChange={(e) => setImportName(e.target.value)}
                      placeholder="e.g. react-performance-audit"
                      className="w-full bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/35"
                    />
                  </div>
                  <div className="w-full sm:w-60">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Primary Destination
                    </label>
                    <select
                      value={targetPlatformId}
                      onChange={(e) => setTargetPlatformId(e.target.value)}
                      className="w-full bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/35"
                    >
                      {platforms.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    SKILL.md Markdown Content
                  </label>
                  <textarea
                    rows={10}
                    value={importContent}
                    onChange={(e) => setImportContent(e.target.value)}
                    placeholder="---&#10;name: my-skill&#10;description: ...&#10;---&#10;&#10;# My Skill&#10;&#10;## Instructions&#10;..."
                    className="w-full font-mono text-xs bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/35"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkToOthers}
                      onChange={(e) => setLinkToOthers(e.target.checked)}
                      className="rounded border-slate-300 text-[#007AFF] focus:ring-[#007AFF]"
                    />
                    <span>Symlink to all other connected assistants automatically</span>
                  </label>

                  <button
                    onClick={handleConfirmCustomInstall}
                    disabled={isSubmitting || !importName.trim() || !importContent.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold shadow-sm shadow-[#007AFF]/30 disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}
                    <span>Install Custom Skill</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-t border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
          <span className="text-xs text-slate-500">
            {catalog.length} community skills available • Standardized for Anthropic / AgentOS
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Close
          </button>
        </div>

      </div>

      {/* Preview Markdown Modal */}
      {previewSkill && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-black/10 dark:border-white/10 bg-[#fbfcfd] dark:bg-[#1a1c24] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.08] dark:border-white/10">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#007AFF]" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {previewSkill.displayName} (SKILL.md)
                </h4>
              </div>
              <button
                onClick={() => setPreviewSkill(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 prose prose-slate dark:prose-invert max-w-none text-xs">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {previewSkill.skillContent}
              </ReactMarkdown>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
              <span className="text-[11px] text-slate-500">
                Author: {previewSkill.author} • Version: {previewSkill.version}
              </span>
              <button
                onClick={() => {
                  const s = previewSkill;
                  setPreviewSkill(null);
                  handleStartInstall(s);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#007AFF] text-white text-xs font-semibold hover:bg-[#0071E3]"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Install This Skill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Target Assistant Picker Install Dialog */}
      {installingSkill && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md flex flex-col rounded-2xl border border-black/10 dark:border-white/10 bg-[#fbfcfd] dark:bg-[#1a1c24] shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-[#007AFF]" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Install "{installingSkill.displayName}"
                </h4>
              </div>
              <button
                onClick={() => setInstallingSkill(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Select where the master copy of this skill should be created:
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Location
                </label>
                <select
                  value={targetPlatformId}
                  onChange={(e) => setTargetPlatformId(e.target.value)}
                  className="w-full bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/35"
                >
                  {platforms.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.path})
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={linkToOthers}
                  onChange={(e) => setLinkToOthers(e.target.checked)}
                  className="rounded border-slate-300 text-[#007AFF] focus:ring-[#007AFF]"
                />
                <span>Automatically symlink to all other assistants</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.08] dark:border-white/10">
              <button
                onClick={() => setInstallingSkill(null)}
                className="px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmInstall}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold shadow-xs shadow-[#007AFF]/25 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                <span>Confirm Install</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
