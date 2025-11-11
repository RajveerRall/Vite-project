// src/services/BackgroundAudioService.ts

export interface AudioChunk {
  id: string;
  text: string;
  audioUrl: string;
  duration: number;
}

export interface BackgroundAudioState {
  isPlaying: boolean;
  isPaused: boolean;
  currentChunkIndex: number;
  totalChunks: number;
  currentTime: number;
  totalDuration: number;
  playbackRate: number;
}

class BackgroundAudioService {
  private audioContext: AudioContext | null = null;
  private audioBuffer: Map<string, AudioBuffer> = new Map();
  private currentSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private chunks: AudioChunk[] = [];
  private currentChunkIndex = 0;
  private isPlaying = false;
  private isPaused = false;
  private startTime = 0;
  private pausedTime = 0;
  private playbackRate = 1.0;
  private volume = 1.0;

  // Event callbacks
  private onChunkComplete?: (chunkIndex: number) => void;
  private onPlaybackComplete?: () => void;
  private onStateChange?: (state: BackgroundAudioState) => void;
  private onError?: (error: Error) => void;

  constructor() {
    this.initializeAudioContext();
    this.setupServiceWorker();
  }

  private async initializeAudioContext() {
    try {
      // Create audio context with user gesture
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.volume;

      console.log('[BackgroundAudio] Audio context initialized');
    } catch (error) {
      console.error('[BackgroundAudio] Failed to initialize audio context:', error);
      this.onError?.(error as Error);
    }
  }

  private setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/worker.js')
        .then(registration => {
          console.log('[BackgroundAudio] Service Worker registered:', registration);
        })
        .catch(error => {
          console.error('[BackgroundAudio] Service Worker registration failed:', error);
        });
    }
  }

  // Set audio chunks for playback
  setChunks(chunks: AudioChunk[]) {
    this.chunks = chunks;
    this.currentChunkIndex = 0;
    this.resetPlayback();
    console.log(`[BackgroundAudio] Set ${chunks.length} audio chunks`);
  }

  // Start playback
  async play() {
    if (!this.audioContext || this.chunks.length === 0) {
      console.warn('[BackgroundAudio] Cannot play: no audio context or chunks');
      return;
    }

    try {
      if (this.isPaused) {
        // Resume from pause
        this.resume();
        return;
      }

      this.isPlaying = true;
      this.isPaused = false;
      this.startTime = this.audioContext.currentTime;
      
      await this.playChunk(this.currentChunkIndex);
      this.notifyStateChange();
      
      console.log('[BackgroundAudio] Started playback');
    } catch (error) {
      console.error('[BackgroundAudio] Play failed:', error);
      this.onError?.(error as Error);
    }
  }

  // Pause playback
  pause() {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.isPaused = true;
    
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }

    if (this.audioContext) {
      this.pausedTime = this.audioContext.currentTime - this.startTime;
    }

    this.notifyStateChange();
    console.log('[BackgroundAudio] Paused playback');
  }

  // Resume playback
  async resume() {
    if (!this.isPaused || !this.audioContext) return;

    this.isPlaying = true;
    this.isPaused = false;
    this.startTime = this.audioContext.currentTime - this.pausedTime;
    
    await this.playChunk(this.currentChunkIndex);
    this.notifyStateChange();
    
    console.log('[BackgroundAudio] Resumed playback');
  }

  // Stop playback
  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }

    this.resetPlayback();
    this.notifyStateChange();
    console.log('[BackgroundAudio] Stopped playback');
  }

  // Skip to specific chunk
  async skipToChunk(chunkIndex: number) {
    if (chunkIndex < 0 || chunkIndex >= this.chunks.length) {
      console.warn('[BackgroundAudio] Invalid chunk index:', chunkIndex);
      return;
    }

    this.currentChunkIndex = chunkIndex;
    
    if (this.isPlaying) {
      if (this.currentSource) {
        this.currentSource.stop();
        this.currentSource = null;
      }
      await this.playChunk(chunkIndex);
    }

    this.notifyStateChange();
    console.log(`[BackgroundAudio] Skipped to chunk ${chunkIndex}`);
  }

  // Set playback rate
  setPlaybackRate(rate: number) {
    this.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    
    if (this.currentSource) {
      this.currentSource.playbackRate.value = this.playbackRate;
    }

    this.notifyStateChange();
    console.log(`[BackgroundAudio] Playback rate set to ${this.playbackRate}`);
  }

  // Set volume
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }

    this.notifyStateChange();
    console.log(`[BackgroundAudio] Volume set to ${this.volume}`);
  }

  // Private method to play a specific chunk
  private async playChunk(chunkIndex: number) {
    if (!this.audioContext || chunkIndex >= this.chunks.length) {
      this.onPlaybackComplete?.();
      return;
    }

    const chunk = this.chunks[chunkIndex];
    
    try {
      // Get or load audio buffer
      let audioBuffer = this.audioBuffer.get(chunk.id);
      
      if (!audioBuffer) {
        audioBuffer = await this.loadAudioBuffer(chunk.audioUrl);
        this.audioBuffer.set(chunk.id, audioBuffer);
      }

      // Create and configure source
      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.playbackRate.value = this.playbackRate;
      
      // Connect to gain node
      this.currentSource.connect(this.gainNode!);
      
      // Set up completion handler
      this.currentSource.onended = () => {
        this.onChunkComplete?.(chunkIndex);
        
        // Play next chunk if available
        if (chunkIndex + 1 < this.chunks.length) {
          this.currentChunkIndex = chunkIndex + 1;
          this.playChunk(chunkIndex + 1);
        } else {
          // Playback complete
          this.onPlaybackComplete?.();
          this.stop();
        }
      };

      // Start playback
      this.currentSource.start(0);
      this.currentChunkIndex = chunkIndex;
      
      console.log(`[BackgroundAudio] Playing chunk ${chunkIndex}: ${chunk.text.substring(0, 50)}...`);
      
    } catch (error) {
      console.error(`[BackgroundAudio] Failed to play chunk ${chunkIndex}:`, error);
      this.onError?.(error as Error);
    }
  }

  // Load audio buffer from URL
  private async loadAudioBuffer(url: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  // Reset playback state
  private resetPlayback() {
    this.currentChunkIndex = 0;
    this.startTime = 0;
    this.pausedTime = 0;
  }

  // Notify state change
  private notifyStateChange() {
    const state: BackgroundAudioState = {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentChunkIndex: this.currentChunkIndex,
      totalChunks: this.chunks.length,
      currentTime: this.getCurrentTime(),
      totalDuration: this.getTotalDuration(),
      playbackRate: this.playbackRate
    };

    this.onStateChange?.(state);
  }

  // Get current playback time
  private getCurrentTime(): number {
    if (!this.audioContext) return 0;
    
    if (this.isPaused) {
      return this.pausedTime;
    }
    
    return this.audioContext.currentTime - this.startTime;
  }

  // Get total duration
  private getTotalDuration(): number {
    return this.chunks.reduce((total, chunk) => total + chunk.duration, 0);
  }

  // Event handlers
  on(event: 'chunkComplete', callback: (chunkIndex: number) => void): void;
  on(event: 'playbackComplete', callback: () => void): void;
  on(event: 'stateChange', callback: (state: BackgroundAudioState) => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
  on(event: string, callback: any): void {
    switch (event) {
      case 'chunkComplete':
        this.onChunkComplete = callback;
        break;
      case 'playbackComplete':
        this.onPlaybackComplete = callback;
        break;
      case 'stateChange':
        this.onStateChange = callback;
        break;
      case 'error':
        this.onError = callback;
        break;
    }
  }

  // Get current state
  getState(): BackgroundAudioState {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentChunkIndex: this.currentChunkIndex,
      totalChunks: this.chunks.length,
      currentTime: this.getCurrentTime(),
      totalDuration: this.getTotalDuration(),
      playbackRate: this.playbackRate
    };
  }

  // Cleanup
  destroy() {
    this.stop();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.audioBuffer.clear();
    this.chunks = [];
    
    console.log('[BackgroundAudio] Service destroyed');
  }
}

// Export singleton instance
export const backgroundAudioService = new BackgroundAudioService(); 