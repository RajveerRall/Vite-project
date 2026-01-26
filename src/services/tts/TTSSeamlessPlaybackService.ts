/**
 * Seamless audio playback service using Web Audio API
 * Eliminates gaps between audio chunks through precise scheduling
 * Implements Queue Pattern for pre-decoded buffer management
 */

import { TTSEventHandlers } from '../../types/tts';
import { TTSErrorHandler } from './TTSErrorHandler';

export interface SeamlessPlaybackConfig {
  playbackRate?: number;
  instanceId?: string;
  maxQueueSize?: number;
}

interface QueuedBuffer {
  chunkIndex: number;
  buffer: AudioBuffer;
  duration: number;
  timestamp: number;
}

export class TTSSeamlessPlaybackService {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private playbackQueue: QueuedBuffer[] = [];
  private decodedBuffers: Map<number, AudioBuffer> = new Map();
  private instanceId: string;
  private playbackRate: number = 1.0;
  private nextStartTime: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private pausedOffset: number = 0;
  private pausedTime: number = 0;
  private currentChunkIndex: number | null = null;
  private maxQueueSize: number;
  private eventHandlers: TTSEventHandlers = {};

  constructor(config?: SeamlessPlaybackConfig) {
    this.instanceId = config?.instanceId || `Seamless_${Date.now()}`;
    this.playbackRate = config?.playbackRate || 1.0;
    this.maxQueueSize = config?.maxQueueSize || 15;
    this.initializeAudioContext();
  }

  /**
   * Initialize AudioContext (handles suspended state on iOS)
   */
  private async initializeAudioContext(): Promise<void> {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web Audio API not supported');
      }

      this.audioContext = new AudioContextClass();

      // Ensure audioContext is properly initialized
      if (!this.audioContext) {
        throw new Error('Failed to create AudioContext');
      }

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 1.0;

      // Handle suspended state (iOS requires user gesture)
      if (this.audioContext.state === 'suspended') {
        // AudioContext suspended, will resume on user interaction
      }
    } catch (error) {
      console.error(`[${this.instanceId}] Failed to initialize AudioContext:`, error);
      throw TTSErrorHandler.handleAudioError(error);
    }
  }

  /**
   * Resume AudioContext if suspended (required on iOS after user gesture)
   */
  private async ensureContextResumed(): Promise<void> {
    if (!this.audioContext) {
      await this.initializeAudioContext();
    }

    if (this.audioContext!.state === 'suspended') {
      try {
        await this.audioContext!.resume();
      } catch (error) {
        console.warn(`[${this.instanceId}] Failed to resume AudioContext:`, error);
        throw TTSErrorHandler.handlePermissionError(error);
      }
    }
  }

  /**
   * Pre-decode audio blob into AudioBuffer
   */
  async decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
    if (!this.audioContext) {
      await this.initializeAudioContext();
    }

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      console.error(`[${this.instanceId}] Failed to decode audio blob:`, error);
      throw TTSErrorHandler.handleBufferError(error);
    }
  }

  /**
   * Enqueue a chunk for seamless playback (pre-decode)
   */
  async enqueueChunk(chunkIndex: number, audioBlob: Blob): Promise<void> {
    try {
      // Check if already decoded
      if (this.decodedBuffers.has(chunkIndex)) {
        // Even if decoded, ensure it's in the playback queue
        const existingQueueItem = this.playbackQueue.find(q => q.chunkIndex === chunkIndex);
        if (!existingQueueItem) {
          const buffer = this.decodedBuffers.get(chunkIndex)!;
          this.playbackQueue.push({
            chunkIndex,
            buffer,
            duration: buffer.duration,
            timestamp: Date.now(),
          });
          // Resort queue by index to maintain order
          this.playbackQueue.sort((a, b) => a.chunkIndex - b.chunkIndex);
        }
        return;
      }

      // Prevent queue from growing too large
      // Protect current/paused chunks from eviction
      if (this.decodedBuffers.size >= this.maxQueueSize) {
        // Build set of protected chunks (current chunk and nearby chunks)
        const protectedChunks = new Set<number>();
        if (this.currentChunkIndex !== null) {
          // Protect current chunk and chunks within ±4 range (for backward navigation & prefetch)
          for (let i = -4; i <= 4; i++) {
            protectedChunks.add(this.currentChunkIndex + i);
          }
        }

        // Also protect the chunk being enqueued
        protectedChunks.add(chunkIndex);

        // Find chunks that can be evicted (exclude protected ones)
        const keysToEvict = Array.from(this.decodedBuffers.keys())
          .filter(key => !protectedChunks.has(key))
          .sort((a, b) => a - b); // Sort to evict oldest first

        if (keysToEvict.length > 0) {
          const oldestKey = keysToEvict[0];
          this.decodedBuffers.delete(oldestKey);
          // Also remove from playback queue if present
          const queueIndex = this.playbackQueue.findIndex(q => q.chunkIndex === oldestKey);
          if (queueIndex !== -1) {
            this.playbackQueue.splice(queueIndex, 1);
          }
        }
      }

      // Decode blob to AudioBuffer
      const buffer = await this.decodeAudioBlob(audioBlob);
      const duration = buffer.duration;

      // Store decoded buffer
      this.decodedBuffers.set(chunkIndex, buffer);

      // Add to playback queue if not already there
      const existing = this.playbackQueue.find(q => q.chunkIndex === chunkIndex);
      if (!existing) {
        this.playbackQueue.push({
          chunkIndex,
          buffer,
          duration,
          timestamp: Date.now(),
        });
        // Resort queue to maintain order
        this.playbackQueue.sort((a, b) => a.chunkIndex - b.chunkIndex);
      }
    } catch (error) {
      console.error(`[${this.instanceId}] Failed to enqueue chunk ${chunkIndex}:`, error);
      throw error;
    }
  }

  /**
   * Play a chunk seamlessly (from pre-decoded queue)
   */
  async playChunk(chunkIndex: number): Promise<void> {
    if (!this.audioContext) {
      await this.initializeAudioContext();
    }

    await this.ensureContextResumed();

    // ✅ FIX: Stop any current source IMMEDIATELY when a new chunk is requested
    // This ensures navigation (Next/Prev) is responsive even if the next chunk takes a moment to load
    if (this.currentSource) {
      console.log(`[${this.instanceId}] Stopping current playback for navigation to #${chunkIndex}`);
      try {
        if (this.currentSource.onended) {
          this.currentSource.onended = null;
        }
        this.currentSource.stop();
      } catch (e) {
        // Already stopped
      }
      this.currentSource.disconnect();
      this.currentSource = null;
    }

    // Reset scheduled next start time for jump
    this.nextStartTime = 0;

    // Check if chunk is pre-decoded
    const queuedBuffer = this.playbackQueue.find(q => q.chunkIndex === chunkIndex);
    if (!queuedBuffer) {
      console.warn(`[${this.instanceId}][playChunk] Chunk #${chunkIndex} missing from queue. Call enqueueChunk first.`);
      throw new Error(`Chunk ${chunkIndex} not found in playback queue. Pre-decode it first.`);
    }

    const { buffer, duration } = queuedBuffer;

    try {
      // Create new source
      this.currentSource = this.audioContext!.createBufferSource();
      this.currentSource.buffer = buffer;
      // ✅ FIX: Always use playbackRate = 1.0 because speed is already encoded by TTS API
      // TTS API's rate parameter encodes speed while preserving pitch
      // Web Audio API's playbackRate changes both speed AND pitch
      // So we skip Web Audio playbackRate to avoid double-applying speed and pitch changes
      this.currentSource.playbackRate.value = 1.0;
      this.currentSource.connect(this.gainNode!);

      // Calculate start time (seamless if resuming, or scheduled)
      let startTime: number;

      if (this.isPaused && this.pausedTime > 0) {
        // Resuming from pause
        startTime = this.audioContext!.currentTime;
        this.pausedOffset = 0;
        this.pausedTime = 0;
        this.isPaused = false;
      } else if (this.nextStartTime > this.audioContext!.currentTime) {
        // Schedule ahead for seamless transition
        startTime = this.nextStartTime;
      } else {
        // Start immediately
        startTime = this.audioContext!.currentTime;
      }

      // Set up ended handler for seamless next chunk
      // Store reference to handler so we can clear it on pause/stop
      const endedHandler = () => {
        // Double-check flags when handler fires (defensive check)
        if (this.isPlaying && !this.isPaused) {
          this.onChunkEnded(chunkIndex);
        } else {
          console.log(`[${this.instanceId}] Ignoring onended event - playback state changed`);
        }
      };
      this.currentSource.onended = endedHandler;
      // Store handler reference for cleanup
      (this.currentSource as any)._endedHandler = endedHandler;

      // Start playback
      this.currentSource.start(startTime);

      // Update state
      this.currentChunkIndex = chunkIndex;
      this.isPlaying = true;
      this.isPaused = false;

      // Calculate next chunk start time (for seamless transition)
      // ✅ FIX: Use duration directly - speed is already encoded by TTS API
      // No need to divide by playbackRate since Web Audio playbackRate = 1.0
      const playbackDuration = duration;
      this.nextStartTime = startTime + playbackDuration;

      // ✅ FIX: Don't remove from queue yet - keep it until chunk finishes
      // This prevents "Chunk not found" errors when external playChunk() is called
      // Queue removal happens in onChunkEnded() after playback completes


      this.eventHandlers.onPlay?.(chunkIndex);
    } catch (error) {
      console.error(`[${this.instanceId}] Failed to play chunk ${chunkIndex}:`, error);
      this.isPlaying = false;
      this.eventHandlers.onError?.(TTSErrorHandler.handleAudioError(error));
      throw error;
    }
  }

  /**
   * Handle chunk ended - notify external handler only (no internal auto-advance)
   */
  private onChunkEnded(chunkIndex: number): void {
    console.log(`[${this.instanceId}] Chunk #${chunkIndex} ended`);

    // ✅ FIX: Check if we should process this event (might have been paused/stopped)
    if (!this.isPlaying || this.isPaused) {
      console.log(`[${this.instanceId}] Ignoring chunk ended event - playback stopped or paused`);
      return;
    }

    // Remove chunk from queue AFTER it finishes (not when it starts)
    const queueIndex = this.playbackQueue.findIndex(q => q.chunkIndex === chunkIndex);
    if (queueIndex !== -1) {
      this.playbackQueue.splice(queueIndex, 1);
    }

    this.currentSource = null;

    // ✅ FIX: Only notify external handler - let hook control all transitions
    // Removed internal auto-advance - hook will handle it via onChunkComplete callback
    this.eventHandlers.onChunkComplete?.(chunkIndex);

    // Check if we should end playback? 
    // ✅ FIX: Removed auto-stop logic based on playbackQueue.length.
    // In a buffering system, the queue might be empty just because fetch is slow.
    // The GlobalAudioPlayer/hook now manages the end-of-chapter state based on chunk count.
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.currentSource && this.isPlaying) {
      // ✅ FIX: Set flags FIRST to prevent onended handler from firing
      this.isPaused = true;
      this.isPlaying = false;

      try {
        // ✅ FIX: Clear onended handler BEFORE stopping to prevent race condition
        if (this.currentSource.onended) {
          this.currentSource.onended = null;
        }
        if ((this.currentSource as any)._endedHandler) {
          delete (this.currentSource as any)._endedHandler;
        }

        this.currentSource.stop();
        this.pausedOffset = this.getCurrentTime();
        this.pausedTime = this.audioContext?.currentTime || 0;
      } catch (e) {
        // Source may have already ended
      }

      this.currentSource?.disconnect();
      this.currentSource = null;

      console.log(`[${this.instanceId}] Playback paused at offset ${this.pausedOffset.toFixed(2)}s`);
      this.eventHandlers.onPause?.(this.currentChunkIndex || 0);
    }
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    if (this.isPaused && this.currentChunkIndex !== null) {
      await this.ensureContextResumed();

      // Replay current chunk from paused offset
      await this.playChunk(this.currentChunkIndex);

      console.log(`[${this.instanceId}] Playback resumed`);
      this.eventHandlers.onResume?.(this.currentChunkIndex);
    }
  }

  /**
   * Stop playback and clear queue
   */
  stop(): void {
    // ✅ FIX: Set flags FIRST to prevent any onended handlers from processing
    this.isPlaying = false;
    this.isPaused = false;

    if (this.currentSource) {
      // ✅ FIX: Clear onended handler BEFORE stopping to prevent race condition
      if (this.currentSource.onended) {
        this.currentSource.onended = null;
      }
      if ((this.currentSource as any)._endedHandler) {
        delete (this.currentSource as any)._endedHandler;
      }

      try {
        this.currentSource.stop();
      } catch (e) {
        // Source may have already ended
      }
      this.currentSource.disconnect();
      this.currentSource = null;
    }

    // Clear all state
    this.currentChunkIndex = null;
    this.nextStartTime = 0;
    this.pausedOffset = 0;
    this.pausedTime = 0;
    // ✅ FIX: Don't clear playbackQueue here. 
    // We want to keep pre-decoded chunks available for checking "next" or "prev" navigation
    // The queue will be managed by enqueueChunk (max size) or explicit cleanup()

    this.eventHandlers.onStop?.();
  }

  /**
   * Set playback rate
   * Note: Speed is encoded by TTS API, so we don't apply it via Web Audio API
   * This method is kept for interface compatibility but doesn't change playback speed
   */
  setPlaybackRate(rate: number): void {
    // Store rate for reference (but don't use it)
    // Clamp speed between 0.5x and 1.5x
    this.playbackRate = Math.max(0.5, Math.min(1.5, rate));

    // ✅ FIX: Always keep Web Audio playbackRate at 1.0
    // Speed is already encoded in the audio by TTS API (preserves pitch)
    // Web Audio API playbackRate would change both speed AND pitch
    if (this.currentSource) {
      this.currentSource.playbackRate.value = 1.0;
    }

    // Recalculate next start time using actual audio duration (no speed adjustment needed)
    if (this.isPlaying && this.currentChunkIndex !== null) {
      const queued = this.decodedBuffers.get(this.currentChunkIndex);
      if (queued) {
        // Duration is already adjusted by TTS API, use it directly
        const remainingDuration = queued.duration - this.getCurrentTime();
        this.nextStartTime = (this.audioContext?.currentTime || 0) + remainingDuration;
      }
    }

  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) {
      return this.pausedOffset;
    }

    if (this.currentSource && this.nextStartTime > 0) {
      const elapsed = this.audioContext.currentTime - (this.nextStartTime - (this.currentSource.buffer?.duration || 0) / this.playbackRate);
      return Math.max(0, elapsed);
    }

    return this.pausedOffset;
  }

  /**
   * Get duration of current chunk
   */
  getDuration(): number {
    if (this.currentChunkIndex !== null) {
      const buffer = this.decodedBuffers.get(this.currentChunkIndex);
      return buffer ? buffer.duration / this.playbackRate : 0;
    }
    return 0;
  }

  /**
   * Check if playing
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying && !this.isPaused;
  }

  /**
   * Check if paused
   */
  isCurrentlyPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Get current chunk index
   */
  getCurrentChunkIndex(): number | null {
    return this.currentChunkIndex;
  }

  /**
   * Set event handlers
   */
  setEventHandlers(handlers: TTSEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * Get AudioContext (for advanced use)
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Clear all buffers and queue
   */
  clearQueue(): void {
    this.playbackQueue = [];
    this.decodedBuffers.clear();
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    this.stop();
    this.clearQueue();

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }
  }
}

/**
 * Factory function to create seamless playback service
 */
export function createTTSSeamlessPlaybackService(
  config?: SeamlessPlaybackConfig
): TTSSeamlessPlaybackService {
  return new TTSSeamlessPlaybackService(config);
}

