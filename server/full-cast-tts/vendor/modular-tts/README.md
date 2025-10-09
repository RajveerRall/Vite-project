# ModularTTS

A flexible, modular text-to-speech pipeline with support for multiple LLMs, parsers, and TTS providers.

## Features

- 🔌 **Pluggable Architecture**: Easily swap between different LLMs, parsers, and TTS providers
- 🎭 **Character Voice Casting**: Intelligent voice assignment for different characters in dialogue
- 📚 **Multiple Parsing Options**:
  - Simple dialogue parsing
  - Intelligent casting with memory
  - Single narrator for audiobook-style narration
- 🤖 **Multiple LLM Support**:
  - OpenAI (GPT-4o, GPT-4o-mini)
  - Google Gemini
- 🔊 **Multiple TTS Providers**:
  - OpenAI TTS
  - Cartesia TTS
- 🧩 **Extensible**: Create your own plugins for custom functionality

## Installation

```bash
npm install modular-tts
```

## Quick Start

```typescript
import { createPipeline } from 'modular-tts';

// Create a pipeline with default options
const pipeline = createPipeline({
  llm: 'gpt-4o',
  parser: 'singleNarratorParser',
  apiKeys: {
    openai: 'your-openai-api-key'
  }
});

// Process text
async function processText() {
  const result = await pipeline.process(
    'The king entered the room. "What news do you bring?" he asked the messenger. ' +
    'The messenger bowed deeply. "Your Majesty, the dragons have returned."'
  );
  
  console.log(result.script);
}

processText();
```

## Usage Examples

### Single Narrator (Audiobook Style)

```typescript
import { createPipeline } from 'modular-tts';

const pipeline = createPipeline({
  llm: 'gpt-4o',
  parser: 'singleNarratorParser',
  apiKeys: {
    openai: 'your-openai-api-key'
  }
});

const result = await pipeline.process(
  'The king entered the room. "What news do you bring?" he asked the messenger. ' +
  'The messenger bowed deeply. "Your Majesty, the dragons have returned."'
);

// Result will have a single Narrator entry with all text converted to narration style
```

### Multiple Character Voices with Memory

```typescript
import { createPipeline } from 'modular-tts';

const pipeline = createPipeline({
  llm: 'gpt-4o',
  parser: 'intelligentCastingParser',
  useVoiceCasting: true,
  apiKeys: {
    openai: 'your-openai-api-key'
  }
});

// First chunk of text
const result1 = await pipeline.process(
  'The king entered the throne room. "What news do you bring?" he asked the messenger.'
);

// Second chunk - character voices will be consistent with the first chunk
const result2 = await pipeline.process(
  'The messenger bowed deeply. "Your Majesty, the dragons have returned."'
);
```

### Using Google Gemini

```typescript
import { createPipeline } from 'modular-tts';

const pipeline = createPipeline({
  llm: 'gemini-2.0-flash',
  parser: 'simpleDialogueParser',
  apiKeys: {
    gemini: 'your-gemini-api-key',
    openai: 'your-openai-api-key' // For TTS
  }
});

const result = await pipeline.process(
  'The king entered the room. "What news do you bring?" he asked the messenger.'
);
```

## API Reference

### createPipeline(options)

Creates a new text processing pipeline.

**Options:**

- `llm`: The LLM provider to use (e.g., 'gpt-4o', 'gemini-2.0-flash')
- `parser`: The parser to use (e.g., 'simpleDialogueParser', 'intelligentCastingParser', 'singleNarratorParser')
- `apiKeys`: API keys for different services
  - `openai`: OpenAI API key
  - `gemini`: Google Gemini API key
  - `cartesia`: Cartesia API key
- `useVoiceCasting`: Whether to use voice casting memory between calls

### Pipeline Methods

#### process(text)

Processes text through the pipeline.

**Parameters:**
- `text`: The raw text to process

**Returns:**
- `script`: The parsed dialogue script
- `audio`: Audio URLs for each line (if TTS was requested)

#### resetCasting()

Resets the casting memory.

## Advanced Usage

### Creating Custom Plugins

You can create custom plugins for LLMs, parsers, and TTS providers:

```typescript
import { registerParserPlugin, ParserPlugin, DialogueScript } from 'modular-tts';

// Create a custom parser
const myCustomParser: ParserPlugin<DialogueScript> = {
  id: 'myCustomParser',
  name: 'My Custom Parser',
  description: 'A custom parser for special formatting',
  promptTemplate: `
    Custom prompt template here...
    {TEXT_INPUT}
  `,
  parse(llmOutput: string): DialogueScript {
    // Custom parsing logic
    try {
      const result = JSON.parse(llmOutput);
      // Process result...
      return result.dialogue;
    } catch (e) {
      return [{ character: 'System', dialogue: 'Error parsing output', gender: 'neutral' }];
    }
  }
};

// Register the custom parser
registerParserPlugin(myCustomParser);

// Use your custom parser
const pipeline = createPipeline({
  parser: 'myCustomParser',
  // ...other options
});
```

## License

MIT
