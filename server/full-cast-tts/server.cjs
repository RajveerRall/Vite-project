const express = require('express');
const cors = require('cors');
const path = require('path');
// Load .env from this server directory unless already loaded by portable-launcher
// In pkg bundles, portable-launcher handles .env loading from executable directory
if (!process.env.DOTENV_CONFIG_PATH && !process.pkg) {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
} else if (process.pkg && !process.env.DOTENV_CONFIG_PATH) {
  // In pkg bundle, try to load from executable directory if not already loaded
  const execDir = path.dirname(process.execPath);
  const envPath = path.join(execDir, '.env');
  const fs = require('fs');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  }
}

// Prioritize vendor package (contains our JSON format updates)
let Modular;
let packageSource = 'unknown';
try {
  // Try vendor first (our updated version with JSON support)
  Modular = {
    ...require('./vendor/modular-tts/dist/api.js'),
    ModularAIFactory: require('./vendor/modular-tts/dist/core/ModularAIFactory.js').ModularAIFactory,
    CastingManager: require('./vendor/modular-tts/dist/core/casting-manager.js').CastingManager,
  };
  packageSource = 'vendor';
  console.log('[Server] ✅ Loaded @your-scope/modular-tts from vendor (with JSON format support)');
} catch (e) {
  // Fallback to node_modules if vendor is missing
  Modular = require('@your-scope/modular-tts');
  packageSource = 'node_modules';
  console.log('[Server] ⚠️  Loaded @your-scope/modular-tts from node_modules fallback');
}

// Log package versions
try {
  const vendorPackageJson = require('./vendor/modular-tts/package.json');
  console.log(`[Server] 📦 Vendor package version: ${vendorPackageJson.version}`);
} catch (e) {
  console.log('[Server] ❌ Could not read vendor package version');
}

try {
  const nodeModulesPackage = require('@your-scope/modular-tts/package.json');
  console.log(`[Server] 📦 node_modules package version: ${nodeModulesPackage.version}`);
} catch (e) {
  console.log('[Server] ⚠️  @your-scope/modular-tts not found in node_modules');
}

console.log(`[Server] 🎯 Using package from: ${packageSource}`);

const app = express();
// CORS configuration to handle preflight with custom headers
const corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-User-Id', 'X-User-Email'],
};
app.use(cors(corsOptions));

// Expose custom headers on ALL responses (not just OPTIONS)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Expose-Headers', 'X-SRT-Content, X-Word-Timings, X-Audio-Duration, X-Sentence-Timings');
  next();
});

// Express 5 no longer accepts '*' path patterns; handle preflight generically
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, X-User-Email');
    res.setHeader('Access-Control-Expose-Headers', 'X-SRT-Content, X-Word-Timings, X-Audio-Duration');
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
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// --- Visual Bible & References: helpers/persistence ---
const fs = require('fs');
const crypto = require('crypto');

const VISUAL_BIBLES_DIR = path.join(__dirname, 'visual-bibles');
if (!fs.existsSync(VISUAL_BIBLES_DIR)) {
  try { fs.mkdirSync(VISUAL_BIBLES_DIR); } catch {}
}

function hashBookTitle(bookTitle = '') {
  return crypto.createHash('sha1').update(String(bookTitle)).digest('hex').slice(0, 16);
}

function getBiblePaths(bookTitle, styleKey) {
  const base = styleKey ? String(styleKey).replace(/[^\w\-]+/g, '').slice(0, 64) : hashBookTitle(bookTitle);
  return {
    biblePath: path.join(VISUAL_BIBLES_DIR, `${base}.json`),
    refsPath: path.join(VISUAL_BIBLES_DIR, `${base}-refs.json`),
    keyBase: base
  };
}

function loadJSONSafe(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch {}
  return fallback;
}

function saveJSONSafe(filePath, obj) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
    return true;
  } catch (e) {
    console.warn(`[visual-bible] Failed to save ${filePath}:`, e.message);
    return false;
  }
}

function getOrCreateVisualBible(bookTitle, overrides, styleKey) {
  const { biblePath, keyBase } = getBiblePaths(bookTitle, styleKey);
  const existing = loadJSONSafe(biblePath, null);
  if (existing) {
    // If overrides provided, merge shallowly and persist
    if (overrides && typeof overrides === 'object') {
      const merged = {
        ...existing,
        ...overrides,
        characterProfiles: overrides.characterProfiles || existing.characterProfiles || [],
        locationProfiles: overrides.locationProfiles || existing.locationProfiles || [],
        styleGuide: overrides.styleGuide || existing.styleGuide || {},
        styleKey: overrides.styleKey || existing.styleKey || `yoread-${keyBase}`
      };
      saveJSONSafe(biblePath, merged);
      return merged;
    }
    return existing;
  }
  // Create minimal scaffold
  const fresh = {
    styleKey: `yoread-${keyBase}`,
    characterProfiles: [],
    locationProfiles: [],
    styleGuide: {
      lens: '35mm-50mm cinematic, moderate depth of field',
      composition: 'rule of thirds, leading lines, balanced foreground/midground/background',
      lighting: 'moody, volumetric, soft rim light on characters'
    }
  };
  // Merge any provided overrides
  if (overrides && typeof overrides === 'object') {
    fresh.characterProfiles = overrides.characterProfiles || fresh.characterProfiles;
    fresh.locationProfiles = overrides.locationProfiles || fresh.locationProfiles;
    fresh.styleGuide = overrides.styleGuide || fresh.styleGuide;
    fresh.styleKey = overrides.styleKey || fresh.styleKey;
  }
  saveJSONSafe(biblePath, fresh);
  return fresh;
}

function loadCachedRefs(styleKeyOrBookTitle) {
  const { refsPath } = getBiblePaths(styleKeyOrBookTitle, styleKeyOrBookTitle);
  const refs = loadJSONSafe(refsPath, []);
  // Return as base64 inlineData for model if files still exist
  const b64 = [];
  refs.forEach(fp => {
    try {
      if (fs.existsSync(fp)) {
        const buf = fs.readFileSync(fp);
        b64.push({ data: buf.toString('base64'), mimeType: guessMimeByExt(fp) });
      }
    } catch {}
  });
  return b64;
}

function guessMimeByExt(filename) {
  const ext = String(filename).toLowerCase();
  if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) return 'image/jpeg';
  if (ext.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

function appendRefs(styleKeyOrBookTitle, newPaths = [], maxKeep = 3) {
  const { refsPath } = getBiblePaths(styleKeyOrBookTitle, styleKeyOrBookTitle);
  const prior = loadJSONSafe(refsPath, []);
  const merged = Array.from(new Set([...prior, ...newPaths])).slice(0, maxKeep);
  saveJSONSafe(refsPath, merged);
  return merged;
}

// Serve generated scene images as static files
app.use(express.static(__dirname, {
  setHeaders: (res, path) => {
    if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

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

// Helper function to normalize localhost URLs to 127.0.0.1 to avoid IPv6 resolution issues
function normalizeLocalhostUrl(url) {
  if (!url) return url;
  // Replace localhost with 127.0.0.1 to force IPv4
  return url.replace(/localhost/g, '127.0.0.1');
}

// Build API keys from env once
const ENV_KEYS = {
  // OpenAI
  openai: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
  // Gemini
  gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.VITE_GOOGLE_GEMINI_API_KEY,
  // Cartesia (disabled in this pipeline)
  cartesia: process.env.CARTESIA_API_KEY || process.env.VITE_CARTESIA_API_KEY,
  // MsEdge (self-hosted)
  msedgeBaseUrl: normalizeLocalhostUrl(process.env.MSEDGE_BASE_URL || process.env.VITE_MSEDGE_BASE_URL),
  msedgeApiKey: process.env.MSEDGE_API_KEY || process.env.VITE_MSEDGE_API_KEY,
  // Kokoro - normalize localhost to 127.0.0.1 to avoid IPv6 resolution issues
  kokoroApiUrl: normalizeLocalhostUrl(process.env.KOKORO_API_URL || process.env.VITE_KOKORO_API_URL),
  kokoroApiKey: process.env.KOKORO_API_KEY || process.env.VITE_KOKORO_API_KEY,
};

// Preferred Gemini model (override with GEMINI_MODEL or VITE_GEMINI_MODEL)
const GEMINI_MODEL = (process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-2.5-pro').trim();
// Hard-locked analysis LLM for scene analysis (text-only). Do not change via env.
const ANALYSIS_LLM_MODEL = 'gemini-2.5-pro';

// Optional: Force single provider/voice for all script lines
const FORCE_PROVIDER = process.env.FORCE_PROVIDER || null; // e.g., 'kokoro' or 'msedge'
const FORCE_VOICE_ID = process.env.FORCE_VOICE_ID || null; // e.g., 'am_adam' or 'bm_george'

// Choose LLM (prefer Gemini)
// Note: ModularTTS uses 'gemini-2.0-flash' as the model ID, even when configured with 'gemini-2.5-pro'
const DEFAULT_LLM = ENV_KEYS.gemini ? GEMINI_MODEL : (ENV_KEYS.openai ? 'gpt-4o' : null);

// Maintain casting memory across requests by keeping a single factory + casting manager
const { ModularAIFactory, CastingManager, Pipeline } = Modular;
const sharedFactory = new ModularAIFactory({
  openai: ENV_KEYS.openai ? { apiKey: ENV_KEYS.openai } : undefined,
  gemini: ENV_KEYS.gemini ? { apiKey: ENV_KEYS.gemini, model: GEMINI_MODEL } : undefined,
  // cartesia intentionally omitted to match pipeline (no cartesia)
  msedge: ENV_KEYS.msedgeBaseUrl ? { baseUrl: ENV_KEYS.msedgeBaseUrl, apiKey: ENV_KEYS.msedgeApiKey } : undefined,
  kokoro: ENV_KEYS.kokoroApiUrl ? { apiUrl: ENV_KEYS.kokoroApiUrl, apiKey: ENV_KEYS.kokoroApiKey } : undefined,
});

// Voice pool with balanced provider distribution
const ALL_VOICES = [
  // Kokoro voices
  { voiceId: 'bm_george', gender: 'male', provider: 'kokoro', description: 'British Male - Narrator' },
  { voiceId: 'am_adam', gender: 'male', provider: 'kokoro', description: 'American Male - Confident' },
  { voiceId: 'am_eric', gender: 'male', provider: 'kokoro', description: 'American Male - Young' },
  { voiceId: 'bf_emma', gender: 'female', provider: 'kokoro', description: 'British Female - Mature' },
  { voiceId: 'af_heart', gender: 'female', provider: 'kokoro', description: 'American Female - Warm' },
  { voiceId: 'af_sarah', gender: 'female', provider: 'kokoro', description: 'American Female - Clear' },
  
  // MS Edge voices (only the 4 available on your MS Edge TTS server)
  { voiceId: 'en-US-BrianMultilingualNeural', gender: 'male', provider: 'msedge', description: 'Brian - Multilingual Male' },
  { voiceId: 'en-US-AndrewNeural', gender: 'male', provider: 'msedge', description: 'Andrew - Clear Male' },
  { voiceId: 'en-US-AvaMultilingualNeural', gender: 'female', provider: 'msedge', description: 'Ava - Multilingual Female' },
  { voiceId: 'en-US-EmmaMultilingualNeural', gender: 'female', provider: 'msedge', description: 'Emma - Multilingual Female' },
];

// Filter to only enabled providers
let VOICE_POOL = ALL_VOICES.filter(v => {
  if (v.provider === 'kokoro') return !!ENV_KEYS.kokoroApiUrl;
  if (v.provider === 'msedge') return !!ENV_KEYS.msedgeBaseUrl;
  return false;
});

// Override: Force single provider/voice if env vars are set
if (FORCE_PROVIDER && FORCE_VOICE_ID) {
  const forcedVoice = ALL_VOICES.find(v => 
    v.provider === FORCE_PROVIDER && 
    v.voiceId === FORCE_VOICE_ID &&
    (FORCE_PROVIDER === 'kokoro' ? !!ENV_KEYS.kokoroApiUrl : !!ENV_KEYS.msedgeBaseUrl)
  );
  
  if (forcedVoice) {
    VOICE_POOL = [forcedVoice];
    console.log(`[full-cast-tts] ⚙️  FORCED: Using single voice ${FORCE_VOICE_ID} from ${FORCE_PROVIDER}`);
  } else {
    console.warn(`[full-cast-tts] ⚠️  FORCE_PROVIDER=${FORCE_PROVIDER} and FORCE_VOICE_ID=${FORCE_VOICE_ID} specified, but voice not found or provider disabled. Using default pool.`);
  }
} else if (FORCE_PROVIDER || FORCE_VOICE_ID) {
  console.warn(`[full-cast-tts] ⚠️  Both FORCE_PROVIDER and FORCE_VOICE_ID must be set to force a single voice. Ignoring single value.`);
}

console.log(`[full-cast-tts] Voice pool has ${VOICE_POOL.length} voices from enabled providers${FORCE_PROVIDER ? ` [FORCED: ${FORCE_VOICE_ID}]` : ''}`);

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
    .replace(/\xa0/g, ' ')         // Replace non-breaking space
    .replace(/\u1680/g, ' ')       // Replace Ogham space mark
    .replace(/\u2000/g, ' ')       // Replace En quad
    .replace(/\u2001/g, ' ')       // Replace Em quad
    .replace(/\u2002/g, ' ')       // Replace En space
    .replace(/\u2003/g, ' ')       // Replace Em space
    .replace(/\u2004/g, ' ')       // Replace Three-per-em space
    .replace(/\u2005/g, ' ')       // Replace Four-per-em space
    .replace(/\u2006/g, ' ')       // Replace Six-per-em space
    .replace(/\u2007/g, ' ')       // Replace Figure space
    .replace(/\u2008/g, ' ')       // Replace Punctuation space
    .replace(/\u2009/g, ' ')       // Replace Thin space
    .replace(/\u200A/g, ' ')       // Replace Hair space
    .replace(/\u2028/g, ' ')       // Replace Line separator
    .replace(/\u2029/g, ' ')       // Replace Paragraph separator
    .replace(/\u202F/g, ' ')       // Replace Narrow no-break space
    .replace(/\u205F/g, ' ')       // Replace Medium mathematical space
    .replace(/\u3000/g, ' ')       // Replace Ideographic space
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
    // Prefer explicit llm; else prefer configured Gemini model if available; else OpenAI.
    // If explicit llm isn't configured, gracefully fall back to the available provider.
    let chosen = llm || (mergedKeys.gemini ? GEMINI_MODEL : (mergedKeys.openai ? 'gpt-4o' : null));
    if (llm === 'gpt-4o' && !mergedKeys.openai) {
      chosen = mergedKeys.gemini ? GEMINI_MODEL : null;
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
/**
 * Smart text chunking for long inputs
 * Splits by paragraph boundaries, preserving dialogue context
 */
function chunkTextByParagraphs(text, maxChars = 4000) {
  // First try: Split by paragraphs (double newlines)
  const paragraphs = text.split(/\n\s*\n/);
  
  // If we only got 1 paragraph (or the first one is too long), try sentence splitting
  if (paragraphs.length === 1 || text.length > maxChars * 2) {
    console.log(`[chunkTextByParagraphs] No paragraph breaks found, trying sentence splitting...`);
    
    // Split by sentence boundaries (. ! ? followed by space)
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const sentenceText = sentence.trim();
      if (!sentenceText) continue;
      
      // If adding this sentence would exceed limit and we have content, save chunk
      if (currentChunk && (currentChunk.length + sentenceText.length + 1) > maxChars) {
        chunks.push(currentChunk.trim());
        currentChunk = sentenceText;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentenceText;
      }
    }
    
    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 0 ? chunks : [text];
  }
  
  // Original paragraph-based logic
  const chunks = [];
  let currentChunk = '';
  
  for (const para of paragraphs) {
    const paraText = para.trim();
    if (!paraText) continue;
    
    // If adding this paragraph would exceed limit and we have content, save chunk
    if (currentChunk && (currentChunk.length + paraText.length + 2) > maxChars) {
      chunks.push(currentChunk.trim());
      currentChunk = paraText;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paraText;
    }
  }
  
  // Add remaining chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Process single text chunk with retry on JSON errors
 */
async function processChunkWithRetry(
  chunkText, 
  chosen, 
  history, 
  userCastingManager, 
  inputChunkId, 
  reqId,
  maxRetries = 3  // Increased from 2 to 3 for better retry coverage
) {
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const structured = structureTextForLLM(chunkText);
      
      if (attempt > 0) {
        console.log(`[chat-thread] [req ${reqId}] Retry attempt ${attempt}/${maxRetries}`);
      }
      
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
      
      // Validate script is array
      if (!Array.isArray(script)) {
        throw new Error('LLM returned non-array script');
      }
      
      console.log(`[chat-thread] [req ${reqId}] Chunk processed: ${script.length} lines`);
      return script;
      
    } catch (e) {
      lastError = e;
      const errorMsg = e.message || String(e);
      
      // Check if it's a JSON parsing error (includes various JSON error types)
      const isJsonError = errorMsg.includes('JSON') || 
                         errorMsg.includes('Unterminated string') ||
                         errorMsg.includes('control character') ||
                         errorMsg.includes('Unexpected token') ||
                         errorMsg.includes('JSONDecodeError') ||
                         errorMsg.includes('Invalid JSON');
      
      if (isJsonError) {
        console.warn(`[chat-thread] [req ${reqId}] JSON parsing error on attempt ${attempt + 1}:`, errorMsg);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const delayMs = 1000 * Math.pow(2, attempt); // Exponential: 1s, 2s, 4s
          console.log(`[chat-thread] [req ${reqId}] Waiting ${delayMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
      }
      
      // Non-JSON error or max retries reached
      throw e;
    }
  }
  
  throw lastError;
}

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
    
    // CHUNKING: Split long texts to prevent JSON errors
    const CHUNK_THRESHOLD = 5000; // Characters
    let allScripts = [];
    
    if (text.length > CHUNK_THRESHOLD) {
      console.log(`[chat-thread] [req ${req.reqId}] Text too long (${text.length} chars), splitting into chunks...`);
      const chunks = chunkTextByParagraphs(text, 4000);
      console.log(`[chat-thread] [req ${req.reqId}] Split into ${chunks.length} chunks`);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`[chat-thread] [req ${req.reqId}] Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
        
        const script = await processChunkWithRetry(
          chunk,
          chosen,
          history,
          userCastingManager,
          `${inputChunkId}-chunk-${i}`,
          req.reqId
        );
        
        allScripts.push(...script);
      }
      
      console.log(`[chat-thread] [req ${req.reqId}] All chunks processed: ${allScripts.length} total lines`);
    } else {
      // Single chunk processing with retry
      console.log(`[chat-thread] [req ${req.reqId}] Processing single chunk (${text.length} chars)`);
      allScripts = await processChunkWithRetry(
        text,
        chosen,
        history,
        userCastingManager,
        inputChunkId,
        req.reqId
      );
    }
    
    const script = allScripts;
    console.log(`[chat-thread] [req ${req.reqId}] LLM returned script:`, JSON.stringify(script.slice(0, 3), null, 2), '... (truncated)');
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

// --- TTS endpoint (per-line synthesis with SRT/timing support) ---
// Supports includeTiming and includeSrt parameters for subtitle generation
// Returns SRT content in X-SRT-Content header (base64 encoded)
// Returns word timings in X-Word-Timings header (base64 encoded JSON)
// Returns sentence timings in X-Sentence-Timings header (base64 encoded JSON)

app.post('/api/tts', async (req, res) => {
  const { provider, text, voiceId, includeTiming, includeSrt } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }
  
  // Clean up text for TTS: remove line breaks, normalize whitespace, and clean up formatting
  const cleanText = text
    .replace(/\n/g, ' ')           // Replace line breaks with spaces
    .replace(/\r/g, ' ')           // Replace carriage returns with spaces
    .replace(/\t/g, ' ')           // Replace tabs with spaces
    .replace(/\xa0/g, ' ')         // Replace non-breaking space
    .replace(/\u1680/g, ' ')       // Replace Ogham space mark
    .replace(/\u2000/g, ' ')       // Replace En quad
    .replace(/\u2001/g, ' ')       // Replace Em quad
    .replace(/\u2002/g, ' ')       // Replace En space
    .replace(/\u2003/g, ' ')       // Replace Em space
    .replace(/\u2004/g, ' ')       // Replace Three-per-em space
    .replace(/\u2005/g, ' ')       // Replace Four-per-em space
    .replace(/\u2006/g, ' ')       // Replace Six-per-em space
    .replace(/\u2007/g, ' ')       // Replace Figure space
    .replace(/\u2008/g, ' ')       // Replace Punctuation space
    .replace(/\u2009/g, ' ')       // Replace Thin space
    .replace(/\u200A/g, ' ')       // Replace Hair space
    .replace(/\u2028/g, ' ')       // Replace Line separator
    .replace(/\u2029/g, ' ')       // Replace Paragraph separator
    .replace(/\u202F/g, ' ')       // Replace Narrow no-break space
    .replace(/\u205F/g, ' ')       // Replace Medium mathematical space
    .replace(/\u3000/g, ' ')       // Replace Ideographic space
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
    console.log(`[tts] [req ${req.reqId}] provider=${selected} voiceId=${validatedVoiceId || '-'} len=${cleanText.length} timing=${includeTiming || false} srt=${includeSrt || false} preview="${previewStr(cleanText, 120)}"`);
    const tts = sharedFactory.getTTS(selected);
    if (!tts) return res.status(400).json({ error: `TTS provider not configured: ${selected}` });
    const result = await tts.synthesizeWithMetadata(cleanText, { 
      voiceId: validatedVoiceId,
      includeTiming: includeTiming || false,
      includeSrt: includeSrt || false
    });
    
    // Add debugging after TTS call
    console.log(`[tts] [req ${req.reqId}] TTS result received:`, {
      provider: selected,
      hasSrtContent: !!result.srtContent,
      srtLength: result.srtContent?.length || 0,
      hasDuration: !!(result.actualDurationSeconds || result.estimatedDurationSeconds || result.durationSeconds),
      duration: result.actualDurationSeconds || result.estimatedDurationSeconds || result.durationSeconds,
      resultKeys: Object.keys(result || {})
    });
    
    res.setHeader('Content-Type', 'audio/mpeg');
    // If provider returns duration metadata, expose it to clients
    try {
      const duration = result.actualDurationSeconds 
        || result.estimatedDurationSeconds 
        || result.durationSeconds 
        || (result.duration_ms ? result.duration_ms / 1000 : null);
        
      if (duration && duration > 0) {
        res.setHeader('X-Audio-Duration', String(duration));
        console.log(`[tts] [req ${req.reqId}] Set X-Audio-Duration: ${duration}s`);
      } else {
        console.warn(`[tts] [req ${req.reqId}] No duration found in result:`, Object.keys(result || {}));
      }
    } catch (err) {
      console.error(`[tts] [req ${req.reqId}] Error extracting duration:`, err);
    }
    
    // Add SRT content header if available
    if (result.srtContent) {
      const srtBase64 = Buffer.from(result.srtContent, 'utf-8').toString('base64');
      res.setHeader('X-SRT-Content', srtBase64);
      console.log(`[tts] [req ${req.reqId}] Set X-SRT-Content: ${result.srtContent.length} chars (${srtBase64.length} base64)`);
    } else {
      console.warn(`[tts] [req ${req.reqId}] No SRT content in result`);
    }
    
    // Add word timing header if available
    if (result.wordTimings) {
      const timingsJson = JSON.stringify(result.wordTimings);
      res.setHeader('X-Word-Timings', Buffer.from(timingsJson).toString('base64'));
    }
    
    // Add sentence timing header if available
    if (result.sentenceTimings) {
      const sentenceTimingsJson = JSON.stringify(result.sentenceTimings);
      res.setHeader('X-Sentence-Timings', Buffer.from(sentenceTimingsJson).toString('base64'));
    }
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
    // --- Provider fallback: try the other configured provider before failing ---
    try {
      let fallbackProvider = null;
      if (selected !== 'kokoro' && ENV_KEYS.kokoroApiUrl) {
        fallbackProvider = 'kokoro';
      } else if (selected !== 'msedge' && ENV_KEYS.msedgeBaseUrl) {
        fallbackProvider = 'msedge';
      }
      if (fallbackProvider) {
        console.warn(`[tts] [req ${req.reqId}] Falling back to provider=${fallbackProvider}`);
        const fbVoice =
          (VOICE_POOL.find(v => v.provider === fallbackProvider)?.voiceId) ||
          (fallbackProvider === 'kokoro' ? 'bm_george' : 'en-US-BrianMultilingualNeural');
        const fb = sharedFactory.getTTS(fallbackProvider);
        if (!fb) throw new Error(`Fallback TTS provider not configured: ${fallbackProvider}`);
        const fbResult = await fb.synthesizeWithMetadata(cleanText, {
          voiceId: fbVoice,
          includeTiming: includeTiming || false,
          includeSrt: includeSrt || false
        });
        // Set headers similar to primary path
        res.setHeader('Content-Type', 'audio/mpeg');
        try {
          const fbDuration = fbResult.actualDurationSeconds
            || fbResult.estimatedDurationSeconds
            || fbResult.durationSeconds
            || (fbResult.duration_ms ? fbResult.duration_ms / 1000 : null);
          if (fbDuration && fbDuration > 0) {
            res.setHeader('X-Audio-Duration', String(fbDuration));
          }
        } catch {}
        if (fbResult.srtContent) {
          const srtBase64 = Buffer.from(fbResult.srtContent, 'utf-8').toString('base64');
          res.setHeader('X-SRT-Content', srtBase64);
        }
        if (fbResult.wordTimings) {
          const timingsJson = JSON.stringify(fbResult.wordTimings);
          res.setHeader('X-Word-Timings', Buffer.from(timingsJson).toString('base64'));
        }
        if (fbResult.sentenceTimings) {
          const sentenceTimingsJson = JSON.stringify(fbResult.sentenceTimings);
          res.setHeader('X-Sentence-Timings', Buffer.from(sentenceTimingsJson).toString('base64'));
        }
        // Stream fallback audio
        fbResult.stream.on('error', (err) => {
          console.error('[full-cast-tts] Fallback TTS stream error:', err);
          if (!res.headersSent) res.status(500).end();
        });
        fbResult.stream.pipe(res);
        return;
      }
    } catch (fallbackErr) {
      console.error(`[tts] [req ${req.reqId}] Fallback provider also failed:`, fallbackErr?.message || fallbackErr);
    }
    // If fallback failed or wasn't available, return error
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

// === Scene Analysis for Video Generation ===

// Helper: Build Visual Director prompt
function buildSceneAnalysisPrompt(text, bookTitle, bookTheme, colorPalette, maxScenes, visualBible, styleKey, detailLevel = 'high') {
  return `You are an expert AI "Visual Director" for book illustrations. Your core mission is to analyze provided text (a chapter or passage) and generate a list of highly detailed, professional-grade image prompts. These prompts must consistently capture the atmosphere, environment, and pivotal visual moments of the narrative. Be explicit and information-dense.

CORE DIRECTIVES:
- Analysis Focus: Prioritize visually rich scenes, evocative environments, key actions, and unique world-building elements
- Environmental Emphasis: The environment (landscape, cityscape, interior) is paramount
- Characters, if present, should establish scale, perspective, or interact with the setting, not be close-up portraits
- Generate ${maxScenes} distinct scenes spread throughout the chapter
${detailLevel === 'high' ? `
REQUIRED DETAIL CHECKLIST FOR EACH SCENE:
- SETTING: Where are we? Interior/exterior, architecture/materials, era/tech level
- TIME_OF_DAY + LIGHTING: natural/artificial sources, direction, intensity, shadows, volumetrics
- MOOD/ATMOSPHERE: fog/dust/rain/smoke/particles; temperature of light; emotional tone
- COMPOSITION: rule of thirds, leading lines, foreground/midground/background balance
- CAMERA: angle (low/high/eye-level), shot scale (wide/medium), lens (e.g., 35mm, 50mm), depth of field
- CHARACTERS: identities (names), age/build, skin/hair/eyes, posture/gesture, wardrobe silhouettes/colors
- PROPS: specific objects referenced; counts must match text
- ENVIRONMENT DETAILS: surfaces, motifs, signage (disallow unless in text), materials, color palette
- BACKGROUND ELEMENTS: relevant structures/shapes; do not invent new entities
` : ''}

STRICT PROMPT STRUCTURE (for each scene's image_prompt):
[Medium], [Subject & Action], [Setting Description], [STYLE_THEME_KEYWORDS], [LIGHTING_ATMOSPHERE], [COMPOSITION], [CAMERA (angle + lens + depth of field)], [CHARACTER_REFERENCE], [LOCATION_REFERENCE]

IMPORTANT: Do NOT include the literal text "STYLE_KEY:..." in the image_prompt field. The STYLE_KEY is applied separately via the rendering pipeline.

PROJECT BIBLE (Apply to all prompts):

A. Global Art Style:
   - Medium Keywords: Cinematic digital painting, Illustrative concept art, Epic illustration
   - Technique Keywords: Painterly brushwork, stylized realism, highly detailed, evocative, visible brushstrokes
   - Avoid Keywords: Photorealistic, 3D render, cartoon, comic book, anime, low poly

B. Thematic & Color Palette:
   - Theme: ${bookTheme || "atmospheric narrative"}
   - Color Palette: ${colorPalette || "muted tones with dramatic contrasts"}

C. Character Consistency:
   - If recurring characters appear across scenes, maintain consistent physical descriptions
   - Include character details in [CHARACTER_REFERENCE] section
   - STYLE_KEY: ${styleKey || 'yoread-default'}
   - CHARACTER_PROFILES (canonical; reuse verbatim if present across scenes):
${visualBible?.characterProfiles ? JSON.stringify(visualBible.characterProfiles, null, 2) : '[]'}

D. Location Consistency:
   - Maintain consistent materials, motifs, props, and palette for recurring locations
   - LOCATION_PROFILES (canonical; reuse verbatim if present across scenes):
${visualBible?.locationProfiles ? JSON.stringify(visualBible.locationProfiles, null, 2) : '[]'}

E. Style Guide (apply consistently):
${visualBible?.styleGuide ? JSON.stringify(visualBible.styleGuide, null, 2) : JSON.stringify({
  lens: '35mm-50mm cinematic, moderate depth of field',
  composition: 'rule of thirds, leading lines, balanced foreground/midground/background',
  lighting: 'moody, volumetric, soft rim light on characters'
}, null, 2)}

BOOK CONTEXT:
- Title: ${bookTitle}
- Theme: ${bookTheme || "dramatic narrative"}
- Palette: ${colorPalette || "atmospheric tones"}

CHAPTER TEXT:
${text}

OUTPUT FORMAT (JSON):
{
  "scenes": [
    {
      "anchor_text": "[EXACT 20-100 word snippet from chapter where this scene occurs]",
      "scene_description": "[${detailLevel === 'high' ? '≥180 characters, information-dense' : 'Brief'} summary: include SETTING, TIME_OF_DAY, LIGHTING, MOOD, COMPOSITION, CAMERA(LENS+ANGLE), CHARACTERS (age/build/skin/hair/eyes), WARDROBE, PROPS with exact counts, ENVIRONMENTAL DETAILS, COLOR PALETTE, BACKGROUND elements present in text/canon]",
      "image_prompt": "[${detailLevel === 'high' ? '≥280 characters, concise comma-separated shot plan' : 'Concise shot plan'}: Medium, Subject & Action, Setting Description, STYLE_THEME_KEYWORDS, LIGHTING_ATMOSPHERE, COMPOSITION, CAMERA (angle + lens + depth of field), CHARACTER_REFERENCE (reuse canonical if present), LOCATION_REFERENCE (reuse canonical if present)]",
      "mood": "[one-word emotional tone]",
      "elements": ["list of concrete objects/entities present (must exist in anchor_text or canonical bible)"],
      "sourceJustification": ["for each element, short reference to anchor_text snippet or canonical profile name"]
    }
  ],
  "characterProfilesDelta": [],
  "locationProfilesDelta": []
}

CRITICAL REQUIREMENTS:
1. **anchor_text** MUST be EXACT text from chapter (copy-paste verbatim) - used for audio sync
2. **image_prompt** MUST follow the comma-separated structure above
3. **scene_description** ${detailLevel === 'high' ? 'must be richly descriptive (≥180 chars)' : 'should be concise (1-2 sentences)'}
4. Focus on ENVIRONMENTAL and ATMOSPHERIC moments, not character close-ups
5. Spread scenes evenly: beginning (0-30%), middle (30-70%), end (70-100%)
6. Each prompt should paint a complete cinematic frame
7. Maintain visual consistency if same locations/characters appear
8. Reuse CHARACTER_PROFILES and LOCATION_PROFILES verbatim for recurring entities (names and attributes must not drift)
9. Do not change hair/eye color, outfit silhouettes, emblem colors unless specified in the text
10. Do NOT add objects/characters not explicitly present in anchor_text or the canonical Visual Bible. If a detail is not present, mark it as "unspecified" rather than inventing it.
11. Keep counts exact (e.g., "a single door" means exactly one). Do not add signage/text unless present.
12. If an item appears in "elements", include a corresponding justification in "sourceJustification".

EXAMPLE OUTPUT:
{
  "scenes": [
    {
      "anchor_text": "Winston sat at his small wooden desk, the telescreen's voice droning in the background. The room was sparse, gray walls closing in around him as he opened the diary with trembling hands.",
      "scene_description": "Winston alone at his desk in Victory Mansions opening his forbidden diary",
      "image_prompt": "Cinematic digital painting, a lone gaunt man in his 30s writing in a hidden diary at a small wooden desk, sparse gray apartment with cracked walls and a large telescreen mounted on the wall, dystopian future aesthetic, gritty realism, dramatic side lighting from a grimy window creating long shadows, painterly brushwork, highly detailed, low-angle composition emphasizing oppression, muted earth tones with stark grays, Winston: gaunt man in his 30s, pale complexion, dark hair, wearing a faded blue Party uniform",
      "mood": "oppressive"
    }
  ]
}`;
}

// --- Strict image compliance helpers (used by /api/analyze-scenes) ---
function collectCanonicalNames(visualBible) {
  const chars = (visualBible?.characterProfiles || []).map(p => (p.name || '').toLowerCase());
  const locs  = (visualBible?.locationProfiles || []).map(p => (p.name || '').toLowerCase());
  return { chars, locs };
}

function findExtraneousElements(scene, visualBible) {
  try {
    const extraneous = [];
    const anchor = String(scene?.anchor_text || '').toLowerCase();
    const elems = Array.isArray(scene?.elements) ? scene.elements : [];
    const { chars, locs } = collectCanonicalNames(visualBible || {});
    for (const el of elems) {
      const e = String(el || '').toLowerCase();
      if (!e) continue;
      const inAnchor = anchor.includes(e);
      const inCanon  = chars.includes(e) || locs.includes(e);
      if (!inAnchor && !inCanon) extraneous.push(el);
    }
    return extraneous;
  } catch {
    return [];
  }
}

// Build prompt to expand short scene_description/image_prompt while preserving constraints
function buildExpandDetailsPrompt(scene, visualBible, styleKey, bookTheme, colorPalette, minDesc, minPrompt) {
  const canonChars = (visualBible?.characterProfiles || []).map(p => p.name).filter(Boolean);
  const canonLocs  = (visualBible?.locationProfiles || []).map(p => p.name).filter(Boolean);
  const anchor = scene?.anchor_text || '';
  const currentDesc = scene?.scene_description || '';
  const currentPrompt = scene?.image_prompt || '';

  return `You are the Visual Director Detail Expander.
STYLE_KEY: ${styleKey || 'yoread-default'}
THEME: ${bookTheme || ''}
PALETTE: ${colorPalette || ''}
CANON_CHARACTERS: ${JSON.stringify(canonChars)}
CANON_LOCATIONS: ${JSON.stringify(canonLocs)}

ANCHOR_TEXT:
${anchor}

CURRENT:
scene_description: ${currentDesc}
image_prompt: ${currentPrompt}

TASK: Expand both fields with richer, concrete information while STRICTLY adhering to ANCHOR_TEXT and canonical profiles. Do NOT invent elements. No signage/text unless present.
scene_description must be at least ${minDesc} characters and include SETTING, TIME_OF_DAY, LIGHTING, MOOD, COMPOSITION, CAMERA (angle + lens), CHARACTERS (age/build/skin/hair/eyes), WARDROBE, PROPS with exact counts, ENVIRONMENT, COLOR PALETTE, BACKGROUND elements present.
image_prompt must be at least ${minPrompt} characters and remain a concise comma-separated shot plan: [Medium], [Subject & Action], [Setting], [STYLE_THEME + STYLE_KEY:${styleKey || ''}], [LIGHTING], [COMPOSITION], [CAMERA], [CHARACTER_REFERENCE], [LOCATION_REFERENCE].

OUTPUT JSON ONLY:
{
  "scene_description": "...",
  "image_prompt": "..."
}`.trim();
}

function buildStrictRewritePrompt(scene, visualBible, styleKey) {
  const anchor = scene?.anchor_text || '';
  const original = scene?.image_prompt || '';
  const elems = Array.isArray(scene?.elements) ? scene.elements : [];
  const just = Array.isArray(scene?.sourceJustification) ? scene.sourceJustification : [];
  return `
You are the Visual Prompt Sanitizer.
STYLE_KEY: ${styleKey || 'yoread-default'}
Canonical CHARACTER_PROFILES:
${JSON.stringify(visualBible?.characterProfiles || [], null, 2)}
Canonical LOCATION_PROFILES:
${JSON.stringify(visualBible?.locationProfiles || [], null, 2)}

ANCHOR_TEXT (only source of truth for scene contents):
${anchor}

CURRENT IMAGE PROMPT:
${original}

CURRENT ELEMENTS:
${JSON.stringify(elems)}

CURRENT SOURCE JUSTIFICATIONS:
${JSON.stringify(just)}

TASK: Produce a revised "image_prompt" that strictly excludes any elements not present in ANCHOR_TEXT or the canonical profiles above. Keep counts exact. No text/signage unless present.

OUTPUT (JSON):
{
  "image_prompt": "..."
}
`.trim();
}

// POST /api/analyze-scenes
app.post('/api/analyze-scenes', async (req, res) => {
  const { 
    text, 
    bookTitle, 
    chapter, 
    maxScenes = 5,
    bookTheme = "atmospheric narrative",
    colorPalette = "muted tones with dramatic contrasts",
    videoFormat = "youtube",
    sessionId,
    styleKey: clientStyleKey,
    visualBible: clientVisualBible,
    bibleMode = 'use', // 'use' | 'create' | 'update'
    detailLevel = 'high' // 'normal' | 'high'
  } = req.body;
  
  if (!text || !bookTitle) {
    return res.status(400).json({ error: 'text and bookTitle are required' });
  }
  
  try {
    console.log(`[analyze-scenes] Processing "${chapter}" from "${bookTitle}"`);
    console.log(`[analyze-scenes] Text length: ${text.length} chars, max scenes: ${maxScenes}`);
    console.log(`[analyze-scenes] Theme: ${bookTheme}, Palette: ${colorPalette}`);
    
    // Visual Bible: load/create/update per book/styleKey
    const derivedKey = clientStyleKey || `yoread-${hashBookTitle(bookTitle)}`;
    let activeBible = null;
    if (bibleMode === 'create') {
      activeBible = getOrCreateVisualBible(bookTitle, clientVisualBible || {}, derivedKey);
    } else if (bibleMode === 'update') {
      activeBible = getOrCreateVisualBible(bookTitle, clientVisualBible || {}, derivedKey);
    } else {
      activeBible = getOrCreateVisualBible(bookTitle, null, derivedKey);
    }

    // Build Visual Director prompt with bible/styleKey
    const prompt = buildSceneAnalysisPrompt(text, bookTitle, bookTheme, colorPalette, maxScenes, activeBible, derivedKey, detailLevel);
    
    // Use hard-locked Gemini model for text analysis (2.5 Pro), with safe fallback
    // Try to resolve a Gemini LLM by several known identifiers
    const candidateModels = [
      ANALYSIS_LLM_MODEL,           // hard-locked preferred text model
      GEMINI_MODEL,                 // env-configured model
      DEFAULT_LLM,                  // default chosen at startup
      'gemini-2.0-flash',           // common internal alias
      'gemini'                      // generic provider id (if supported by factory)
    ].filter(Boolean);

    let llm = null;
    for (const m of candidateModels) {
      llm = sharedFactory.getLLM(m);
      if (llm) {
        if (m !== ANALYSIS_LLM_MODEL) {
          console.warn(`[analyze-scenes] Using fallback LLM model: ${m}`);
        } else {
          console.log(`[analyze-scenes] Using analysis LLM model: ${m}`);
        }
        break;
      }
    }

    if (!llm) {
      const hasKey = !!ENV_KEYS.gemini;
      throw new Error(`Gemini LLM not available${hasKey ? ' (model not registered)' : ' (GEMINI_API_KEY missing)'}`);
    }
    
    const startTime = Date.now();
    const response = await llm.execute(prompt);
    
    console.log(`[analyze-scenes] LLM response received (${response.length} chars)`);
    
    // Parse JSON response (handle markdown code blocks)
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    
    const scenesData = JSON.parse(cleanedResponse);
    
    console.log(`[analyze-scenes] Generated ${scenesData.scenes.length} scenes in ${Date.now() - startTime}ms`);

    // Optional strict compliance on server-side (rewrite non-compliant prompts)
    const strictImageCompliance = req.body.strictImageCompliance !== false;
    let rewrites = 0;
    if (strictImageCompliance) {
      for (const scene of scenesData.scenes) {
        const extra = findExtraneousElements(scene, activeBible);
        if (extra.length > 0) {
          try {
            const rewritePrompt = buildStrictRewritePrompt(scene, activeBible, derivedKey);
            const revised = await llm.execute(rewritePrompt);
            const revisedClean = revised.trim().replace(/^```json\s*|\s*```$/g, '');
            const revisedObj = JSON.parse(revisedClean);
            if (revisedObj && typeof revisedObj.image_prompt === 'string' && revisedObj.image_prompt.trim()) {
              scene.image_prompt = revisedObj.image_prompt.trim();
              rewrites++;
            }
          } catch (e) {
            console.warn('[analyze-scenes] Rewrite failed, using original image_prompt');
          }
        }
      }
      if (rewrites > 0) {
        console.log(`[analyze-scenes] Strict compliance rewrites applied: ${rewrites}`);
      }
    }

    // Optional post-process: expand short fields when detailLevel is 'high' (AFTER strict compliance)
    if (detailLevel === 'high' && Array.isArray(scenesData.scenes)) {
      let expandedCount = 0;
      const MIN_DESC = 200;   // Raised from 160
      const MIN_PROMPT = 300; // Raised from 240

      for (const scene of scenesData.scenes) {
        const descShort = !scene.scene_description || scene.scene_description.length < MIN_DESC;
        const promptShort = !scene.image_prompt || scene.image_prompt.length < MIN_PROMPT;
        if (!descShort && !promptShort) continue;

        try {
          const expandPrompt = buildExpandDetailsPrompt(scene, activeBible, derivedKey, bookTheme, colorPalette, MIN_DESC, MIN_PROMPT);
          const expanded = await llm.execute(expandPrompt);
          let expandedClean = expanded.trim();
          if (expandedClean.startsWith('```json')) expandedClean = expandedClean.replace(/^```json\s*/, '').replace(/```\s*$/, '');
          else if (expandedClean.startsWith('```')) expandedClean = expandedClean.replace(/^```\s*/, '').replace(/```\s*$/, '');
          const obj = JSON.parse(expandedClean);
          if (obj && typeof obj.scene_description === 'string' && typeof obj.image_prompt === 'string') {
            if (obj.scene_description.length > (scene.scene_description?.length || 0)) scene.scene_description = obj.scene_description;
            if (obj.image_prompt.length > (scene.image_prompt?.length || 0)) scene.image_prompt = obj.image_prompt;
            expandedCount++;
          }
        } catch (e) {
          console.warn('[analyze-scenes] Expansion pass failed for a scene:', e.message);
        }
      }
      if (expandedCount > 0) {
        console.log(`[analyze-scenes] Expanded details for ${expandedCount} scene(s) due to short outputs`);
      }
    }
    
    // Validate scene structure
    scenesData.scenes.forEach((scene, i) => {
      console.log(`[analyze-scenes] Scene ${i + 1}:`);
      console.log(`  Anchor text length: ${scene.anchor_text?.length} chars`);
      console.log(`  Image prompt length: ${scene.image_prompt?.length} chars`);
      console.log(`  Mood: ${scene.mood}`);
      
      if (!scene.anchor_text || scene.anchor_text.length < 20) {
        console.warn(`  WARNING: anchor_text too short (${scene.anchor_text?.length} chars)`);
      }
      if (!scene.image_prompt || scene.image_prompt.length < 50) {
        console.warn(`  WARNING: image_prompt too short`);
      }
    });
    
    // Save to file for review
    const fs = require('fs');
    const path = require('path');
    
    // Strip duration_seconds from scenes if present (removed from spec)
    const cleanScenes = scenesData.scenes.map(scene => {
      const { duration_seconds, ...rest } = scene;
      return rest;
    });

    // Merge deltas (if present) into Visual Bible
    try {
      const deltaChars = Array.isArray(scenesData.characterProfilesDelta) ? scenesData.characterProfilesDelta : [];
      const deltaLocs  = Array.isArray(scenesData.locationProfilesDelta) ? scenesData.locationProfilesDelta : [];

      const byName = new Map((activeBible.characterProfiles || []).map(p => [String(p.name || '').toLowerCase(), p]));
      for (const p of deltaChars) {
        const key = String(p?.name || '').toLowerCase();
        if (!key) continue;
        if (!byName.has(key)) byName.set(key, p);
      }
      activeBible.characterProfiles = Array.from(byName.values());

      const locByName = new Map((activeBible.locationProfiles || []).map(p => [String(p.name || '').toLowerCase(), p]));
      for (const p of deltaLocs) {
        const key = String(p?.name || '').toLowerCase();
        if (!key) continue;
        if (!locByName.has(key)) locByName.set(key, p);
      }
      activeBible.locationProfiles = Array.from(locByName.values());

      const { biblePath } = getBiblePaths(bookTitle, derivedKey);
      saveJSONSafe(biblePath, activeBible);
      console.log(`[analyze-scenes] Merged deltas into Visual Bible: +${deltaChars.length} characters, +${deltaLocs.length} locations`);
    } catch (e) {
      console.warn('[analyze-scenes] Failed to merge profile deltas:', e.message);
    }
    
    const outputData = {
      bookTitle,
      chapter,
      bookTheme,
      colorPalette,
      maxScenes,
      styleKey: derivedKey,
      textLength: text.length,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      scenes: cleanScenes
    };
    
    const filename = path.join(__dirname, `scene-analysis-${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(outputData, null, 2));
    console.log(`[analyze-scenes] Saved analysis to ${filename}`);
    
    res.json({
      scenes: cleanScenes,
      analysisMetadata: {
        totalScenes: cleanScenes.length,
        chapterLength: text.length,
        processingTime: Date.now() - startTime,
        bookTitle,
        chapter,
        theme: bookTheme,
        palette: colorPalette,
        videoFormat: videoFormat,
        strictImageCompliance: strictImageCompliance === true,
        styleKey: derivedKey,
        savedToFile: path.basename(filename)
      }
    });
    
  } catch (error) {
    console.error('[analyze-scenes] Error:', error);
    res.status(500).json({ 
      error: 'Scene analysis failed', 
      details: error.message 
    });
  }
});

// === Image Generation for Scenes ===
// POST /api/generate-scene-images
// Generates images from scene analysis prompts using Gemini Imagen
app.post('/api/generate-scene-images', async (req, res) => {
  const { scenes, videoFormat = 'youtube', referenceImages = [], useSavedReferences = false, styleKey } = req.body;
  
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return res.status(400).json({ error: 'scenes array is required' });
  }
  
  try {
    console.log(`[generate-scene-images] Processing ${scenes.length} scenes for ${videoFormat} format`);
    console.log(`[generate-scene-images] styleKey: ${styleKey || 'none'} useSavedReferences=${!!useSavedReferences} refCountIn=${(referenceImages && referenceImages.length) || 0}`);
    
    const { GoogleGenAI } = require('@google/genai');
    
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    
    const model = 'gemini-2.5-flash-image';
    const generatedImages = [];
    const timestamp = Date.now();
    
    // Prepare reference images list (base64 inline)
    const refInline = [];
    if (useSavedReferences) {
      const savedRefs = loadCachedRefs(styleKey || scenes?.[0]?.bookTitle || 'default');
      savedRefs.forEach(r => refInline.push(r));
    }
    if (Array.isArray(referenceImages) && referenceImages.length > 0) {
      referenceImages.forEach(b64 => {
        if (b64 && typeof b64 === 'string') {
          refInline.push({ data: b64, mimeType: 'image/png' });
        } else if (b64 && typeof b64 === 'object' && b64.data) {
          refInline.push({ data: b64.data, mimeType: b64.mimeType || 'image/png' });
        }
      });
    }
    console.log(`[generate-scene-images] Total references attached: ${refInline.length}`);

    // Load Visual Bible for canon
    const keyForBible = styleKey || scenes?.[0]?.bookTitle || 'default';
    let activeBible = null;
    try {
      activeBible = getOrCreateVisualBible(keyForBible, null, keyForBible);
    } catch {}

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      if (!scene.image_prompt) {
        console.warn(`[generate-scene-images] Scene ${i + 1} missing image_prompt, skipping`);
        continue;
      }
      
      try {
        console.log(`[generate-scene-images] Generating image ${i + 1}/${scenes.length}...`);
        
        // Sanitize image_prompt: remove any STYLE_KEY patterns that might have slipped through
        let cleanPrompt = scene.image_prompt;
        if (cleanPrompt) {
          // Remove patterns like "STYLE_KEY:yoread-xyz" or "+ STYLE_KEY:xyz"
          cleanPrompt = cleanPrompt.replace(/[+\s]*STYLE_KEY:[^\s,]+/gi, '').trim();
          // Clean up any double spaces or commas left behind
          cleanPrompt = cleanPrompt.replace(/\s{2,}/g, ' ').replace(/,\s*,/g, ',');
        }
        
        console.log(`[generate-scene-images] Prompt: ${cleanPrompt.substring(0, 100)}...`);
        
        // Build conditioning preamble with anchor_text and canon
        const canonChars = (activeBible?.characterProfiles || []).map(p => p.name).filter(Boolean);
        const canonLocs  = (activeBible?.locationProfiles || []).map(p => p.name).filter(Boolean);
        const requiredElems = Array.isArray(scene.elements) ? scene.elements : [];

        const preamble = [
          `STYLE_KEY: ${keyForBible}`,
          `ANCHOR_TEXT:\n${scene.anchor_text || ''}`,
          `SCENE_DESCRIPTION:\n${scene.scene_description || ''}`,
          `CANONICAL_CHARACTERS: ${JSON.stringify(canonChars)}`,
          `CANONICAL_LOCATIONS: ${JSON.stringify(canonLocs)}`,
          `RENDERING_GUIDELINES:`,
          `- Depict ONLY elements explicitly present in ANCHOR_TEXT or canonical profiles above.`,
          `- Include these concrete elements: ${requiredElems.join(', ')}`,
          `- No signage/text unless explicitly stated in ANCHOR_TEXT.`,
          `- Keep exact counts (e.g., "a single door" = one door).`,
          `- Do NOT invent props, characters, or background elements.`
        ].join('\n');

        const contents = [];
        // 1. Prepend reference images if any
        if (refInline.length > 0) {
          refInline.forEach(ref => {
            contents.push({
              role: 'user',
              parts: [{ inlineData: { mimeType: ref.mimeType || 'image/png', data: ref.data } }]
            });
          });
        }
        // 2. Conditioning preamble (anchor_text + canon + constraints)
        contents.push({
          role: 'user',
          parts: [{ text: preamble }]
        });
        // 3. Final image instruction (use sanitized prompt)
        contents.push({
          role: 'user',
          parts: [{ text: cleanPrompt }]
        });

        // Determine aspect ratio based on video format AND layout, allowing override
        const sceneLayout = String(req.body.sceneLayout || 'overlay').toLowerCase();
        let aspectRatio = req.body.imageAspect; // optional explicit override (e.g., '3:4','4:5','16:9','9:16')
        if (!aspectRatio) {
          if (videoFormat === 'mobile') {
            aspectRatio = '9:16';            // vertical video
          } else if (sceneLayout === 'split') {
            aspectRatio = '3:4';             // column-friendly for split layout in 16:9
          } else {
            aspectRatio = '16:9';            // default overlay background
          }
        }
        const cfg = {
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: { aspectRatio }
        };
        console.log(`[generate-scene-images] Using aspect ratio: ${aspectRatio} (layout=${sceneLayout}, format=${videoFormat})`);

        const response = await ai.models.generateContentStream({
          model,
          config: cfg,
          contents,
        });
        
        let imageBuffer = null;
        let mimeType = null;
        let fileIndex = 0;
        
        for await (const chunk of response) {
          if (!chunk.candidates || !chunk.candidates[0]?.content || !chunk.candidates[0]?.content.parts) {
            continue;
          }
          
          if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
            const inlineData = chunk.candidates[0].content.parts[0].inlineData;
            mimeType = inlineData.mimeType || 'image/png';
            const buffer = Buffer.from(inlineData.data || '', 'base64');
            
            // Append to imageBuffer
            imageBuffer = imageBuffer ? Buffer.concat([imageBuffer, buffer]) : buffer;
            fileIndex++;
          } else if (chunk.text) {
            console.log(`[generate-scene-images] Text response: ${chunk.text}`);
          }
        }
        
        if (!imageBuffer) {
          console.warn(`[generate-scene-images] No image data received for scene ${i + 1}`);
          continue;
        }
        
        // Save image to file
        // Extract file extension from mimeType
        let fileExtension = 'png';
        if (mimeType === 'image/png') fileExtension = 'png';
        else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') fileExtension = 'jpg';
        else if (mimeType === 'image/webp') fileExtension = 'webp';
        const filename = `scene-image-${timestamp}-${i}.${fileExtension}`;
        const filepath = path.join(__dirname, filename);
        fs.writeFileSync(filepath, imageBuffer);
        
        console.log(`[generate-scene-images] Saved image ${i + 1}: ${filename} (${imageBuffer.length} bytes)`);
        
        generatedImages.push({
          sceneIndex: i,
          anchor_text: scene.anchor_text,
          scene_description: scene.scene_description,
          image_prompt: scene.image_prompt,
          mood: scene.mood,
          filename: filename,
          filepath: filepath,
          mimeType: mimeType
        });
        
      } catch (error) {
        console.error(`[generate-scene-images] Failed to generate image for scene ${i + 1}:`, error);
        // Continue with other scenes
      }
    }
    
    console.log(`[generate-scene-images] Generated ${generatedImages.length}/${scenes.length} images`);
    // Persist a small set of anchors for future runs
    if (generatedImages.length > 0) {
      const anchorPaths = generatedImages.slice(0, 3).map(img => img.filepath).filter(Boolean);
      if (anchorPaths.length > 0) {
        const keyForRefs = styleKey || scenes?.[0]?.bookTitle || 'default';
        appendRefs(keyForRefs, anchorPaths, 3);
        console.log(`[generate-scene-images] Saved ${anchorPaths.length} anchor references for key ${keyForRefs}`);
      }
    }
    
    res.json({
      success: true,
      generatedCount: generatedImages.length,
      totalScenes: scenes.length,
      images: generatedImages
    });
    
  } catch (error) {
    console.error('[generate-scene-images] Error:', error);
    res.status(500).json({ 
      error: 'Image generation failed', 
      details: error.message 
    });
  }
});

// --- Visual Bible Admin Endpoints (inspect/update) ---
// GET /api/visual-bible?styleKey=...&bookTitle=...
app.get('/api/visual-bible', (req, res) => {
  try {
    const styleKey = req.query.styleKey;
    const bookTitle = req.query.bookTitle;
    if (!styleKey && !bookTitle) {
      return res.status(400).json({ error: 'styleKey or bookTitle is required' });
    }
    const { biblePath } = getBiblePaths(bookTitle || styleKey, styleKey);
    const bible = loadJSONSafe(biblePath, null);
    if (!bible) return res.status(404).json({ error: 'Visual Bible not found' });
    res.json({ styleKey: bible.styleKey, bible });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch visual bible' });
  }
});

// POST /api/visual-bible { styleKey?, bookTitle?, merge?: boolean, visualBible: { ... } }
app.post('/api/visual-bible', (req, res) => {
  try {
    const { styleKey, bookTitle, merge = true, visualBible } = req.body || {};
    if (!styleKey && !bookTitle) {
      return res.status(400).json({ error: 'styleKey or bookTitle is required' });
    }
    if (!visualBible || typeof visualBible !== 'object') {
      return res.status(400).json({ error: 'visualBible object is required' });
    }
    const bible = getOrCreateVisualBible(bookTitle || styleKey, merge ? visualBible : visualBible, styleKey);
    res.json({ ok: true, styleKey: bible.styleKey, bible });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update visual bible' });
  }
});

// GET /api/visual-refs?styleKey=...&bookTitle=...
app.get('/api/visual-refs', (req, res) => {
  try {
    const styleKey = req.query.styleKey;
    const bookTitle = req.query.bookTitle;
    if (!styleKey && !bookTitle) {
      return res.status(400).json({ error: 'styleKey or bookTitle is required' });
    }
    const { refsPath } = getBiblePaths(bookTitle || styleKey, styleKey);
    const refs = loadJSONSafe(refsPath, []);
    const files = refs.filter(fp => fs.existsSync(fp)).map(fp => {
      const stat = fs.statSync(fp);
      return { path: fp, size: stat.size };
    });
    res.json({ count: files.length, files });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list visual references' });
  }
});

app.listen(PORT, () => {
  console.log(`[full-cast-tts] listening on http://localhost:${PORT}`);
});
