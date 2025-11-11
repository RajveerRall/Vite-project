# Changelog

All notable changes to the ModularTTS project will be documented in this file.

## [2.0.0] - 2025-10-23

### Major Features Added

#### Modular Architecture System
- **Agent System**: New `Agent` class for encapsulating LLM calls with specific roles and objectives
- **Chain Execution**: `Chain` and `Pipeline` classes for sequential agent workflows
- **Workflow Class**: Complete end-to-end pipelines with TTS integration
- **Schema Builders**: `SchemaBuilder` utility for creating Zod schemas for output validation
- **Custom Parsers**: `defineParser` helper for creating custom output parsers
- **Agent Presets**: Pre-configured agents (`Agents.speaker()`, `Agents.voice()`, `Agents.narrator()`, `Agents.emotion()`)
- **Parser Presets**: Pre-configured parsers (`Parsers.dialogue()`, `Parsers.emotion()`, `Parsers.speaker()`)

#### Timing & SRT Support
- **Word-level Timing**: Precise timing data for each word in audio (Kokoro, MsEdge)
- **Sentence-level Timing**: Timing data for complete sentences
- **SRT Subtitle Generation**: Automatic SubRip subtitle file creation
- **Base64 Encoding**: Safe transport of SRT content in HTTP headers
- **Download Support**: Direct download of SRT files

#### New API Endpoints
- `POST /api/workflows/complete-tts` - Complete end-to-end TTS workflow with timing/SRT
- `POST /api/tts/with-timing` - TTS with timing data in headers
- `POST /api/tts/srt` - SRT generation only
- `POST /api/tts/with-srt` - TTS with SRT content in response
- `POST /api/workflows/emotion-analysis` - Emotion analysis workflow
- `POST /api/workflows/speaker-identification` - Speaker identification workflow
- `POST /api/workflows/intelligent-casting` - Intelligent casting workflow
- `POST /api/workflows/chat-thread-enhanced` - Enhanced chat thread workflow

#### TTS Provider Enhancements
- **Kokoro TTS**: Added timing and SRT support with Base64 encoding
- **MsEdge TTS**: Added timing and SRT support via tts.yoread.com
- **MsEdge Native TTS**: Graceful handling of timing/SRT parameters (not supported)
- **Provider Routing Fix**: Corrected TTS service selection based on dialogue provider

#### Voice Pool Updates
- **MsEdge TTS**: 4 voices (en-US-AndrewNeural, en-US-AvaMultilingualNeural, en-US-BrianMultilingualNeural, en-US-EmmaMultilingualNeural)
- **Kokoro TTS**: 30+ voices (bm_george, af_bella, am_adam, etc.)
- **OpenAI TTS**: 6 voices (nova, alloy, echo, fable, onyx, shimmer)
- **Removed**: MsEdge Native TTS voices (19 voices) from default pool to prevent confusion

#### Bug Fixes
- **Provider/Voice Mismatch**: Fixed issue where LLM was setting provider field to voiceId instead of provider name
- **Dialogue Extraction**: Fixed workflow result extraction from nested agent outputs
- **SRT Header Encoding**: Implemented Base64 encoding for SRT content to avoid newline issues
- **Text Sanitization**: Added sanitization for TTS to prevent vocalization of special characters
- **Comprehensive Logging**: Added detailed debugging logs throughout the system

#### Documentation Updates
- **README.md**: Added Timing & SRT Support section with examples
- **SDK_DOCUMENTATION.md**: Updated with modular architecture and new API changes
- **TIMING_SRT_IMPLEMENTATION.md**: Created comprehensive timing/SRT implementation guide
- **Examples**: Added custom agent workflows, parser examples, and multi-step chains

#### Breaking Changes
- **MsEdge Native Voices**: Removed from default voice pool (can still be used if specifically requested)
- **API Response Format**: Some endpoints now return additional timing/SRT fields

#### Migration Guide
- Existing code continues to work without changes
- New modular features are opt-in
- Voice assignments may need updating if using specific MsEdge Native voices

---

## [Unreleased]

### Added - Manual Voice Assignment Feature (2025-10-09)

#### New API Endpoints
- `POST /api/extract-characters-manual` - Extract characters from text without auto-assigning voices
  - Returns list of characters with genders
  - Returns all available voices grouped by provider
  - Allows users to manually select voices before processing

- `POST /api/set-voice-assignments` - Apply manual voice assignments
  - Accepts user-selected voice assignments for characters
  - Persists assignments in CastingManager for the session
  - Ensures consistency across all text chunks

#### New Features
- **Manual Voice Selection UI** - `public/manual-voice-assignment-example.html`
  - Interactive character list display
  - Provider and voice selection dropdowns
  - Gender-aware voice filtering
  - Real-time assignment preview
  - Results visualization

- **CastingManager Enhancement**
  - Added `setManualAssignments()` method
  - Allows overriding automatic voice assignments
  - Tracks used voices to prevent conflicts
  - Comprehensive logging for debugging

#### TTS Provider Updates
- **Kokoro TTS Integration**
  - Added support for Kokoro TTS provider
  - 27 high-quality voices (US/UK, Male/Female)
  - Self-hosted cloud instance support
  - Voice discovery endpoint: `GET /api/kokoro-voices`
  - Configuration via `KOKORO_API_URL` and `KOKORO_API_KEY`

- **MsEdge TTS Updates**
  - Made API key optional for self-hosted instances
  - Added `MSEDGE_BASE_URL` configuration
  - Changed from POST to GET requests for better compatibility
  - Updated voice list to only include available voices
  - Removed unsupported voices: `en-US-GuyNeural`, `en-GB-RyanNeural`, `en-GB-SoniaNeural`

#### Narrator Voice Update
- Changed default narrator voice from OpenAI `onyx` to Kokoro `bm_george` (British Male)
- Provides better distinction between narration and character dialogue

#### Documentation
- Created `MANUAL_VOICE_ASSIGNMENT.md` - Complete guide for manual voice assignment
- Created `QUICKSTART.md` - 5-minute quick start guide for new users
- Updated `README.md` with:
  - Manual voice assignment section
  - Complete API endpoint documentation
  - Full voice list for all providers
  - Environment variable documentation
  - Table of contents

#### Bug Fixes
- Fixed issue where LLM was misidentifying speakers in dialogue
- Added "CRITICAL RULES FOR SPEAKER IDENTIFICATION" to `persistentCastingParser`
- Updated text preprocessing to handle smart quotes (`" "`) in addition to straight quotes
- Fixed character extraction to use full text instead of chunks for better consistency

#### Breaking Changes
- None - All changes are backward compatible

---

## [0.1.0] - Previous Version

### Features
- Multiple LLM support (OpenAI GPT-4o, Gemini 2.0 Flash)
- Multiple parser plugins (Simple, Intelligent Casting, Single Narrator)
- TTS providers (OpenAI TTS, Cartesia TTS)
- Automatic voice casting with gender awareness
- Usage tracking and analytics
- OCR support via Gemini
- TypeScript support

### TTS Providers
- OpenAI TTS with multiple voices
- Cartesia TTS integration

### Parsers
- `simpleDialogueParser` - Basic dialogue extraction
- `intelligentCastingParser` - Advanced parsing with gender inference
- `singleNarratorParser` - Single narrator mode

### API Endpoints
- `POST /api/tts` - Generate TTS audio
- `POST /api/casting-pipeline` - Full casting pipeline
- `GET /api/usage/*` - Usage tracking endpoints

---

## Version Numbering

This project uses Semantic Versioning (semver):
- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backward-compatible manner
- **PATCH** version for backward-compatible bug fixes

## Contributing

When adding new features, please update this changelog with:
1. The feature name and date
2. What was added/changed/removed
3. Any breaking changes
4. Related documentation updates

## Links

- [README](./README.md)
- [Quick Start Guide](./QUICKSTART.md)
- [Manual Voice Assignment Guide](./MANUAL_VOICE_ASSIGNMENT.md)

