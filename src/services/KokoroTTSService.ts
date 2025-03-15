import { KokoroTTS, TextSplitterStream } from 'kokoro-js';

// Define interfaces
export interface ProgressInfo {
  progress: number;
  loaded: number;
  total: number;
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
  
  // Callbacks
  private onProgressUpdate: ProgressCallback | null = null;
  private onTextUpdate: TextCallback | null = null;
  private onError: ErrorCallback | null = null;
  private onPlaybackComplete: CompletionCallback | null = null;
  
  constructor() {
    this.audioContext = new AudioContext();
  }
  
  /**
   * Initialize the TTS engine
   */
  public async initialize(progressCallback: ProgressCallback): Promise<void> {
    try {
      // Set callback
      this.onProgressUpdate = progressCallback;
      progressCallback(10);
      
      console.log("Initializing Kokoro TTS...");
      
      // Check for WebGPU support
      const supportsWebGPU = 'gpu' in navigator;
      console.log("WebGPU supported:", supportsWebGPU);
      
      // Initialize Kokoro TTS
      const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
      progressCallback(30);
      
      // Initialize the model
      this.tts = await KokoroTTS.from_pretrained(model_id, {
        dtype: "fp32", // Options: "fp32", "fp16", "q8", "q4", "q4f16"
        device: supportsWebGPU ? "webgpu" : "wasm", // Use WebGPU if available
        progress_callback: (progressInfo: ProgressInfo) => {
          console.log("Loading progress:", progressInfo);
          // Ensure we're using a number for calculations
          const progressValue = typeof progressInfo === 'number' 
            ? progressInfo 
            : (progressInfo.progress || 0);
            
          this.onProgressUpdate?.(30 + Math.round(progressValue * 70));
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
      
      // Set up the stream
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
      
      // Feed the text to the stream
      const cleanText = this.preprocessText(text);
      const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
      
      console.log(`Splitting text into ${sentences.length} sentences`);
      
      for (const sentence of sentences) {
        if (signal.aborted) break;
        splitter.push(sentence);
        console.log("Pushed sentence to stream:", sentence);
        await new Promise(resolve => setTimeout(resolve, 10));
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
        console.warn("Splitter already closed:", err);
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
}