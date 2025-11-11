# ModularTTS

A flexible, modular text-to-speech pipeline with support for multiple LLMs, parsers, and TTS providers.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Modular Architecture](#modular-architecture)
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
- **Timing & SRT Support**: Word-level timing data and SRT subtitle generation (Kokoro, MsEdge)
- **Modular Architecture**: Agent-based system with chains and workflows for complex pipelines

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

## Modular Architecture

ModularTTS now supports a flexible, extensible architecture that allows you to customize prompts, parsers, and workflows without modifying source code. This gives you the creative freedom to build sophisticated text processing pipelines.

### Key Features

- **Configurable Prompts**: Define custom system prompts and instructions
- **Custom Parsers**: Create parsers with Zod schema validation
- **Agent System**: Build multi-agent workflows with specialized roles
- **Chainable Pipelines**: Create complex multi-step processing chains
- **Schema Builder**: Define custom output schemas with validation
- **Preset Components**: Use built-in agents and parsers for quick starts

### Basic Agent Usage

```typescript
import { createAgent, defineParser, SchemaBuilder, z } from '@your-scope/modular-tts';

// Define custom output schema
const emotionSchema = SchemaBuilder.dialogue(
  z.object({
    emotion: z.enum(['happy', 'sad', 'angry', 'neutral']),
    intensity: z.number().min(0).max(1)
  })
);

// Create custom parser
const emotionParser = defineParser({
  id: 'emotion-analyzer',
  name: 'Emotion Analyzer',
  instruction: 'Analyze emotions in dialogue and return structured data',
  outputSchema: emotionSchema
});

// Create agent with custom configuration
const agent = createAgent({
  llm: 'openai',
  model: 'gpt-4o',
  systemPrompt: 'You are an expert emotion analyst specializing in dialogue interpretation.',
  outputParser: emotionParser
});

// Use the agent
const result = await agent.run('"I can\'t believe you did that!" she shouted angrily.');
console.log(result); // { character: "she", text: "I can't believe you did that!", emotion: "angry", intensity: 0.8 }
```

### Multi-Agent Workflows

```typescript
import { Chain, Agents, defineAgent } from '@your-scope/modular-tts';

// Define specialized agents
const speakerAgent = defineAgent({
  role: 'Speaker Identifier',
  objective: 'Identify all speakers in dialogue with 100% accuracy',
  context: 'Expert in literary analysis with 10 years experience',
  llm: 'openai',
  model: 'gpt-4o'
});

const voiceAgent = defineAgent({
  role: 'Voice Casting Director',
  objective: 'Match perfect voices to character personalities',
  context: 'Award-winning audiobook casting director',
  llm: 'openai',
  model: 'gpt-4o'
});

// Build processing chain
const audioBookChain = new Chain()
  .then('identify_speakers', speakerAgent)
  .then('assign_voices', voiceAgent, ctx => ({
    speakers: ctx.identify_speakers,
    availableVoices: ['am_adam', 'af_alice', 'bm_george', 'bf_bella']
  }));

// Execute chain
const result = await audioBookChain.run({ text: bookChapter });
console.log('Speakers:', result.identify_speakers);
console.log('Voice Assignment:', result.assign_voices);
```

### Quick Start with Presets

```typescript
import { Agents, Parsers, Chain } from '@your-scope/modular-tts';

// Use preset agents for quick setup
const quickChain = new Chain()
  .pipe(Agents.speaker('gpt-4o'))
  .pipe(Agents.voice('gpt-4o'));

const result = await quickChain.run(text);
```

### Complete End-to-End Workflows

```typescript
import { Workflow, Agents } from '@your-scope/modular-tts';

// Create a complete workflow that handles everything
const completeWorkflow = new Workflow({ userId: 'user123' })
  .addAgent('assign_voices', Agents.voiceAssigner('gpt-4o'), (ctx) => ({
    text: ctx.input,
    availableVoices: workflow.getAvailableVoices()
  }))
  .synthesize({ provider: 'kokoro' }); // Optional: generate audio

const result = await completeWorkflow.execute(
  'The King said, "Hello daughter." The Princess replied, "Hello father."'
);

// result.dialogue contains complete voice assignments
// result.audio contains generated audio buffers (if synthesize() used)
console.log('Dialogue:', result.dialogue);
console.log('Audio:', result.audio);
```

### Available Preset Agents

- `Agents.speaker(llm)` - Identify dialogue speakers
- `Agents.voice(llm)` - Assign voices to characters  
- `Agents.voiceAssigner(llm)` - Complete voice assignment with provider/voiceId
- `Agents.emotion(llm)` - Analyze emotions in dialogue
- `Agents.narrator(llm)` - Generate narration

### Available Preset Parsers

- `Parsers.dialogue()` - Basic dialogue format
- `Parsers.emotion()` - Emotion analysis format
- `Parsers.speaker()` - Speaker identification format
- `Parsers.voiceAssignment()` - Complete voice assignment format

### Custom Schema Validation

```typescript
import { SchemaBuilder, defineParser, z } from '@your-scope/modular-tts';

// Create custom schema with additional fields
const personalitySchema = SchemaBuilder.dialogue(
  z.object({
    accent: z.enum(['american', 'british', 'australian']),
    age: z.enum(['young', 'middle', 'old']),
    personality: z.enum(['cheerful', 'serious', 'mysterious'])
  })
);

const personalityParser = defineParser({
  id: 'personality-parser',
  name: 'Personality Parser',
  instruction: 'Analyze character personality traits from dialogue',
  outputSchema: personalitySchema
});
```

### Available Presets

**Agents:**
- `Agents.speaker()` - Identify dialogue speakers
- `Agents.voice()` - Assign voices to characters
- `Agents.narrator()` - Convert text to narration
- `Agents.emotion()` - Analyze emotional content

**Parsers:**
- `Parsers.dialogue()` - Basic dialogue extraction
- `Parsers.emotion()` - Emotion analysis
- `Parsers.speaker()` - Speaker identification
- `Parsers.json(schema)` - Custom JSON with validation

### Migration from Legacy API

The new modular architecture is 100% backward compatible:

```typescript
// ✅ Old way still works
const pipeline = createPipeline({
  llm: 'gpt-4o',
  parser: 'intelligentCastingParser'
});

// ✅ New way adds flexibility
const agent = createAgent({
  llm: 'gpt-4o',
  systemPrompt: myCustomPrompt,
  outputParser: myCustomParser
});
```

For more examples, see the `examples/` directory:
- `examples/custom-agent-workflow.ts` - Complete workflow example
- `examples/custom-parser.ts` - Parser customization
- `examples/multi-step-chain.ts` - Chain/Pipeline examples
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

## Timing & SRT Support

ModularTTS v2.0.0 introduces advanced timing and subtitle generation capabilities for Kokoro and MsEdge TTS providers.

### Features

- **Word-level Timing**: Precise timing data for each word in the audio
- **Sentence-level Timing**: Timing data for complete sentences
- **SRT Subtitle Generation**: Automatic SubRip subtitle file creation
- **Base64 Encoding**: Safe transport of SRT content in HTTP headers
- **Download Support**: Direct download of SRT files

### Supported Providers

- **Kokoro TTS**: Full timing and SRT support
- **MsEdge TTS**: Full timing and SRT support via tts.yoread.com
- **OpenAI TTS**: Basic support (timing/SRT not available)
- **Cartesia TTS**: Basic support (timing/SRT not available)

### Usage Examples

#### Basic Timing & SRT Request

```typescript
import { createPipeline } from '@your-scope/modular-tts';

const pipeline = createPipeline({
  llm: 'gpt-4o',
  parser: 'intelligentCastingParser',
  apiKeys: {
    openai: 'your-openai-api-key'
  }
});

// Process text with timing and SRT
const result = await pipeline.processText({
  text: "Hello world! This is a test.",
  provider: 'kokoro', // or 'msedge'
  includeTiming: true,
  includeSrt: true
});

// Access timing data
console.log('Word timings:', result.wordTimings);
console.log('Sentence timings:', result.sentenceTimings);
console.log('SRT content:', result.srtContent);
```

#### Complete TTS Workflow with Timing

```typescript
import { Workflow, Agents } from '@your-scope/modular-tts';

const workflow = new Workflow()
  .addAgent(Agents.voiceAssigner())
  .synthesize({
    provider: 'msedge',
    includeTiming: true,
    includeSrt: true
  });

const result = await workflow.execute("The King said, 'Hello world!'");

// Each dialogue line includes timing and SRT data
result.audioResults.forEach(audio => {
  console.log('Character:', audio.character);
  console.log('Word timings:', audio.wordTimings);
  console.log('SRT:', audio.srtContent);
});
```

#### API Endpoints

**Complete TTS Workflow with Timing:**
```bash
POST /api/workflows/complete-tts
{
  "text": "Your text here",
  "llm": "gpt-4o",
  "provider": "kokoro",
  "includeTiming": true,
  "includeSrt": true
}
```

**Direct TTS with Timing:**
```bash
POST /api/tts/with-timing
{
  "text": "Your text here",
  "voice": "bm_george",
  "provider": "kokoro",
  "includeTiming": true
}
```

**SRT Generation Only:**
```bash
POST /api/tts/srt
{
  "text": "Your text here",
  "voice": "en-US-AndrewNeural",
  "provider": "msedge"
}
```

### SRT Format

Generated SRT files follow the standard SubRip format:

```srt
1
00:00:00,000 --> 00:00:01,250
Hello world!

2
00:00:01,250 --> 00:00:03,500
This is a test of timing.
```

### Voice Pool Updates

**Available Voices (v2.0.0):**
- **MsEdge TTS**: 4 voices (en-US-AndrewNeural, en-US-AvaMultilingualNeural, en-US-BrianMultilingualNeural, en-US-EmmaMultilingualNeural)
- **Kokoro TTS**: 30+ voices (bm_george, af_bella, am_adam, etc.)
- **OpenAI TTS**: 6 voices (nova, alloy, echo, fable, onyx, shimmer)

**Removed from Default Pool:**
- **MsEdge Native TTS**: 19 voices (removed to prevent confusion with timing/SRT features)

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