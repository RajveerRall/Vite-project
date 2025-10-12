const express = require('express');
const cors = require('cors');
const path = require('path');
// Load .env from this server directory regardless of process.cwd()
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Switch to installed package
let Modular;
try {
  Modular = require('@your-scope/modular-tts');
} catch (e) {
  // Fallback to vendored copy if package missing
  Modular = {
    ...require('./vendor/modular-tts/dist/api.js'),
    ModularAIFactory: require('./vendor/modular-tts/dist/core/ModularAIFactory.js').ModularAIFactory,
    CastingManager: require('./vendor/modular-tts/dist/core/casting-manager.js').CastingManager,
  };
}

const app = express();
// CORS configuration to handle preflight with custom headers
const corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-User-Id', 'X-User-Email'],
};
app.use(cors(corsOptions));
// Express 5 no longer accepts '*' path patterns; handle preflight generically
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, X-User-Email');
    return res.sendStatus(204);
  }
  next();
});
// Initialize usage tracker from the package (singleton)
let getUsageTracker;
try {
  getUsageTracker = Modular.getUsageTracker || require('@your-scope/modular-tts').getUsageTracker;
} catch {}
const usageTracker = typeof getUsageTracker === 'function' ? getUsageTracker() : null;
app.use(express.json({ limit: '2mb' }));

// User authentication middleware - extract user ID from headers
app.use((req, res, next) => {
  // Priority: X-User-Id header > Authorization Bearer token > anonymous
  let userId = req.headers['x-user-id'] || req.headers['X-User-Id'];
  
  if (!userId && req.headers.authorization) {
    const token = req.headers.authorization.replace('Bearer ', '');
    userId = token || 'anonymous';
  }
  
  req.userId = userId || 'anonymous';
  req.userEmail = req.headers['x-user-email'] || req.headers['X-User-Email'] || null;
  next();
});

// Simple per-request logging
let __REQ = 0;
app.use((req, res, next) => {
  const id = ++__REQ;
  const t0 = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - t0;
    const len = res.getHeader('content-length');
    console.log(`[req ${id}] ${req.method} ${req.originalUrl} -> ${res.statusCode} ${ms}ms${len ? ` ${len}b` : ''} [user: ${req.userId}]`);
  });
  req.reqId = id;
  next();
});

function previewStr(s, max = 200) {
  if (!s || typeof s !== 'string') return '';
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? c.slice(0, max) + '…' : c;
}

const PORT = process.env.FULL_CAST_TTS_PORT || 4001;

// Build API keys from env once
const ENV_KEYS = {
  // OpenAI
  openai: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
  // Gemini
  gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.VITE_GOOGLE_GEMINI_API_KEY,
  // Cartesia (disabled in this pipeline)
  cartesia: process.env.CARTESIA_API_KEY || process.env.VITE_CARTESIA_API_KEY,
  // MsEdge (self-hosted)
  msedgeBaseUrl: process.env.MSEDGE_BASE_URL || process.env.VITE_MSEDGE_BASE_URL,
  msedgeApiKey: process.env.MSEDGE_API_KEY || process.env.VITE_MSEDGE_API_KEY,
  // Kokoro
  kokoroApiUrl: process.env.KOKORO_API_URL || process.env.VITE_KOKORO_API_URL,
  kokoroApiKey: process.env.KOKORO_API_KEY || process.env.VITE_KOKORO_API_KEY,
};

// Choose LLM (prefer Gemini)
const DEFAULT_LLM = ENV_KEYS.gemini ? 'gemini-2.0-flash' : (ENV_KEYS.openai ? 'gpt-4o' : null);

// Maintain casting memory across requests by keeping a single factory + casting manager
const { ModularAIFactory, CastingManager, Pipeline } = Modular;
const sharedFactory = new ModularAIFactory({
  openai: ENV_KEYS.openai ? { apiKey: ENV_KEYS.openai } : undefined,
  gemini: ENV_KEYS.gemini ? { apiKey: ENV_KEYS.gemini, model: 'gemini-2.0-flash' } : undefined,
  // cartesia intentionally omitted to match pipeline (no cartesia)
  msedge: ENV_KEYS.msedgeBaseUrl ? { baseUrl: ENV_KEYS.msedgeBaseUrl, apiKey: ENV_KEYS.msedgeApiKey } : undefined,
  kokoro: ENV_KEYS.kokoroApiUrl ? { apiUrl: ENV_KEYS.kokoroApiUrl, apiKey: ENV_KEYS.kokoroApiKey } : undefined,
});

// Voice pool limited to enabled providers (Kokoro, MsEdge)
const ALL_VOICES = [
  // Kokoro
  { voiceId: 'bm_george', gender: 'male', provider: 'kokoro', description: 'British Male - Narrator' },
  { voiceId: 'am_adam', gender: 'male', provider: 'kokoro', description: 'American Male - Confident' },
  { voiceId: 'am_eric', gender: 'male', provider: 'kokoro', description: 'American Male - Young' },
  { voiceId: 'bf_emma', gender: 'female', provider: 'kokoro', description: 'British Female - Mature' },
  { voiceId: 'af_heart', gender: 'female', provider: 'kokoro', description: 'American Female - Warm' },
  { voiceId: 'af_sarah', gender: 'female', provider: 'kokoro', description: 'American Female - Clear' },
  // MsEdge examples (if configured)
  { voiceId: 'en-US-BrianMultilingualNeural', gender: 'male', provider: 'msedge', description: 'Brian - Multilingual' },
  { voiceId: 'en-US-JennyMultilingualNeural', gender: 'female', provider: 'msedge', description: 'Jenny - Multilingual' },
  { voiceId: 'en-US-AriaNeural', gender: 'female', provider: 'msedge', description: 'Aria - Friendly' },
];

// Filter to only enabled providers
const VOICE_POOL = ALL_VOICES.filter(v => {
  if (v.provider === 'kokoro') return !!ENV_KEYS.kokoroApiUrl;
  if (v.provider === 'msedge') return !!ENV_KEYS.msedgeBaseUrl;
  return false;
});

console.log(`[full-cast-tts] Voice pool has ${VOICE_POOL.length} voices from enabled providers`);

// Per-user CastingManager instances for session isolation
const userCastingManagers = new Map();

// Function to get or create a CastingManager for a specific user
function getUserCastingManager(userId) {
  if (!userCastingManagers.has(userId)) {
    const castingManager = new CastingManager();
    // Manually set the voice pool to our filtered list.
    // This is the key to preventing the manager from knowing about disabled providers.
    castingManager.allVoices = VOICE_POOL;
    
    // Clear any old casting memory on creation
    if (castingManager.characterMap) {
      castingManager.characterMap = {};
    }
    if (castingManager.usedVoices) {
      castingManager.usedVoices = new Set();
    }
    
    userCastingManagers.set(userId, castingManager);
    console.log(`[full-cast-tts] Created new CastingManager for user: ${userId}`);
  }
  return userCastingManagers.get(userId);
}

console.log('[full-cast-tts] Per-user CastingManager system initialized.');


console.log('[full-cast-tts] providers:', {
  openai: !!ENV_KEYS.openai,
  gemini: !!ENV_KEYS.gemini,
  msedge: !!ENV_KEYS.msedgeBaseUrl,
  kokoro: !!ENV_KEYS.kokoroApiUrl,
  llm: DEFAULT_LLM,
});

// --- Chat thread session memory (in-memory, per-sessionId) ---
const CHAT_SESSIONS = new Map();
function getSessionHistory(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') return null;
  let history = CHAT_SESSIONS.get(sessionId);
  if (!history) {
    history = [];
    CHAT_SESSIONS.set(sessionId, history);
  }
  return history;
}

// Enhanced structuring: split quoted dialogue and narration into segments JSON
function structureTextForLLM(raw) {
  if (!raw || typeof raw !== 'string') return JSON.stringify({ segments: [] });
  
  // Clean up the text first - preserve punctuation but normalize whitespace
  const cleanText = raw
    .replace(/\n/g, ' ')           // Replace line breaks with spaces
    .replace(/\r/g, ' ')           // Replace carriage returns with spaces
    .replace(/\t/g, ' ')           // Replace tabs with spaces
    .replace(/\s+/g, ' ')          // Replace multiple spaces with single space
    .trim();
  
  // Handle straight quotes, smart quotes, and other dialogue markers
  const regex = /[""]([^""]+)[""]|"([^"]+)"/g;
  let lastIndex = 0;
  const segments = [];
  
  cleanText.replace(regex, (match, smartQuoteContent, straightQuoteContent, offset) => {
    // Add narration before this dialogue
    if (offset > lastIndex) {
      const narration = cleanText.substring(lastIndex, offset).trim();
      if (narration) {
        segments.push({ type: 'narration', content: narration });
      }
    }
    
    // Add the dialogue content
    const dialogueContent = smartQuoteContent || straightQuoteContent;
    const cleanDialogue = String(dialogueContent || '').trim();
    if (cleanDialogue) {
      segments.push({ type: 'dialogue', content: cleanDialogue });
    }
    
    lastIndex = offset + match.length;
    return match;
  });
  
  // Add any remaining narration at the end
  if (lastIndex < cleanText.length) {
    const tail = cleanText.substring(lastIndex).trim();
    if (tail) {
      segments.push({ type: 'narration', content: tail });
    }
  }
  
  // If no segments found, treat entire text as narration
  if (segments.length === 0) {
    segments.push({ type: 'narration', content: cleanText });
  }
  
  // Add explicit instructions for the LLM about dialogue attribution
  const result = {
    segments,
    instructions: "CRITICAL: Dialogue attribution phrases like 'said Sofia', 'whispered Locke', 'replied John' are NARRATION, not dialogue. Only the actual spoken words inside quotes should be dialogue. All dialogue attribution, actions, and descriptions should be assigned to 'Narrator' character."
  };
  
  return JSON.stringify(result);
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Test endpoint for text processing
app.post('/api/test-text-processing', (req, res) => {
  const { text } = req.body || {};
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }
  
  const structured = structureTextForLLM(text);
  res.json({ 
    original: text,
    structured: JSON.parse(structured),
    message: 'Text processing test completed'
  });
});

// --- Usage tracking API (if tracker available) ---
if (usageTracker) {
  app.get('/api/usage/summary', (req, res) => {
    try {
      const summary = usageTracker.getStats({ windowHours: 24 });
      res.json({ message: 'Usage summary retrieved successfully', summary });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch usage summary' });
    }
  });
  app.get('/api/usage/recent', (req, res) => {
    try {
      const limit = Math.max(1, Math.min(500, Number(req.query.limit || 100)));
      const entries = usageTracker.getRecentEntries(limit);
      res.json({ message: 'Recent usage entries retrieved successfully', count: entries.length, entries });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch recent usage' });
    }
  });
  app.get('/api/usage/by-provider', (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
      const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;
      const byProvider = usageTracker.getStatsByProvider({ startDate, endDate });
      res.json({ message: 'Usage by provider retrieved successfully', byProvider, timeRange: { start: startDate, end: endDate } });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch usage by provider' });
    }
  });
  app.get('/api/usage/by-voice', (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
      const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;
      const byVoice = usageTracker.getStatsByVoice({ startDate, endDate });
      res.json({ message: 'Usage by voice retrieved successfully', byVoice, timeRange: { start: startDate, end: endDate } });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch usage by voice' });
    }
  });
  app.get('/api/usage/export', (_req, res) => {
    try {
      const data = usageTracker.exportData();
      res.json({ message: 'Usage data exported successfully', count: data.length, data });
    } catch (e) {
      res.status(500).json({ error: 'Failed to export usage data' });
    }
  });
  app.delete('/api/usage/clear', (_req, res) => {
    try {
      usageTracker.clearData();
      res.json({ message: 'Usage data cleared successfully' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to clear usage data' });
    }
  });
}

// Body: { text: string, llm?: string, parser?: 'simple'|'intelligent'|'singleNarrator', useVoiceCasting?: boolean, apiKeys?: { openai?, gemini?, cartesia? } }
app.post('/api/full-cast-tts', async (req, res) => {
  const { text, llm, parser = 'intelligent', useVoiceCasting = true, apiKeys } = req.body || {};
  if (!text || typeof text !== 'string') {
    console.warn('[full-cast-tts] 400: text is required');
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    console.log(`[full-cast-tts] [req ${req.reqId}] textLen=${text.length} preview="${previewStr(text)}" parser=${parser} useVoiceCasting=${useVoiceCasting}`);
    // Build config and LLM chain
    const mergedKeys = {
      openai: (apiKeys && apiKeys.openai) || ENV_KEYS.openai,
      gemini: (apiKeys && apiKeys.gemini) || ENV_KEYS.gemini,
      cartesia: (apiKeys && apiKeys.cartesia) || ENV_KEYS.cartesia,
    };
    // Prefer explicit llm, else prefer OpenAI if available, else Gemini.
    // If explicit llm isn't configured, gracefully fall back to the available provider.
    let chosen = llm || (mergedKeys.openai ? 'gpt-4o' : (mergedKeys.gemini ? 'gemini-2.0-flash' : null));
    if (llm === 'gpt-4o' && !mergedKeys.openai) {
      chosen = mergedKeys.gemini ? 'gemini-2.0-flash' : null;
    } else if ((llm && llm.startsWith('gemini')) && !mergedKeys.gemini) {
      chosen = mergedKeys.openai ? 'gpt-4o' : null;
    }
    if (!chosen) {
      console.warn('[full-cast-tts] 400: no LLM configured (missing OPENAI_API_KEY / GEMINI_API_KEY)');
      return res.status(400).json({ error: 'No LLM configured. Set OPENAI_API_KEY or GEMINI_API_KEY.' });
    }

    // Get user-specific CastingManager
    const userCastingManager = getUserCastingManager(req.userId);
    
    const structured = structureTextForLLM(text);
    // Use factory chain per package docs, with intelligentCastingParser by default
    const script = await sharedFactory.createAndExecuteChain({
      llmIds: [chosen],
      parserId: parser === 'simple' ? 'simpleDialogueParser'
        : parser === 'singleNarrator' ? 'singleNarratorParser'
        : 'intelligentCastingParser',
      rawTextInput: structured,
      context: {
        CASTING_CONTEXT: JSON.stringify(userCastingManager.getCharacterMap(), null, 2),
        AVAILABLE_VOICES: userCastingManager.getAvailableVoicesForLLM ? userCastingManager.getAvailableVoicesForLLM() : undefined
      }
    });
    // Persist new voice assignments so future chunks reuse them
    try {
      const characterMap = userCastingManager.getCharacterMap();
      const assignments = [];
      for (const line of (Array.isArray(script) ? script : [])) {
        const char = (line?.character || '').trim();
        if (!char || char.toLowerCase() === 'narrator') continue;
        const provider = line?.provider;
        const voiceId = line?.voiceId;
        const gender = line?.gender || 'neutral';
        if (provider && voiceId) {
          const existing = characterMap[char]?.voice;
          if (!existing || existing.voiceId !== voiceId || existing.provider !== provider) {
            assignments.push({ character: char, provider, voiceId, gender });
          }
        }
      }
      if (assignments.length && userCastingManager.setManualAssignments) {
        userCastingManager.setManualAssignments(assignments);
      }
    } catch {}

    console.log(`[full-cast-tts] [req ${req.reqId}] pipeline done scriptLines=${(Array.isArray(script) ? script.length : 0)}`);
    res.json({ script });
  } catch (err) {
    console.error('[full-cast-tts] failed:', err);
    res.status(500).json({ error: 'Failed to process text' });
  }
});

// --- Chat-thread parser endpoint (two-step JSON-only flow with session memory) ---
// Body: { sessionId: string, text: string, llm?: string, inputChunkId?: string }
app.post('/api/chat-thread', async (req, res) => {
  const { sessionId, text, llm, inputChunkId } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }
  
  // Get user-specific CastingManager
  const userCastingManager = getUserCastingManager(req.userId);
  const userSessionId = `${req.userId}-${sessionId || 'default'}`;
  const history = getSessionHistory(userSessionId);
  
  try {
    const chosen = llm || DEFAULT_LLM;
    if (!chosen) {
      return res.status(400).json({ error: 'No LLM configured. Set OPENAI_API_KEY or GEMINI_API_KEY.' });
    }
    // Structure text minimally (reuse util) to give the LLM a stable JSON input
    const structured = structureTextForLLM(text);
    console.log(`[chat-thread] [req ${req.reqId}] Structured text for LLM:`, structured);
    const script = await sharedFactory.createAndExecuteChain({
      llmIds: [chosen],
      parserId: 'chatThreadParser',
      rawTextInput: structured,
      context: {
        chatHistory: history,
        inputChunkId: inputChunkId || `chunk-${Date.now()}`,
        CASTING_CONTEXT: JSON.stringify(userCastingManager.getCharacterMap(), null, 2),
        AVAILABLE_VOICES: userCastingManager.getAvailableVoicesForLLM ? userCastingManager.getAvailableVoicesForLLM() : undefined
      }
    });
    console.log(`[chat-thread] [req ${req.reqId}] LLM returned script:`, JSON.stringify(script, null, 2));
    // Persist any new assignments into the user's casting manager
    try {
      const characterMap = userCastingManager.getCharacterMap();
      const assignments = [];
      for (const line of (Array.isArray(script) ? script : [])) {
        const char = (line?.character || '').trim();
        if (!char || char.toLowerCase() === 'narrator') continue;
        const provider = line?.provider;
        const voiceId = line?.voiceId;
        const gender = line?.gender || 'neutral';
        if (provider && voiceId) {
          const existing = characterMap[char]?.voice;
          if (!existing || existing.voiceId !== voiceId || existing.provider !== provider) {
            assignments.push({ character: char, provider, voiceId, gender });
          }
        }
      }
      if (assignments.length && userCastingManager.setManualAssignments) {
        userCastingManager.setManualAssignments(assignments);
      }
    } catch {}
    res.json({ script, sessionId: userSessionId });
  } catch (e) {
    console.error(`[chat-thread] failed for user ${req.userId}:`, e);
    res.status(500).json({ error: 'Chat-thread parser failed' });
  }
});

// --- TTS endpoint (per-line synthesis) ---

app.post('/api/tts', async (req, res) => {
  const { provider, text, voiceId } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }
  
  // Clean up text for TTS: remove line breaks, normalize whitespace, and clean up formatting
  const cleanText = text
    .replace(/\n/g, ' ')           // Replace line breaks with spaces
    .replace(/\r/g, ' ')           // Replace carriage returns with spaces
    .replace(/\t/g, ' ')           // Replace tabs with spaces
    .replace(/\s+/g, ' ')          // Replace multiple spaces with single space
    .replace(/[""]/g, '"')         // Replace smart quotes with regular quotes
    .replace(/['']/g, "'")         // Replace smart apostrophes with regular apostrophes
    .replace(/ΓÇ£/g, '"')          // Replace specific smart quote characters
    .replace(/ΓÇ¥/g, '"')          // Replace specific smart quote characters
    .replace(/ΓÇö/g, ' - ')        // Replace em dash with regular dash
    .replace(/\b[A-Z]{2,}\b/g, (match) => {
      // Convert ALL CAPS words to Title Case, but preserve common acronyms
      const commonAcronyms = ['AI', 'API', 'URL', 'HTTP', 'HTTPS', 'JSON', 'XML', 'HTML', 'CSS', 'JS', 'TTS', 'LLM', 'GPT', 'CEO', 'USA', 'UK', 'EU', 'NASA', 'FBI', 'CIA'];
      if (commonAcronyms.includes(match)) {
        return match;
      }
      // Convert to title case
      return match.charAt(0) + match.slice(1).toLowerCase();
    })
    .trim();                       // Remove leading/trailing whitespace

  // Validate cleaned text
  if (!cleanText || cleanText.length === 0) {
    console.warn(`[tts] [req ${req.reqId}] Empty text after cleaning, skipping TTS request`);
    return res.status(400).json({ error: 'Text is empty after cleaning' });
  }
  // Validate and determine the correct provider and voiceId
  let selected = provider;
  let validatedVoiceId = voiceId;
  
  // Step 1: Validate voiceId against the actual voice pool
  if (validatedVoiceId) {
    const voiceInPool = VOICE_POOL.find(v => v.voiceId === validatedVoiceId);
    if (!voiceInPool) {
      console.warn(`[tts] [req ${req.reqId}] Invalid voiceId: ${validatedVoiceId}. Available voices: ${VOICE_POOL.map(v => v.voiceId).join(', ')}`);
      return res.status(400).json({ 
        error: `Invalid voiceId: ${validatedVoiceId}`,
        availableVoices: VOICE_POOL.map(v => ({ voiceId: v.voiceId, provider: v.provider, description: v.description }))
      });
    }
    // If voiceId is valid, use its provider
    selected = voiceInPool.provider;
  }
  
  // Step 2: Handle cases where provider is actually a voiceId (legacy format)
  if (selected && (selected.startsWith('am_') || selected.startsWith('bf_') || selected.startsWith('bm_') || selected.startsWith('af_') || selected.startsWith('en-US-'))) {
    // Provider is actually a voiceId, find the correct provider
    const voiceInPool = VOICE_POOL.find(v => v.voiceId === selected);
    if (voiceInPool) {
      selected = voiceInPool.provider;
      validatedVoiceId = voiceInPool.voiceId;
    } else {
      console.warn(`[tts] [req ${req.reqId}] Provider '${selected}' is a voiceId but not found in voice pool`);
      return res.status(400).json({ 
        error: `Invalid provider/voiceId: ${selected}`,
        availableVoices: VOICE_POOL.map(v => ({ voiceId: v.voiceId, provider: v.provider, description: v.description }))
      });
    }
  }
  
  // Step 3: Fallback to available providers if no provider specified
  if (!selected) {
    selected = ENV_KEYS.kokoroApiUrl ? 'kokoro' : (ENV_KEYS.msedgeBaseUrl ? 'msedge' : (ENV_KEYS.openai ? 'openai' : null));
  }
  
  // Step 4: Validate that the selected provider is available
  if (!selected) {
    return res.status(400).json({ error: 'No TTS provider available. Configure KOKORO_API_URL, MSEDGE_BASE_URL, or OPENAI_API_KEY.' });
  }
  
  // Step 5: If no voiceId specified, use a default for the provider
  if (!validatedVoiceId) {
    const defaultVoice = VOICE_POOL.find(v => v.provider === selected);
    if (defaultVoice) {
      validatedVoiceId = defaultVoice.voiceId;
    }
  }
  try {
    console.log(`[tts] [req ${req.reqId}] provider=${selected} voiceId=${validatedVoiceId || '-'} len=${cleanText.length} preview="${previewStr(cleanText, 120)}"`);
    const tts = sharedFactory.getTTS(selected);
    if (!tts) return res.status(400).json({ error: `TTS provider not configured: ${selected}` });
    const result = await tts.synthesizeWithMetadata(cleanText, { voiceId: validatedVoiceId });
    res.setHeader('Content-Type', 'audio/mpeg');
    // If provider returns duration metadata, expose it to clients
    try {
      if (result && (result.durationSeconds || result.duration_ms)) {
        const secs = result.durationSeconds || Math.round((result.duration_ms || 0) / 1000);
        if (secs && secs > 0) res.setHeader('X-Audio-Duration', String(secs));
      }
    } catch {}
    // Track usage via package tracker if available
    try {
      if (usageTracker) {
        const estimatedSeconds = Number(result?.durationSeconds) || Math.round((Number(result?.duration_ms) || 0) / 1000) || undefined;
        usageTracker.trackUsage({
          provider: selected,
          voiceId: validatedVoiceId || '-',
          text: cleanText,
          characterCount: cleanText.length,
          estimatedDurationSeconds: estimatedSeconds,
          metadata: { format: 'audio/mpeg', userId: req.header('x-user-id'), userEmail: req.header('x-user-email') }
        });
      }
    } catch {}
    result.stream.on('error', (e) => {
      console.error('[full-cast-tts] TTS stream error:', e);
      if (!res.headersSent) res.status(500).end();
    });
    result.stream.pipe(res);
  } catch (e) {
    console.error(`[tts] [req ${req.reqId}] TTS failed:`, {
      error: e.message,
      provider: selected,
      voiceId: voiceId || 'none',
      textLength: cleanText.length,
      textPreview: cleanText.substring(0, 100)
    });
    res.status(500).json({ error: 'TTS synthesis failed' });
  }
});

// --- Kokoro warmup endpoint ---
app.post('/api/warmup/kokoro', async (_req, res) => {
  try {
    // Prefer direct health ping if URL available
    if (ENV_KEYS.kokoroApiUrl) {
      try {
        const url = new URL(ENV_KEYS.kokoroApiUrl.replace(/\/$/, '') + '/health');
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 2000);
        await fetch(url.toString(), { method: 'GET', signal: controller.signal }).catch(() => {});
        clearTimeout(t);
      } catch {}
    }
    // Also nudge the provider via a tiny synthesis with immediate abort
    const kokoro = sharedFactory.getTTS && sharedFactory.getTTS('kokoro');
    if (kokoro && kokoro.synthesizeWithMetadata) {
      const result = await kokoro.synthesizeWithMetadata('ping', { voiceId: 'bm_george' }).catch(() => null);
      try { result && result.stream && result.stream.destroy && result.stream.destroy(); } catch {}
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(200).json({ ok: true });
  }
});

// --- Reset casting memory endpoint ---
app.post('/api/reset-casting', (req, res) => {
  const userCastingManager = getUserCastingManager(req.userId);
  if (userCastingManager.characterMap) {
    userCastingManager.characterMap = {};
  }
  if (userCastingManager.usedVoices) {
    userCastingManager.usedVoices = new Set();
  }
  console.log(`[full-cast-tts] Casting memory has been reset via API for user: ${req.userId}`);
  res.json({ ok: true, message: 'Casting memory reset', userId: req.userId });
});

// --- Get user session info endpoint ---
app.get('/api/user-session', (req, res) => {
  const userCastingManager = getUserCastingManager(req.userId);
  const characterMap = userCastingManager.getCharacterMap();
  const usedVoices = userCastingManager.usedVoices ? Array.from(userCastingManager.usedVoices) : [];
  
  res.json({
    userId: req.userId,
    userEmail: req.userEmail,
    characterCount: Object.keys(characterMap).length,
    characters: Object.keys(characterMap),
    usedVoices: usedVoices,
    availableVoices: VOICE_POOL.length,
    sessionActive: true
  });
});

app.listen(PORT, () => {
  console.log(`[full-cast-tts] listening on http://localhost:${PORT}`);
});
