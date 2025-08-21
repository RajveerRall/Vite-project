// src/hooks/useBackgroundAudio.ts

import { useEffect, useRef, useState, useCallback } from 'react';
import { backgroundAudioService, AudioChunk, BackgroundAudioState } from '../services/BackgroundAudioService';

export interface UseBackgroundAudioReturn {
  // State
  isPlaying: boolean;
  isPaused: boolean;
  currentChunkIndex: number;
  totalChunks: number;
  currentTime: number;
  totalDuration: number;
  playbackRate: number;
  
  // Controls
  play: () => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  stop: () => void;
  skipToChunk: (chunkIndex: number) => Promise<void>;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  
  // Audio management
  setAudioChunks: (chunks: string[], audioUrls: string[]) => void;
  clearAudioChunks: () => void;
  
  // Background features
  enableBackgroundPlayback: () => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
}

export const useBackgroundAudio = (): UseBackgroundAudioReturn => {
  const [state, setState] = useState<BackgroundAudioState>({
    isPlaying: false,
    isPaused: false,
    currentChunkIndex: 0,
    totalChunks: 0,
    currentTime: 0,
    totalDuration: 0,
    playbackRate: 1.0
  });

  const serviceWorkerRef = useRef<ServiceWorkerRegistration | null>(null);
  const notificationPermissionRef = useRef<NotificationPermission>('default');

  // Initialize service worker and background audio
  useEffect(() => {
    const initializeBackgroundAudio = async () => {
      try {
        // Check if service worker is supported
        if ('serviceWorker' in navigator) {
          serviceWorkerRef.current = await navigator.serviceWorker.register('/worker.js');
          console.log('[BackgroundAudio] Service Worker registered');
        }

        // Check notification permission
        if ('Notification' in window) {
          notificationPermissionRef.current = Notification.permission;
        }

        // Set up event listeners
        backgroundAudioService.on('stateChange', (newState) => {
          setState(newState);
          
          // Notify service worker
          if (serviceWorkerRef.current?.active) {
            if (newState.isPlaying) {
              serviceWorkerRef.current.active.postMessage({
                type: 'AUDIO_STARTED',
                data: { state: newState }
              });
            } else if (newState.isPaused) {
              serviceWorkerRef.current.active.postMessage({
                type: 'AUDIO_PAUSED',
                data: { state: newState }
              });
            } else {
              serviceWorkerRef.current.active.postMessage({
                type: 'AUDIO_STOPPED',
                data: { state: newState }
              });
            }
          }
        });

        backgroundAudioService.on('chunkComplete', (chunkIndex) => {
          console.log(`[BackgroundAudio] Chunk ${chunkIndex} completed`);
        });

        backgroundAudioService.on('playbackComplete', () => {
          console.log('[BackgroundAudio] Playback completed');
        });

        backgroundAudioService.on('error', (error) => {
          console.error('[BackgroundAudio] Error:', error);
        });

        // Listen for messages from service worker
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.addEventListener('message', (event) => {
            const { type, action } = event.data;
            
            switch (type) {
              case 'AUDIO_CONTROL':
                handleServiceWorkerControl(action);
                break;
              case 'CHECK_AUDIO_STATE':
                // Service worker is checking if audio is still playing
                break;
              case 'KEEP_ALIVE':
                // Service worker is keeping the connection alive
                break;
            }
          });
        }

      } catch (error) {
        console.error('[BackgroundAudio] Initialization failed:', error);
      }
    };

    initializeBackgroundAudio();

    // Cleanup
    return () => {
      backgroundAudioService.destroy();
    };
  }, []);

  // Handle service worker audio controls
  const handleServiceWorkerControl = useCallback((action: string) => {
    switch (action) {
      case 'play':
        if (state.isPaused) {
          backgroundAudioService.resume();
        }
        break;
      case 'pause':
        if (state.isPlaying) {
          backgroundAudioService.pause();
        }
        break;
      case 'stop':
        backgroundAudioService.stop();
        break;
    }
  }, [state.isPlaying, state.isPaused]);

  // Set audio chunks for playback
  const setAudioChunks = useCallback((chunks: string[], audioUrls: string[]) => {
    const audioChunks: AudioChunk[] = chunks.map((text, index) => ({
      id: `chunk-${index}`,
      text,
      audioUrl: audioUrls[index] || '',
      duration: 0 // Will be calculated when audio loads
    }));

    backgroundAudioService.setChunks(audioChunks);
    console.log(`[BackgroundAudio] Set ${audioChunks.length} audio chunks`);
  }, []);

  // Clear audio chunks
  const clearAudioChunks = useCallback(() => {
    backgroundAudioService.stop();
    console.log('[BackgroundAudio] Audio chunks cleared');
  }, []);

  // Enable background playback
  const enableBackgroundPlayback = useCallback(async () => {
    try {
      // Request wake lock if supported
      if ('wakeLock' in navigator) {
        try {
          const wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('[BackgroundAudio] Wake lock acquired');
          
          // Release wake lock when audio stops
          backgroundAudioService.on('playbackComplete', () => {
            wakeLock.release();
            console.log('[BackgroundAudio] Wake lock released');
          });
        } catch (error) {
          console.warn('[BackgroundAudio] Wake lock not supported:', error);
        }
      }

      // Request background sync if supported
      if ('serviceWorker' in navigator && serviceWorkerRef.current) {
        try {
          await (serviceWorkerRef.current as any).sync.register('background-audio-sync');
          console.log('[BackgroundAudio] Background sync registered');
        } catch (error) {
          console.warn('[BackgroundAudio] Background sync not supported:', error);
        }
      }

      console.log('[BackgroundAudio] Background playback enabled');
    } catch (error) {
      console.error('[BackgroundAudio] Failed to enable background playback:', error);
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('[BackgroundAudio] Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      notificationPermissionRef.current = permission;
      
      if (permission === 'granted') {
        console.log('[BackgroundAudio] Notification permission granted');
        return true;
      } else {
        console.warn('[BackgroundAudio] Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('[BackgroundAudio] Failed to request notification permission:', error);
      return false;
    }
  }, []);

  // Expose background audio service methods
  const play = useCallback(async () => {
    await backgroundAudioService.play();
  }, []);

  const pause = useCallback(() => {
    backgroundAudioService.pause();
  }, []);

  const resume = useCallback(async () => {
    await backgroundAudioService.resume();
  }, []);

  const stop = useCallback(() => {
    backgroundAudioService.stop();
  }, []);

  const skipToChunk = useCallback(async (chunkIndex: number) => {
    await backgroundAudioService.skipToChunk(chunkIndex);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    backgroundAudioService.setPlaybackRate(rate);
  }, []);

  const setVolume = useCallback((volume: number) => {
    backgroundAudioService.setVolume(volume);
  }, []);

  return {
    // State
    ...state,
    
    // Controls
    play,
    pause,
    resume,
    stop,
    skipToChunk,
    setPlaybackRate,
    setVolume,
    
    // Audio management
    setAudioChunks,
    clearAudioChunks,
    
    // Background features
    enableBackgroundPlayback,
    requestNotificationPermission
  };
}; 