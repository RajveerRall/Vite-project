/**
 * Standalone TTS utility for AI Chat summaries
 * Uses the same TTS API and method as the main reader TTS
 */

import { getUsageTracker, initializeUsageTracking } from '../services/tts/index';
import { getAnonymousSessionId } from './anonymousSession';

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
 * Uses the exact same TTS API method as the main reader (tts.yoread.com/api/tts)
 * @param text - The text to convert to speech
 * @param options - Configuration options including user tracking and callbacks
 */
export async function playStandaloneTTS(
  text: string,
  options: StandaloneTTSOptions = {}
): Promise<void> {
  if (!text || text.trim().length === 0) {
    const error = new Error('Text is required for TTS');
    options.onError?.(error);
    throw error;
  }

  let audio: HTMLAudioElement | null = null;
  let audioUrl: string | null = null;
  let playStartTime: number | null = null;
  let response: Response | null = null;

  try {
    // Use the same TTS API as the main reader
    const ttsApiUrl = import.meta.env.VITE_TTS_API_URL || '';
    const apiUrl = ttsApiUrl ? `${ttsApiUrl}/api/tts` : '/api/tts';
    
    // Default voice for summaries (same as narrator voice used in main reader)
    const voice = options.voice || 'en-US-BrianMultilingualNeural';
    const speed = options.speed || 1;
    
    // Build query parameters (same format as main reader)
    const params = new URLSearchParams({
      text: text,
      voice: voice,
      format: 'audio-24khz-48kbitrate-mono-mp3'
    });
    
    // Add speed parameter if not 1 (same calculation as main reader)
    if (speed !== 1) {
      const speedPercent = Math.round((speed - 1) * 100);
      const speedParam = speedPercent > 0 ? `+${speedPercent}%` : `${speedPercent}%`;
      params.set('rate', speedParam);
    }
    
    console.log('[Standalone TTS] Fetching audio from tts.yoread.com for text length:', text.length);
    
    // Add timeout protection (same as main reader: 30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      response = await fetch(`${apiUrl}?${params.toString()}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('TTS request timeout after 30 seconds');
      }
      throw fetchError;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch TTS audio: ${response.statusText}`);
    }
    
    const audioBlob = await response.blob();
    if (audioBlob.size === 0) {
      throw new Error('Received empty audio blob');
    }

    // Create audio element and play (same method as main reader)
    audioUrl = URL.createObjectURL(audioBlob);
    audio = new Audio(audioUrl);

    // Set up event listeners
    audio.addEventListener('play', () => {
      playStartTime = Date.now();
      console.log('[Standalone TTS] Playback started');
      options.onPlaybackStart?.();
    });

    audio.addEventListener('ended', async () => {
      try {
        // Calculate usage seconds (same method as main reader)
        const elapsed = playStartTime ? Math.round((Date.now() - playStartTime) / 1000) : 0;
        
        // Try to get duration from response header (same as main reader)
        let seconds = 0;
        try {
          const headerSeconds = Number(response?.headers.get('X-Audio-Duration') || 0);
          if (headerSeconds > 0) {
            seconds = headerSeconds;
          } else if (audio.duration && !isNaN(audio.duration)) {
            seconds = Math.round(audio.duration);
          } else if (elapsed > 0) {
            seconds = elapsed;
          }
        } catch (err) {
          // Fallback to elapsed time
          seconds = elapsed > 0 ? elapsed : Math.round(audio.duration || 0);
        }

        console.log('[Standalone TTS] Playback ended, tracking usage:', {
          seconds,
          elapsed,
          audioDuration: audio.duration,
          textLength: text.length,
        });

        // Track usage with source 'ai-summary' (same tracking method as main reader)
        const tracker = getUsageTracker();
        if (tracker) {
          await tracker.recordUsageSeconds(seconds, 'ai-summary', {
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
            if (newTracker && seconds > 0) {
              await newTracker.recordUsageSeconds(seconds, 'ai-summary');
            }
          } else {
            const sessionId = options.sessionId || getAnonymousSessionId();
            await initializeUsageTracking();
            const newTracker = getUsageTracker();
            if (newTracker && seconds > 0) {
              await newTracker.recordUsageSeconds(seconds, 'ai-summary');
            }
          }
        }

        // Callback
        options.onPlaybackEnd?.();
      } catch (err) {
        console.error('[Standalone TTS] Failed to track usage:', err);
      } finally {
        // Cleanup
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
          audioUrl = null;
        }
      }
    });

    audio.addEventListener('error', (e) => {
      const error = new Error('Failed to play audio');
      console.error('[Standalone TTS] Audio playback error:', e);
      options.onError?.(error);
      
      // Cleanup on error
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        audioUrl = null;
      }
    });

    // Start playback
    await audio.play();
    console.log('[Standalone TTS] Audio playback initiated');
  } catch (error) {
    console.error('[Standalone TTS] Error:', error);
    const err = error instanceof Error ? error : new Error(String(error));
    
    // Cleanup on error
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    
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

