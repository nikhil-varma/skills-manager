import React from 'react';
import { 
  Zap, 
  Search, 
  Plus, 
  Settings, 
  RefreshCw, 
  LayoutGrid, 
  Table, 
  Share2, 
  SlidersHorizontal 
} from 'lucide-react';

export default function Navbar({
  searchTerm,
  setSearchTerm,
  viewMode,
  setViewMode,
  onRefresh,
  loading,
  onOpenNewSkill,
  onOpenSettings,
  totalSkills,
  activeFilter,
  setActiveFilter,
  platforms
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0b0f17]/90 backdrop-blur-xl px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <Zap className="h-5 w-5 text-white fill-white/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                SkillDesk
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  macOS
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              {totalSkills} skills discovered across {platforms.length} assistants
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex-1 max-w-xl mx-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search skills by name, description, tags, or content..."
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/80 transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900/90 border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'cards'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'matrix'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Comparison Matrix View"
            >
              <Table className="h-4 w-4" />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Rescan file system"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* Settings / Paths */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Configure platform paths"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* Create Skill */}
          <button
            onClick={onOpenNewSkill}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>New Skill</span>
          </button>
        </div>
      </div>
    </header>
  );
}
