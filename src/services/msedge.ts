// // // import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// // // export interface TTSVoice {
// // //   name: string;
// // //   lang: string;
// // // }

// // // export class TTSService {
// // //   private static instance: TTSService;
// // //   private tts: MsEdgeTTS;
// // //   private voices: TTSVoice[] = [];

// // //   private constructor() {
// // //     this.tts = new MsEdgeTTS();
// // //     this.initVoices();
// // //   }

// // //   // Singleton pattern
// // //   public static getInstance(): TTSService {
// // //     if (!TTSService.instance) {
// // //       TTSService.instance = new TTSService();
// // //     }
// // //     return TTSService.instance;
// // //   }

// // //   // Initialize available voices
// // //   private async initVoices() {
// // //     try {
// // //       const availableVoices = await this.tts.getVoices();
// // //       this.voices = availableVoices.map(voice => ({
// // //         name: voice.ShortName,
// // //         lang: voice.Locale
// // //       }));
// // //     } catch (error) {
// // //       console.error('Failed to fetch voices:', error);
// // //       // Fallback voices
// // //       this.voices = [
// // //         { name: 'en-US-BrianMultilingualNeural', lang: 'en-US' },
// // //         { name: 'en-US-AriaMultilingualNeural', lang: 'en-US' }
// // //       ];
// // //     }
// // //   }

// // //   // Get available voices
// // //   public getVoices(): TTSVoice[] {
// // //     return this.voices;
// // //   }

// // //   // Generate audio from text
// // //   public async generateAudio(
// // //     text: string, 
// // //     options: { 
// // //       voice?: string, 
// // //       outputFormat?: OUTPUT_FORMAT 
// // //     } = {}
// // //   ): Promise<ArrayBuffer> {
// // //     // Use a default voice if not specified
// // //     const voiceName = options.voice || this.voices[0].name;
// // //     const outputFormat = options.outputFormat || OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS;

// // //     // Set metadata
// // //     await this.tts.setMetadata(voiceName, outputFormat);

// // //     // Collect audio chunks
// // //     return new Promise((resolve, reject) => {
// // //       const chunks: Uint8Array[] = [];

// // //       try {
// // //         const { audioStream } = this.tts.toStream(text);

// // //         audioStream.on('data', (chunk: Uint8Array) => {
// // //           chunks.push(chunk);
// // //         });

// // //         audioStream.on('end', () => {
// // //           // Combine chunks
// // //           const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
// // //           const combinedBuffer = new Uint8Array(totalLength);
// // //           let offset = 0;
// // //           chunks.forEach(chunk => {
// // //             combinedBuffer.set(chunk, offset);
// // //             offset += chunk.length;
// // //           });

// // //           resolve(combinedBuffer.buffer);
// // //         });

// // //         audioStream.on('error', (error: Error) => {
// // //           reject(error);
// // //         });
// // //       } catch (error) {
// // //         reject(error);
// // //       }
// // //     });
// // //   }

// // //   // Play audio directly
// // //   public async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
// // //     return new Promise((resolve, reject) => {
// // //       try {
// // //         const audioContext = new AudioContext();
        
// // //         audioContext.decodeAudioData(audioBuffer, (buffer) => {
// // //           const source = audioContext.createBufferSource();
// // //           source.buffer = buffer;
// // //           source.connect(audioContext.destination);
// // //           source.onended = () => resolve();
// // //           source.start(0);
// // //         }, (error) => {
// // //           reject(error);
// // //         });
// // //       } catch (error) {
// // //         reject(error);
// // //       }
// // //     });
// // //   }
// // // }


// // import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// // export interface TTSVoice {
// //   name: string;
// //   lang: string;
// // }

// // export class TTSService {
// //   private static instance: TTSService;
// //   private tts: MsEdgeTTS;
// //   private voices: TTSVoice[] = [
// //     { name: 'en-US-BrianMultilingualNeural', lang: 'en-US' }
// //   ];

// //   private constructor() {
// //     this.tts = new MsEdgeTTS();
// //     this.initVoices();
// //   }

// //   // Singleton pattern
// //   public static getInstance(): TTSService {
// //     if (!TTSService.instance) {
// //       TTSService.instance = new TTSService();
// //     }
// //     return TTSService.instance;
// //   }

// //   // Initialize available voices
// //   private async initVoices() {
// //     try {
// //       const availableVoices = await this.tts.getVoices();
// //       console.log('Available Voices:', availableVoices);
      
// //       // Prioritize 'en-US-BrianMultilingualNeural'
// //       const brianVoice = availableVoices.find(
// //         voice => voice.ShortName === 'en-US-BrianMultilingualNeural'
// //       );

// //       if (brianVoice) {
// //         this.voices = [{
// //           name: brianVoice.ShortName,
// //           lang: brianVoice.Locale
// //         }];
// //       }
// //     } catch (error) {
// //       console.error('Failed to fetch voices:', error);
// //     }
// //   }

// //   // Get available voices
// //   public getVoices(): TTSVoice[] {
// //     return this.voices;
// //   }

// //   // Generate audio from text
// //   public async generateAudio(
// //     text: string, 
// //     options: { 
// //       voice?: string, 
// //       outputFormat?: OUTPUT_FORMAT 
// //     } = {}
// //   ): Promise<ArrayBuffer> {
// //     // Always use 'en-US-BrianMultilingualNeural'
// //     const voiceName = 'en-US-BrianMultilingualNeural';
// //     const outputFormat = options.outputFormat || OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS;

// //     console.log('Generating Audio with:', {
// //       voiceName,
// //       outputFormat
// //     });

// //     // Set metadata with explicit locale
// //     try {
// //       await this.tts.setMetadata(
// //         voiceName, 
// //         outputFormat,
// //         { 
// //           voiceLocale: 'en-US' 
// //         }
// //       );
// //     } catch (metadataError) {
// //       console.error('Metadata Set Error:', metadataError);
// //       throw metadataError;
// //     }

// //     // Collect audio chunks
// //     return new Promise((resolve, reject) => {
// //       const chunks: Uint8Array[] = [];

// //       try {
// //         const { audioStream } = this.tts.toStream(text);

// //         audioStream.on('data', (chunk: Uint8Array) => {
// //           chunks.push(chunk);
// //         });

// //         audioStream.on('end', () => {
// //           // Combine chunks
// //           const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
// //           const combinedBuffer = new Uint8Array(totalLength);
// //           let offset = 0;
// //           chunks.forEach(chunk => {
// //             combinedBuffer.set(chunk, offset);
// //             offset += chunk.length;
// //           });

// //           resolve(combinedBuffer.buffer);
// //         });

// //         audioStream.on('error', (error: Error) => {
// //           reject(error);
// //         });
// //       } catch (streamError) {
// //         console.error('Stream Generation Error:', streamError);
// //         reject(streamError);
// //       }
// //     });
// //   }

// //   // Play audio directly
// //   public async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
// //     return new Promise((resolve, reject) => {
// //       try {
// //         const audioContext = new AudioContext();
        
// //         audioContext.decodeAudioData(audioBuffer, (buffer) => {
// //           const source = audioContext.createBufferSource();
// //           source.buffer = buffer;
// //           source.connect(audioContext.destination);
// //           source.onended = () => resolve();
// //           source.start(0);
// //         }, (error) => {
// //           reject(error);
// //         });
// //       } catch (error) {
// //         reject(error);
// //       }
// //     });
// //   }
// // }
// // src/services/msedge.ts
// export interface TTSOptions {
//     voice?: string;
//     format?: string;
//     rate?: number;
//     pitch?: string;
//   }
  
//   export class TTSService {
//     private static instance: TTSService;
//     private serverUrl: string;
//     private currentAudio: HTMLAudioElement | null = null;
  
//     private constructor() {
//       // The URL of your proxy server
//       this.serverUrl = import.meta.env.VITE_TTS_SERVER_URL || 'http://localhost:5000/api/tts';
//     }
  
//     public static getInstance(): TTSService {
//       if (!TTSService.instance) {
//         TTSService.instance = new TTSService();
//       }
//       return TTSService.instance;
//     }
  
//     async generateAudio(text: string, options: TTSOptions = {}): Promise<Blob> {
//       try {
//         console.log('Generating Audio with:', options);
  
//         // Make a request to our proxy server
//         const response = await fetch(this.serverUrl, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             text,
//             voice: options.voice || 'en-US-BrianMultilingualNeural',
//             format: options.format || 'webm-24khz-16bit-mono-opus',
//             rate: options.rate,
//             pitch: options.pitch
//           }),
//         });
  
//         if (!response.ok) {
//           const errorData = await response.json();
//           throw new Error(errorData.error || 'Failed to generate audio');
//         }
  
//         // Get the audio blob from the response
//         return await response.blob();
//       } catch (error) {
//         console.error('Error generating audio:', error);
//         throw error;
//       }
//     }
  
//     async playAudio(audioBlob: Blob): Promise<void> {
//       // Stop any currently playing audio
//       this.stopAudio();
  
//       // Create a URL for the audio blob
//       const audioUrl = URL.createObjectURL(audioBlob);
      
//       // Create a new audio element
//       const audio = new Audio(audioUrl);
//       this.currentAudio = audio;
      
//       // Set up event listeners
//       return new Promise<void>((resolve, reject) => {
//         audio.onended = () => {
//           this.cleanupAudio();
//           resolve();
//         };
        
//         audio.onerror = (error) => {
//           this.cleanupAudio();
//           reject(error);
//         };
        
//         // Play the audio
//         audio.play().catch(err => {
//           this.cleanupAudio();
//           reject(err);
//         });
//       });
//     }
  
//     stopAudio(): void {
//       if (this.currentAudio) {
//         this.currentAudio.pause();
//         this.cleanupAudio();
//       }
//     }
  
//     private cleanupAudio(): void {
//       if (this.currentAudio) {
//         // Revoke the object URL to free up memory
//         URL.revokeObjectURL(this.currentAudio.src);
//         this.currentAudio = null;
//       }
//     }
//   }
  
//   export default TTSService;
// src/services/msedge.ts
export interface TTSOptions {
  voice?: string;
  format?: string;
  rate?: number;
  pitch?: string;
}

export class TTSService {
  private static instance: TTSService;
  private serverUrl: string;
  private currentAudio: HTMLAudioElement | null = null;
  private audioQueue: Blob[] = [];
  private isPlaying: boolean = false;
  private isProcessing: boolean = false;
  private abortController: AbortController | null = null;

  private constructor() {
    // The URL of your proxy server
    this.serverUrl = import.meta.env.VITE_TTS_SERVER_URL || 'http://localhost:5000/api/tts';
  }

  public static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  /**
   * Break text into chunks and process them sequentially
   */
  async speakTextInChunks(text: string, options: TTSOptions = {}): Promise<void> {
    try {
      // Stop any current playback
      this.stopAudio();
      
      // Create a new abort controller for this session
      this.abortController = new AbortController();
      
      // Split the text into sentences
      const chunks = this.splitIntoChunks(text);
      console.log(`Text split into ${chunks.length} chunks`);
      
      // Process the first chunk immediately to start playback quickly
      if (chunks.length > 0) {
        this.isPlaying = true;
        this.isProcessing = true;
        
        // Generate audio for the first chunk
        const firstChunkBlob = await this.generateAudioBlob(chunks[0], options);
        
        // Start playing the first chunk
        const firstAudio = new Audio(URL.createObjectURL(firstChunkBlob));
        this.currentAudio = firstAudio;
        
        // Set up event listener for when the first chunk ends
        firstAudio.onended = () => {
          // Clean up the first audio element
          if (firstAudio.src.startsWith('blob:')) {
            URL.revokeObjectURL(firstAudio.src);
          }
          
          // Start processing the queue if we have more chunks
          if (this.audioQueue.length > 0 && this.isPlaying) {
            this.playNextChunk();
          } else {
            // If no more chunks, we're done
            this.isPlaying = false;
            this.isProcessing = false;
            this.currentAudio = null;
          }
        };
        
        // Process the remaining chunks in the background while the first chunk plays
        // We need to wait slightly to ensure the first chunk starts playing first
        firstAudio.play().then(() => {
          // Start processing remaining chunks after a short delay
          setTimeout(() => {
            this.processRemainingChunks(chunks.slice(1), options);
          }, 500);
        });
      }
    } catch (error) {
      console.error('Error in chunked TTS:', error);
      this.isPlaying = false;
      this.isProcessing = false;
      throw error;
    }
  }

  /**
   * Process the remaining chunks and add them to the queue
   */
  private async processRemainingChunks(chunks: string[], options: TTSOptions): Promise<void> {
    try {
      // Process each chunk and add to the queue
      for (let i = 0; i < chunks.length; i++) {
        // Check if playback was stopped
        if (!this.isPlaying || this.abortController?.signal.aborted) {
          break;
        }
        
        // Generate audio for this chunk
        const blob = await this.generateAudioBlob(chunks[i], options);
        this.audioQueue.push(blob);
        
        // If this is the first chunk in queue and nothing is playing, start playback
        if (i === 0 && !this.currentAudio) {
          this.playNextChunk();
        }
      }
    } catch (error) {
      console.error('Error processing chunks:', error);
      // Continue playback with what we have
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Play the next chunk from the queue
   */
  private playNextChunk(): void {
    if (this.audioQueue.length === 0 || !this.isPlaying) {
      this.isPlaying = false;
      this.currentAudio = null;
      return;
    }
    
    // Get the next chunk from the queue
    const nextBlob = this.audioQueue.shift();
    if (!nextBlob) return;
    
    // Create audio for this chunk
    const audio = new Audio(URL.createObjectURL(nextBlob));
    this.currentAudio = audio;
    
    // When this chunk ends, play the next one
    audio.onended = () => {
      // Clean up this audio element
      if (audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
      }
      
      // Play the next chunk if available and still playing
      if (this.audioQueue.length > 0 && this.isPlaying) {
        this.playNextChunk();
      } else {
        // If no more chunks, we're done
        this.isPlaying = false;
        this.currentAudio = null;
      }
    };
    
    // Play this chunk
    audio.play().catch(error => {
      console.error('Error playing audio chunk:', error);
      this.playNextChunk(); // Try the next chunk if this one fails
    });
  }

  /**
   * Split text into reasonable chunks (sentences where possible)
   */
  private splitIntoChunks(text: string, maxChunkLength: number = 200): string[] {
    if (!text) return [];
    
    // First try to split on sentence endings
    const sentenceMatches = text.match(/[^.!?]+[.!?]+/g);
    
    if (sentenceMatches) {
      const sentences = sentenceMatches.map(s => s.trim());
      
      // If sentences are too long, further break them down
      const chunks: string[] = [];
      for (const sentence of sentences) {
        if (sentence.length <= maxChunkLength) {
          chunks.push(sentence);
        } else {
          // Break long sentences at commas, or other natural breaks
          const subChunks = this.breakLongChunk(sentence, maxChunkLength);
          chunks.push(...subChunks);
        }
      }
      return chunks;
    }
    
    // If no sentence endings found, split by a fixed length
    return this.breakLongChunk(text, maxChunkLength);
  }

  /**
   * Break a long chunk of text into smaller chunks
   */
  private breakLongChunk(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    
    // Try to break at commas or other natural pauses
    const subMatches = text.match(/[^,;:]+[,;:]+/g);
    
    if (subMatches) {
      let currentChunk = '';
      
      for (const part of subMatches) {
        if ((currentChunk + part).length <= maxLength) {
          currentChunk += part;
        } else {
          if (currentChunk) chunks.push(currentChunk.trim());
          currentChunk = part;
        }
      }
      
      if (currentChunk) chunks.push(currentChunk.trim());
    } else {
      // If no natural breaks, split by word boundaries
      let words = text.split(' ');
      let currentChunk = '';
      
      for (const word of words) {
        if ((currentChunk + ' ' + word).length <= maxLength) {
          currentChunk += (currentChunk ? ' ' : '') + word;
        } else {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = word;
        }
      }
      
      if (currentChunk) chunks.push(currentChunk);
    }
    
    return chunks;
  }

  /**
   * Generate audio blob for a text chunk
   */
  private async generateAudioBlob(text: string, options: TTSOptions): Promise<Blob> {
    try {
      // Make a request to our proxy server
      const response = await fetch(this.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: options.voice || 'en-US-BrianMultilingualNeural',
          format: options.format || 'audio-24khz-48kbitrate-mono-mp3',
          rate: options.rate,
          pitch: options.pitch
        }),
        signal: this.abortController?.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to generate audio: ${response.status}`);
      }

      // Get the audio blob from the response
      return await response.blob();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('Audio generation aborted');
      } else {
        console.error('Error generating audio blob:', error);
      }
      throw error;
    }
  }

  /**
   * Check if audio is currently playing
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Check if currently processing chunks
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Stop any currently playing audio and clear the queue
   */
  stopAudio(): void {
    // Abort any ongoing fetch requests
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    
    // Stop current audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      if (this.currentAudio.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.currentAudio.src);
      }
      this.currentAudio = null;
    }
    
    // Clear the queue
    for (const blob of this.audioQueue) {
      // No need to revoke blobs in queue as they haven't been turned into URLs yet
    }
    this.audioQueue = [];
    
    this.isPlaying = false;
  }

  // Legacy methods for backward compatibility
  async generateAudio(text: string, options: TTSOptions = {}): Promise<Blob> {
    return this.generateAudioBlob(text, options);
  }

  async playAudio(audioBlob: Blob): Promise<void> {
    // Stop any current playback
    this.stopAudio();
    this.isPlaying = true;
    
    return new Promise<void>((resolve, reject) => {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      this.currentAudio = audio;
      
      audio.onended = () => {
        if (audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
        this.currentAudio = null;
        this.isPlaying = false;
        resolve();
      };
      
      audio.onerror = (error) => {
        if (audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
        this.currentAudio = null;
        this.isPlaying = false;
        reject(error);
      };
      
      audio.play().catch(err => {
        if (audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
        this.currentAudio = null;
        this.isPlaying = false;
        reject(err);
      });
    });
  }

  async streamAudio(text: string, options: TTSOptions = {}): Promise<void> {
    return this.speakTextInChunks(text, options);
  }
}

export default TTSService;