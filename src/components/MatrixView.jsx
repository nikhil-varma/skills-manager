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
  MoreVertical,
  CheckCircle2
} from 'lucide-react';

export default function MatrixView({
  skills,
  platforms,
  onOpenDetail,
  onLinkSkill,
  onUnlinkSkill,
  onSyncAll,
  onTrashSkill,
  onRevealPath
}) {
  const [loadingAction, setLoadingAction] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null); // `${skillName}-${platId}`

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
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur-md">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-white/10 bg-slate-900/95 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
            <th className="py-3.5 px-4 min-w-[280px]">Skill Name & Description</th>
            {visiblePlatforms.map(plat => (
              <th key={plat.id} className="py-3.5 px-3 text-center min-w-[140px]">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: plat.color }} />
                  <span className="text-slate-200">{plat.badge || plat.name}</span>
                </div>
              </th>
            ))}
            <th className="py-3.5 px-4 text-right min-w-[110px]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {skills.map(skill => {
            const installedPlatforms = visiblePlatforms.filter(p => skill.platforms[p.id]?.installed);
            const primarySource = installedPlatforms.find(p => p.id === 'shared') || installedPlatforms[0];
            const hasMissing = installedPlatforms.length < visiblePlatforms.length;

            return (
              <tr 
                key={skill.name}
                className="hover:bg-slate-800/40 transition-colors group"
              >
                {/* Skill Name & Description */}
                <td className="py-3 px-4">
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => onOpenDetail(skill.name)}
                      className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors mt-0.5 flex-shrink-0"
                      title="Inspect SKILL.md"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                    <div>
                      <div 
                        className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors cursor-pointer text-sm"
                        onClick={() => onOpenDetail(skill.name)}
                      >
                        {skill.displayName || skill.name}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 max-w-sm mt-0.5">
                        {skill.description || 'No description provided'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] text-slate-500">{skill.name}</span>
                        {skill.metadata?.version && (
                          <span className="text-[10px] text-slate-500">v{skill.metadata.version}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Platform columns */}
                {visiblePlatforms.map(plat => {
                  const platStatus = skill.platforms[plat.id];
                  const isInstalled = !!platStatus?.installed;
                  const isSymlink = !!platStatus?.isSymlink;
                  const menuKey = `${skill.name}-${plat.id}`;
                  const isMenuOpen = activeMenu === menuKey;
                  const isLoading = loadingAction === menuKey;

                  return (
                    <td key={plat.id} className="py-2.5 px-3 text-center relative">
                      {isInstalled ? (
                        <div className="relative inline-flex items-center">
                          {/* Installed Pill */}
                          <div 
                            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] font-medium border transition-all"
                            style={{
                              backgroundColor: `${plat.color}15`,
                              borderColor: `${plat.color}40`,
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
                              className="ml-0.5 p-0.5 rounded-full hover:bg-white/20 text-current transition-colors"
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
                              <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 w-44 rounded-xl border border-white/10 bg-slate-950 p-1.5 shadow-2xl backdrop-blur-xl text-left text-xs">
                                {isSymlink ? (
                                  <>
                                    <button
                                      onClick={() => handleUnlink(skill.name, plat.id, false)}
                                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-300 hover:bg-rose-500/10 font-medium"
                                    >
                                      <Unlink className="h-3.5 w-3.5" />
                                      <span>Un-symlink (Remove)</span>
                                    </button>
                                    <button
                                      onClick={() => handleUnlink(skill.name, plat.id, true)}
                                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-indigo-300 hover:bg-indigo-500/10"
                                      title="Convert symlink into a standalone physical copy"
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                      <span>Detach to Copy</span>
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleTrash(skill.name, plat.id)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-400 hover:bg-rose-500/10"
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border border-dashed border-white/10 text-slate-500 hover:border-indigo-400/50 hover:text-indigo-300 hover:bg-indigo-500/5 transition-all disabled:opacity-40"
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
                  <div className="flex items-center justify-end gap-1.5">
                    {hasMissing && primarySource && (
                      <button
                        onClick={() => handleSyncAll(skill.name, primarySource.id)}
                        disabled={loadingAction === `${skill.name}-syncall`}
                        className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs transition-colors"
                        title="Sync (Symlink) to all platforms"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {primarySource && skill.platforms[primarySource.id]?.path && (
                      <button
                        onClick={() => onRevealPath(skill.platforms[primarySource.id].path)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
                        title="Reveal in macOS Finder"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
