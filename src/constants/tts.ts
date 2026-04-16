/**
 * Constants for TTS (Text-to-Speech) functionality
 */

/**
 * Local storage configuration
 */
export const TTS_STORAGE = {
  PREFIX: 'ebookReaderProgress_',
  MAX_AGE_MS: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * CSS classes
 */
export const TTS_CLASSES = {
  HIGHLIGHT: 'tts-highlight',
  HIGHLIGHTED_CONTENT: 'tts-highlighted-content',
} as const;

/**
 * Audio configuration
 */
export const TTS_AUDIO = {
  DEFAULT_FORMAT: 'audio-24khz-48kbitrate-mono-mp3',
  DEFAULT_SPEED: 1,
  SPEED_MIN: 0.5,
  SPEED_MAX: 2.0,
  SPEED_STEP: 0.1,
} as const;

/**
 * Voice configuration
 */
export const TTS_VOICE = {
  DEFAULT: 'en-US-BrianMultilingualNeural',
  FALLBACK: 'en-US-JennyNeural',
} as const;

/**
 * API configuration
 */
export const TTS_API = {
  ENDPOINT: '/api/tts',
  ENV_VAR: 'VITE_TTS_API_URL',
  TIMEOUT_MS: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

/**
 * Chunk processing
 */
export const TTS_CHUNK = {
  SPLIT_REGEX: /(?<=[.!?])\s+/,
  MIN_CHUNK_LENGTH: 1,
  PREFETCH_COUNT: 2,
  BUFFER_CLEAR_THRESHOLD: 50, // Clear buffer if more than 50 chunks
} as const;

/**
 * Playback timing
 */
export const TTS_TIMING = {
  AUTO_ADVANCE_CLEAR_DELAY_MS: 100,
  DEBOUNCE_DELAY_MS: 300,
  SEEK_DELAY_MS: 150,
  RETRY_DELAY_MS: 50,
} as const;

/**
 * Usage tracking
 */
export const TTS_USAGE = {
  SOURCE: 'reader',
  MIN_TRACKABLE_SECONDS: 0,
} as const;

/**
 * Error messages
 */
export const TTS_ERROR_MESSAGES = {
  NETWORK_ERROR: 'TTS service is unavailable. If it does not work contact us.',
  AUDIO_ERROR: 'Audio playback failed. If it does not work contact us.',
  SYNTHESIS_ERROR: 'TTS synthesis failed. If it does not work contact us.',
  SERVER_ERROR: 'TTS server error. If it does not work contact us.',
  UNKNOWN_ERROR: 'TTS playback failed. If it does not work contact us.',
  PREFETCH_ERROR: 'Failed to pre-fetch audio chunk. If it does not work contact us.',
  PERMISSION_ERROR: 'Permission denied for audio playback.',
  LIMIT_EXCEEDED: 'Free minutes exhausted. Please sign up to continue.',
} as const;

/**
 * Success messages
 */
export const TTS_SUCCESS_MESSAGES = {
  STARTING_FROM: (preview: string) => `Starting from: "${preview}"`,
  RESUMING: 'Resuming playback',
  SEEKING: (percentage: number) => `Starting from ${percentage}% of chapter`,
} as const;

/**
 * Info messages
 */
export const TTS_INFO_MESSAGES = {
  NOT_FOUND: 'Selected text not found. Starting from beginning of page.',
  COULD_NOT_LOCATE: 'Could not locate text position. Starting from beginning.',
  PAGE_NOT_READY: 'Page content not ready. Please wait a moment and try again.',
  SIGN_UP_REQUIRED: 'Please sign up to continue using Read Aloud',
} as const;

/**
 * Log prefixes for debugging
 */
export const TTS_LOG_PREFIXES = {
  PLAYBACK: '[playChunk]',
  PREFETCH: '[Prefetch]',
  USAGE: '[TTS Usage]',
  STATE: '[TTS State]',
  AUDIO: '[TTS Audio]',
  CHUNK: '[TTS Chunk]',
  REPOSITORY: '[TTS Repository]',
} as const;

