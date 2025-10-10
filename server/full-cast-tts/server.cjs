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
// Initialize usage tracker from the package (singleton)
let getUsageTracker;
try {
  getUsageTracker = Modular.getUsageTracker || require('@your-scope/modular-tts').getUsageTracker;
} catch {}
const usageTracker = typeof getUsageTracker === 'function' ? getUsageTracker() : null;
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Simple per-request logging
let __REQ = 0;
app.use((req, res, next) => {
  const id = ++__REQ;
  const t0 = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - t0;
    const len = res.getHeader('content-length');
    console.log(`[req ${id}] ${req.method} ${req.originalUrl} -> ${res.statusCode} ${ms}ms${len ? ` ${len}b` : ''}`);
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

// Choose LLM (prefer OpenAI)
const DEFAULT_LLM = ENV_KEYS.openai ? 'gpt-4o' : (ENV_KEYS.gemini ? 'gemini-2.0-flash' : null);

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

// Use the standard CastingManager from the library
const sharedCastingManager = new CastingManager();
// Manually set the voice pool to our filtered list.
// This is the key to preventing the manager from knowing about disabled providers.
sharedCastingManager.allVoices = VOICE_POOL;

// Clear any old casting memory on server start to avoid stale Cartesia assignments
if (sharedCastingManager.characterMap) {
  sharedCastingManager.characterMap = {};
}
if (sharedCastingManager.usedVoices) {
  sharedCastingManager.usedVoices = new Set();
}
console.log('[full-cast-tts] Casting memory has been reset.');


console.log('[full-cast-tts] providers:', {
  openai: !!ENV_KEYS.openai,
  gemini: !!ENV_KEYS.gemini,
  msedge: !!ENV_KEYS.msedgeBaseUrl,
  kokoro: !!ENV_KEYS.kokoroApiUrl,
  llm: DEFAULT_LLM,
});

// Minimal structuring: split quoted dialogue and narration into segments JSON
function structureTextForLLM(raw) {
  if (!raw || typeof raw !== 'string') return JSON.stringify({ segments: [] });
  const regex = /"([^"]+)"/g;
  let lastIndex = 0;
  const segments = [];
  raw.replace(regex, (match, dialogueContent, offset) => {
    if (offset > lastIndex) {
      const narration = raw.substring(lastIndex, offset).trim();
      if (narration) segments.push({ type: 'narration', content: narration });
    }
    const cleanDialogue = String(dialogueContent || '').trim();
    if (cleanDialogue) segments.push({ type: 'dialogue', content: cleanDialogue });
    lastIndex = offset + match.length;
    return match;
  });
  if (lastIndex < raw.length) {
    const tail = raw.substring(lastIndex).trim();
    if (tail) segments.push({ type: 'narration', content: tail });
  }
  return JSON.stringify({ segments });
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
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

    const structured = structureTextForLLM(text);
    // Use factory chain per package docs, with persistentCastingParser by default
    const script = await sharedFactory.createAndExecuteChain({
      llmIds: [chosen],
      parserId: parser === 'simple' ? 'simpleDialogueParser'
        : parser === 'singleNarrator' ? 'singleNarratorParser'
        : 'persistentCastingParser',
      rawTextInput: structured,
      context: {
        CASTING_CONTEXT: JSON.stringify(sharedCastingManager.getCharacterMap(), null, 2),
        AVAILABLE_VOICES: sharedCastingManager.getAvailableVoicesForLLM ? sharedCastingManager.getAvailableVoicesForLLM() : undefined
      }
    });
    // Persist new voice assignments so future chunks reuse them
    try {
      const characterMap = sharedCastingManager.getCharacterMap();
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
      if (assignments.length && sharedCastingManager.setManualAssignments) {
        sharedCastingManager.setManualAssignments(assignments);
      }
    } catch {}

    console.log(`[full-cast-tts] [req ${req.reqId}] pipeline done scriptLines=${(Array.isArray(script) ? script.length : 0)}`);
    res.json({ script });
  } catch (err) {
    console.error('[full-cast-tts] failed:', err);
    res.status(500).json({ error: 'Failed to process text' });
  }
});

// --- TTS endpoint (per-line synthesis) ---

app.post('/api/tts', async (req, res) => {
  const { provider, text, voiceId } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }
  const selected = provider || (ENV_KEYS.openai ? 'openai' : (ENV_KEYS.cartesia ? 'cartesia' : null));
  if (!selected) {
    return res.status(400).json({ error: 'No TTS provider available. Set OPENAI_API_KEY or CARTESIA_API_KEY.' });
  }
  try {
    console.log(`[tts] [req ${req.reqId}] provider=${selected} voiceId=${voiceId || '-'} len=${text.length} preview="${previewStr(text, 120)}"`);
    const tts = sharedFactory.getTTS(selected);
    if (!tts) return res.status(400).json({ error: `TTS provider not configured: ${selected}` });
    const result = await tts.synthesizeWithMetadata(text, { voiceId });
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
          voiceId: voiceId || '-',
          text,
          characterCount: text.length,
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
    console.error('[full-cast-tts] TTS failed:', e);
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
app.post('/api/reset-casting', (_req, res) => {
  if (sharedCastingManager.characterMap) {
    sharedCastingManager.characterMap = {};
  }
  if (sharedCastingManager.usedVoices) {
    sharedCastingManager.usedVoices = new Set();
  }
  console.log('[full-cast-tts] Casting memory has been reset via API.');
  res.json({ ok: true, message: 'Casting memory reset' });
});

app.listen(PORT, () => {
  console.log(`[full-cast-tts] listening on http://localhost:${PORT}`);
});
