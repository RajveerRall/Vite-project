/**
 * TypeScript types and interfaces for TTS (Text-to-Speech) functionality
 */

/**
 * TTS Playback States
 */
export enum TTSState {
  IDLE = 'idle',
  PROCESSING = 'processing',
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  ERROR = 'error',
}

/**
 * Playback status information
 */
export interface PlaybackStatus {
  state: TTSState;
  currentChunkIndex: number | null;
  totalChunks: number;
  isAutoAdvancing: boolean;
  resumeIndex: number | null;
  hasFinished: boolean;
}

/**
 * Metadata for a text chunk
 */
export interface ChunkMetadata {
  index: number;
  text: string;
  audioUrl: string | null;
  duration: number | null;
  voice: string;
  speed: number;
  timestamp: number;
}

/**
 * TTS Configuration
 */
export interface TTSConfig {
  selectedVoice: string;
  ttsSpeed: number;
  apiUrl?: string;
  format?: string;
  autoAdvance?: boolean;
}

/**
 * Audio buffer entry
 */
export interface AudioBufferEntry {
  url: string;
  voice: string;
  timestamp: number;
}

/**
 * Usage tracking data
 */
export interface UsageTrackingData {
  chunkIndex: number;
  seconds: number;
  timestamp: number;
  source: string;
}

/**
 * TTS Progress data for persistence
 */
export interface TTSProgressData {
  index: number;
  timestamp: number;
  pageDisplay: number;
  bookTitle: string;
}

/**
 * TTS Event Handlers
 */
export interface TTSEventHandlers {
  onPlay?: (chunkIndex: number) => void;
  onPause?: (chunkIndex: number) => void;
  onResume?: (chunkIndex: number) => void;
  onStop?: () => void;
  onChunkComplete?: (chunkIndex: number) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: TTSState) => void;
}

/**
 * TTS Service interface
 */
export interface ITTSService {
  synthesize(text: string, config: TTSConfig): Promise<Blob>;
  getVoices(): Promise<string[]>;
}

/**
 * Audio Player interface
 */
export interface IAudioPlayer {
  play(url: string): Promise<void>;
  pause(): void;
  resume(): Promise<void>;
  stop(): void;
  setPlaybackRate(rate: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  isPlaying(): boolean;
  isPaused(): boolean;
}

/**
 * Chunk Service interface
 */
export interface IChunkService {
  splitText(text: string): string[];
  prefetchChunk(chunkIndex: number, text: string, config: TTSConfig): Promise<string>;
  getChunkAudio(chunkIndex: number): string | null;
  clearBuffer(): void;
  validateBuffer(chunkIndex: number, voice: string): boolean;
}

/**
 * Progress Repository interface
 */
export interface IProgressRepository {
  saveResumeIndex(bookTitle: string, pageDisplay: number, index: number): Promise<void>;
  loadResumeIndex(bookTitle: string, pageDisplay: number, pageTextLength: number): Promise<number | null>;
  clearResumeIndex(bookTitle: string, pageDisplay: number): Promise<void>;
  getStorageKey(bookTitle: string, pageDisplay: number): string | null;
}

/**
 * Error types
 */
export type TTSErrorType = 
  | 'NETWORK_ERROR'
  | 'AUDIO_ERROR'
  | 'SYNTHESIS_ERROR'
  | 'BUFFER_ERROR'
  | 'PERMISSION_ERROR'
  | 'LIMIT_EXCEEDED'
  | 'UNKNOWN_ERROR';

export interface TTSError extends Error {
  type: TTSErrorType;
  chunkIndex?: number;
  recoverable: boolean;
}

/**
 * Highlighting options
 */
export interface HighlightOptions {
  highlightClass?: string;
  escapeHtml?: boolean;
}

/**
 * Playback strategy type
 */
export type PlaybackStrategyType = 'seamless' | 'html5' | 'auto';

/**
 * Playback strategy configuration
 */
export interface PlaybackStrategyConfig {
  type?: PlaybackStrategyType;
  playbackRate?: number;
  instanceId?: string;
}

/**
 * Usage event with idempotency support
 */
export interface UsageEvent {
  id: string;
  userId?: string;
  sessionId?: string;
  seconds: number;
  source: string;
  timestamp: number;
  checksum?: string;
  metadata?: Record<string, any>;
}

/**
 * Validation result for usage events
 */
export interface UsageEventValidation {
  valid: boolean;
  errors?: string[];
}

