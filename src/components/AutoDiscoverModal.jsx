import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Radar, 
  Bot, 
  Folder, 
  FolderTree,
  FolderOpen,
  Sparkles, 
  ExternalLink,
  Layers,
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  CheckSquare,
  Square,
  List
} from 'lucide-react';
import { fetchDiscoverTools, syncDiscoveredSelection, revealInFinder } from '../api.js';

function TriStateCheckbox({ checked, indeterminate, onChange, title, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      title={title}
      className={`rounded border-black/25 dark:border-white/25 text-[#007AFF] focus:ring-[#007AFF] bg-white dark:bg-black/50 h-4 w-4 cursor-pointer accent-[#007AFF] ${className}`}
    />
  );
}

// Fallback project info resolver in case item doesn't have metadata pre-computed
function resolveProjectInfo(item) {
  if (item.projectName && item.projectRoot) {
    return {
      projectName: item.projectName,
      projectRoot: item.projectRoot,
      relPath: item.relPath || item.name || 'skills'
    };
  }

  const p = item.path || '';
  const parts = p.replace(/^~[\\/]/, '').split(/[\\/]/).filter(Boolean);
  
  // Find index of skills folder
  const skillsIdx = parts.findIndex(part => part === 'skills' || part === 'skills-cursor');
  let rootParts = [];
  let relParts = [];

  if (skillsIdx > 0) {
    // If inside a dot-folder (like .claude, .agents, .opencode), project is the parent before that
    let projIdx = skillsIdx - 1;
    while (projIdx > 0 && parts[projIdx].startsWith('.')) {
      projIdx--;
    }
    rootParts = parts.slice(0, projIdx + 1);
    relParts = parts.slice(projIdx + 1);
  } else {
    rootParts = parts.slice(0, Math.max(1, parts.length - 1));
    relParts = [parts[parts.length - 1] || 'skills'];
  }

  const projectName = rootParts[rootParts.length - 1] || 'Project';
  const projectRoot = '~/' + rootParts.join('/');
  const relPath = relParts.join('/') || 'skills';

  return { projectName, projectRoot, relPath };
}

export default function AutoDiscoverModal({
  onClose,
  onSuccess,
  showToast,
  onRevealPath
}) {
  const [data, setData] = useState({ globalTools: [], projectWorkspaces: [], totalFound: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTools, setSelectedTools] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('projects'); // Default to projects view since users typically inspect repo workspaces
  const [viewMode, setViewMode] = useState('folder'); // 'folder' | 'flat'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  useEffect(() => {
    loadDiscovery();
  }, []);

  const loadDiscovery = async () => {
    try {
      setLoading(true);
      const res = await fetchDiscoverTools();
      setData(res);

      // Check all items that are currently already added in SkillDesk
      const toSelect = new Set();
      [...res.globalTools, ...res.projectWorkspaces].forEach(t => {
        if (t.isAdded) {
          toSelect.add(t.path);
        }
      });
      setSelectedTools(toSelect);

      // By default, expand all project folders so everything is instantly visible
      const allRoots = new Set();
      res.projectWorkspaces.forEach(item => {
        const info = resolveProjectInfo(item);
        allRoots.add(info.projectRoot);
      });
      setExpandedFolders(allRoots);
    } catch (err) {
      showToast('Failed to scan macOS for tools: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (path) => {
    const next = new Set(selectedTools);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    setSelectedTools(next);
  };

  const toggleFolderSelection = (items) => {
    const next = new Set(selectedTools);
    const allSelected = items.every(i => next.has(i.path));
    
    if (allSelected) {
      // Uncheck all in this folder
      items.forEach(i => next.delete(i.path));
    } else {
      // Check all in this folder
      items.forEach(i => next.add(i.path));
    }
    setSelectedTools(next);
  };

  const selectAll = (items) => {
    const next = new Set(selectedTools);
    items.forEach(i => next.add(i.path));
    setSelectedTools(next);
  };

  const deselectAll = (items) => {
    const next = new Set(selectedTools);
    items.forEach(i => next.delete(i.path));
    setSelectedTools(next);
  };

  const toggleFolderExpanded = (projectRoot) => {
    const next = new Set(expandedFolders);
    if (next.has(projectRoot)) {
      next.delete(projectRoot);
    } else {
      next.add(projectRoot);
    }
    setExpandedFolders(next);
  };

  const expandAll = (roots) => {
    setExpandedFolders(new Set(roots));
  };

  const collapseAll = () => {
    setExpandedFolders(new Set());
  };

  const handleSave = async () => {
    const all = [...data.globalTools, ...data.projectWorkspaces];
    const itemsToKeep = all.filter(item => selectedTools.has(item.path));

    try {
      setSaving(true);
      await syncDiscoveredSelection(itemsToKeep);
      showToast(`Updated active locations in SkillDesk (${itemsToKeep.length} active)`, 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReveal = (p) => {
    if (onRevealPath) {
      onRevealPath(p);
    } else {
      revealInFinder(p);
    }
  };

  // Grouped project folders
  const projectGroups = useMemo(() => {
    const groupsMap = new Map();
    const query = searchQuery.trim().toLowerCase();

    data.projectWorkspaces.forEach(item => {
      const info = resolveProjectInfo(item);
      const matchesSearch = !query || 
        info.projectName.toLowerCase().includes(query) ||
        info.projectRoot.toLowerCase().includes(query) ||
        (info.relPath && info.relPath.toLowerCase().includes(query)) ||
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.path && item.path.toLowerCase().includes(query));

      if (!matchesSearch) return;

      if (!groupsMap.has(info.projectRoot)) {
        groupsMap.set(info.projectRoot, {
          projectRoot: info.projectRoot,
          projectName: info.projectName,
          items: [],
          totalSkills: 0,
          color: item.color || '#8B5CF6'
        });
      }

      const group = groupsMap.get(info.projectRoot);
      group.items.push({
        ...item,
        relPath: info.relPath
      });
      group.totalSkills += (item.count || 0);
    });

    return Array.from(groupsMap.values()).sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [data.projectWorkspaces, searchQuery]);

  // Filtered global tools
  const filteredGlobalTools = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return data.globalTools;
    return data.globalTools.filter(t => 
      t.name?.toLowerCase().includes(query) ||
      t.path?.toLowerCase().includes(query) ||
      t.badge?.toLowerCase().includes(query)
    );
  }, [data.globalTools, searchQuery]);

  // Filtered flat projects
  const filteredFlatProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return data.projectWorkspaces;
    return data.projectWorkspaces.filter(t => 
      t.name?.toLowerCase().includes(query) ||
      t.path?.toLowerCase().includes(query) ||
      t.projectName?.toLowerCase().includes(query) ||
      t.projectRoot?.toLowerCase().includes(query)
    );
  }, [data.projectWorkspaces, searchQuery]);

  const allVisibleProjectItems = useMemo(() => {
    return projectGroups.flatMap(g => g.items);
  }, [projectGroups]);

  const allVisibleGroupRoots = useMemo(() => {
    return projectGroups.map(g => g.projectRoot);
  }, [projectGroups]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-2xl border border-black/10 dark:border-white/15 bg-[#fafbfc]/95 dark:bg-[#1c1e26]/95 shadow-2xl backdrop-blur-2xl overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/10 px-4 sm:px-6 py-3.5 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-[#007AFF]/15 border border-[#007AFF]/30 flex items-center justify-center text-[#007AFF] shadow-xs flex-shrink-0">
              <Radar className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2 truncate">
                <span>Tool & Skill Discovery</span>
                <span className="text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  {data.totalFound} found
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Check or uncheck locations to add or remove them from SkillDesk
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0 ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Selection & Search Bar */}
        <div className="border-b border-black/[0.06] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.015] px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Main Category Tabs */}
          <div className="p-1 rounded-xl bg-black/[0.04] dark:bg-black/40 border border-black/[0.06] dark:border-white/10 inline-flex gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'projects'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Folder className="h-3.5 w-3.5 text-[#AF52DE]" />
              <span>Project Repositories ({data.projectWorkspaces.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('global')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'global'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bot className="h-3.5 w-3.5 text-[#007AFF]" />
              <span>Global Assistants ({data.globalTools.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'projects' ? 'Filter projects, folders...' : 'Filter global assistants...'}
              className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs bg-white/70 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#007AFF] text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Sub-header: Folder View Options & Bulk Selection */}
        <div className="px-4 sm:px-6 py-2 border-b border-black/[0.04] dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] flex items-center justify-between text-xs gap-3">
          {activeTab === 'projects' ? (
            <div className="flex items-center gap-2">
              {/* Folder Grouping vs Flat Toggle */}
              <div className="p-0.5 rounded-lg bg-black/[0.04] dark:bg-black/30 border border-black/[0.06] dark:border-white/10 inline-flex items-center">
                <button
                  onClick={() => setViewMode('folder')}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 ${
                    viewMode === 'folder'
                      ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Group locations by parent project repository folder"
                >
                  <FolderTree className="h-3 w-3 text-[#AF52DE]" />
                  <span>By Folder ({projectGroups.length})</span>
                </button>
                <button
                  onClick={() => setViewMode('flat')}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 ${
                    viewMode === 'flat'
                      ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="View all project locations in flat list"
                >
                  <List className="h-3 w-3 text-slate-500" />
                  <span>Flat List</span>
                </button>
              </div>

              {viewMode === 'folder' && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 ml-1">
                  <button
                    onClick={() => expandAll(allVisibleGroupRoots)}
                    className="hover:text-slate-800 dark:hover:text-slate-200 hover:underline"
                  >
                    Expand All
                  </button>
                  <span>·</span>
                  <button
                    onClick={collapseAll}
                    className="hover:text-slate-800 dark:hover:text-slate-200 hover:underline"
                  >
                    Collapse All
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {filteredGlobalTools.length} global assistant tool locations
            </div>
          )}

          {/* Quick Select All / Deselect All */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'global') selectAll(filteredGlobalTools);
                else selectAll(allVisibleProjectItems);
              }}
              className="text-[#007AFF] hover:underline font-medium text-[11px] sm:text-xs"
            >
              Select All
            </button>
            <span className="text-black/20 dark:text-white/20">|</span>
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'global') deselectAll(filteredGlobalTools);
                else deselectAll(allVisibleProjectItems);
              }}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-[11px] sm:text-xs"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Radar className="h-8 w-8 text-[#007AFF] animate-spin" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Scanning macOS filesystem for AI assistants & skills...</p>
            </div>
          ) : activeTab === 'global' ? (
            // GLOBAL ASSISTANTS TAB
            filteredGlobalTools.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                {searchQuery ? 'No global assistants match your search.' : 'No global assistants found.'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredGlobalTools.map((item) => {
                  const isChecked = selectedTools.has(item.path);

                  return (
                    <div
                      key={item.path}
                      onClick={() => toggleSelect(item.path)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-[#007AFF]/5 border-[#007AFF]/40 dark:border-[#007AFF]/50 shadow-2xs'
                          : 'bg-white/70 dark:bg-white/5 border-black/[0.06] dark:border-white/10 hover:border-black/15 dark:hover:border-white/20 hover:bg-black/[0.02] dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelect(item.path);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-black/25 dark:border-white/25 text-[#007AFF] focus:ring-[#007AFF] bg-white dark:bg-black/50 h-4 w-4 cursor-pointer accent-[#007AFF]"
                        />

                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                          style={{ backgroundColor: `${item.color || '#007AFF'}20` }}
                        >
                          <Bot className="h-4 w-4" style={{ color: item.color }} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">
                              {item.name}
                            </span>
                            {isChecked && (
                              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-medium">
                                <Check className="h-3 w-3" /> Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-md mt-0.5">
                            {item.path}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0 ml-2">
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/10 border border-black/[0.06] dark:border-white/10 text-slate-700 dark:text-slate-300">
                          {item.count} skills
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReveal(item.path);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                          title="Reveal in Finder or Copy Path"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : viewMode === 'folder' ? (
            // PROJECT REPOSITORIES TAB - FOLDER GROUPED VIEW
            projectGroups.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                {searchQuery ? 'No project repositories match your search.' : 'No project repositories found.'}
              </div>
            ) : (
              <div className="space-y-3">
                {projectGroups.map((group) => {
                  const isExpanded = expandedFolders.has(group.projectRoot);
                  const selectedCount = group.items.filter(i => selectedTools.has(i.path)).length;
                  const totalItems = group.items.length;
                  const isAllSelected = totalItems > 0 && selectedCount === totalItems;
                  const isIndeterminate = selectedCount > 0 && selectedCount < totalItems;

                  return (
                    <div
                      key={group.projectRoot}
                      className="rounded-xl border border-black/10 dark:border-white/12 bg-white/70 dark:bg-white/[0.04] shadow-2xs overflow-hidden transition-all"
                    >
                      {/* Project Folder Header Card */}
                      <div
                        onClick={() => toggleFolderExpanded(group.projectRoot)}
                        className="flex items-center justify-between p-3 bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Folder Tri-state Checkbox */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-center"
                          >
                            <TriStateCheckbox
                              checked={isAllSelected}
                              indeterminate={isIndeterminate}
                              onChange={() => toggleFolderSelection(group.items)}
                              title={
                                isAllSelected 
                                  ? 'Deselect all locations in this project' 
                                  : 'Select all locations in this project'
                              }
                            />
                          </div>

                          {/* Folder Icon */}
                          <div className="h-8 w-8 rounded-lg bg-[#AF52DE]/15 text-[#AF52DE] flex items-center justify-center flex-shrink-0 shadow-2xs">
                            <Folder className="h-4 w-4 fill-[#AF52DE]/20" />
                          </div>

                          {/* Project Name and Root Path */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                                {group.projectName}
                              </span>
                              {selectedCount > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium border ${
                                  isAllSelected
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-[#007AFF]/10 text-[#007AFF] dark:text-[#007AFF] border-[#007AFF]/25'
                                }`}>
                                  {selectedCount}/{totalItems} active
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-sm sm:max-w-md mt-0.5">
                              {group.projectRoot}
                            </p>
                          </div>
                        </div>

                        {/* Right: Counts, Finder, and Expand Chevron */}
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/10 text-slate-600 dark:text-slate-300">
                            {totalItems} {totalItems === 1 ? 'folder' : 'folders'} · {group.totalSkills} skills
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReveal(group.projectRoot);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            title="Reveal Project Directory in Finder"
                          >
                            <FolderOpen className="h-3.5 w-3.5" />
                          </button>

                          <div className="p-1 text-slate-400">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Sub-locations */}
                      {isExpanded && (
                        <div className="border-t border-black/[0.06] dark:border-white/8 divide-y divide-black/[0.04] dark:divide-white/5 bg-white/40 dark:bg-black/20">
                          {group.items.map((subItem) => {
                            const isChecked = selectedTools.has(subItem.path);

                            return (
                              <div
                                key={subItem.path}
                                onClick={() => toggleSelect(subItem.path)}
                                className={`flex items-center justify-between py-2 px-3 sm:px-4 pl-9 sm:pl-11 transition-colors cursor-pointer ${
                                  isChecked
                                    ? 'bg-[#007AFF]/5 dark:bg-[#007AFF]/10'
                                    : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      toggleSelect(subItem.path);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="rounded border-black/25 dark:border-white/25 text-[#007AFF] focus:ring-[#007AFF] bg-white dark:bg-black/50 h-3.5 w-3.5 cursor-pointer accent-[#007AFF]"
                                  />

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs text-slate-800 dark:text-slate-200 font-medium truncate">
                                        {subItem.relPath}
                                      </span>
                                      {isChecked && (
                                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20 font-medium">
                                          Active
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] font-mono text-slate-400 truncate max-w-sm mt-0.5">
                                      {subItem.path}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/[0.03] dark:bg-white/10 text-slate-500 dark:text-slate-400">
                                    {subItem.count} skills
                                  </span>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReveal(subItem.path);
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                    title="Reveal in Finder or Copy Path"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            // PROJECT REPOSITORIES TAB - FLAT LIST VIEW
            filteredFlatProjects.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                {searchQuery ? 'No project repositories match your search.' : 'No project repositories found.'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFlatProjects.map((item) => {
                  const isChecked = selectedTools.has(item.path);
                  const info = resolveProjectInfo(item);

                  return (
                    <div
                      key={item.path}
                      onClick={() => toggleSelect(item.path)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-[#007AFF]/5 border-[#007AFF]/40 dark:border-[#007AFF]/50 shadow-2xs'
                          : 'bg-white/70 dark:bg-white/5 border-black/[0.06] dark:border-white/10 hover:border-black/15 dark:hover:border-white/20 hover:bg-black/[0.02] dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelect(item.path);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-black/25 dark:border-white/25 text-[#007AFF] focus:ring-[#007AFF] bg-white dark:bg-black/50 h-4 w-4 cursor-pointer accent-[#007AFF]"
                        />

                        <div className="h-8 w-8 rounded-lg bg-[#AF52DE]/15 text-[#AF52DE] flex items-center justify-center flex-shrink-0">
                          <Folder className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">
                              {info.projectName} <span className="font-normal text-slate-500">({info.relPath})</span>
                            </span>
                            {isChecked && (
                              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-medium">
                                <Check className="h-3 w-3" /> Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-md mt-0.5">
                            {item.path}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0 ml-2">
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/10 border border-black/[0.06] dark:border-white/10 text-slate-700 dark:text-slate-300">
                          {item.count} skills
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReveal(item.path);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                          title="Reveal in Finder or Copy Path"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between text-xs">
          <div className="text-slate-500 text-[11px]">
            <strong className="text-[#007AFF] font-mono">{selectedTools.size}</strong> locations active in SkillDesk
            {activeTab === 'projects' && projectGroups.length > 0 && (
              <span className="text-slate-400 ml-1">
                across {projectGroups.filter(g => g.items.some(i => selectedTools.has(i.path))).length} projects
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066d6] text-white font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{saving ? 'Saving...' : 'Apply Selection'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
