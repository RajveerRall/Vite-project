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
  private stream: any = null;
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
  
  // Audio generation callbacks
  private resolveAudioGeneration: ((audioBlob: Blob) => void) | null = null;
  private rejectAudioGeneration: ((error: Error) => void) | null = null;
  
  constructor() {
    this.audioContext = new AudioContext();
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

      // Check for WebGPU support
      const supportsWebGPU = 'gpu' in navigator;
      console.log("WebGPU supported:", supportsWebGPU);

      // Initialize Kokoro TTS
      const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
      progressCallback(30);

      // Automatically choose the best device/dtype combination
      let device: "webgpu" | "wasm" | "cpu";
      let dtype: "fp32" | "fp16" | "q8" | "q4" | "q4f16";
      
      if (supportsWebGPU) {
        device = "webgpu";
        dtype = "fp32";
        console.log(`[KokoroTTSService] Auto-detected WebGPU support: Using WebGPU + fp32 (best quality)`);
      } else {
        device = "wasm";
        dtype = "q8";
        console.log(`[KokoroTTSService] No WebGPU support: Using WASM + q8 (compatible)`);
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
   * Generate audio using streaming approach (same as playText but captures audio instead of playing)
   */
  public async generateAudioStream(text: string, voice?: string): Promise<Blob> {
    if (!this.tts || !this.modelLoaded) {
      throw new Error('TTS model not loaded. Call initialize() first.');
    }
    
    try {
      console.log(`[KokoroTTSService] Generating audio stream with voice: ${voice || this.selectedVoice}`);
      
      // Store the voice if provided
      if (voice) {
        this.selectedVoice = voice;
      }
      
      // Capture audio chunks instead of playing them
      const audioChunks: Blob[] = [];
      
      // Create a new abort controller
      this.abortController = new AbortController();
      const signal = this.abortController.signal;
      
      // Create a new splitter and stream
      const splitter = new TextSplitterStream();
      this.splitter = splitter;
      
      // Set up the stream (same as playText)
      console.log(`[KokoroTTSService] Using voice: ${this.selectedVoice}`);
      const stream = this.tts.stream(splitter);
      this.stream = stream;
      
      // Process the stream to capture audio
      (async () => {
        try {
          let fullText = '';
          
          for await (const chunk of stream) {
            // Check if we've been aborted
            if (signal.aborted) break;
            
            // Extract text and audio from the chunk
            const { text, audio } = chunk as TTSAudioChunk;
            console.log("Received chunk:", { text, hasAudio: !!audio });
            
            // Update fullText for internal tracking
            fullText += text;
            
            if (!audio) {
              console.warn("No audio in chunk");
              continue;
            }
            
            try {
              // Handle Kokoro's audio format and capture instead of playing
              let audioBlob: Blob;
              if (audio.toBlob && typeof audio.toBlob === 'function') {
                console.log("Using toBlob method");
                audioBlob = await audio.toBlob();
              }
              else if (audio.toWav && typeof audio.toWav === 'function') {
                console.log("Using toWav method");
                const wavData = audio.toWav();
                audioBlob = new Blob([wavData], { type: 'audio/wav' });
              }
              else if (audio.audio && audio.sampling_rate) {
                console.log("Using raw audio data");
                // Convert raw audio to blob
                const audioBuffer = this.createAudioBufferFromRaw(audio.audio, audio.sampling_rate);
                const wavBlob = this.audioBufferToWav(audioBuffer);
                audioBlob = wavBlob;
              }
              else {
                console.error("Unrecognized audio format:", audio);
                continue;
              }
              
              // Store the audio chunk instead of playing it
              audioChunks.push(audioBlob);
              console.log(`[KokoroTTSService] Captured audio chunk: ${audioBlob.size} bytes`);
              
            } catch (audioError) {
              console.error("Error processing audio chunk:", audioError);
            }
          }
          
          // Signal completion
          if (!signal.aborted) {
            console.log(`[KokoroTTSService] Stream processing complete. Captured ${audioChunks.length} chunks`);
            // Combine audio chunks and resolve
            if (audioChunks.length > 0) {
              const combinedBlob = await this.combineAudioBlobs(audioChunks);
              this.resolveAudioGeneration?.(combinedBlob);
            } else {
              this.rejectAudioGeneration?.(new Error('No audio chunks generated'));
            }
          }
        } catch (error: unknown) {
          if (!signal.aborted) {
            console.error('Error processing TTS stream:', error);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.rejectAudioGeneration?.(new Error(`Error generating audio: ${errorMsg}`));
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
        // Longer delay for larger chunks to give GPU time to process
        const delay = Math.min(100, Math.max(20, chunk.length / 10));
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Close the stream
      console.log("Closing text splitter stream");
      splitter.close();
      
      // Wait for audio generation to complete
      return new Promise<Blob>((resolve, reject) => {
        this.resolveAudioGeneration = resolve;
        this.rejectAudioGeneration = reject;
        
        // Set a timeout to prevent hanging
        setTimeout(() => {
          if (this.resolveAudioGeneration) {
            reject(new Error('Audio generation timeout'));
          }
        }, 60000); // 60 second timeout
      });
      
    } catch (error: unknown) {
      console.error('Error starting audio generation:', error);
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
      this.stream = stream;
      
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
    
    // if (this.splitter) {
    //   this.splitter.close();
    //   this.splitter = null;
    // }
    
    // this.stream = null;
    // this.audioQueue = [];


    if (this.splitter) {
      try {
        this.splitter.close();
      } catch (err) {
        // Splitter might already be closed, that's okay
        console.log("Splitter already closed or closing failed:", err);
      }
      this.splitter = null;
    }
    
    this.stream = null;
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
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
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
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        audioBuffers.push(audioBuffer);
        totalLength += audioBuffer.length;
        
        // Use the sample rate from the first buffer
        if (i === 0) {
          sampleRate = audioBuffer.sampleRate;
        }
        
        console.log(`[KokoroTTSService] Decoded chunk ${i + 1}: ${audioBuffer.length} samples at ${audioBuffer.sampleRate}Hz`);
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
      
      // Convert combined buffer to WAV blob
      const wavBlob = this.audioBufferToWav(combinedBuffer);
      
      // Close audio context
      audioContext.close();
      
      console.log(`[KokoroTTSService] Successfully combined audio: ${wavBlob.size} bytes`);
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