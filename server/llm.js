/**
 * SkillDesk LLM Service
 * Handles provider connections (Custom OpenAI-compatible like LMStudio/OpenRouter/Groq, Ollama, OpenAI, Gemini)
 * and enforces strict skills-only domain scoping.
 */

// Inside Docker, convert localhost / 127.0.0.1 to host.docker.internal so container can reach host LLMs
function resolveEndpointUrl(rawUrl) {
  let url = (rawUrl || '').trim();
  if (url && !/^https?:\/\//i.test(url)) {
    url = 'http://' + url;
  }
  const isInDocker = process.platform !== 'darwin' || Boolean(process.env.HOST_HOME);
  if (isInDocker) {
    url = url.replace(/^http:\/\/localhost(?=[:/]|$)/i, 'http://host.docker.internal');
    url = url.replace(/^http:\/\/127\.0\.0\.1(?=[:/]|$)/i, 'http://host.docker.internal');
  }
  return url;
}

// Helper to unwrap clean error messages from diverse providers (LMStudio, OpenAI, Ollama)
function formatErrorMessage(errText, status) {
  let msg = errText;
  try {
    const parsed = JSON.parse(errText);
    if (typeof parsed.error === 'string') {
      msg = parsed.error;
    } else if (parsed.error?.message) {
      msg = parsed.error.message;
    } else if (typeof parsed.message === 'string') {
      msg = parsed.message;
    }
  } catch (e) {}
  return `LLM provider error (${status}): ${msg}`;
}

export async function callLLM({ messages, config, systemPrompt, timeoutMs = 120000, signal }) {
  const provider = config.provider || 'custom';
  const apiKey = (config.apiKey || '').trim();
  const model = (config.model || '').trim();
  const temperature = typeof config.temperature === 'number' ? config.temperature : 0.2;

  // Combine timeout signal with optional external cancellation signal
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const activeSignal = signal && typeof AbortSignal.any === 'function'
    ? AbortSignal.any([timeoutSignal, signal])
    : (signal || timeoutSignal);

  // Clean and ensure conversation history strictly begins with a user turn
  const validMessages = (messages || [])
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.trim() }));

  // Strip any leading assistant turns so first turn is always from the user
  while (validMessages.length > 0 && validMessages[0].role === 'assistant') {
    validMessages.shift();
  }

  if (validMessages.length === 0) {
    validMessages.push({ role: 'user', content: 'What skills are in my catalog?' });
  }

  try {
    // 1. Google Gemini OpenAI-compatible endpoint
    if (provider === 'gemini') {
      if (!apiKey) throw new Error('Gemini API key is required');
      const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
      
      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...validMessages
      ];

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'gemini-2.0-flash',
          messages: chatMessages,
          temperature
        }),
        signal: activeSignal
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

    // 2. Custom OpenAI-Compatible (LMStudio, OpenRouter, Groq, vLLM, DeepSeek, LocalAI), Ollama, or OpenAI
    let defaultBaseUrl = 'http://localhost:1234/v1';
    let defaultModel = 'local-model';

    if (provider === 'openai') {
      defaultBaseUrl = 'https://api.openai.com/v1';
      defaultModel = 'gpt-4o-mini';
    } else if (provider === 'ollama') {
      defaultBaseUrl = 'http://localhost:11434/v1';
      defaultModel = 'llama3.2';
    }

    let rawBase = config.baseUrl || defaultBaseUrl;
    let baseUrl = resolveEndpointUrl(rawBase).replace(/\/+$/, '');
    const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...validMessages
    ];

    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (provider === 'openai') {
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

    console.log(`[callLLM] Sending fetch to ${url} (model: ${reqBody.model}, messages: ${chatMessages.length}, payload: ${JSON.stringify(reqBody).length} bytes)...`);
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(reqBody),
      signal: activeSignal
    });
    console.log(`[callLLM] Received response status: ${res.status}`);

    if (!res.ok) {
      const errText = await res.text();

      // Automatic fallback for models whose Jinja template rejects system messages or requires user first (e.g. Gemma, LMStudio models)
      if (res.status === 400 && validMessages.length > 0) {
        const mergedMessages = [
          {
            role: 'user',
            content: `[System Instructions:\n${systemPrompt}\n]\n\nUser Question:\n${validMessages[0].content}`
          },
          ...validMessages.slice(1)
        ];

        try {
          const retryRes = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: model || defaultModel,
              messages: mergedMessages,
              ...(isReasoning ? {} : { temperature })
            }),
            signal: activeSignal
          });

          if (retryRes.ok) {
            const retryData = await retryRes.json();
            const retryChoice = retryData.choices?.[0]?.message;
            return (retryChoice?.content || retryChoice?.reasoning_content || '').trim();
          } else {
            const retryErrText = await retryRes.text();
            throw new Error(formatErrorMessage(retryErrText, retryRes.status));
          }
        } catch (retryErr) {
          if (retryErr.message.startsWith('LLM provider error')) {
            throw retryErr;
          }
          // fall through to original error if network/other issue
        }
      }

      throw new Error(formatErrorMessage(errText, res.status));
    }

    console.log(`[callLLM] Awaiting res.json()...`);
    const data = await res.json();
    const choice = data.choices?.[0]?.message;
    const finalContent = (choice?.content || choice?.reasoning_content || '').trim();
    console.log(`[callLLM] Finished! Content length: ${finalContent.length} chars`);
    return finalContent;
  } catch (err) {
    const causeStr = `${err.message || ''} ${err.cause?.message || ''} ${err.cause?.code || ''}`;
    if (err.name === 'TimeoutError' || err.name === 'AbortError' || causeStr.includes('aborted') || causeStr.includes('timeout')) {
      const seconds = Math.round(timeoutMs / 1000);
      const timeDesc = seconds >= 60 ? `${Math.round(seconds / 60)} minute` : `${seconds}s`;
      throw new Error(`Request timed out after ${timeDesc}. Please check if endpoint (${config.baseUrl || 'URL'}) is reachable.`);
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
    let rawBase = config.baseUrl || 'http://localhost:1234/v1';
    let baseUrl = resolveEndpointUrl(rawBase).replace(/\/+$/, '');
    const apiKey = (config.apiKey || '').trim();

    // 1. Fast, lightweight GET /models check (returns in ~30ms without triggering model generation)
    const modelsBase = baseUrl.endsWith('/chat/completions') 
      ? baseUrl.replace(/\/chat\/completions$/, '') 
      : baseUrl;
    const modelsUrl = modelsBase.endsWith('/models') ? modelsBase : `${modelsBase}/models`;

    try {
      const modelsRes = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
        },
        signal: AbortSignal.timeout(8000)
      });

      if (modelsRes.ok) {
        const data = await modelsRes.json();
        const modelList = Array.isArray(data?.data) ? data.data.map(m => m.id) : [];
        const configuredModel = (config.model || '').trim();
        const modelFound = configuredModel && modelList.includes(configuredModel);

        let msg = 'Connected successfully!';
        if (modelFound) {
          msg += ` Model "${configuredModel}" is loaded and ready.`;
        } else if (modelList.length > 0) {
          msg += ` Detected ${modelList.length} models on server.`;
        }
        return { success: true, reply: msg, models: modelList };
      } else if (modelsRes.status === 401 || modelsRes.status === 403) {
        const errText = await modelsRes.text().catch(() => '');
        let errMsg = 'Authentication failed. Please check your API Key / Token.';
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed.error?.message || parsed.message || errMsg;
        } catch (e) {}
        return { success: false, error: `Authentication error (${modelsRes.status}): ${errMsg}` };
      }
    } catch (e) {
      // If /models is not supported by custom proxy, proceed to chat completion ping
    }

    // 2. Fallback: Fast minimal chat completion ping
    const testMessages = [{ role: 'user', content: 'Say OK' }];
    const reply = await callLLM({
      messages: testMessages,
      config,
      systemPrompt: 'Respond with OK.',
      timeoutMs: 40000
    });
    return { success: true, reply: (reply || 'Connection verified').trim() };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function chatWithSkills({ messages, skills = [], config, signal }) {
  if (!config) {
    throw new Error('LLM provider is not configured. Please open Settings and configure your AI Provider.');
  }

  const isKeyRequired = config.provider === 'openai' || config.provider === 'gemini';
  if (isKeyRequired && !config.apiKey) {
    throw new Error(`API key is required for ${config.provider}. Open Settings to enter your key.`);
  }

  // Format skills catalog concisely into compact knowledge entries
  const catalogLines = skills.map((s, idx) => {
    const installedIn = Object.entries(s.platforms || {})
      .filter(([_, st]) => st.installed)
      .map(([id, st]) => `${id}${st.isSymlink ? ' (symlink)' : ''}`)
      .join(', ');

    const desc = s.description ? s.description.replace(/\s+/g, ' ').slice(0, 200) : 'No description';
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
    timeoutMs: 120000, // 2 minutes timeout for local LLMs & reasoning models
    signal
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
