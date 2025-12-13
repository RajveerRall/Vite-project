/**
 * Standalone TTS utility for AI Chat summaries
 * Uses the same TTS API and method as the main reader TTS
 */

import { getUsageTracker, initializeUsageTracking } from '../services/tts/index';
import { getAnonymousSessionId } from './anonymousSession';

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
  voice?: string;
  speed?: number;
}

/**
 * Play TTS audio independently without affecting main reader TTS controls
 * Uses the exact same TTS API method as the main reader
 * Chunks long text into sentences (same as main reader) to avoid URL length limits
 * @param text - The text to convert to speech
 * @param options - Configuration options including user tracking and callbacks
 */
export async function playStandaloneTTS(
  text: string,
  options: StandaloneTTSOptions = {}
): Promise<void> {
  console.log('[Standalone TTS] playStandaloneTTS called', {
    textLength: text?.length,
    hasText: !!text,
    userId: options.userId,
    sessionId: options.sessionId,
    voice: options.voice,
    speed: options.speed,
  });

  if (!text || text.trim().length === 0) {
    const error = new Error('Text is required for TTS');
    console.error('[Standalone TTS] Text validation failed:', { text, textLength: text?.length });
    options.onError?.(error);
    throw error;
  }

  // Split text into chunks (same as main reader)
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

  // Use the same TTS API as the main reader
  const ttsApiUrl = import.meta.env.VITE_TTS_API_URL || '';
  const apiUrl = ttsApiUrl ? `${ttsApiUrl}/api/tts` : '/api/tts';
  
  const voice = options.voice || 'en-US-BrianMultilingualNeural';
  const speed = options.speed || 1;
  
  // Track total usage across all chunks
  let totalSeconds = 0;
  const audioElements: HTMLAudioElement[] = [];
  const audioUrls: string[] = [];
  
  try {
    // Play chunks sequentially
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const textChunk = chunks[chunkIndex];
      console.log(`[Standalone TTS] Processing chunk ${chunkIndex + 1}/${chunks.length}`, {
        chunkLength: textChunk.length,
        chunkPreview: textChunk.substring(0, 100),
      });

      // Build query parameters (same format as main reader)
      const params = new URLSearchParams({
        text: textChunk,
        voice: voice,
        format: 'audio-24khz-48kbitrate-mono-mp3'
      });
      
      // Add speed parameter if not 1
      if (speed !== 1) {
        const speedPercent = Math.round((speed - 1) * 100);
        const speedParam = speedPercent > 0 ? `+${speedPercent}%` : `${speedPercent}%`;
        params.set('rate', speedParam);
      }
      
      // Add timeout protection (same as main reader: 30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      let response: Response;
      try {
        response = await fetch(`${apiUrl}?${params.toString()}`, {
          signal: controller.signal,
          credentials: 'omit',
          headers: {
            'Accept': '*/*',
          },
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error(`TTS request timeout for chunk ${chunkIndex + 1} after 30 seconds`);
        }
        throw fetchError;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch TTS audio for chunk ${chunkIndex + 1}: ${response.statusText}`);
      }
      
      const audioBlob = await response.blob();
      if (audioBlob.size === 0) {
        throw new Error(`Received empty audio blob for chunk ${chunkIndex + 1}`);
      }

      // Create audio element
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrls.push(audioUrl);
      const audio = new Audio(audioUrl);
      audioElements.push(audio);

      // Track duration for this chunk
      let chunkSeconds = 0;
      try {
        const headerSeconds = Number(response.headers.get('X-Audio-Duration') || 0);
        if (headerSeconds > 0) {
          chunkSeconds = headerSeconds;
        } else if (audio.duration && !isNaN(audio.duration)) {
          chunkSeconds = Math.round(audio.duration);
        }
      } catch (err) {
        // Fallback: estimate based on text length (rough estimate: 150 words per minute)
        const words = textChunk.split(/\s+/).length;
        chunkSeconds = Math.round((words / 150) * 60);
      }
      totalSeconds += chunkSeconds;

      // Play chunk and wait for it to finish
      await new Promise<void>((resolve, reject) => {
        // First chunk triggers onPlaybackStart
        if (chunkIndex === 0) {
          audio.addEventListener('play', () => {
            console.log('[Standalone TTS] Playback started');
            options.onPlaybackStart?.();
          });
        }

        // Last chunk triggers onPlaybackEnd
        if (chunkIndex === chunks.length - 1) {
          audio.addEventListener('ended', () => {
            console.log('[Standalone TTS] Playback ended');
            options.onPlaybackEnd?.();
            resolve();
          });
        } else {
          // Middle chunks just resolve when ended
          audio.addEventListener('ended', () => {
            resolve();
          });
        }

        audio.addEventListener('error', (e) => {
          const error = new Error(`Failed to play audio chunk ${chunkIndex + 1}`);
          console.error('[Standalone TTS] Audio playback error', {
            chunkIndex: chunkIndex + 1,
            error: e,
            audioError: (audio as any)?.error,
          });
          reject(error);
        });

        // Start playback
        audio.play().catch((playError) => {
          reject(new Error(`Failed to play audio chunk ${chunkIndex + 1}: ${playError.message}`));
        });
      });
    }

    // Track total usage (same as main reader)
    console.log('[Standalone TTS] Tracking total usage', {
      totalSeconds,
      totalChunks: chunks.length,
    });

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

    console.log('[Standalone TTS] All chunks played successfully');
  } catch (error) {
    console.error('[Standalone TTS] Error in playStandaloneTTS', {
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    
    // Stop any playing audio
    audioElements.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    
    // Cleanup
    audioUrls.forEach(url => URL.revokeObjectURL(url));
    
    const err = error instanceof Error ? error : new Error(String(error));
    options.onError?.(err);
    throw err;
  } finally {
    // Cleanup all audio URLs
    audioUrls.forEach(url => URL.revokeObjectURL(url));
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

