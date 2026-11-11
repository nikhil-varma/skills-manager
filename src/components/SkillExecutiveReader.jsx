import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  Terminal, 
  Check, 
  Copy, 
  Search, 
  BookOpen, 
  Code, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Zap, 
  FlaskConical, 
  Layers, 
  ListChecks, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Hash,
  Eye,
  Type
} from 'lucide-react';

/**
 * Structural Skill Parser
 * Deconstructs raw markdown into semantic sections for human readability
 */
function parseSkillStructure(rawMarkdown, metadata = {}) {
  if (!rawMarkdown) {
    return {
      summary: metadata.description || 'No description provided',
      triggers: [],
      dos: [],
      donts: [],
      steps: [],
      examples: [],
      tools: metadata.tools || [],
      sections: []
    };
  }

  // Strip YAML frontmatter
  const cleanBody = rawMarkdown.replace(/^---[\s\S]*?---\s*/m, '').trim();

  // Split into markdown heading sections
  const lines = cleanBody.split('\n');
  const sections = [];
  let currentSec = { title: 'Overview', level: 1, lines: [] };

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      if (currentSec.lines.length > 0) {
        sections.push({ ...currentSec, text: currentSec.lines.join('\n').trim() });
      }
      currentSec = {
        title: match[2].trim(),
        level: match[1].length,
        lines: []
      };
    } else {
      currentSec.lines.push(line);
    }
  }
  if (currentSec.lines.length > 0) {
    sections.push({ ...currentSec, text: currentSec.lines.join('\n').trim() });
  }

  // Extract Triggers / When to use
  const triggerSec = sections.find(s => 
    /when\s+to\s+use|triggers|activation|usage|context|scenarios/i.test(s.title)
  );
  const triggers = [];
  if (triggerSec) {
    const bulletMatches = triggerSec.text.match(/^[-*]\s+(.+)$/gm);
    if (bulletMatches) {
      bulletMatches.forEach(b => triggers.push(b.replace(/^[-*]\s+/, '').trim()));
    } else if (triggerSec.text) {
      triggers.push(triggerSec.text);
    }
  }

  // Extract Dos and Don'ts / Guardrails
  const dos = [];
  const donts = [];

  for (const sec of sections) {
    const t = sec.title.toLowerCase();
    const isRules = /rules|requirements|guidelines|guardrails|standards|best practices/i.test(t);
    const isDonts = /restrictions|never|don'?ts|prohibited|anti-patterns|limitations/i.test(t);

    if (isDonts) {
      const bullets = sec.text.match(/^[-*]\s+(.+)$/gm) || [];
      bullets.forEach(b => donts.push(b.replace(/^[-*]\s+/, '').trim()));
    } else if (isRules) {
      const lines = sec.text.split('\n');
      for (const line of lines) {
        const clean = line.replace(/^[-*]\s+/, '').trim();
        if (/never|do not|don't|must not|prohibited|avoid/i.test(clean)) {
          donts.push(clean);
        } else if (/always|must|should|ensure|require|verify|use/i.test(clean) && clean.length > 10) {
          dos.push(clean);
        }
      }
    }
  }

  // Extract Workflow Steps
  const workflowSec = sections.find(s => 
    /workflow|process|steps|execution|procedure/i.test(s.title)
  );
  const steps = [];
  if (workflowSec) {
    const stepMatches = workflowSec.text.split(/(?:^|\n)(?=\d+\.\s+|###?\s+Step\s+\d+)/i);
    for (const rawStep of stepMatches) {
      const s = rawStep.trim();
      if (!s) continue;
      const firstLine = s.split('\n')[0].replace(/^\d+\.\s+|###?\s+Step\s+\d+[:\s]*/i, '').trim();
      const body = s.split('\n').slice(1).join('\n').trim();
      if (firstLine) {
        steps.push({ title: firstLine, body });
      }
    }
  }

  // Extract Examples
  const exampleSecs = sections.filter(s => /example|sample|scenario/i.test(s.title));
  const examples = [];
  for (const exSec of exampleSecs) {
    const codeBlocks = exSec.text.match(/```[\s\S]*?```/g) || [];
    examples.push({
      title: exSec.title,
      text: exSec.text.replace(/```[\s\S]*?```/g, '').trim(),
      code: codeBlocks[0] ? codeBlocks[0].replace(/```[a-z]*\n|```$/g, '').trim() : null
    });
  }

  // Extract Tools/CLI dependencies mentioned
  const toolSet = new Set(metadata.tools || []);
  const commonCLIs = ['git', 'docker', 'bun', 'npm', 'cargo', 'curl', 'bash', 'python', 'psql', 'gh', 'kubectl'];
  for (const cli of commonCLIs) {
    if (new RegExp(`\`${cli}\`|\\b${cli}\\s+`, 'i').test(cleanBody)) {
      toolSet.add(cli);
    }
  }

  // Summary
  const summary = metadata.description || (sections[0]?.text.split('\n')[0]) || 'AI agent capability module';

  return {
    summary,
    triggers,
    dos: dos.slice(0, 8),
    donts: donts.slice(0, 8),
    steps: steps.slice(0, 8),
    examples: examples.slice(0, 4),
    tools: Array.from(toolSet),
    sections: sections.map(s => ({
      title: s.title,
      level: s.level,
      preview: s.text.slice(0, 140)
    })),
    rawBody: cleanBody
  };
}

export default function SkillExecutiveReader({
  skillName,
  detail = {},
  rawMarkdown = '',
  onRunInSandbox
}) {
  const [viewMode, setViewMode] = useState('executive'); // 'executive' | 'classic' | 'raw'
  const [fontSize, setFontSize] = useState('normal'); // 'normal' | 'large'
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedSections, setExpandedSections] = useState(new Set([0, 1]));

  const contentToParse = rawMarkdown || detail.markdownBody || detail.rawContent || '';

  const parsed = useMemo(() => {
    return parseSkillStructure(contentToParse, {
      description: detail.description || detail.frontmatter?.description,
      tools: detail.frontmatter?.metadata?.tools || detail.frontmatter?.tools || []
    });
  }, [contentToParse, detail]);

  const handleCopyCommand = async (cmd) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(cmd);
      }
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    } catch (e) {}
  };

  const toggleSection = (idx) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* View Switcher Header Bar (Executive Reader / Classic Doc / Raw Source) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
        
        {/* Segmented Mode Selector */}
        <div className="p-1 rounded-xl bg-black/[0.04] dark:bg-black/40 border border-black/[0.06] dark:border-white/10 inline-flex gap-1">
          <button
            type="button"
            onClick={() => setViewMode('executive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'executive'
                ? 'bg-white dark:bg-white/15 text-[#007AFF] dark:text-[#0A84FF] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Executive Reader</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('classic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'classic'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Classic Document</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'raw'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            <span>Raw Source</span>
          </button>
        </div>

        {/* Right Utility: Font Size & Quick Copy */}
        <div className="flex items-center gap-2">
          {viewMode === 'classic' && (
            <button
              type="button"
              onClick={() => setFontSize(f => f === 'normal' ? 'large' : 'normal')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-black/[0.06] dark:border-white/10 bg-white/60 dark:bg-black/20 text-xs text-slate-600 dark:text-slate-300 hover:bg-black/[0.04]"
              title="Toggle reading font size"
            >
              <Type className="h-3.5 w-3.5" />
              <span>{fontSize === 'normal' ? '14px' : '16px'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleCopyCommand(`/${skillName}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#0A84FF] border border-[#007AFF]/25 text-xs font-mono font-semibold transition-all active:scale-95"
            title="Copy slash command for chat"
          >
            {copiedCmd ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-500">Copied!</span>
              </>
            ) : (
              <>
                <Terminal className="h-3.5 w-3.5" />
                <span>/{skillName}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. EXECUTIVE READER MODE (BENTO GRID ANATOMY)            */}
      {/* ======================================================== */}
      {viewMode === 'executive' && (
        <div className="space-y-4 animate-fade-in">

          {/* Top Hero: TL;DR Summary & Quick Badges */}
          <div className="p-4 sm:p-5 rounded-2xl border border-[#007AFF]/20 bg-gradient-to-br from-[#007AFF]/[0.04] to-transparent dark:from-[#007AFF]/[0.08] space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#007AFF] dark:text-[#0A84FF] flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Executive Purpose
                </span>
                <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                  {parsed.summary}
                </p>
              </div>

              {detail.specValidation?.isValid && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Spec Compliant
                </span>
              )}
            </div>

            {/* Capability Touchpoints */}
            {parsed.tools.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-black/[0.04] dark:border-white/5">
                <span className="text-[10px] text-slate-400 font-medium">Tools & CLIs:</span>
                {parsed.tools.map(tool => (
                  <span
                    key={tool}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-black/[0.06] dark:border-white/10"
                  >
                    `{tool}`
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Triggers: When To Use Card */}
          {parsed.triggers.length > 0 && (
            <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.03] space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
                <Zap className="h-4 w-4 fill-indigo-400" />
                <span>When to Invoke This Skill (Activation Criteria)</span>
              </div>
              <ul className="space-y-1.5">
                {parsed.triggers.map((trig, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                    <span>{trig}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Guardrails Matrix: Dos and Don'ts */}
          {(parsed.dos.length > 0 || parsed.donts.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Strict DOs */}
              {parsed.dos.length > 0 && (
                <div className="p-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.03] space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Strict Requirements & Dos</span>
                  </div>
                  <ul className="space-y-1.5">
                    {parsed.dos.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Strict DON'Ts */}
              {parsed.donts.length > 0 && (
                <div className="p-4 rounded-2xl border border-rose-500/25 bg-rose-500/[0.03] space-y-2.5">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-xs">
                    <ShieldAlert className="h-4 w-4" />
                    <span>Prohibited Actions & Don'ts</span>
                  </div>
                  <ul className="space-y-1.5">
                    {parsed.donts.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <span className="text-rose-500 font-bold mt-0.5 flex-shrink-0">✕</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Workflow Stepper Timeline */}
          {parsed.steps.length > 0 && (
            <div className="p-4 rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white/50 dark:bg-black/20 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-xs text-slate-800 dark:text-slate-200">
                <ListChecks className="h-4 w-4 text-[#007AFF]" />
                <span>Execution Workflow ({parsed.steps.length} Steps)</span>
              </div>
              <div className="space-y-2.5 relative pl-2 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-black/[0.06] dark:before:bg-white/10">
                {parsed.steps.map((st, idx) => (
                  <div key={idx} className="flex items-start gap-3 relative">
                    <div className="h-5 w-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 shadow-xs z-10">
                      {idx + 1}
                    </div>
                    <div className="flex-1 p-2.5 rounded-xl border border-black/[0.06] dark:border-white/10 bg-white dark:bg-black/40 text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {st.title}
                      </span>
                      {st.body && (
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-[11px] leading-relaxed">
                          {st.body}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Example Scenarios Walkthrough with Sandbox Trigger */}
          {parsed.examples.length > 0 && (
            <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.02] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-xs text-amber-700 dark:text-amber-300">
                  <Terminal className="h-4 w-4" />
                  <span>Example Scenarios</span>
                </div>
                {onRunInSandbox && (
                  <span className="text-[10px] text-slate-400">
                    Click "Test in Sandbox" to run directly
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                {parsed.examples.map((ex, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-black/[0.06] dark:border-white/10 bg-white dark:bg-black/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {ex.title}
                      </span>
                      {onRunInSandbox && (
                        <button
                          type="button"
                          onClick={() => onRunInSandbox(ex.text || ex.code || `Test ${ex.title}`)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <FlaskConical className="h-3 w-3" />
                          <span>Test in Sandbox</span>
                        </button>
                      )}
                    </div>
                    {ex.text && (
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        {ex.text}
                      </p>
                    )}
                    {ex.code && (
                      <pre className="p-2.5 rounded-lg bg-black/[0.04] dark:bg-black/60 font-mono text-[11px] text-slate-800 dark:text-slate-200 overflow-x-auto">
                        <code>{ex.code}</code>
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Markdown Reference (Expandable Accordion) */}
          <div className="border border-black/[0.06] dark:border-white/10 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('all-doc')}
              className="w-full flex items-center justify-between p-3.5 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                <span>Complete Reference Document</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expandedSections.has('all-doc') ? 'rotate-180' : ''}`} />
            </button>
            {expandedSections.has('all-doc') && (
              <div className="p-5 border-t border-black/[0.06] dark:border-white/10 prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {parsed.rawBody}
                </ReactMarkdown>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CLASSIC MARKDOWN DOCUMENT MODE                        */}
      {/* ======================================================== */}
      {viewMode === 'classic' && (
        <div className="flex flex-col lg:flex-row gap-6 animate-fade-in">
          {/* Table of Contents Rail */}
          {parsed.sections.length > 2 && (
            <div className="w-full lg:w-56 flex-shrink-0 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block px-1">
                Table of Contents
              </span>
              <nav className="space-y-1 text-xs">
                {parsed.sections.map((sec, idx) => (
                  <a
                    key={idx}
                    href={`#sec-${idx}`}
                    className={`block px-2.5 py-1.5 rounded-lg transition-colors truncate text-slate-600 dark:text-slate-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[#007AFF] ${
                      sec.level === 3 ? 'pl-5 text-[11px]' : 'font-medium'
                    }`}
                  >
                    {sec.title}
                  </a>
                ))}
              </nav>
            </div>
          )}

          {/* Formatted Markdown Body with Typography Scaling */}
          <div className={`flex-1 min-w-0 prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 ${
            fontSize === 'large' ? 'prose-base' : 'prose-sm'
          }`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {parsed.rawBody}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. RAW SOURCE MODE                                       */}
      {/* ======================================================== */}
      {viewMode === 'raw' && (
        <div className="relative rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#12141a] overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-2 border-b border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-xs font-mono text-slate-500">
            <span>SKILL.md (Raw Markdown)</span>
            <button
              type="button"
              onClick={() => handleCopyCommand(contentToParse)}
              className="flex items-center gap-1 text-[11px] text-[#007AFF] hover:underline"
            >
              <Copy className="h-3 w-3" />
              <span>Copy Raw</span>
            </button>
          </div>
          <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed max-h-[60vh]">
            <code>{contentToParse}</code>
          </pre>
        </div>
      )}

    </div>
  );
}
