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
 * Uses the exact same TTS API method as the main reader
 * Uses relative URL (/api/tts) when frontend and server are on same system to avoid CORS
 * Falls back to VITE_TTS_API_URL if set, otherwise uses relative URL
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
    // If frontend and server are on same system, use relative URL to avoid CORS
    const ttsApiUrl = import.meta.env.VITE_TTS_API_URL || '';
    // Use relative URL if env var is empty, otherwise use the env var URL
    const apiUrl = ttsApiUrl ? `${ttsApiUrl}/api/tts` : '/api/tts';
    
    console.log('[Standalone TTS] API configuration', {
      ttsApiUrl,
      apiUrl,
      envVar: import.meta.env.VITE_TTS_API_URL,
      usingRelativeUrl: !ttsApiUrl,
    });
    
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
    
    const fullUrl = `${apiUrl}?${params.toString()}`;
    console.log('[Standalone TTS] Fetching audio', {
      url: fullUrl.substring(0, 200) + (fullUrl.length > 200 ? '...' : ''),
      textLength: text.length,
      voice,
      speed,
      format: 'audio-24khz-48kbitrate-mono-mp3',
      urlLength: fullUrl.length,
    });
    
    // Check if URL is too long (some browsers have limits)
    if (fullUrl.length > 2000) {
      console.warn('[Standalone TTS] URL is very long, may cause issues:', fullUrl.length);
    }
    
    // Add timeout protection (same as main reader: 30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const fetchStartTime = Date.now();
    try {
      console.log('[Standalone TTS] Sending fetch request...', {
        method: 'GET',
        url: apiUrl,
        hasSignal: !!controller.signal,
      });
      
      response = await fetch(`${apiUrl}?${params.toString()}`, {
        signal: controller.signal,
        // Add credentials for CORS if needed
        credentials: 'omit',
        // Add headers that might be needed
        headers: {
          'Accept': '*/*',
        },
      });
      
      const fetchDuration = Date.now() - fetchStartTime;
      clearTimeout(timeoutId);
      
      console.log('[Standalone TTS] Fetch response received', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('Content-Type'),
        contentLength: response.headers.get('Content-Length'),
        fetchDuration: `${fetchDuration}ms`,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      const fetchDuration = Date.now() - fetchStartTime;
      
      console.error('[Standalone TTS] Fetch error', {
        name: fetchError.name,
        message: fetchError.message,
        stack: fetchError.stack,
        fetchDuration: `${fetchDuration}ms`,
        isAbortError: fetchError.name === 'AbortError',
        isNetworkError: fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError'),
        isCorsError: fetchError.message?.includes('CORS') || fetchError.message?.includes('cross-origin'),
      });
      
      if (fetchError.name === 'AbortError') {
        throw new Error('TTS request timeout after 30 seconds');
      }
      
      // Check for CORS errors
      if (fetchError.message?.includes('CORS') || fetchError.message?.includes('cross-origin')) {
        throw new Error('CORS error: The TTS API may not allow requests from this origin. Please check CORS settings.');
      }
      
      // Check for network errors
      if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError')) {
        throw new Error('Network error: Unable to reach the TTS server. Please check your connection.');
      }
      
      throw fetchError;
    }
    
    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        console.warn('[Standalone TTS] Could not read error response text');
      }
      
      console.error('[Standalone TTS] Response not OK', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 200),
        headers: Object.fromEntries(response.headers.entries()),
      });
      
      throw new Error(`Failed to fetch TTS audio: ${response.status} ${response.statusText}`);
    }
    
    console.log('[Standalone TTS] Converting response to blob...');
    const blobStartTime = Date.now();
    const audioBlob = await response.blob();
    const blobDuration = Date.now() - blobStartTime;
    
    console.log('[Standalone TTS] Audio blob received', {
      size: audioBlob.size,
      type: audioBlob.type,
      blobDuration: `${blobDuration}ms`,
    });
    
    if (audioBlob.size === 0) {
      console.error('[Standalone TTS] Empty audio blob received');
      throw new Error('Received empty audio blob');
    }

    // Create audio element and play (same method as main reader)
    console.log('[Standalone TTS] Creating audio element...');
    audioUrl = URL.createObjectURL(audioBlob);
    audio = new Audio(audioUrl);
    
    console.log('[Standalone TTS] Audio element created', {
      audioUrl: audioUrl.substring(0, 50) + '...',
      audioSrc: audio.src.substring(0, 50) + '...',
    });

    // Set up event listeners BEFORE playing
    audio.addEventListener('play', () => {
      playStartTime = Date.now();
      console.log('[Standalone TTS] Playback started', {
        playStartTime,
        audioDuration: audio.duration,
      });
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
      console.error('[Standalone TTS] Audio playback error', {
        error: e,
        audioError: (audio as any)?.error,
        audioNetworkState: audio.networkState,
        audioReadyState: audio.readyState,
        audioSrc: audio.src.substring(0, 100),
        audioDuration: audio.duration,
      });
      options.onError?.(error);
      
      // Cleanup on error
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        audioUrl = null;
      }
    });

    // Start playback
    console.log('[Standalone TTS] Attempting to play audio...');
    try {
      await audio.play();
      console.log('[Standalone TTS] Audio.play() succeeded');
    } catch (playError: any) {
      console.error('[Standalone TTS] Audio.play() failed', {
        error: playError,
        name: playError.name,
        message: playError.message,
        code: playError.code,
      });
      throw playError;
    }
    console.log('[Standalone TTS] Audio playback initiated successfully');
  } catch (error) {
    console.error('[Standalone TTS] Error in playStandaloneTTS', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
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

