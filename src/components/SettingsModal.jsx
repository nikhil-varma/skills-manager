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

  // AI LLM State
  const [llmConfig, setLlmConfig] = useState({
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.2
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAIConfig();
  }, []);

  const loadAIConfig = async () => {
    try {
      const res = await fetchLLMConfig();
      if (res.config) {
        setLlmConfig(prev => ({
          ...prev,
          ...res.config
        }));
      }
    } catch (err) {
      console.error('Failed to load AI config:', err);
    }
  };

  const handleProviderSelect = (preset) => {
    setTestResult(null);
    setLlmConfig(prev => ({
      ...prev,
      provider: preset.id,
      baseUrl: preset.baseUrl,
      model: preset.defaultModel,
      apiKey: preset.needsKey ? prev.apiKey : ''
    }));
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setTestResult(null);
      const res = await testLLMConnection(llmConfig);
      if (res.success) {
        setTestResult({
          success: true,
          message: `Connected successfully! Model responded: "${res.reply}"`
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Connection failed. Please check endpoint and API key.'
        });
      }
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
        color: '#10B981',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[85vh]">
        
        {/* Header & Tabs */}
        <div className="border-b border-white/10 bg-slate-900/90 px-6 pt-5 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-white">SkillDesk Settings</h3>
              <p className="text-xs text-slate-400">Manage tool paths and custom AI assistant configuration</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 -mb-px">
            <button
              onClick={() => setActiveTab('locations')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'locations'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Folder className="h-4 w-4" />
              <span>Assistant Locations</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 font-mono">
                {platformList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'ai'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>AI Skill Assistant (Custom LLM)</span>
              {llmConfig.apiKey || llmConfig.provider === 'ollama' ? (
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Configured" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-amber-400" title="Setup needed" />
              )}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs flex-1 overflow-y-auto">
          {activeTab === 'locations' ? (
            <div className="space-y-5">
              {/* Platform paths list */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Configured Locations
                </h4>
                <div className="space-y-2">
                  {platformList.map((plat, idx) => (
                    <div
                      key={`${plat.id}-${plat.path || idx}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/5 bg-slate-900/60"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: plat.color }}
                        />
                        <div>
                          <div className="font-semibold text-slate-200">{plat.name}</div>
                          <div className="font-mono text-[11px] text-slate-400">{plat.path}</div>
                        </div>
                      </div>

                      {/* Allow removing custom ones */}
                      {!['claude', 'opencode', 'cursor', 'codex', 'antigravity-builtin', 'antigravity', 'shared'].includes(plat.id) && (
                        <button
                          onClick={() => handleRemovePlatform(plat.id)}
                          className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
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
              <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4 space-y-3">
                <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-indigo-400" />
                  Add Custom Project or Tool Location
                </h4>
                <p className="text-[11px] text-slate-400">
                  Add any directory containing skills (e.g. <code className="bg-white/10 px-1 py-0.5 rounded text-indigo-300">~/projects/app/.claude/skills</code>).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Display Name (e.g. My Repo Skills)"
                    value={newPlatformName}
                    onChange={(e) => setNewPlatformName(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Path (e.g. ~/projects/app/.claude/skills)"
                    value={newPlatformPath}
                    onChange={(e) => setNewPlatformPath(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCustom}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 text-xs font-medium transition-colors"
                >
                  Add Location to List
                </button>
              </div>
            </div>
          ) : (
            /* AI LLM Settings Tab */
            <div className="space-y-5">
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex items-start gap-3">
                <Bot className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-slate-200">
                    Custom LLM for SkillDesk Assistant
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    Configure your preferred AI provider to power the slide-out Skill Assistant. It will search and recommend the best skills strictly from your local catalog.
                  </p>
                </div>
              </div>

              {/* Provider Selection Cards */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Select Provider</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PROVIDER_PRESETS.map((preset) => {
                    const isSelected = llmConfig.provider === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleProviderSelect(preset)}
                        className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/15 text-white shadow-sm ring-1 ring-indigo-500/50'
                            : 'border-white/5 bg-slate-900/60 text-slate-300 hover:border-white/20 hover:bg-slate-900'
                        }`}
                      >
                        <span className="font-semibold text-xs text-white">{preset.name}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 truncate w-full">
                          {preset.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Endpoint & Keys */}
              <div className="space-y-4 rounded-xl border border-white/5 bg-slate-900/40 p-4">
                {/* Base URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Base API Endpoint URL</span>
                    <span className="text-[10px] text-slate-500 font-mono">OpenAI-compatible format</span>
                  </label>
                  <input
                    type="text"
                    value={llmConfig.baseUrl || ''}
                    onChange={(e) => {
                      setTestResult(null);
                      setLlmConfig({ ...llmConfig, baseUrl: e.target.value });
                    }}
                    placeholder="http://localhost:1234/v1"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* API Key */}
                {currentPreset.needsKey && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>API Key</span>
                      <span className="text-[10px] text-slate-500">Stored locally in ~/.config/skills-manager</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={llmConfig.apiKey || ''}
                        onChange={(e) => {
                          setTestResult(null);
                          setLlmConfig({ ...llmConfig, apiKey: e.target.value });
                        }}
                        placeholder={currentPreset.keyPlaceholder}
                        className="w-full bg-slate-950 border border-white/10 rounded-lg pl-3 pr-10 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Model Name & Suggestions */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Model Name</label>
                  <input
                    type="text"
                    value={llmConfig.model || ''}
                    onChange={(e) => {
                      setTestResult(null);
                      setLlmConfig({ ...llmConfig, model: e.target.value });
                    }}
                    placeholder="e.g. gpt-4o-mini or claude-3-5-sonnet-20241022"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />

                  {/* Quick Model Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-500">Suggested:</span>
                    {currentPreset.models.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setLlmConfig({ ...llmConfig, model: m })}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
                          llmConfig.model === m
                            ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temperature */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Temperature</span>
                    <span className="font-mono text-indigo-400">{llmConfig.temperature ?? 0.2}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={llmConfig.temperature ?? 0.2}
                    onChange={(e) => setLlmConfig({ ...llmConfig, temperature: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Deterministic (0.0)</span>
                    <span>Balanced (0.5)</span>
                    <span>Creative (1.0)</span>
                  </div>
                </div>

                {/* Test Connection Button & Status */}
                <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection || (currentPreset.needsKey && !llmConfig.apiKey)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-medium transition-all disabled:opacity-40"
                  >
                    {testingConnection ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                        <span>Testing Connection...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        <span>Test LLM Connection</span>
                      </>
                    )}
                  </button>

                  {testResult && (
                    <div className={`flex items-center gap-1.5 text-xs ${testResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
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
        <div className="p-4 border-t border-white/5 bg-slate-900/60 flex items-center justify-between text-xs">
          <div className="text-slate-500 text-[11px]">
            {activeTab === 'ai' && (
              <span>Scoped strictly to discover & recommend your skills</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
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
