/**
 * TTS hooks barrel export
 */

export { useTTSStateMachine } from './useTTSStateMachine';
export { useTTSChunks } from './useTTSChunks';
export type { TTSStateMachineReturn } from './useTTSStateMachine';
export type { UseTTSChunksReturn } from './useTTSChunks';

// Chunking utilities (refactored from useReaderTTS.ts)
export { useTTSChunking } from './useTTSChunking';
export type { UseTTSChunkingOptions, UseTTSChunkingReturn } from './useTTSChunking';
export { splitTextIntoChunks, getAbbreviations } from './chunkingUtils';

// Progress persistence (refactored from useReaderTTS.ts)
export { useTTSProgress } from './useTTSProgress';
export type { UseTTSProgressOptions, UseTTSProgressReturn } from './useTTSProgress';

// Playback state management (refactored from useReaderTTS.ts)
export { useTTSPlaybackState } from './useTTSPlaybackState';
export type {
    PlaybackState,
    UseTTSPlaybackStateOptions,
    UseTTSPlaybackStateReturn
} from './useTTSPlaybackState';

// Buffering and prefetching (refactored from useReaderTTS.ts)
export { useTTSBuffering } from './useTTSBuffering';
export type { UseTTSBufferingProps, UseTTSBufferingReturn } from './useTTSBuffering';

// Navigation (refactored from useReaderTTS.ts)
export { useTTSNavigation } from './useTTSNavigation';
export type { UseTTSNavigationProps } from './useTTSNavigation';


