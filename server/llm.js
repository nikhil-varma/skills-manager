/**
 * SkillDesk LLM Service
 * Handles provider connections (OpenAI, Anthropic, Gemini, Ollama, Custom OpenAI-compatible)
 * and enforces strict skills-only domain scoping.
 */

function resolveEndpointUrl(rawUrl) {
  let url = (rawUrl || '').trim();
  // If running inside Docker container, map localhost / 127.0.0.1 to host.docker.internal
  const isInDocker = process.platform !== 'darwin' || Boolean(process.env.HOST_HOME);
  if (isInDocker) {
    url = url.replace(/^http:\/\/localhost(?=[:/]|$)/i, 'http://host.docker.internal');
    url = url.replace(/^http:\/\/127\.0\.0\.1(?=[:/]|$)/i, 'http://host.docker.internal');
  }
  return url;
}

export async function callLLM({ messages, config, systemPrompt, timeoutMs = 45000 }) {
  const provider = config.provider || 'openai';
  const apiKey = (config.apiKey || '').trim();
  const model = (config.model || '').trim();
  const temperature = typeof config.temperature === 'number' ? config.temperature : 0.2;

  try {
    // 1. Anthropic Claude API
    if (provider === 'anthropic') {
      if (!apiKey) throw new Error('Anthropic API key is required');
      let rawBase = config.baseUrl || 'https://api.anthropic.com/v1';
      let baseUrl = resolveEndpointUrl(rawBase).replace(/\/+$/, '');
      const url = baseUrl.endsWith('/messages') ? baseUrl : `${baseUrl}/messages`;

      const anthropicMessages = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-20241022',
          system: systemPrompt,
          messages: anthropicMessages,
          max_tokens: 1800,
          temperature
        }),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!res.ok) {
        const errText = await res.text();
        let msg = errText;
        try {
          const parsed = JSON.parse(errText);
          msg = parsed.error?.message || errText;
        } catch (e) {}
        throw new Error(`Anthropic error (${res.status}): ${msg}`);
      }

      const data = await res.json();
      return data.content?.map(c => c.text || '').join('\n') || '';
    }

    // 2. Google Gemini API
    if (provider === 'gemini') {
      if (!apiKey) throw new Error('Google Gemini API key is required');

      let rawBase = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai';
      let baseUrl = resolveEndpointUrl(rawBase).replace(/\/+$/, '');
      const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.filter(m => m.role === 'user' || m.role === 'assistant')
      ];

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'gemini-1.5-flash',
          messages: chatMessages,
          temperature
        }),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!res.ok) {
        const errText = await res.text();
        let msg = errText;
        try {
          const parsed = JSON.parse(errText);
          msg = parsed.error?.message || errText;
        } catch (e) {}
        throw new Error(`Gemini error (${res.status}): ${msg}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }

    // 3. Ollama (local) or OpenAI or Custom OpenAI-Compatible (OpenRouter, Groq, LMStudio, vLLM, DeepSeek)
    let defaultBaseUrl = 'https://api.openai.com/v1';
    let defaultModel = 'gpt-4o-mini';

    if (provider === 'ollama') {
      defaultBaseUrl = 'http://localhost:11434/v1';
      defaultModel = 'llama3.2';
    }

    let rawBase = config.baseUrl || defaultBaseUrl;
    let baseUrl = resolveEndpointUrl(rawBase).replace(/\/+$/, '');
    const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter(m => m.role === 'user' || m.role === 'assistant')
    ];

    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (provider !== 'ollama' && !baseUrl.includes('localhost') && !baseUrl.includes('host.docker.internal')) {
      throw new Error(`API Key is required for provider "${provider}"`);
    }

    const isReasoning = (model || '').startsWith('o1') || (model || '').startsWith('o3');
    const reqBody = {
      model: model || defaultModel,
      messages: chatMessages
    };

    if (!isReasoning) {
      reqBody.temperature = temperature;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(reqBody),
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = errText;
      try {
        const parsed = JSON.parse(errText);
        msg = parsed.error?.message || parsed.message || errText;
      } catch (e) {}
      throw new Error(`LLM provider error (${res.status}): ${msg}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (err) {
    const causeStr = `${err.message || ''} ${err.cause?.message || ''} ${err.cause?.code || ''}`;
    if (err.name === 'TimeoutError' || err.name === 'AbortError' || causeStr.includes('aborted') || causeStr.includes('timeout')) {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s. Please check if endpoint (${config.baseUrl}) is reachable.`);
    }
    if (causeStr.includes('ECONNREFUSED')) {
      throw new Error(`Connection refused to ${config.baseUrl || 'endpoint'}. Please ensure the service is running.`);
    }
    if (err.cause?.message) {
      throw new Error(`${err.message}: ${err.cause.message}`);
    }
    throw err;
  }
}

export async function testLLMConnection(config) {
  try {
    const testMessages = [{ role: 'user', content: 'Say "Connection successful!" in 3 words.' }];
    const reply = await callLLM({
      messages: testMessages,
      config,
      systemPrompt: 'You are a connection test responder. Reply with 3 words.',
      timeoutMs: 10000 // 10 second timeout for connection test
    });
    return { success: true, reply: (reply || 'Connection verified').trim() };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function chatWithSkills({ messages, skills = [], config }) {
  if (!config) {
    throw new Error('LLM provider is not configured. Please open Settings and configure your AI Provider.');
  }

  const isLocal = config.provider === 'ollama' || config.baseUrl?.includes('localhost') || config.baseUrl?.includes('127.0.0.1');
  if (!isLocal && !config.apiKey) {
    throw new Error(`API key is required for ${config.provider || 'custom'}. Open Settings to enter your key.`);
  }

  // Format skills catalog concisely into compact knowledge entries
  const catalogLines = skills.map((s, idx) => {
    const installedIn = Object.entries(s.platforms || {})
      .filter(([_, st]) => st.installed)
      .map(([id, st]) => `${id}${st.isSymlink ? ' (symlink)' : ''}`)
      .join(', ');

    const desc = s.description ? s.description.replace(/\s+/g, ' ').slice(0, 240) : 'No description';
    return `${idx + 1}. [${s.name}]: ${desc} | Installed on: [${installedIn || 'none'}]`;
  });

  const systemPrompt = `You are SkillDesk AI, an expert agent skills assistant built directly into the SkillDesk macOS application.
Your EXCLUSIVE PURPOSE is to help the user discover, search, compare, and find the most useful agent skills from their local catalog.

==================================================
CRITICAL DOMAIN SCOPE RULES - STRICTLY ENFORCED:
==================================================
1. STRICTLY SCOPED TO AGENT SKILLS: You may ONLY answer questions about discovering, searching, recommending, comparing, explaining, or linking skills from the user's SkillDesk catalog.
2. REFUSE OUT-OF-SCOPE QUERIES: If the user asks general programming questions (e.g. "Write Python code to reverse a linked list"), general trivia ("Who was the 16th president?"), creative writing ("Tell me a story"), system administration, math, or anything outside of their agent skills, YOU MUST POLITELY REFUSE AND RE-DIRECT:
   "I am your SkillDesk AI Assistant, specialized solely in discovering, comparing, and recommending skills from your SkillDesk catalog. How can I help you find or manage skills for your workflow?"
3. RECOMMENDATION CRITERIA:
   - When a user asks what skill is best for a given task (e.g. "Which skill should I use for database migrations?", "What's best for PR review?"):
     a) Analyze their query against the user's ${skills.length} available skills listed below.
     b) Identify the single MOST useful skill for their specific requirement and clearly explain WHY it is the top recommendation.
     c) Mention any runner-up or complementary skills if relevant.
     d) ALWAYS format skill names inside square brackets like [skill-name] (e.g. [benchcoding], [qdrant-docs]). This enables interactive one-click inspection in the UI.
     e) State where the skill is currently installed (e.g. Claude Code, Cursor, OpenCode, Shared Hub), and remind the user they can symlink it to other assistants with one click.
     f) If no skill in their local catalog matches what they want, state clearly: "I couldn't find a skill matching that in your catalog," and suggest creating a new skill or what instructions it should contain.
4. TONE & STYLE: Direct, concise, structured, helpful, and developer-friendly. Use bullet points and bold text where helpful.

==================================================
USER'S SKILLDESK CATALOG (${skills.length} skills total):
==================================================
${catalogLines.join('\n')}
`;

  const assistantReply = await callLLM({
    messages,
    config,
    systemPrompt,
    timeoutMs: 40000
  });

  // Extract mentioned skills to render interactive quick chips
  const mentionedSkills = [];
  const seenSkillNames = new Set();

  for (const s of skills) {
    const bracketPattern = `[${s.name}]`;
    const tickPattern = `\`${s.name}\``;
    const wordPattern = new RegExp(`\\b${s.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');

    if (
      assistantReply.includes(bracketPattern) || 
      assistantReply.includes(tickPattern) || 
      (s.name.length >= 5 && wordPattern.test(assistantReply))
    ) {
      if (!seenSkillNames.has(s.name)) {
        seenSkillNames.add(s.name);
        mentionedSkills.push({
          name: s.name,
          displayName: s.displayName || s.name,
          description: s.description || ''
        });
      }
    }
  }

  return {
    role: 'assistant',
    content: assistantReply,
    mentionedSkills
  };
}
