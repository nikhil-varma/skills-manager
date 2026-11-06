import React, { useState } from 'react';
import { 
  Link2, 
  Check, 
  Plus, 
  ExternalLink, 
  Trash2, 
  Sparkles, 
  FileText, 
  X, 
  Copy, 
  Unlink, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from 'lucide-react';

export default function MatrixView({
  skills,
  totalFiltered = 0,
  totalSkills = 0,
  currentPage = 1,
  setCurrentPage,
  pageSize = 25,
  setPageSize,
  platforms,
  onOpenDetail,
  onLinkSkill,
  onUnlinkSkill,
  onSyncAll,
  onTrashSkill,
  onDeleteCompletely,
  onRevealPath
}) {
  const [loadingAction, setLoadingAction] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null); // `${skillName}-${platId}`
  const [deleteTargetSkill, setDeleteTargetSkill] = useState(null);

  const handleLink = async (skillName, sourceId, targetId) => {
    try {
      setLoadingAction(`${skillName}-${targetId}`);
      await onLinkSkill(skillName, sourceId, targetId, true);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUnlink = async (skillName, platformId, detach = false) => {
    try {
      setLoadingAction(`${skillName}-${platformId}`);
      setActiveMenu(null);
      await onUnlinkSkill(skillName, platformId, detach);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTrash = async (skillName, platformId) => {
    try {
      setLoadingAction(`${skillName}-${platformId}`);
      setActiveMenu(null);
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

  const visiblePlatforms = platforms.filter(plat => plat.exists || (plat.count || 0) > 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white/75 dark:bg-[#1a1c24]/75 shadow-xs backdrop-blur-xl">
      
      {/* 1. Mobile Cards View (shown on screens < md) */}
      <div className="divide-y divide-black/[0.06] dark:divide-white/5 block md:hidden">
        {skills.map(skill => {
          const installedPlatforms = visiblePlatforms.filter(p => skill.platforms[p.id]?.installed);
          const primarySource = installedPlatforms.find(p => p.id === 'shared') || installedPlatforms[0];
          const hasMissing = installedPlatforms.length < visiblePlatforms.length;
          const uninstalledPlatforms = visiblePlatforms.filter(p => !skill.platforms[p.id]?.installed);

          return (
            <div key={skill.name} className="p-3.5 space-y-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
              {/* Header: Name, description, quick actions */}
              <div className="flex items-start justify-between gap-2">
                <div 
                  onClick={() => onOpenDetail(skill.name)} 
                  className="cursor-pointer group flex-1 min-w-0"
                >
                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#007AFF] transition-colors flex items-center gap-1.5">
                    <div className="p-1 rounded-md bg-[#007AFF]/10 text-[#007AFF] flex-shrink-0">
                      <FileText className="h-3 w-3" />
                    </div>
                    <span className="truncate">{skill.displayName || skill.name}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {skill.description || 'No description provided'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 truncate">{skill.name}</span>
                    {skill.metadata?.version && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">v{skill.metadata.version}</span>
                    )}
                  </div>
                </div>

                {/* Quick Action Icons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {hasMissing && primarySource && (
                    <button
                      onClick={() => handleSyncAll(skill.name, primarySource.id)}
                      disabled={loadingAction === `${skill.name}-syncall`}
                      className="p-1.5 rounded-lg bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] border border-[#007AFF]/20 text-xs transition-colors"
                      title="Sync (Symlink) to all platforms"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {primarySource && skill.platforms[primarySource.id]?.path && (
                    <button
                      onClick={() => onRevealPath(skill.platforms[primarySource.id].path)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      title="Reveal in Finder or Copy Path"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteTargetSkill(skill)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    title="Delete skill"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Installed Platform Badges & Add Links */}
              <div className="space-y-1 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mr-0.5">
                    Installed:
                  </span>
                  {installedPlatforms.map(plat => {
                    const platStatus = skill.platforms[plat.id];
                    const isSymlink = !!platStatus?.isSymlink;
                    const menuKey = `mobile-${skill.name}-${plat.id}`;
                    const isMenuOpen = activeMenu === menuKey;

                    return (
                      <div key={plat.id} className="relative inline-flex items-center">
                        <span
                          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium border shadow-2xs backdrop-blur-sm"
                          style={{
                            backgroundColor: `${plat.color}15`,
                            borderColor: `${plat.color}40`,
                            color: plat.color
                          }}
                        >
                          {isSymlink ? <Link2 className="h-2.5 w-2.5" /> : <Check className="h-2.5 w-2.5" />}
                          <span>{plat.badge || plat.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenu(isMenuOpen ? null : menuKey);
                            }}
                            className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                            title="Manage installation"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>

                        {/* Mobile Popover */}
                        {isMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                            <div className="absolute top-6 left-0 z-50 w-44 rounded-xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#1e2029]/95 backdrop-blur-xl p-1.5 shadow-xl text-left text-xs">
                              {isSymlink ? (
                                <>
                                  <button
                                    onClick={() => handleUnlink(skill.name, plat.id, false)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-medium"
                                  >
                                    <Unlink className="h-3.5 w-3.5" />
                                    <span>Un-symlink</span>
                                  </button>
                                  <button
                                    onClick={() => handleUnlink(skill.name, plat.id, true)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[#007AFF] hover:bg-[#007AFF]/10 font-medium"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>Detach to Copy</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleTrash(skill.name, plat.id)}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-medium"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Remove from {plat.name}</span>
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* Add pills for missing locations */}
                  {uninstalledPlatforms.slice(0, 3).map(plat => (
                    <button
                      key={plat.id}
                      disabled={!primarySource || loadingAction === `${skill.name}-${plat.id}`}
                      onClick={() => primarySource && handleLink(skill.name, primarySource.id, plat.id)}
                      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] border border-dashed border-black/15 dark:border-white/15 text-slate-500 hover:text-[#007AFF] hover:border-[#007AFF]/50 hover:bg-[#007AFF]/5 transition-all"
                      title={`Link to ${plat.name}`}
                    >
                      <Plus className="h-2.5 w-2.5" />
                      <span>{plat.badge || plat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Desktop Matrix Table View (shown on md+) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] select-none">
              <th className="py-3 px-4 min-w-[280px]">Skill Name & Description</th>
              {visiblePlatforms.map((plat, idx) => (
                <th key={`${plat.id}-${plat.path || idx}`} className="py-3 px-3 text-center min-w-[140px]">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="h-2 w-2 rounded-full shadow-2xs" style={{ backgroundColor: plat.color }} />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{plat.badge || plat.name}</span>
                  </div>
                </th>
              ))}
              <th className="py-3 px-4 text-right min-w-[110px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {skills.map(skill => {
              const installedPlatforms = visiblePlatforms.filter(p => skill.platforms[p.id]?.installed);
              const primarySource = installedPlatforms.find(p => p.id === 'shared') || installedPlatforms[0];
              const hasMissing = installedPlatforms.length < visiblePlatforms.length;

              return (
                <tr 
                  key={skill.name}
                  className="hover:bg-[#007AFF]/[0.03] dark:hover:bg-[#007AFF]/[0.06] transition-colors group"
                >
                  {/* Skill Name & Description */}
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
                          className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#007AFF] transition-colors cursor-pointer text-sm truncate"
                          onClick={() => onOpenDetail(skill.name)}
                        >
                          {skill.displayName || skill.name}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 max-w-sm mt-0.5">
                          {skill.description || 'No description provided'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{skill.name}</span>
                          {skill.metadata?.version && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/[0.04] dark:bg-white/10 text-slate-500 dark:text-slate-400 font-mono">
                              v{skill.metadata.version}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Platform columns */}
                  {visiblePlatforms.map((plat, idx) => {
                    const platStatus = skill.platforms[plat.id];
                    const isInstalled = !!platStatus?.installed;
                    const isSymlink = !!platStatus?.isSymlink;
                    const menuKey = `${skill.name}-${plat.id}`;
                    const isMenuOpen = activeMenu === menuKey;
                    const isLoading = loadingAction === menuKey;

                    return (
                      <td key={`${plat.id}-${plat.path || idx}`} className="py-2.5 px-3 text-center relative">
                        {isInstalled ? (
                          <div className="relative inline-flex items-center">
                            {/* Installed macOS Capsule Pill */}
                            <div 
                              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] font-medium border shadow-2xs backdrop-blur-sm transition-all"
                              style={{
                                backgroundColor: `${plat.color}15`,
                                borderColor: `${plat.color}35`,
                                color: plat.color
                              }}
                              title={isSymlink ? `Symlink -> ${platStatus.symlinkDisplay || platStatus.symlinkTarget}` : 'Direct standalone files'}
                            >
                              {isSymlink ? (
                                <Link2 className="h-3 w-3 flex-shrink-0" />
                              ) : (
                                <Check className="h-3 w-3 flex-shrink-0" />
                              )}
                              <span>{isSymlink ? 'Symlink' : 'Active'}</span>

                              {/* Unlink / Action button right on pill */}
                              <button
                                disabled={isLoading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenu(isMenuOpen ? null : menuKey);
                                }}
                                className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20 text-current transition-colors"
                                title={isSymlink ? "Symlink options (Unlink or Detach)" : `Remove from ${plat.name}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>

                            {/* Popover Menu for Unlinking / Removing */}
                            {isMenuOpen && (
                              <>
                                <div 
                                  className="fixed inset-0 z-40" 
                                  onClick={() => setActiveMenu(null)} 
                                />
                                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 w-44 rounded-xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#1e2029]/95 p-1.5 shadow-xl backdrop-blur-xl text-left text-xs">
                                  {isSymlink ? (
                                    <>
                                      <button
                                        onClick={() => handleUnlink(skill.name, plat.id, false)}
                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-medium transition-colors"
                                      >
                                        <Unlink className="h-3.5 w-3.5" />
                                        <span>Un-symlink</span>
                                      </button>
                                      <button
                                        onClick={() => handleUnlink(skill.name, plat.id, true)}
                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[#007AFF] hover:bg-[#007AFF]/10 font-medium transition-colors"
                                        title="Convert symlink into a standalone physical copy"
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                        <span>Detach to Copy</span>
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleTrash(skill.name, plat.id)}
                                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-medium transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span>Remove from {plat.name}</span>
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <button
                            disabled={!primarySource || isLoading}
                            onClick={() => primarySource && handleLink(skill.name, primarySource.id, plat.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border border-dashed border-black/15 dark:border-white/15 text-slate-500 dark:text-slate-400 hover:border-[#007AFF]/60 hover:text-[#007AFF] hover:bg-[#007AFF]/5 transition-all disabled:opacity-30"
                            title={primarySource ? `Link from ${primarySource.name}` : 'Not available to link'}
                          >
                            <Plus className="h-3 w-3" />
                            <span>{isLoading ? '...' : 'Add'}</span>
                          </button>
                        )}
                      </td>
                    );
                  })}

                  {/* Actions column */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {hasMissing && primarySource && (
                        <button
                          onClick={() => handleSyncAll(skill.name, primarySource.id)}
                          disabled={loadingAction === `${skill.name}-syncall`}
                          className="p-1.5 rounded-lg bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] border border-[#007AFF]/20 text-xs transition-colors"
                          title="Sync (Symlink) to all platforms"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {primarySource && skill.platforms[primarySource.id]?.path && (
                        <button
                          onClick={() => onRevealPath(skill.platforms[primarySource.id].path)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                          title="Reveal in macOS Finder"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTargetSkill(skill)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Delete skill"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer (macOS Toolbar Inset Style) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-black/[0.06] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.015] px-4 py-2.5 text-xs w-full select-none">
        <div className="text-slate-500 dark:text-slate-400 text-center sm:text-left text-[11px]">
          Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalFiltered)}</span> of <span className="font-semibold text-slate-800 dark:text-slate-200">{totalFiltered}</span> skills
          {totalFiltered !== totalSkills && (
            <span className="text-slate-400 dark:text-slate-500 ml-1 hidden xs:inline">
              (of {totalSkills} total)
            </span>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/40 px-2 py-0.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Navigation Controls (macOS Segmented Arrows) */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-black/[0.05] dark:border-white/10">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1}
              className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 disabled:opacity-25 transition-all"
              title="First page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 disabled:opacity-25 transition-all"
              title="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <span className="px-2 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
              <strong className="text-[#007AFF]">{currentPage}</strong>/{Math.ceil(totalFiltered / pageSize) || 1}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalFiltered / pageSize) || 1, prev + 1))}
              disabled={currentPage >= (Math.ceil(totalFiltered / pageSize) || 1)}
              className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 disabled:opacity-25 transition-all"
              title="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(Math.ceil(totalFiltered / pageSize) || 1)}
              disabled={currentPage >= (Math.ceil(totalFiltered / pageSize) || 1)}
              className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 disabled:opacity-25 transition-all"
              title="Last page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Skill Confirmation Modal (macOS Sheet Style) */}
      {deleteTargetSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-black/10 dark:border-white/15 bg-[#fafbfc]/95 dark:bg-[#1c1e26]/95 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-left text-slate-900 dark:text-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 flex-shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Delete Skill</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">{deleteTargetSkill.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteTargetSkill(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Choose to remove this skill from an individual location or delete it everywhere:
              </p>

              <div className="max-h-56 sm:max-h-64 overflow-y-auto space-y-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-black/30 p-2.5">
                {visiblePlatforms
                  .filter(p => deleteTargetSkill.platforms[p.id]?.installed)
                  .map((plat, idx) => {
                    const status = deleteTargetSkill.platforms[plat.id];
                    const isSymlink = status?.isSymlink;
                    return (
                      <div key={`${plat.id}-${plat.path || idx}`} className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-black/[0.06] dark:border-white/10 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: plat.color }} />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{plat.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono truncate">{plat.path}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isSymlink ? 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>
                            {isSymlink ? 'Symlink' : 'Source'}
                          </span>
                          <button
                            onClick={async () => {
                              await handleTrash(deleteTargetSkill.name, plat.id);
                              setDeleteTargetSkill(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-medium transition-colors"
                            title={`Remove from ${plat.name}`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-black/10 dark:border-white/10 gap-2">
              <button
                onClick={() => setDeleteTargetSkill(null)}
                className="px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  await onDeleteCompletely(deleteTargetSkill.name);
                  setDeleteTargetSkill(null);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition-all"
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
