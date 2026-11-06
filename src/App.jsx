import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar.jsx';
import PlatformOverview from './components/PlatformOverview.jsx';
import MatrixView from './components/MatrixView.jsx';
import SkillDetailModal from './components/SkillDetailModal.jsx';
import NewSkillModal from './components/NewSkillModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import AutoDiscoverModal from './components/AutoDiscoverModal.jsx';
import Toast from './components/Toast.jsx';
import { 
  fetchSkills, 
  linkSkill, 
  unlinkSkill,
  copySkill, 
  moveSkill, 
  syncAllSkills, 
  trashSkill, 
  revealInFinder 
} from './api.js';
import { Sparkles, Layers, Filter, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';

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

  // Modals
  const [selectedSkillName, setSelectedSkillName] = useState(null);
  const [isNewSkillOpen, setIsNewSkillOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);

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

  useEffect(() => {
    loadData();
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
    if (!confirm(`Are you sure you want to remove "${skillName}" from ${platformId}?`)) return;
    try {
      await trashSkill({ skillName, platformId });
      showToast(`Removed ${skillName} from ${platformId}`, 'success');
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRevealPath = async (filePath) => {
    try {
      await revealInFinder(filePath);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col">
      <Navbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onRefresh={loadData}
        loading={loading}
        onOpenNewSkill={() => setIsNewSkillOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDiscover={() => setIsDiscoverOpen(true)}
        totalSkills={totalSkills}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        platforms={platforms}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6">
        
        {/* Platform Overview Cards */}
        <PlatformOverview
          platforms={platforms}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          onRevealFolder={handleRevealPath}
        />

        {/* Collapsible Filter Section */}
        <div className="mb-6 rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md overflow-hidden transition-all duration-300">
          <div
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900/60 hover:bg-slate-900/90 transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Filter className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-300">Filter:</span>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 font-medium">
                  {activeFilterName}
                </span>
                {activeFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveFilter('all');
                    }}
                    className="text-[11px] text-slate-400 hover:text-white underline ml-1"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-400 text-[11px]">
                Showing <strong className="text-slate-200">{filteredSkills.length}</strong> of {skills.length} skills
              </span>
              <button
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors text-xs"
              >
                <span>{isFiltersExpanded ? 'Hide Filters' : 'Show Filters'}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isFiltersExpanded ? 'rotate-180 text-indigo-400' : ''}`} />
              </button>
            </div>
          </div>

          {isFiltersExpanded && (
            <div className="p-4 border-t border-white/5 bg-slate-950/40 animate-fade-in">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    activeFilter === 'all'
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  All Skills ({skills.length})
                </button>

                {filterStats.unsynced > 0 && (
                  <button
                    onClick={() => setActiveFilter('unsynced')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      activeFilter === 'unsynced'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    Needs Sync ({filterStats.unsynced})
                  </button>
                )}

                {filterStats.symlinked > 0 && (
                  <button
                    onClick={() => setActiveFilter('symlinked')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      activeFilter === 'symlinked'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
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
                      className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        activeFilter === p.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
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
          <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 bg-slate-900/30">
            <Layers className="h-8 w-8 text-slate-500 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-300">No skills match the current filter</h4>
            <p className="text-xs text-slate-500 mt-1">Try resetting search or filters</p>
            <button
              onClick={() => { setSearchTerm(''); setActiveFilter('all'); }}
              className="mt-3 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
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
            onRevealPath={handleRevealPath}
          />
        )}
      </main>

      {/* Modals */}
      {selectedSkillName && (
        <SkillDetailModal
          skillName={selectedSkillName}
          platforms={platforms}
          onClose={() => setSelectedSkillName(null)}
          onRefresh={loadData}
          showToast={showToast}
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
          onClose={() => setIsSettingsOpen(false)}
          onSuccess={loadData}
          showToast={showToast}
        />
      )}

      {isDiscoverOpen && (
        <AutoDiscoverModal
          onClose={() => setIsDiscoverOpen(false)}
          onSuccess={loadData}
          showToast={showToast}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
