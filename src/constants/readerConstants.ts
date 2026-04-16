// src/constants/readerConstants.ts
// Constants for Reader component and related functionality

/**
 * Full Cast audiobook constants
 */
export const FULL_CAST_MAX_CHARS = 2400; // Maximum characters per chunk
export const FULL_CAST_LOOKAHEAD = 3; // Number of audio items to buffer

/**
 * UI timing constants (in milliseconds)
 */
export const FEATURE_HIGHLIGHT_DELAY = 2000; // Delay before showing feature highlight
export const PROGRESSIVE_ENHANCEMENT_DELAY = 500; // Delay before enabling enhanced features
export const NAVIGATION_ARROWS_TIMEOUT = 3000; // Timeout for navigation arrows visibility
export const FULL_CAST_RETRY_DELAY = 800; // Retry delay for failed Full Cast chunks
export const CONSUMER_RETRY_DELAY = 300; // Retry delay for audio consumer

/**
 * Responsive breakpoints
 */
export const MOBILE_BREAKPOINT = 768; // md breakpoint in pixels

/**
 * Full Cast status messages
 */
export const FULL_CAST_STATUS = {
  STARTING: 'Starting…',
  BUFFERING: 'Buffering…',
  CASTING: (chunk: number, total: number) => `Casting (chunk ${chunk}/${total})…`,
  PLAYING: 'Playing…',
  PAUSED: 'Paused',
  TAP_TO_START: 'Tap to start audio',
} as const;

