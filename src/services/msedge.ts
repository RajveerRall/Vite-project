// // // // // // // import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// // // // // // // export interface TTSVoice {
// // // // // // //   name: string;
// // // // // // //   lang: string;
// // // // // // // }

// // // // // // // export class TTSService {
// // // // // // //   private static instance: TTSService;
// // // // // // //   private tts: MsEdgeTTS;
// // // // // // //   private voices: TTSVoice[] = [];

// // // // // // //   private constructor() {
// // // // // // //     this.tts = new MsEdgeTTS();
// // // // // // //     this.initVoices();
// // // // // // //   }

// // // // // // //   // Singleton pattern
// // // // // // //   public static getInstance(): TTSService {
// // // // // // //     if (!TTSService.instance) {
// // // // // // //       TTSService.instance = new TTSService();
// // // // // // //     }
// // // // // // //     return TTSService.instance;
// // // // // // //   }

// // // // // // //   // Initialize available voices
// // // // // // //   private async initVoices() {
// // // // // // //     try {
// // // // // // //       const availableVoices = await this.tts.getVoices();
// // // // // // //       this.voices = availableVoices.map(voice => ({
// // // // // // //         name: voice.ShortName,
// // // // // // //         lang: voice.Locale
// // // // // // //       }));
// // // // // // //     } catch (error) {
// // // // // // //       console.error('Failed to fetch voices:', error);
// // // // // // //       // Fallback voices
// // // // // // //       this.voices = [
// // // // // // //         { name: 'en-US-BrianMultilingualNeural', lang: 'en-US' },
// // // // // // //         { name: 'en-US-AriaMultilingualNeural', lang: 'en-US' }
// // // // // // //       ];
// // // // // // //     }
// // // // // // //   }

// // // // // // //   // Get available voices
// // // // // // //   public getVoices(): TTSVoice[] {
// // // // // // //     return this.voices;
// // // // // // //   }

// // // // // // //   // Generate audio from text
// // // // // // //   public async generateAudio(
// // // // // // //     text: string, 
// // // // // // //     options: { 
// // // // // // //       voice?: string, 
// // // // // // //       outputFormat?: OUTPUT_FORMAT 
// // // // // // //     } = {}
// // // // // // //   ): Promise<ArrayBuffer> {
// // // // // // //     // Use a default voice if not specified
// // // // // // //     const voiceName = options.voice || this.voices[0].name;
// // // // // // //     const outputFormat = options.outputFormat || OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS;

// // // // // // //     // Set metadata
// // // // // // //     await this.tts.setMetadata(voiceName, outputFormat);

// // // // // // //     // Collect audio chunks
// // // // // // //     return new Promise((resolve, reject) => {
// // // // // // //       const chunks: Uint8Array[] = [];

// // // // // // //       try {
// // // // // // //         const { audioStream } = this.tts.toStream(text);

// // // // // // //         audioStream.on('data', (chunk: Uint8Array) => {
// // // // // // //           chunks.push(chunk);
// // // // // // //         });

// // // // // // //         audioStream.on('end', () => {
// // // // // // //           // Combine chunks
// // // // // // //           const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
// // // // // // //           const combinedBuffer = new Uint8Array(totalLength);
// // // // // // //           let offset = 0;
// // // // // // //           chunks.forEach(chunk => {
// // // // // // //             combinedBuffer.set(chunk, offset);
// // // // // // //             offset += chunk.length;
// // // // // // //           });

// // // // // // //           resolve(combinedBuffer.buffer);
// // // // // // //         });

// // // // // // //         audioStream.on('error', (error: Error) => {
// // // // // // //           reject(error);
// // // // // // //         });
// // // // // // //       } catch (error) {
// // // // // // //         reject(error);
// // // // // // //       }
// // // // // // //     });
// // // // // // //   }

// // // // // // //   // Play audio directly
// // // // // // //   public async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
// // // // // // //     return new Promise((resolve, reject) => {
// // // // // // //       try {
// // // // // // //         const audioContext = new AudioContext();
        
// // // // // // //         audioContext.decodeAudioData(audioBuffer, (buffer) => {
// // // // // // //           const source = audioContext.createBufferSource();
// // // // // // //           source.buffer = buffer;
// // // // // // //           source.connect(audioContext.destination);
// // // // // // //           source.onended = () => resolve();
// // // // // // //           source.start(0);
// // // // // // //         }, (error) => {
// // // // // // //           reject(error);
// // // // // // //         });
// // // // // // //       } catch (error) {
// // // // // // //         reject(error);
// // // // // // //       }
// // // // // // //     });
// // // // // // //   }
// // // // // // // }


// // // // // // import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// // // // // // export interface TTSVoice {
// // // // // //   name: string;
// // // // // //   lang: string;
// // // // // // }

// // // // // // export class TTSService {
// // // // // //   private static instance: TTSService;
// // // // // //   private tts: MsEdgeTTS;
// // // // // //   private voices: TTSVoice[] = [
// // // // // //     { name: 'en-US-BrianMultilingualNeural', lang: 'en-US' }
// // // // // //   ];

// // // // // //   private constructor() {
// // // // // //     this.tts = new MsEdgeTTS();
// // // // // //     this.initVoices();
// // // // // //   }

// // // // // //   // Singleton pattern
// // // // // //   public static getInstance(): TTSService {
// // // // // //     if (!TTSService.instance) {
// // // // // //       TTSService.instance = new TTSService();
// // // // // //     }
// // // // // //     return TTSService.instance;
// // // // // //   }

// // // // // //   // Initialize available voices
// // // // // //   private async initVoices() {
// // // // // //     try {
// // // // // //       const availableVoices = await this.tts.getVoices();
// // // // // //       console.log('Available Voices:', availableVoices);
      
// // // // // //       // Prioritize 'en-US-BrianMultilingualNeural'
// // // // // //       const brianVoice = availableVoices.find(
// // // // // //         voice => voice.ShortName === 'en-US-BrianMultilingualNeural'
// // // // // //       );

// // // // // //       if (brianVoice) {
// // // // // //         this.voices = [{
// // // // // //           name: brianVoice.ShortName,
// // // // // //           lang: brianVoice.Locale
// // // // // //         }];
// // // // // //       }
// // // // // //     } catch (error) {
// // // // // //       console.error('Failed to fetch voices:', error);
// // // // // //     }
// // // // // //   }

// // // // // //   // Get available voices
// // // // // //   public getVoices(): TTSVoice[] {
// // // // // //     return this.voices;
// // // // // //   }

// // // // // //   // Generate audio from text
// // // // // //   public async generateAudio(
// // // // // //     text: string, 
// // // // // //     options: { 
// // // // // //       voice?: string, 
// // // // // //       outputFormat?: OUTPUT_FORMAT 
// // // // // //     } = {}
// // // // // //   ): Promise<ArrayBuffer> {
// // // // // //     // Always use 'en-US-BrianMultilingualNeural'
// // // // // //     const voiceName = 'en-US-BrianMultilingualNeural';
// // // // // //     const outputFormat = options.outputFormat || OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS;

// // // // // //     console.log('Generating Audio with:', {
// // // // // //       voiceName,
// // // // // //       outputFormat
// // // // // //     });

// // // // // //     // Set metadata with explicit locale
// // // // // //     try {
// // // // // //       await this.tts.setMetadata(
// // // // // //         voiceName, 
// // // // // //         outputFormat,
// // // // // //         { 
// // // // // //           voiceLocale: 'en-US' 
// // // // // //         }
// // // // // //       );
// // // // // //     } catch (metadataError) {
// // // // // //       console.error('Metadata Set Error:', metadataError);
// // // // // //       throw metadataError;
// // // // // //     }

// // // // // //     // Collect audio chunks
// // // // // //     return new Promise((resolve, reject) => {
// // // // // //       const chunks: Uint8Array[] = [];

// // // // // //       try {
// // // // // //         const { audioStream } = this.tts.toStream(text);

// // // // // //         audioStream.on('data', (chunk: Uint8Array) => {
// // // // // //           chunks.push(chunk);
// // // // // //         });

// // // // // //         audioStream.on('end', () => {
// // // // // //           // Combine chunks
// // // // // //           const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
// // // // // //           const combinedBuffer = new Uint8Array(totalLength);
// // // // // //           let offset = 0;
// // // // // //           chunks.forEach(chunk => {
// // // // // //             combinedBuffer.set(chunk, offset);
// // // // // //             offset += chunk.length;
// // // // // //           });

// // // // // //           resolve(combinedBuffer.buffer);
// // // // // //         });

// // // // // //         audioStream.on('error', (error: Error) => {
// // // // // //           reject(error);
// // // // // //         });
// // // // // //       } catch (streamError) {
// // // // // //         console.error('Stream Generation Error:', streamError);
// // // // // //         reject(streamError);
// // // // // //       }
// // // // // //     });
// // // // // //   }

// // // // // //   // Play audio directly
// // // // // //   public async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
// // // // // //     return new Promise((resolve, reject) => {
// // // // // //       try {
// // // // // //         const audioContext = new AudioContext();
        
// // // // // //         audioContext.decodeAudioData(audioBuffer, (buffer) => {
// // // // // //           const source = audioContext.createBufferSource();
// // // // // //           source.buffer = buffer;
// // // // // //           source.connect(audioContext.destination);
// // // // // //           source.onended = () => resolve();
// // // // // //           source.start(0);
// // // // // //         }, (error) => {
// // // // // //           reject(error);
// // // // // //         });
// // // // // //       } catch (error) {
// // // // // //         reject(error);
// // // // // //       }
// // // // // //     });
// // // // // //   }
// // // // // // }
// // // // // // src/services/msedge.ts
// // // // // export interface TTSOptions {
// // // // //     voice?: string;
// // // // //     format?: string;
// // // // //     rate?: number;
// // // // //     pitch?: string;
// // // // //   }
  
// // // // //   export class TTSService {
// // // // //     private static instance: TTSService;
// // // // //     private serverUrl: string;
// // // // //     private currentAudio: HTMLAudioElement | null = null;
  
// // // // //     private constructor() {
// // // // //       // The URL of your proxy server
// // // // //       this.serverUrl = import.meta.env.VITE_TTS_SERVER_URL || 'http://localhost:5000/api/tts';
// // // // //     }
  
// // // // //     public static getInstance(): TTSService {
// // // // //       if (!TTSService.instance) {
// // // // //         TTSService.instance = new TTSService();
// // // // //       }
// // // // //       return TTSService.instance;
// // // // //     }
  
// // // // //     async generateAudio(text: string, options: TTSOptions = {}): Promise<Blob> {
// // // // //       try {
// // // // //         console.log('Generating Audio with:', options);
  
// // // // //         // Make a request to our proxy server
// // // // //         const response = await fetch(this.serverUrl, {
// // // // //           method: 'POST',
// // // // //           headers: {
// // // // //             'Content-Type': 'application/json',
// // // // //           },
// // // // //           body: JSON.stringify({
// // // // //             text,
// // // // //             voice: options.voice || 'en-US-BrianMultilingualNeural',
// // // // //             format: options.format || 'webm-24khz-16bit-mono-opus',
// // // // //             rate: options.rate,
// // // // //             pitch: options.pitch
// // // // //           }),
// // // // //         });
  
// // // // //         if (!response.ok) {
// // // // //           const errorData = await response.json();
// // // // //           throw new Error(errorData.error || 'Failed to generate audio');
// // // // //         }
  
// // // // //         // Get the audio blob from the response
// // // // //         return await response.blob();
// // // // //       } catch (error) {
// // // // //         console.error('Error generating audio:', error);
// // // // //         throw error;
// // // // //       }
// // // // //     }
  
// // // // //     async playAudio(audioBlob: Blob): Promise<void> {
// // // // //       // Stop any currently playing audio
// // // // //       this.stopAudio();
  
// // // // //       // Create a URL for the audio blob
// // // // //       const audioUrl = URL.createObjectURL(audioBlob);
      
// // // // //       // Create a new audio element
// // // // //       const audio = new Audio(audioUrl);
// // // // //       this.currentAudio = audio;
      
// // // // //       // Set up event listeners
// // // // //       return new Promise<void>((resolve, reject) => {
// // // // //         audio.onended = () => {
// // // // //           this.cleanupAudio();
// // // // //           resolve();
// // // // //         };
        
// // // // //         audio.onerror = (error) => {
// // // // //           this.cleanupAudio();
// // // // //           reject(error);
// // // // //         };
        
// // // // //         // Play the audio
// // // // //         audio.play().catch(err => {
// // // // //           this.cleanupAudio();
// // // // //           reject(err);
// // // // //         });
// // // // //       });
// // // // //     }
  
// // // // //     stopAudio(): void {
// // // // //       if (this.currentAudio) {
// // // // //         this.currentAudio.pause();
// // // // //         this.cleanupAudio();
// // // // //       }
// // // // //     }
  
// // // // //     private cleanupAudio(): void {
// // // // //       if (this.currentAudio) {
// // // // //         // Revoke the object URL to free up memory
// // // // //         URL.revokeObjectURL(this.currentAudio.src);
// // // // //         this.currentAudio = null;
// // // // //       }
// // // // //     }
// // // // //   }
  
// // // // //   export default TTSService;
// // // // // src/services/msedge.ts
// // // // export interface TTSOptions {
// // // //   voice?: string;
// // // //   format?: string;
// // // //   rate?: number;
// // // //   pitch?: string;
// // // // }

// // // // export class TTSService {
// // // //   private static instance: TTSService;
// // // //   private serverUrl: string;
// // // //   private currentAudio: HTMLAudioElement | null = null;
// // // //   private audioQueue: Blob[] = [];
// // // //   private isPlaying: boolean = false;
// // // //   private isProcessing: boolean = false;
// // // //   private abortController: AbortController | null = null;

// // // //   private constructor() {
// // // //     // The URL of your proxy server
// // // //     this.serverUrl = import.meta.env.VITE_TTS_SERVER_URL || 'http://localhost:5100/api/tts';
// // // //   }

// // // //   public static getInstance(): TTSService {
// // // //     if (!TTSService.instance) {
// // // //       TTSService.instance = new TTSService();
// // // //     }
// // // //     return TTSService.instance;
// // // //   }

// // // //   /**
// // // //    * Break text into chunks and process them sequentially
// // // //    */
// // // //   async speakTextInChunks(text: string, options: TTSOptions = {}): Promise<void> {
// // // //     try {
// // // //       // Stop any current playback
// // // //       this.stopAudio();
      
// // // //       // Create a new abort controller for this session
// // // //       this.abortController = new AbortController();
      
// // // //       // Split the text into sentences
// // // //       const chunks = this.splitIntoChunks(text);
// // // //       console.log(`Text split into ${chunks.length} chunks`);
      
// // // //       // Process the first chunk immediately to start playback quickly
// // // //       if (chunks.length > 0) {
// // // //         this.isPlaying = true;
// // // //         this.isProcessing = true;
        
// // // //         // Generate audio for the first chunk
// // // //         const firstChunkBlob = await this.generateAudioBlob(chunks[0], options);
        
// // // //         // Start playing the first chunk
// // // //         const firstAudio = new Audio(URL.createObjectURL(firstChunkBlob));
// // // //         this.currentAudio = firstAudio;
        
// // // //         // Set up event listener for when the first chunk ends
// // // //         firstAudio.onended = () => {
// // // //           // Clean up the first audio element
// // // //           if (firstAudio.src.startsWith('blob:')) {
// // // //             URL.revokeObjectURL(firstAudio.src);
// // // //           }
          
// // // //           // Start processing the queue if we have more chunks
// // // //           if (this.audioQueue.length > 0 && this.isPlaying) {
// // // //             this.playNextChunk();
// // // //           } else {
// // // //             // If no more chunks, we're done
// // // //             this.isPlaying = false;
// // // //             this.isProcessing = false;
// // // //             this.currentAudio = null;
// // // //           }
// // // //         };
        
// // // //         // Process the remaining chunks in the background while the first chunk plays
// // // //         // We need to wait slightly to ensure the first chunk starts playing first
// // // //         firstAudio.play().then(() => {
// // // //           // Start processing remaining chunks after a short delay
// // // //           setTimeout(() => {
// // // //             this.processRemainingChunks(chunks.slice(1), options);
// // // //           }, 500);
// // // //         });
// // // //       }
// // // //     } catch (error) {
// // // //       console.error('Error in chunked TTS:', error);
// // // //       this.isPlaying = false;
// // // //       this.isProcessing = false;
// // // //       throw error;
// // // //     }
// // // //   }

// // // //   /**
// // // //    * Process the remaining chunks and add them to the queue
// // // //    */
// // // //   private async processRemainingChunks(chunks: string[], options: TTSOptions): Promise<void> {
// // // //     try {
// // // //       // Process each chunk and add to the queue
// // // //       for (let i = 0; i < chunks.length; i++) {
// // // //         // Check if playback was stopped
// // // //         if (!this.isPlaying || this.abortController?.signal.aborted) {
// // // //           break;
// // // //         }
        
// // // //         // Generate audio for this chunk
// // // //         const blob = await this.generateAudioBlob(chunks[i], options);
// // // //         this.audioQueue.push(blob);
        
// // // //         // If this is the first chunk in queue and nothing is playing, start playback
// // // //         if (i === 0 && !this.currentAudio) {
// // // //           this.playNextChunk();
// // // //         }
// // // //       }
// // // //     } catch (error) {
// // // //       console.error('Error processing chunks:', error);
// // // //       // Continue playback with what we have
// // // //     } finally {
// // // //       this.isProcessing = false;
// // // //     }
// // // //   }

// // // //   /**
// // // //    * Play the next chunk from the queue
// // // //    */
// // // //   private playNextChunk(): void {
// // // //     if (this.audioQueue.length === 0 || !this.isPlaying) {
// // // //       this.isPlaying = false;
// // // //       this.currentAudio = null;
// // // //       return;
// // // //     }
    
// // // //     // Get the next chunk from the queue
// // // //     const nextBlob = this.audioQueue.shift();
// // // //     if (!nextBlob) return;
    
// // // //     // Create audio for this chunk
// // // //     const audio = new Audio(URL.createObjectURL(nextBlob));
// // // //     this.currentAudio = audio;
    
// // // //     // When this chunk ends, play the next one
// // // //     audio.onended = () => {
// // // //       // Clean up this audio element
// // // //       if (audio.src.startsWith('blob:')) {
// // // //         URL.revokeObjectURL(audio.src);
// // // //       }
      
// // // //       // Play the next chunk if available and still playing
// // // //       if (this.audioQueue.length > 0 && this.isPlaying) {
// // // //         this.playNextChunk();
// // // //       } else {
// // // //         // If no more chunks, we're done
// // // //         this.isPlaying = false;
// // // //         this.currentAudio = null;
// // // //       }
// // // //     };
    
// // // //     // Play this chunk
// // // //     audio.play().catch(error => {
// // // //       console.error('Error playing audio chunk:', error);
// // // //       this.playNextChunk(); // Try the next chunk if this one fails
// // // //     });
// // // //   }

// // // //   /**
// // // //    * Split text into reasonable chunks (sentences where possible)
// // // //    */
// // // //   private splitIntoChunks(text: string, maxChunkLength: number = 200): string[] {
// // // //     if (!text) return [];
    
// // // //     // First try to split on sentence endings
// // // //     const sentenceMatches = text.match(/[^.!?]+[.!?]+/g);
    
// // // //     if (sentenceMatches) {
// // // //       const sentences = sentenceMatches.map(s => s.trim());
      
// // // //       // If sentences are too long, further break them down
// // // //       const chunks: string[] = [];
// // // //       for (const sentence of sentences) {
// // // //         if (sentence.length <= maxChunkLength) {
// // // //           chunks.push(sentence);
// // // //         } else {
// // // //           // Break long sentences at commas, or other natural breaks
// // // //           const subChunks = this.breakLongChunk(sentence, maxChunkLength);
// // // //           chunks.push(...subChunks);
// // // //         }
// // // //       }
// // // //       return chunks;
// // // //     }
    
// // // //     // If no sentence endings found, split by a fixed length
// // // //     return this.breakLongChunk(text, maxChunkLength);
// // // //   }

// // // //   /**
// // // //    * Break a long chunk of text into smaller chunks
// // // //    */
// // // //   private breakLongChunk(text: string, maxLength: number): string[] {
// // // //     const chunks: string[] = [];
    
// // // //     // Try to break at commas or other natural pauses
// // // //     const subMatches = text.match(/[^,;:]+[,;:]+/g);
    
// // // //     if (subMatches) {
// // // //       let currentChunk = '';
      
// // // //       for (const part of subMatches) {
// // // //         if ((currentChunk + part).length <= maxLength) {
// // // //           currentChunk += part;
// // // //         } else {
// // // //           if (currentChunk) chunks.push(currentChunk.trim());
// // // //           currentChunk = part;
// // // //         }
// // // //       }
      
// // // //       if (currentChunk) chunks.push(currentChunk.trim());
// // // //     } else {
// // // //       // If no natural breaks, split by word boundaries
// // // //       let words = text.split(' ');
// // // //       let currentChunk = '';
      
// // // //       for (const word of words) {
// // // //         if ((currentChunk + ' ' + word).length <= maxLength) {
// // // //           currentChunk += (currentChunk ? ' ' : '') + word;
// // // //         } else {
// // // //           if (currentChunk) chunks.push(currentChunk);
// // // //           currentChunk = word;
// // // //         }
// // // //       }
      
// // // //       if (currentChunk) chunks.push(currentChunk);
// // // //     }
    
// // // //     return chunks;
// // // //   }

// // // //   /**
// // // //    * Generate audio blob for a text chunk
// // // //    */
// // // //   private async generateAudioBlob(text: string, options: TTSOptions): Promise<Blob> {
// // // //     try {
// // // //       // Make a request to our proxy server
// // // //       const response = await fetch(this.serverUrl, {
// // // //         method: 'POST',
// // // //         headers: {
// // // //           'Content-Type': 'application/json',
// // // //         },
// // // //         body: JSON.stringify({
// // // //           text,
// // // //           voice: options.voice || 'en-US-BrianMultilingualNeural',
// // // //           format: options.format || 'audio-24khz-48kbitrate-mono-mp3',
// // // //           rate: options.rate,
// // // //           pitch: options.pitch
// // // //         }),
// // // //         signal: this.abortController?.signal,
// // // //       });

// // // //       if (!response.ok) {
// // // //         throw new Error(`Failed to generate audio: ${response.status}`);
// // // //       }

// // // //       // Get the audio blob from the response
// // // //       return await response.blob();
// // // //     } catch (error) {
// // // //       if ((error as Error).name === 'AbortError') {
// // // //         console.log('Audio generation aborted');
// // // //       } else {
// // // //         console.error('Error generating audio blob:', error);
// // // //       }
// // // //       throw error;
// // // //     }
// // // //   }

// // // //   /**
// // // //    * Check if audio is currently playing
// // // //    */
// // // //   isCurrentlyPlaying(): boolean {
// // // //     return this.isPlaying;
// // // //   }

// // // //   /**
// // // //    * Check if currently processing chunks
// // // //    */
// // // //   isCurrentlyProcessing(): boolean {
// // // //     return this.isProcessing;
// // // //   }

// // // //   /**
// // // //    * Stop any currently playing audio and clear the queue
// // // //    */
// // // //   stopAudio(): void {
// // // //     // Abort any ongoing fetch requests
// // // //     if (this.abortController) {
// // // //       this.abortController.abort();
// // // //       this.abortController = null;
// // // //     }
    
// // // //     // Stop current audio
// // // //     if (this.currentAudio) {
// // // //       this.currentAudio.pause();
// // // //       if (this.currentAudio.src.startsWith('blob:')) {
// // // //         URL.revokeObjectURL(this.currentAudio.src);
// // // //       }
// // // //       this.currentAudio = null;
// // // //     }
    
// // // //     // Clear the queue
// // // //     for (const blob of this.audioQueue) {
// // // //       // No need to revoke blobs in queue as they haven't been turned into URLs yet
// // // //     }
// // // //     this.audioQueue = [];
    
// // // //     this.isPlaying = false;
// // // //   }

// // // //   // Legacy methods for backward compatibility
// // // //   async generateAudio(text: string, options: TTSOptions = {}): Promise<Blob> {
// // // //     return this.generateAudioBlob(text, options);
// // // //   }

// // // //   async playAudio(audioBlob: Blob): Promise<void> {
// // // //     // Stop any current playback
// // // //     this.stopAudio();
// // // //     this.isPlaying = true;
    
// // // //     return new Promise<void>((resolve, reject) => {
// // // //       const audio = new Audio(URL.createObjectURL(audioBlob));
// // // //       this.currentAudio = audio;
      
// // // //       audio.onended = () => {
// // // //         if (audio.src.startsWith('blob:')) {
// // // //           URL.revokeObjectURL(audio.src);
// // // //         }
// // // //         this.currentAudio = null;
// // // //         this.isPlaying = false;
// // // //         resolve();
// // // //       };
      
// // // //       audio.onerror = (error) => {
// // // //         if (audio.src.startsWith('blob:')) {
// // // //           URL.revokeObjectURL(audio.src);
// // // //         }
// // // //         this.currentAudio = null;
// // // //         this.isPlaying = false;
// // // //         reject(error);
// // // //       };
      
// // // //       audio.play().catch(err => {
// // // //         if (audio.src.startsWith('blob:')) {
// // // //           URL.revokeObjectURL(audio.src);
// // // //         }
// // // //         this.currentAudio = null;
// // // //         this.isPlaying = false;
// // // //         reject(err);
// // // //       });
// // // //     });
// // // //   }

// // // //   async streamAudio(text: string, options: TTSOptions = {}): Promise<void> {
// // // //     return this.speakTextInChunks(text, options);
// // // //   }
// // // // }

// // // // export default TTSService;


// // // // src/services/msedge.ts
// // // export interface TTSOptions {
// // //   voice?: string;
// // //   format?: string;
// // //   rate?: number;
// // //   pitch?: string;
// // // }

// // // export class TTSService {
// // //   private static instance: TTSService;
// // //   private serverUrl: string;
// // //   private currentAudio: HTMLAudioElement | null = null;
// // //   private audioQueue: Blob[] = [];
// // //   private isPlaying: boolean = false;
// // //   private isProcessing: boolean = false;
// // //   private isPaused: boolean = false; // <-- Added paused state
// // //   private abortController: AbortController | null = null;

// // //   private constructor() {
// // //     this.serverUrl = import.meta.env.VITE_TTS_SERVER_URL || 'http://localhost:5100/api/tts';
// // //   }

// // //   public static getInstance(): TTSService {
// // //     if (!TTSService.instance) {
// // //       TTSService.instance = new TTSService();
// // //     }
// // //     return TTSService.instance;
// // //   }

// // //   async speakTextInChunks(text: string, options: TTSOptions = {}): Promise<void> {
// // //     this.isPaused = false; // <-- Reset paused state on new request
// // //     try {
// // //       this.stopAudio(); // This already resets isPlaying and isPaused
// // //       this.abortController = new AbortController();
// // //       const chunks = this.splitIntoChunks(text);
// // //       console.log(`Text split into ${chunks.length} chunks`);

// // //       if (chunks.length > 0) {
// // //         this.isPlaying = true; // Set isPlaying to true when starting
// // //         this.isProcessing = true;
// // //         this.isPaused = false; // Ensure not paused when starting

// // //         const firstChunkBlob = await this.generateAudioBlob(chunks[0], options);
// // //         const firstAudio = new Audio(URL.createObjectURL(firstChunkBlob));
// // //         this.currentAudio = firstAudio;

// // //         firstAudio.onended = () => {
// // //           if (firstAudio.src.startsWith('blob:')) {
// // //             URL.revokeObjectURL(firstAudio.src);
// // //           }
// // //           // No need to set currentAudio = null here, playNextChunk handles it
// // //           if (this.audioQueue.length > 0 && this.isPlaying && !this.isPaused) { // Check isPaused
// // //             this.playNextChunk();
// // //           } else if (!this.isPaused) { // If not paused and queue is empty
// // //             this.isPlaying = false;
// // //             this.isProcessing = false;
// // //             this.currentAudio = null;
// // //           }
// // //           // If paused, do nothing onended, wait for resume
// // //         };

// // //         firstAudio.play().then(() => {
// // //           // Successfully started playing the first chunk
// // //           setTimeout(() => {
// // //             this.processRemainingChunks(chunks.slice(1), options);
// // //           }, 500); // Process rest after a small delay
// // //         }).catch(error => {
// // //            console.error("Error playing first chunk:", error);
// // //            this.stopAudio(); // Clean up if first play fails
// // //         });
// // //       } else {
// // //         // No chunks, ensure state is clean
// // //         this.stopAudio();
// // //       }
// // //     } catch (error) {
// // //       console.error('Error in chunked TTS:', error);
// // //       this.stopAudio(); // Ensure cleanup on error
// // //       throw error; // Re-throw the error
// // //     }
// // //   }

// // //   private async processRemainingChunks(chunks: string[], options: TTSOptions): Promise<void> {
// // //     try {
// // //       for (let i = 0; i < chunks.length; i++) {
// // //         // Check if playback was stopped or paused or aborted
// // //         if (!this.isPlaying || this.isPaused || this.abortController?.signal.aborted) {
// // //           console.log('Processing remaining chunks stopped or paused.');
// // //           break;
// // //         }

// // //         const blob = await this.generateAudioBlob(chunks[i], options);
// // //         // Only push if still playing and not aborted/paused during generation
// // //         if (this.isPlaying && !this.isPaused && !this.abortController?.signal.aborted) {
// // //           this.audioQueue.push(blob);
// // //         } else {
// // //            console.log('Discarding generated chunk due to stop/pause/abort.');
// // //            break; // Stop processing further chunks
// // //         }

// // //         // This check is likely redundant now, playNextChunk handles queue processing
// // //         // if (i === 0 && !this.currentAudio && !this.isPaused) {
// // //         //   this.playNextChunk();
// // //         // }
// // //       }
// // //     } catch (error) {
// // //       console.error('Error processing chunks:', error);
// // //       // Don't stop playback here necessarily, let existing audio finish
// // //     } finally {
// // //        // Set processing to false only when *all* intended chunks are done or stopped
// // //       if (!this.abortController?.signal.aborted) {
// // //           this.isProcessing = false;
// // //       }
// // //     }
// // //   }

// // //   private playNextChunk(): void {
// // //     // Exit if paused, stopped, or queue empty
// // //     if (this.isPaused || !this.isPlaying || this.audioQueue.length === 0) {
// // //       if (!this.isPaused && this.audioQueue.length === 0 && !this.currentAudio?.paused && this.currentAudio?.ended) {
// // //         // If naturally finished last chunk and not paused
// // //         this.isPlaying = false;
// // //         this.currentAudio = null;
// // //       }
// // //       return;
// // //     }

// // //     const nextBlob = this.audioQueue.shift();
// // //     if (!nextBlob) {
// // //         // Should not happen if length check passed, but good safety
// // //         this.isPlaying = false;
// // //         this.currentAudio = null;
// // //         return;
// // //     }

// // //     const audio = new Audio(URL.createObjectURL(nextBlob));
// // //     this.currentAudio = audio;

// // //     audio.onended = () => {
// // //       if (audio.src.startsWith('blob:')) {
// // //         URL.revokeObjectURL(audio.src);
// // //       }
// // //        // Check again if still playing and not paused before playing next
// // //       if (this.isPlaying && !this.isPaused && this.audioQueue.length > 0) {
// // //         this.playNextChunk();
// // //       } else if (!this.isPaused) { // If queue is empty and not paused, we're done
// // //         this.isPlaying = false;
// // //         this.currentAudio = null;
// // //       }
// // //        // If paused, do nothing onended, wait for resume
// // //     };

// // //     audio.play().catch(error => {
// // //       console.error('Error playing audio chunk:', error);
// // //       // Clean up failed audio element's URL
// // //       if (audio.src.startsWith('blob:')) {
// // //          URL.revokeObjectURL(audio.src);
// // //       }
// // //       // Attempt to play the next one if still playing and not paused
// // //       if (this.isPlaying && !this.isPaused) {
// // //           this.playNextChunk();
// // //       } else {
// // //           this.stopAudio(); // Stop if error occurs during paused state or already stopped
// // //       }
// // //     });
// // //   }

// // //   // --- Pause/Resume Methods ---

// // //   public pauseAudio(): void {
// // //     if (this.currentAudio && !this.currentAudio.paused && this.isPlaying) {
// // //       this.currentAudio.pause();
// // //       this.isPaused = true;
// // //       // Note: isPlaying remains true because the *session* is active
// // //       console.log('Audio paused at position:', this.currentAudio.currentTime);
// // //     }
// // //   }

// // //   public resumeAudio(): void {
// // //     if (this.currentAudio && this.currentAudio.paused && this.isPlaying) {
// // //       this.isPaused = false; // Set paused to false *before* playing
// // //       this.currentAudio.play().then(() => {
// // //         if (this.currentAudio) {
// // //           console.log('Audio resumed from position:', this.currentAudio.currentTime);
// // //         }
// // //       }).catch(error => {
// // //         console.error("Error resuming audio:", error);
// // //         this.stopAudio(); // Stop if resume fails
// // //       });
// // //     } else if (!this.currentAudio && this.isPlaying && this.isPaused && this.audioQueue.length > 0) {
// // //       // Case: Paused between chunks (currentAudio is null, but queue has items)
// // //       console.log('Resuming by playing next chunk from queue.');
// // //       this.isPaused = false;
// // //       this.playNextChunk();
// // //     }
// // //   }

// // //   // --- State Check Methods ---

// // //   public isCurrentlyPlaying(): boolean {
// // //     // Returns true only if actively playing (not paused)
// // //     return this.isPlaying && !this.isPaused;
// // //   }

// // //   public isCurrentlyPaused(): boolean {
// // //     return this.isPaused;
// // //   }

// // //   // Added: check if TTS session is active (either playing or paused)
// // //   public isSessionActive(): boolean {
// // //     // Implement the logic to determine if a session is active
// // //     return this.isCurrentlyPlaying() || this.isCurrentlyPaused();
// // //   }

// // //   public isCurrentlyProcessing(): boolean {
// // //     return this.isProcessing;
// // //   }

// // //   // --- Stop Method ---

// // //   public stopAudio(): void {
// // //     if (this.abortController) {
// // //       this.abortController.abort();
// // //       this.abortController = null;
// // //     }

// // //     if (this.currentAudio) {
// // //       this.currentAudio.pause(); // Ensure it's stopped
// // //       if (this.currentAudio.src.startsWith('blob:')) {
// // //         URL.revokeObjectURL(this.currentAudio.src);
// // //       }
// // //       this.currentAudio = null;
// // //     }

// // //     // Clear the queue (no need to revoke URLs for queue items)
// // //     this.audioQueue = [];

// // //     // Reset all states
// // //     this.isPlaying = false;
// // //     this.isPaused = false; // <-- Reset paused state on stop
// // //     this.isProcessing = false; // Stop processing too
// // //      console.log("Audio stopped and queue cleared.");
// // //   }

// // //   // --- Utility Methods (Unchanged) ---
// // //   private splitIntoChunks(text: string, maxChunkLength: number = 200): string[] {
// // //     if (!text) return [];
// // //     const sentenceMatches = text.match(/[^.!?]+[.!?]+/g);
// // //     if (sentenceMatches) {
// // //       const sentences = sentenceMatches.map(s => s.trim());
// // //       const chunks: string[] = [];
// // //       for (const sentence of sentences) {
// // //         if (sentence.length <= maxChunkLength) {
// // //           chunks.push(sentence);
// // //         } else {
// // //           const subChunks = this.breakLongChunk(sentence, maxChunkLength);
// // //           chunks.push(...subChunks);
// // //         }
// // //       }
// // //       return chunks.filter(chunk => chunk.length > 0); // Ensure no empty chunks
// // //     }
// // //     return this.breakLongChunk(text, maxChunkLength).filter(chunk => chunk.length > 0);
// // //   }

// // //   private breakLongChunk(text: string, maxLength: number): string[] {
// // //      // Simplified break logic - adjust if needed
// // //      const chunks: string[] = [];
// // //      let currentPosition = 0;
// // //      while (currentPosition < text.length) {
// // //          let endPosition = Math.min(currentPosition + maxLength, text.length);
// // //          // Try to find a space near the end to break nicely
// // //          if (endPosition < text.length) {
// // //              let lastSpace = text.lastIndexOf(' ', endPosition);
// // //              if (lastSpace > currentPosition) {
// // //                  endPosition = lastSpace;
// // //              }
// // //          }
// // //          chunks.push(text.substring(currentPosition, endPosition).trim());
// // //          currentPosition = endPosition;
// // //      }
// // //      return chunks.filter(chunk => chunk.length > 0);
// // //   }

// // //   private async generateAudioBlob(text: string, options: TTSOptions): Promise<Blob> {
// // //     try {
// // //       const response = await fetch(this.serverUrl, {
// // //         method: 'POST',
// // //         headers: { 'Content-Type': 'application/json', },
// // //         body: JSON.stringify({
// // //           text,
// // //           voice: options.voice || 'en-US-BrianMultilingualNeural',
// // //           format: options.format || 'audio-24khz-48kbitrate-mono-mp3',
// // //           rate: options.rate,
// // //           pitch: options.pitch
// // //         }),
// // //         signal: this.abortController?.signal,
// // //       });

// // //       if (!response.ok) {
// // //         const errorText = await response.text();
// // //         throw new Error(`Failed to generate audio (${response.status}): ${errorText}`);
// // //       }
// // //       return await response.blob();
// // //     } catch (error) {
// // //       if ((error as Error).name === 'AbortError') {
// // //         console.log('Audio generation aborted');
// // //       } else {
// // //         console.error('Error generating audio blob:', error);
// // //       }
// // //       throw error;
// // //     }
// // //   }

// // //   // --- Legacy Methods (Keep if needed, but recommend phasing out) ---
// // //   async generateAudio(text: string, options: TTSOptions = {}): Promise<Blob> {
// // //     console.warn("generateAudio is deprecated, use speakTextInChunks");
// // //     return this.generateAudioBlob(text, options);
// // //   }

// // //   async playAudio(audioBlob: Blob): Promise<void> {
// // //      console.warn("playAudio is deprecated, use speakTextInChunks");
// // //      this.stopAudio();
// // //      this.isPlaying = true; // Session is active
// // //      this.isPaused = false;
// // //      this.isProcessing = false;

// // //      return new Promise<void>((resolve, reject) => {
// // //        const audio = new Audio(URL.createObjectURL(audioBlob));
// // //        this.currentAudio = audio;
// // //        audio.onended = () => {
// // //          if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
// // //          this.currentAudio = null;
// // //          this.isPlaying = false;
// // //          resolve();
// // //        };
// // //        audio.onerror = (error) => {
// // //          if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
// // //          this.currentAudio = null;
// // //          this.isPlaying = false;
// // //          reject(error);
// // //        };
// // //        audio.play().catch(err => {
// // //          if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
// // //          this.currentAudio = null;
// // //          this.isPlaying = false;
// // //          reject(err);
// // //        });
// // //      });
// // //   }

// // //   async streamAudio(text: string, options: TTSOptions = {}): Promise<void> {
// // //      console.warn("streamAudio is deprecated, use speakTextInChunks");
// // //      return this.speakTextInChunks(text, options);
// // //   }
// // // }

// // // export default TTSService;


// // // src/services/msedge.ts
// // export interface TTSOptions {
// //   voice?: string;
// //   format?: string;
// //   rate?: number;
// //   pitch?: string;
// // }

// // export class TTSService {
// //   private static instance: TTSService;
// //   private serverUrl: string;
// //   private currentAudio: HTMLAudioElement | null = null;
// //   private audioQueue: Blob[] = [];
// //   private isPlaying: boolean = false; // Session active (playing or paused)
// //   private isProcessing: boolean = false; // Actively fetching audio
// //   private isPaused: boolean = false; // Separate state for pause
// //   private abortController: AbortController | null = null;

// //   // --- NEW: Minimal State for Tracking ---
// //   private currentOriginalTextChunks: string[] = []; // Store the chunks generated for the current text
// //   private currentChunkIndex: number = -1; // Index of the chunk currently playing or just finished (-1 if inactive)
// //   // --- End New Tracking State ---

// //   // private constructor() {
// //   //   this.serverUrl = import.meta.env.VITE_TTS_SERVER_URL || 'http://localhost:5100/api/tts';
// //   // }


// //   private constructor() {
// //     // Use the environment variable if provided during build,
// //     // otherwise default to a relative path '/api/tts'.
// //     // REMOVE the hardcoded localhost URL and the semicolon!
// //     this.serverUrl = import.meta.env.VITE_TTS_SERVER_URL || '/api/tts';
// //   }

// //   public static getInstance(): TTSService {
// //     if (!TTSService.instance) {
// //       TTSService.instance = new TTSService();
// //     }
// //     return TTSService.instance;
// //   }

// //   /**
// //    * Starts speaking text.
// //    * @param text The text to speak (can be full page or substring).
// //    * @param options TTS voice/format options.
// //    */
// //   async speakTextInChunks(text: string, options: TTSOptions = {}): Promise<void> {
// //     console.log("speakTextInChunks called.");
// //     // Reset state including pause and tracking
// //     try {
// //       this.stopAudio(); // Clears state, including tracking

// //       // --- NEW: Generate and store chunks for tracking ---
// //       this.currentOriginalTextChunks = this.splitIntoChunks(text);
// //       if (!this.currentOriginalTextChunks || this.currentOriginalTextChunks.length === 0) {
// //         console.warn("No text chunks generated to speak.");
// //         this.stopAudio(); // Ensure clean state
// //         return;
// //       }
// //       // --- End New ---

// //       // Start playback state
// //       this.isPlaying = true;
// //       this.isProcessing = true;
// //       this.isPaused = false;
// //       this.abortController = new AbortController();

// //       const firstChunkText = this.currentOriginalTextChunks[0];
// //       const firstChunkBlob = await this.generateAudioBlob(firstChunkText, options);

// //       // --- NEW: Mark first chunk as about to play ---
// //       this.currentChunkIndex = 0;
// //       // --- End New ---

// //       const firstAudio = new Audio(URL.createObjectURL(firstChunkBlob));
// //       this.currentAudio = firstAudio;

// //       firstAudio.onended = () => {
// //         if (firstAudio.src.startsWith('blob:')) URL.revokeObjectURL(firstAudio.src);
// //         if (this.isPlaying && !this.isPaused) {
// //           // Attempt to play the next chunk (will check queue and update index)
// //           this.playNextChunk(options);
// //         } else if (!this.isPaused) {
// //           // If finished naturally (not paused)
// //           this.stopAudio();
// //         }
// //         // If paused, do nothing here - wait for resume
// //       };

// //       firstAudio.play().then(() => {
// //         // Successfully started playing the first chunk
// //         console.log("First chunk playing...");
// //         // Start processing remaining chunks immediately (from index 1)
// //         this.processRemainingChunks(options);
// //       }).catch(error => {
// //          console.error("Error playing first chunk:", error);
// //          this.stopAudio(); // Clean up if first play fails
// //       });

// //     } catch (error) {
// //       console.error('Error in chunked TTS:', error);
// //       this.stopAudio(); // Ensure cleanup on error
// //       throw error; // Re-throw the error
// //     }
// //   }

// //   /**
// //    * Processes remaining chunks (index 1 onwards) and adds them to the queue.
// //    */
// //   private async processRemainingChunks(options: TTSOptions): Promise<void> {
// //     try {
// //       // Start from the second chunk (index 1)
// //       for (let i = 1; i < this.currentOriginalTextChunks.length; i++) {
// //         if (!this.isPlaying || this.isPaused || this.abortController?.signal.aborted) {
// //           console.log('Processing remaining chunks stopped or paused.');
// //           break;
// //         }

// //         const chunkText = this.currentOriginalTextChunks[i];
// //         const blob = await this.generateAudioBlob(chunkText, options);

// //         // Only push if still playing and not aborted/paused during generation
// //         if (this.isPlaying && !this.isPaused && !this.abortController?.signal.aborted) {
// //           this.audioQueue.push(blob);
// //         } else {
// //            console.log('Discarding generated chunk due to stop/pause/abort.');
// //            break; // Stop processing further chunks
// //         }
// //       }
// //     } catch (error) {
// //       console.error('Error processing chunks:', error);
// //       // Don't stop playback here necessarily, let existing audio finish
// //     } finally {
// //       // Set processing to false only when this background fetching loop is done
// //       if (this.isProcessing && !this.abortController?.signal.aborted) {
// //           this.isProcessing = false;
// //           console.log("Finished generating/queueing all chunks.");
// //       }
// //     }
// //   }

// //   /**
// //    * Plays the next chunk from the queue. Updates tracking index.
// //    */
// //   private playNextChunk(options: TTSOptions): void {
// //     // Calculate the index of the *next* chunk to play
// //     const nextChunkIndexToPlay = this.currentChunkIndex + 1;

// //     // Exit conditions: paused, stopped, queue empty, or no more chunks exist
// //     if (this.isPaused || !this.isPlaying || this.audioQueue.length === 0 || nextChunkIndexToPlay >= this.currentOriginalTextChunks.length) {
// //       // Check if it naturally finished the last chunk
// //       if (!this.isPaused && this.isPlaying && this.audioQueue.length === 0 && nextChunkIndexToPlay >= this.currentOriginalTextChunks.length) {
// //           console.log("Finished playing all chunks naturally.");
// //           this.stopAudio();
// //       } else {
// //           // console.log("playNextChunk: Conditions not met (paused, stopped, queue empty, or index out of bounds).");
// //       }
// //       return;
// //     }

// //     const nextBlob = this.audioQueue.shift();
// //     if (!nextBlob) {
// //       console.error("playNextChunk: Queue claimed non-empty but shift failed.");
// //       this.stopAudio();
// //       return;
// //     }

// //     // --- NEW: Update index to the chunk we are about to play ---
// //     this.currentChunkIndex = nextChunkIndexToPlay;
// //     console.log(`Playing next chunk, index: ${this.currentChunkIndex}`);
// //     // --- End New ---

// //     const audio = new Audio(URL.createObjectURL(nextBlob));
// //     this.currentAudio = audio;

// //     audio.onended = () => {
// //       if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
// //       if (this.isPlaying && !this.isPaused) {
// //         // Recursively call to play the one after the index that just finished
// //         this.playNextChunk(options);
// //       } else if (!this.isPaused) {
// //         // If stopped during playback or finished last chunk and was stopped
// //         this.stopAudio();
// //       }
// //       // If paused, do nothing - wait for resume
// //     };

// //     audio.play().catch(error => {
// //       console.error(`Error playing audio chunk index ${this.currentChunkIndex}:`, error);
// //       if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
// //       // If an error occurs, stop playback for stability.
// //       this.stopAudio();
// //     });
// //   }

// //   // --- Pause/Resume Methods (Largely Unchanged) ---
// //   public pauseAudio(): void {
// //     if (this.currentAudio && !this.currentAudio.paused && this.isPlaying) {
// //       this.currentAudio.pause();
// //       this.isPaused = true;
// //       console.log(`Audio paused. Current chunk index: ${this.currentChunkIndex}. Approx char index: ${this.getCurrentPlaybackStartIndex()}`);
// //     }
// //   }

// //   public resumeAudio(): void {
// //     // Simple resume: just play the current audio element if it exists and was paused.
// //     if (this.currentAudio && this.currentAudio.paused && this.isPlaying) {
// //       this.isPaused = false;
// //       this.currentAudio.play().then(() => {
// //         console.log(`Audio resumed. Current chunk index: ${this.currentChunkIndex}`);
// //       }).catch(error => {
// //         console.error("Error resuming audio:", error);
// //         this.stopAudio(); // Stop if resume fails
// //       });
// //     } else if (this.isPaused && this.isPlaying) {
// //         // If paused between chunks (this.currentAudio is null or finished)
// //         console.warn("Attempting to resume between chunks. May require user to click Resume Reading again.");
// //         // For simplicity, stop. The UI showing "Resume Reading" will allow restarting from saved index.
// //         this.isPaused = false; // Allow interval check to see session is no longer active
// //         this.stopAudio();

// //     }
// //   }

// //   // --- NEW: Method to get current playback start index ---
// //   /**
// //    * Calculates the starting character index in the original text based on
// //    * the chunks played *before* the current chunk.
// //    * Returns -1 if playback is not active or index is unavailable.
// //    */
// //   public getCurrentPlaybackStartIndex(): number {
// //     // Can only calculate if we have chunks and a valid current index
// //     if (!this.isPlaying || this.currentChunkIndex < 0 || !this.currentOriginalTextChunks || this.currentOriginalTextChunks.length === 0) {
// //       return -1;
// //     }

// //     // Ensure index doesn't go beyond bounds if called exactly on finish
// //     const validIndex = Math.min(this.currentChunkIndex, this.currentOriginalTextChunks.length);

// //     // Sum the lengths of all chunks *before* the current one
// //     let characterIndex = 0;
// //     for (let i = 0; i < validIndex; i++) {
// //       characterIndex += this.currentOriginalTextChunks[i]?.length || 0;
// //       // NOTE: This assumes no extra characters (like spaces) were added/lost during chunking.
// //       // If your splitIntoChunks logic adds/removes characters, this calculation needs adjustment.
// //     }
// //     return characterIndex;
// //   }
// //   // --- End New ---


// //   // --- State Check Methods (Unchanged logic) ---
// //   public isCurrentlyPlaying(): boolean { return this.isPlaying && !this.isPaused; }
// //   public isCurrentlyPaused(): boolean { return this.isPaused; }
// //   public isSessionActive(): boolean { return this.isPlaying; } // Session is active if playing or paused
// //   public isCurrentlyProcessing(): boolean { return this.isProcessing; }

// //   // --- Stop Method ---
// //   public stopAudio(): void {
// //     // console.log("stopAudio called.");
// //     if (this.abortController) {
// //       this.abortController.abort();
// //       this.abortController = null;
// //     }
// //     if (this.currentAudio) {
// //       this.currentAudio.pause();
// //       if (this.currentAudio.src.startsWith('blob:')) {
// //         URL.revokeObjectURL(this.currentAudio.src);
// //       }
// //       this.currentAudio = null;
// //     }
// //     this.audioQueue = [];
// //     this.isPlaying = false;
// //     this.isPaused = false;
// //     this.isProcessing = false;

// //     // --- NEW: Reset tracking state ---
// //     this.currentOriginalTextChunks = [];
// //     this.currentChunkIndex = -1;
// //     // --- End New ---

// //     // console.log("Audio stopped and state reset."); // Optional: for debugging
// //   }

// //   // --- Utility Methods (Ensure these are implemented correctly) ---
// //   private splitIntoChunks(text: string, maxChunkLength: number = 200): string[] {
// //     // --- PASTE YOUR ACTUAL splitIntoChunks IMPLEMENTATION HERE ---
// //     if (!text) return [];
// //     const sentenceMatches = text.match(/[^.!?]+[.!?]+/g);
// //     if (sentenceMatches) {
// //       const sentences = sentenceMatches.map(s => s.trim());
// //       const chunks: string[] = [];
// //       for (const sentence of sentences) {
// //         if (sentence.length <= maxChunkLength) {
// //           chunks.push(sentence);
// //         } else {
// //           const subChunks = this.breakLongChunk(sentence, maxChunkLength);
// //           chunks.push(...subChunks);
// //         }
// //       }
// //       return chunks.filter(chunk => chunk.length > 0);
// //     }
// //     return this.breakLongChunk(text, maxChunkLength).filter(chunk => chunk.length > 0);
// //   }

// //   private breakLongChunk(text: string, maxLength: number): string[] {
// //     // --- PASTE YOUR ACTUAL breakLongChunk IMPLEMENTATION HERE ---
// //     const chunks: string[] = [];
// //      let currentPosition = 0;
// //      while (currentPosition < text.length) {
// //          let endPosition = Math.min(currentPosition + maxLength, text.length);
// //          if (endPosition < text.length) {
// //              let lastSpace = text.lastIndexOf(' ', endPosition);
// //              if (lastSpace > currentPosition + Math.min(maxLength / 2, 50)) { // Avoid breaking too early
// //                  endPosition = lastSpace + 1; // Include space for next chunk start
// //              }
// //          }
// //          chunks.push(text.substring(currentPosition, endPosition).trim());
// //          currentPosition = endPosition;
// //      }
// //      return chunks.filter(chunk => chunk.length > 0);
// //   }


// //   private async generateAudioBlob(text: string, options: TTSOptions): Promise<Blob> {
// //       // --- PASTE YOUR ACTUAL generateAudioBlob fetch IMPLEMENTATION HERE ---
// //       try {
// //         console.log(`Generating audio for chunk (start): "${text.substring(0,30)}..."`);
// //         const response = await fetch(this.serverUrl, {
// //           method: 'POST',
// //           headers: { 'Content-Type': 'application/json', },
// //           body: JSON.stringify({
// //             text,
// //             voice: options.voice || 'en-US-BrianMultilingualNeural',
// //             format: options.format || 'audio-24khz-48kbitrate-mono-mp3',
// //             rate: options.rate,
// //             pitch: options.pitch
// //           }),
// //           signal: this.abortController?.signal, // Use the signal
// //         });

// //         if (!response.ok) {
// //           const errorText = await response.text();
// //           throw new Error(`Failed to generate audio (${response.status}): ${errorText}`);
// //         }
// //         return await response.blob();
// //       } catch (error) {
// //         if ((error as Error).name === 'AbortError') {
// //           console.log('Audio generation aborted');
// //         } else {
// //           console.error('Error generating audio blob:', error);
// //         }
// //         throw error; // Re-throw error
// //       }
// //   }

// //   // --- Legacy Methods ---
// //   // async generateAudio(text: string, options: TTSOptions = {}): Promise<Blob> { /* ... */ return new Blob();}
// //   // --- Legacy Methods (Keep if needed, but recommend phasing out) ---
// //   async generateAudio(text: string, options: TTSOptions = {}): Promise<Blob> {
// //     console.warn("generateAudio is deprecated, use speakTextInChunks");
// //     return this.generateAudioBlob(text, options);
// //   }


// //   // async playAudio(audioBlob: Blob): Promise<void> async playAudio(audioBlob: Blob): Promise<void> { /* ... */ }


// //   async playAudio(audioBlob: Blob): Promise<void> {
// //      console.warn("playAudio is deprecated, use speakTextInChunks");
// //      this.stopAudio();
// //      this.isPlaying = true; // Session is active
// //      this.isPaused = false;
// //      this.isProcessing = false;

// //      return new Promise<void>((resolve, reject) => {
// //        const audio = new Audio(URL.createObjectURL(audioBlob));
// //        this.currentAudio = audio;
// //        audio.onended = () => {
// //          if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
// //          this.currentAudio = null;
// //          this.isPlaying = false;
// //          resolve();
// //        };
// //        audio.onerror = (error) => {
// //          if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
// //          this.currentAudio = null;
// //          this.isPlaying = false;
// //          reject(error);
// //        };
// //        audio.play().catch(err => {
// //          if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
// //          this.currentAudio = null;
// //          this.isPlaying = false;
// //          reject(err);
// //        });
// //      });
// //   }

// //   async streamAudio(text: string, options: TTSOptions = {}): Promise<void> {
// //      console.warn("streamAudio is deprecated, use speakTextInChunks");
// //      return this.speakTextInChunks(text, options);
// //   }

// //   // async streamAudio(text: string, options: TTSOptions = {}): Promise<void> { /* ... */ }
// // }

// // export default TTSService;



// // src/services/msedge.ts
// export interface TTSOptions {
//   voice?: string;
//   format?: string;
//   rate?: number;
//   pitch?: string;
// }

// // Define OUTPUT_FORMAT here or ensure it's available if generateAudioBlob uses it.
// // This is just a placeholder based on your server.js
// const OUTPUT_FORMAT = {
//     AUDIO_24KHZ_48KBITRATE_MONO_MP3: "audio-24khz-48kbitrate-mono-mp3",
// };


// export class TTSService {
//   private static instance: TTSService;
//   private serverUrl: string;
//   private currentAudio: HTMLAudioElement | null = null;
//   private audioQueue: Blob[] = [];
//   private isPlaying: boolean = false; // Session active (playing or paused in your original logic)
//   private isProcessing: boolean = false; // Actively fetching audio
//   private isPaused: boolean = false; // Separate state for pause
//   private abortController: AbortController | null = null;

//   private currentOriginalTextChunks: string[] = [];
//   private currentChunkIndex: number = -1; // Index of the chunk that IS/WAS playing or about to play

//   private serviceInstanceId = `TTSService_${Date.now().toString().slice(-5)}`; // For differentiating logs if multiple instances could exist (unlikely for singleton)

//   private constructor() {
//     this.serverUrl = import.meta.env.VITE_TTS_SERVER_URL || '/api/tts';
//     console.log(`%c[${this.serviceInstanceId} CONSTRUCTOR] Instance created. Server URL: ${this.serverUrl}`, "color: magenta;");
//   }

//   public static getInstance(): TTSService {
//     if (!TTSService.instance) {
//       TTSService.instance = new TTSService();
//     }
//     return TTSService.instance;
//   }

//   // --- STATUS METHODS ---
//   public isCurrentlyPlaying(): boolean {
//     const result = this.isPlaying && !this.isPaused;
//     // console.log(`%c[${this.serviceInstanceId} isCurrentlyPlaying] CHECK. isPlaying: ${this.isPlaying}, isPaused: ${this.isPaused}. Returning: ${result}`, "color: gray;");
//     return result;
//   }
//   public isCurrentlyPaused(): boolean {
//     // console.log(`%c[${this.serviceInstanceId} isCurrentlyPaused] CHECK. Returning: ${this.isPaused}`, "color: gray;");
//     return this.isPaused;
//   }
//   public isSessionActive(): boolean { // Session is active if playing or paused (as per your original logic for this.isPlaying)
//     // console.log(`%c[${this.serviceInstanceId} isSessionActive] CHECK. Returning: ${this.isPlaying}`, "color: gray;");
//     return this.isPlaying;
//   }
//   public isCurrentlyProcessing(): boolean {
//     // console.log(`%c[${this.serviceInstanceId} isCurrentlyProcessing] CHECK. Returning: ${this.isProcessing}`, "color: gray;");
//     return this.isProcessing;
//   }

//   public getCurrentPlaybackStartIndex(): number {
//     const logPrefix = `[${this.serviceInstanceId} getCurrentPlaybackStartIndex]`;
//     if (!this.isPlaying || this.currentChunkIndex < 0 || this.currentChunkIndex >= this.currentOriginalTextChunks.length) {
//       console.log(`${logPrefix} Conditions not met (isPlaying: ${this.isPlaying}, currentChunkIndex: ${this.currentChunkIndex}, chunks: ${this.currentOriginalTextChunks.length}). Returning -1.`);
//       return -1;
//     }

//     let characterIndex = 0;
//     for (let i = 0; i < this.currentChunkIndex; i++) { // Sum lengths of chunks *before* the current one
//       characterIndex += this.currentOriginalTextChunks[i]?.length || 0;
//     }
//     console.log(`${logPrefix} Calculated char index: ${characterIndex} for currentChunkIndex: ${this.currentChunkIndex}`);
//     return characterIndex;
//   }


//   async speakTextInChunks(text: string, options: TTSOptions = {}): Promise<void> {
//     const logPrefix = `[${this.serviceInstanceId} speakTextInChunks]`;
//     console.log(`${logPrefix} CALLED. Text sample: "${text.substring(0, 70)}...", Options:`, options);
//     console.log(`${logPrefix} State BEFORE stopAudio: isPlaying=${this.isPlaying}, isPaused=${this.isPaused}, isProcessing=${this.isProcessing}, queueLen=${this.audioQueue.length}, currentChunkIdx=${this.currentChunkIndex}`);

//     try {
//       this.stopAudio(); // Clears state, including tracking. stopAudio logs its own actions.
//       console.log(`${logPrefix} State AFTER stopAudio: isPlaying=${this.isPlaying}, isPaused=${this.isPaused}, isProcessing=${this.isProcessing}, queueLen=${this.audioQueue.length}, currentChunkIdx=${this.currentChunkIndex}`);

//       this.currentOriginalTextChunks = this.splitIntoChunks(text); // splitIntoChunks logs internally
//       if (!this.currentOriginalTextChunks || this.currentOriginalTextChunks.length === 0) {
//         console.warn(`${logPrefix} No text chunks generated to speak. Aborting.`);
//         this.stopAudio(); // Ensure clean state again (though stopAudio was just called)
//         return;
//       }
//       console.log(`${logPrefix} Text split into ${this.currentOriginalTextChunks.length} chunks. First chunk sample: "${this.currentOriginalTextChunks[0]?.substring(0,50)}..."`);

//       this.isPlaying = true;     // Overall session is now active
//       this.isProcessing = true;  // Starting to process (fetch) the first chunk
//       this.isPaused = false;     // Not paused
//       this.abortController = new AbortController(); // New controller for this session
//       console.log(`${logPrefix} Initialized state: isPlaying=true, isProcessing=true, isPaused=false.`);

//       const firstChunkText = this.currentOriginalTextChunks[0];
//       console.log(`${logPrefix} Generating audio for FIRST chunk (index 0).`);
//       const firstChunkBlob = await this.generateAudioBlob(firstChunkText, options); // generateAudioBlob logs internally

//       // Check if stopAudio was called during the await for generateAudioBlob
//       if (!this.isPlaying) { // isPlaying is set to false by stopAudio
//           console.log(`${logPrefix} Playback was stopped during generation of the first chunk. Aborting further actions.`);
//           return;
//       }

//       console.log(`${logPrefix} First chunk blob generated. Size: ${firstChunkBlob.size}. Setting currentChunkIndex = 0.`);
//       this.currentChunkIndex = 0; // First chunk is now the one to play/being played

//       const firstAudio = new Audio(URL.createObjectURL(firstChunkBlob));
//       this.currentAudio = firstAudio;
//       console.log(`${logPrefix} Created Audio element for first chunk. Src: ${firstAudio.src}`);

//       firstAudio.onended = () => {
//         const endedLogPrefix = `${logPrefix} firstAudio.onended (Chunk ${this.currentChunkIndex}):`;
//         console.log(`${endedLogPrefix} Event triggered. Current src: ${firstAudio.src}`);
//         if (firstAudio.src.startsWith('blob:')) URL.revokeObjectURL(firstAudio.src);

//         if (this.isPlaying && !this.isPaused) {
//           console.log(`${endedLogPrefix} Session active and not paused. Attempting to play next chunk.`);
//           this.playNextChunk(options);
//         } else if (!this.isPaused && this.isPlaying) { // Was playing but finished naturally
//           console.log(`${endedLogPrefix} Session active but somehow not paused (should be !this.isPlaying if natural end). Stopping audio.`);
//           this.stopAudio();
//         } else if (this.isPaused) {
//             console.log(`${endedLogPrefix} TTS is PAUSED. Doing nothing, awaiting resume for next chunk.`);
//         } else { // Not isPlaying (implies stopAudio was called)
//             console.log(`${endedLogPrefix} Session NOT active (isPlaying=false). Likely stopped. Doing nothing further.`);
//         }
//       };

//       firstAudio.onerror = (e) => {
//           console.error(`${logPrefix} firstAudio.onerror (Chunk ${this.currentChunkIndex}): Error event:`, e, "Audio error object:", this.currentAudio?.error);
//           if (this.currentAudio?.src.startsWith('blob:')) URL.revokeObjectURL(this.currentAudio.src);
//           this.stopAudio();
//       };

//       firstAudio.onpause = () => { // Usually triggered by user pause or end of audio
//           const pauseLogPrefix = `${logPrefix} firstAudio.onpause (Chunk ${this.currentChunkIndex}):`;
//           // Check if this pause is user-initiated (isPaused state would be true) or end of track
//           if (this.isPaused) {
//             console.log(`${pauseLogPrefix} User-initiated pause detected by onpause event.`);
//           } else if (this.currentAudio && this.currentAudio.currentTime >= this.currentAudio.duration - 0.1 && !this.isPlaying) {
//             console.log(`${pauseLogPrefix} Pause event likely due to audio end and stopAudio already called.`);
//           } else if (this.currentAudio && !this.isPlaying && !this.isPaused) {
//             console.log(`${pauseLogPrefix} Pause event, but neither isPlaying nor isPaused is true in service. Likely stopped.`);
//           } else {
//             // This case might indicate an unexpected pause
//             console.warn(`${pauseLogPrefix} Unexpected pause event. isPlaying: ${this.isPlaying}, isPaused: ${this.isPaused}, currentTime: ${this.currentAudio?.currentTime}, duration: ${this.currentAudio?.duration}`);
//           }
//       };

//       firstAudio.onplay = () => {
//           console.log(`${logPrefix} firstAudio.onplay (Chunk ${this.currentChunkIndex}): Play event. isProcessing should be false now for this chunk.`);
//           // If this is the only chunk, all background processing is also done.
//           if (this.currentOriginalTextChunks.length === 1) {
//               this.isProcessing = false;
//               console.log(`${logPrefix} Only one chunk, set isProcessing=false.`);
//           }
//           // Note: isProcessing for background chunks is handled in processRemainingChunks
//       };

//       console.log(`${logPrefix} Attempting to play first chunk.`);
//       await firstAudio.play() // Make sure to await this promise
//         .then(() => {
//           console.log(`${logPrefix} First chunk playback INITIATED (Promise resolved). isProcessing is now specific to background queueing.`);
//           // isPlaying and isPaused state are managed by their respective methods and events.
//           // If there are more chunks, start processing them in the background.
//           if (this.currentOriginalTextChunks.length > 1) {
//             this.processRemainingChunks(options); // Don't await this, let it run in background
//           } else {
//             // If only one chunk, processing is effectively done once it starts playing.
//             // this.isProcessing = false; // Handled by onplay
//           }
//         })
//         .catch(error => {
//            console.error(`${logPrefix} Error invoking play() on first chunk:`, error);
//            if (this.currentAudio?.src.startsWith('blob:')) URL.revokeObjectURL(this.currentAudio.src);
//            this.stopAudio();
//         });

//     } catch (error) {
//       console.error(`${logPrefix} Overall error:`, error);
//       this.stopAudio();
//       // throw error; // Decide if Reader.tsx needs to catch this. If so, Reader's try/catch in handleTTS needs to set its own processing state.
//     }
//   }


//   private async processRemainingChunks(options: TTSOptions): Promise<void> {
//     const logPrefix = `[${this.serviceInstanceId} processRemainingChunks]`;
//     console.log(`${logPrefix} Starting background processing for remaining chunks. Total chunks: ${this.currentOriginalTextChunks.length}`);
//     // this.isProcessing should already be true from speakTextInChunks

//     try {
//       for (let i = 1; i < this.currentOriginalTextChunks.length; i++) {
//         if (!this.isPlaying || this.abortController?.signal.aborted) { // isPlaying acts as session active guard
//           console.log(`${logPrefix} Aborting at chunk index ${i} due to stop/abort. isPlaying: ${this.isPlaying}, aborted: ${this.abortController?.signal.aborted}`);
//           break;
//         }
//         const chunkText = this.currentOriginalTextChunks[i];
//         console.log(`${logPrefix} Generating audio for background chunk (index ${i}): "${chunkText.substring(0,50)}..."`);
//         const blob = await this.generateAudioBlob(chunkText, options); // generateAudioBlob logs

//         if (this.isPlaying && !this.abortController?.signal.aborted) { // Check again after await
//           this.audioQueue.push(blob);
//           console.log(`${logPrefix} Chunk ${i} blob generated and queued. Queue size: ${this.audioQueue.length}`);
//         } else {
//            console.log(`${logPrefix} Discarding generated chunk ${i} due to stop/abort after generation.`);
//            break;
//         }
//       }
//     } catch (error) {
//       console.error(`${logPrefix} Error during background processing:`, error);
//       // Don't necessarily stop ongoing playback of already queued/playing chunks
//       // But indicate that further background processing might have failed.
//     } finally {
//       // This finally block executes when the loop finishes or breaks due to error/abort.
//       console.log(`${logPrefix} Background processing loop finished or exited.`);
//       this.isProcessing = false; // All fetching attempts are done.
//       console.log(`${logPrefix} Set isProcessing = false.`);
//     }
//   }

//   private playNextChunk(options: TTSOptions): void {
//     const logPrefix = `[${this.serviceInstanceId} playNextChunk]`;
//     const nextChunkIndexToAttempt = this.currentChunkIndex + 1;
//     console.log(`${logPrefix} CALLED. Attempting to play chunk index ${nextChunkIndexToAttempt}. Current queue size: ${this.audioQueue.length}. State: isPlaying=${this.isPlaying}, isPaused=${this.isPaused}`);

//     if (this.isPaused) {
//       console.log(`${logPrefix} Currently PAUSED. Will not play next chunk now.`);
//       // When resumed, resumeAudio should handle playing currentAudio or calling playNextChunk if currentAudio finished.
//       return;
//     }
//     if (!this.isPlaying) {
//       console.log(`${logPrefix} Playback session NOT active (isPlaying=false). Aborting.`);
//       this.stopAudio(); // Ensure clean state if called inappropriately
//       return;
//     }

//     if (nextChunkIndexToAttempt >= this.currentOriginalTextChunks.length) {
//       console.log(`${logPrefix} All chunks have been initiated for playback (next index ${nextChunkIndexToAttempt} >= total ${this.currentOriginalTextChunks.length}). Session finished.`);
//       this.stopAudio(); // All done
//       return;
//     }

//     if (this.audioQueue.length === 0) {
//       console.warn(`${logPrefix} Queue is empty, but trying to play chunk ${nextChunkIndexToAttempt}. isProcessing: ${this.isProcessing}. This might mean processing is too slow or an error occurred.`);
//       // If still processing, we might wait. If not processing, then it's an issue.
//       if (!this.isProcessing) {
//           console.error(`${logPrefix} Queue empty and not processing, but not all chunks played. Stopping.`);
//           this.stopAudio();
//       } else {
//           console.log(`${logPrefix} Queue empty but still processing background chunks. Waiting for next chunk to be queued or user interaction.`);
//           // Playback will stall here until a chunk is queued and playNextChunk is triggered again,
//           // or if user pauses/resumes/stops.
//       }
//       return;
//     }

//     const nextBlob = this.audioQueue.shift();
//     if (!nextBlob) { // Should not happen if length > 0
//       console.error(`${logPrefix} Queue had length but shift() returned undefined. Critical error. Stopping.`);
//       this.stopAudio();
//       return;
//     }

//     this.currentChunkIndex = nextChunkIndexToAttempt; // Update to the chunk index we are about to play
//     console.log(`${logPrefix} Playing next chunk from queue (index ${this.currentChunkIndex}). New queue size: ${this.audioQueue.length}`);

//     // --- Setup new Audio element ---
//     if (this.currentAudio) { // Clean up previous one just in case
//         this.currentAudio.onended = null; this.currentAudio.onerror = null; this.currentAudio.onpause = null; this.currentAudio.onplay = null;
//         this.currentAudio.pause();
//         if(this.currentAudio.src.startsWith('blob:')) URL.revokeObjectURL(this.currentAudio.src);
//     }

//     const audio = new Audio(URL.createObjectURL(nextBlob));
//     this.currentAudio = audio;
//     console.log(`${logPrefix} Created Audio element for chunk ${this.currentChunkIndex}. Src: ${audio.src}`);

//     audio.onended = () => {
//       const endedLogPrefix = `${logPrefix} audio.onended (Chunk ${this.currentChunkIndex}):`;
//       console.log(`${endedLogPrefix} Event triggered. Src: ${audio.src}`);
//       if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
//       if (this.isPlaying && !this.isPaused) {
//         console.log(`${endedLogPrefix} Session active and not paused. Playing next.`);
//         this.playNextChunk(options);
//       } else if (!this.isPaused && this.isPlaying) {
//         console.log(`${endedLogPrefix} Session active but not paused (natural end). Stopping.`);
//         this.stopAudio();
//       } else if (this.isPaused) {
//         console.log(`${endedLogPrefix} TTS is PAUSED. Awaiting resume.`);
//       } else {
//         console.log(`${endedLogPrefix} Session NOT active. Likely stopped.`);
//       }
//     };
//     audio.onerror = (e) => {
//         console.error(`${logPrefix} audio.onerror (Chunk ${this.currentChunkIndex}): Error event:`, e, "Audio error object:", this.currentAudio?.error);
//         if (this.currentAudio?.src.startsWith('blob:')) URL.revokeObjectURL(this.currentAudio.src);
//         this.stopAudio();
//     };
//     audio.onpause = () => {
//         const pauseLogPrefix = `${logPrefix} audio.onpause (Chunk ${this.currentChunkIndex}):`;
//         if (this.isPaused) console.log(`${pauseLogPrefix} User-initiated pause confirmed by onpause event.`);
//         else if (this.currentAudio && this.currentAudio.currentTime >= this.currentAudio.duration - 0.1 && !this.isPlaying) { /* End of track */ }
//         else console.warn(`${pauseLogPrefix} Unexpected pause. isPlaying: ${this.isPlaying}, isPaused: ${this.isPaused}`);
//     };
//     audio.onplay = () => {
//         console.log(`${logPrefix} audio.onplay (Chunk ${this.currentChunkIndex}): Play event.`);
//     };

//     console.log(`${logPrefix} Attempting to play chunk ${this.currentChunkIndex}.`);
//     audio.play().catch(error => {
//       console.error(`${logPrefix} Error invoking play() on chunk ${this.currentChunkIndex}:`, error);
//       if (this.currentAudio?.src.startsWith('blob:')) URL.revokeObjectURL(this.currentAudio.src);
//       this.stopAudio();
//     });
//   }

//   public pauseAudio(): void {
//     const logPrefix = `[${this.serviceInstanceId} pauseAudio]`;
//     console.log(`${logPrefix} CALLED. State: isPlaying=${this.isPlaying}, isPaused=${this.isPaused}, currentAudio exists: ${!!this.currentAudio}`);
//     if (this.currentAudio && this.isPlaying && !this.isPaused) { // Must be playing to be user-pausable
//       this.currentAudio.pause();
//       this.isPaused = true;
//       // isPlaying remains true because the session is active, just paused.
//       console.log(`${logPrefix} Audio element paused. Set isPaused=true. Current chunk index: ${this.currentChunkIndex}. Approx char index: ${this.getCurrentPlaybackStartIndex()}`);
//     } else {
//       console.warn(`${logPrefix} No audio to pause or not in a pausable state.`);
//     }
//   }

//   public resumeAudio(): void {
//     const logPrefix = `[${this.serviceInstanceId} resumeAudio]`;
//     console.log(`${logPrefix} CALLED. State: isPlaying=${this.isPlaying}, isPaused=${this.isPaused}, currentAudio exists: ${!!this.currentAudio}`);

//     if (this.isPlaying && this.isPaused) { // Session must be active and paused
//       this.isPaused = false; // Attempting to unpause
//       if (this.currentAudio && this.currentAudio.paused) {
//         console.log(`${logPrefix} Resuming current audio element (chunk ${this.currentChunkIndex}).`);
//         this.currentAudio.play().then(() => {
//           console.log(`${logPrefix} Playback RESUMED from current audio element.`);
//           // isPlaying should still be true. isPaused is now false.
//         }).catch(error => {
//           console.error(`${logPrefix} Error resuming current audio playback:`, error);
//           this.stopAudio();
//         });
//       } else {
//         // This case means we were paused between chunks (currentAudio finished or was null)
//         console.log(`${logPrefix} Was paused but currentAudio is not set or not paused. Trying to play next chunk from queue.`);
//         this.playNextChunk({}); // Attempt to play the next chunk in the sequence
//       }
//     } else {
//       console.warn(`${logPrefix} Cannot resume. Not paused or session not active (isPlaying=false).`);
//     }
//   }

//   public stopAudio(): void {
//     const logPrefix = `[${this.serviceInstanceId} stopAudio]`;
//     console.log(`${logPrefix} CALLED. Current state: isPlaying=${this.isPlaying}, isPaused=${this.isPaused}, isProcessing=${this.isProcessing}`);
//     if (this.abortController) {
//       console.log(`${logPrefix} Aborting any ongoing fetch operations.`);
//       this.abortController.abort(); // This will trigger 'AbortError' in generateAudioBlob
//       this.abortController = null;
//     }
//     if (this.currentAudio) {
//       console.log(`${logPrefix} Pausing and cleaning up currentAudio. Src: ${this.currentAudio.src}`);
//       this.currentAudio.pause();
//       this.currentAudio.onended = null; this.currentAudio.onerror = null; this.currentAudio.onpause = null; this.currentAudio.onplay = null; // Deregister handlers
//       if (this.currentAudio.src && this.currentAudio.src.startsWith('blob:')) {
//         URL.revokeObjectURL(this.currentAudio.src);
//       }
//       this.currentAudio.removeAttribute('src');
//       this.currentAudio.load(); // Helps reset the element
//       this.currentAudio = null;
//     } else {
//         console.log(`${logPrefix} No currentAudio element to stop.`);
//     }
//     this.audioQueue.forEach(blob => {
//         // If these were blob URLs, they would need revoking. They are just Blobs.
//     });
//     this.audioQueue = [];
//     this.isPlaying = false; // Session is no longer active
//     this.isPaused = false;
//     this.isProcessing = false; // Any fetching should have been aborted
//     this.currentOriginalTextChunks = [];
//     this.currentChunkIndex = -1;
//     console.log(`${logPrefix} Audio stopped and all states reset.`);
//   }

//   private splitIntoChunks(text: string, maxChunkLength: number = 200): string[] {
//     const logPrefix = `[${this.serviceInstanceId} splitIntoChunks]`;
//     if (!text) {
//         console.log(`${logPrefix} Input text is empty.`);
//         return [];
//     }
//     const sentenceMatches = text.match(/[^.!?\n\r]+[.!?\n\r]*\s*/g); // Keep trailing space to help rejoin if needed
//     let chunks: string[] = [];
//     if (sentenceMatches) {
//       // console.log(`${logPrefix} Found ${sentenceMatches.length} sentence-like segments.`);
//       for (const sentence of sentenceMatches) {
//         let trimmedSentence = sentence.trim(); // Trim now
//         if(trimmedSentence.length === 0) continue;

//         if (trimmedSentence.length <= maxChunkLength) {
//           chunks.push(trimmedSentence);
//         } else {
//           // console.log(`${logPrefix} Sentence too long (${trimmedSentence.length}), breaking: "${trimmedSentence.substring(0,30)}..."`);
//           const subChunks = this.breakLongChunk(trimmedSentence, maxChunkLength);
//           chunks.push(...subChunks);
//         }
//       }
//     } else {
//       // If no sentence breaks found, treat the whole text as one segment to be broken.
//       // console.log(`${logPrefix} No sentence breaks found, breaking whole text.`);
//       chunks = this.breakLongChunk(text.trim(), maxChunkLength);
//     }
//     const finalChunks = chunks.filter(chunk => chunk.length > 0);
//     // console.log(`${logPrefix} Produced ${finalChunks.length} final chunks.`);
//     return finalChunks;
//   }

//   private breakLongChunk(text: string, maxLength: number): string[] {
//     const chunks: string[] = [];
//     let currentPosition = 0;
//     while (currentPosition < text.length) {
//         let endPosition = Math.min(currentPosition + maxLength, text.length);
//         if (endPosition < text.length) { // If not the end of the text
//             let lastSpace = text.lastIndexOf(' ', endPosition);
//             // Break at space only if it's reasonably far from the start of this sub-chunk
//             // and not too close to the very end of the maxLength cut.
//             if (lastSpace > currentPosition && lastSpace > currentPosition + maxLength / 3) {
//                 endPosition = lastSpace; // Break before the space
//             }
//         }
//         chunks.push(text.substring(currentPosition, endPosition).trim());
//         currentPosition = endPosition;
//         while(currentPosition < text.length && text[currentPosition] === ' '){ // Skip leading spaces for next chunk
//             currentPosition++;
//         }
//     }
//     return chunks.filter(chunk => chunk.length > 0);
//   }

//   private async generateAudioBlob(text: string, options: TTSOptions): Promise<Blob> {
//     const logPrefix = `[${this.serviceInstanceId} generateAudioBlob]`;
//     // Ensure abortController exists for this fetch, it should be set by speakTextInChunks
//     if (!this.abortController) {
//         console.warn(`${logPrefix} AbortController is null! Creating a new one. This might indicate an issue if called outside a managed session.`);
//         this.abortController = new AbortController();
//     }
//     const signal = this.abortController.signal;

//     console.log(`${logPrefix} Requesting audio for text (start): "${text.substring(0,30)}..." from ${this.serverUrl}`);
//     try {
//       const response = await fetch(this.serverUrl, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           text,
//           voice: options.voice || 'en-US-BrianMultilingualNeural',
//           format: options.format || OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
//           rate: options.rate,
//           pitch: options.pitch
//         }),
//         signal: signal, // Pass the signal to the fetch request
//       });

//       console.log(`${logPrefix} Response status for "${text.substring(0,30)}...": ${response.status}`);

//       if (signal.aborted) { // Check signal *after* await
//         console.log(`${logPrefix} Fetch aborted for text: "${text.substring(0,30)}..."`);
//         throw new DOMException('Request aborted by client.', 'AbortError');
//       }

//       if (!response.ok) {
//         const errorText = await response.text().catch(() => "Could not parse error response body");
//         console.error(`${logPrefix} API Error (${response.status}) for "${text.substring(0,30)}...": ${errorText.substring(0, 200)}`);
//         throw new Error(`TTS API Failed (${response.status}): ${errorText.substring(0,100)}`);
//       }
//       const blob = await response.blob();
//       console.log(`${logPrefix} Blob received for "${text.substring(0,30)}...". Size: ${blob.size}`);
//       return blob;
//     } catch (error) {
//       if ((error as Error).name === 'AbortError') {
//         // Already logged by the signal check or the catch here
//       } else {
//         console.error(`${logPrefix} Error in fetch/blob conversion for "${text.substring(0,30)}...":`, error);
//       }
//       throw error; // Re-throw for the caller to handle
//     }
//   }

//   // --- Legacy Methods ---
//   async generateAudio(text: string, options: TTSOptions = {}): Promise<Blob> {
//     console.warn(`%c[${this.serviceInstanceId}] generateAudio (DEPRECATED) called.`, "color: orange;");
//     // Ensure an abort controller for this one-off, though it's not managed by a session
//     this.abortController = new AbortController();
//     return this.generateAudioBlob(text, options);
//   }

//   async playAudio(audioBlob: Blob): Promise<void> {
//      console.warn(`%c[${this.serviceInstanceId}] playAudio (DEPRECATED) called.`, "color: orange;");
//      await this.stopAudio(); // Stop any current session
//      this.isPlaying = true; // Indicates a temporary "session" for this single blob
//      this.isPaused = false;
//      this.isProcessing = false;
//      this.currentChunkIndex = 0; // Treat as a single chunk
//      this.currentOriginalTextChunks = ["Legacy playAudio content"]; // Placeholder

//      return new Promise<void>((resolve, reject) => {
//        const audio = new Audio(URL.createObjectURL(audioBlob));
//        this.currentAudio = audio;
//        console.log(`%c[${this.serviceInstanceId} playAudio (legacy)] Playing blob. Src: ${audio.src}`, "color: orange;");

//        audio.onended = () => {
//          console.log(`%c[${this.serviceInstanceId} playAudio (legacy)] onended.`, "color: orange;");
//          if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
//          this.stopAudio(); // Full reset after legacy play
//          resolve();
//        };
//        audio.onerror = (errorEvent) => {
//          const error = this.currentAudio?.error || errorEvent;
//          console.error(`%c[${this.serviceInstanceId} playAudio (legacy)] onerror:`, "color: red;", error);
//          if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
//          this.stopAudio();
//          reject(error || new Error("Unknown audio playback error in legacy playAudio"));
//        };
//        audio.play().catch(err => {
//          console.error(`%c[${this.serviceInstanceId} playAudio (legacy)] .play() promise rejected:`, "color: red;", err);
//          if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
//          this.stopAudio();
//          reject(err);
//        });
//      });
//   }

//   async streamAudio(text: string, options: TTSOptions = {}): Promise<void> {
//      console.warn(`%c[${this.serviceInstanceId}] streamAudio (DEPRECATED) called. Redirecting to speakTextInChunks.`, "color: orange;");
//      return this.speakTextInChunks(text, options);
//   }
// }

// export default TTSService;


// src/services/msedge.ts
export interface TTSOptions {
  voice?: string;
  format?: string;
  rate?: number;
  pitch?: string;
}

const OUTPUT_FORMAT = { // Assuming this is how it's defined or imported
    AUDIO_24KHZ_48KBITRATE_MONO_MP3: "audio-24khz-48kbitrate-mono-mp3",
};

export class TTSService {
  private static instance: TTSService;
  private serverUrl: string;
  private currentAudio: HTMLAudioElement | null = null;
  private audioQueue: Blob[] = [];
  private isPlaying: boolean = false; // Your original: Session active (playing or paused)
  private isProcessing: boolean = false; // Your original: Actively fetching audio
  private isPaused: boolean = false; // Your original: Separate state for pause
  private abortController: AbortController | null = null;

  private currentOriginalTextChunks: string[] = [];
  private currentChunkIndex: number = -1; // Index of the chunk that IS/WAS playing or is next up

  private serviceInstanceId = `TTSService_${Date.now().toString().slice(-5)}`;

  private constructor() {
    const ttsApiUrl = import.meta.env.VITE_TTS_API_URL || 'https://api.yoread.com';
    this.serverUrl = `${ttsApiUrl}/api/tts`;
    console.log(`%c[${this.serviceInstanceId} CONSTRUCTOR] Instance created. Server URL: ${this.serverUrl}`, "color: magenta;");
  }

  public static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  // --- STATUS METHODS ---
  public isCurrentlyPlaying(): boolean {
    const result = this.isPlaying && !this.isPaused;
    // console.log(`%c[${this.serviceInstanceId} isCurrentlyPlaying] CHECK. isPlaying: ${this.isPlaying}, isPaused: ${this.isPaused}. Returning: ${result}`, "color: gray;");
    return result;
  }
  public isCurrentlyPaused(): boolean {
    // console.log(`%c[${this.serviceInstanceId} isCurrentlyPaused] CHECK. Returning: ${this.isPaused}`, "color: gray;");
    return this.isPaused;
  }
  public isSessionActive(): boolean {
    // console.log(`%c[${this.serviceInstanceId} isSessionActive] CHECK. Returning: ${this.isPlaying}`, "color: gray;");
    return this.isPlaying; // isPlaying flag indicates an active session (could be playing or paused)
  }
  public isCurrentlyProcessing(): boolean {
    // console.log(`%c[${this.serviceInstanceId} isCurrentlyProcessing] CHECK. Returning: ${this.isProcessing}`, "color: gray;");
    return this.isProcessing;
  }

  /**
   * Calculates the starting character index IN THE OVERALL ORIGINAL TEXT (passed to speakTextInChunks)
   * that corresponds to the beginning of the current (or last played/paused) chunk.
   * Returns -1 if playback is not active or index is unavailable.
   */
  public getCurrentPlaybackStartIndex(): number {
    const logPrefix = `[${this.serviceInstanceId} getCurrentPlaybackStartIndex]`;
    // this.isPlaying checks if a "speak" session is active.
    // this.currentChunkIndex should be the index of the chunk that is *loaded into currentAudio* or *just finished*.
    if (!this.isPlaying || this.currentChunkIndex < 0 || this.currentChunkIndex >= this.currentOriginalTextChunks.length) {
      console.log(`${logPrefix} Conditions not met (isPlaying: ${this.isPlaying}, currentChunkIndex: ${this.currentChunkIndex}, total chunks: ${this.currentOriginalTextChunks.length}). Returning -1.`);
      return -1;
    }

    let characterIndex = 0;
    // Sum lengths of all chunks *before* the currentChunkIndex
    for (let i = 0; i < this.currentChunkIndex; i++) {
      characterIndex += this.currentOriginalTextChunks[i]?.length || 0;
    }
    console.log(`${logPrefix} Calculated character index: ${characterIndex} for START of chunk index: ${this.currentChunkIndex}`);
    // NOTE: This does NOT give progress WITHIN the current chunk.
    // Reader.tsx's currentTTSBaseOffsetRef + this value is what's saved.
    return characterIndex;
  }


  async speakTextInChunks(text: string, options: TTSOptions = {}): Promise<void> {
    const logPrefix = `[${this.serviceInstanceId} speakTextInChunks]`;
    console.log(`${logPrefix} CALLED. Text sample: "${text.substring(0, 70)}...", Options:`, options);
    console.log(`${logPrefix} State BEFORE stopAudio: isPlaying=${this.isPlaying}, isPaused=${this.isPaused}, isProcessing=${this.isProcessing}, queueLen=${this.audioQueue.length}, currentChunkIdx=${this.currentChunkIndex}`);

    try {
      this.stopAudio(); // Full reset before starting a new "speak" session.
      console.log(`${logPrefix} State AFTER stopAudio: isPlaying=${this.isPlaying}, isPaused=${this.isPaused}, isProcessing=${this.isProcessing}, queueLen=${this.audioQueue.length}, currentChunkIdx=${this.currentChunkIndex}`);

      // --- CHANGED: Use a larger maxChunkLength ---
      this.currentOriginalTextChunks = this.splitIntoChunks(text, 450); // Increased from 200
      if (!this.currentOriginalTextChunks || this.currentOriginalTextChunks.length === 0) {
        console.warn(`${logPrefix} No text chunks generated to speak. Aborting.`);
        this.stopAudio();
        return;
      }
      console.log(`${logPrefix} Text split into ${this.currentOriginalTextChunks.length} chunks. First chunk sample: "${this.currentOriginalTextChunks[0]?.substring(0,50)}..."`);

      this.isPlaying = true;     // Session is now active
      this.isProcessing = true;  // Starting to process (fetch) the first chunk
      this.isPaused = false;
      this.abortController = new AbortController();
      console.log(`${logPrefix} Initialized state: isPlaying=true, isProcessing=true, isPaused=false.`);

      const firstChunkText = this.currentOriginalTextChunks[0];
      this.currentChunkIndex = 0; // Set currentChunkIndex as we are about to process/play chunk 0
      console.log(`${logPrefix} Generating audio for FIRST chunk (index ${this.currentChunkIndex}).`);
      const firstChunkBlob = await this.generateAudioBlob(firstChunkText, options);

      if (!this.isPlaying) {
          console.log(`${logPrefix} Playback was stopped (isPlaying=false) during generation of the first chunk. Aborting further actions.`);
          return;
      }

      console.log(`${logPrefix} First chunk blob generated. Size: ${firstChunkBlob.size}.`);
      // this.currentChunkIndex is already 0

      this._playBlob(firstChunkBlob, options, true); // Internal method to handle audio element

      // Start processing remaining chunks if any
      if (this.currentOriginalTextChunks.length > 1) {
        this.processRemainingChunks(options); // Runs in background
      } else {
        // If only one chunk, then processing (fetching) is done once this first chunk is playing/played.
        // The onplay/onended of the audio element will clear this.isProcessing via this.isPlaying.
        console.log(`${logPrefix} Only one chunk. isProcessing will be false after it plays/ends.`);
      }

    } catch (error) {
      console.error(`${logPrefix} Overall error:`, error);
      this.stopAudio(); // Full cleanup
    }
  }

  private async processRemainingChunks(options: TTSOptions): Promise<void> {
    const logPrefix = `[${this.serviceInstanceId} processRemainingChunks]`;
    console.log(`${logPrefix} Starting background processing for remaining chunks. From index 1 to ${this.currentOriginalTextChunks.length - 1}.`);
    // this.isProcessing should be true at the start of this.

    try {
      for (let i = 1; i < this.currentOriginalTextChunks.length; i++) {
        // Check session status before each chunk generation
        if (!this.isPlaying || this.abortController?.signal.aborted) {
          console.log(`${logPrefix} Aborting at chunk index ${i}. isPlaying: ${this.isPlaying}, aborted: ${this.abortController?.signal.aborted}`);
          this.isProcessing = false; // Stop saying we are processing if we abort
          return;
        }
        const chunkText = this.currentOriginalTextChunks[i];
        console.log(`${logPrefix} Generating audio for background chunk (index ${i}): "${chunkText.substring(0,50)}..."`);
        const blob = await this.generateAudioBlob(chunkText, options);

        // Check session status again after await
        if (this.isPlaying && !this.abortController?.signal.aborted) {
          this.audioQueue.push(blob);
          console.log(`${logPrefix} Chunk ${i} blob generated and queued. Queue size: ${this.audioQueue.length}`);
        } else {
           console.log(`${logPrefix} Discarding generated chunk ${i} due to stop/abort after generation.`);
           this.isProcessing = false; // Stop saying we are processing if we abort
           return;
        }
      }
    } catch (error) {
      console.error(`${logPrefix} Error during background processing:`, error);
      // Potentially stop the whole session on error, or just log and stop processing further chunks
    } finally {
      // This finally block executes when the loop finishes naturally or breaks due to error/abort.
      console.log(`${logPrefix} Background processing loop finished or exited. Setting isProcessing = false.`);
      this.isProcessing = false; // All fetching attempts are done or aborted.
    }
  }

  /** Internal method to set up and play an audio blob */
  private _playBlob(blob: Blob, options: TTSOptions, isFirstChunkForSession: boolean): void {
    const logPrefix = `[${this.serviceInstanceId} _playBlob ChunkIdx:${this.currentChunkIndex}]`;
    console.log(`${logPrefix} Attempting to play blob. Size: ${blob.size}. Is first chunk for this session: ${isFirstChunkForSession}`);

    if (this.currentAudio) { // Clean up any existing audio element
        console.log(`${logPrefix} Cleaning up previous currentAudio element.`);
        this.currentAudio.onended = null; this.currentAudio.onerror = null; this.currentAudio.onpause = null; this.currentAudio.onplay = null;
        this.currentAudio.pause();
        if(this.currentAudio.src.startsWith('blob:')) URL.revokeObjectURL(this.currentAudio.src);
        this.currentAudio.removeAttribute('src');
        this.currentAudio.load();
    }

    const audio = new Audio(URL.createObjectURL(blob));
    this.currentAudio = audio;
    console.log(`${logPrefix} Created NEW Audio element. Src: ${audio.src}`);

    // --- Event Handlers for the NEW audio element ---
    audio.onplay = () => {
        console.log(`${logPrefix} Event: onplay. Setting isPlaying=true (if not already), isPaused=false.`);
        this.isPlaying = true; // Ensure session is marked active
        this.isPaused = false;
        // If this was the first chunk of the session AND there are no more chunks to process in background,
        // then overall processing is done.
        if (isFirstChunkForSession && this.currentOriginalTextChunks.length <= 1) {
            console.log(`${logPrefix} onplay: First and only chunk started, setting isProcessing=false.`);
            this.isProcessing = false;
        }
        // If this is NOT the first chunk, isProcessing is for the background queueing.
    };

    audio.onended = () => {
      const endedLogPrefix = `${logPrefix} Event: onended.`;
      console.log(`${endedLogPrefix} Triggered. Current src: ${audio.src}. State: isPlaying=${this.isPlaying}, isPaused=${this.isPaused}`);
      if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
      // this.currentAudio = null; // Don't nullify yet if pause might need it. stopAudio will nullify.

      if (this.isPlaying && !this.isPaused) { // If session is still active and not user-paused
        console.log(`${endedLogPrefix} Session active & not paused. Attempting to play next chunk.`);
        // this.playNextChunk(options);
        setTimeout(() => {
          if (this.isPlaying && !this.isPaused) { // Check state again after delay
            this.playNextChunk(options);
          }
        }, 50); // 50ms delay, adjust as needed for testing
      } else if (this.isPaused) {
        console.log(`${endedLogPrefix} Session is PAUSED. Chunk finished, awaiting resumeAudio to play next.`);
        // Current audio is done. If resumeAudio is called, it should try playNextChunk.
      } else { // !this.isPlaying (session was stopped)
        console.log(`${endedLogPrefix} Session NOT active (isPlaying=false). Cleanup might have occurred or was already stopped.`);
        // No need to call stopAudio() again if isPlaying is already false.
      }
    };

    audio.onerror = (e) => {
        console.error(`${logPrefix} Event: onerror. Audio element error:`, e, "Audio error object:", this.currentAudio?.error);
        if (this.currentAudio?.src.startsWith('blob:')) URL.revokeObjectURL(this.currentAudio.src);
        this.stopAudio(); // Critical error, stop everything
    };

    audio.onpause = () => {
        const pauseLogPrefix = `${logPrefix} Event: onpause.`;
        // This event fires for user pause AND when audio naturally ends.
        if (this.isPaused) { // This flag is set by our pauseAudio() method
          console.log(`${pauseLogPrefix} User-initiated pause confirmed.`);
        } else if (this.currentAudio && this.currentAudio.currentTime >= this.currentAudio.duration - 0.1 && !this.isPlaying) {
          // Audio ended and stopAudio() likely already reset isPlaying
          console.log(`${pauseLogPrefix} Likely due to audio end & session already stopped.`);
        } else if (this.currentAudio && this.currentAudio.ended && !this.isPlaying){
            console.log(`${pauseLogPrefix} Audio ended flag is true and session is stopped.`);
        }
         else if (!this.isPlaying) {
            console.log(`${pauseLogPrefix} isPlaying is false. Session stopped.`);
        }
        else {
          console.warn(`${pauseLogPrefix} Unexpected pause. isPlaying: ${this.isPlaying}, isPaused: ${this.isPaused}, ended: ${this.currentAudio?.ended}`);
        }
    };

    console.log(`${logPrefix} Calling audio.play() on new audio element.`);
    audio.play()
      .then(() => {
        console.log(`${logPrefix} audio.play() promise resolved (playback should start/be starting).`);
      })
      .catch(playError => {
         console.error(`${logPrefix} audio.play() promise REJECTED:`, playError);
         if (this.currentAudio?.src.startsWith('blob:')) URL.revokeObjectURL(this.currentAudio.src);
         this.stopAudio(); // Stop on failure to play
      });
  }


  private playNextChunk(options: TTSOptions): void {
    const logPrefix = `[${this.serviceInstanceId} playNextChunk]`;
    const nextChunkIndexToAttempt = this.currentChunkIndex + 1; // currentChunkIndex is the one that just finished or was set up
    console.log(`${logPrefix} CALLED. Trying for chunk index ${nextChunkIndexToAttempt}. Queue size: ${this.audioQueue.length}. State: isPlaying=${this.isPlaying}, isPaused=${this.isPaused}`);

    if (this.isPaused) {
      console.log(`${logPrefix} Currently PAUSED. Will not automatically play next chunk.`);
      return;
    }
    if (!this.isPlaying) { // Session was stopped
      console.log(`${logPrefix} Playback session NOT active (isPlaying=false). Aborting playNextChunk.`);
      // stopAudio() should have cleaned up.
      return;
    }

    if (nextChunkIndexToAttempt >= this.currentOriginalTextChunks.length) {
      console.log(`${logPrefix} All chunks have been played (next index ${nextChunkIndexToAttempt} >= total ${this.currentOriginalTextChunks.length}). Session finished.`);
      this.stopAudio(); // All done
      return;
    }

    if (this.audioQueue.length > 0) {
      const nextBlob = this.audioQueue.shift();
      if (!nextBlob) { // Should not happen if length > 0
        console.error(`${logPrefix} Queue had length but shift() returned undefined. Stopping.`);
        this.stopAudio();
        return;
      }
      this.currentChunkIndex = nextChunkIndexToAttempt; // Update to the chunk index we are about to play
      console.log(`${logPrefix} Playing next chunk from queue (new index ${this.currentChunkIndex}). New queue size: ${this.audioQueue.length}`);
      this._playBlob(nextBlob, options, false); // isFirstChunkForSession = false
    } else {
      // Queue is empty, but we haven't played all original chunks yet.
      // This means background processing is either ongoing or failed to queue.
      console.warn(`${logPrefix} Queue is empty, trying to play chunk ${nextChunkIndexToAttempt}. isProcessing: ${this.isProcessing}.`);
      if (this.isProcessing) {
          console.log(`${logPrefix} Background chunk processing is still active. Playback will wait for next chunk to be queued.`);
          // Playback will appear to stall. The next chunk, when generated and if playNextChunk is triggered, will continue.
          // Or if user pauses/resumes/stops.
      } else {
          // Queue empty, not processing, but not all chunks played according to index.
          console.error(`${logPrefix} Queue empty, NOT processing, but not all chunks played (index ${nextChunkIndexToAttempt} < total ${this.currentOriginalTextChunks.length}). This indicates an issue or premature end. Stopping.`);
          this.stopAudio();
      }
      return;
    }
  }

  public pauseAudio(): void {
    const logPrefix = `[${this.serviceInstanceId} pauseAudio]`;
    console.log(`${logPrefix} CALLED. State: isPlaying=${this.isPlaying}, isPaused=${this.isPaused}, currentAudio exists: ${!!this.currentAudio}, currentAudio.paused=${this.currentAudio?.paused}`);

    // Can only pause if a session is active (isPlaying) and we are not already paused, and there's an audio element.
    if (this.currentAudio && this.isPlaying && !this.isPaused) {
      if (!this.currentAudio.paused) { // Check if the element itself isn't already paused
        this.currentAudio.pause(); // This will trigger the onpause event
        console.log(`${logPrefix} currentAudio.pause() called.`);
      } else {
        console.log(`${logPrefix} currentAudio element was ALREADY paused. Syncing state.`);
      }
      this.isPaused = true; // Set our service's state flag
      // isPlaying remains true because the *session* is active, just paused.
      console.log(`${logPrefix} Set isPaused=true. isPlaying remains true (session active). Current chunk index: ${this.currentChunkIndex}. Approx char index for chunk start: ${this.getCurrentPlaybackStartIndex()}`);
    } else {
      console.warn(`${logPrefix} Cannot pause. Conditions not met: currentAudio=${!!this.currentAudio}, isPlaying=${this.isPlaying}, not isPaused=${!this.isPaused}`);
    }
  }

  public resumeAudio(): void {
    const logPrefix = `[${this.serviceInstanceId} resumeAudio]`;
    console.log(`${logPrefix} CALLED. State: isPlaying=${this.isPlaying}, isPaused=${this.isPaused}, currentAudio exists: ${!!this.currentAudio}, currentAudio.paused=${this.currentAudio?.paused}`);

    if (this.isPlaying && this.isPaused) { // Session must be active and currently paused
      this.isPaused = false; // Attempting to unpause
      if (this.currentAudio && this.currentAudio.paused) { // If there's a current audio element that is actually paused
        console.log(`${logPrefix} Resuming current audio element (chunk ${this.currentChunkIndex}).`);
        this.currentAudio.play().then(() => {
          console.log(`${logPrefix} Playback RESUMED successfully from current audio element. isPaused=false.`);
          // isPlaying should still be true. The onplay event will set isPlaying=true, isPaused=false for this.currentAudio.
        }).catch(error => {
          console.error(`${logPrefix} Error resuming current audio playback:`, error);
          this.stopAudio(); // Stop on error
        });
      } else {
        // This case implies: session was paused (this.isPaused=true), but there's no currentAudio element
        // or it's not in a paused state (e.g., it finished and onended called playNextChunk which found isPaused true).
        // So, we should try to play the *next* chunk from the queue.
        console.log(`${logPrefix} Was paused, but currentAudio not set or not in a pausable state. Trying to play next chunk from queue (will start with chunk index ${this.currentChunkIndex + 1}).`);
        this.playNextChunk({}); // Attempt to play the next chunk in the sequence
      }
    } else {
      console.warn(`${logPrefix} Cannot resume. Not in a pausable state (isPlaying: ${this.isPlaying}, isPaused: ${this.isPaused}).`);
    }
  }

  public stopAudio(): void {
    const logPrefix = `[${this.serviceInstanceId} stopAudio]`;
    console.log(`${logPrefix} CALLED. Current state: isPlaying=${this.isPlaying}, isPaused=${this.isPaused}, isProcessing=${this.isProcessing}`);
    if (this.abortController) {
      console.log(`${logPrefix} Aborting any ongoing fetch operations.`);
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.currentAudio) {
      console.log(`${logPrefix} Cleaning up currentAudio. Src: ${this.currentAudio.src}`);
      this.currentAudio.pause();
      this.currentAudio.onended = null; this.currentAudio.onerror = null; this.currentAudio.onpause = null; this.currentAudio.onplay = null;
      if (this.currentAudio.src && this.currentAudio.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.currentAudio.src);
      }
      this.currentAudio.removeAttribute('src');
      try { this.currentAudio.load(); } catch(e) { /* ignore load error on cleanup */ }
      this.currentAudio = null;
    } else {
        console.log(`${logPrefix} No currentAudio element to stop.`);
    }

    this.audioQueue.forEach(blob => {/* Blobs themselves don't need revokeObjectURL */});
    this.audioQueue = [];
    console.log(`${logPrefix} Audio queue cleared.`);

    this.isPlaying = false;
    this.isPaused = false;
    this.isProcessing = false;
    this.currentOriginalTextChunks = [];
    this.currentChunkIndex = -1;
    console.log(`${logPrefix} All internal states reset. isPlaying=${this.isPlaying}, isPaused=${this.isPaused}, isProcessing=${this.isProcessing}`);
  }


  private splitIntoChunks(text: string, maxChunkLength: number = 450): string[] { // Increased default
    const logPrefix = `[${this.serviceInstanceId} splitIntoChunks]`;
    if (!text || !text.trim()) {
        console.log(`${logPrefix} Input text is empty or whitespace.`);
        return [];
    }
    // Use your existing robust splitting logic
    const sentenceMatches = text.match(/[^.!?\n\r]+[.!?\n\r]*\s*/g);
    let chunks: string[] = [];
    if (sentenceMatches) {
      for (const sentence of sentenceMatches) {
        let trimmedSentence = sentence.trim();
        if(trimmedSentence.length === 0) continue;
        if (trimmedSentence.length <= maxChunkLength) {
          chunks.push(trimmedSentence);
        } else {
          const subChunks = this.breakLongChunk(trimmedSentence, maxChunkLength);
          chunks.push(...subChunks);
        }
      }
    } else {
      chunks = this.breakLongChunk(text.trim(), maxChunkLength);
    }
    const finalChunks = chunks.filter(chunk => chunk.length > 0);
    console.log(`${logPrefix} Produced ${finalChunks.length} final chunks. MaxChunkLength used: ${maxChunkLength}.`);
    if (finalChunks.length > 0) {
        // console.log(`${logPrefix} First chunk sample for splitting: "${finalChunks[0].substring(0,70)}..." (len: ${finalChunks[0].length})`);
    }
    return finalChunks;
  }

  private breakLongChunk(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let currentPosition = 0;
    while (currentPosition < text.length) {
        let endPosition = Math.min(currentPosition + maxLength, text.length);
        if (endPosition < text.length) {
            let lastSpace = text.lastIndexOf(' ', endPosition);
            if (lastSpace > currentPosition && lastSpace > currentPosition + (maxLength * 0.3)) { // Try to break at space if it's not too early
                endPosition = lastSpace;
            }
        }
        let chunkToAdd = text.substring(currentPosition, endPosition).trim();
        if(chunkToAdd) chunks.push(chunkToAdd);
        currentPosition = endPosition;
        while(currentPosition < text.length && text[currentPosition] === ' '){
            currentPosition++;
        }
    }
    return chunks.filter(chunk => chunk.length > 0);
  }

  private async generateAudioBlob(text: string, options: TTSOptions): Promise<Blob> {
    const logPrefix = `[${this.serviceInstanceId} generateAudioBlob]`;
    if (!this.abortController) { // Should be set by speakTextInChunks
        console.warn(`${logPrefix} AbortController is NULL. Creating new one. This is unexpected if called within a session.`);
        this.abortController = new AbortController();
    }
    const signal = this.abortController.signal;

    console.log(`${logPrefix} Requesting audio for text (len ${text.length}, start): "${text.substring(0,30)}..." from ${this.serverUrl}`);
    try {
      const response = await fetch(this.serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: options.voice || 'en-US-BrianMultilingualNeural',
          format: options.format || OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
          rate: options.rate,
          pitch: options.pitch
        }),
        signal: signal,
      });

      console.log(`${logPrefix} Response status for "${text.substring(0,30)}...": ${response.status}`);
      if (signal.aborted) {
        console.log(`${logPrefix} Fetch aborted for text: "${text.substring(0,30)}..."`);
        throw new DOMException('Request aborted by client.', 'AbortError');
      }
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Could not parse error response body");
        console.error(`${logPrefix} API Error (${response.status}) for "${text.substring(0,30)}...": ${errorText.substring(0, 200)}`);
        throw new Error(`TTS API Failed (${response.status}): ${errorText.substring(0,100)}`);
      }
      const blob = await response.blob();
      if (signal.aborted) { // Check again after blob() if it was a long operation
        console.log(`${logPrefix} Fetch aborted (after blob()) for text: "${text.substring(0,30)}..."`);
        throw new DOMException('Request aborted by client.', 'AbortError');
      }
      console.log(`${logPrefix} Blob received for "${text.substring(0,30)}...". Size: ${blob.size}`);
      if (blob.size < 100) { // Arbitrary small number, might indicate empty audio
          console.warn(`${logPrefix} Blob size is very small (${blob.size} bytes). Audio might be empty or invalid.`);
      }
      return blob;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Already logged by the signal check
      } else {
        console.error(`${logPrefix} Error in fetch/blob conversion for "${text.substring(0,30)}...":`, error);
      }
      throw error;
    }
  }

  // --- Legacy Methods ---
  async generateAudio(text: string, options: TTSOptions = {}): Promise<Blob> {
    console.warn(`%c[${this.serviceInstanceId}] generateAudio (DEPRECATED) called.`, "color: orange;");
    this.abortController = new AbortController();
    return this.generateAudioBlob(text, options);
  }

  async playAudio(audioBlob: Blob): Promise<void> {
     console.warn(`%c[${this.serviceInstanceId}] playAudio (DEPRECATED) called.`, "color: orange;");
     await this.stopAudio();
     this.isPlaying = true; this.isPaused = false; this.isProcessing = false;
     this.currentChunkIndex = 0; this.currentOriginalTextChunks = ["Legacy playAudio content"];

     return new Promise<void>((resolve, reject) => { /* ... same as before ... */
       const audio = new Audio(URL.createObjectURL(audioBlob));
       this.currentAudio = audio;
       console.log(`%c[${this.serviceInstanceId} playAudio (legacy)] Playing blob. Src: ${audio.src}`, "color: orange;");
       audio.onended = () => {
         console.log(`%c[${this.serviceInstanceId} playAudio (legacy)] onended.`, "color: orange;");
         if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
         this.stopAudio(); resolve();
       };
       audio.onerror = (errorEvent) => {
         const error = this.currentAudio?.error || errorEvent;
         console.error(`%c[${this.serviceInstanceId} playAudio (legacy)] onerror:`, "color: red;", error);
         if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
         this.stopAudio(); reject(error || new Error("Unknown audio playback error"));
       };
       audio.play().catch(err => {
         console.error(`%c[${this.serviceInstanceId} playAudio (legacy)] .play() promise rejected:`, "color: red;", err);
         if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
         this.stopAudio(); reject(err);
       });
     });
  }

  async streamAudio(text: string, options: TTSOptions = {}): Promise<void> {
     console.warn(`%c[${this.serviceInstanceId}] streamAudio (DEPRECATED) called. Redirecting to speakTextInChunks.`, "color: orange;");
     return this.speakTextInChunks(text, options);
  }
}

export default TTSService;