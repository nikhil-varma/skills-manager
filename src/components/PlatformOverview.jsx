import React from 'react';
import { 
  FolderCheck, 
  FolderX, 
  ExternalLink, 
  Link as LinkIcon, 
  Terminal, 
  Bot, 
  Sparkles, 
  Share2 
} from 'lucide-react';

const ICONS = {
  Bot,
  Terminal,
  Sparkles,
  Share2
};

export default function PlatformOverview({ 
  platforms, 
  activeFilter, 
  setActiveFilter, 
  onRevealFolder 
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
      {platforms.map((plat) => {
        const IconComponent = ICONS[plat.icon] || Bot;
        const isSelected = activeFilter === plat.id;

        return (
          <div
            key={plat.id}
            onClick={() => setActiveFilter(isSelected ? 'all' : plat.id)}
            className={`cursor-pointer group relative overflow-hidden rounded-xl border p-4 transition-all duration-200 ${
              isSelected
                ? 'bg-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                : 'bg-slate-900/60 border-white/5 hover:border-white/15 hover:bg-slate-900/80'
            }`}
          >
            {/* Ambient accent glow */}
            <div
              className="absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-15 pointer-events-none transition-opacity group-hover:opacity-25"
              style={{ backgroundColor: plat.color }}
            />

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: `${plat.color}25`, border: `1px solid ${plat.color}40` }}
                >
                  <IconComponent className="h-4 w-4" style={{ color: plat.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                    {plat.name}
                    {plat.id === 'shared' && (
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded border border-purple-500/30">
                        Hub
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400 truncate max-w-[170px]" title={plat.path}>
                    {plat.path}
                  </p>
                </div>
              </div>

              {/* Reveal in finder button */}
              {plat.exists && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRevealFolder(plat.expandedPath);
                  }}
                  className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                  title="Reveal directory in macOS Finder"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                {plat.exists ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-medium">Active</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span className="text-[11px]">Folder not created</span>
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-white font-mono">{plat.count || 0}</span>
                <span className="text-slate-400 text-[11px]">skills</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
