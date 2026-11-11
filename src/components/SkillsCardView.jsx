import React, { useState, useMemo } from 'react';
import { 
  FileCode, 
  Terminal, 
  Bot, 
  Sparkles, 
  Layers, 
  Folder, 
  ExternalLink, 
  Link2, 
  Unlink, 
  Copy, 
  Trash2, 
  Plus, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft, 
  ChevronsLeft, 
  ChevronsRight, 
  AlertTriangle, 
  Star, 
  FileText, 
  CheckCircle2, 
  LayoutGrid, 
  List, 
  Hash,
  ArrowRight,
  MoreVertical,
  Code2,
  CheckSquare,
  Square,
  X,
  Zap,
  Share2,
  GitFork
} from 'lucide-react';

export default function SkillsCardView({
  skills,
  totalFiltered = 0,
  totalSkills = 0,
  currentPage = 1,
  setCurrentPage,
  pageSize = 24,
  setPageSize,
  platforms,
  starredSkills = new Set(),
  onToggleStar,
  onOpenInEditor,
  onBatchLink,
  onBatchSyncAll,
  onOpenDetail,
  onLinkSkill,
  onUnlinkSkill,
  onSyncAll,
  onForkSkill,
  onAlignSkill,
  onTrashSkill,
  onDeleteCompletely,
  onRevealPath
}) {
  const [layoutMode, setLayoutMode] = useState(() => {
    return localStorage.getItem('skilldesk-card-layout') || 'grid'; // 'grid' | 'compact'
  });
  const [sortBy, setSortBy] = useState('deployed'); // 'deployed' | 'starred' | 'name-asc' | 'name-desc' | 'needs-sync' | 'symlinked'
  const [loadingAction, setLoadingAction] = useState(null);
  const [openLinkMenu, setOpenLinkMenu] = useState(null); // skillName
  const [openLocationMenu, setOpenLocationMenu] = useState(null); // `${skillName}-${platId}`
  const [copiedSkill, setCopiedSkill] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [deleteTargetSkill, setDeleteTargetSkill] = useState(null);

  // Multi-Select state for bulk operations
  const [selectedSkills, setSelectedSkills] = useState(new Set());
  const [isBatchLinkOpen, setIsBatchLinkOpen] = useState(false);

  const handleSetLayoutMode = (mode) => {
    setLayoutMode(mode);
    localStorage.setItem('skilldesk-card-layout', mode);
  };

  const visiblePlatforms = useMemo(() => {
    return platforms.filter(plat => plat.exists || (plat.count || 0) > 0);
  }, [platforms]);

  // Extract all unique tags across skills
  const allTags = useMemo(() => {
    const tagsSet = new Set();
    skills.forEach(skill => {
      if (Array.isArray(skill.metadata?.tags)) {
        skill.metadata.tags.forEach(t => tagsSet.add(t.toLowerCase()));
      }
      if (typeof skill.metadata?.category === 'string') {
        tagsSet.add(skill.metadata.category.toLowerCase());
      }
    });
    return Array.from(tagsSet).slice(0, 15);
  }, [skills]);

  // Sort and filter by tag
  const processedSkills = useMemo(() => {
    let result = [...skills];

    if (selectedTag) {
      result = result.filter(skill => {
        const tags = Array.isArray(skill.metadata?.tags) ? skill.metadata.tags.map(t => t.toLowerCase()) : [];
        const cat = skill.metadata?.category?.toLowerCase();
        return tags.includes(selectedTag) || cat === selectedTag;
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'starred') {
        const aStar = starredSkills?.has(a.name) ? 1 : 0;
        const bStar = starredSkills?.has(b.name) ? 1 : 0;
        if (bStar !== aStar) return bStar - aStar;
      }

      const aInstalledCount = visiblePlatforms.filter(p => a.platforms[p.id]?.installed).length;
      const bInstalledCount = visiblePlatforms.filter(p => b.platforms[p.id]?.installed).length;

      if (sortBy === 'deployed') {
        if (bInstalledCount !== aInstalledCount) return bInstalledCount - aInstalledCount;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'needs-sync') {
        const aNeeds = visiblePlatforms.length - aInstalledCount;
        const bNeeds = visiblePlatforms.length - bInstalledCount;
        if (bNeeds !== aNeeds) return bNeeds - aNeeds;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'name-asc') {
        return (a.displayName || a.name).localeCompare(b.displayName || b.name);
      }
      if (sortBy === 'name-desc') {
        return (b.displayName || b.name).localeCompare(a.displayName || a.name);
      }
      if (sortBy === 'symlinked') {
        const aSym = a.hasSymlink ? 1 : 0;
        const bSym = b.hasSymlink ? 1 : 0;
        if (bSym !== aSym) return bSym - aSym;
        return a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [skills, selectedTag, sortBy, visiblePlatforms, starredSkills]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processedSkills.length / pageSize));
  const paginatedSkills = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedSkills.slice(start, start + pageSize);
  }, [processedSkills, currentPage, pageSize]);

  // Multi-select helpers
  const toggleSelectSkill = (skillName, e) => {
    e?.stopPropagation();
    setSelectedSkills(prev => {
      const next = new Set(prev);
      if (next.has(skillName)) {
        next.delete(skillName);
      } else {
        next.add(skillName);
      }
      return next;
    });
  };

  const isAllPageSelected = useMemo(() => {
    return paginatedSkills.length > 0 && paginatedSkills.every(s => selectedSkills.has(s.name));
  }, [paginatedSkills, selectedSkills]);

  const toggleSelectAllPage = () => {
    setSelectedSkills(prev => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        paginatedSkills.forEach(s => next.delete(s.name));
      } else {
        paginatedSkills.forEach(s => next.add(s.name));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedSkills(new Set());
  };

  const handleCopyCommand = async (skillName, e, mode = 'slash') => {
    e?.stopPropagation();
    try {
      const cmd = mode === 'mention' ? `@${skillName}` : `/${skillName}`;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(cmd);
      }
      setCopiedSkill(skillName);
      setTimeout(() => {
        setCopiedSkill(curr => (curr === skillName ? null : curr));
      }, 2000);
    } catch (err) {}
  };

  const handleLink = async (skillName, sourceId, targetId, isSymlink = true) => {
    try {
      setLoadingAction(`${skillName}-${targetId}`);
      setOpenLinkMenu(null);
      await onLinkSkill(skillName, sourceId, targetId, isSymlink);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUnlink = async (skillName, platformId, detach = false) => {
    try {
      setLoadingAction(`${skillName}-${platformId}`);
      setOpenLocationMenu(null);
      await onUnlinkSkill(skillName, platformId, detach);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTrash = async (skillName, platformId) => {
    try {
      setLoadingAction(`${skillName}-${platformId}`);
      setOpenLocationMenu(null);
      await onTrashSkill(skillName, platformId);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSyncAll = async (skillName, sourceId) => {
    try {
      setLoadingAction(`${skillName}-syncall`);
      await onSyncAll(skillName, sourceId, 'symlink');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleBatchStar = () => {
    if (onToggleStar) {
      selectedSkills.forEach(name => {
        if (!starredSkills.has(name)) {
          onToggleStar(name);
        }
      });
    }
  };

  // Helper to get skill icon color & style
  const getSkillVisuals = (name) => {
    const colors = [
      '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF9500', 
      '#FFCC00', '#34C759', '#00C7BE', '#30B0C7'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = colors[Math.abs(hash) % colors.length];
    return { color };
  };

  return (
    <div className="space-y-4 relative">
      {/* View Toolbar: Layout Mode, Sorting, Tag Filters, Select All, Counts */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white/70 dark:bg-[#1a1c24]/70 backdrop-blur-xl shadow-2xs">
        
        {/* Left: Multi-select Toggle, Layout Switcher & Sort Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Select All Page Button */}
          <button
            onClick={toggleSelectAllPage}
            className={`p-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-medium ${
              isAllPageSelected
                ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-2xs'
                : selectedSkills.size > 0
                ? 'bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/30'
                : 'bg-black/[0.04] dark:bg-white/[0.06] border-black/[0.06] dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-black/[0.08]'
            }`}
            title={isAllPageSelected ? 'Deselect visible skills' : 'Select all visible skills on this page'}
          >
            {isAllPageSelected ? (
              <CheckSquare className="h-4 w-4" />
            ) : selectedSkills.size > 0 ? (
              <Check className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4 text-slate-400" />
            )}
            <span className="text-[11px] hidden sm:inline">
              {selectedSkills.size > 0 ? `${selectedSkills.size} selected` : 'Select Page'}
            </span>
          </button>

          {/* Grid vs Compact List Segmented Control */}
          <div className="p-1 rounded-xl bg-black/[0.04] dark:bg-black/40 border border-black/[0.06] dark:border-white/10 inline-flex items-center gap-1">
            <button
              onClick={() => handleSetLayoutMode('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                layoutMode === 'grid'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Spacious Card Grid"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-[#007AFF]" />
              <span>Grid</span>
            </button>
            <button
              onClick={() => handleSetLayoutMode('compact')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                layoutMode === 'compact'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Compact Row Cards"
            >
              <List className="h-3.5 w-3.5 text-[#AF52DE]" />
              <span>Compact</span>
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="deployed">Most Deployed First</option>
              <option value="starred">★ Starred First</option>
              <option value="needs-sync">Needs Sync First</option>
              <option value="name-asc">Name (A → Z)</option>
              <option value="name-desc">Name (Z → A)</option>
              <option value="symlinked">Has Symlinks First</option>
            </select>
          </div>

          {/* Active Tag Filter Indicator */}
          {selectedTag && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#007AFF]/10 border border-[#007AFF]/25 text-[#007AFF] text-xs font-medium">
              <Hash className="h-3 w-3" />
              <span>{selectedTag}</span>
              <button 
                onClick={() => setSelectedTag(null)} 
                className="ml-1 hover:text-[#0051d5] font-bold"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Right: Tag Pills & Total Counter */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
          {allTags.length > 0 && (
            <div className="hidden lg:flex items-center gap-1 mr-2 text-[11px] text-slate-400">
              {allTags.slice(0, 5).map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(curr => curr === tag ? null : tag)}
                  className={`px-2 py-0.5 rounded-full border transition-all ${
                    selectedTag === tag
                      ? 'bg-[#007AFF] text-white border-[#007AFF]'
                      : 'bg-black/[0.02] dark:bg-white/[0.04] border-black/[0.06] dark:border-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
            Showing <strong className="text-slate-900 dark:text-white font-semibold">{paginatedSkills.length}</strong> of {processedSkills.length} skills
          </div>
        </div>
      </div>

      {/* Grid or Compact Cards Display */}
      {paginatedSkills.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-dashed border-black/10 dark:border-white/10 bg-white/40 dark:bg-[#1a1c24]/40 p-8">
          <Layers className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">No skills match the current criteria</h4>
          <p className="text-xs text-slate-500 mt-1">Try resetting the tag filter or search term</p>
        </div>
      ) : layoutMode === 'grid' ? (
        /* GRID VIEW: 2 or 3 Columns of Spacious Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedSkills.map(skill => {
            const isSelected = selectedSkills.has(skill.name);
            const isStarred = starredSkills?.has(skill.name);
            const installedPlatforms = visiblePlatforms.filter(p => skill.platforms[p.id]?.installed);
            const uninstalledPlatforms = visiblePlatforms.filter(p => !skill.platforms[p.id]?.installed);
            const primarySource = installedPlatforms.find(p => p.id === 'shared') || 
                                  installedPlatforms.find(p => !skill.platforms[p.id]?.isSymlink) || 
                                  installedPlatforms[0];
            const hasMissing = installedPlatforms.length < visiblePlatforms.length;
            const visuals = getSkillVisuals(skill.name);
            const primaryPath = primarySource ? (skill.platforms[primarySource.id]?.path || primarySource.path) : null;

            return (
              <div
                key={skill.name}
                className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-200 backdrop-blur-xl p-4 sm:p-5 shadow-2xs hover:shadow-lg ${
                  isSelected
                    ? 'border-[#007AFF] bg-[#007AFF]/[0.03] ring-1 ring-[#007AFF]/40 dark:border-[#007AFF]/60'
                    : 'border-black/[0.08] dark:border-white/10 bg-white/80 dark:bg-[#1c1e27]/85 hover:border-black/15 dark:hover:border-white/20'
                }`}
              >
                {/* 1. Header: Selection Checkbox, Icon, Name, Star, Slug, Top Actions */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {/* Multi-Select Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => toggleSelectSkill(skill.name, e)}
                        className={`mt-1 h-4 w-4 rounded border transition-colors flex items-center justify-center flex-shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-[#007AFF] border-[#007AFF] text-white'
                            : 'border-black/25 dark:border-white/25 bg-white/80 dark:bg-black/40 hover:border-[#007AFF]'
                        }`}
                        title={isSelected ? 'Deselect skill' : 'Select skill for batch actions'}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </button>

                      {/* Skill Icon */}
                      <div 
                        onClick={() => onOpenDetail(skill.name)}
                        className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer shadow-xs transition-transform group-hover:scale-105"
                        style={{ backgroundColor: `${visuals.color}15`, color: visuals.color }}
                      >
                        <FileCode className="h-5 w-5" />
                      </div>

                      {/* Title, Star & Slug */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 
                            onClick={() => onOpenDetail(skill.name)}
                            className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white hover:text-[#007AFF] dark:hover:text-[#0A84FF] cursor-pointer transition-colors truncate"
                            title={skill.displayName || skill.name}
                          >
                            {skill.displayName || skill.name}
                          </h3>

                          {/* Star / Favorite Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onToggleStar) onToggleStar(skill.name);
                            }}
                            className={`p-0.5 rounded transition-colors ${
                              isStarred
                                ? 'text-amber-400 hover:text-amber-500'
                                : 'text-slate-300 dark:text-slate-600 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                            }`}
                            title={isStarred ? 'Remove from favorites' : 'Star this skill'}
                          >
                            <Star className={`h-3.5 w-3.5 ${isStarred ? 'fill-amber-400' : ''}`} />
                          </button>

                          {skill.metadata?.version && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/[0.04] dark:bg-white/10 text-slate-600 dark:text-slate-300">
                              v{skill.metadata.version}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 truncate">
                            {skill.name}
                          </span>

                          {/* Quick Copy Command Button */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyCommand(skill.name, e)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-slate-500 dark:text-slate-400 transition-colors"
                            title="Click to copy /<skill-name> command"
                          >
                            {copiedSkill === skill.name ? (
                              <>
                                <Check className="h-2.5 w-2.5 text-emerald-500" />
                                <span className="text-emerald-500">copied!</span>
                              </>
                            ) : (
                              <>
                                <Terminal className="h-2.5 w-2.5" />
                                <span>/{skill.name}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Top Right: Status Badge & Delete */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {skill.hasDrift && (
                        <span 
                          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                          title="Content Drift: physical copies differ from each other. Click Align to reconcile."
                        >
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Drift
                        </span>
                      )}

                      {skill.specValidation?.isValid && (
                        <span 
                          className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          title="Compliant with Anthropic Agent Skills Specification"
                        >
                          ✓ Spec
                        </span>
                      )}

                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        installedPlatforms.length === visiblePlatforms.length
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : installedPlatforms.length > 0
                          ? 'bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/25'
                          : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      }`}>
                        {installedPlatforms.length}/{visiblePlatforms.length} active
                      </span>

                      <button
                        type="button"
                        onClick={() => setDeleteTargetSkill(skill.name)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        title="Delete skill completely from all locations"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p 
                    onClick={() => onOpenDetail(skill.name)}
                    className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed cursor-pointer"
                  >
                    {skill.description || 'No description provided in SKILL.md'}
                  </p>

                  {/* Tags */}
                  {Array.isArray(skill.metadata?.tags) && skill.metadata.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {skill.metadata.tags.slice(0, 4).map(t => (
                        <button
                          key={t}
                          onClick={() => setSelectedTag(curr => curr === t.toLowerCase() ? null : t.toLowerCase())}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] text-slate-600 dark:text-slate-400"
                        >
                          #{t}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 2. Deployed Locations (Symlinked / Source / Copied) */}
                  <div className="pt-2 border-t border-black/[0.05] dark:border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-medium flex items-center gap-1">
                        <Folder className="h-3 w-3 text-slate-400" />
                        <span>Deployed Locations ({installedPlatforms.length})</span>
                      </span>

                      {skill.hasSymlink && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                          <Link2 className="h-2.5 w-2.5" /> Symlinks active
                        </span>
                      )}
                    </div>

                    {/* Locations List */}
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {installedPlatforms.map(plat => {
                        const platData = skill.platforms[plat.id] || {};
                        const isSymlink = platData.isSymlink;
                        const isPrimary = !isSymlink && (plat.id === 'shared' || plat.id === primarySource?.id);
                        const isMenuOpen = openLocationMenu === `${skill.name}-${plat.id}`;

                        return (
                          <div
                            key={plat.id}
                            className="group/loc relative flex items-center justify-between p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] border border-black/[0.04] dark:border-white/5 transition-all text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {/* Platform Color dot */}
                              <div 
                                className="h-2 w-2 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: plat.color || '#007AFF' }} 
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                    {plat.badge || plat.name}
                                  </span>

                                  {/* Presence Badge (Symlink / Source / Copy) */}
                                  {isSymlink ? (
                                    <span 
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                      title={platData.symlinkDisplay ? `Symlinked to: ${platData.symlinkDisplay}` : 'Symlinked to shared canonical skill'}
                                    >
                                      <Link2 className="h-2.5 w-2.5" />
                                      <span>Symlink</span>
                                    </span>
                                  ) : isPrimary ? (
                                    <span 
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                      title="Canonical source directory"
                                    >
                                      <Star className="h-2.5 w-2.5 fill-amber-500/20" />
                                      <span>Source</span>
                                    </span>
                                  ) : (
                                    <span 
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                      title="Independent physical copy"
                                    >
                                      <Copy className="h-2.5 w-2.5" />
                                      <span>Local Copy</span>
                                    </span>
                                  )}
                                </div>

                                {/* Target info if symlink */}
                                {isSymlink && platData.symlinkDisplay && (
                                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                    <ArrowRight className="h-2.5 w-2.5 flex-shrink-0" />
                                    <span className="truncate">{platData.symlinkDisplay}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Location Mini Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              {/* Open in Editor */}
                              {onOpenInEditor && (
                                <button
                                  type="button"
                                  onClick={() => onOpenInEditor(platData.path || plat.path)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                  title="Open in Code Editor (Cursor / VS Code)"
                                >
                                  <Code2 className="h-3 w-3" />
                                </button>
                              )}

                              {/* Reveal in Finder */}
                              <button
                                type="button"
                                onClick={() => onRevealPath(platData.path || plat.path)}
                                className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                title={`Reveal ${plat.name} location in Finder`}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </button>

                              {/* Menu for Unlink / Detach / Remove */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenLocationMenu(isMenuOpen ? null : `${skill.name}-${plat.id}`);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                  title="Location options"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </button>

                                {isMenuOpen && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-30" 
                                      onClick={() => setOpenLocationMenu(null)} 
                                    />
                                    <div className="absolute right-0 top-6 z-40 w-44 rounded-xl border border-black/10 dark:border-white/15 bg-white/95 dark:bg-[#20222b]/95 shadow-xl backdrop-blur-2xl p-1 text-xs animate-scale-in">
                                      {isSymlink ? (
                                        <>
                                          <button
                                            onClick={() => handleUnlink(skill.name, plat.id, false)}
                                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-medium"
                                          >
                                            <Unlink className="h-3.5 w-3.5" />
                                            <span>Remove Symlink</span>
                                          </button>
                                          <button
                                            onClick={() => handleUnlink(skill.name, plat.id, true)}
                                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10"
                                          >
                                            <Copy className="h-3.5 w-3.5" />
                                            <span>Detach to Local Copy</span>
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          onClick={() => handleTrash(skill.name, plat.id)}
                                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-medium"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          <span>Delete from {plat.badge || plat.name}</span>
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. Card Bottom Action Bar */}
                <div className="pt-3 mt-3 border-t border-black/[0.06] dark:border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Link to Assistant Dropdown */}
                    {uninstalledPlatforms.length > 0 && (
                      <div className="relative">
                        <button
                          type="button"
                          disabled={!primarySource || loadingAction?.startsWith(skill.name)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenLinkMenu(openLinkMenu === skill.name ? null : skill.name);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] text-xs font-semibold transition-colors disabled:opacity-50"
                          title="Deploy or link this skill to another assistant"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Link to...</span>
                          <ChevronDown className="h-3 w-3" />
                        </button>

                        {/* Uninstalled Platforms Dropdown Menu */}
                        {openLinkMenu === skill.name && (
                          <>
                            <div 
                              className="fixed inset-0 z-30" 
                              onClick={() => setOpenLinkMenu(null)} 
                            />
                            <div className="absolute left-0 bottom-8 z-40 w-56 max-h-60 overflow-y-auto rounded-xl border border-black/10 dark:border-white/15 bg-white/95 dark:bg-[#20222b]/95 shadow-2xl backdrop-blur-2xl p-1 text-xs animate-scale-in">
                              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-black/5 dark:border-white/5 mb-1">
                                Link into Assistant
                              </div>
                              {uninstalledPlatforms.map(targetPlat => (
                                <button
                                  key={targetPlat.id}
                                  onClick={() => handleLink(skill.name, primarySource.id, targetPlat.id, true)}
                                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-[#007AFF]/10 hover:text-[#007AFF] transition-colors"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: targetPlat.color }} />
                                    <span className="truncate">{targetPlat.name}</span>
                                  </div>
                                  <Link2 className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Sync to All Button */}
                    {hasMissing && primarySource && (
                      <button
                        type="button"
                        disabled={loadingAction === `${skill.name}-syncall`}
                        onClick={() => handleSyncAll(skill.name, primarySource.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold transition-colors disabled:opacity-50"
                        title="Symlink across all installed assistants"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>{loadingAction === `${skill.name}-syncall` ? 'Syncing...' : 'Sync All'}</span>
                      </button>
                    )}

                    {/* 1-Click Align Drift Button (inspired by skilldock) */}
                    {skill.hasDrift && onAlignSkill && (
                      <button
                        type="button"
                        onClick={() => onAlignSkill(skill)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-colors"
                        title="Choose source platform to resolve drift"
                      >
                        <Zap className="h-3 w-3" />
                        <span>Align</span>
                      </button>
                    )}
                  </div>

                  {/* Right Actions: Fork, Editor & Inspect */}
                  <div className="flex items-center gap-1.5">
                    {onForkSkill && (
                      <button
                        type="button"
                        onClick={() => onForkSkill(skill)}
                        className="p-1.5 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
                        title="Fork / Duplicate this skill"
                      >
                        <GitFork className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {onOpenInEditor && primaryPath && (
                      <button
                        type="button"
                        onClick={() => onOpenInEditor(primaryPath)}
                        className="p-1.5 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
                        title="Open in Code Editor (Cursor / VS Code)"
                      >
                        <Code2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenDetail(skill.name)}
                      className="px-2.5 py-1 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors flex items-center gap-1"
                    >
                      <FileText className="h-3 w-3" />
                      <span>Inspect</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* COMPACT ROW CARDS VIEW: Horizontal dense card layout */
        <div className="space-y-2">
          {paginatedSkills.map(skill => {
            const isSelected = selectedSkills.has(skill.name);
            const isStarred = starredSkills?.has(skill.name);
            const installedPlatforms = visiblePlatforms.filter(p => skill.platforms[p.id]?.installed);
            const uninstalledPlatforms = visiblePlatforms.filter(p => !skill.platforms[p.id]?.installed);
            const primarySource = installedPlatforms.find(p => p.id === 'shared') || 
                                  installedPlatforms.find(p => !skill.platforms[p.id]?.isSymlink) || 
                                  installedPlatforms[0];
            const hasMissing = installedPlatforms.length < visiblePlatforms.length;
            const visuals = getSkillVisuals(skill.name);
            const primaryPath = primarySource ? (skill.platforms[primarySource.id]?.path || primarySource.path) : null;

            return (
              <div
                key={skill.name}
                className={`group flex items-center justify-between gap-3 p-2.5 sm:px-4 rounded-xl border backdrop-blur-xl transition-all ${
                  isSelected
                    ? 'border-[#007AFF] bg-[#007AFF]/[0.03] ring-1 ring-[#007AFF]/40 dark:border-[#007AFF]/60'
                    : 'border-black/[0.06] dark:border-white/10 bg-white/70 dark:bg-[#1a1c24]/75 hover:bg-white/90 dark:hover:bg-[#1c1e27] hover:shadow-xs'
                }`}
              >
                {/* Left: Checkbox, Star, Icon, Name, Slug (Guaranteed Minimum Width) */}
                <div className="flex items-center gap-2.5 w-56 sm:w-64 md:w-80 lg:w-96 flex-shrink-0 min-w-0">
                  {/* Multi-Select Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => toggleSelectSkill(skill.name, e)}
                    className={`h-4 w-4 rounded border transition-colors flex items-center justify-center flex-shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-[#007AFF] border-[#007AFF] text-white'
                        : 'border-black/25 dark:border-white/25 bg-white/80 dark:bg-black/40 hover:border-[#007AFF]'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </button>

                  {/* Star Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleStar) onToggleStar(skill.name);
                    }}
                    className={`p-0.5 rounded transition-colors flex-shrink-0 ${
                      isStarred
                        ? 'text-amber-400'
                        : 'text-slate-300 dark:text-slate-600 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <Star className={`h-3.5 w-3.5 ${isStarred ? 'fill-amber-400' : ''}`} />
                  </button>

                  <div 
                    onClick={() => onOpenDetail(skill.name)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer shadow-2xs"
                    style={{ backgroundColor: `${visuals.color}15`, color: visuals.color }}
                  >
                    <FileCode className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span 
                        onClick={() => onOpenDetail(skill.name)}
                        className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white hover:text-[#007AFF] cursor-pointer truncate"
                        title={skill.displayName || skill.name}
                      >
                        {skill.displayName || skill.name}
                      </span>
                      {skill.metadata?.version && (
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/[0.04] dark:bg-white/10 text-slate-500 flex-shrink-0">
                          v{skill.metadata.version}
                        </span>
                      )}
                      {skill.hasDrift && (
                        <span 
                          className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex-shrink-0"
                          title="Content Drift: copies differ"
                        >
                          Drift
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {skill.name}
                    </p>
                  </div>
                </div>

                {/* Middle: Locations presence chips (Flexible & Never Crushing Left) */}
                <div className="flex-1 min-w-0 hidden md:flex items-center gap-1.5 overflow-hidden">
                  {installedPlatforms.slice(0, 4).map(plat => {
                    const isSym = skill.platforms[plat.id]?.isSymlink;
                    return (
                      <span
                        key={plat.id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border flex-shrink-0 ${
                          isSym
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                            : 'bg-black/[0.03] dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 border-black/[0.06] dark:border-white/10'
                        }`}
                        title={`${plat.name} (${isSym ? 'Symlink' : 'Source/Copy'})`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: plat.color }} />
                        <span className="truncate max-w-[85px]">{plat.badge || plat.name}</span>
                        {isSym && <Link2 className="h-2.5 w-2.5 text-purple-500 flex-shrink-0" />}
                      </span>
                    );
                  })}

                  {installedPlatforms.length > 4 && (
                    <span 
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/10 text-slate-500 dark:text-slate-400 flex-shrink-0"
                      title={installedPlatforms.slice(4).map(p => p.name).join(', ')}
                    >
                      +{installedPlatforms.length - 4} more
                    </span>
                  )}

                  <span className="text-[10px] text-slate-400 font-mono ml-auto flex-shrink-0 pr-2">
                    {installedPlatforms.length}/{visiblePlatforms.length} active
                  </span>
                </div>

                {/* Right: Quick Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
                  <button
                    type="button"
                    onClick={(e) => handleCopyCommand(skill.name, e)}
                    className="p-1.5 rounded-lg bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                    title="Copy /<skill-name> command"
                  >
                    {copiedSkill === skill.name ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Terminal className="h-3.5 w-3.5" />}
                  </button>

                  {onOpenInEditor && primaryPath && (
                    <button
                      type="button"
                      onClick={() => onOpenInEditor(primaryPath)}
                      className="p-1.5 rounded-lg bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                      title="Open in Code Editor (Cursor / VS Code)"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {onForkSkill && (
                    <button
                      type="button"
                      onClick={() => onForkSkill(skill)}
                      className="p-1.5 rounded-lg bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                      title="Fork / Duplicate skill"
                    >
                      <GitFork className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {skill.hasDrift && onAlignSkill && (
                    <button
                      type="button"
                      onClick={() => onAlignSkill(skill)}
                      className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-colors flex items-center gap-1"
                      title="Choose source platform to resolve drift"
                    >
                      <Zap className="h-3 w-3" />
                      <span className="hidden md:inline">Align</span>
                    </button>
                  )}

                  {hasMissing && primarySource && (
                    <button
                      type="button"
                      disabled={loadingAction === `${skill.name}-syncall`}
                      onClick={() => handleSyncAll(skill.name, primarySource.id)}
                      className="px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold transition-colors flex items-center gap-1"
                      title="Sync across all locations"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span className="hidden md:inline">Sync</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenDetail(skill.name)}
                    className="px-2.5 py-1 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Multi-Select Batch Actions Dock */}
      {selectedSkills.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-2 sm:px-3 rounded-2xl border border-black/15 dark:border-white/20 bg-white/95 dark:bg-[#1e2029]/95 shadow-2xl backdrop-blur-2xl text-slate-900 dark:text-slate-100 animate-slide-up">
          <div className="flex items-center gap-2 px-2 text-xs font-semibold border-r border-black/10 dark:border-white/10 pr-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#007AFF] text-[10px] text-white">
              {selectedSkills.size}
            </span>
            <span>Selected</span>
          </div>

          {/* Batch Link Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsBatchLinkOpen(!isBatchLinkOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#007AFF] hover:bg-[#0066d6] text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Link to...</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {isBatchLinkOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsBatchLinkOpen(false)} />
                <div className="absolute left-0 bottom-10 z-50 w-56 max-h-60 overflow-y-auto rounded-xl border border-black/10 dark:border-white/15 bg-white/95 dark:bg-[#20222b]/95 shadow-2xl backdrop-blur-2xl p-1 text-xs animate-scale-in">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-black/5 dark:border-white/5 mb-1">
                    Link All {selectedSkills.size} Skills Into
                  </div>
                  {visiblePlatforms.map(plat => (
                    <button
                      key={plat.id}
                      onClick={async () => {
                        setIsBatchLinkOpen(false);
                        if (onBatchLink) {
                          await onBatchLink(Array.from(selectedSkills), plat.id);
                        }
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-[#007AFF]/10 hover:text-[#007AFF] transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: plat.color }} />
                        <span className="truncate">{plat.name}</span>
                      </div>
                      <Link2 className="h-3 w-3 text-slate-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Batch Sync All */}
          {onBatchSyncAll && (
            <button
              type="button"
              onClick={async () => {
                await onBatchSyncAll(Array.from(selectedSkills));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold transition-colors"
              title="Batch-sync all selected skills across all platforms"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Sync All</span>
            </button>
          )}

          {/* Batch Star */}
          <button
            type="button"
            onClick={handleBatchStar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-colors"
            title="Star all selected skills"
          >
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="hidden sm:inline">Star All</span>
          </button>

          {/* Clear Selection */}
          <button
            type="button"
            onClick={clearSelection}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors ml-1"
            title="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white/70 dark:bg-[#1a1c24]/70 backdrop-blur-xl text-xs shadow-2xs">
          <div className="text-slate-500 dark:text-slate-400">
            Page <strong className="text-slate-800 dark:text-slate-200">{currentPage}</strong> of <strong>{totalPages}</strong> ({processedSkills.length} total)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] disabled:opacity-40 transition-colors"
              title="First Page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-2 font-mono text-slate-600 dark:text-slate-300">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] disabled:opacity-40 transition-colors"
              title="Last Page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs font-medium cursor-pointer"
            >
              <option value="12">12</option>
              <option value="24">24</option>
              <option value="48">48</option>
              <option value="96">96</option>
            </select>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-black/10 dark:border-white/15 bg-[#fafbfc]/95 dark:bg-[#1c1e26]/95 p-5 shadow-2xl backdrop-blur-2xl text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">Delete Skill Completely?</h3>
                <p className="text-xs text-slate-500">This action will delete "{deleteTargetSkill}" from disk across ALL locations.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15 text-xs text-rose-600 dark:text-rose-400">
              This will permanently delete the skill folder and un-symlink it from every assistant and project workspace.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetSkill(null)}
                className="px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = deleteTargetSkill;
                  setDeleteTargetSkill(null);
                  await onDeleteCompletely(target);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                Delete Completely
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
