# ModularTTS

A flexible, modular text-to-speech pipeline with support for multiple LLMs, parsers, and TTS providers.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Manual Voice Assignment](#manual-voice-assignment)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Advanced Usage](#advanced-usage)
- [License](#license)

## Features

- **Multiple LLM Support**: OpenAI GPT-4o, Gemini 2.0 Flash
- **Flexible Parsing**: Simple dialogue parser, intelligent casting parser, single narrator parser, persistent casting parser
- **TTS Providers**: OpenAI TTS, Cartesia TTS, MsEdge TTS, Kokoro TTS
- **Voice Casting**: Consistent character voice assignment across multiple texts
- **Manual Voice Assignment**: Extract characters and manually assign specific voices to each one
- **Usage Tracking**: Built-in usage tracking and analytics
- **OCR Support**: Extract text from images using Gemini OCR
- **TypeScript Support**: Full TypeScript definitions included

## Installation

```bash
npm install @your-scope/modular-tts
```

## Quick Start

```typescript
import { createPipeline } from '@your-scope/modular-tts';

// Create a pipeline with your API keys
const pipeline = createPipeline({
  llm: 'gpt-4o',
  parser: 'intelligentCastingParser',
  apiKeys: {
    openai: 'your-openai-api-key',
    cartesia: 'your-cartesia-api-key'
  },
  useVoiceCasting: true
});

// Process text
const result = await pipeline.process(`
"Hello there!" said John excitedly.
"I'm so glad to see you," replied Sarah with a smile.
`);

console.log(result.script);
// Output: [
//   { character: "John", dialogue: "Hello there!", gender: "male", provider: "cartesia", voiceId: "..." },
//   { character: "Sarah", dialogue: "I'm so glad to see you", gender: "female", provider: "cartesia", voiceId: "..." }
// ]
```

## API Reference

### Pipeline Options

```typescript
interface PipelineOptions {
  llm?: string;                    // LLM provider ('gpt-4o', 'gemini-2.0-flash')
  parser?: string;                  // Parser ('simpleDialogueParser', 'intelligentCastingParser', 'singleNarratorParser')
  apiKeys?: {
    openai?: string;
    gemini?: string;
    cartesia?: string;
  };
  useVoiceCasting?: boolean;        // Enable voice casting memory
}
```

### Built-in Parsers

- **`simpleDialogueParser`**: Basic dialogue extraction
- **`intelligentCastingParser`**: Advanced parsing with gender inference and voice casting
- **`singleNarratorParser`**: Converts all text to single narrator format

### Built-in LLM Providers

- **OpenAI**: GPT-4o, GPT-4o Mini
- **Gemini**: Gemini 2.0 Flash

### Built-in TTS Providers

- **OpenAI TTS**: Nova, Alloy, Echo, Fable, Onyx, Shimmer voices
- **Cartesia TTS**: Multiple high-quality voices
- **MsEdge TTS**: Microsoft Edge TTS with multilingual neural voices

## Manual Voice Assignment

The manual voice assignment feature allows you to extract all characters from your text and manually select specific voices for each character, giving you complete control over voice casting.

### Quick Example

```typescript
// Step 1: Extract characters from text
const response = await fetch('/api/extract-characters-manual', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    storyId: 'my-story',
    llmId: 'gemini-2.0-flash',
    rawTextInput: 'Your story text here...'
  })
});

const { characters, availableVoices } = await response.json();
// Returns: List of characters with their genders + all available voices

// Step 2: User selects voices (via UI)
const assignments = [
  {
    character: 'Alice',
    provider: 'kokoro',
    voiceId: 'af_heart',
    gender: 'female'
  },
  {
    character: 'Bob',
    provider: 'openai',
    voiceId: 'echo',
    gender: 'male'
  }
];

// Step 3: Apply voice assignments
await fetch('/api/set-voice-assignments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    storyId: 'my-story',
    assignments
  })
});

// Step 4: Generate script (automatically uses manual assignments)
const script = await fetch('/api/generate-script', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    storyId: 'my-story',
    llmId: 'gemini-2.0-flash',
    rawTextInput: 'Text chunk to process...'
  })
});
```

### Available TTS Voices

#### OpenAI TTS
- `echo` - US Male
- `nova` - US Female
- `shimmer` - US Female

#### MsEdge TTS
- `en-US-BrianMultilingualNeural` - US Male
- `en-US-AndrewNeural` - US Male
- `en-US-JennyMultilingualNeural` - US Female
- `en-US-AvaMultilingualNeural` - US Female
- `en-US-EmmaMultilingualNeural` - US Female

#### Kokoro TTS
- **US Female**: `af_heart`, `af_nova`, `af_sarah`, `af_alloy`, `af_aoede`, `af_bella`, `af_jessica`, `af_kore`, `af_nicole`, `af_river`, `af_sky`
- **US Male**: `am_adam`, `am_echo`, `am_eric`, `am_fenrir`, `am_liam`, `am_michael`, `am_onyx`, `am_puck`
- **UK Female**: `bf_alice`, `bf_emma`, `bf_isabella`, `bf_lily`
- **UK Male**: `bm_daniel`, `bm_george`, `bm_fable`, `bm_lewis`

### Live Demo

A working demo of the manual voice assignment feature is available at:
```
http://localhost:8080/manual-voice-assignment-example.html
```

This demo shows:
1. Character extraction from text
2. Interactive voice selection UI
3. Assignment application
4. Results visualization

For detailed documentation, see [MANUAL_VOICE_ASSIGNMENT.md](./MANUAL_VOICE_ASSIGNMENT.md)

## Advanced Usage

### Custom Plugins

```typescript
import { ModularAIFactory, LLMPlugin } from '@your-scope/modular-tts';

// Create custom LLM plugin
const customLLM: LLMPlugin = {
  id: 'custom-llm',
  name: 'Custom LLM',
  async execute(prompt: string) {
    // Your custom LLM implementation
    return 'response';
  }
};

// Register with factory
const factory = new ModularAIFactory({
  // your config
});

factory.registerLLMPlugin(customLLM);
```

### Usage Tracking

```typescript
import { getUsageTracker } from '@your-scope/modular-tts';

const tracker = getUsageTracker();

// Get usage statistics
const stats = tracker.getStats();
console.log(`Total requests: ${stats.totalRequests}`);
console.log(`Total cost: $${stats.totalCost}`);
```

### Voice Casting

```typescript
import { CastingManager } from '@your-scope/modular-tts';

const castingManager = new CastingManager();

// Ensure voice cast for characters
const characters = [
  { character: 'John', gender: 'male' },
  { character: 'Sarah', gender: 'female' }
];

const characterMap = castingManager.ensureVoiceCast(characters);
// Returns map with voice assignments
```

## Environment Variables

Set these environment variables for automatic configuration:

```bash
# Required for OpenAI services
OPENAI_API_KEY=your-openai-key

# Required for Gemini LLM
GEMINI_API_KEY=your-gemini-key

# Optional TTS providers
CARTESIA_API_KEY=your-cartesia-key
MSEDGE_API_KEY=your-msedge-key          # Optional for self-hosted instances
MSEDGE_BASE_URL=https://tts.yoread.com  # Optional, defaults to tts.yoread.com

# Kokoro TTS (self-hosted cloud instance)
KOKORO_API_URL=https://your-kokoro-url  # Required for Kokoro TTS
KOKORO_API_KEY=your-kokoro-key          # Optional if your instance requires it
```

## API Endpoints

The server exposes several REST API endpoints for text-to-speech generation:

### Core Endpoints

- **`POST /api/tts`** - Generate TTS audio for text
  ```json
  {
    "provider": "kokoro",
    "text": "Hello world",
    "voiceId": "af_heart"
  }
  ```

- **`POST /api/generate-script`** - Generate dialogue script with voice assignments
  ```json
  {
    "storyId": "my-story",
    "llmId": "gemini-2.0-flash",
    "rawTextInput": "Your text here..."
  }
  ```

- **`POST /api/casting-pipeline`** - Full casting pipeline with automatic voice assignment
  ```json
  {
    "llmId": "gemini-2.0-flash",
    "parserId": "intelligentCastingParser",
    "extractorId": "gemini-extractor",
    "rawTextInput": "Your text here..."
  }
  ```

### Manual Voice Assignment Endpoints

- **`POST /api/extract-characters-manual`** - Extract characters without auto-assigning voices
  ```json
  {
    "storyId": "my-story",
    "llmId": "gemini-2.0-flash",
    "rawTextInput": "Your full text here..."
  }
  ```
  Returns: Character list + available voices

- **`POST /api/set-voice-assignments`** - Apply manual voice assignments
  ```json
  {
    "storyId": "my-story",
    "assignments": [
      {
        "character": "Alice",
        "provider": "kokoro",
        "voiceId": "af_heart",
        "gender": "female"
      }
    ]
  }
  ```

- **`POST /api/extract-characters`** - Extract and auto-assign voices (automatic mode)

### Voice Discovery Endpoints

- **`GET /api/kokoro-voices`** - Get list of available Kokoro voices
- **`GET /api/providers`** - Get configured TTS providers

### Usage Tracking Endpoints

- **`GET /api/usage/summary`** - Get usage summary
- **`GET /api/usage/recent?limit=10`** - Get recent usage
- **`GET /api/usage/by-voice`** - Get usage by voice

For complete API documentation, see the inline code documentation.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.