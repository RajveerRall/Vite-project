const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import from vendored copy (isolated deps)
const api = require('./vendor/modular-tts/dist/api.js');

const app = express();
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
  // Cartesia
  cartesia: process.env.CARTESIA_API_KEY || process.env.VITE_CARTESIA_API_KEY,
};

// Choose LLM (prefer OpenAI)
const DEFAULT_LLM = ENV_KEYS.openai ? 'gpt-4o' : (ENV_KEYS.gemini ? 'gemini-2.0-flash' : null);

// Maintain casting memory across requests by keeping a single factory + casting manager
const { ModularAIFactory } = require('./vendor/modular-tts/dist/core/ModularAIFactory.js');
const { CastingManager } = require('./vendor/modular-tts/dist/core/casting-manager.js');
const sharedFactory = new ModularAIFactory({
  openai: ENV_KEYS.openai ? { apiKey: ENV_KEYS.openai } : undefined,
  gemini: ENV_KEYS.gemini ? { apiKey: ENV_KEYS.gemini, model: 'gemini-2.0-flash' } : undefined,
  cartesia: ENV_KEYS.cartesia ? { apiKey: ENV_KEYS.cartesia } : undefined,
});

// Expanded voice pool with Cartesia voices (more diverse for characters)
const VOICE_POOL = [
  // Male voices - Cartesia (rich, varied)
  { voiceId: '694f9389-aac1-45b6-b726-9d9369183238', gender: 'male', provider: 'cartesia' }, // Confident British Male
  { voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091', gender: 'male', provider: 'cartesia' }, // Wise Old Man
  { voiceId: '79a125e8-cd45-4c13-8a67-188112f4dd22', gender: 'male', provider: 'cartesia' }, // Friendly Guy
  { voiceId: '248be419-c632-4f23-adf1-5324ed7dbf1d', gender: 'male', provider: 'cartesia' }, // Midwestern Man
  { voiceId: '87748186-23bb-4158-a1eb-332911b0b708', gender: 'male', provider: 'cartesia' }, // Friendly Sidekick
  { voiceId: '41534e16-2966-4c6b-9670-111411def906', gender: 'male', provider: 'cartesia' }, // Middle Aged Man
  // Female voices - Cartesia
  { voiceId: 'b7d50908-b17c-442d-ad8d-810c63997ed9', gender: 'female', provider: 'cartesia' }, // Confident British Woman
  { voiceId: '79f8b5fb-2cc8-479a-80df-29f7a7cf1a3e', gender: 'female', provider: 'cartesia' }, // Wise Woman
  { voiceId: 'f9836c6e-a0bd-460e-9d3c-f7299fa60f94', gender: 'female', provider: 'cartesia' }, // Friendly Woman
  { voiceId: '2ee87190-8f84-4925-97da-e52547f9462c', gender: 'female', provider: 'cartesia' }, // Midwestern Woman
  // OpenAI fallbacks (keep for variety)
  { voiceId: 'onyx', gender: 'male', provider: 'openai' },
  { voiceId: 'echo', gender: 'male', provider: 'openai' },
  { voiceId: 'fable', gender: 'male', provider: 'openai' },
  { voiceId: 'nova', gender: 'female', provider: 'openai' },
  { voiceId: 'shimmer', gender: 'female', provider: 'openai' },
  { voiceId: 'alloy', gender: 'neutral', provider: 'openai' },
];

// Extended casting manager that accepts custom voice pool
class ExtendedCastingManager extends CastingManager {
  constructor(voicePool) {
    super();
    if (voicePool && Array.isArray(voicePool)) {
      this.allVoices = voicePool;
    }
  }
}

const sharedCastingManager = new ExtendedCastingManager(VOICE_POOL);
console.log('[full-cast-tts] providers:', {
  openai: !!ENV_KEYS.openai,
  gemini: !!ENV_KEYS.gemini,
  cartesia: !!ENV_KEYS.cartesia,
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
    const chosen = llm || (mergedKeys.openai ? 'gpt-4o' : mergedKeys.gemini ? 'gemini-2.0-flash' : null);
    if (!chosen) {
      console.warn('[full-cast-tts] 400: no LLM configured (missing OPENAI_API_KEY / GEMINI_API_KEY)');
      return res.status(400).json({ error: 'No LLM configured. Set OPENAI_API_KEY or GEMINI_API_KEY.' });
    }

    const structured = structureTextForLLM(text);
    // Let the parser decide voices by providing the current casting context
    const script = await sharedFactory.createAndExecuteChain({
      llmIds: [chosen],
      parserId: parser === 'simple' ? 'simpleDialogueParser'
        : parser === 'singleNarrator' ? 'singleNarratorParser'
        : 'intelligentCastingParser',
      rawTextInput: structured,
      context: { characterMap: sharedCastingManager.getCharacterMap() }
    });
    // Update casting memory based on resulting characters (non-narrator)
    const uniqueCharactersWithGender = (Array.isArray(script) ? script : [])
      .filter(l => (l?.character || '').toLowerCase() !== 'narrator')
      .reduce((acc, line) => {
        const name = (line?.character || '').trim();
        if (!name) return acc;
        if (!acc.some(c => c.character === name)) acc.push({ character: name, gender: (line?.gender || 'neutral') });
        return acc;
      }, []);
    sharedCastingManager.ensureVoiceCast(uniqueCharactersWithGender);

    // Enrich script with voice assignments from casting manager
    const characterMap = sharedCastingManager.getCharacterMap();
    const enrichedScript = (Array.isArray(script) ? script : []).map(line => {
      const char = (line?.character || '').trim();
      if (!char) return line;
      const profile = characterMap[char];
      if (profile && profile.voice) {
        return { ...line, provider: profile.voice.provider, voiceId: profile.voice.voiceId };
      }
      // Narrator or unmapped: default to cartesia
      if (char.toLowerCase() === 'narrator') {
        return { ...line, provider: 'cartesia' };
      }
      return line;
    });

    console.log(`[full-cast-tts] [req ${req.reqId}] pipeline done scriptLines=${enrichedScript.length}`);
    res.json({ script: enrichedScript });
  } catch (err) {
    console.error('[full-cast-tts] failed:', err);
    res.status(500).json({ error: 'Failed to process text' });
  }
});

// --- TTS endpoint (per-line synthesis) ---
let ttsProviders = {};
try {
  if (ENV_KEYS.openai) {
    const { OpenAITts } = require('./vendor/modular-tts/dist/plugins/tts/openai-tts.js');
    ttsProviders.openai = new OpenAITts({ apiKey: ENV_KEYS.openai });
  }
} catch (e) {
  console.warn('[full-cast-tts] OpenAI TTS not initialized:', e.message);
}
try {
  if (ENV_KEYS.cartesia) {
    const { CartesiaTts } = require('./vendor/modular-tts/dist/plugins/tts/cartesia-tts.js');
    ttsProviders.cartesia = new CartesiaTts({ apiKey: ENV_KEYS.cartesia });
  }
} catch (e) {
  console.warn('[full-cast-tts] Cartesia TTS not initialized:', e.message);
}

app.post('/api/tts', async (req, res) => {
  const { provider = (ttsProviders.openai ? 'openai' : (ttsProviders.cartesia ? 'cartesia' : null)), text, voiceId } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }
  if (!provider || !ttsProviders[provider]) {
    return res.status(400).json({ error: 'No TTS provider available. Set OPENAI_API_KEY or CARTESIA_API_KEY.' });
  }
  try {
    console.log(`[tts] [req ${req.reqId}] provider=${provider} voiceId=${voiceId || '-'} len=${text.length} preview="${previewStr(text, 120)}"`);
    const stream = await ttsProviders[provider].synthesizeStream(text, { voiceId });
    res.setHeader('Content-Type', 'audio/mpeg');
    stream.on('error', (e) => {
      console.error('[full-cast-tts] TTS stream error:', e);
      if (!res.headersSent) res.status(500).end();
    });
    stream.pipe(res);
  } catch (e) {
    console.error('[full-cast-tts] TTS failed:', e);
    res.status(500).json({ error: 'TTS synthesis failed' });
  }
});

app.listen(PORT, () => {
  console.log(`[full-cast-tts] listening on http://localhost:${PORT}`);
});
