/**
 * Standalone TTS utility for AI Chat summaries
 * Uses the same TTS API and method as the main reader TTS
 * Supports pause/resume functionality via AdaptivePlaybackStrategy
 */

import { getUsageTracker, initializeUsageTracking } from '../services/tts/index';
import { createAdaptivePlaybackStrategy } from '../services/tts/strategies/AdaptivePlaybackStrategy';
import { IPlaybackStrategy } from '../services/tts/strategies/IPlaybackStrategy';

// ============================================================================
// Constants (matching main reader TTS)
// ============================================================================

const PREFETCH_CHUNK_COUNT = 4; // Buffer size - prefetch 4 chunks ahead
const MAX_AUDIO_BUFFER_SIZE = 10; // Max buffered chunks to prevent memory bloat

// Helper: split text into sentence chunks (same as main reader)
function splitTextIntoChunks(text: string): string[] {
  // Common abbreviations that should NOT trigger sentence splits
  // These are patterns that end with a period but aren't sentence endings
  const abbreviations = [
    // Titles
    'Dr\\.', 'Mr\\.', 'Mrs\\.', 'Ms\\.', 'Prof\\.', 'Rev\\.', 'Sr\\.', 'Jr\\.', 'Esq\\.',
    // Time
    'A\\.M\\.', 'P\\.M\\.', 'a\\.m\\.', 'p\\.m\\.',
    // Locations
    'U\\.S\\.', 'U\\.K\\.', 'E\\.U\\.', 'U\\.S\\.A\\.',
    // Latin
    'etc\\.', 'i\\.e\\.', 'e\\.g\\.', 'vs\\.', 'et al\\.',
    // Academic
    'Ph\\.D\\.', 'M\\.D\\.', 'B\\.A\\.', 'M\\.A\\.', 'B\\.S\\.', 'M\\.S\\.',
    // Common
    'Inc\\.', 'Ltd\\.', 'Corp\\.', 'Co\\.',
    // Additional common ones
    'St\\.', 'Ave\\.', 'Blvd\\.', 'Rd\\.', 'No\\.', 'Vol\\.', 'Ch\\.', 'pp\\.'
  ];
  
  // Create a regex pattern to match abbreviations (case-insensitive)
  const abbreviationPattern = new RegExp(
    `\\b(${abbreviations.join('|')})\\b`,
    'gi'
  );
  
  // Step 1: Normalize spacing after sentence-ending punctuation
  // Add space after punctuation when followed by a letter (fixes "warm.A" → "warm. A")
  // But skip if the punctuation is part of an abbreviation
  let normalizedText = text;
  
  // First, temporarily mark abbreviations to protect them
  const abbreviationMap = new Map<string, string>();
  let placeholderIndex = 0;
  
  normalizedText = normalizedText.replace(abbreviationPattern, (match) => {
    const placeholder = `__ABBR_${placeholderIndex}__`;
    abbreviationMap.set(placeholder, match);
    placeholderIndex++;
    return placeholder;
  });
  
  // Now normalize spacing after punctuation (only when followed by a letter)
  normalizedText = normalizedText.replace(/([.!?])([A-Za-z])/g, '$1 $2');
  
  // Restore abbreviations
  abbreviationMap.forEach((abbreviation, placeholder) => {
    normalizedText = normalizedText.replace(placeholder, abbreviation);
  });
  
  // Step 2: Split on sentence boundaries, avoiding abbreviations
  // Create a function to check if a potential split point is an abbreviation
  const isAbbreviationAtPosition = (text: string, position: number): boolean => {
    // Look back to find the word before the punctuation (up to 50 chars for longer contexts)
    const beforePunct = text.substring(Math.max(0, position - 50), position);
    const words = beforePunct.trim().split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    const lastTwoWords = words.slice(-2).join(' ');
    
    // Check if last word + period matches an abbreviation
    const wordWithPeriod = lastWord + text[position];
    const isSingleWordAbbr = abbreviations.some(abbr => {
      const abbrClean = abbr.replace(/\\/g, ''); // Remove regex escaping
      const pattern = new RegExp(`^${abbrClean}$`, 'i');
      return pattern.test(wordWithPeriod);
    });
    
    // Check for multi-word abbreviations like "et al."
    const isMultiWordAbbr = /et\s+al\./i.test(lastTwoWords + text[position]);
    
    return isSingleWordAbbr || isMultiWordAbbr;
  };
  
  // Split manually, checking each potential split point
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    currentChunk += char;
    
    // Check if we hit a potential sentence boundary
    if (/[.!?]/.test(char)) {
      const nextChar = normalizedText[i + 1];
      const isEndOfText = i === normalizedText.length - 1;
      const isFollowedBySpace = nextChar === ' ' || nextChar === '\n' || nextChar === '\t';
      
      if ((isFollowedBySpace || isEndOfText) && !isAbbreviationAtPosition(normalizedText, i)) {
        // This is a real sentence boundary
        const trimmed = currentChunk.trim();
        if (trimmed.length > 0) {
          chunks.push(trimmed);
        }
        currentChunk = '';
        
        // Skip the space
        if (isFollowedBySpace) {
          i++; // Skip the space character
        }
      }
    }
  }
  
  // Add remaining text
  const trimmed = currentChunk.trim();
  if (trimmed.length > 0) {
    chunks.push(trimmed);
  }
  
  return chunks;
}

export interface StandaloneTTSOptions {
  userId?: string;
  sessionId?: string;
  onError?: (error: Error) => void;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onPlaybackPause?: () => void;
  onPlaybackResume?: () => void;
  voice?: string;
  speed?: number;
}

export interface StandaloneTTSController {
  pause: () => void;
  resume: () => Promise<void>;
  stop: () => void;
  isPlaying: () => boolean;
  isPaused: () => boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

interface TTSConfig {
  apiUrl: string;
  voice: string;
  speed: number;
}

interface ChunkData {
  blob: Blob;
  duration: number;
}

// ============================================================================
// Internal State Management (per-instance)
// ============================================================================

interface PlaybackState {
  bufferedChunks: Map<number, ChunkData>; // Track which chunks are buffered
  inFlightPrefetches: Set<number>; // Prevent duplicate fetches
  currentChunkIndex: number | null; // Currently playing chunk
  audioUrls: string[]; // HTML5 blob URLs for cleanup
  chunks: string[]; // Text chunks
  config: TTSConfig; // TTS configuration
  strategy: IPlaybackStrategy | null; // Playback strategy
  totalSeconds: number; // Total duration for usage tracking
  playChunkRef: ((index: number) => Promise<void>) | null; // Reference to playChunk function
}

/**
 * Build TTS configuration from options
 */
function buildTTSConfig(options: StandaloneTTSOptions): TTSConfig {
  const ttsApiUrl = import.meta.env.VITE_TTS_API_URL || '';
  const apiUrl = ttsApiUrl ? `${ttsApiUrl}/api/tts` : '/api/tts';
  const voice = options.voice || 'en-US-BrianMultilingualNeural';
  const speed = options.speed || 1;
  
  return { apiUrl, voice, speed };
}

/**
 * Build query parameters for TTS request
 */
function buildTTSRequestParams(text: string, config: TTSConfig): URLSearchParams {
  const params = new URLSearchParams({
    text,
    voice: config.voice,
    format: 'audio-24khz-48kbitrate-mono-mp3'
  });
  
  if (config.speed !== 1) {
    const speedPercent = Math.round((config.speed - 1) * 100);
    const speedParam = speedPercent > 0 ? `+${speedPercent}%` : `${speedPercent}%`;
    params.set('rate', speedParam);
  }
  
  return params;
}

/**
 * Fetch audio for a single chunk
 */
async function fetchChunkAudio(
  chunkIndex: number,
  text: string,
  config: TTSConfig
): Promise<ChunkData> {
  const params = buildTTSRequestParams(text, config);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(`${config.apiUrl}?${params.toString()}`, {
      signal: controller.signal,
      credentials: 'omit',
      headers: { 'Accept': '*/*' },
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch chunk ${chunkIndex + 1}: ${response.statusText}`);
    }
    
    const audioBlob = await response.blob();
    if (audioBlob.size === 0) {
      throw new Error(`Empty blob for chunk ${chunkIndex + 1}`);
    }
    
    // Calculate duration
    let duration = 0;
    try {
      const headerSeconds = Number(response.headers.get('X-Audio-Duration') || 0);
      if (headerSeconds > 0) {
        duration = headerSeconds;
      } else {
        // Fallback: estimate based on text length (150 words per minute)
        const words = text.split(/\s+/).length;
        duration = Math.round((words / 150) * 60);
      }
    } catch (err) {
      // Fallback estimation
      const words = text.split(/\s+/).length;
      duration = Math.round((words / 150) * 60);
    }
    
    return { blob: audioBlob, duration };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`TTS request timeout after 30 seconds`);
    }
    throw error;
  }
}

/**
 * Clean up old chunks from buffer to prevent memory bloat
 */
function cleanupOldChunks(
  state: PlaybackState,
  currentIndex: number
): void {
  const bufferedIndices = Array.from(state.bufferedChunks.keys());
  const indicesToRemove: number[] = [];
  
  // Remove chunks that are too far behind (more than MAX_AUDIO_BUFFER_SIZE chunks back)
  for (const index of bufferedIndices) {
    if (index < currentIndex - MAX_AUDIO_BUFFER_SIZE) {
      indicesToRemove.push(index);
    }
  }
  
  // Clean up removed chunks
  for (const index of indicesToRemove) {
    const chunkData = state.bufferedChunks.get(index);
    if (chunkData && chunkData.blob) {
      // Revoke blob URL if it was created
      // Note: We don't track blob URLs separately for seamless, but we do for HTML5
      state.bufferedChunks.delete(index);
      console.log(`[Standalone TTS] Cleaned up old chunk ${index + 1}`);
    }
  }
}

/**
 * Prefetch chunks starting from startIndex (up to PREFETCH_CHUNK_COUNT chunks)
 * Matches the pattern from main reader TTS
 */
async function prefetchChunks(
  state: PlaybackState,
  startIndex: number
): Promise<void> {
  if (state.chunks.length === 0) return;
  
  const normalizedStart = Math.max(0, startIndex);
  if (normalizedStart >= state.chunks.length) return;
  
  // Check if chunks in this range are already being prefetched
  const chunksToCheck: number[] = [];
  for (let i = 0; i < PREFETCH_CHUNK_COUNT && normalizedStart + i < state.chunks.length; i++) {
    chunksToCheck.push(normalizedStart + i);
  }
  
  // If all chunks are already in flight, skip this prefetch
  const allInFlight = chunksToCheck.every(idx => state.inFlightPrefetches.has(idx));
  if (allInFlight && chunksToCheck.length > 0) {
    console.log(`[Standalone TTS] Skipping duplicate prefetch for chunks ${normalizedStart}-${normalizedStart + chunksToCheck.length - 1} (already in flight)`);
    return;
  }
  
  const chunksToFetch = state.chunks.slice(normalizedStart, normalizedStart + PREFETCH_CHUNK_COUNT);
  if (chunksToFetch.length === 0) return;
  
  // Mark chunks as in-flight
  chunksToCheck.forEach(idx => state.inFlightPrefetches.add(idx));
  
  console.log(`[Standalone TTS] Starting pre-fetch for chunks from index ${normalizedStart}`);
  
  // Check if using seamless playback
  const strategy = state.strategy;
  const isSeamless = strategy && (strategy as any).getStrategyType?.() === 'seamless';
  
  for (let i = 0; i < chunksToFetch.length; i++) {
    const chunkIndex = normalizedStart + i;
    
    // Skip if already buffered or currently playing
    if (state.bufferedChunks.has(chunkIndex) || state.currentChunkIndex === chunkIndex) {
      continue;
    }
    
    try {
      const audioBlob = await fetchChunkAudio(chunkIndex, chunksToFetch[i], state.config);
      
      // If using seamless playback, pre-decode into the Web Audio queue now
      if (isSeamless && strategy) {
        try {
          await strategy.prepareChunk(chunkIndex, audioBlob.blob);
          console.log(`[Standalone TTS] Pre-decoded chunk #${chunkIndex} for seamless playback`);
        } catch (err) {
          console.warn(`[Standalone TTS] Failed to pre-decode chunk #${chunkIndex} for seamless playback`, err);
        }
      } else {
        // For HTML5: store blob URL
        const audioUrl = URL.createObjectURL(audioBlob.blob);
        state.audioUrls.push(audioUrl);
      }
      
      // Store chunk data in buffer
      state.bufferedChunks.set(chunkIndex, audioBlob);
      state.totalSeconds += audioBlob.duration;
      
      console.log(`[Standalone TTS] Successfully buffered chunk #${chunkIndex + 1}`);
      
      // Clean up old chunks if buffer is too large
      cleanupOldChunks(state, chunkIndex);
      
    } catch (error) {
      console.warn(`[Standalone TTS] Failed to pre-fetch chunk #${chunkIndex + 1}`, error);
    } finally {
      // Remove from in-flight set when done (success or failure)
      state.inFlightPrefetches.delete(chunkIndex);
    }
  }
}


/**
 * Setup event handlers for playback strategy with sequential prefetching
 */
function setupPlaybackEventHandlers(
  strategy: IPlaybackStrategy,
  options: StandaloneTTSOptions,
  state: PlaybackState
): void {
  let playbackStarted = false;

  strategy.setEventHandlers({
    onPlay: (chunkIndex: number) => {
      state.currentChunkIndex = chunkIndex;
      
      if (chunkIndex === 0 && !playbackStarted) {
        playbackStarted = true;
        console.log('[Standalone TTS] Playback started');
        options.onPlaybackStart?.();
      }
      
      // Trigger prefetch for next chunks when current chunk starts playing
      // This matches the main reader TTS pattern
      const nextChunkIndex = chunkIndex + 1;
      if (nextChunkIndex < state.chunks.length && state.playChunkRef) {
        console.log(`[Standalone TTS] Chunk ${chunkIndex + 1} started, prefetching chunks from ${nextChunkIndex + 1}`);
        prefetchChunks(state, nextChunkIndex).catch(err => {
          console.warn('[Standalone TTS] Background prefetch failed:', err);
        });
      }
    },
    onChunkComplete: async (chunkIndex: number) => {
      console.log(`[Standalone TTS] Chunk ${chunkIndex + 1} completed`);

      // Auto-advance to next chunk if available
      const nextChunkIndex = chunkIndex + 1;
      if (nextChunkIndex < state.chunks.length && state.playChunkRef) {
        console.log(`[Standalone TTS] Auto-advancing to chunk ${nextChunkIndex + 1}`);
        // Use ref to ensure we call the latest playChunk function
        state.playChunkRef(nextChunkIndex).catch((error) => {
          console.error(`[Standalone TTS] Error auto-advancing to chunk ${nextChunkIndex + 1}:`, error);
          options.onError?.(error instanceof Error ? error : new Error(String(error)));
        });
      } else if (chunkIndex === state.chunks.length - 1) {
        // Last chunk completed
        console.log('[Standalone TTS] Playback ended');
        state.currentChunkIndex = null;
        options.onPlaybackEnd?.();
      }
    },
    onPause: () => {
      console.log('[Standalone TTS] Playback paused');
      options.onPlaybackPause?.();
    },
    onResume: () => {
      console.log('[Standalone TTS] Playback resumed');
      options.onPlaybackResume?.();
    },
    onError: (error: Error) => {
      console.error('[Standalone TTS] Playback error:', error);
      state.currentChunkIndex = null;
      options.onError?.(error);
    },
  });
}

/**
 * Play a single chunk using seamless strategy (sequential playback)
 * Chunks are auto-advanced via event handlers
 */
async function playChunkSeamless(
  state: PlaybackState,
  chunkIndex: number
): Promise<void> {
  if (chunkIndex < 0 || chunkIndex >= state.chunks.length) {
    console.log('[Standalone TTS] Reached end of chunks');
    state.currentChunkIndex = null;
    return;
  }
  
  const strategy = state.strategy;
  if (!strategy) {
    throw new Error('Playback strategy not available');
  }
  
  // Get blob from buffer or fetch if not available
  let audioBlob: Blob;
  const bufferedChunk = state.bufferedChunks.get(chunkIndex);
  
  if (bufferedChunk) {
    audioBlob = bufferedChunk.blob;
    console.log(`[Standalone TTS] Playing chunk #${chunkIndex + 1} from buffer`);
  } else {
    // Fetch chunk if not buffered (shouldn't happen with proper prefetching)
    console.log(`[Standalone TTS] Chunk #${chunkIndex + 1} not buffered, fetching now...`);
    const chunkData = await fetchChunkAudio(chunkIndex, state.chunks[chunkIndex], state.config);
    audioBlob = chunkData.blob;
    state.bufferedChunks.set(chunkIndex, chunkData);
    state.totalSeconds += chunkData.duration;
    
    // Prepare chunk for seamless playback
    await strategy.prepareChunk(chunkIndex, audioBlob);
  }
  
  // Play chunk - auto-advance will happen via onChunkComplete event handler
  await strategy.play(audioBlob, chunkIndex);
}



/**
 * Play a single chunk using HTML5 Audio (sequential playback)
 * Chunks are auto-advanced via event handlers
 */
async function playChunkHTML5(
  state: PlaybackState,
  chunkIndex: number,
  options: StandaloneTTSOptions
): Promise<void> {
  if (chunkIndex < 0 || chunkIndex >= state.chunks.length) {
    console.log('[Standalone TTS] Reached end of chunks');
    state.currentChunkIndex = null;
    return;
  }
  
  // Get blob from buffer or fetch if not available
  let audioUrl: string;
  const bufferedChunk = state.bufferedChunks.get(chunkIndex);
  
  if (bufferedChunk) {
    // Create blob URL for HTML5 playback
    audioUrl = URL.createObjectURL(bufferedChunk.blob);
    state.audioUrls.push(audioUrl);
    console.log(`[Standalone TTS] Playing chunk #${chunkIndex + 1} from buffer`);
  } else {
    // Fetch chunk if not buffered (shouldn't happen with proper prefetching)
    console.log(`[Standalone TTS] Chunk #${chunkIndex + 1} not buffered, fetching now...`);
    const chunkData = await fetchChunkAudio(chunkIndex, state.chunks[chunkIndex], state.config);
    audioUrl = URL.createObjectURL(chunkData.blob);
    state.audioUrls.push(audioUrl);
    state.bufferedChunks.set(chunkIndex, chunkData);
    state.totalSeconds += chunkData.duration;
  }
  
  // Play chunk - auto-advance will happen via ended event handler
  return new Promise<void>((resolve, reject) => {
    const audio = new Audio(audioUrl);
    
    const isFirstChunk = chunkIndex === 0;
    const isLastChunk = chunkIndex === state.chunks.length - 1;
    
    if (isFirstChunk) {
      audio.addEventListener('play', () => {
        console.log('[Standalone TTS] HTML5 playback started');
        options.onPlaybackStart?.();
      }, { once: true });
    }
    
    audio.addEventListener('ended', () => {
      console.log(`[Standalone TTS] HTML5 chunk ${chunkIndex + 1} completed`);
      
      // Auto-advance to next chunk
      const nextChunkIndex = chunkIndex + 1;
      if (nextChunkIndex < state.chunks.length && state.playChunkRef) {
        state.playChunkRef(nextChunkIndex).catch((error) => {
          console.error(`[Standalone TTS] Error auto-advancing to chunk ${nextChunkIndex + 1}:`, error);
          options.onError?.(error instanceof Error ? error : new Error(String(error)));
        });
      } else if (isLastChunk) {
        console.log('[Standalone TTS] HTML5 playback ended');
        state.currentChunkIndex = null;
        options.onPlaybackEnd?.();
      }
      
      resolve();
    }, { once: true });
    
    audio.addEventListener('error', (e) => {
      const errorMsg = (e.target as HTMLAudioElement)?.error?.message || 'Unknown error';
      reject(new Error(`Failed to play audio chunk ${chunkIndex + 1}: ${errorMsg}`));
    }, { once: true });
    
    audio.play().catch(reject);
  });
}


/**
 * Track TTS usage
 */
async function trackTTSUsage(
  totalSeconds: number,
  options: StandaloneTTSOptions
): Promise<void> {
  const tracker = getUsageTracker();
  
  if (tracker) {
    await tracker.recordUsageSeconds(totalSeconds, 'ai-summary', {
      onSuccess: () => {
        console.log('[Standalone TTS] Usage tracked successfully');
      },
      onError: (err) => {
        console.error('[Standalone TTS] Usage tracking failed:', err);
      },
    });
  } else {
    // Initialize tracker if needed
    if (options.userId) {
      await initializeUsageTracking(options.userId);
      const newTracker = getUsageTracker();
      if (newTracker && totalSeconds > 0) {
        await newTracker.recordUsageSeconds(totalSeconds, 'ai-summary');
      }
    } else {
      await initializeUsageTracking();
      const newTracker = getUsageTracker();
      if (newTracker && totalSeconds > 0) {
        await newTracker.recordUsageSeconds(totalSeconds, 'ai-summary');
      }
    }
  }
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Play TTS audio independently without affecting main reader TTS controls
 * Uses the exact same TTS API method as the main reader
 * Chunks long text into sentences (same as main reader) to avoid URL length limits
 * Returns a controller object for pause/resume/stop functionality
 * @param text - The text to convert to speech
 * @param options - Configuration options including user tracking and callbacks
 * @returns Controller object with pause, resume, stop, and state methods
 */
export async function playStandaloneTTS(
  text: string,
  options: StandaloneTTSOptions = {}
): Promise<StandaloneTTSController> {
  console.log('[Standalone TTS] playStandaloneTTS called', {
    textLength: text?.length,
    hasText: !!text,
    userId: options.userId,
    sessionId: options.sessionId,
    voice: options.voice,
    speed: options.speed,
  });

  // Validate input
  if (!text || text.trim().length === 0) {
    const error = new Error('Text is required for TTS');
    console.error('[Standalone TTS] Text validation failed:', { text, textLength: text?.length });
    options.onError?.(error);
    throw error;
  }

  // Split text into chunks
  const chunks = splitTextIntoChunks(text);
  console.log('[Standalone TTS] Split text into chunks', {
    totalChunks: chunks.length,
    totalTextLength: text.length,
    averageChunkLength: chunks.length > 0 ? Math.round(text.length / chunks.length) : 0,
    firstChunk: chunks[0]?.substring(0, 100),
  });

  if (chunks.length === 0) {
    const error = new Error('No valid text chunks found');
    options.onError?.(error);
    throw error;
  }

  // Build configuration
  const config = buildTTSConfig(options);
  
  // Initialize playback strategy
  const instanceId = `StandaloneTTS_${Date.now()}`;
  const playbackStrategy = createAdaptivePlaybackStrategy({
    playbackRate: config.speed,
    instanceId,
    forceStrategy: 'auto',
  });

  const isSeamless = playbackStrategy.getStrategyType() === 'seamless';
  console.log('[Standalone TTS] Strategy:', isSeamless ? 'seamless (Web Audio)' : 'html5 (fallback)');

  // Initialize playback state
  const state: PlaybackState = {
    bufferedChunks: new Map(),
    inFlightPrefetches: new Set(),
    currentChunkIndex: null,
    audioUrls: [],
    chunks,
    config,
    strategy: playbackStrategy,
    totalSeconds: 0,
    playChunkRef: null,
  };

  // Create playChunk function based on strategy
  const playChunk = async (index: number): Promise<void> => {
    if (isSeamless) {
      return playChunkSeamless(state, index);
    } else {
      return playChunkHTML5(state, index, options);
    }
  };
  
  // Store reference for event handlers
  state.playChunkRef = playChunk;

  // Setup event handlers with state
  setupPlaybackEventHandlers(playbackStrategy, options, state);

  // Track usage when playback ends
  const originalOnEnd = options.onPlaybackEnd;
  options.onPlaybackEnd = () => {
    // Track usage asynchronously (don't block callback)
    if (state.totalSeconds > 0) {
      trackTTSUsage(state.totalSeconds, options).catch(err => {
        console.error('[Standalone TTS] Usage tracking error:', err);
      });
    }
    
    // Cleanup blob URLs
    state.audioUrls.forEach(url => URL.revokeObjectURL(url));
    state.audioUrls = [];
    state.bufferedChunks.clear();
    
    originalOnEnd?.();
  };

  try {
    // Fetch first chunk immediately and start playback
    console.log('[Standalone TTS] Fetching first chunk to start playback immediately...');
    const firstChunk = await fetchChunkAudio(0, chunks[0], config);
    state.totalSeconds += firstChunk.duration;
    
    // Store first chunk in buffer
    state.bufferedChunks.set(0, firstChunk);
    
    // For seamless: prepare chunk
    if (isSeamless) {
      await playbackStrategy.prepareChunk(0, firstChunk.blob);
    } else {
      // For HTML5: create blob URL
      const audioUrl = URL.createObjectURL(firstChunk.blob);
      state.audioUrls.push(audioUrl);
    }
    
    console.log('[Standalone TTS] First chunk ready, starting playback...');
    
    // Start playing first chunk - event handlers will handle prefetching and auto-advance
    playChunk(0).catch((error) => {
      console.error('[Standalone TTS] Playback error:', error);
      options.onError?.(error instanceof Error ? error : new Error(String(error)));
    });

    // Return controller immediately
    return {
      pause: () => {
        console.log('[Standalone TTS] Pause requested');
        playbackStrategy.pause();
      },
      resume: async () => {
        console.log('[Standalone TTS] Resume requested');
        await playbackStrategy.resume();
      },
      stop: () => {
        console.log('[Standalone TTS] Stop requested');
        playbackStrategy.stop();
        playbackStrategy.cleanup();
      },
      isPlaying: () => playbackStrategy.isPlaying(),
      isPaused: () => playbackStrategy.isPaused(),
    };
  } catch (error) {
    playbackStrategy.cleanup();
    const err = error instanceof Error ? error : new Error(String(error));
    options.onError?.(err);
    throw err;
  }
}

/**
 * Stop any currently playing standalone TTS
 * Note: This is a simple implementation. For more control, you might want to
 * maintain a reference to the audio element.
 */
export function stopStandaloneTTS(): void {
  // Find and stop any audio elements that might be playing
  // This is a simple approach - in a more complex scenario, you'd maintain
  // a reference to the audio element
  const audioElements = document.querySelectorAll('audio');
  audioElements.forEach((audio) => {
    if (!audio.paused) {
      audio.pause();
      audio.currentTime = 0;
    }
  });
}

