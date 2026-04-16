# Pipeline Architecture

This document explains how the **Modular TTS Pipeline** works from start to finish, including the latest features like multi-user concurrency, chat thread parsing, and comprehensive audio minute tracking.

---

## 📊 High-Level Overview

```
Raw Text Input
    ↓
[1] Text Preprocessing (structureTextForLLM)
    ↓
[2] User Authentication & Session Management
    ↓
[3] LLM Processing (Character & Voice Assignment)
    ↓
[4] Parser Selection (Simple/Persistent/Chat Thread)
    ↓
[5] TTS Generation (Multi-Provider Audio Synthesis)
    ↓
[6] Usage Tracking & Audio Minute Analytics
    ↓
Audio Output (Streaming) + Analytics
```

## 🆕 Latest Features (v0.1.0+)

### **Multi-User Concurrency**
- **Per-user CastingManager instances** - Each user has independent voice assignments
- **User identification middleware** - Supports X-User-Id headers and JWT tokens
- **Session isolation** - No cross-user interference in voice assignments
- **Admin endpoints** - Monitor active users and system usage

### **Chat Thread Parser**
- **Two-step LLM process** - Analysis then structured JSON output
- **Context management** - Intelligent summarization to prevent context overflow
- **JSON-only responses** - Strict schema validation for consistency
- **Character persistence** - Maintains voice assignments across text chunks

### **Comprehensive Audio Minute Tracking**
- **Real-time duration tracking** - Every TTS request logged with estimated/actual duration
- **Provider analytics** - Breakdown by Kokoro, MsEdge, OpenAI, Cartesia
- **Daily usage patterns** - Track usage over time for insights
- **Persistent storage** - Data survives server restarts

---

## 🔄 Detailed Pipeline Flow

### **Phase 1: User Authentication & Session Management**

**Location**: `src/server.ts` (lines 84-103)

**Purpose**: Identifies users and manages per-user resources

**How It Works**:
```typescript
// User identification middleware
app.use((req, res, next) => {
  // Priority: X-User-Id header > Authorization Bearer token > anonymous
  let userId = req.headers['x-user-id'] as string;
  
  if (!userId && req.headers.authorization) {
    const token = req.headers.authorization.replace('Bearer ', '');
    userId = token || 'anonymous';
  }
  
  req.userId = userId || 'anonymous';
  next();
});
```

**Per-User Resources**:
- **CastingManager instances** - Independent voice assignments per user
- **Chat history** - Session-based conversation context
- **Usage tracking** - User-specific analytics (when implemented)

### **Phase 2: Text Preprocessing** (`structureTextForLLM`)

**Location**: `src/server.ts` (line 115)

**Purpose**: Converts raw text into structured JSON for better LLM processing

**Input Example**:
```
"Hello!" said John. Mary looked at him and whispered, "How are you?"
```

**Output Example**:
```json
{
  "segments": [
    { "type": "dialogue", "content": "Hello!" },
    { "type": "narration", "content": "said John. Mary looked at him and whispered," },
    { "type": "dialogue", "content": "How are you?" }
  ]
}
```

**How It Works**:
- Detects quoted text using regex: `/"([^"]+)"/g` (supports smart quotes too)
- Splits text into alternating dialogue/narration segments
- Preserves order and context for accurate speaker identification

---

### **Phase 3: LLM Processing** (`ModularAIFactory.createAndExecuteChain`)

**Location**: `src/core/ModularAIFactory.ts`

**Purpose**: Uses AI to identify speakers, assign genders, and select appropriate voices

**Parser Selection**:
- **Simple Dialogue Parser** - Basic dialogue extraction
- **Persistent Casting Parser** - Maintains voice assignments across requests
- **Chat Thread Parser** - Two-step process with context management (NEW)

**Current Configuration**:
- **LLM**: Google Gemini 2.0 Flash (`gemini-2.0-flash`)
- **Parser**: Persistent Casting Parser (`persistentCastingParser`)
- **Fallback Chain**: `['gemini-2.0-flash', 'gpt-4o-mini']`

**The LLM Receives**:

1. **Preprocessed Text** (from Phase 1)
2. **Already Assigned Voices** (CASTING_CONTEXT):
   ```json
   {
     "Narrator": {
       "character": "Narrator",
       "voice": {
         "provider": "kokoro",
         "voiceId": "bm_george",
         "gender": "male"
       }
     },
     "John": {
       "character": "John",
       "voice": {
         "provider": "kokoro",
         "voiceId": "am_adam",
         "gender": "male"
       }
     }
   }
   ```

3. **Available Voices** (AVAILABLE_VOICES):
   ```
   MALE VOICES:
     - en-US-BrianMultilingualNeural (msedge): Brian - Natural, clear, professional US male voice
     - am_echo (kokoro): Echo - Deep, resonant US male voice
     - am_eric (kokoro): Eric - Friendly, casual US male voice
     ...

   FEMALE VOICES:
     - en-US-JennyMultilingualNeural (msedge): Jenny - Friendly, expressive US female voice
     - af_heart (kokoro): Heart - Warm, emotional US female voice
     ...
   ```

**LLM's Job**:
1. Identify who is speaking from context (narration cues like "said John")
2. Infer character gender from names, pronouns, descriptions
3. **For new characters**: Choose an appropriate voice from AVAILABLE_VOICES based on personality
4. **For existing characters**: Reuse their assigned voice from CASTING_CONTEXT

**LLM Response Example**:
```json
{
  "dialogue": [
    {
      "character": "John",
      "dialogue": "Hello!",
      "gender": "male",
      "provider": "kokoro",
      "voiceId": "am_adam"
    },
    {
      "character": "Narrator",
      "dialogue": "said John. Mary looked at him and whispered,",
      "gender": "neutral",
      "provider": "kokoro",
      "voiceId": "bm_george"
    },
    {
      "character": "Mary",
      "dialogue": "How are you?",
      "gender": "female",
      "provider": "kokoro",
      "voiceId": "af_heart"
    }
  ]
}
```

**Why This Is Powerful**:
- LLM sees personality cues (e.g., "commanding officer" → `Andrew - Authoritative`)
- Matches voice characteristics to character traits
- Ensures consistency across the entire story

---

### **Phase 4: Parser Processing**

**Location**: `src/plugins/parser-plugins.ts`

**Purpose**: Validates and enriches the LLM's response

#### **Chat Thread Parser** (NEW - Recommended)

**Two-Step Process**:

**Step 1: Analysis**
```typescript
// System message for analysis
"You always return strict JSON. Analyze text into dialogue and narration segments."

// User message
{
  "instruction": "Analyze this text chunk and identify ALL segments...",
  "inputChunkId": "chunk-1",
  "textChunk": "Raw text input"
}
```

**Step 2: Structured Output**
```typescript
// System message for structured output
"You always return strict JSON. Convert analyzed segments into final dialogue array."

// User message with context
{
  "instruction": "Convert the analyzed segments into a final dialogue array...",
  "inputChunkId": "chunk-1", 
  "analyzed": "Step 1 JSON response",
  "assignedCast": "Existing voice assignments",
  "availableVoices": "Available voice descriptions"
}
```

**Context Management**:
- **Chat History**: Maintains conversation context across text chunks
- **Summarization**: Automatically summarizes when history exceeds 15 messages
- **Voice Consistency**: Enforces existing voice assignments

#### **Persistent Casting Parser** (Legacy)

**Location**: `src/plugins/parser-plugins.ts` (line 167)

**Purpose**: Single-step processing with voice persistence

**What It Does**:
1. **Parse JSON** from LLM output
2. **Validate structure** (ensure `dialogue` array exists)
3. **Pass through voice assignments** from LLM
4. **Fallback enrichment**: If LLM didn't provide voiceId/provider, look them up from CASTING_CONTEXT
5. **Error handling**: Return error messages if parsing fails

**Output** (Enriched Dialogue Script):
```typescript
[
  {
    character: "John",
    dialogue: "Hello!",
    gender: "male",
    provider: "kokoro",
    voiceId: "am_adam"
  },
  {
    character: "Narrator",
    dialogue: "said John. Mary looked at him and whispered,",
    gender: "neutral",
    provider: "kokoro",
    voiceId: "bm_george"
  },
  {
    character: "Mary",
    dialogue: "How are you?",
    gender: "female",
    provider: "kokoro",
    voiceId: "af_heart"
  }
]
```

---

### **Phase 5: TTS Generation** (Multi-Provider Audio Synthesis)

**Location**: `src/plugins/tts/` and `src/server.ts` (TTS endpoints)

**Purpose**: Generate audio from text using multiple TTS providers

**Supported Providers**:
- **Kokoro TTS** - High-quality, serverless (with retry logic for cold starts)
- **MsEdge TTS** - Microsoft Edge TTS via tts.yoread.com
- **OpenAI TTS** - OpenAI's text-to-speech API
- **Cartesia TTS** - Cartesia's voice synthesis

**Features**:
- **Retry Logic** - Exponential backoff for serverless providers
- **Duration Estimation** - Real-time audio length calculation
- **Cost Tracking** - Provider-specific cost calculation
- **Voice Normalization** - Automatic provider/voiceId correction

### **Phase 6: Usage Tracking & Audio Minute Analytics** (NEW)

**Location**: `src/core/usage-tracking.ts` and `src/server.ts` (usage endpoints)

**Purpose**: Comprehensive tracking of all TTS usage and audio generation

**What's Tracked**:
- **Audio Duration** - Estimated and actual duration in seconds/minutes
- **Provider Usage** - Breakdown by Kokoro, MsEdge, OpenAI, Cartesia
- **Daily Patterns** - Usage trends over time
- **Cost Analysis** - Provider-specific cost tracking
- **Character Count** - Text length processed

**API Endpoints**:
- `GET /api/usage/audio-minutes` - Complete audio statistics
- `GET /api/usage/audio-minutes/providers` - Provider breakdown
- `GET /api/usage/audio-minutes/daily` - Daily usage patterns
- `GET /api/usage/summary` - General usage summary
- `GET /api/usage/recent` - Recent usage entries

### **Phase 7: Voice Persistence** (`castingManager.setManualAssignments`)

**Location**: `src/server.ts` (line 629)

**Purpose**: Register new voice assignments for future use

**What Happens**:
1. Extract any **new characters** (not in existing CASTING_CONTEXT)
2. Register their LLM-selected voices into `CastingManager`
3. Mark these voices as "used" so they won't be assigned to other characters
4. Save for persistent casting across multiple text chunks

**Example**:
```typescript
// LLM assigned "Mary" → "af_heart"
// This gets registered:
castingManager.setManualAssignments([
  {
    character: "Mary",
    provider: "kokoro",
    voiceId: "af_heart",
    gender: "female"
  }
]);

// Now "af_heart" is marked as used
// Future chunks will see Mary in CASTING_CONTEXT
// LLM will reuse the same voice for Mary
```

---

### **Phase 5: Text Chunking** (`chunkText`)

**Location**: `public/index.html` (line 595)

**Purpose**: Split long dialogue into manageable chunks for TTS

**Current Settings**:
- **Max chunk size**: 400 characters
- **Strategy**: Break on sentence boundaries (`.`, `!`, `?`)
- **Goal**: Balance between natural flow and API efficiency

**Example**:
```typescript
Input: "This is a very long sentence that goes on and on. And this is another sentence. And yet another one!"

Output:
[
  "This is a very long sentence that goes on and on.",
  "And this is another sentence. And yet another one!"
]
```

**Why 400 characters**?
- ✅ Most sentences fit without breaking
- ✅ Fewer API calls than 250-char limit
- ✅ Still fast enough for streaming playback

---

### **Phase 6: TTS Synthesis** (`KokoroTts.synthesizeWithMetadata`)

**Location**: `src/plugins/tts/kokoro-tts.ts`

**Purpose**: Convert text chunks to audio streams

**Features**:
1. **Retry Logic** (for serverless cold starts):
   - 3 attempts with exponential backoff (2s, 4s, 8s)
   - 60-second timeout per request
   - Handles connection errors and timeouts

2. **Audio Format**: WAV (16-bit, 24kHz)

3. **Request Format**:
   ```typescript
   POST https://your-kokoro-instance/predict
   {
     "text": "Hello!",
     "voice": "am_adam",
     "language_code": "a"
   }
   ```

4. **Response**: Audio buffer (arraybuffer)

5. **Metadata Tracking**:
   ```typescript
   {
     stream: Readable,
     estimatedDurationSeconds: 2.5,
     metadata: {
       provider: "kokoro",
       voiceId: "am_adam",
       format: "wav",
       characterCount: 6,
       cost: 0.00003
     }
   }
   ```

**Error Handling**:
```
Attempt 1 → ECONNREFUSED → Wait 2s
Attempt 2 → Timeout → Wait 4s
Attempt 3 → Success! → Return audio
```

---

### **Phase 7: Audio Streaming & Playback**

**Location**: `public/index.html` (StreamingAudioController)

**Purpose**: Play audio as it's generated (streaming experience)

**Architecture**:
```
Producer Thread          Consumer Thread
     ↓                         ↓
Get next chunk          Wait for queue
     ↓                         ↓
Call /api/generate-    Dequeue audio blob
script                       ↓
     ↓                   Play audio
Call /api/tts                ↓
     ↓                   On end → next
Enqueue audio blob
     ↓
Next chunk
```

**How It Works**:
1. **Producer**: Fetches chunks sequentially, generates audio, adds to queue
2. **Consumer**: Dequeues audio blobs, plays them in order
3. **Queue**: Ensures smooth playback without gaps
4. **Parallel Mode**: Optional (can cause rate limits)

**Playback Flow**:
```typescript
[Chunk 1] → Generate Script → Generate Audio → Queue
                                                   ↓
[Chunk 2] → Generate Script → Generate Audio → Queue → Play Chunk 1
                                                   ↓
[Chunk 3] → Generate Script → Generate Audio → Queue → Play Chunk 2
                                                           ↓
                                                      Play Chunk 3
```

---

## 🎯 Complete End-to-End Example

### Input:
```
"Welcome to Camorr," said Locke. The city sprawled before them.
```

### Step-by-Step Processing:

#### **1. Text Preprocessing**
```json
{
  "segments": [
    { "type": "dialogue", "content": "Welcome to Camorr," },
    { "type": "narration", "content": "said Locke. The city sprawled before them." }
  ]
}
```

#### **2. LLM Processing**
**Prompt to Gemini**:
```
ALREADY ASSIGNED VOICES:
{
  "Narrator": { "voice": { "provider": "kokoro", "voiceId": "bm_george", "gender": "male" } }
}

AVAILABLE VOICES:
MALE VOICES:
  - am_adam (kokoro): Adam - Strong, commanding US male voice
  - am_eric (kokoro): Eric - Friendly, casual US male voice
  ...

Input: [preprocessed JSON above]
```

**Gemini's Response**:
```json
{
  "dialogue": [
    {
      "character": "Locke",
      "dialogue": "Welcome to Camorr,",
      "gender": "male",
      "provider": "kokoro",
      "voiceId": "am_eric"  // LLM chose "friendly, casual" for Locke
    },
    {
      "character": "Narrator",
      "dialogue": "said Locke. The city sprawled before them.",
      "gender": "neutral",
      "provider": "kokoro",
      "voiceId": "bm_george"  // Reused assigned voice
    }
  ]
}
```

#### **3. Parser Validation**
✅ Valid JSON structure  
✅ All fields present  
✅ Voice assignments complete  

#### **4. Voice Persistence**
```typescript
// Register "Locke" → "am_eric"
castingManager.setManualAssignments([{
  character: "Locke",
  provider: "kokoro",
  voiceId: "am_eric",
  gender: "male"
}]);

// Mark "am_eric" as used
// Future chunks will see this in CASTING_CONTEXT
```

#### **5. Text Chunking**
```typescript
Chunk 1: "Welcome to Camorr,"  // 19 chars
Chunk 2: "said Locke. The city sprawled before them."  // 47 chars
```

#### **6. TTS Synthesis**
**Request 1**:
```
POST /api/tts
{
  "provider": "kokoro",
  "text": "Welcome to Camorr,",
  "voiceId": "am_eric"
}
→ Audio blob (2 seconds, Eric's voice)
```

**Request 2**:
```
POST /api/tts
{
  "provider": "kokoro",
  "text": "said Locke. The city sprawled before them.",
  "voiceId": "bm_george"
}
→ Audio blob (3 seconds, George's voice)
```

#### **7. Audio Playback**
```
▶️ Play: "Welcome to Camorr," (Eric's friendly voice)
   ↓ (2 seconds later)
▶️ Play: "said Locke. The city sprawled..." (George's narrator voice)
   ✅ Done!
```

---

## 🔧 Key Components

### **ModularAIFactory**
- Central hub for all plugins
- Manages LLM, TTS, Parser registration
- Executes chains with fallback support

### **CastingManager**
- Tracks voice assignments per character
- Prevents voice reuse (ensures uniqueness)
- Provides available voices to LLM
- Supports manual overrides

### **Persistent Casting Parser**
- Reads LLM's voice choices
- Enriches dialogue with provider/voiceId
- Validates and error-handles

### **StreamingAudioController** (Frontend)
- Producer-consumer queue
- Smooth audio playback
- Progress tracking
- Error recovery

---

## 📈 Current Pipeline Settings

| Component | Current Value | Configurable? |
|-----------|---------------|---------------|
| **LLM** | Gemini 2.0 Flash | ✅ Yes (via `llm-select`) |
| **Parser** | Persistent Casting Parser | ✅ Yes (via `parser-select`) |
| **Chunk Size** | 400 characters | ✅ Yes (line 595 in index.html) |
| **TTS Provider** | Kokoro (primary) | ✅ Yes (auto-assigned by LLM) |
| **Narrator Voice** | `bm_george` (UK Male) | ✅ Yes (in CastingManager) |
| **Retry Attempts** | 3 | ✅ Yes (in kokoro-tts.ts) |
| **Retry Delays** | 2s, 4s, 8s | ✅ Yes (exponential backoff) |
| **Request Timeout** | 60 seconds | ✅ Yes (in kokoro-tts.ts) |

---

## 🎨 Customization Points

### Change Default Narrator Voice
```typescript
// src/core/casting-manager.ts (line 478)
this.cast['Narrator'] = {
  character: 'Narrator',
  voice: { provider: 'kokoro', voiceId: 'bm_daniel', gender: 'male' }  // Change here
};
```

### Change Chunk Size
```typescript
// public/index.html (line 595)
const chunkText = (text, maxLength = 500) => {  // Increase to 500
```

### Change Retry Settings
```typescript
// src/plugins/tts/kokoro-tts.ts (line 45-46)
const maxRetries = 5;  // Increase retries
const initialDelay = 3000;  // Longer initial delay
```

### Add More Voice Descriptions
```typescript
// src/core/casting-manager.ts (line 441)
{ provider: 'kokoro', voiceId: 'am_new', gender: 'male', description: 'New - Exciting voice' }
```

---

## 🚀 Performance Optimization

### Current Optimizations:
1. ✅ **Streaming**: Audio plays as it's generated
2. ✅ **Chunking**: Balances API calls vs latency
3. ✅ **Retry Logic**: Handles serverless cold starts
4. ✅ **Voice Reuse**: Same character = same voice (faster, cheaper)
5. ✅ **Intelligent Casting**: LLM chooses voices once, reuses forever

### Future Optimizations:
- **Parallel TTS**: Generate multiple audio chunks in parallel (already implemented, set `FETCH_IN_PARALLEL = true`)
- **Caching**: Cache TTS audio for repeated phrases
- **Pre-warming**: Keep Kokoro instance warm with periodic pings

---

## 📊 Data Flow Diagram

```
┌─────────────────┐
│   Raw Text      │
└────────┬────────┘
         │
         ↓
┌─────────────────────────┐
│ Text Preprocessing      │
│ (structureTextForLLM)   │
└────────┬────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│ LLM Processing (Gemini 2.0 Flash)    │
│ - Identify speakers                  │
│ - Assign genders                     │
│ - Choose voices from available pool  │
│ - Reuse voices for known characters  │
└────────┬─────────────────────────────┘
         │
         ↓
┌─────────────────────────┐
│ Parser Validation       │
│ (persistentCasting)     │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│ Voice Registration      │
│ (CastingManager)        │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│ Text Chunking           │
│ (400 char max)          │
└────────┬────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│ TTS Synthesis (Kokoro)           │
│ - Retry logic (3 attempts)       │
│ - 60s timeout                    │
│ - Exponential backoff            │
└────────┬─────────────────────────┘
         │
         ↓
┌─────────────────────────┐
│ Audio Streaming         │
│ (Producer-Consumer)     │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│ Audio Playback          │
│ (Browser Audio API)     │
└─────────────────────────┘
```

---

## 🎓 Summary

The pipeline is designed to be:
- **Intelligent**: LLM makes smart voice choices based on personality
- **Persistent**: Same character always gets the same voice
- **Resilient**: Retry logic handles serverless cold starts
- **Efficient**: Chunking, streaming, and voice reuse minimize costs
- **Modular**: Every component (LLM, Parser, TTS) is swappable

This architecture enables **high-quality audiobook generation** with **unique voices per character**, **intelligent casting**, and **smooth streaming playback**! 🎉

