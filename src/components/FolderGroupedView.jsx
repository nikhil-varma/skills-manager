import React, { useState, useMemo } from 'react';
import { 
  Folder, 
  FolderOpen,
  ChevronDown, 
  ChevronRight, 
  ExternalLink, 
  FileText, 
  Link2, 
  Check, 
  Trash2, 
  Copy, 
  Unlink, 
  Sparkles,
  Layers,
  ChevronsUpDown,
  CheckCircle2,
  X
} from 'lucide-react';

export default function FolderGroupedView({
  skills,
  platforms,
  onOpenDetail,
  onRevealPath,
  onUnlinkSkill,
  onTrashSkill,
  onLinkSkill,
  searchTerm = ''
}) {
  // Track expanded state for each platform folder (default all expanded)
  const [collapsedFolders, setCollapsedFolders] = useState(() => new Set());
  const [activeMenu, setActiveMenu] = useState(null); // `${folderId}-${skillName}`
  const [loadingAction, setLoadingAction] = useState(null);

  const toggleFolder = (folderId) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const expandAll = () => setCollapsedFolders(new Set());
  
  const collapseAll = () => {
    const allIds = new Set(platforms.map(p => p.id));
    setCollapsedFolders(allIds);
  };

  // Group skills by platform folder
  const groupedData = useMemo(() => {
    return platforms
      .filter(p => p.exists || (p.count || 0) > 0)
      .map(p => {
        const folderSkills = skills.filter(s => s.platforms[p.id]?.installed);
        const symlinksCount = folderSkills.filter(s => s.platforms[p.id]?.isSymlink).length;
        const sourceCount = folderSkills.length - symlinksCount;

        return {
          platform: p,
          skills: folderSkills,
          totalInFolder: folderSkills.length,
          symlinksCount,
          sourceCount
        };
      })
      .filter(group => group.totalInFolder > 0 || !searchTerm.trim());
  }, [platforms, skills, searchTerm]);

  const totalMatches = useMemo(() => {
    return groupedData.reduce((acc, g) => acc + g.skills.length, 0);
  }, [groupedData]);

  const handleUnlink = async (skillName, platformId, detach = false) => {
    try {
      setLoadingAction(`${platformId}-${skillName}`);
      setActiveMenu(null);
      await onUnlinkSkill(skillName, platformId, detach);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTrash = async (skillName, platformId) => {
    try {
      setLoadingAction(`${platformId}-${skillName}`);
      setActiveMenu(null);
      await onTrashSkill(skillName, platformId);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: Folder Summary & Master Expand/Collapse */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs select-none">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {groupedData.length} Skill Folders
          </span>
          <span>•</span>
          <span>
            {totalMatches} active installations
            {searchTerm.trim() && ' matching search'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={expandAll}
            className="px-2.5 py-1 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-600 dark:text-slate-300 font-medium transition-colors text-[11px]"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-2.5 py-1 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-600 dark:text-slate-300 font-medium transition-colors text-[11px]"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Folder Accordion Groups */}
      <div className="space-y-3.5">
        {groupedData.map(({ platform, skills: folderSkills, symlinksCount, sourceCount }) => {
          const isCollapsed = collapsedFolders.has(platform.id);
          const hasSkills = folderSkills.length > 0;

          return (
            <div
              key={platform.id}
              className="rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white/75 dark:bg-[#1a1c24]/75 shadow-xs backdrop-blur-xl overflow-hidden transition-all duration-200"
            >
              {/* Folder Header Bar */}
              <div
                onClick={() => toggleFolder(platform.id)}
                className="flex items-center justify-between gap-3 px-4 py-3 bg-black/[0.02] hover:bg-black/[0.04] dark:bg-white/[0.02] dark:hover:bg-white/[0.04] cursor-pointer select-none transition-colors border-b border-black/[0.05] dark:border-white/5"
              >
                {/* Left: Folder Icon, Name, and Path */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform">
                    <ChevronDown
                      className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                        isCollapsed ? '-rotate-90' : ''
                      }`}
                    />
                  </div>

                  <div
                    className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs"
                    style={{
                      backgroundColor: `${platform.color}15`,
                      border: `1px solid ${platform.color}35`,
                      color: platform.color
                    }}
                  >
                    {isCollapsed ? (
                      <Folder className="h-4 w-4" />
                    ) : (
                      <FolderOpen className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {platform.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/10 text-slate-600 dark:text-slate-300 font-mono border border-black/[0.06] dark:border-white/10 truncate max-w-[260px] sm:max-w-md">
                        {platform.path}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{folderSkills.length} skills</span>
                      {folderSkills.length > 0 && (
                        <>
                          <span>•</span>
                          {sourceCount > 0 && (
                            <span className="text-[#34C759] font-medium">{sourceCount} source</span>
                          )}
                          {sourceCount > 0 && symlinksCount > 0 && <span>•</span>}
                          {symlinksCount > 0 && (
                            <span className="text-[#AF52DE] font-medium">{symlinksCount} symlinked</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRevealPath(platform.expandedPath || platform.path);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/5 dark:hover:bg-white/10 border border-black/[0.06] dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors"
                    title="Reveal folder in macOS Finder"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span className="hidden sm:inline">Finder</span>
                  </button>
                </div>
              </div>

              {/* Folder Skills Table (When Expanded) */}
              {!isCollapsed && (
                <div>
                  {!hasSkills ? (
                    <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                      {searchTerm.trim()
                        ? 'No skills in this folder match your search filter.'
                        : 'No skills found in this folder. Add or link skills to get started.'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-black/[0.06] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.015] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] select-none">
                            <th className="py-2.5 px-4 min-w-[280px]">Skill Name & Description</th>
                            <th className="py-2.5 px-3 min-w-[140px]">Type / Target</th>
                            <th className="py-2.5 px-3 min-w-[110px] hidden sm:table-cell">Version</th>
                            <th className="py-2.5 px-4 text-right min-w-[120px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                          {folderSkills.map(skill => {
                            const platStatus = skill.platforms[platform.id];
                            const isSymlink = !!platStatus?.isSymlink;
                            const menuKey = `${platform.id}-${skill.name}`;
                            const isMenuOpen = activeMenu === menuKey;
                            const isLoading = loadingAction === menuKey;

                            return (
                              <tr
                                key={skill.name}
                                className="hover:bg-[#007AFF]/[0.03] dark:hover:bg-[#007AFF]/[0.06] transition-colors group"
                              >
                                {/* Name & Description */}
                                <td className="py-3 px-4">
                                  <div className="flex items-start gap-2.5">
                                    <button
                                      onClick={() => onOpenDetail(skill.name)}
                                      className="p-1.5 rounded-lg bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/20 transition-colors mt-0.5 flex-shrink-0"
                                      title="Inspect SKILL.md"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                    </button>
                                    <div className="min-w-0">
                                      <div
                                        onClick={() => onOpenDetail(skill.name)}
                                        className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#007AFF] transition-colors cursor-pointer text-sm truncate"
                                      >
                                        {skill.displayName || skill.name}
                                      </div>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 max-w-md mt-0.5">
                                        {skill.description || 'No description provided'}
                                      </p>
                                      <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                        {skill.name}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Installation Type Badge */}
                                <td className="py-2.5 px-3">
                                  {isSymlink ? (
                                    <div className="inline-flex flex-col gap-0.5">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-purple-500/30 bg-purple-500/10 text-[#AF52DE] w-fit shadow-2xs">
                                        <Link2 className="h-2.5 w-2.5" />
                                        <span>Symlink</span>
                                      </span>
                                      {platStatus.symlinkDisplay && (
                                        <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 truncate max-w-[180px]" title={platStatus.symlinkTarget}>
                                          → {platStatus.symlinkDisplay}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-emerald-500/30 bg-emerald-500/10 text-[#34C759] shadow-2xs">
                                      <Check className="h-2.5 w-2.5" />
                                      <span>Physical Folder</span>
                                    </span>
                                  )}
                                </td>

                                {/* Version & Author */}
                                <td className="py-2.5 px-3 hidden sm:table-cell">
                                  <div className="text-[11px] text-slate-700 dark:text-slate-300 font-mono">
                                    v{skill.metadata?.version || '1.0'}
                                  </div>
                                  {skill.metadata?.author && (
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
                                      by {skill.metadata.author}
                                    </div>
                                  )}
                                </td>

                                {/* Row Actions */}
                                <td className="py-3 px-4 text-right relative">
                                  <div className="flex items-center justify-end gap-1">
                                    {platStatus?.path && (
                                      <button
                                        onClick={() => onRevealPath(platStatus.path)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                        title="Reveal skill in macOS Finder"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </button>
                                    )}

                                    {/* Manage button with popover */}
                                    <div className="relative inline-block text-left">
                                      <button
                                        onClick={() => setActiveMenu(isMenuOpen ? null : menuKey)}
                                        className="px-2 py-1 rounded-lg text-[11px] font-medium bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-black/[0.06] dark:border-white/10 transition-colors"
                                      >
                                        Manage
                                      </button>

                                      {isMenuOpen && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setActiveMenu(null)}
                                          />
                                          <div className="absolute right-0 top-7 z-50 w-44 rounded-xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#1e2029]/95 p-1.5 shadow-xl backdrop-blur-xl text-left text-xs">
                                            {isSymlink ? (
                                              <>
                                                <button
                                                  onClick={() => handleUnlink(skill.name, platform.id, false)}
                                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-medium transition-colors"
                                                >
                                                  <Unlink className="h-3.5 w-3.5" />
                                                  <span>Un-symlink</span>
                                                </button>
                                                <button
                                                  onClick={() => handleUnlink(skill.name, platform.id, true)}
                                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[#007AFF] hover:bg-[#007AFF]/10 font-medium transition-colors"
                                                  title="Convert symlink into a standalone physical copy"
                                                >
                                                  <Copy className="h-3.5 w-3.5" />
                                                  <span>Detach to Copy</span>
                                                </button>
                                              </>
                                            ) : (
                                              <button
                                                onClick={() => handleTrash(skill.name, platform.id)}
                                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-medium transition-colors"
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                <span>Remove from {platform.name}</span>
                                              </button>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
