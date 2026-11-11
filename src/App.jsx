import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar.jsx';
import PlatformOverview from './components/PlatformOverview.jsx';
import SkillsCardView from './components/SkillsCardView.jsx';
import MatrixView from './components/MatrixView.jsx';
import FolderGroupedView from './components/FolderGroupedView.jsx';
import SkillDetailModal from './components/SkillDetailModal.jsx';
import NewSkillModal from './components/NewSkillModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import AutoDiscoverModal from './components/AutoDiscoverModal.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import Toast from './components/Toast.jsx';
import { 
  fetchSkills, 
  linkSkill, 
  unlinkSkill, 
  copySkill, 
  moveSkill, 
  syncAllSkills, 
  trashSkill, 
  deleteSkillCompletely,
  revealInFinder,
  fetchLLMConfig 
} from './api.js';
import { Sparkles, Layers, Filter, CheckCircle2, AlertCircle, ChevronDown, Bot, LayoutGrid, FolderTree } from 'lucide-react';

export default function App() {
  const [skills, setSkills] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [totalSkills, setTotalSkills] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', platform.id, 'unsynced', 'symlinked'
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false); // Collapsed by default

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // View Mode: 'cards' (Primary card view) | 'grouped' (Grouped by folder location) | 'matrix' (Table)
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('skilldesk-view-mode') || 'cards';
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('skilldesk-view-mode', mode);
  };

  // Modals & Panels
  const [selectedSkillName, setSelectedSkillName] = useState(null);
  const [isNewSkillOpen, setIsNewSkillOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('locations');
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Theme State (macOS Sequoia Glass Light / Dark)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('skilldesk-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('skilldesk-theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // AI LLM State
  const [llmConfig, setLlmConfig] = useState(null);
  const [isLLMConfigured, setIsLLMConfigured] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(current => (current?.message === message ? null : current));
    }, 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSkills();
      setSkills(data.skills || []);
      setPlatforms(data.platforms || []);
      setTotalSkills(data.totalSkills || 0);
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadLLMConfig = async () => {
    try {
      const res = await fetchLLMConfig();
      setLlmConfig(res.config);
      setIsLLMConfigured(res.isConfigured);
    } catch (err) {
      console.error('Failed to load LLM config:', err);
    }
  };

  useEffect(() => {
    loadData();
    loadLLMConfig();
  }, []);

  // Reset filter to 'all' if the selected platform has 0 skills
  useEffect(() => {
    if (activeFilter !== 'all' && activeFilter !== 'unsynced' && activeFilter !== 'symlinked') {
      const plat = platforms.find(p => p.id === activeFilter);
      if (plat && (plat.count || 0) === 0) {
        setActiveFilter('all');
      }
    }
  }, [platforms, activeFilter]);

  // Computed counts for filters
  const filterStats = useMemo(() => {
    const unsynced = skills.filter(s => {
      const count = platforms.filter(p => s.platforms[p.id]?.installed).length;
      return count < platforms.length;
    }).length;

    const symlinked = skills.filter(s => s.hasSymlink).length;

    return { unsynced, symlinked };
  }, [skills, platforms]);

  const activeFilterName = useMemo(() => {
    if (activeFilter === 'all') return `All Skills (${skills.length})`;
    if (activeFilter === 'unsynced') return `Needs Sync (${filterStats.unsynced})`;
    if (activeFilter === 'symlinked') return `Symlinked (${filterStats.symlinked})`;
    const plat = platforms.find(p => p.id === activeFilter);
    return plat ? `${plat.badge || plat.name} (${plat.count || 0})` : activeFilter;
  }, [activeFilter, skills.length, filterStats, platforms]);

  // Filter skills
  const filteredSkills = useMemo(() => {
    let result = skills;

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(q) ||
        (s.displayName && s.displayName.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.metadata?.author && s.metadata.author.toLowerCase().includes(q))
      );
    }

    // Platform or category filter
    if (activeFilter === 'all') {
      return result;
    } else if (activeFilter === 'unsynced') {
      return result.filter(s => {
        const count = platforms.filter(p => s.platforms[p.id]?.installed).length;
        return count < platforms.length;
      });
    } else if (activeFilter === 'symlinked') {
      return result.filter(s => s.hasSymlink);
    } else {
      // Platform id filter
      return result.filter(s => s.platforms[activeFilter]?.installed);
    }
  }, [skills, searchTerm, activeFilter, platforms]);

  // Reset page to 1 whenever search term or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter]);

  // Paginate the filtered skills
  const paginatedSkills = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSkills.slice(start, start + pageSize);
  }, [filteredSkills, currentPage, pageSize]);

  // Operations
  const handleLinkSkill = async (skillName, sourcePlatformId, targetPlatformId, makeSharedCanonical = true) => {
    try {
      await linkSkill({ skillName, sourcePlatformId, targetPlatformId, makeSharedCanonical });
      showToast(`Linked ${skillName} to ${targetPlatformId}`, 'success');
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUnlinkSkill = async (skillName, platformId, detach = false) => {
    try {
      await unlinkSkill({ skillName, platformId, detach });
      showToast(detach ? `Detached ${skillName} into standalone copy` : `Un-symlinked ${skillName} from ${platformId}`, 'success');
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCopySkill = async (skillName, sourcePlatformId, targetPlatformId) => {
    try {
      await copySkill({ skillName, sourcePlatformId, targetPlatformId, overwrite: true });
      showToast(`Copied ${skillName} to ${targetPlatformId}`, 'success');
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleMoveSkill = async (skillName, sourcePlatformId, targetPlatformId) => {
    try {
      await moveSkill({ skillName, sourcePlatformId, targetPlatformId });
      showToast(`Moved ${skillName} to ${targetPlatformId}`, 'success');
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSyncAll = async (skillName, sourcePlatformId, mode = 'symlink') => {
    try {
      await syncAllSkills({ skillName, sourcePlatformId, mode });
      showToast(`Synchronized ${skillName} across all assistants`, 'success');
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleTrashSkill = async (skillName, platformId) => {
    try {
      await trashSkill({ skillName, platformId });
      showToast(`Removed ${skillName} from ${platformId}`, 'success');
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteCompletely = async (skillName) => {
    try {
      const res = await deleteSkillCompletely({ skillName });
      const count = res.deletedFrom?.length || 0;
      showToast(`Deleted "${skillName}" completely (${count} location${count === 1 ? '' : 's'} removed)`, 'success');
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRevealPath = async (filePath) => {
    try {
      const res = await revealInFinder(filePath);
      if (res.inDocker) {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(res.path || filePath);
          showToast(`Running in Docker: path copied to clipboard (${res.path || filePath})`, 'info');
        } else {
          showToast(`Running in Docker: ${res.path || filePath}`, 'info');
        }
      } else if (res.notFound) {
        showToast(res.message || `Folder does not exist yet: ${res.path || filePath}`, 'info');
      } else if (!res.success && res.error) {
        showToast(`Could not open Finder: ${res.error}`, 'error');
      } else {
        showToast('Revealed in macOS Finder', 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="h-screen bg-[#f5f6f8] dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 overflow-hidden">
      <Navbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onRefresh={loadData}
        loading={loading}
        onOpenNewSkill={() => setIsNewSkillOpen(true)}
        onOpenSettings={() => {
          setSettingsInitialTab('locations');
          setIsSettingsOpen(true);
        }}
        onOpenDiscover={() => setIsDiscoverOpen(true)}
        totalSkills={totalSkills}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        platforms={platforms}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        isLLMConfigured={isLLMConfigured}
        theme={theme}
        onToggleTheme={toggleTheme}
        viewMode={viewMode}
        onSetViewMode={handleSetViewMode}
      />

      <div className="flex-1 flex flex-col lg:flex-row w-full overflow-hidden">
        <main className="flex-1 min-w-0 overflow-y-auto px-3.5 sm:px-6 py-4 sm:py-6">
          <div className={`w-full mx-auto transition-all duration-300 ${isChatOpen ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
            {/* Platform Overview Cards */}
            <PlatformOverview
              platforms={platforms}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              onRevealFolder={handleRevealPath}
            />

          {/* Collapsible Filter Section (Native macOS Segmented Style) */}
          <div className="mb-5 rounded-2xl border border-black/[0.06] dark:border-white/10 bg-white/75 dark:bg-[#1a1c24]/75 backdrop-blur-xl overflow-hidden transition-all duration-300 shadow-2xs">
            <div
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2.5 bg-black/[0.02] hover:bg-black/[0.04] dark:bg-white/[0.02] dark:hover:bg-white/[0.04] transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-md bg-[#007AFF]/10 border border-[#007AFF]/20 flex items-center justify-center text-[#007AFF]">
                  <Filter className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-slate-600 dark:text-slate-400">Filter:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#007AFF]/15 text-[#007AFF] dark:text-[#0A84FF] font-medium text-[11px] border border-[#007AFF]/25">
                    {activeFilterName}
                  </span>
                  {activeFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFilter('all');
                      }}
                      className="text-[11px] text-slate-400 hover:text-[#007AFF] underline ml-0.5"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3 text-xs">
                {/* View Switcher in Filter Bar */}
                <div 
                  className="p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/10 flex items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleSetViewMode('matrix')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      viewMode === 'matrix'
                        ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-2xs font-semibold'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Matrix View (Cross-Assistant Comparison)"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Matrix</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetViewMode('grouped')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      viewMode === 'grouped'
                        ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-2xs font-semibold'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Grouped by Folder Location"
                  >
                    <FolderTree className="h-3.5 w-3.5" />
                    <span>By Folder</span>
                  </button>
                </div>

                <span className="text-slate-500 dark:text-slate-400 text-[11px] hidden sm:inline">
                  Showing <strong className="text-slate-800 dark:text-slate-200">{filteredSkills.length}</strong> of {skills.length} skills
                </span>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 transition-colors text-xs font-medium"
                >
                  <span>{isFiltersExpanded ? 'Hide' : 'Filter by Assistant'}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isFiltersExpanded ? 'rotate-180 text-[#007AFF]' : ''}`} />
                </button>
              </div>
            </div>

            {isFiltersExpanded && (
              <div className="p-3 border-t border-black/[0.06] dark:border-white/10 bg-black/[0.01] dark:bg-black/20 animate-fade-in">
                {/* macOS Segmented Capsule Container */}
                <div className="p-1 rounded-xl bg-black/[0.04] dark:bg-black/40 border border-black/[0.06] dark:border-white/10 inline-flex flex-wrap gap-1 text-xs">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-3 py-1 rounded-lg font-medium text-xs transition-all ${
                      activeFilter === 'all'
                        ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    All Skills ({skills.length})
                  </button>

                  {filterStats.unsynced > 0 && (
                    <button
                      onClick={() => setActiveFilter('unsynced')}
                      className={`px-3 py-1 rounded-lg font-medium text-xs transition-all ${
                        activeFilter === 'unsynced'
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Needs Sync ({filterStats.unsynced})
                    </button>
                  )}

                  {filterStats.symlinked > 0 && (
                    <button
                      onClick={() => setActiveFilter('symlinked')}
                      className={`px-3 py-1 rounded-lg font-medium text-xs transition-all ${
                        activeFilter === 'symlinked'
                          ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Symlinked ({filterStats.symlinked})
                    </button>
                  )}

                  {platforms
                    .filter(p => (p.count || 0) > 0)
                    .map(p => (
                      <button
                        key={`${p.id}-${p.path}`}
                        onClick={() => setActiveFilter(p.id)}
                        className={`px-3 py-1 rounded-lg font-medium text-xs transition-all ${
                          activeFilter === p.id
                            ? 'bg-[#007AFF] text-white shadow-xs font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {p.badge || p.name} ({p.count})
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

        {/* Content Body */}
        {loading && skills.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-sm">
            Scanning macOS skill directories...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-300">
            <AlertCircle className="h-6 w-6 mx-auto mb-2" />
            <p className="font-semibold">Failed to scan skills</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-100/60 dark:bg-slate-900/30">
            <Layers className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-300">No skills match the current filter</h4>
            <p className="text-xs text-slate-500 mt-1">Try resetting search or filters</p>
            <button
              onClick={() => { setSearchTerm(''); setActiveFilter('all'); }}
              className="mt-3 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-xs text-slate-700 dark:text-slate-300 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'cards' ? (
          <SkillsCardView
            skills={filteredSkills}
            totalFiltered={filteredSkills.length}
            totalSkills={skills.length}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            platforms={platforms}
            onOpenDetail={(name) => setSelectedSkillName(name)}
            onLinkSkill={handleLinkSkill}
            onUnlinkSkill={handleUnlinkSkill}
            onSyncAll={handleSyncAll}
            onTrashSkill={handleTrashSkill}
            onDeleteCompletely={handleDeleteCompletely}
            onRevealPath={handleRevealPath}
          />
        ) : viewMode === 'matrix' ? (
          <MatrixView
            skills={paginatedSkills}
            totalFiltered={filteredSkills.length}
            totalSkills={skills.length}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            platforms={platforms}
            onOpenDetail={(name) => setSelectedSkillName(name)}
            onLinkSkill={handleLinkSkill}
            onUnlinkSkill={handleUnlinkSkill}
            onSyncAll={handleSyncAll}
            onTrashSkill={handleTrashSkill}
            onDeleteCompletely={handleDeleteCompletely}
            onRevealPath={handleRevealPath}
          />
        ) : (
          <FolderGroupedView
            skills={filteredSkills}
            platforms={platforms}
            onOpenDetail={(name) => setSelectedSkillName(name)}
            onRevealPath={handleRevealPath}
            onUnlinkSkill={handleUnlinkSkill}
            onTrashSkill={handleTrashSkill}
            onLinkSkill={handleLinkSkill}
            searchTerm={searchTerm}
          />
        )}
          </div>
        </main>

        {/* AI Skill Assistant (Inline Page Panel on the right) */}
        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onOpenSettings={() => {
            setSettingsInitialTab('ai');
            setIsSettingsOpen(true);
          }}
          onOpenSkill={(name) => setSelectedSkillName(name)}
          totalSkills={totalSkills}
          isLLMConfigured={isLLMConfigured}
          llmConfig={llmConfig}
          theme={theme}
        />
      </div>

      {/* Modals */}
      {selectedSkillName && (
        <SkillDetailModal
          skillName={selectedSkillName}
          platforms={platforms}
          onClose={() => setSelectedSkillName(null)}
          onRefresh={loadData}
          showToast={showToast}
          onRevealPath={handleRevealPath}
          onTrashSkill={handleTrashSkill}
          onDeleteCompletely={handleDeleteCompletely}
        />
      )}

      {isNewSkillOpen && (
        <NewSkillModal
          platforms={platforms}
          onClose={() => setIsNewSkillOpen(false)}
          onSuccess={loadData}
          showToast={showToast}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          platforms={platforms}
          initialTab={settingsInitialTab}
          onClose={() => setIsSettingsOpen(false)}
          onSuccess={() => {
            loadData();
            loadLLMConfig();
          }}
          showToast={showToast}
        />
      )}

      {isDiscoverOpen && (
        <AutoDiscoverModal
          onClose={() => setIsDiscoverOpen(false)}
          onSuccess={loadData}
          showToast={showToast}
          onRevealPath={handleRevealPath}
        />
      )}

      {/* Mobile Floating Action Button for AI Assistant */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="lg:hidden fixed bottom-5 right-5 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#007AFF] text-white shadow-xl shadow-[#007AFF]/35 active:scale-95 transition-all text-xs font-semibold"
          aria-label="Open AI Assistant"
        >
          <div className="relative">
            <Bot className="h-4 w-4" />
            <span className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${isLLMConfigured ? 'bg-emerald-300' : 'bg-amber-300 animate-pulse'}`} />
          </div>
          <span>AI Assistant</span>
        </button>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
