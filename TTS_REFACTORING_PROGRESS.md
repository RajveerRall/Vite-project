# TTS Hook Refactoring Progress

## Completed Phases

### ✅ Phase 1: Foundation (Types, Constants, Repository)
- ✅ Created `src/types/tts.ts` with comprehensive TypeScript interfaces
- ✅ Created `src/constants/tts.ts` with extracted constants
- ✅ Created `src/repositories/TTSProgressRepository.ts` for storage operations
- ✅ Updated `useReaderTTS.ts` to use repository pattern

### ✅ Phase 2: Service Layer Extraction
- ✅ Created `src/services/tts/TTSErrorHandler.ts` - Centralized error handling
- ✅ Created `src/services/tts/TTSUsageTracker.ts` - Usage tracking service
- ✅ Created `src/services/tts/TTSChunkService.ts` - Chunk fetching and buffering
- ✅ Created `src/services/tts/TTSHighlightService.ts` - Highlighting HTML generation
- ✅ Created `src/services/tts/TTSAudioPlayer.ts` - Audio element management

### 🚧 Phase 3: State Machine & Hooks (In Progress)
- ✅ Created `src/hooks/tts/useTTSStateMachine.ts` - State machine for playback states
- ✅ Created `src/hooks/tts/useTTSChunks.ts` - Chunk management hook
- ✅ Created `src/hooks/tts/index.ts` - Barrel export
- ⏳ Remaining hooks to create:
  - `useTTSPlayback.ts` - Playback control
- - `useTTSNavigation.ts` - Navigation hook
- - `useTTSProgress.ts` - Progress and seeking hook
- - `useTTSHighlighting.ts` - Highlighting hook

### ⏳ Phase 4: Refactor Main Hook (Pending)
- Integration of all services and hooks into `useReaderTTS.ts`
- Maintain backward compatibility with existing API
- Reduce file size from ~1213 lines to ~200-300 lines

### ⏳ Phase 5: Strategy Pattern (Optional)
- TTS strategy interfaces
- Azure TTS strategy implementation
- Kokoro TTS strategy implementation

## Design Patterns Implemented

1. ✅ **Repository Pattern** - `TTSProgressRepository`
2. ✅ **Service Layer Pattern** - All service classes
3. ✅ **State Machine Pattern** - `useTTSStateMachine`
4. 🚧 **Custom Hooks Composition** - In progress
5. ⏳ **Strategy Pattern** - Optional enhancement

## Benefits Achieved So Far

- **Separation of Concerns**: Storage, error handling, and chunk processing are now isolated
- **Type Safety**: Comprehensive TypeScript interfaces
- **Reusability**: Services can be used independently
- **Testability**: Services can be unit tested separately
- **Maintainability**: Smaller, focused files

## Next Steps

1. Complete remaining Phase 3 hooks
2. Refactor `useReaderTTS.ts` to use new services and hooks
3. Test integration and maintain backward compatibility
4. Optionally implement strategy pattern for TTS providers

