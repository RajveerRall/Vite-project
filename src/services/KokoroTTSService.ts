import { KokoroTTS, TextSplitterStream } from 'kokoro-js';

// Define interfaces
export interface ProgressInfo {
  progress?: number;
  loaded?: number;
  total?: number;
}

export interface TTSAudioChunk {
  text: string;
  audio: any;
}

export type ProgressCallback = (progress: number) => void;
export type TextCallback = (text: string) => void;
export type ErrorCallback = (error: string) => void;
export type CompletionCallback = () => void;

export class KokoroTTSService {
  private tts: any = null;
  private audioContext: AudioContext | null = null;
  private splitter: TextSplitterStream | null = null;
  private audioQueue: AudioBuffer[] = [];
  private currentAudioSource: AudioBufferSourceNode | null = null;
  private abortController: AbortController | null = null;
  private isPaused: boolean = false;
  private playbackRate: number = 1.0;
  private modelLoaded: boolean = false;
  private selectedVoice: string = 'af_heart'; // Default voice
  
  // Callbacks
  private onProgressUpdate: ProgressCallback | null = null;
  private onTextUpdate: TextCallback | null = null;
  private onError: ErrorCallback | null = null;
  private onPlaybackComplete: CompletionCallback | null = null;
  
  constructor() {
    this.audioContext = new AudioContext();
  }
  
  /**
   * Check if WebGPU is actually available and functional
   */
  private async verifyWebGPUSupport(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
      return false;
    }
    
    try {
      // Try to actually request a WebGPU adapter
      const gpu = navigator.gpu as any;
      const adapter = await gpu.requestAdapter({
        powerPreference: 'high-performance' // Prefer dedicated GPU
      });
      
      if (!adapter) {
        console.warn('[KokoroTTSService] WebGPU adapter request returned null');
        return false;
      }
      
      // Log adapter info for debugging
      try {
        const info = await adapter.requestAdapterInfo?.();
        if (info) {
          console.log('[KokoroTTSService] WebGPU adapter info:', {
            vendor: info.vendor,
            architecture: info.architecture,
            device: info.device,
            description: info.description
          });
        }
      } catch (infoError) {
        // requestAdapterInfo might not be available in all browsers
        console.log('[KokoroTTSService] WebGPU adapter obtained, but adapter info not available');
      }
      
      return true;
    } catch (error) {
      console.warn('[KokoroTTSService] WebGPU adapter request failed:', error);
      return false;
    }
  }
  
  /**
   * Initialize the TTS engine
   */
  // Update the progress callback to ensure values are within the correct range
  public async initialize(progressCallback: ProgressCallback, voice?: string): Promise<void> {
    try {
      // Set callback
      this.onProgressUpdate = progressCallback;
      
      // Store the selected voice
      if (voice) {
        this.selectedVoice = voice;
        console.log(`[KokoroTTSService] Initializing with voice: ${voice}`);
      }
      
      progressCallback(10);

      console.log("Initializing Kokoro TTS...");

      // Check for WebGPU support with actual adapter verification
      const supportsWebGPU = await this.verifyWebGPUSupport();
      console.log("WebGPU supported:", supportsWebGPU);

      // Initialize Kokoro TTS
      const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
      progressCallback(30);

      // Automatically choose the best device/dtype combination
      // Use fp32 for both WebGPU and WASM to ensure voice parameter works correctly
      let device: "webgpu" | "wasm" | "cpu";
      let dtype: "fp32" | "fp16" | "q8" | "q4" | "q4f16";
      
      if (supportsWebGPU) {
        device = "webgpu";
        dtype = "fp32";
        console.log(`[KokoroTTSService] Auto-detected WebGPU support: Using WebGPU + fp32 (best performance)`);
      } else {
        device = "wasm";
        dtype = "fp32"; // Use fp32 for consistency and voice parameter support (slower but better quality)
        console.log(`[KokoroTTSService] No WebGPU support: Using WASM + fp32 (slower but compatible)`);
      }
      
      console.log(`[KokoroTTSService] Initializing with device: ${device}, dtype: ${dtype}`);
      
      this.tts = await KokoroTTS.from_pretrained(model_id, {
        dtype: dtype,
        device: device,
        progress_callback: (progressInfo: any) => {
          console.log("Loading progress:", progressInfo);
          // Ensure we're using a number for calculations
          const progressValue = typeof progressInfo === 'number' 
            ? progressInfo 
            : (progressInfo.progress || 0);
          
          // Ensure progressValue is within 0 to 1 range
          const clampedProgressValue = Math.max(0, Math.min(1, progressValue));
          
          this.onProgressUpdate?.(30 + Math.round(clampedProgressValue * 70));
        }
      });

      console.log("Kokoro TTS model loaded successfully");
      
      // Verify what execution provider is actually being used
      try {
        console.log('[KokoroTTSService] Requested device:', device);
        console.log('[KokoroTTSService] Requested dtype:', dtype);
        
        // Try to access ONNX Runtime session info if available
        if (this.tts?.model?.session) {
          const session = this.tts.model.session;
          console.log('[KokoroTTSService] ONNX Runtime session found');
          
          // Check if we can access execution providers
          if (session?.executionProviders) {
            console.log('[KokoroTTSService] Active execution providers:', session.executionProviders);
          }
          
          // Try to get input/output names as a way to verify session is working
          try {
            const inputNames = session.inputNames || [];
            const outputNames = session.outputNames || [];
            console.log('[KokoroTTSService] Session inputs:', inputNames.length, 'outputs:', outputNames.length);
          } catch (e) {
            // Ignore if not accessible
          }
        }
        
        // Check if kokoro-js exposes device info
        if (this.tts?.device !== undefined) {
          console.log('[KokoroTTSService] Actual device in use (from TTS instance):', this.tts.device);
        }
        
        // Check for any device-related properties
        const ttsKeys = Object.keys(this.tts || {});
        const deviceRelatedKeys = ttsKeys.filter(key => 
          key.toLowerCase().includes('device') || 
          key.toLowerCase().includes('gpu') ||
          key.toLowerCase().includes('execution')
        );
        if (deviceRelatedKeys.length > 0) {
          console.log('[KokoroTTSService] Device-related properties found:', deviceRelatedKeys);
        }
      } catch (err) {
        console.warn('[KokoroTTSService] Could not verify execution provider:', err);
      }
      
      this.modelLoaded = true;
      progressCallback(100);
    } catch (error: unknown) {
      console.error('Error initializing Kokoro TTS:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (this.onError) {
        this.onError(`Failed to initialize TTS: ${errorMsg}`);
      }
      throw error;
    }
  }
  
  /**
   * Set callbacks for the TTS service
   */
  public setCallbacks(
    onTextUpdate: TextCallback,
    onError: ErrorCallback,
    onPlaybackComplete: CompletionCallback
  ): void {
    this.onTextUpdate = onTextUpdate;
    this.onError = onError;
    this.onPlaybackComplete = onPlaybackComplete;
  }
  
  /**
   * Check if the model is loaded and ready
   */
  public isModelLoaded(): boolean {
    return this.modelLoaded;
  }
  
  /**
   * Generate audio with specific voice using the generate method
   */
  public async generateAudioWithVoice(text: string, voice: string): Promise<Blob> {
    if (!this.modelLoaded) {
      throw new Error('TTS model not loaded. Call initialize() first.');
    }

    try {
      console.log(`[KokoroTTSService] Generating audio with voice: ${voice}`);
      
      // Use the generate method with voice parameter
      const audio = await this.tts.generate(text, {
        voice: voice,
      });
      
      // Convert the audio to a Blob
      const audioData = await audio.arrayBuffer();
      return new Blob([audioData], { type: 'audio/wav' });
      
    } catch (error) {
      console.error('[KokoroTTSService] Error generating audio with voice:', error);
      throw error;
    }
  }

  /**
   * Generate audio using generate() method (same approach as working AudiobookGenerator)
   * This is more reliable than streaming for file generation
   */
  public async generateAudioStream(text: string, voice?: string, progressCallback?: (progress: number) => void): Promise<Blob> {
    if (!this.tts || !this.modelLoaded) {
      throw new Error('TTS model not loaded. Call initialize() first.');
    }
    
    try {
      console.log(`[KokoroTTSService] Generating audio with voice: ${voice || this.selectedVoice}`);
      
      // Store the voice if provided
      if (voice) {
        this.selectedVoice = voice;
      }
      
      // Use the same approach as AudiobookGenerator - split into chunks and generate each
      const cleanText = this.preprocessText(text);
      const chunks = this.splitTextIntoOptimalChunks(cleanText);
      
      console.log(`[KokoroTTSService] Splitting text into ${chunks.length} chunks for generation`);
      
      const audioChunks: Blob[] = [];
      
      // Generate audio for each chunk sequentially using generate() method
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`[KokoroTTSService] Generating chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
        
        try {
          // Check if voice needs to be set on the instance first
          const voiceToUse = voice || this.selectedVoice;
          console.log(`[KokoroTTSService] Generating chunk ${i + 1} with voice: "${voiceToUse}"`);
          
          // Try setting voice on instance first (if method exists)
          let audio;
          if (this.tts.setVoice && typeof this.tts.setVoice === 'function') {
            console.log(`[KokoroTTSService] setVoice() method found - setting voice on instance: "${voiceToUse}"`);
            this.tts.setVoice(voiceToUse);
            // Call generate without voice parameter (voice already set on instance)
            audio = await this.tts.generate(chunk);
            console.log(`[KokoroTTSService] Called generate() without voice parameter (voice set on instance)`);
          } else {
            // Use generate() method with voice parameter (standard approach)
            console.log(`[KokoroTTSService] No setVoice() method - calling generate() with voice parameter: "${voiceToUse}"`);
            audio = await this.tts.generate(chunk, {
              voice: voiceToUse as any,
            });
          }
          
          // Log audio object structure for debugging
          console.log(`[KokoroTTSService] generate() returned audio object:`, {
            hasAudio: !!audio.audio,
            hasSamplingRate: !!audio.sampling_rate,
            hasToBlob: !!(audio.toBlob && typeof audio.toBlob === 'function'),
            hasToWav: !!(audio.toWav && typeof audio.toWav === 'function'),
            audioLength: audio.audio ? (audio.audio as Float32Array).length : 0,
            samplingRate: audio.sampling_rate,
            keys: Object.keys(audio)
          });
          
          // Convert audio to Blob - always convert to WAV format for consistency
          let audioBlob: Blob;
          
          // Prefer raw audio data to ensure we have proper WAV format
          if (audio.audio && audio.sampling_rate) {
            // Check if audio data has actual content (not all zeros)
            const audioData = audio.audio as Float32Array;
            const audioArray = Array.from(audioData);
            const hasContent = audioArray.some((sample: number) => Math.abs(sample) > 0.001);
            if (!hasContent) {
              console.warn(`[KokoroTTSService] Warning: Chunk ${i + 1} appears to be silent (all zeros or near-zero)`);
            }
            
            // Calculate amplitude statistics (efficient for large arrays)
            let maxAmplitude = 0;
            let minAmplitude = Infinity;
            let sumAmplitude = 0;
            for (let j = 0; j < audioArray.length; j++) {
              const abs = Math.abs(audioArray[j] as number);
              if (abs > maxAmplitude) maxAmplitude = abs;
              if (abs < minAmplitude) minAmplitude = abs;
              sumAmplitude += abs;
            }
            const avgAmplitude = sumAmplitude / audioArray.length;
            
            console.log(`[KokoroTTSService] Chunk ${i + 1} raw audio stats: min=${minAmplitude.toFixed(6)}, max=${maxAmplitude.toFixed(6)}, avg=${avgAmplitude.toFixed(6)}`);
            
            if (maxAmplitude < 0.001) {
              console.warn(`[KokoroTTSService] Warning: Chunk ${i + 1} has very low amplitude (max=${maxAmplitude})`);
            }
            
            // Use raw audio data - most reliable for WAV conversion
                const audioBuffer = this.createAudioBufferFromRaw(audio.audio, audio.sampling_rate);
            
            // Validate buffer has content (efficient calculation)
            const channelData = audioBuffer.getChannelData(0);
            let bufferMaxAmplitude = 0;
            let bufferMinAmplitude = Infinity;
            for (let j = 0; j < channelData.length; j++) {
              const abs = Math.abs(channelData[j]);
              if (abs > bufferMaxAmplitude) bufferMaxAmplitude = abs;
              if (abs < bufferMinAmplitude) bufferMinAmplitude = abs;
            }
            
            console.log(`[KokoroTTSService] Chunk ${i + 1} buffer stats: min=${bufferMinAmplitude.toFixed(6)}, max=${bufferMaxAmplitude.toFixed(6)}`);
            
            audioBlob = this.audioBufferToWav(audioBuffer);
            console.log(`[KokoroTTSService] Used raw audio data - ${audioBlob.size} bytes (${audioBuffer.length} samples at ${audioBuffer.sampleRate}Hz)`);
          } else if (audio.toWav && typeof audio.toWav === 'function') {
            // Use toWav() method if available
            const wavData = audio.toWav();
            audioBlob = new Blob([wavData], { type: 'audio/wav' });
            console.log(`[KokoroTTSService] Used toWav() method - ${audioBlob.size} bytes`);
          } else if (audio.toBlob && typeof audio.toBlob === 'function') {
            // toBlob() might return different format, so decode and re-encode as WAV
            const blob = await audio.toBlob();
            console.log(`[KokoroTTSService] toBlob() returned ${blob.size} bytes, type: ${blob.type}`);
            
            // Decode and re-encode as WAV to ensure proper format
            const arrayBuffer = await blob.arrayBuffer();
            const audioContext = new AudioContext();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            audioBlob = this.audioBufferToWav(audioBuffer);
            audioContext.close();
            console.log(`[KokoroTTSService] Converted to WAV - ${audioBlob.size} bytes (${audioBuffer.length} samples at ${audioBuffer.sampleRate}Hz)`);
            } else {
            console.error('[KokoroTTSService] Audio object structure:', {
              hasAudio: !!audio.audio,
              hasSamplingRate: !!audio.sampling_rate,
              hasToBlob: !!(audio.toBlob && typeof audio.toBlob === 'function'),
              hasToWav: !!(audio.toWav && typeof audio.toWav === 'function'),
              keys: Object.keys(audio)
            });
            throw new Error('Unrecognized audio format - no valid conversion method found');
          }
          
          // Validate the blob has content
          if (!audioBlob || audioBlob.size === 0) {
            throw new Error('Generated audio blob is empty');
          }
          
          audioChunks.push(audioBlob);
          console.log(`[KokoroTTSService] Generated chunk ${i + 1}/${chunks.length}: ${audioBlob.size} bytes`);
          
          // Report progress: calculate percentage based on chunks completed
          if (progressCallback) {
            const progress = Math.round(((i + 1) / chunks.length) * 100);
            progressCallback(progress);
          }
        } catch (error) {
          console.error(`[KokoroTTSService] Error generating chunk ${i + 1}:`, error);
          throw error;
        }
      }
      
      // Combine all audio chunks
      if (audioChunks.length === 0) {
        throw new Error('No audio chunks generated');
      }
      
      console.log(`[KokoroTTSService] Combining ${audioChunks.length} audio chunks`);
      const combinedBlob = await this.combineAudioBlobs(audioChunks);
      
      return combinedBlob;
    } catch (error: unknown) {
      console.error('Error generating audio:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate audio: ${errorMsg}`);
    }
  }

  /**
   * Start text-to-speech playback
   */
  public async playText(text: string): Promise<void> {
    if (!this.tts || !this.modelLoaded) {
      this.onError?.('TTS model not loaded');
      return;
    }
    
    try {
      this.isPaused = false;
      this.cleanupAudio();
      
      console.log("Starting Kokoro TTS playback");
      
      // Create a new abort controller
      this.abortController = new AbortController();
      const signal = this.abortController.signal;
      
      // Create a new splitter and stream
      const splitter = new TextSplitterStream();
      this.splitter = splitter;
      
      // Set up the stream (voice will be handled in generate method)
      console.log(`[KokoroTTSService] Using voice: ${this.selectedVoice}`);
      const stream = this.tts.stream(splitter);
      // Note: stream is created but not used in current implementation (using generate() instead)
      
      // // Process the stream
      // (async () => {
      //   try {
      //     let fullText = '';
          
      //     for await (const chunk of stream) {
      //       // Check if we've been aborted
      //       if (signal.aborted) break;
            
      //       // Extract text and audio from the chunk
      //       const { text, audio } = chunk as TTSAudioChunk;
      //       console.log("Received chunk:", { text, hasAudio: !!audio });
            
      //       fullText += text;
      //       this.onTextUpdate?.(fullText);
            
      //       if (!audio) {
      //         console.warn("No audio in chunk");
      //         continue;
      //       }

      (async () => {
        try {
          let fullText = '';
          
          for await (const chunk of stream) {
            // Check if we've been aborted
            if (signal.aborted) break;
            
            // Extract text and audio from the chunk
            const { text, audio } = chunk as TTSAudioChunk;
            console.log("Received chunk:", { text, hasAudio: !!audio });
            
            // CHANGE THIS LINE: Pass only the current chunk's text, not the accumulated text
            this.onTextUpdate?.(text);
            
            // Still update fullText for internal tracking if needed
            fullText += text;
            
            if (!audio) {
              console.warn("No audio in chunk");
              continue;
            }
            
            try {
              // Handle Kokoro's audio format
              if (audio.toBlob && typeof audio.toBlob === 'function') {
                console.log("Using toBlob method");
                const blob = await audio.toBlob();
                const audioData = await blob.arrayBuffer();
                await this.playAudioFromArrayBuffer(audioData);
              }
              else if (audio.toWav && typeof audio.toWav === 'function') {
                console.log("Using toWav method");
                const wavData = audio.toWav();
                const blob = new Blob([wavData], { type: 'audio/wav' });
                const audioData = await blob.arrayBuffer();
                await this.playAudioFromArrayBuffer(audioData);
              }
              else if (audio.audio && audio.sampling_rate) {
                console.log("Using raw audio data");
                this.playRawAudioData(audio.audio, audio.sampling_rate);
              }
              else {
                console.error("Unrecognized audio format:", audio);
              }
            } catch (audioError) {
              console.error("Error processing audio chunk:", audioError);
            }
          }
          
          // Playback complete
          if (!signal.aborted) {
            this.onPlaybackComplete?.();
          }
        } catch (error: unknown) {
          if (!signal.aborted) {
            console.error('Error processing TTS stream:', error);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.onError?.(`Error playing audio: ${errorMsg}`);
          }
        }
      })();
      
      // Feed the text to the stream with intelligent chunking
      const cleanText = this.preprocessText(text);
      const chunks = this.splitTextIntoOptimalChunks(cleanText);
      
      console.log(`Splitting text into ${chunks.length} optimal chunks`);
      
      for (const chunk of chunks) {
        if (signal.aborted) break;
        splitter.push(chunk);
        console.log(`Pushed chunk to stream (${chunk.length} chars):`, chunk.substring(0, 50) + '...');
        
        // Add a small delay to prevent GPU overload
        const delay = Math.min(100, Math.max(20, chunk.length / 10));
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Close the stream
      console.log("Closing text splitter stream");
      splitter.close();
      
    } catch (error: unknown) {
      console.error('Error starting TTS playback:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.onError?.(`Failed to start audio: ${errorMsg}`);
    }
  }
  
  /**
   * Pause the current playback
   */
  public pause(): void {
    this.isPaused = true;
    
    if (this.currentAudioSource) {
      this.currentAudioSource.stop();
      this.currentAudioSource = null;
    }
  }
  
  /**
   * Resume playback after pausing
   */
  public resume(): void {
    this.isPaused = false;
    this.playNextAudio();
  }
  
  /**
   * Stop playback completely
   */
  public stop(): void {
    this.cleanupAudio();
  }
  
  /**
   * Set the playback rate
   */
  public setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    
    // Update the rate of the current audio source if one is playing
    if (this.currentAudioSource) {
      this.currentAudioSource.playbackRate.value = rate;
    }
  }
  
  /**
   * Clean up resources when done
   */
  public dispose(): void {
    this.cleanupAudio();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
  
  /**
   * Play audio from ArrayBuffer
   */
  private async playAudioFromArrayBuffer(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) return;
    
    try {
      console.log("Decoding audio data");
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      
      this.audioQueue.push(audioBuffer);
      
      // If this is the first audio chunk, start playing
      if (this.audioQueue.length === 1 && !this.currentAudioSource) {
        this.playNextAudio();
      }
    } catch (error) {
      console.error("Error decoding audio data:", error);
    }
  }
  
  /**
   * Play raw audio data (Float32Array with sampling rate)
   */
  private playRawAudioData(audioData: Float32Array, sampleRate: number): void {
    if (!this.audioContext) return;
    
    try {
      console.log("Creating audio buffer from raw data");
      
      // Create an audio buffer
      const audioBuffer = this.audioContext.createBuffer(
        1, // mono
        audioData.length,
        sampleRate
      );
      
      // Copy the data to the audio buffer
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < audioData.length; i++) {
        channelData[i] = audioData[i];
      }
      
      this.audioQueue.push(audioBuffer);
      
      // If this is the first audio chunk, start playing
      if (this.audioQueue.length === 1 && !this.currentAudioSource) {
        this.playNextAudio();
      }
    } catch (error) {
      console.error("Error creating audio buffer:", error);
    }
  }
  
  /**
   * Play the next audio chunk in the queue
   */
  private playNextAudio(): void {
    if (!this.audioContext || this.audioQueue.length === 0 || this.isPaused) return;
    
    console.log("Playing next audio chunk");
    
    // Create a new audio source
    const source = this.audioContext.createBufferSource();
    source.buffer = this.audioQueue[0];
    source.playbackRate.value = this.playbackRate;
    source.connect(this.audioContext.destination);
    
    // Store the source so we can stop it if needed
    this.currentAudioSource = source;
    
    // Remove this buffer from the queue
    this.audioQueue.shift();
    
    // When this audio chunk ends, play the next one
    source.onended = () => {
      console.log("Audio chunk ended");
      this.currentAudioSource = null;
      
      if (this.audioQueue.length > 0) {
        this.playNextAudio();
      } else if (!this.splitter) {
        // If we're done and the splitter is closed, we're finished
        console.log("Playback complete");
        this.onPlaybackComplete?.();
      }
    };
    
    // Start playback
    source.start();
    console.log("Started audio source");
  }
  
  /**
   * Clean up audio playback resources
   */
  private cleanupAudio(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    
    if (this.currentAudioSource) {
      this.currentAudioSource.stop();
      this.currentAudioSource.disconnect();
      this.currentAudioSource = null;
    }

    if (this.splitter) {
      try {
        this.splitter.close();
      } catch (err) {
        // Splitter might already be closed, that's okay
        console.log("Splitter already closed or closing failed:", err);
      }
      this.splitter = null;
    }
    
    this.audioQueue = [];
  }
  
  /**
   * Preprocess text to improve TTS quality
   */
  private preprocessText(text: string): string {
    // Remove excess whitespace
    let cleaned = text.replace(/\s+/g, ' ').trim();
    
    // Replace common abbreviations
    cleaned = cleaned.replace(/(\w)\.(\w)/g, '$1. $2'); // e.g., "Mr.Smith" -> "Mr. Smith"
    
    // Add periods to make sure we have complete sentences
    if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
      cleaned += '.';
    }
    
    return cleaned;
  }

  /**
   * Create AudioBuffer from raw audio data
   */
  private createAudioBufferFromRaw(audioData: Float32Array, sampleRate: number): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }
    
    const audioBuffer = this.audioContext.createBuffer(
      1, // mono
      audioData.length,
      sampleRate
    );
    
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < audioData.length; i++) {
      channelData[i] = audioData[i];
    }
    
    return audioBuffer;
  }

  /**
   * Convert AudioBuffer to WAV Blob
   */
  private audioBufferToWav(audioBuffer: AudioBuffer): Blob {
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert float samples to 16-bit PCM
    const channelData = audioBuffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      // Clamp sample to [-1, 1] range
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      // Convert to 16-bit signed integer: multiply by 32767 and round
      const int16Sample = Math.round(sample * 32767);
      view.setInt16(offset, int16Sample, true);
      offset += 2;
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * Combine multiple audio blobs into a single blob using Web Audio API
   */
  private async combineAudioBlobs(audioBlobs: Blob[]): Promise<Blob> {
    if (audioBlobs.length === 0) {
      throw new Error('No audio blobs to combine');
    }
    
    if (audioBlobs.length === 1) {
      return audioBlobs[0];
    }
    
    try {
      console.log(`[KokoroTTSService] Combining ${audioBlobs.length} audio blobs`);
      
      // Create audio context for decoding
      const audioContext = new AudioContext();
      
      // Decode all audio blobs to AudioBuffers
      const audioBuffers: AudioBuffer[] = [];
      let totalLength = 0;
      let sampleRate = 0;
      
      for (let i = 0; i < audioBlobs.length; i++) {
        const blob = audioBlobs[i];
        const arrayBuffer = await blob.arrayBuffer();
        
        // Validate WAV header before decoding
        if (arrayBuffer.byteLength >= 12) {
          const view = new DataView(arrayBuffer);
          const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
          const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
          
          if (riff !== 'RIFF' || wave !== 'WAVE') {
            console.error(`[KokoroTTSService] Invalid WAV header in chunk ${i + 1}: RIFF=${riff}, WAVE=${wave}`);
            throw new Error(`Invalid WAV format in chunk ${i + 1}`);
          }
          
          // Read sample rate from WAV header
          if (arrayBuffer.byteLength >= 28) {
            const wavSampleRate = view.getUint32(24, true);
            console.log(`[KokoroTTSService] Chunk ${i + 1} WAV header sample rate: ${wavSampleRate}Hz`);
          }
        }
        
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        audioBuffers.push(audioBuffer);
        totalLength += audioBuffer.length;
        
        // Use the sample rate from the first buffer
        if (i === 0) {
          sampleRate = audioBuffer.sampleRate;
          console.log(`[KokoroTTSService] Using sample rate: ${sampleRate}Hz for combined audio`);
        }
        
        // Validate audio has content (efficient calculation)
        const channelData = audioBuffer.getChannelData(0);
        let maxAmplitude = 0;
        let minAmplitude = Infinity;
        let sumAmplitude = 0;
        for (let j = 0; j < channelData.length; j++) {
          const abs = Math.abs(channelData[j]);
          if (abs > maxAmplitude) maxAmplitude = abs;
          if (abs < minAmplitude) minAmplitude = abs;
          sumAmplitude += abs;
        }
        const avgAmplitude = sumAmplitude / channelData.length;
        
        console.log(`[KokoroTTSService] Decoded chunk ${i + 1}: ${audioBuffer.length} samples at ${audioBuffer.sampleRate}Hz, amplitude: min=${minAmplitude.toFixed(6)}, max=${maxAmplitude.toFixed(6)}, avg=${avgAmplitude.toFixed(6)}`);
        
        if (maxAmplitude < 0.001) {
          console.warn(`[KokoroTTSService] Warning: Decoded chunk ${i + 1} has very low amplitude (max=${maxAmplitude})`);
        }
      }
      
      // Create combined audio buffer
      const combinedBuffer = audioContext.createBuffer(
        1, // mono
        totalLength,
        sampleRate
      );
      
      const combinedChannelData = combinedBuffer.getChannelData(0);
      let offset = 0;
      
      // Copy audio data from each buffer
      for (let i = 0; i < audioBuffers.length; i++) {
        const buffer = audioBuffers[i];
        const channelData = buffer.getChannelData(0);
        combinedChannelData.set(channelData, offset);
        offset += buffer.length;
        
        console.log(`[KokoroTTSService] Copied ${buffer.length} samples to combined buffer`);
      }
      
      // Validate combined audio has content (efficient calculation)
      let combinedMaxAmplitude = 0;
      let combinedMinAmplitude = Infinity;
      let combinedSumAmplitude = 0;
      for (let j = 0; j < combinedChannelData.length; j++) {
        const abs = Math.abs(combinedChannelData[j]);
        if (abs > combinedMaxAmplitude) combinedMaxAmplitude = abs;
        if (abs < combinedMinAmplitude) combinedMinAmplitude = abs;
        combinedSumAmplitude += abs;
      }
      const combinedAvgAmplitude = combinedSumAmplitude / combinedChannelData.length;
      
      console.log(`[KokoroTTSService] Combined audio stats: min=${combinedMinAmplitude.toFixed(6)}, max=${combinedMaxAmplitude.toFixed(6)}, avg=${combinedAvgAmplitude.toFixed(6)}`);
      
      if (combinedMaxAmplitude < 0.001) {
        console.error(`[KokoroTTSService] ERROR: Combined audio is silent or has no content!`);
        throw new Error('Combined audio has no audible content - all samples are near zero');
      }
      
      // Convert combined buffer to WAV blob
      const wavBlob = this.audioBufferToWav(combinedBuffer);
      
      // Close audio context
      audioContext.close();
      
      console.log(`[KokoroTTSService] Successfully combined audio: ${wavBlob.size} bytes, ${totalLength} samples at ${sampleRate}Hz`);
      return wavBlob;
      
    } catch (error) {
      console.error('Error combining audio blobs:', error);
      throw error;
    }
  }

  /**
   * Split text into optimal chunks for GPU processing
   * Prevents GPU overload by keeping chunks manageable
   */
  private splitTextIntoOptimalChunks(text: string): string[] {
    const MAX_CHUNK_LENGTH = 200; // Maximum characters per chunk
    const MAX_WORDS_PER_CHUNK = 30; // Maximum words per chunk
    
    // First, try to split by sentences
    let chunks = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    // If we have very long sentences, split them further
    const finalChunks: string[] = [];
    
    for (const chunk of chunks) {
      if (chunk.length <= MAX_CHUNK_LENGTH && chunk.split(/\s+/).length <= MAX_WORDS_PER_CHUNK) {
        // Chunk is small enough, keep as is
        finalChunks.push(chunk.trim());
      } else {
        // Chunk is too large, split it further
        const subChunks = this.splitLargeChunk(chunk, MAX_CHUNK_LENGTH, MAX_WORDS_PER_CHUNK);
        finalChunks.push(...subChunks);
      }
    }
    
    // Filter out empty chunks
    return finalChunks.filter(chunk => chunk.trim().length > 0);
  }

  /**
   * Split a large chunk into smaller pieces
   */
  private splitLargeChunk(chunk: string, maxLength: number, maxWords: number): string[] {
    const words = chunk.split(/\s+/);
    const subChunks: string[] = [];
    
    let currentChunk = '';
    let currentWordCount = 0;
    
    for (const word of words) {
      // Check if adding this word would exceed limits
      const wouldExceedLength = (currentChunk + ' ' + word).length > maxLength;
      const wouldExceedWords = currentWordCount >= maxWords;
      
      if ((wouldExceedLength || wouldExceedWords) && currentChunk.trim().length > 0) {
        // Start a new chunk
        subChunks.push(currentChunk.trim());
        currentChunk = word;
        currentWordCount = 1;
      } else {
        // Add to current chunk
        currentChunk += (currentChunk ? ' ' : '') + word;
        currentWordCount++;
      }
    }
    
    // Add the last chunk if it has content
    if (currentChunk.trim().length > 0) {
      subChunks.push(currentChunk.trim());
    }
    
    return subChunks;
  }
}