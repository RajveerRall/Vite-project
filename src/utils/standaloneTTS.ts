/**
 * Standalone TTS utility for AI Chat summaries
 * Uses the same TTS API and method as the main reader TTS
 * Supports pause/resume functionality via AdaptivePlaybackStrategy
 */

import { getUsageTracker, initializeUsageTracking } from '../services/tts/index';
import { getAnonymousSessionId } from './anonymousSession';
import { createAdaptivePlaybackStrategy } from '../services/tts/strategies/AdaptivePlaybackStrategy';
import { IPlaybackStrategy } from '../services/tts/strategies/IPlaybackStrategy';

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
 * Fetch all chunks in parallel
 */
async function fetchAllChunks(
  chunks: string[],
  config: TTSConfig
): Promise<ChunkData[]> {
  console.log('[Standalone TTS] Fetching all chunks in parallel', {
    totalChunks: chunks.length,
  });
  
  const fetchPromises = chunks.map((chunk, index) =>
    fetchChunkAudio(index, chunk, config)
  );
  
  return Promise.all(fetchPromises);
}

/**
 * Setup event handlers for playback strategy
 */
function setupPlaybackEventHandlers(
  strategy: IPlaybackStrategy,
  options: StandaloneTTSOptions,
  totalChunks: number
): void {
  let playbackStarted = false;

  strategy.setEventHandlers({
    onPlay: (chunkIndex: number) => {
      if (chunkIndex === 0 && !playbackStarted) {
        playbackStarted = true;
        console.log('[Standalone TTS] Playback started');
        options.onPlaybackStart?.();
      }
    },
    onChunkComplete: async (chunkIndex: number) => {
      console.log(`[Standalone TTS] Chunk ${chunkIndex + 1} completed`);

      if (chunkIndex === totalChunks - 1) {
        console.log('[Standalone TTS] Playback ended');
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
      options.onError?.(error);
    },
  });
}

/**
 * Play chunks using seamless strategy (Web Audio API)
 * Note: The seamless strategy doesn't auto-advance, so we play chunks sequentially
 */
async function playChunksWithSeamless(
  strategy: IPlaybackStrategy,
  chunkData: ChunkData[],
  options: StandaloneTTSOptions
): Promise<void> {
  console.log('[Standalone TTS] Using seamless playback (Web Audio API)');
  
  // Pre-decode all chunks for seamless playback
  for (let i = 0; i < chunkData.length; i++) {
    await strategy.prepareChunk(i, chunkData[i].blob);
  }
  
  // Play chunks sequentially - the seamless strategy doesn't auto-advance
  // We need to manually play each chunk after the previous one completes
  for (let i = 0; i < chunkData.length; i++) {
    // Wait for this chunk to complete before playing the next
    await new Promise<void>((resolve, reject) => {
      // Get the service to access event handlers
      const service = (strategy as any).service;
      if (!service || !service.eventHandlers) {
        reject(new Error('Seamless strategy service not available'));
        return;
      }
      
      // Store original handlers
      const originalOnComplete = service.eventHandlers.onChunkComplete;
      const originalOnError = service.eventHandlers.onError;
      
      // Set up temporary handler for this chunk
      const tempOnComplete = async (chunkIndex: number) => {
        // Call original handler first
        if (originalOnComplete) {
          await originalOnComplete(chunkIndex);
        }
        
        // If this is the chunk we're waiting for, resolve
        if (chunkIndex === i) {
          // Restore original handlers
          service.eventHandlers.onChunkComplete = originalOnComplete;
          service.eventHandlers.onError = originalOnError;
          resolve();
        }
      };
      
      const tempOnError = (error: Error) => {
        // Restore original handlers
        service.eventHandlers.onChunkComplete = originalOnComplete;
        service.eventHandlers.onError = originalOnError;
        if (originalOnError) {
          originalOnError(error);
        }
        reject(error);
      };
      
      // Temporarily override handlers
      service.eventHandlers.onChunkComplete = tempOnComplete;
      service.eventHandlers.onError = tempOnError;
      
      // Start playing this chunk
      strategy.play(chunkData[i].blob, i).catch((err) => {
        // Restore handlers on error
        service.eventHandlers.onChunkComplete = originalOnComplete;
        service.eventHandlers.onError = originalOnError;
        reject(err);
      });
    });
  }
}

/**
 * Play chunks using HTML5 Audio (fallback)
 */
async function playChunksWithHTML5(
  chunkData: ChunkData[],
  options: StandaloneTTSOptions
): Promise<void> {
  console.log('[Standalone TTS] Using HTML5 Audio playback');
  
  const audioUrls: string[] = [];
  
  try {
    for (let i = 0; i < chunkData.length; i++) {
      const url = URL.createObjectURL(chunkData[i].blob);
      audioUrls.push(url);
      
      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(url);
        
        // Set up event listeners BEFORE calling play()
        if (i === 0) {
          audio.addEventListener('play', () => {
            console.log('[Standalone TTS] HTML5 playback started');
            options.onPlaybackStart?.();
          }, { once: true });
        }
        
        if (i === chunkData.length - 1) {
          audio.addEventListener('ended', () => {
            console.log('[Standalone TTS] HTML5 playback ended');
            options.onPlaybackEnd?.();
            resolve();
          }, { once: true });
        } else {
          audio.addEventListener('ended', () => {
            console.log(`[Standalone TTS] HTML5 chunk ${i + 1} completed`);
            resolve();
          }, { once: true });
        }
        
        audio.addEventListener('error', (e) => {
          const errorMsg = (e.target as HTMLAudioElement)?.error?.message || 'Unknown error';
          console.error(`[Standalone TTS] HTML5 audio error for chunk ${i + 1}:`, errorMsg);
          reject(new Error(`Failed to play audio chunk ${i + 1}: ${errorMsg}`));
        }, { once: true });
        
        // Start playback
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((playError) => {
            console.error(`[Standalone TTS] HTML5 play() failed for chunk ${i + 1}:`, playError);
            reject(new Error(`Failed to start playback for chunk ${i + 1}: ${playError.message}`));
          });
        }
      });
    }
  } finally {
    // Cleanup URLs
    audioUrls.forEach(url => URL.revokeObjectURL(url));
  }
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
      const sessionId = options.sessionId || getAnonymousSessionId();
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

  // Setup event handlers
  setupPlaybackEventHandlers(playbackStrategy, options, chunks.length);

  // Track usage when playback ends
  let totalSeconds = 0;
  const originalOnEnd = options.onPlaybackEnd;
  options.onPlaybackEnd = () => {
    // Track usage asynchronously (don't block callback)
    if (totalSeconds > 0) {
      trackTTSUsage(totalSeconds, options).catch(err => {
        console.error('[Standalone TTS] Usage tracking error:', err);
      });
    }
    originalOnEnd?.();
  };

  try {
    // Fetch all chunks
    const chunkData = await fetchAllChunks(chunks, config);
    
    // Calculate total duration
    totalSeconds = chunkData.reduce((sum, chunk) => sum + chunk.duration, 0);
    console.log('[Standalone TTS] Total duration:', totalSeconds, 'seconds');

    // Start playback (non-blocking)
    const playbackPromise = isSeamless
      ? playChunksWithSeamless(playbackStrategy, chunkData, options)
      : playChunksWithHTML5(chunkData, options);

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

