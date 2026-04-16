# Installation Guide

This guide will help you install and use the `@your-scope/modular-tts` package in your other projects.

## 📦 Installation Methods

### Method 1: Install from Local File (Recommended for Testing)

1. **Copy the package file** to your project directory:
   ```bash
   # Copy the .tgz file to your other project
   cp E:\custom-agents\your-scope-modular-tts-0.1.0.tgz E:\your-other-project\
   ```

2. **Install the package** in your project:
   ```bash
   cd E:\your-other-project
   npm install ./your-scope-modular-tts-0.1.0.tgz
   ```

### Method 2: Install from GitHub (After Publishing)

1. **Publish to GitHub** (if you have a repository):
   ```bash
   npm install github:yourusername/modular-tts
   ```

### Method 3: Install from npm (After Publishing to npm Registry)

1. **Publish to npm** (one-time setup):
   ```bash
   cd E:\custom-agents
   npm login
   npm publish --access public
   ```

2. **Install in any project**:
   ```bash
   npm install @your-scope/modular-tts
   ```

---

## 🚀 Usage in Your Project

### Basic Example

```typescript
import { 
  ModularAIFactory, 
  AIFactoryConfig,
  Pipeline,
  PipelineOptions 
} from '@your-scope/modular-tts';

// Configure your TTS providers
const config: AIFactoryConfig = {
  openai: { apiKey: process.env.OPENAI_API_KEY },
  gemini: { apiKey: process.env.GEMINI_API_KEY, model: 'gemini-2.0-flash' },
  msedge: { 
    apiKey: process.env.MSEDGE_API_KEY, // Optional
    baseUrl: 'https://tts.yoread.com' 
  },
  kokoro: { 
    apiUrl: process.env.KOKORO_API_URL,
    apiKey: process.env.KOKORO_API_KEY // Optional
  }
};

// Create factory
const factory = new ModularAIFactory(config);

// Use the pipeline
const pipelineOptions: PipelineOptions = {
  llmId: 'gemini-2.0-flash',
  parserId: 'persistentCastingParser',
  apiKeys: {
    gemini: process.env.GEMINI_API_KEY,
    kokoro: process.env.KOKORO_API_KEY
  }
};

const pipeline = new Pipeline(pipelineOptions);

// Process text
const result = await pipeline.process('Your text here');
```

### Using the Server (Express Integration)

```typescript
import express from 'express';
import { ModularAIFactory, CastingManager } from '@your-scope/modular-tts';

const app = express();
app.use(express.json());

// Initialize factory
const factory = new ModularAIFactory({
  kokoro: { apiUrl: process.env.KOKORO_API_URL },
  gemini: { apiKey: process.env.GEMINI_API_KEY, model: 'gemini-2.0-flash' }
});

const castingManager = new CastingManager();

// Add TTS endpoint
app.post('/api/tts', async (req, res) => {
  const { provider, text, voiceId } = req.body;
  
  const ttsProvider = factory.getTTS(provider);
  if (!ttsProvider) {
    return res.status(400).json({ error: 'Provider not found' });
  }
  
  const result = await ttsProvider.synthesizeWithMetadata(text, { voiceId });
  res.setHeader('Content-Type', 'audio/mpeg');
  result.stream.pipe(res);
});

app.listen(8080);
```

### Advanced: LLM-Powered Voice Casting

```typescript
import { ModularAIFactory, CastingManager } from '@your-scope/modular-tts';

const factory = new ModularAIFactory({
  gemini: { apiKey: process.env.GEMINI_API_KEY, model: 'gemini-2.0-flash' },
  kokoro: { apiUrl: process.env.KOKORO_API_URL },
  msedge: { baseUrl: 'https://tts.yoread.com' }
});

const castingManager = new CastingManager();

// Get current casting context
const characterMap = castingManager.getCharacterMap();

// Get available voices for LLM to choose from
const availableVoices = castingManager.getAvailableVoicesForLLM();

// Execute chain with intelligent voice casting
const script = await factory.createAndExecuteChain({
  llmIds: ['gemini-2.0-flash'],
  parserId: 'persistentCastingParser',
  rawTextInput: yourPreprocessedText,
  context: {
    CASTING_CONTEXT: JSON.stringify(characterMap, null, 2),
    AVAILABLE_VOICES: availableVoices
  }
});

// Manual voice assignments
castingManager.setManualAssignments([
  { character: 'Hero', provider: 'kokoro', voiceId: 'am_adam', gender: 'male' },
  { character: 'Narrator', provider: 'kokoro', voiceId: 'bm_george', gender: 'male' }
]);
```

---

## 🔧 Environment Variables

Create a `.env` file in your project:

```env
# Required for LLM features
GEMINI_API_KEY=your_gemini_api_key_here

# Optional TTS providers
OPENAI_API_KEY=your_openai_api_key_here
CARTESIA_API_KEY=your_cartesia_api_key_here

# Kokoro TTS (Self-hosted)
KOKORO_API_URL=https://your-kokoro-instance.cloudspaces.litng.ai
KOKORO_API_KEY=optional_api_key_here

# MsEdge TTS (Self-hosted)
MSEDGE_BASE_URL=https://tts.yoread.com
MSEDGE_API_KEY=optional_api_key_here
```

---

## 📚 Available Exports

```typescript
// Core
export { ModularAIFactory, AIFactoryConfig } from './core/ModularAIFactory';
export { CastingManager } from './core/casting-manager';
export { UsageTracker } from './core/usage-tracking';
export { AppError } from './core/AppError';

// Interfaces
export * from './interfaces/plugin-interfaces';
export * from './interfaces/tts-streamer-interface';
export * from './interfaces/casting-manager-interfaces';
export * from './interfaces/usage-tracking-interfaces';

// TTS Plugins
export { OpenAITts, OpenAITtsConfig } from './plugins/tts/openai-tts';
export { CartesiaTts, CartesiaTtsConfig } from './plugins/tts/cartesia-tts';
export { MsEdgeTts, MsEdgeTtsConfig } from './plugins/tts/msedge-tts';
export { KokoroTts, KokoroTtsConfig } from './plugins/tts/kokoro-tts';

// LLM Plugins
export * from './plugins/llm-plugins';

// Parser Plugins
export * from './plugins/parser-plugins';

// Character Extractor Plugins
export * from './plugins/character-extractor-plugins';

// API (Pipeline)
export { Pipeline, PipelineOptions } from './api';
```

---

## 🎯 Key Features

### 1. **Multiple TTS Providers**
- OpenAI TTS
- Cartesia TTS
- MsEdge TTS (self-hosted)
- Kokoro TTS (self-hosted, with retry logic for serverless cold starts)

### 2. **LLM Integration**
- OpenAI GPT-4
- Google Gemini 2.0 Flash
- Fallback chain support

### 3. **Intelligent Voice Casting**
- Automatic voice assignment based on gender
- LLM-powered voice selection based on character personality
- Manual voice assignment support
- Persistent casting across sessions

### 4. **Advanced Parsers**
- `intelligentCastingParser` - RAG-based with gender inference
- `persistentCastingParser` - LLM-powered with personality-based voice selection
- `simpleDialogueParser` - Basic dialogue extraction
- `singleNarratorParser` - Single narrator mode

### 5. **Usage Tracking**
- Track TTS usage by provider, voice, duration, cost
- Export to JSON or CSV
- Filter by date range and voice

---

## 🐛 Troubleshooting

### Kokoro TTS Timeout Issues

If Kokoro TTS is serverless and experiences cold starts:
- The package includes **automatic retry logic** (3 attempts)
- **Exponential backoff**: 2s → 4s → 8s
- **60-second timeout** per request
- Watch the logs for retry messages

### Missing Types

If TypeScript complains about missing types:
```bash
npm install --save-dev @types/node @types/express
```

### Module Resolution Issues

If you get module resolution errors:
```json
// In your tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

---

## 📖 Documentation

For more detailed documentation, see:
- [README.md](./README.md) - Full feature documentation
- [MANUAL_VOICE_ASSIGNMENT.md](./MANUAL_VOICE_ASSIGNMENT.md) - Manual voice assignment guide
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide

---

## 🔄 Updating the Package

When you make changes to the package:

1. **Update version** in `package.json`:
   ```json
   {
     "version": "0.2.0"
   }
   ```

2. **Rebuild and repack**:
   ```bash
   cd E:\custom-agents
   npm run build
   npm pack
   ```

3. **Reinstall in your project**:
   ```bash
   cd E:\your-other-project
   npm uninstall @your-scope/modular-tts
   npm install E:\custom-agents\your-scope-modular-tts-0.2.0.tgz
   ```

---

## 💡 Example Project Structure

```
your-other-project/
├── .env                          # Environment variables
├── package.json
├── src/
│   ├── index.ts                  # Your main application
│   └── services/
│       └── tts-service.ts        # TTS integration
└── node_modules/
    └── @your-scope/
        └── modular-tts/          # Installed package
```

---

## 🎉 You're Ready!

The package is now ready to use in your other projects. Simply install it and import the components you need!

