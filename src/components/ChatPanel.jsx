import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Square,
  Bot, 
  User, 
  Sparkles, 
  RotateCcw, 
  Settings as SettingsIcon, 
  ExternalLink,
  Loader2,
  HelpCircle,
  AlertCircle,
  Cpu,
  Layers,
  CheckCircle2,
  ArrowRight
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
  llmConfig
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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

  // Helper to render markdown and transform bracketed [skill-name] into interactive clickable pills
  const renderMessageContent = (content, mentionedSkills = []) => {
    return (
      <div className="prose prose-invert prose-xs max-w-none text-slate-200 leading-relaxed break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Transform text nodes to highlight [skill-name]
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            code: ({ inline, className, children }) => {
              const text = String(children).replace(/\n$/, '');
              return inline ? (
                <code className="bg-white/10 px-1 py-0.5 rounded text-indigo-300 font-mono text-[11px]">
                  {text}
                </code>
              ) : (
                <pre className="bg-slate-950 p-2.5 rounded-lg border border-white/10 my-2 overflow-x-auto text-[11px] font-mono text-slate-300">
                  <code>{text}</code>
                </pre>
              );
            },
            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
            ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-1.5">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-1.5">{children}</ol>,
            li: ({ children }) => <li className="text-slate-300 text-xs">{children}</li>,
          }}
        >
          {content}
        </ReactMarkdown>

        {/* Mentioned Skills Interactive Pills */}
        {mentionedSkills && mentionedSkills.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-400 flex items-center gap-1 mr-1">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              Skills referenced:
            </span>
            {mentionedSkills.map(s => (
              <button
                key={s.name}
                type="button"
                onClick={() => onOpenSkill && onOpenSkill(s.name)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[11px] font-medium transition-all group shadow-sm"
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
    <>
      {/* Backdrop for small screens */}
      <div 
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-out Chat Panel */}
      <aside 
        className="fixed top-0 right-0 h-full w-[450px] max-w-[95vw] z-50 bg-[#0c121e]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col text-slate-100 transition-all duration-300 animate-in slide-in-from-right"
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/90 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  SkillDesk AI
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Assistant
                  </span>
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                {isLLMConfigured ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>{llmConfig?.model || 'Configured'}</span>
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span className="text-amber-400 font-sans">Setup required</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {loading && (
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold animate-pulse transition-all shadow-sm"
                title="Stop generating response (Esc)"
              >
                <Square className="h-3 w-3 fill-current text-rose-400" />
                <span>Stop</span>
              </button>
            )}
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Reset conversation"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Configure AI Provider Settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Close Panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Not Configured Alert */}
        {!isLLMConfigured && (
          <div className="m-4 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <span>AI Provider Not Configured</span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              To chat with your skill catalog, configure a custom LLM (OpenAI, Claude, Gemini, Ollama, or custom endpoint) in settings.
            </p>
            <button
              onClick={onOpenSettings}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition-colors"
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
                {!isUser && (
                  <div className="h-7 w-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 text-indigo-300 mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`relative max-w-[85%] rounded-2xl p-3.5 shadow-sm text-xs ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-slate-900/90 border border-white/10 text-slate-200 rounded-bl-xs'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    renderMessageContent(msg.content, msg.mentionedSkills)
                  )}
                </div>

                {isUser && (
                  <div className="h-7 w-7 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center flex-shrink-0 text-slate-300 mt-0.5">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="h-7 w-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 text-indigo-300">
                <Bot className="h-4 w-4 animate-pulse" />
              </div>
              <div className="rounded-2xl p-3 bg-slate-900/90 border border-white/10 text-xs text-slate-400 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                <span>Searching your {totalSkills} skills catalog...</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Error</p>
                <p className="text-[11px] text-rose-200/80 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Welcome Card & Starter Chips (shown when no messages yet) */}
          {messages.length === 0 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="rounded-2xl p-4 bg-slate-900/80 border border-white/10 text-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Bot className="h-4 w-4 text-indigo-400" />
                  <span>Welcome to SkillDesk AI</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  I can analyze your <strong>{totalSkills} installed skills</strong>, search for the best match based on what you need, and recommend which skill is the most useful for your project.
                </p>
                <div className="pt-1 text-[11px] text-slate-400 italic">
                  Scope strictly limited to discovering and recommending skills from your catalog.
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Suggested Questions
                </span>
                <div className="flex flex-col gap-1.5">
                  {STARTER_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      className="p-2.5 text-left rounded-xl border border-white/5 bg-slate-900/60 hover:border-indigo-500/30 hover:bg-slate-900 text-slate-300 hover:text-white transition-all text-xs flex items-center justify-between group"
                    >
                      <span>{prompt}</span>
                      <ArrowRight className="h-3 w-3 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3.5 border-t border-white/10 bg-slate-900/90 space-y-2">
          {loading && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-in fade-in">
              <span className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                Evaluating skills & generating...
              </span>
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-[11px] font-semibold transition-colors shadow-sm"
              >
                <Square className="h-2.5 w-2.5 fill-current text-rose-400" />
                Stop Generating
              </button>
            </div>
          )}

          <div className="relative flex items-end rounded-xl border border-white/10 bg-slate-950/90 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all p-1.5">
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask for the best skill for your task (e.g. Which skill for DB migrations?)..."
              disabled={loading || !isLLMConfigured}
              className="flex-1 bg-transparent border-0 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none max-h-32 disabled:opacity-50"
            />
            {loading ? (
              <button
                type="button"
                onClick={handleStop}
                className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse"
                title="Stop generating response (Esc)"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || !isLLMConfigured}
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-40 disabled:hover:bg-indigo-600 flex-shrink-0"
                title="Send message (Enter)"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
            <span>Scoped strictly to your skills catalog</span>
            <span>{loading ? 'Esc to stop generation' : 'Enter to send • Shift+Enter for newline'}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
