import React from 'react';
import { 
  Zap, 
  Search, 
  Plus, 
  Settings, 
  RefreshCw, 
  Radar,
  Bot,
  Sparkles,
  Sun,
  Moon,
  LayoutGrid,
  FolderTree
} from 'lucide-react';

export default function Navbar({
  searchTerm,
  setSearchTerm,
  onRefresh,
  loading,
  onOpenNewSkill,
  onOpenSettings,
  onOpenDiscover,
  totalSkills,
  activeFilter,
  setActiveFilter,
  platforms,
  onToggleChat,
  isChatOpen,
  isLLMConfigured,
  theme = 'dark',
  onToggleTheme,
  viewMode = 'matrix',
  onSetViewMode
}) {
  const isTauri = typeof window !== 'undefined' && (
    Boolean(window.__TAURI_INTERNALS__) ||
    Boolean(window.__TAURI__) ||
    window.location.protocol === 'tauri:' ||
    window.location.hostname === 'tauri.localhost'
  );

  const handleHeaderMouseDown = async (e) => {
    if (!isTauri) return;
    if (e.buttons === 1 && !e.target.closest('button, input, textarea, select, a, [role="button"], .no-drag')) {
      try {
        const { getCurrentWindow } = await import(/* @vite-ignore */ '@tauri-apps/api/window');
        const win = getCurrentWindow();
        await win.startDragging();
      } catch (err) {
        // Fallback
      }
    }
  };

  return (
    <header
      data-tauri-drag-region
      onMouseDown={handleHeaderMouseDown}
      className="sticky top-0 z-30 select-none cursor-default border-b border-black/[0.08] dark:border-white/10 bg-[#fbfcfd]/85 dark:bg-[#1a1c24]/85 macos-glass px-3.5 sm:px-6 py-2.5 sm:py-3 transition-colors duration-200"
    >
      <div className={`w-full mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 transition-all duration-300 ${isChatOpen ? 'max-w-[1920px]' : 'max-w-7xl'}`}>
        
        {/* Brand & Mobile Quick Actions Row */}
        <div className="flex items-center justify-between gap-3">
          <div className={`flex items-center gap-2.5 sm:gap-3 ${isTauri ? 'pl-16 sm:pl-18' : ''}`}>
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-b from-[#007AFF] to-[#0051d5] flex items-center justify-center shadow-md shadow-[#007AFF]/25 ring-1 ring-white/20 flex-shrink-0">
              <Zap className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-white fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  SkillDesk
                  <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF] dark:text-[#0A84FF] border border-[#007AFF]/20">
                    macOS
                  </span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {totalSkills} skills <span className="hidden xs:inline">• {platforms.length} assistants</span>
              </p>
            </div>
          </div>

          {/* Quick buttons shown on small screens next to brand */}
          <div className="flex md:hidden items-center gap-1.5">
            {/* AI Assistant Mobile Pill */}
            <button
              onClick={onToggleChat}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium text-xs border transition-all ${
                isChatOpen
                  ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-sm shadow-[#007AFF]/30'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] border-black/[0.06] dark:border-white/10 text-slate-700 dark:text-slate-300'
              }`}
              title="Toggle AI Skill Assistant"
              aria-label="Toggle AI Skill Assistant"
            >
              <div className="relative">
                <Bot className="h-3.5 w-3.5" />
                <span 
                  className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ${
                    isLLMConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                  }`} 
                  />
              </div>
              <span className="font-semibold text-[11px]">AI</span>
            </button>

            {/* New Skill (+) Mobile Button */}
            <button
              onClick={onOpenNewSkill}
              className="p-1.5 rounded-lg bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/30 active:scale-95 transition-transform"
              title="Create New Skill"
              aria-label="Create New Skill"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search Bar: Apple Spotlight / Finder Capsule */}
        <div className="flex-1 max-w-xl md:mx-2 w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search skills by name, description, tags..."
              className="w-full bg-black/[0.04] hover:bg-black/[0.06] dark:bg-white/[0.06] dark:hover:bg-white/[0.08] focus:bg-white dark:focus:bg-black/50 border border-black/[0.06] dark:border-white/10 rounded-lg pl-8 pr-7 py-1.5 text-xs sm:text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/35 focus:border-[#007AFF] transition-all shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white px-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Action Controls Row (Desktop & Tablet) */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 overflow-x-auto no-scrollbar">
          {/* macOS View Mode Switcher: Cards vs By Folder vs Table */}
          {onSetViewMode && (
            <div className="p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/10 flex items-center flex-shrink-0">
              <button
                type="button"
                onClick={() => onSetViewMode('cards')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Skills Cards View (Primary)"
              >
                <LayoutGrid className="h-3.5 w-3.5 text-[#007AFF]" />
                <span className="text-[11px]">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => onSetViewMode('grouped')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'grouped'
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Folder Grouping View (Grouped by Folder Location)"
              >
                <FolderTree className="h-3.5 w-3.5 text-[#AF52DE]" />
                <span className="hidden sm:inline text-[11px]">By Folder</span>
              </button>
              <button
                type="button"
                onClick={() => onSetViewMode('matrix')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'matrix'
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Table Matrix View"
              >
                <span className="text-[11px] text-slate-400">Table</span>
              </button>
            </div>
          )}

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-black/[0.06] dark:border-white/10 text-slate-700 dark:text-slate-300 transition-colors flex-shrink-0"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-[#007AFF]" />
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-black/[0.06] dark:border-white/10 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 flex-shrink-0"
            title="Rescan file system"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#007AFF]' : ''}`} />
          </button>

          {/* Auto-Discover Tools Button */}
          <button
            onClick={onOpenDiscover}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#0A84FF] border border-[#007AFF]/25 font-medium text-xs transition-colors flex-shrink-0"
            title="Auto-scan macOS for AI tools & project skills"
          >
            <Radar className="h-3.5 w-3.5 animate-pulse text-[#007AFF] dark:text-[#0A84FF]" />
            <span className="hidden sm:inline">Auto-Detect</span>
          </button>

          {/* Settings / Paths */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-black/[0.06] dark:border-white/10 text-slate-700 dark:text-slate-300 transition-colors flex-shrink-0"
            title="Configure platform paths & AI provider"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* AI Skill Assistant Button (Desktop) */}
          <button
            onClick={onToggleChat}
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-all border flex-shrink-0 ${
              isChatOpen
                ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-sm shadow-[#007AFF]/30'
                : 'bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border-black/[0.06] dark:border-white/10 text-slate-700 dark:text-slate-300'
            }`}
            title={isLLMConfigured ? 'Open AI Skill Assistant' : 'Configure custom AI LLM provider in Settings'}
          >
            <div className="relative">
              <Bot className="h-4 w-4" />
              <span 
                className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ${
                  isLLMConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`} 
              />
            </div>
            <span>AI Assistant</span>
          </button>

          {/* Create Skill (Desktop) */}
          <button
            onClick={onOpenNewSkill}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0071E3] text-white font-medium text-xs shadow-sm shadow-[#007AFF]/30 active:scale-95 transition-all flex-shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Skill</span>
          </button>
        </div>
      </div>
    </header>
  );
}
