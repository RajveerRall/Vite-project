# Manual Voice Assignment Feature

## Overview

This feature allows users to extract all characters from a text and manually assign specific voices to each character, giving complete control over voice selection instead of relying on automatic assignments.

## How It Works

### Architecture

```
┌─────────────────┐
│   User Text     │
└────────┬────────┘
         │
         v
┌─────────────────────────────────┐
│  1. Character Extraction         │
│  POST /api/extract-characters-   │
│       manual                     │
│  - Uses LLM to analyze text      │
│  - Returns character list +      │
│    available voices              │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│  2. User Selects Voices          │
│  (Frontend UI)                   │
│  - User picks provider & voice   │
│    for each character            │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│  3. Apply Assignments            │
│  POST /api/set-voice-assignments │
│  - Stores assignments in         │
│    CastingManager                │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│  4. Generate Script              │
│  POST /api/generate-script       │
│  - Uses manual assignments       │
│  - Enriches script with voices   │
└─────────────────────────────────┘
```

## API Endpoints

### 1. Extract Characters for Manual Assignment

**Endpoint:** `POST /api/extract-characters-manual`

**Request:**
```json
{
  "storyId": "my-story-123",
  "llmId": "gemini-2.0-flash",
  "rawTextInput": "Your story text here..."
}
```

**Response:**
```json
{
  "storyId": "my-story-123",
  "characters": [
    {
      "name": "Alice",
      "gender": "female",
      "description": "female character"
    },
    {
      "name": "Bob",
      "gender": "male",
      "description": "male character"
    }
  ],
  "availableVoices": {
    "narrator": {
      "kokoro": ["bm_george", "bm_daniel", "am_onyx"]
    },
    "openai": [
      { "id": "echo", "gender": "male", "description": "US Male" },
      { "id": "nova", "gender": "female", "description": "US Female" }
    ],
    "msedge": [
      { "id": "en-US-BrianMultilingualNeural", "gender": "male", "description": "US Male" }
    ],
    "kokoro": [
      { "id": "af_heart", "gender": "female", "description": "US Female - Heart" },
      { "id": "am_adam", "gender": "male", "description": "US Male - Adam" }
    ]
  }
}
```

### 2. Set Manual Voice Assignments

**Endpoint:** `POST /api/set-voice-assignments`

**Request:**
```json
{
  "storyId": "my-story-123",
  "assignments": [
    {
      "character": "Alice",
      "provider": "kokoro",
      "voiceId": "af_heart",
      "gender": "female"
    },
    {
      "character": "Bob",
      "provider": "openai",
      "voiceId": "echo",
      "gender": "male"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Voice assignments updated successfully",
  "assignedCharacters": ["Alice", "Bob"],
  "characterMap": {
    "Narrator": {
      "character": "Narrator",
      "voice": {
        "provider": "kokoro",
        "voiceId": "bm_george",
        "gender": "male"
      }
    },
    "Alice": {
      "character": "Alice",
      "voice": {
        "provider": "kokoro",
        "voiceId": "af_heart",
        "gender": "female"
      }
    },
    "Bob": {
      "character": "Bob",
      "voice": {
        "provider": "openai",
        "voiceId": "echo",
        "gender": "male"
      }
    }
  }
}
```

### 3. Generate Script with Manual Assignments

**Endpoint:** `POST /api/generate-script`

After setting manual assignments, use this endpoint as normal. It will automatically use the manual assignments you've set.

**Request:**
```json
{
  "storyId": "my-story-123",
  "llmId": "gemini-2.0-flash",
  "rawTextInput": "Your story text chunk here..."
}
```

**Response:**
```json
[
  {
    "character": "Narrator",
    "dialogue": "The story begins...",
    "gender": "neutral",
    "provider": "kokoro",
    "voiceId": "bm_george"
  },
  {
    "character": "Alice",
    "dialogue": "Hello!",
    "gender": "female",
    "provider": "kokoro",
    "voiceId": "af_heart"
  }
]
```

## Integration into Your Plugin System

### 1. **Using Existing Character Extractor Plugins**

The manual voice assignment feature leverages the existing character extractor plugins:
- `gemini-extractor` - For Gemini LLM
- `gpt-4o-extractor` - For OpenAI GPT-4o

These plugins analyze the full text and extract:
- Character names
- Character genders
- Character roles

### 2. **CastingManager Enhancement**

Added a new method `setManualAssignments()` to the `CastingManager` class:

```typescript
public setManualAssignments(
  assignments: Array<{
    character: string;
    provider: string;
    voiceId: string;
    gender: VoiceGender;
  }>
): void
```

This method:
- Overwrites any existing assignments
- Marks voices as "used" to prevent conflicts
- Logs all changes for debugging

### 3. **Workflow Integration**

The manual voice assignment workflow can be integrated into your frontend in two ways:

#### Option A: Pre-Assignment Workflow
1. User pastes full text
2. Click "Extract Characters"
3. Review and assign voices
4. Click "Apply Assignments"
5. Start audio playback (chunks are processed with manual assignments)

#### Option B: Edit Existing Assignments
1. Use automatic casting to start
2. If user doesn't like a voice, they can:
   - View current assignments
   - Change specific character voices
   - Re-apply assignments

## Example Usage

### Frontend JavaScript Example

```javascript
// Step 1: Extract characters
async function extractCharacters(text) {
  const response = await fetch('http://localhost:8080/api/extract-characters-manual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storyId: 'my-story',
      llmId: 'gemini-2.0-flash',
      rawTextInput: text
    })
  });
  return await response.json();
}

// Step 2: Apply manual assignments
async function applyAssignments(assignments) {
  const response = await fetch('http://localhost:8080/api/set-voice-assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storyId: 'my-story',
      assignments
    })
  });
  return await response.json();
}

// Step 3: Generate script (uses manual assignments automatically)
async function generateScript(chunk) {
  const response = await fetch('http://localhost:8080/api/generate-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storyId: 'my-story',
      llmId: 'gemini-2.0-flash',
      rawTextInput: chunk
    })
  });
  return await response.json();
}

// Full workflow
async function manualVoiceWorkflow(fullText) {
  // Extract all characters
  const { characters, availableVoices } = await extractCharacters(fullText);
  
  // User selects voices (this would be done via UI)
  const userAssignments = [
    {
      character: characters[0].name,
      provider: 'kokoro',
      voiceId: 'af_heart',
      gender: characters[0].gender
    }
    // ... more assignments
  ];
  
  // Apply assignments
  await applyAssignments(userAssignments);
  
  // Now process chunks normally
  const chunks = fullText.split('\n\n');
  for (const chunk of chunks) {
    const script = await generateScript(chunk);
    // Process script...
  }
}
```

## Live Demo

A working example is available at:
`http://localhost:8080/manual-voice-assignment-example.html`

This demo shows:
1. Text input
2. Character extraction
3. Voice selection UI
4. Assignment application
5. Results display

## Benefits

1. **Full Control**: Users can choose exactly which voice they want for each character
2. **Consistency**: Once assigned, voices remain consistent across all chunks
3. **Quality**: Users can listen to voice samples and pick their favorites
4. **Flexibility**: Can change assignments at any time
5. **Transparency**: See exactly which character is using which voice

## Available Voice Providers

### OpenAI
- `echo` - US Male
- `nova` - US Female
- `shimmer` - US Female

### MsEdge TTS
- `en-US-BrianMultilingualNeural` - US Male
- `en-US-AndrewNeural` - US Male
- `en-US-JennyMultilingualNeural` - US Female
- `en-US-AvaMultilingualNeural` - US Female
- `en-US-EmmaMultilingualNeural` - US Female

### Kokoro TTS
- **US Female**: `af_heart`, `af_nova`, `af_sarah`
- **US Male**: `am_adam`, `am_echo`, `am_onyx`
- **UK Female**: `bf_alice`, `bf_emma`
- **UK Male**: `bm_daniel`, `bm_george`

## Technical Notes

- The narrator voice is always `kokoro` `bm_george` (British male)
- Manual assignments are stored in memory per session
- For production, you'd want to persist assignments to a database
- The `storyId` is used to keep assignments separate per story
- Character extraction uses the same LLM as script generation for consistency

## Future Enhancements

Potential improvements:
1. **Voice Preview**: Play sample audio of each voice before assigning
2. **Persistence**: Save assignments to database for long-term storage
3. **Templates**: Save assignment sets as templates for reuse
4. **Bulk Assignment**: Assign all male characters one voice, all female another
5. **AI Suggestions**: Use character descriptions to suggest appropriate voices
6. **Voice Similarity**: Group similar voices together in the UI

