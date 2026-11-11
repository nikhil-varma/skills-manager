import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Folder, 
  Save, 
  Sparkles, 
  Bot, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Cpu, 
  Server,
  Zap
} from 'lucide-react';
import { updatePlatforms, fetchLLMConfig, saveLLMConfig, testLLMConnection } from '../api.js';

const PROVIDER_PRESETS = [
  {
    id: 'custom',
    name: 'Custom (LMStudio / OpenAI-Compatible)',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    models: ['local-model', 'deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct', 'qwen2.5-coder'],
    needsKey: false,
    keyPlaceholder: 'Optional (e.g. for OpenRouter, Groq, or vLLM)',
    badge: 'LMStudio, Groq, vLLM'
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'qwen2.5-coder', 'mistral', 'deepseek-r1'],
    needsKey: false,
    keyPlaceholder: 'Not needed for local Ollama',
    badge: 'Offline / Private'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'o3-mini', 'o1'],
    needsKey: true,
    keyPlaceholder: 'sk-...',
    badge: 'Popular'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    needsKey: true,
    keyPlaceholder: 'AIzaSy...',
    badge: 'Fast & Free Tier'
  }
];

export default function SettingsModal({
  platforms,
  onClose,
  onSuccess,
  showToast,
  initialTab = 'locations'
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'locations' | 'ai'

  // Locations State
  const [platformList, setPlatformList] = useState(
    platforms.map(p => ({
      id: p.id,
      name: p.name,
      badge: p.badge || p.name,
      path: p.path,
      color: p.color || '#6366F1',
      icon: p.icon || 'Folder',
      description: p.description || ''
    }))
  );
  const [newPlatformName, setNewPlatformName] = useState('');
  const [newPlatformPath, setNewPlatformPath] = useState('');

  // AI LLM Config State
  const [llmConfig, setLlmConfig] = useState({
    provider: 'custom',
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    model: 'local-model',
    temperature: 0.2
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await fetchLLMConfig();
      if (cfg) {
        setLlmConfig(cfg);
      }
    } catch (err) {
      console.warn('Could not load LLM config:', err);
    }
  };

  const handleProviderSelect = (preset) => {
    setLlmConfig(prev => ({
      ...prev,
      provider: preset.id,
      baseUrl: preset.baseUrl,
      model: preset.defaultModel,
      apiKey: preset.needsKey ? prev.apiKey : ''
    }));
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setTestResult(null);
      const res = await testLLMConnection(llmConfig);
      setTestResult({
        success: true,
        message: res.message || 'Connection successful!'
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleAddCustom = () => {
    if (!newPlatformName.trim() || !newPlatformPath.trim()) {
      showToast('Please provide both name and directory path', 'error');
      return;
    }

    const id = newPlatformName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    setPlatformList([
      ...platformList,
      {
        id,
        name: newPlatformName.trim(),
        badge: newPlatformName.trim().slice(0, 8),
        path: newPlatformPath.trim(),
        color: '#34C759',
        icon: 'Folder',
        description: 'Custom skills folder'
      }
    ]);

    setNewPlatformName('');
    setNewPlatformPath('');
  };

  const handleRemovePlatform = (id) => {
    setPlatformList(platformList.filter(p => p.id !== id));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Save platforms
      await updatePlatforms(platformList);

      // Save LLM Config
      await saveLLMConfig(llmConfig);

      showToast('Settings saved successfully', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const currentPreset = PROVIDER_PRESETS.find(p => p.id === llmConfig.provider) || PROVIDER_PRESETS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-black/10 dark:border-white/15 bg-[#fafbfc]/95 dark:bg-[#1c1e26]/95 shadow-2xl backdrop-blur-2xl overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[92vh] sm:max-h-[85vh]">
        
        {/* Header & Tabs */}
        <div className="border-b border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">SkillDesk Settings</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">Manage tool paths and custom AI assistant configuration</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab Navigation (macOS Segmented Capsule Control) */}
          <div className="p-1 rounded-xl bg-black/[0.04] dark:bg-black/40 border border-black/[0.06] dark:border-white/10 inline-flex gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('locations')}
              className={`h-9 flex items-center gap-2 px-3.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all ${
                activeTab === 'locations'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Folder className="h-4 w-4 text-[#007AFF]" />
              <span>Assistant Locations</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/[0.05] dark:bg-white/10 text-slate-600 dark:text-slate-300 font-mono">
                {platformList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`h-9 flex items-center gap-2 px-3.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all ${
                activeTab === 'ai'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="h-4 w-4 text-[#007AFF]" />
              <span>AI Skill Assistant</span>
              {llmConfig.apiKey || llmConfig.provider === 'ollama' ? (
                <span className="h-2 w-2 rounded-full bg-[#34C759] shadow-2xs" title="Configured" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-amber-500 shadow-2xs" title="Setup needed" />
              )}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs flex-1 overflow-y-auto">
          {activeTab === 'locations' ? (
            <div className="space-y-5">
              {/* Platform paths list */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Configured Locations
                </h4>
                <div className="space-y-2">
                  {platformList.map((plat, idx) => (
                    <div
                      key={`${plat.id}-${plat.path || idx}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-black/[0.06] dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-md"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="h-3 w-3 rounded-full flex-shrink-0 shadow-2xs"
                          style={{ backgroundColor: plat.color }}
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{plat.name}</div>
                          <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">{plat.path}</div>
                        </div>
                      </div>

                      {/* Allow removing custom ones */}
                      {!['claude', 'opencode', 'cursor', 'codex', 'antigravity-builtin', 'antigravity', 'shared'].includes(plat.id) && (
                        <button
                          onClick={() => handleRemovePlatform(plat.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0"
                          title="Remove custom location"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add custom location */}
              <div className="rounded-xl border border-black/[0.06] dark:border-white/10 bg-black/[0.015] dark:bg-black/30 p-4 space-y-3">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-[#007AFF]" />
                  Add Custom Project or Tool Location
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Add any directory containing skills (e.g. <code className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded text-[#007AFF] font-mono">~/projects/app/.claude/skills</code>).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Display Name (e.g. My Repo Skills)"
                    value={newPlatformName}
                    onChange={(e) => setNewPlatformName(e.target.value)}
                    className="bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-xs focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                  />
                  <input
                    type="text"
                    placeholder="Path (e.g. ~/projects/app/.claude/skills)"
                    value={newPlatformPath}
                    onChange={(e) => setNewPlatformPath(e.target.value)}
                    className="bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCustom}
                  className="px-3.5 py-1.5 rounded-xl bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] border border-[#007AFF]/25 text-xs font-medium transition-colors"
                >
                  Add Location to List
                </button>
              </div>
            </div>
          ) : (
            /* AI LLM Settings Tab */
            <div className="space-y-5">
              <div className="rounded-xl border border-[#007AFF]/20 bg-[#007AFF]/5 p-3.5 flex items-start gap-3">
                <Bot className="h-5 w-5 text-[#007AFF] flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Custom LLM for SkillDesk Assistant
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Configure your preferred AI provider to power the slide-out Skill Assistant. It recommends the best skills directly from your local filesystem.
                  </p>
                </div>
              </div>

              {/* Provider Selection Cards */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Select Provider</label>
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                  {PROVIDER_PRESETS.map((preset) => {
                    const isSelected = llmConfig.provider === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleProviderSelect(preset)}
                        className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-[#007AFF] bg-[#007AFF]/10 text-slate-900 dark:text-white shadow-2xs ring-1 ring-[#007AFF]'
                            : 'border-black/10 dark:border-white/10 bg-white/70 hover:bg-black/5 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">{preset.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate w-full">
                          {preset.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* API Configuration */}
              <div className="space-y-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.015] dark:bg-black/30 p-4">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Base URL</label>
                  <input
                    type="text"
                    value={llmConfig.baseUrl}
                    onChange={(e) => setLlmConfig({ ...llmConfig, baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-slate-700 dark:text-slate-300">
                      API Key {currentPreset.needsKey && <span className="text-rose-500">*</span>}
                    </label>
                    {llmConfig.apiKey && (
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1"
                      >
                        {showApiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        <span>{showApiKey ? 'Hide' : 'Show'}</span>
                      </button>
                    )}
                  </div>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={llmConfig.apiKey || ''}
                    onChange={(e) => setLlmConfig({ ...llmConfig, apiKey: e.target.value })}
                    placeholder={currentPreset.keyPlaceholder}
                    className="w-full bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Model Name</label>
                  <input
                    type="text"
                    value={llmConfig.model}
                    onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                    placeholder="e.g. gpt-4o-mini or llama3.2"
                    className="w-full bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                  />
                </div>

                {/* Temperature Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-medium text-slate-700 dark:text-slate-300">Temperature</label>
                    <span className="font-mono text-slate-500 text-[11px]">{llmConfig.temperature ?? 0.2}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={llmConfig.temperature ?? 0.2}
                    onChange={(e) => setLlmConfig({ ...llmConfig, temperature: parseFloat(e.target.value) })}
                    className="w-full accent-[#007AFF] h-1.5 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
                    <span>Deterministic (0.0)</span>
                    <span>Balanced (0.5)</span>
                    <span>Creative (1.0)</span>
                  </div>
                </div>

                {/* Test Connection Button & Status */}
                <div className="pt-2 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection || (currentPreset.needsKey && !llmConfig.apiKey)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-black/5 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-black/10 dark:border-white/10 text-xs font-medium transition-all disabled:opacity-40 shadow-2xs"
                  >
                    {testingConnection ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#007AFF]" />
                        <span>Testing Connection...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        <span>Test LLM Connection</span>
                      </>
                    )}
                  </button>

                  {testResult && (
                    <div className={`flex items-center gap-1.5 text-xs ${testResult.success ? 'text-[#34C759]' : 'text-rose-500'}`}>
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      )}
                      <span className="text-[11px] truncate max-w-xs">{testResult.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between text-xs gap-2">
          <div className="text-slate-500 text-[11px] truncate">
            {activeTab === 'ai' && (
              <span className="hidden sm:inline">Scoped strictly to discover & recommend your skills</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066d6] text-white font-semibold shadow-xs transition-all disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
