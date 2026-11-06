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
  Moon
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
  onToggleTheme
}) {
  const isTauri = typeof window !== 'undefined' && (
    Boolean(window.__TAURI_INTERNALS__) ||
    Boolean(window.__TAURI__) ||
    window.location.protocol === 'tauri:' ||
    window.location.hostname === 'tauri.localhost'
  );

  return (
    <header data-tauri-drag-region className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-[#0b0f17]/90 backdrop-blur-xl px-3.5 sm:px-6 py-2.5 sm:py-3.5 transition-colors duration-200">
      <div className={`w-full mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 transition-all duration-300 ${isChatOpen ? 'max-w-[1920px]' : 'max-w-7xl'}`}>
        
        {/* Brand & Mobile Quick Actions Row */}
        <div className="flex items-center justify-between gap-3">
          <div className={`flex items-center gap-2.5 sm:gap-3 ${isTauri ? 'pl-16 sm:pl-18' : ''}`}>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-tr from-[#007AFF] via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-[#007AFF]/20 ring-1 ring-white/20 flex-shrink-0">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-white fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  SkillDesk
                  <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 sm:py-0.5 rounded bg-[#007AFF]/10 text-[#007AFF] dark:text-sky-300 border border-[#007AFF]/20">
                    macOS
                  </span>
                </h1>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
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
                  ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-md shadow-[#007AFF]/30'
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
              }`}
              title="Toggle AI Skill Assistant"
              aria-label="Toggle AI Skill Assistant"
            >
              <div className="relative">
                <Bot className="h-4 w-4" />
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
              className="p-1.5 rounded-lg bg-[#007AFF] text-white shadow-md shadow-[#007AFF]/30 active:scale-95 transition-transform"
              title="Create New Skill"
              aria-label="Create New Skill"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex-1 max-w-xl md:mx-2 w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search skills by name, description, tags..."
              className="w-full bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-8 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40 focus:border-[#007AFF] transition-all shadow-inner"
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
        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex-shrink-0"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-600" />
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50 flex-shrink-0"
            title="Rescan file system"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#007AFF]' : ''}`} />
          </button>

          {/* Auto-Discover Tools Button */}
          <button
            onClick={onOpenDiscover}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] dark:text-sky-300 border border-[#007AFF]/25 font-medium text-xs transition-colors flex-shrink-0"
            title="Auto-scan macOS for AI tools & project skills"
          >
            <Radar className="h-4 w-4 animate-pulse text-[#007AFF]" />
            <span className="hidden sm:inline">Auto-Detect</span>
          </button>

          {/* Settings / Paths */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex-shrink-0"
            title="Configure platform paths & AI provider"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* AI Skill Assistant Button (Desktop) */}
          <button
            onClick={onToggleChat}
            className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-xs transition-all border flex-shrink-0 ${
              isChatOpen
                ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-md shadow-[#007AFF]/30'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
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
            className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#007AFF] hover:bg-[#0062cc] text-white font-medium text-xs shadow-md shadow-[#007AFF]/30 transition-all active:scale-[0.98] flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>New Skill</span>
          </button>
        </div>
      </div>
    </header>
  );
}
