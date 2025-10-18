# Quick Start Guide - ModularTTS

This guide will help you get started with the ModularTTS system in 5 minutes. Now includes **Multi-User Support**, **Chat Thread Parser**, and **Comprehensive Audio Minute Tracking**.

## 🆕 What's New (v0.1.0+)

- **Multi-User Concurrency** - Multiple users can use the system simultaneously without conflicts
- **Chat Thread Parser** - Advanced two-step LLM process with context management
- **Audio Minute Tracking** - Comprehensive analytics of all generated audio
- **Enhanced Voice Management** - More Kokoro voices and improved consistency
- **User Identity Management** - Per-user voice assignments and session isolation

## Prerequisites

- Node.js 16+ installed
- API keys for at least one LLM provider (OpenAI or Gemini)
- (Optional) API keys for TTS providers

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Required - Choose at least one
OPENAI_API_KEY=sk-your-key-here
GEMINI_API_KEY=your-gemini-key-here

# Optional - Kokoro TTS (recommended for best quality)
KOKORO_API_URL=https://your-kokoro-instance.cloudspaces.litng.ai
KOKORO_API_KEY=optional-if-needed

# Optional - Other TTS providers
CARTESIA_API_KEY=your-cartesia-key
MSEDGE_API_KEY=optional
MSEDGE_BASE_URL=https://tts.yoread.com
```

### 3. Build the Project

```bash
npm run build
```

### 4. Start the Server

```bash
npm start
```

The server will start on `http://localhost:8080`

## 🚀 Quick Test

### 1. Open the Web Interface

Visit `http://localhost:8080` in your browser.

### 2. Try the New Chat Thread Parser

1. Select **"Chat Thread Parser (JSON-only)"** from the Parser dropdown
2. Enter some dialogue text:
   ```
   "Hello there!" said Alice. Bob looked up and replied, "Hi Alice, how are you today?"
   ```
3. Click **"Generate & Play Dialogue"**
4. The system will use the new two-step LLM process with context management

### 3. Check Audio Minute Tracking

1. Click the **"🎵 Audio Minutes"** button
2. View comprehensive statistics of all generated audio
3. See breakdown by provider and daily usage patterns

### 4. Test Multi-User Support

1. Open multiple browser tabs to `http://localhost:8080`
2. Each tab gets a unique user ID automatically
3. Assign different voices in each tab
4. Verify that voice assignments are isolated per user

## Basic Usage

### Option 1: Using the Web Interface

1. Open your browser to `http://localhost:8080`
2. Paste your text into the text area
3. Select your preferred settings:
   - **Workflow**: "Intelligent Casting (With Memory)"
   - **LLM**: "Google Gemini 2.0 Flash" (recommended)
   - **Parser**: "Persistent Casting Parser"
4. Click "Start Playback"

### Option 2: Using Manual Voice Assignment

1. Open `http://localhost:8080/manual-voice-assignment-example.html`
2. Paste your story text
3. Click "Extract Characters"
4. For each character, select:
   - **Provider** (OpenAI, MsEdge, or Kokoro)
   - **Voice** (filtered by gender)
5. Click "Apply Voice Assignments"
6. Your assignments are now saved!
7. Return to the main page and start playback

### Option 3: Using the API Directly

```javascript
// Extract characters and assign voices manually
const extractResponse = await fetch('http://localhost:8080/api/extract-characters-manual', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    storyId: 'my-story',
    llmId: 'gemini-2.0-flash',
    rawTextInput: `"Hello!" said Alice. "How are you?" replied Bob.`
  })
});

const { characters, availableVoices } = await extractResponse.json();
console.log('Characters found:', characters);

// Apply manual voice assignments
await fetch('http://localhost:8080/api/set-voice-assignments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    storyId: 'my-story',
    assignments: [
      { character: 'Alice', provider: 'kokoro', voiceId: 'af_heart', gender: 'female' },
      { character: 'Bob', provider: 'kokoro', voiceId: 'am_adam', gender: 'male' }
    ]
  })
});

// Generate script with voice assignments
const scriptResponse = await fetch('http://localhost:8080/api/generate-script', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    storyId: 'my-story',
    llmId: 'gemini-2.0-flash',
    rawTextInput: `"Hello!" said Alice. "How are you?" replied Bob.`
  })
});

const script = await scriptResponse.json();
console.log('Script with voice assignments:', script);
```

## Understanding the Workflow

### Automatic Voice Assignment Flow

```
User Input Text
     ↓
Text Preprocessing (quotes detection)
     ↓
LLM Analysis (identifies characters & dialogue)
     ↓
Automatic Voice Assignment (gender-aware)
     ↓
Script Generation (with provider & voiceId)
     ↓
TTS Audio Generation
```

### Manual Voice Assignment Flow

```
User Input Full Text
     ↓
Character Extraction (LLM analyzes entire text)
     ↓
Display Character List + Available Voices
     ↓
User Manually Selects Voices
     ↓
Apply Assignments to CastingManager
     ↓
Process Text Chunks (uses manual assignments)
     ↓
TTS Audio Generation
```

## Available Voice Options

### Narrator Voice (Default)
- **Kokoro**: `bm_george` (British Male) - Used for all narration

### Character Voices

#### OpenAI TTS (High Quality, Paid)
- `echo` - US Male
- `nova` - US Female  
- `shimmer` - US Female

#### MsEdge TTS (Good Quality, Free/Self-hosted)
- `en-US-BrianMultilingualNeural` - US Male
- `en-US-AndrewNeural` - US Male
- `en-US-JennyMultilingualNeural` - US Female
- `en-US-AvaMultilingualNeural` - US Female
- `en-US-EmmaMultilingualNeural` - US Female

#### Kokoro TTS (Best Quality, Free, Self-hosted)
- **US Female**: `af_heart`, `af_nova`, `af_sarah`, `af_alloy`, etc.
- **US Male**: `am_adam`, `am_echo`, `am_onyx`, etc.
- **UK Female**: `bf_alice`, `bf_emma`, etc.
- **UK Male**: `bm_daniel`, `bm_george`, etc.

Full list available via: `GET http://localhost:8080/api/kokoro-voices`

## Common Issues

### "No API keys configured"
**Solution**: Make sure your `.env` file has at least `OPENAI_API_KEY` or `GEMINI_API_KEY`

### "Port 8080 already in use"
**Solution**: Either:
- Stop the existing process
- Change the port in `src/server.ts`

### "Kokoro TTS not working"
**Solution**: 
- Ensure `KOKORO_API_URL` is set in `.env`
- Verify your Kokoro instance is running
- Test the URL: `curl https://your-kokoro-url/predict`

### "Characters detected but no voices assigned"
**Solution**:
- Use the manual voice assignment feature
- Or ensure you have at least one TTS provider configured

### "Same voice for all characters"
**Solution**:
- This is likely due to the LLM not detecting dialogue correctly
- Try using manual voice assignment
- Check if your text has proper quotation marks
- Use the "Persistent Casting Parser" for better results

## Next Steps

1. **Try Different Parsers**: Each parser has different strengths
   - `intelligentCastingParser` - Best for automatic casting
   - `persistentCastingParser` - Best with manual assignments
   - `simpleDialogueParser` - Fastest, basic functionality

2. **Experiment with Voices**: Try different TTS providers
   - Kokoro TTS often provides the best quality
   - OpenAI TTS is very natural but costs money
   - MsEdge TTS is a good free option

3. **Use Manual Assignment**: For important projects
   - Gives you complete control
   - Ensures consistency
   - Better character differentiation

4. **Monitor Usage**: Check the usage tracking page
   - `http://localhost:8080` → View usage stats
   - Track costs and duration
   - See which voices are used most

## Getting Help

- **Full Documentation**: See [README.md](./README.md)
- **Manual Voice Assignment Guide**: See [MANUAL_VOICE_ASSIGNMENT.md](./MANUAL_VOICE_ASSIGNMENT.md)
- **API Reference**: Check the inline code documentation
- **Examples**: Look in the `public/` directory for working examples

## Tips for Best Results

1. **Use proper formatting**: Ensure dialogue is in quotes
2. **Clear speaker attribution**: Use "said Alice" after dialogue
3. **Extract first, assign later**: Use manual voice assignment for full control
4. **Test with small chunks**: Start with a paragraph to verify settings
5. **Monitor the logs**: Check server logs for detailed processing info
6. **Save your assignments**: Manual assignments persist for the session
7. **Use consistent naming**: Character names should be identical throughout

---

**Ready to start?** Open `http://localhost:8080` and begin creating your audio narrations! 🎙️

