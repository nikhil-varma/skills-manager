import React, { useState } from 'react';
import { 
  Link2, 
  Copy, 
  ArrowRightLeft, 
  Trash2, 
  FileText, 
  ExternalLink, 
  Folder, 
  Check, 
  Plus, 
  Sparkles,
  Layers,
  MoreVertical
} from 'lucide-react';

export default function SkillCard({
  skill,
  platforms,
  onOpenDetail,
  onLinkSkill,
  onCopySkill,
  onMoveSkill,
  onSyncAll,
  onTrashSkill,
  onRevealPath
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Determine available source platform
  const installedPlatforms = platforms.filter(p => skill.platforms[p.id]?.installed);
  const missingPlatforms = platforms.filter(p => !skill.platforms[p.id]?.installed);
  const primarySourcePlatform = installedPlatforms.find(p => p.id === 'shared') || installedPlatforms[0];

  const handleAction = async (fn) => {
    try {
      setActionLoading(true);
      await fn();
    } finally {
      setActionLoading(false);
      setMenuOpen(false);
    }
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-white/5 bg-slate-900/40 p-4 transition-all duration-200 hover:border-indigo-500/30 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-black/40">
      
      {/* Top info */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h4 
                onClick={() => onOpenDetail(skill.name)}
                className="font-semibold text-sm text-slate-100 hover:text-indigo-400 cursor-pointer transition-colors flex items-center gap-1.5"
              >
                {skill.displayName || skill.name}
              </h4>
              <p className="text-[11px] font-mono text-slate-500">
                {skill.name}
              </p>
            </div>
          </div>

          {/* Quick options menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>

            {menuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setMenuOpen(false)} 
                />
                <div className="absolute right-0 top-7 z-50 w-48 rounded-xl border border-white/10 bg-slate-950 p-1.5 shadow-2xl backdrop-blur-xl text-xs">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenDetail(skill.name);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    Inspect & Edit SKILL.md
                  </button>

                  {primarySourcePlatform && (
                    <button
                      onClick={() => handleAction(() => onSyncAll(skill.name, primarySourcePlatform.id, 'symlink'))}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-indigo-300 hover:bg-indigo-500/20"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Sync (Symlink) to All
                    </button>
                  )}

                  {primarySourcePlatform && skill.platforms[primarySourcePlatform.id]?.path && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onRevealPath(skill.platforms[primarySourcePlatform.id].path);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                      Reveal in macOS Finder
                    </button>
                  )}

                  <div className="my-1 border-t border-white/5" />

                  {installedPlatforms.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleAction(() => onTrashSkill(skill.name, p.id))}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove from {p.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="mt-2.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {skill.description || 'No description provided in frontmatter.'}
        </p>

        {/* Tags / Metadata */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
          {skill.metadata?.version && (
            <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 border border-white/5">
              v{skill.metadata.version}
            </span>
          )}
          {skill.metadata?.author && (
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400 border border-white/5">
              by {skill.metadata.author}
            </span>
          )}
          {skill.hasSymlink && (
            <span className="rounded bg-purple-500/10 px-1.5 py-0.5 font-mono text-[10px] text-purple-300 border border-purple-500/20 flex items-center gap-1">
              <Link2 className="h-2.5 w-2.5" />
              Symlinked
            </span>
          )}
        </div>
      </div>

      {/* Platform presence matrix bar */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <div className="text-[11px] font-medium text-slate-400 mb-2 flex items-center justify-between">
          <span>Assistant Availability</span>
          <span className="text-[10px] text-slate-500">
            {installedPlatforms.length}/{platforms.length} active
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {platforms.map(plat => {
            const status = skill.platforms[plat.id];
            const isInstalled = !!status?.installed;
            const isSym = !!status?.isSymlink;

            if (isInstalled) {
              return (
                <div
                  key={plat.id}
                  title={`${plat.name}: ${isSym ? `Symlinked -> ${status.symlinkDisplay || status.symlinkTarget}` : 'Direct Folder'}`}
                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors"
                  style={{
                    backgroundColor: `${plat.color}15`,
                    borderColor: `${plat.color}40`,
                    color: plat.color
                  }}
                >
                  {isSym ? (
                    <Link2 className="h-2.5 w-2.5" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                  <span className="font-medium">{plat.badge || plat.name}</span>
                </div>
              );
            }

            // Missing on platform: quick-add button
            return (
              <button
                key={plat.id}
                disabled={actionLoading || !primarySourcePlatform}
                onClick={() => {
                  if (primarySourcePlatform) {
                    handleAction(() => onLinkSkill(skill.name, primarySourcePlatform.id, plat.id, true));
                  }
                }}
                title={`Click to link to ${plat.name}`}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-dashed border-white/10 text-slate-500 hover:border-indigo-500/50 hover:text-indigo-300 hover:bg-indigo-500/5 transition-all"
              >
                <Plus className="h-2.5 w-2.5" />
                <span>{plat.badge || plat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Quick Actions */}
      <div className="mt-3 pt-2.5 flex items-center justify-between gap-2 text-xs">
        <button
          onClick={() => onOpenDetail(skill.name)}
          className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          <FileText className="h-3.5 w-3.5 text-indigo-400" />
          <span>View Spec</span>
        </button>

        {missingPlatforms.length > 0 && primarySourcePlatform && (
          <button
            onClick={() => handleAction(() => onSyncAll(skill.name, primarySourcePlatform.id, 'symlink'))}
            disabled={actionLoading}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[11px] font-medium transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            <span>Sync to All ({missingPlatforms.length})</span>
          </button>
        )}
      </div>
    </div>
  );
}
