# Full Cast TTS Pipeline Documentation

## Overview

This document describes the complete pipeline architecture for the Full Cast TTS server, including the newly implemented SRT subtitle and timing support.

## Pipeline Architecture

### High-Level Flow

```
User Request (Frontend Reader)
    ↓
[1] Text Preprocessing (structureTextForLLM)
    ↓
[2] User Session Management (Per-user CastingManager)
    ↓
[3] LLM Processing (Gemini 2.0 Flash)
    ↓
[4] Parser Selection (chatThreadParser/intelligentCastingParser)
    ↓
[5] TTS Synthesis (Kokoro/MsEdge/OpenAI)
    ↓
[6] Audio Streaming + SRT/Timing Headers + Usage Tracking
```

## Detailed Components

### 1. ModularAIFactory (Lines 106-112)

**Purpose**: Central factory for initializing all AI providers

**Configuration**:
```javascript
const sharedFactory = new ModularAIFactory({
  openai: ENV_KEYS.openai ? { apiKey: ENV_KEYS.openai } : undefined,
  gemini: ENV_KEYS.gemini ? { apiKey: ENV_KEYS.gemini, model: 'gemini-2.0-flash' } : undefined,
  msedge: ENV_KEYS.msedgeBaseUrl ? { baseUrl: ENV_KEYS.msedgeBaseUrl, apiKey: ENV_KEYS.msedgeApiKey } : undefined,
  kokoro: ENV_KEYS.kokoroApiUrl ? { apiUrl: ENV_KEYS.kokoroApiUrl, apiKey: ENV_KEYS.kokoroApiKey } : undefined,
});
```

**Available Providers**:
- ✅ OpenAI (GPT-4o)
- ✅ Gemini (2.0 Flash) - **Primary LLM**
- ✅ MsEdge TTS (tts.yoread.com)
- ✅ Kokoro TTS (localhost:8002)

### 2. CastingManager (Lines 139-161)

**Purpose**: Per-user voice assignment management

**Key Features**:
- **Per-user instances**: Map-based storage (`userCastingManagers`)
- **Voice consistency**: Same character = same voice across chunks
- **Memory persistence**: Survives server restarts
- **Gender awareness**: LLM assigns voices based on character gender

**Implementation**:
```javascript
function getUserCastingManager(userId) {
  if (!userCastingManagers.has(userId)) {
    const castingManager = new CastingManager();
    castingManager.allVoices = VOICE_POOL; // Filtered voice pool
    userCastingManagers.set(userId, castingManager);
  }
  return userCastingManagers.get(userId);
}
```

### 3. Voice Pool (Lines 115-134)

**Current Configuration**: 9 voices from enabled providers

**Kokoro TTS Voices**:
- `bm_george` - British Male (Narrator)
- `am_adam` - American Male (Confident)
- `am_eric` - American Male (Young)
- `bf_emma` - British Female (Mature)
- `af_heart` - American Female (Warm)
- `af_sarah` - American Female (Clear)

**MsEdge TTS Voices**:
- `en-US-BrianMultilingualNeural` - Brian (Multilingual)
- `en-US-JennyMultilingualNeural` - Jenny (Multilingual)
- `en-US-AriaNeural` - Aria (Friendly)

### 4. Session Memory (Lines 174-184)

**Purpose**: Context-aware parsing across text chunks

**Implementation**:
```javascript
const CHAT_SESSIONS = new Map();
function getSessionHistory(sessionId) {
  let history = CHAT_SESSIONS.get(sessionId);
  if (!history) {
    history = [];
    CHAT_SESSIONS.set(sessionId, history);
  }
  return history;
}
```

**Benefits**:
- Maintains character context across chunks
- Enables intelligent dialogue attribution
- Prevents character confusion

### 5. Text Preprocessing (Lines 187-261)

**Function**: `structureTextForLLM(rawText)`

**Purpose**: Converts raw text into structured JSON for better LLM processing

**Input Example**:
```
"Hello there!" said John. Mary looked at him and whispered, "How are you?"
```

**Output Example**:
```json
{
  "segments": [
    { "type": "dialogue", "content": "Hello there!" },
    { "type": "narration", "content": "said John. Mary looked at him and whispered," },
    { "type": "dialogue", "content": "How are you?" }
  ],
  "instructions": "CRITICAL: Dialogue attribution phrases like 'said Sofia' are NARRATION, not dialogue."
}
```

**Features**:
- Handles smart quotes (`" "`) and straight quotes (`" "`)
- Normalizes whitespace and special characters
- Provides explicit instructions to LLM about dialogue attribution

## API Endpoints

### 1. `/api/chat-thread` (Lines 416-473)

**Purpose**: Primary endpoint for Full Cast processing

**Request Format**:
```json
{
  "sessionId": "user-session-123",
  "text": "Raw text content",
  "llm": "gemini-2.0-flash",
  "inputChunkId": "chunk-1234567890"
}
```

**Response Format**:
```json
{
  "script": [
    {
      "character": "John",
      "dialogue": "Hello there!",
      "gender": "male",
      "provider": "kokoro",
      "voiceId": "am_adam"
    },
    {
      "character": "Narrator",
      "dialogue": "said John.",
      "provider": "kokoro",
      "voiceId": "bm_george"
    }
  ],
  "sessionId": "user-user-session-123"
}
```

**Process**:
1. Get user-specific CastingManager
2. Structure text using `structureTextForLLM()`
3. Call LLM with context (chat history + casting context)
4. Parse response with `chatThreadParser`
5. Persist new voice assignments
6. Return structured script

### 2. `/api/tts` (Lines 477-621) - **NEWLY ENHANCED**

**Purpose**: Direct TTS synthesis with SRT/timing support

**Request Format**:
```json
{
  "provider": "kokoro",
  "text": "Hello world. This is a test.",
  "voiceId": "bm_george",
  "includeTiming": true,
  "includeSrt": true
}
```

**Response Headers** (NEW):
- `Content-Type: audio/mpeg` - Audio file
- `X-Audio-Duration: 3.5` - Duration in seconds
- `X-SRT-Content: <base64>` - SRT subtitle content
- `X-Word-Timings: <base64>` - Word-level timing JSON
- `X-Sentence-Timings: <base64>` - Sentence-level timing JSON

**SRT Format Example**:
```srt
1
00:00:00,000 --> 00:00:01,250
Hello world.

2
00:00:01,250 --> 00:00:03,500
This is a test.
```

**Word Timings Format**:
```json
[
  {
    "text": "Hello",
    "offset": 0,
    "duration": 0.5
  },
  {
    "text": "world",
    "offset": 0.5,
    "duration": 0.75
  }
]
```

### 3. `/api/full-cast-tts` (Lines 340-412)

**Purpose**: Legacy endpoint with intelligent casting parser

**Request Format**:
```json
{
  "text": "Raw text content",
  "llm": "gemini-2.0-flash",
  "parser": "intelligent",
  "useVoiceCasting": true
}
```

**Process**:
1. Uses `intelligentCastingParser` instead of `chatThreadParser`
2. No session memory (stateless)
3. Still maintains per-user CastingManager

## SRT and Timing Support

### Supported Providers

**✅ Kokoro TTS**:
- Full SRT subtitle generation
- Word-level timing data
- Sentence-level timing data
- Base64-encoded headers

**✅ MsEdge TTS**:
- Full SRT subtitle generation
- Word-level timing data
- Sentence-level timing data
- Base64-encoded headers

**❌ OpenAI TTS**:
- Basic audio synthesis only
- No timing/SRT support

**❌ Cartesia TTS**:
- Basic audio synthesis only
- No timing/SRT support

### Implementation Details

**Server-side** (`server.cjs` lines 583-613):
```javascript
const result = await tts.synthesizeWithMetadata(cleanText, { 
  voiceId: validatedVoiceId,
  includeTiming: includeTiming || false,
  includeSrt: includeSrt || false
});

// Add SRT content header if available
if (result.srtContent) {
  const srtBase64 = Buffer.from(result.srtContent).toString('base64');
  res.setHeader('X-SRT-Content', srtBase64);
}

// Add word timing header if available
if (result.wordTimings) {
  const timingsJson = JSON.stringify(result.wordTimings);
  res.setHeader('X-Word-Timings', Buffer.from(timingsJson).toString('base64'));
}
```

**Frontend Integration** (Future):
```javascript
// In src/services/fullCastTTS.ts
export async function ttsForLine(text: string, provider?: string, voiceId?: string, includeSrt?: boolean): Promise<{blob: Blob, srt?: string}> {
  const response = await fetch(`${baseURL}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, text, voiceId, includeSrt: includeSrt || false })
  });
  
  const blob = await response.blob();
  const srtContent = response.headers.get('X-SRT-Content');
  const srt = srtContent ? Buffer.from(srtContent, 'base64').toString('utf-8') : undefined;
  
  return { blob, srt };
}
```

## Usage Tracking

### Implementation (Lines 615-625)

**Features**:
- Real-time duration tracking
- Provider-specific analytics
- Character count tracking
- Cost estimation
- Persistent storage (440 entries loaded on startup)

**Data Structure**:
```javascript
usageTracker.trackUsage({
  provider: selected,
  voiceId: validatedVoiceId || '-',
  text: cleanText,
  characterCount: cleanText.length,
  estimatedDurationSeconds: estimatedSeconds,
  metadata: { 
    format: 'audio/mpeg', 
    userId: req.header('x-user-id'), 
    userEmail: req.header('x-user-email'),
    includeTiming: includeTiming,
    includeSrt: includeSrt
  }
});
```

## Testing Commands

### Test Kokoro SRT
```bash
curl -X POST http://localhost:4001/api/tts \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "kokoro",
    "text": "Hello world. This is a test.",
    "voiceId": "bm_george",
    "includeSrt": true,
    "includeTiming": true
  }' --output test.mp3 -D headers.txt
```

### Test MsEdge SRT
```bash
curl -X POST http://localhost:4001/api/tts \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "msedge",
    "text": "Welcome to the audiobook.",
    "voiceId": "en-US-BrianMultilingualNeural",
    "includeSrt": true,
    "includeTiming": true
  }' --output test2.mp3 -D headers2.txt
```

### Verify SRT Content
```bash
# Extract SRT from headers
grep "X-SRT-Content" headers.txt | cut -d' ' -f2 | base64 -d > subtitles.srt
cat subtitles.srt
```

## Performance Characteristics

### Voice Pool Efficiency
- **9 voices** from 2 providers (Kokoro + MsEdge)
- **Dynamic filtering** based on enabled providers
- **Per-user isolation** prevents voice conflicts

### Processing Speed
- **LLM**: Gemini 2.0 Flash (~2-5 seconds per chunk)
- **TTS**: Kokoro (~1-3 seconds per line)
- **MsEdge**: External API (~1-2 seconds per line)
- **Total**: ~5-10 seconds per 2400-character chunk

### Memory Usage
- **Per-user CastingManager**: ~1KB per user
- **Session history**: ~10KB per active session
- **Usage tracking**: ~1MB for 440 entries

## Future Enhancements

### Planned Features
1. **Video Generation**: Burn SRT subtitles into video
2. **Karaoke Mode**: Highlight words as they're spoken
3. **Subtitle Downloads**: Direct SRT file downloads
4. **Timing Analytics**: Track replay patterns
5. **Parallel Processing**: Generate multiple chunks simultaneously

### API Extensions
1. `POST /api/tts/srt` - SRT content only
2. `POST /api/tts/with-srt` - Audio + SRT in JSON
3. `POST /api/workflows/complete-tts` - End-to-end with timing

## Troubleshooting

### Common Issues

**1. Voice Not Found**:
```
Error: Invalid voiceId: en-US-AndrewNeural
```
**Solution**: Use voices from the available voice pool

**2. SRT Not Generated**:
```
X-SRT-Content header missing
```
**Solution**: Ensure `includeSrt: true` and provider supports SRT

**3. Timing Data Missing**:
```
X-Word-Timings header missing
```
**Solution**: Ensure `includeTiming: true` and provider supports timing

### Debug Commands

**Check Server Status**:
```bash
curl http://localhost:4001/health
```

**List Available Voices**:
```bash
curl -X POST http://localhost:4001/api/tts \
  -H "Content-Type: application/json" \
  -d '{"provider": "invalid", "text": "test"}' 2>/dev/null | jq '.availableVoices'
```

**Test Provider Connectivity**:
```bash
curl -X POST http://localhost:4001/api/warmup/kokoro
```

## Summary

The Full Cast TTS pipeline successfully combines:

- **Intelligent Voice Casting**: LLM-driven character voice assignment
- **Per-User Sessions**: Isolated voice management
- **SRT Subtitle Generation**: Accessibility and video creation
- **Timing Data**: Word-level precision for karaoke features
- **Multi-Provider Support**: Kokoro, MsEdge, OpenAI flexibility
- **Usage Analytics**: Comprehensive tracking and cost estimation

This architecture enables **high-quality audiobook generation** with **unique voices per character**, **synchronized subtitles**, and **smooth streaming playback**! 🎉

