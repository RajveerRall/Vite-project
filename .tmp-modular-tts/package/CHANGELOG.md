# Changelog

All notable changes to the ModularTTS project will be documented in this file.

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

