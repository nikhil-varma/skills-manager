import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Square, 
  Sparkles, 
  RotateCcw, 
  Settings as SettingsIcon, 
  Loader2, 
  AlertCircle, 
  ArrowRight,
  ArrowUp,
  Copy,
  Check,
  Terminal,
  Compass
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendAIChat } from '../api.js';

const STARTER_PROMPTS = [
  'Which skill is best for automated testing & code quality?',
  'What skills do I have for database management or SQL?',
  'Find skills for frontend React and UI development',
  'Which skill should I use for Git workflows and PR reviews?',
  'Recommend the most useful skill for agent benchmarking'
];

export default function ChatPanel({
  isOpen,
  onClose,
  onOpenSettings,
  onOpenSkill,
  totalSkills = 0,
  isLLMConfigured = false,
  llmConfig,
  theme = 'dark'
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedSnippet, setCopiedSnippet] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
        scrollToBottom();
      }, 150);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  const handleCopyCode = async (codeText) => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopiedSnippet(codeText);
      setTimeout(() => setCopiedSnippet(null), 2000);
    } catch (e) {}
  };

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    if (!isLLMConfigured) {
      setError('Please configure your custom AI Provider in Settings before chatting.');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const newMessages = [...messages, { role: 'user', content: query }];
    setMessages(newMessages);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const res = await sendAIChat(newMessages, controller.signal);
      if (res.message) {
        setMessages([...newMessages, res.message]);
      }
    } catch (err) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: '_Generation stopped by user._',
            isStopped: true
          }
        ]);
      } else {
        setError(err.message || 'Failed to get answer from AI Assistant.');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && loading) {
      e.preventDefault();
      handleStop();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    handleStop();
    setMessages([]);
    setError(null);
  };

  // Helper to render markdown inside native macOS Sequoia Glass cards
  const renderMessageContent = (content, mentionedSkills = []) => {
    return (
      <div className="prose prose-xs max-w-none text-slate-800 dark:text-slate-200 leading-relaxed break-words font-sans">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>,
            h1: ({ children }) => <h1 className="text-sm font-bold text-slate-900 dark:text-white mt-3 mb-1.5">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xs font-bold text-slate-900 dark:text-white mt-2.5 mb-1 tracking-tight">{children}</h2>,
            h3: ({ children }) => <h3 className="text-xs font-semibold text-slate-900 dark:text-white mt-2 mb-1">{children}</h3>,
            code: ({ inline, children }) => {
              const text = String(children).replace(/\n$/, '');
              if (inline) {
                return (
                  <code className="bg-slate-200/80 dark:bg-white/10 px-1.5 py-0.5 rounded text-[#007AFF] dark:text-sky-300 font-mono text-[11px] border border-slate-300/60 dark:border-white/10">
                    {text}
                  </code>
                );
              }
              const isCopied = copiedSnippet === text;
              return (
                <div className="my-2.5 rounded-xl border border-slate-300/80 dark:border-white/10 bg-slate-900 text-slate-100 overflow-hidden shadow-xs">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 border-b border-white/5 text-[10px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-500/70" />
                      <span className="h-2 w-2 rounded-full bg-amber-500/70" />
                      <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
                      <span className="ml-1 font-mono text-[9px] text-slate-400">code snippet</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(text)}
                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors"
                      title="Copy code"
                    >
                      {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-3 overflow-x-auto text-[11px] font-mono leading-relaxed text-slate-200">
                    <code>{text}</code>
                  </pre>
                </div>
              );
            },
            strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>,
            ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-2">{children}</ol>,
            li: ({ children }) => <li className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">{children}</li>,
            table: ({ children }) => (
              <div className="overflow-x-auto my-2.5 rounded-lg border border-slate-200 dark:border-white/10">
                <table className="w-full text-left text-[11px] border-collapse bg-slate-50/50 dark:bg-black/20">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-white/10">{children}</thead>,
            th: ({ children }) => <th className="p-2 font-semibold">{children}</th>,
            td: ({ children }) => <td className="p-2 border-b border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-300">{children}</td>,
            hr: () => <hr className="my-3 border-slate-200 dark:border-white/10" />
          }}
        >
          {content}
        </ReactMarkdown>

        {/* Mentioned Skills Interactive Pills */}
        {mentionedSkills && mentionedSkills.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-white/10 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1 font-medium">
              <Sparkles className="h-3 w-3 text-[#007AFF]" />
              Matched Skills:
            </span>
            {mentionedSkills.map(s => (
              <button
                key={s.name}
                type="button"
                onClick={() => onOpenSkill && onOpenSkill(s.name)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#007AFF]/10 dark:bg-[#007AFF]/15 hover:bg-[#007AFF]/20 dark:hover:bg-[#007AFF]/25 border border-[#007AFF]/30 text-[#007AFF] dark:text-sky-300 text-[11px] font-medium transition-all group shadow-2xs"
                title={`Inspect "${s.name}" details`}
              >
                <span>⚡ {s.displayName || s.name}</span>
                <ArrowRight className="h-2.5 w-2.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <aside 
      className="w-[420px] xl:w-[460px] 2xl:w-[490px] flex-shrink-0 border-l border-slate-200/80 dark:border-white/10 bg-[#f8f9fb]/90 dark:bg-[#13161f]/85 macos-glass flex flex-col h-[calc(100vh-65px)] sticky top-[65px] z-20 text-slate-800 dark:text-slate-100 transition-all duration-300 shadow-2xl animate-in slide-in-from-right-2"
    >
      {/* macOS Sequoia Titlebar */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-white/[0.04] px-4 py-3 flex-shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Traffic Lights Controls */}
          <div className="flex items-center gap-1.5 group">
            <button 
              onClick={onClose} 
              className="h-3 w-3 rounded-full bg-[#FF5F56] border border-[#E0443E] hover:opacity-80 transition-opacity cursor-pointer" 
              title="Close Panel"
            />
            <button 
              onClick={handleClear} 
              className="h-3 w-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] hover:opacity-80 transition-opacity cursor-pointer" 
              title="Reset conversation"
            />
            <button 
              onClick={onOpenSettings} 
              className="h-3 w-3 rounded-full bg-[#27C93F] border border-[#1AAB29] hover:opacity-80 transition-opacity cursor-pointer" 
              title="Open Settings"
            />
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-white/15 mx-0.5" />

          {/* Apple Style App Badge */}
          <div className="h-7 w-7 rounded-lg bg-gradient-to-b from-slate-200 to-slate-100 dark:from-white/15 dark:to-white/5 border border-slate-300 dark:border-white/15 flex items-center justify-center text-xs font-semibold shadow-inner text-slate-700 dark:text-slate-200">
            
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                Skills Assistant
                <span className="text-[9px] font-medium px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-black/5 dark:border-white/10">
                  macOS
                </span>
              </h3>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
              {isLLMConfigured ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  <span className="truncate max-w-[130px]">{llmConfig?.model || 'Engine Active'}</span>
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                  <span className="text-amber-600 dark:text-amber-400 font-sans">Setup required</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {loading && (
            <button
              type="button"
              onClick={handleStop}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs font-semibold animate-pulse transition-all shadow-xs"
              title="Stop generating response (Esc)"
            >
              <Square className="h-3 w-3 fill-current text-rose-500" />
              <span>Stop</span>
            </button>
          )}
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
            title="Reset conversation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
            title="Configure AI Provider Settings"
          >
            <SettingsIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
            title="Close Panel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Not Configured Alert */}
      {!isLLMConfigured && (
        <div className="m-4 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
            <span>AI Provider Not Configured</span>
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-200/80 leading-relaxed">
            To chat with your skill catalog, configure your local or custom LLM endpoint in Settings.
          </p>
          <button
            onClick={onOpenSettings}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition-colors"
          >
            Configure AI Provider Now
          </button>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {/* User Bubble (macOS Blue Pill) */}
              {isUser ? (
                <div className="max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 bg-[#007AFF] text-white shadow-xs leading-relaxed font-normal text-xs whitespace-pre-wrap">
                  {msg.content}
                </div>
              ) : (
                /* Assistant Bubble (macOS Sequoia Frosted Card) */
                <div className="w-full max-w-[95%] rounded-2xl p-4 bg-white/80 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 shadow-xs backdrop-blur-md text-slate-800 dark:text-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#007AFF]" />
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        Recommendation Analysis
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      Matched
                    </span>
                  </div>

                  <div>
                    {renderMessageContent(msg.content, msg.mentionedSkills)}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="w-full max-w-[95%] rounded-2xl p-4 bg-white/80 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 shadow-xs backdrop-blur-md flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-[#007AFF]/10 border border-[#007AFF]/20 flex items-center justify-center text-[#007AFF] flex-shrink-0">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-white">Evaluating Skills Catalog</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Comparing {totalSkills} skills against your query...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-800 dark:text-rose-200">Execution Error</p>
              <p className="text-[11px] text-rose-600 dark:text-rose-200/80 mt-0.5 whitespace-pre-wrap">{error}</p>
            </div>
          </div>
        )}

        {/* Welcome Card & Starter Chips (shown when no messages yet) */}
        {messages.length === 0 && (
          <div className="space-y-4 animate-in fade-in">
            {/* macOS Sequoia Glass Welcome Banner */}
            <div className="rounded-2xl p-4 bg-white/75 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 text-slate-700 dark:text-slate-300 space-y-2.5 backdrop-blur-md shadow-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <Compass className="h-4 w-4 text-[#007AFF]" />
                <span>Skills Assistant for macOS</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Directly analyzes your <strong>{totalSkills} installed agent skills</strong>, searches for the best fit, and recommends the top skill for your current workflow.
              </p>
              <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400 italic">
                Scope strictly limited to discovering, searching, and managing your skills.
              </div>
            </div>

            {/* Suggested Starter Questions */}
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block px-1">
                Suggested Inquiries
              </span>
              <div className="flex flex-col gap-1.5">
                {STARTER_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="p-3 text-left rounded-xl border border-slate-200/80 dark:border-white/5 bg-white/60 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.06] hover:border-[#007AFF]/40 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all text-xs flex items-center justify-between group shadow-2xs"
                  >
                    <span className="pr-2 leading-relaxed">{prompt}</span>
                    <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[#007AFF] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* macOS Sequoia Spotlight-style Input Bar */}
      <div className="p-3.5 border-t border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl space-y-2 flex-shrink-0">
        {loading && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs animate-in fade-in">
            <span className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#007AFF]" />
              Thinking and generating response...
            </span>
            <button
              type="button"
              onClick={handleStop}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-200 border border-rose-500/30 text-[11px] font-semibold transition-colors shadow-xs"
            >
              <Square className="h-2.5 w-2.5 fill-current text-rose-500" />
              Stop Generation
            </button>
          </div>
        )}

        {/* Input Capsule */}
        <div className="relative flex items-end rounded-xl border border-slate-300/90 dark:border-white/15 bg-white dark:bg-black/40 shadow-xs dark:shadow-inner focus-within:ring-2 focus-within:ring-[#007AFF]/40 focus-within:border-[#007AFF] transition-all p-1.5">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for the best skill for your task (e.g. Which skill for DB migrations?)..."
            disabled={loading || !isLLMConfigured}
            className="flex-1 bg-transparent border-0 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none max-h-32 disabled:opacity-50"
          />
          {loading ? (
            <button
              type="button"
              onClick={handleStop}
              className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all flex items-center justify-center flex-shrink-0 shadow-xs animate-pulse"
              title="Stop generating response (Esc)"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || !isLLMConfigured}
              className="p-2 rounded-lg bg-[#007AFF] hover:bg-[#0062cc] text-white transition-all disabled:opacity-40 disabled:hover:bg-[#007AFF] flex-shrink-0 shadow-xs"
              title="Send message (Enter)"
            >
              <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1">
          <span>Library: {totalSkills} local skills</span>
          <span>{loading ? 'Esc to stop' : 'Return ↵ to Send • Shift+Return for newline'}</span>
        </div>
      </div>
    </aside>
  );
}
