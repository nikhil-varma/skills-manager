import React, { useState } from 'react';
import { 
  FolderCheck, 
  FolderX, 
  ExternalLink, 
  Link as LinkIcon, 
  Terminal, 
  Bot, 
  Sparkles, 
  Share2,
  ChevronDown,
  Layers
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
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default

  const activeCount = platforms.filter(p => p.exists).length;
  const totalSkillsCount = platforms.reduce((acc, p) => acc + (p.count || 0), 0);

  return (
    <div className="mb-5 rounded-2xl border border-black/[0.06] dark:border-white/10 bg-white/75 dark:bg-[#1a1c24]/75 backdrop-blur-xl overflow-hidden transition-all duration-300 shadow-2xs">
      
      {/* Collapsible Header Bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 bg-black/[0.02] hover:bg-black/[0.04] dark:bg-white/[0.02] dark:hover:bg-white/[0.04] transition-colors text-left group cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-6 w-6 rounded-md bg-[#007AFF]/10 border border-[#007AFF]/20 flex items-center justify-center text-[#007AFF] flex-shrink-0">
            <Layers className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center min-w-0">
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white transition-colors truncate">
              Connected Assistants
            </span>
            <span className="sm:ml-2.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate font-normal">
              {activeCount} active locations • {totalSkillsCount} skills
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors flex-shrink-0 ml-2">
          <span className="text-[11px] font-medium hidden xs:inline">
            {isExpanded ? 'Hide' : `Show (${platforms.length})`}
          </span>
          <ChevronDown 
            className={`h-3 w-3 transition-transform duration-200 ${
              isExpanded ? 'rotate-180 text-[#007AFF]' : ''
            }`} 
          />
        </div>
      </button>

      {/* Expanded Grid */}
      {isExpanded && (
        <div className="p-3 sm:p-4 border-t border-black/[0.06] dark:border-white/10 bg-black/[0.01] dark:bg-black/20 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {platforms.map((plat) => {
              const IconComponent = ICONS[plat.icon] || Bot;
              const isSelected = activeFilter === plat.id;

              return (
                <div
                  key={`${plat.id}-${plat.path}`}
                  onClick={() => setActiveFilter(isSelected ? 'all' : plat.id)}
                  className={`cursor-pointer group relative overflow-hidden rounded-xl border p-3.5 transition-all duration-200 ${
                    isSelected
                      ? 'bg-white dark:bg-[#20232d] border-[#007AFF] shadow-md shadow-[#007AFF]/10 ring-1 ring-[#007AFF]/40'
                      : 'bg-white/80 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-2xs"
                        style={{ backgroundColor: `${plat.color}20`, border: `1px solid ${plat.color}35` }}
                      >
                        <IconComponent className="h-3.5 w-3.5" style={{ color: plat.color }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 truncate">
                          {plat.name}
                          {plat.id === 'shared' && (
                            <span className="text-[9px] bg-purple-500/15 text-purple-700 dark:text-purple-300 px-1 py-0.2 rounded-full border border-purple-500/25 flex-shrink-0 font-medium">
                              Hub
                            </span>
                          )}
                        </h3>
                        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[170px]" title={plat.path}>
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
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                        title="Reveal directory in macOS Finder"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {plat.exists ? (
                        <span className="flex items-center gap-1 text-[#248A3D] dark:text-[#30D158]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#34C759] animate-pulse" />
                          <span className="text-[11px] font-medium">Active</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          <span className="text-[11px]">Not created</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono">{plat.count || 0}</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[10px]">skills</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
