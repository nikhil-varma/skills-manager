import React, { useState } from 'react';
import { Link2, Check, Plus, ExternalLink, Trash2, Sparkles, FileText, ArrowRight } from 'lucide-react';

export default function MatrixView({
  skills,
  platforms,
  onOpenDetail,
  onLinkSkill,
  onSyncAll,
  onTrashSkill,
  onRevealPath
}) {
  const [loadingSkill, setLoadingSkill] = useState(null);

  const handleLink = async (skillName, sourceId, targetId) => {
    try {
      setLoadingSkill(`${skillName}-${targetId}`);
      await onLinkSkill(skillName, sourceId, targetId, true);
    } finally {
      setLoadingSkill(null);
    }
  };

  const handleSyncAll = async (skillName, sourceId) => {
    try {
      setLoadingSkill(`${skillName}-syncall`);
      await onSyncAll(skillName, sourceId, 'symlink');
    } finally {
      setLoadingSkill(null);
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 shadow-xl backdrop-blur-md">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-white/10 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
            <th className="py-3 px-4 min-w-[240px]">Skill Name & Description</th>
            {platforms.map(plat => (
              <th key={plat.id} className="py-3 px-4 text-center min-w-[130px]">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: plat.color }} />
                  <span className="text-slate-200">{plat.badge || plat.name}</span>
                </div>
              </th>
            ))}
            <th className="py-3 px-4 text-right min-w-[120px]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {skills.map(skill => {
            const installedPlatforms = platforms.filter(p => skill.platforms[p.id]?.installed);
            const primarySource = installedPlatforms.find(p => p.id === 'shared') || installedPlatforms[0];
            const hasMissing = installedPlatforms.length < platforms.length;

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
                      className="p-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors mt-0.5"
                      title="Inspect SKILL.md"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                    <div>
                      <div className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors cursor-pointer"
                        onClick={() => onOpenDetail(skill.name)}
                      >
                        {skill.displayName || skill.name}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 max-w-sm mt-0.5">
                        {skill.description || 'No description'}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Platform columns */}
                {platforms.map(plat => {
                  const platStatus = skill.platforms[plat.id];
                  const isInstalled = !!platStatus?.installed;
                  const isSymlink = !!platStatus?.isSymlink;
                  const isActionLoading = loadingSkill === `${skill.name}-${plat.id}`;

                  return (
                    <td key={plat.id} className="py-3 px-4 text-center">
                      {isInstalled ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border"
                          style={{
                            backgroundColor: `${plat.color}15`,
                            borderColor: `${plat.color}40`,
                            color: plat.color
                          }}
                          title={isSymlink ? `Symlinked -> ${platStatus.symlinkDisplay || platStatus.symlinkTarget}` : 'Direct files'}
                        >
                          {isSymlink ? (
                            <Link2 className="h-3 w-3" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          <span>{isSymlink ? 'Symlink' : 'Installed'}</span>
                        </div>
                      ) : (
                        <button
                          disabled={!primarySource || isActionLoading}
                          onClick={() => primarySource && handleLink(skill.name, primarySource.id, plat.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border border-dashed border-white/10 text-slate-500 hover:border-indigo-400/50 hover:text-indigo-300 hover:bg-indigo-500/5 transition-all disabled:opacity-40"
                          title={primarySource ? `Link from ${primarySource.name}` : 'Not available to link'}
                        >
                          <Plus className="h-3 w-3" />
                          <span>{isActionLoading ? 'Linking...' : 'Add'}</span>
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
                        disabled={loadingSkill === `${skill.name}-syncall`}
                        className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs transition-colors"
                        title="Sync (Symlink) to all platforms"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {primarySource?.expandedPath && (
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
