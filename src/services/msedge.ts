// // // // // import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// // // // // export interface TTSVoice {
// // // // //   name: string;
// // // // //   lang: string;
// // // // // }

// // // // // export class TTSService {
// // // // //   private static instance: TTSService;
// // // // //   private tts: MsEdgeTTS;
// // // // //   private voices: TTSVoice[] = [];

// // // // //   private constructor() {
// // // // //     this.tts = new MsEdgeTTS();
// // // // //     this.initVoices();
// // // // //   }

// // // // //   // Singleton pattern
// // // // //   public static getInstance(): TTSService {
// // // // //     if (!TTSService.instance) {
// // // // //       TTSService.instance = new TTSService();
// // // // //     }
// // // // //     return TTSService.instance;
// // // // //   }

// // // // //   // Initialize available voices
// // // // //   private async initVoices() {
// // // // //     try {
// // // // //       const availableVoices = await this.tts.getVoices();
// // // // //       this.voices = availableVoices.map(voice => ({
// // // // //         name: voice.ShortName,
// // // // //         lang: voice.Locale
// // // // //       }));
// // // // //     } catch (error) {
// // // // //       console.error('Failed to fetch voices:', error);
// // // // //       // Fallback voices
// // // // //       this.voices = [
// // // // //         { name: 'en-US-BrianMultilingualNeural', lang: 'en-US' },
// // // // //         { name: 'en-US-AriaMultilingualNeural', lang: 'en-US' }
// // // // //       ];
// // // // //     }
// // // // //   }

// // // // //   // Get available voices
// // // // //   public getVoices(): TTSVoice[] {
// // // // //     return this.voices;
// // // // //   }

// // // // //   // Generate audio from text
// // // // //   public async generateAudio(
// // // // //     text: string, 
// // // // //     options: { 
// // // // //       voice?: string, 
// // // // //       outputFormat?: OUTPUT_FORMAT 
// // // // //     } = {}
// // // // //   ): Promise<ArrayBuffer> {
// // // // //     // Use a default voice if not specified
// // // // //     const voiceName = options.voice || this.voices[0].name;
// // // // //     const outputFormat = options.outputFormat || OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS;

// // // // //     // Set metadata
// // // // //     await this.tts.setMetadata(voiceName, outputFormat);

// // // // //     // Collect audio chunks
// // // // //     return new Promise((resolve, reject) => {
// // // // //       const chunks: Uint8Array[] = [];

// // // // //       try {
// // // // //         const { audioStream } = this.tts.toStream(text);

// // // // //         audioStream.on('data', (chunk: Uint8Array) => {
// // // // //           chunks.push(chunk);
// // // // //         });

// // // // //         audioStream.on('end', () => {
// // // // //           // Combine chunks
// // // // //           const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
// // // // //           const combinedBuffer = new Uint8Array(totalLength);
// // // // //           let offset = 0;
// // // // //           chunks.forEach(chunk => {
// // // // //             combinedBuffer.set(chunk, offset);
// // // // //             offset += chunk.length;
// // // // //           });

// // // // //           resolve(combinedBuffer.buffer);
// // // // //         });

// // // // //         audioStream.on('error', (error: Error) => {
// // // // //           reject(error);
// // // // //         });
// // // // //       } catch (error) {
// // // // //         reject(error);
// // // // //       }
// // // // //     });
// // // // //   }

// // // // //   // Play audio directly
// // // // //   public async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
// // // // //     return new Promise((resolve, reject) => {
// // // // //       try {
// // // // //         const audioContext = new AudioContext();
        
// // // // //         audioContext.decodeAudioData(audioBuffer, (buffer) => {
// // // // //           const source = audioContext.createBufferSource();
// // // // //           source.buffer = buffer;
// // // // //           source.connect(audioContext.destination);
// // // // //           source.onended = () => resolve();
// // // // //           source.start(0);
// // // // //         }, (error) => {
// // // // //           reject(error);
// // // // //         });
// // // // //       } catch (error) {
// // // // //         reject(error);
// // // // //       }
// // // // //     });
// // // // //   }
// // // // // }


// // // // import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// // // // export interface TTSVoice {
// // // //   name: string;
// // // //   lang: string;
// // // // }

// // // // export class TTSService {
// // // //   private static instance: TTSService;
// // // //   private tts: MsEdgeTTS;
// // // //   private voices: TTSVoice[] = [
// // // //     { name: 'en-US-BrianMultilingualNeural', lang: 'en-US' }
// // // //   ];

// // // //   private constructor() {
// // // //     this.tts = new MsEdgeTTS();
// // // //     this.initVoices();
// // // //   }

// // // //   // Singleton pattern
// // // //   public static getInstance(): TTSService {
// // // //     if (!TTSService.instance) {
// // // //       TTSService.instance = new TTSService();
// // // //     }
// // // //     return TTSService.instance;
// // // //   }

// // // //   // Initialize available voices
// // // //   private async initVoices() {
// // // //     try {
// // // //       const availableVoices = await this.tts.getVoices();
// // // //       console.log('Available Voices:', availableVoices);
      
// // // //       // Prioritize 'en-US-BrianMultilingualNeural'
// // // //       const brianVoice = availableVoices.find(
// // // //         voice => voice.ShortName === 'en-US-BrianMultilingualNeural'
// // // //       );

// // // //       if (brianVoice) {
// // // //         this.voices = [{
// // // //           name: brianVoice.ShortName,
// // // //           lang: brianVoice.Locale
// // // //         }];
// // // //       }
// // // //     } catch (error) {
// // // //       console.error('Failed to fetch voices:', error);
// // // //     }
// // // //   }

// // // //   // Get available voices
// // // //   public getVoices(): TTSVoice[] {
// // // //     return this.voices;
// // // //   }

// // // //   // Generate audio from text
// // // //   public async generateAudio(
// // // //     text: string, 
// // // //     options: { 
// // // //       voice?: string, 
// // // //       outputFormat?: OUTPUT_FORMAT 
// // // //     } = {}
// // // //   ): Promise<ArrayBuffer> {
// // // //     // Always use 'en-US-BrianMultilingualNeural'
// // // //     const voiceName = 'en-US-BrianMultilingualNeural';
// // // //     const outputFormat = options.outputFormat || OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS;

// // // //     console.log('Generating Audio with:', {
// // // //       voiceName,
// // // //       outputFormat
// // // //     });

// // // //     // Set metadata with explicit locale
// // // //     try {
// // // //       await this.tts.setMetadata(
// // // //         voiceName, 
// // // //         outputFormat,
// // // //         { 
// // // //           voiceLocale: 'en-US' 
// // // //         }
// // // //       );
// // // //     } catch (metadataError) {
// // // //       console.error('Metadata Set Error:', metadataError);
// // // //       throw metadataError;
// // // //     }

// // // //     // Collect audio chunks
// // // //     return new Promise((resolve, reject) => {
// // // //       const chunks: Uint8Array[] = [];

// // // //       try {
// // // //         const { audioStream } = this.tts.toStream(text);

// // // //         audioStream.on('data', (chunk: Uint8Array) => {
// // // //           chunks.push(chunk);
// // // //         });

// // // //         audioStream.on('end', () => {
// // // //           // Combine chunks
// // // //           const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
// // // //           const combinedBuffer = new Uint8Array(totalLength);
// // // //           let offset = 0;
// // // //           chunks.forEach(chunk => {
// // // //             combinedBuffer.set(chunk, offset);
// // // //             offset += chunk.length;
// // // //           });

// // // //           resolve(combinedBuffer.buffer);
// // // //         });

// // // //         audioStream.on('error', (error: Error) => {
// // // //           reject(error);
// // // //         });
// // // //       } catch (streamError) {
// // // //         console.error('Stream Generation Error:', streamError);
// // // //         reject(streamError);
// // // //       }
// // // //     });
// // // //   }

// // // //   // Play audio directly
// // // //   public async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
// // // //     return new Promise((resolve, reject) => {
// // // //       try {
// // // //         const audioContext = new AudioContext();
        
// // // //         audioContext.decodeAudioData(audioBuffer, (buffer) => {
// // // //           const source = audioContext.createBufferSource();
// // // //           source.buffer = buffer;
// // // //           source.connect(audioContext.destination);
// // // //           source.onended = () => resolve();
// // // //           source.start(0);
// // // //         }, (error) => {
// // // //           reject(error);
// // // //         });
// // // //       } catch (error) {
// // // //         reject(error);
// // // //       }
// // // //     });
// // // //   }
// // // // }
// // // // src/services/msedge.ts
// // // export interface TTSOptions {
// // //     voice?: string;
// // //     format?: string;
// // //     rate?: number;
// // //     pitch?: string;
// // //   }
  
// // //   export class TTSService {
// // //     private static instance: TTSService;
// // //     private serverUrl: string;
// // //     private currentAudio: HTMLAudioElement | null = null;
  
// // //     private constructor() {
// // //       // The URL of your proxy server
// // //       this.serverUrl = import.meta.env.VITE_TTS_SERVER_URL || 'http://localhost:5000/api/tts';
// // //     }
  
// // //     public static getInstance(): TTSService {
// // //       if (!TTSService.instance) {
// // //         TTSService.instance = new TTSService();
// // //       }
// // //       return TTSService.instance;
// // //     }
  
// // //     async generateAudio(text: string, options: TTSOptions = {}): Promise<Blob> {
// // //       try {
// // //         console.log('Generating Audio with:', options);
  
// // //         // Make a request to our proxy server
// // //         const response = await fetch(this.serverUrl, {
// // //           method: 'POST',
// // //           headers: {
// // //             'Content-Type': 'application/json',
// // //           },
// // //           body: JSON.stringify({
// // //             text,
// // //             voice: options.voice || 'en-US-BrianMultilingualNeural',
// // //             format: options.format || 'webm-24khz-16bit-mono-opus',
// // //             rate: options.rate,
// // //             pitch: options.pitch
// // //           }),
// // //         });
  
// // //         if (!response.ok) {
// // //           const errorData = await response.json();
// // //           throw new Error(errorData.error || 'Failed to generate audio');
// // //         }
  
// // //         // Get the audio blob from the response
// // //         return await response.blob();
// // //       } catch (error) {
// // //         console.error('Error generating audio:', error);
// // //         throw error;
// // //       }
// // //     }
  
// // //     async playAudio(audioBlob: Blob): Promise<void> {
// // //       // Stop any currently playing audio
// // //       this.stopAudio();
  
// // //       // Create a URL for the audio blob
// // //       const audioUrl = URL.createObjectURL(audioBlob);
      
// // //       // Create a new audio element
// // //       const audio = new Audio(audioUrl);
// // //       this.currentAudio = audio;
      
// // //       // Set up event listeners
// // //       return new Promise<void>((resolve, reject) => {
// // //         audio.onended = () => {
// // //           this.cleanupAudio();
// // //           resolve();
// // //         };
        
// // //         audio.onerror = (error) => {
// // //           this.cleanupAudio();
// // //           reject(error);
// // //         };
        
// // //         // Play the audio
// // //         audio.play().catch(err => {
// // //           this.cleanupAudio();
// // //           reject(err);
// // //         });
// // //       });
// // //     }
  
// // //     stopAudio(): void {
// // //       if (this.currentAudio) {
// // //         this.currentAudio.pause();
// // //         this.cleanupAudio();
// // //       }
// // //     }
  
// // //     private cleanupAudio(): void {
// // //       if (this.currentAudio) {
// // //         // Revoke the object URL to free up memory
// // //         URL.revokeObjectURL(this.currentAudio.src);
// // //         this.currentAudio = null;
// // //       }
// // //     }
// // //   }
  
// // //   export default TTSService;
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
// //   private isPlaying: boolean = false;
// //   private isProcessing: boolean = false;
// //   private abortController: AbortController | null = null;

// //   private constructor() {
// //     // The URL of your proxy server
// //     this.serverUrl = import.meta.env.VITE_TTS_SERVER_URL || 'http://localhost:5100/api/tts';
// //   }

// //   public static getInstance(): TTSService {
// //     if (!TTSService.instance) {
// //       TTSService.instance = new TTSService();
// //     }
// //     return TTSService.instance;
// //   }

// //   /**
// //    * Break text into chunks and process them sequentially
// //    */
// //   async speakTextInChunks(text: string, options: TTSOptions = {}): Promise<void> {
// //     try {
// //       // Stop any current playback
// //       this.stopAudio();
      
// //       // Create a new abort controller for this session
// //       this.abortController = new AbortController();
      
// //       // Split the text into sentences
// //       const chunks = this.splitIntoChunks(text);
// //       console.log(`Text split into ${chunks.length} chunks`);
      
// //       // Process the first chunk immediately to start playback quickly
// //       if (chunks.length > 0) {
// //         this.isPlaying = true;
// //         this.isProcessing = true;
        
// //         // Generate audio for the first chunk
// //         const firstChunkBlob = await this.generateAudioBlob(chunks[0], options);
        
// //         // Start playing the first chunk
// //         const firstAudio = new Audio(URL.createObjectURL(firstChunkBlob));
// //         this.currentAudio = firstAudio;
        
// //         // Set up event listener for when the first chunk ends
// //         firstAudio.onended = () => {
// //           // Clean up the first audio element
// //           if (firstAudio.src.startsWith('blob:')) {
// //             URL.revokeObjectURL(firstAudio.src);
// //           }
          
// //           // Start processing the queue if we have more chunks
// //           if (this.audioQueue.length > 0 && this.isPlaying) {
// //             this.playNextChunk();
// //           } else {
// //             // If no more chunks, we're done
// //             this.isPlaying = false;
// //             this.isProcessing = false;
// //             this.currentAudio = null;
// //           }
// //         };
        
// //         // Process the remaining chunks in the background while the first chunk plays
// //         // We need to wait slightly to ensure the first chunk starts playing first
// //         firstAudio.play().then(() => {
// //           // Start processing remaining chunks after a short delay
// //           setTimeout(() => {
// //             this.processRemainingChunks(chunks.slice(1), options);
// //           }, 500);
// //         });
// //       }
// //     } catch (error) {
// //       console.error('Error in chunked TTS:', error);
// //       this.isPlaying = false;
// //       this.isProcessing = false;
// //       throw error;
// //     }
// //   }

// //   /**
// //    * Process the remaining chunks and add them to the queue
// //    */
// //   private async processRemainingChunks(chunks: string[], options: TTSOptions): Promise<void> {
// //     try {
// //       // Process each chunk and add to the queue
// //       for (let i = 0; i < chunks.length; i++) {
// //         // Check if playback was stopped
// //         if (!this.isPlaying || this.abortController?.signal.aborted) {
// //           break;
// //         }
        
// //         // Generate audio for this chunk
// //         const blob = await this.generateAudioBlob(chunks[i], options);
// //         this.audioQueue.push(blob);
        
// //         // If this is the first chunk in queue and nothing is playing, start playback
// //         if (i === 0 && !this.currentAudio) {
// //           this.playNextChunk();
// //         }
// //       }
// //     } catch (error) {
// //       console.error('Error processing chunks:', error);
// //       // Continue playback with what we have
// //     } finally {
// //       this.isProcessing = false;
// //     }
// //   }

// //   /**
// //    * Play the next chunk from the queue
// //    */
// //   private playNextChunk(): void {
// //     if (this.audioQueue.length === 0 || !this.isPlaying) {
// //       this.isPlaying = false;
// //       this.currentAudio = null;
// //       return;
// //     }
    
// //     // Get the next chunk from the queue
// //     const nextBlob = this.audioQueue.shift();
// //     if (!nextBlob) return;
    
// //     // Create audio for this chunk
// //     const audio = new Audio(URL.createObjectURL(nextBlob));
// //     this.currentAudio = audio;
    
// //     // When this chunk ends, play the next one
// //     audio.onended = () => {
// //       // Clean up this audio element
// //       if (audio.src.startsWith('blob:')) {
// //         URL.revokeObjectURL(audio.src);
// //       }
      
// //       // Play the next chunk if available and still playing
// //       if (this.audioQueue.length > 0 && this.isPlaying) {
// //         this.playNextChunk();
// //       } else {
// //         // If no more chunks, we're done
// //         this.isPlaying = false;
// //         this.currentAudio = null;
// //       }
// //     };
    
// //     // Play this chunk
// //     audio.play().catch(error => {
// //       console.error('Error playing audio chunk:', error);
// //       this.playNextChunk(); // Try the next chunk if this one fails
// //     });
// //   }

// //   /**
// //    * Split text into reasonable chunks (sentences where possible)
// //    */
// //   private splitIntoChunks(text: string, maxChunkLength: number = 200): string[] {
// //     if (!text) return [];
    
// //     // First try to split on sentence endings
// //     const sentenceMatches = text.match(/[^.!?]+[.!?]+/g);
    
// //     if (sentenceMatches) {
// //       const sentences = sentenceMatches.map(s => s.trim());
      
// //       // If sentences are too long, further break them down
// //       const chunks: string[] = [];
// //       for (const sentence of sentences) {
// //         if (sentence.length <= maxChunkLength) {
// //           chunks.push(sentence);
// //         } else {
// //           // Break long sentences at commas, or other natural breaks
// //           const subChunks = this.breakLongChunk(sentence, maxChunkLength);
// //           chunks.push(...subChunks);
// //         }
// //       }
// //       return chunks;
// //     }
    
// //     // If no sentence endings found, split by a fixed length
// //     return this.breakLongChunk(text, maxChunkLength);
// //   }

// //   /**
// //    * Break a long chunk of text into smaller chunks
// //    */
// //   private breakLongChunk(text: string, maxLength: number): string[] {
// //     const chunks: string[] = [];
    
// //     // Try to break at commas or other natural pauses
// //     const subMatches = text.match(/[^,;:]+[,;:]+/g);
    
// //     if (subMatches) {
// //       let currentChunk = '';
      
// //       for (const part of subMatches) {
// //         if ((currentChunk + part).length <= maxLength) {
// //           currentChunk += part;
// //         } else {
// //           if (currentChunk) chunks.push(currentChunk.trim());
// //           currentChunk = part;
// //         }
// //       }
      
// //       if (currentChunk) chunks.push(currentChunk.trim());
// //     } else {
// //       // If no natural breaks, split by word boundaries
// //       let words = text.split(' ');
// //       let currentChunk = '';
      
// //       for (const word of words) {
// //         if ((currentChunk + ' ' + word).length <= maxLength) {
// //           currentChunk += (currentChunk ? ' ' : '') + word;
// //         } else {
// //           if (currentChunk) chunks.push(currentChunk);
// //           currentChunk = word;
// //         }
// //       }
      
// //       if (currentChunk) chunks.push(currentChunk);
// //     }
    
// //     return chunks;
// //   }

// //   /**
// //    * Generate audio blob for a text chunk
// //    */
// //   private async generateAudioBlob(text: string, options: TTSOptions): Promise<Blob> {
// //     try {
// //       // Make a request to our proxy server
// //       const response = await fetch(this.serverUrl, {
// //         method: 'POST',
// //         headers: {
// //           'Content-Type': 'application/json',
// //         },
// //         body: JSON.stringify({
// //           text,
// //           voice: options.voice || 'en-US-BrianMultilingualNeural',
// //           format: options.format || 'audio-24khz-48kbitrate-mono-mp3',
// //           rate: options.rate,
// //           pitch: options.pitch
// //         }),
// //         signal: this.abortController?.signal,
// //       });

// //       if (!response.ok) {
// //         throw new Error(`Failed to generate audio: ${response.status}`);
// //       }

// //       // Get the audio blob from the response
// //       return await response.blob();
// //     } catch (error) {
// //       if ((error as Error).name === 'AbortError') {
// //         console.log('Audio generation aborted');
// //       } else {
// //         console.error('Error generating audio blob:', error);
// //       }
// //       throw error;
// //     }
// //   }

// //   /**
// //    * Check if audio is currently playing
// //    */
// //   isCurrentlyPlaying(): boolean {
// //     return this.isPlaying;
// //   }

// //   /**
// //    * Check if currently processing chunks
// //    */
// //   isCurrentlyProcessing(): boolean {
// //     return this.isProcessing;
// //   }

// //   /**
// //    * Stop any currently playing audio and clear the queue
// //    */
// //   stopAudio(): void {
// //     // Abort any ongoing fetch requests
// //     if (this.abortController) {
// //       this.abortController.abort();
// //       this.abortController = null;
// //     }
    
// //     // Stop current audio
// //     if (this.currentAudio) {
// //       this.currentAudio.pause();
// //       if (this.currentAudio.src.startsWith('blob:')) {
// //         URL.revokeObjectURL(this.currentAudio.src);
// //       }
// //       this.currentAudio = null;
// //     }
    
// //     // Clear the queue
// //     for (const blob of this.audioQueue) {
// //       // No need to revoke blobs in queue as they haven't been turned into URLs yet
// //     }
// //     this.audioQueue = [];
    
// //     this.isPlaying = false;
// //   }

// //   // Legacy methods for backward compatibility
// //   async generateAudio(text: string, options: TTSOptions = {}): Promise<Blob> {
// //     return this.generateAudioBlob(text, options);
// //   }

// //   async playAudio(audioBlob: Blob): Promise<void> {
// //     // Stop any current playback
// //     this.stopAudio();
// //     this.isPlaying = true;
    
// //     return new Promise<void>((resolve, reject) => {
// //       const audio = new Audio(URL.createObjectURL(audioBlob));
// //       this.currentAudio = audio;
      
// //       audio.onended = () => {
// //         if (audio.src.startsWith('blob:')) {
// //           URL.revokeObjectURL(audio.src);
// //         }
// //         this.currentAudio = null;
// //         this.isPlaying = false;
// //         resolve();
// //       };
      
// //       audio.onerror = (error) => {
// //         if (audio.src.startsWith('blob:')) {
// //           URL.revokeObjectURL(audio.src);
// //         }
// //         this.currentAudio = null;
// //         this.isPlaying = false;
// //         reject(error);
// //       };
      
// //       audio.play().catch(err => {
// //         if (audio.src.startsWith('blob:')) {
// //           URL.revokeObjectURL(audio.src);
// //         }
// //         this.currentAudio = null;
// //         this.isPlaying = false;
// //         reject(err);
// //       });
// //     });
// //   }

// //   async streamAudio(text: string, options: TTSOptions = {}): Promise<void> {
// //     return this.speakTextInChunks(text, options);
// //   }
// // }

// // export default TTSService;


// // src/services/msedge.ts
// export interface TTSOptions {
//   voice?: string;
//   format?: string;
//   rate?: number;
//   pitch?: string;
// }

// export class TTSService {
//   private static instance: TTSService;
//   private serverUrl: string;
//   private currentAudio: HTMLAudioElement | null = null;
//   private audioQueue: Blob[] = [];
//   private isPlaying: boolean = false;
//   private isProcessing: boolean = false;
//   private isPaused: boolean = false; // <-- Added paused state
//   private abortController: AbortController | null = null;

//   private constructor() {
//     this.serverUrl = import.meta.env.VITE_TTS_SERVER_URL || 'http://localhost:5100/api/tts';
//   }

//   public static getInstance(): TTSService {
//     if (!TTSService.instance) {
//       TTSService.instance = new TTSService();
//     }
//     return TTSService.instance;
//   }

//   async speakTextInChunks(text: string, options: TTSOptions = {}): Promise<void> {
//     this.isPaused = false; // <-- Reset paused state on new request
//     try {
//       this.stopAudio(); // This already resets isPlaying and isPaused
//       this.abortController = new AbortController();
//       const chunks = this.splitIntoChunks(text);
//       console.log(`Text split into ${chunks.length} chunks`);

//       if (chunks.length > 0) {
//         this.isPlaying = true; // Set isPlaying to true when starting
//         this.isProcessing = true;
//         this.isPaused = false; // Ensure not paused when starting

//         const firstChunkBlob = await this.generateAudioBlob(chunks[0], options);
//         const firstAudio = new Audio(URL.createObjectURL(firstChunkBlob));
//         this.currentAudio = firstAudio;

//         firstAudio.onended = () => {
//           if (firstAudio.src.startsWith('blob:')) {
//             URL.revokeObjectURL(firstAudio.src);
//           }
//           // No need to set currentAudio = null here, playNextChunk handles it
//           if (this.audioQueue.length > 0 && this.isPlaying && !this.isPaused) { // Check isPaused
//             this.playNextChunk();
//           } else if (!this.isPaused) { // If not paused and queue is empty
//             this.isPlaying = false;
//             this.isProcessing = false;
//             this.currentAudio = null;
//           }
//           // If paused, do nothing onended, wait for resume
//         };

//         firstAudio.play().then(() => {
//           // Successfully started playing the first chunk
//           setTimeout(() => {
//             this.processRemainingChunks(chunks.slice(1), options);
//           }, 500); // Process rest after a small delay
//         }).catch(error => {
//            console.error("Error playing first chunk:", error);
//            this.stopAudio(); // Clean up if first play fails
//         });
//       } else {
//         // No chunks, ensure state is clean
//         this.stopAudio();
//       }
//     } catch (error) {
//       console.error('Error in chunked TTS:', error);
//       this.stopAudio(); // Ensure cleanup on error
//       throw error; // Re-throw the error
//     }
//   }

//   private async processRemainingChunks(chunks: string[], options: TTSOptions): Promise<void> {
//     try {
//       for (let i = 0; i < chunks.length; i++) {
//         // Check if playback was stopped or paused or aborted
//         if (!this.isPlaying || this.isPaused || this.abortController?.signal.aborted) {
//           console.log('Processing remaining chunks stopped or paused.');
//           break;
//         }

//         const blob = await this.generateAudioBlob(chunks[i], options);
//         // Only push if still playing and not aborted/paused during generation
//         if (this.isPlaying && !this.isPaused && !this.abortController?.signal.aborted) {
//           this.audioQueue.push(blob);
//         } else {
//            console.log('Discarding generated chunk due to stop/pause/abort.');
//            break; // Stop processing further chunks
//         }

//         // This check is likely redundant now, playNextChunk handles queue processing
//         // if (i === 0 && !this.currentAudio && !this.isPaused) {
//         //   this.playNextChunk();
//         // }
//       }
//     } catch (error) {
//       console.error('Error processing chunks:', error);
//       // Don't stop playback here necessarily, let existing audio finish
//     } finally {
//        // Set processing to false only when *all* intended chunks are done or stopped
//       if (!this.abortController?.signal.aborted) {
//           this.isProcessing = false;
//       }
//     }
//   }

//   private playNextChunk(): void {
//     // Exit if paused, stopped, or queue empty
//     if (this.isPaused || !this.isPlaying || this.audioQueue.length === 0) {
//       if (!this.isPaused && this.audioQueue.length === 0 && !this.currentAudio?.paused && this.currentAudio?.ended) {
//         // If naturally finished last chunk and not paused
//         this.isPlaying = false;
//         this.currentAudio = null;
//       }
//       return;
//     }

//     const nextBlob = this.audioQueue.shift();
//     if (!nextBlob) {
//         // Should not happen if length check passed, but good safety
//         this.isPlaying = false;
//         this.currentAudio = null;
//         return;
//     }

//     const audio = new Audio(URL.createObjectURL(nextBlob));
//     this.currentAudio = audio;

//     audio.onended = () => {
//       if (audio.src.startsWith('blob:')) {
//         URL.revokeObjectURL(audio.src);
//       }
//        // Check again if still playing and not paused before playing next
//       if (this.isPlaying && !this.isPaused && this.audioQueue.length > 0) {
//         this.playNextChunk();
//       } else if (!this.isPaused) { // If queue is empty and not paused, we're done
//         this.isPlaying = false;
//         this.currentAudio = null;
//       }
//        // If paused, do nothing onended, wait for resume
//     };

//     audio.play().catch(error => {
//       console.error('Error playing audio chunk:', error);
//       // Clean up failed audio element's URL
//       if (audio.src.startsWith('blob:')) {
//          URL.revokeObjectURL(audio.src);
//       }
//       // Attempt to play the next one if still playing and not paused
//       if (this.isPlaying && !this.isPaused) {
//           this.playNextChunk();
//       } else {
//           this.stopAudio(); // Stop if error occurs during paused state or already stopped
//       }
//     });
//   }

//   // --- Pause/Resume Methods ---

//   public pauseAudio(): void {
//     if (this.currentAudio && !this.currentAudio.paused && this.isPlaying) {
//       this.currentAudio.pause();
//       this.isPaused = true;
//       // Note: isPlaying remains true because the *session* is active
//       console.log('Audio paused at position:', this.currentAudio.currentTime);
//     }
//   }

//   public resumeAudio(): void {
//     if (this.currentAudio && this.currentAudio.paused && this.isPlaying) {
//       this.isPaused = false; // Set paused to false *before* playing
//       this.currentAudio.play().then(() => {
//         if (this.currentAudio) {
//           console.log('Audio resumed from position:', this.currentAudio.currentTime);
//         }
//       }).catch(error => {
//         console.error("Error resuming audio:", error);
//         this.stopAudio(); // Stop if resume fails
//       });
//     } else if (!this.currentAudio && this.isPlaying && this.isPaused && this.audioQueue.length > 0) {
//       // Case: Paused between chunks (currentAudio is null, but queue has items)
//       console.log('Resuming by playing next chunk from queue.');
//       this.isPaused = false;
//       this.playNextChunk();
//     }
//   }

//   // --- State Check Methods ---

//   public isCurrentlyPlaying(): boolean {
//     // Returns true only if actively playing (not paused)
//     return this.isPlaying && !this.isPaused;
//   }

//   public isCurrentlyPaused(): boolean {
//     return this.isPaused;
//   }

//   // Added: check if TTS session is active (either playing or paused)
//   public isSessionActive(): boolean {
//     // Implement the logic to determine if a session is active
//     return this.isCurrentlyPlaying() || this.isCurrentlyPaused();
//   }

//   public isCurrentlyProcessing(): boolean {
//     return this.isProcessing;
//   }

//   // --- Stop Method ---

//   public stopAudio(): void {
//     if (this.abortController) {
//       this.abortController.abort();
//       this.abortController = null;
//     }

//     if (this.currentAudio) {
//       this.currentAudio.pause(); // Ensure it's stopped
//       if (this.currentAudio.src.startsWith('blob:')) {
//         URL.revokeObjectURL(this.currentAudio.src);
//       }
//       this.currentAudio = null;
//     }

//     // Clear the queue (no need to revoke URLs for queue items)
//     this.audioQueue = [];

//     // Reset all states
//     this.isPlaying = false;
//     this.isPaused = false; // <-- Reset paused state on stop
//     this.isProcessing = false; // Stop processing too
//      console.log("Audio stopped and queue cleared.");
//   }

//   // --- Utility Methods (Unchanged) ---
//   private splitIntoChunks(text: string, maxChunkLength: number = 200): string[] {
//     if (!text) return [];
//     const sentenceMatches = text.match(/[^.!?]+[.!?]+/g);
//     if (sentenceMatches) {
//       const sentences = sentenceMatches.map(s => s.trim());
//       const chunks: string[] = [];
//       for (const sentence of sentences) {
//         if (sentence.length <= maxChunkLength) {
//           chunks.push(sentence);
//         } else {
//           const subChunks = this.breakLongChunk(sentence, maxChunkLength);
//           chunks.push(...subChunks);
//         }
//       }
//       return chunks.filter(chunk => chunk.length > 0); // Ensure no empty chunks
//     }
//     return this.breakLongChunk(text, maxChunkLength).filter(chunk => chunk.length > 0);
//   }

//   private breakLongChunk(text: string, maxLength: number): string[] {
//      // Simplified break logic - adjust if needed
//      const chunks: string[] = [];
//      let currentPosition = 0;
//      while (currentPosition < text.length) {
//          let endPosition = Math.min(currentPosition + maxLength, text.length);
//          // Try to find a space near the end to break nicely
//          if (endPosition < text.length) {
//              let lastSpace = text.lastIndexOf(' ', endPosition);
//              if (lastSpace > currentPosition) {
//                  endPosition = lastSpace;
//              }
//          }
//          chunks.push(text.substring(currentPosition, endPosition).trim());
//          currentPosition = endPosition;
//      }
//      return chunks.filter(chunk => chunk.length > 0);
//   }

//   private async generateAudioBlob(text: string, options: TTSOptions): Promise<Blob> {
//     try {
//       const response = await fetch(this.serverUrl, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json', },
//         body: JSON.stringify({
//           text,
//           voice: options.voice || 'en-US-BrianMultilingualNeural',
//           format: options.format || 'audio-24khz-48kbitrate-mono-mp3',
//           rate: options.rate,
//           pitch: options.pitch
//         }),
//         signal: this.abortController?.signal,
//       });

//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(`Failed to generate audio (${response.status}): ${errorText}`);
//       }
//       return await response.blob();
//     } catch (error) {
//       if ((error as Error).name === 'AbortError') {
//         console.log('Audio generation aborted');
//       } else {
//         console.error('Error generating audio blob:', error);
//       }
//       throw error;
//     }
//   }

//   // --- Legacy Methods (Keep if needed, but recommend phasing out) ---
//   async generateAudio(text: string, options: TTSOptions = {}): Promise<Blob> {
//     console.warn("generateAudio is deprecated, use speakTextInChunks");
//     return this.generateAudioBlob(text, options);
//   }

//   async playAudio(audioBlob: Blob): Promise<void> {
//      console.warn("playAudio is deprecated, use speakTextInChunks");
//      this.stopAudio();
//      this.isPlaying = true; // Session is active
//      this.isPaused = false;
//      this.isProcessing = false;

//      return new Promise<void>((resolve, reject) => {
//        const audio = new Audio(URL.createObjectURL(audioBlob));
//        this.currentAudio = audio;
//        audio.onended = () => {
//          if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
//          this.currentAudio = null;
//          this.isPlaying = false;
//          resolve();
//        };
//        audio.onerror = (error) => {
//          if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
//          this.currentAudio = null;
//          this.isPlaying = false;
//          reject(error);
//        };
//        audio.play().catch(err => {
//          if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
//          this.currentAudio = null;
//          this.isPlaying = false;
//          reject(err);
//        });
//      });
//   }

//   async streamAudio(text: string, options: TTSOptions = {}): Promise<void> {
//      console.warn("streamAudio is deprecated, use speakTextInChunks");
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

export class TTSService {
  private static instance: TTSService;
  private serverUrl: string;
  private currentAudio: HTMLAudioElement | null = null;
  private audioQueue: Blob[] = [];
  private isPlaying: boolean = false; // Session active (playing or paused)
  private isProcessing: boolean = false; // Actively fetching audio
  private isPaused: boolean = false; // Separate state for pause
  private abortController: AbortController | null = null;

  // --- NEW: Minimal State for Tracking ---
  private currentOriginalTextChunks: string[] = []; // Store the chunks generated for the current text
  private currentChunkIndex: number = -1; // Index of the chunk currently playing or just finished (-1 if inactive)
  // --- End New Tracking State ---

  // private constructor() {
  //   this.serverUrl = import.meta.env.VITE_TTS_SERVER_URL || 'http://localhost:5100/api/tts';
  // }

  private constructor() {
    // Use the environment variable if provided during build,
    // otherwise default to a relative path '/api/tts'.
    this.serverUrl = import.meta.env.VITE_TTS_SERVER_URL || '/api/tts';
  }

  public static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  /**
   * Starts speaking text.
   * @param text The text to speak (can be full page or substring).
   * @param options TTS voice/format options.
   */
  async speakTextInChunks(text: string, options: TTSOptions = {}): Promise<void> {
    console.log("speakTextInChunks called.");
    // Reset state including pause and tracking
    try {
      this.stopAudio(); // Clears state, including tracking

      // --- NEW: Generate and store chunks for tracking ---
      this.currentOriginalTextChunks = this.splitIntoChunks(text);
      if (!this.currentOriginalTextChunks || this.currentOriginalTextChunks.length === 0) {
        console.warn("No text chunks generated to speak.");
        this.stopAudio(); // Ensure clean state
        return;
      }
      // --- End New ---

      // Start playback state
      this.isPlaying = true;
      this.isProcessing = true;
      this.isPaused = false;
      this.abortController = new AbortController();

      const firstChunkText = this.currentOriginalTextChunks[0];
      const firstChunkBlob = await this.generateAudioBlob(firstChunkText, options);

      // --- NEW: Mark first chunk as about to play ---
      this.currentChunkIndex = 0;
      // --- End New ---

      const firstAudio = new Audio(URL.createObjectURL(firstChunkBlob));
      this.currentAudio = firstAudio;

      firstAudio.onended = () => {
        if (firstAudio.src.startsWith('blob:')) URL.revokeObjectURL(firstAudio.src);
        if (this.isPlaying && !this.isPaused) {
          // Attempt to play the next chunk (will check queue and update index)
          this.playNextChunk(options);
        } else if (!this.isPaused) {
          // If finished naturally (not paused)
          this.stopAudio();
        }
        // If paused, do nothing here - wait for resume
      };

      firstAudio.play().then(() => {
        // Successfully started playing the first chunk
        console.log("First chunk playing...");
        // Start processing remaining chunks immediately (from index 1)
        this.processRemainingChunks(options);
      }).catch(error => {
         console.error("Error playing first chunk:", error);
         this.stopAudio(); // Clean up if first play fails
      });

    } catch (error) {
      console.error('Error in chunked TTS:', error);
      this.stopAudio(); // Ensure cleanup on error
      throw error; // Re-throw the error
    }
  }

  /**
   * Processes remaining chunks (index 1 onwards) and adds them to the queue.
   */
  private async processRemainingChunks(options: TTSOptions): Promise<void> {
    try {
      // Start from the second chunk (index 1)
      for (let i = 1; i < this.currentOriginalTextChunks.length; i++) {
        if (!this.isPlaying || this.isPaused || this.abortController?.signal.aborted) {
          console.log('Processing remaining chunks stopped or paused.');
          break;
        }

        const chunkText = this.currentOriginalTextChunks[i];
        const blob = await this.generateAudioBlob(chunkText, options);

        // Only push if still playing and not aborted/paused during generation
        if (this.isPlaying && !this.isPaused && !this.abortController?.signal.aborted) {
          this.audioQueue.push(blob);
        } else {
           console.log('Discarding generated chunk due to stop/pause/abort.');
           break; // Stop processing further chunks
        }
      }
    } catch (error) {
      console.error('Error processing chunks:', error);
      // Don't stop playback here necessarily, let existing audio finish
    } finally {
      // Set processing to false only when this background fetching loop is done
      if (this.isProcessing && !this.abortController?.signal.aborted) {
          this.isProcessing = false;
          console.log("Finished generating/queueing all chunks.");
      }
    }
  }

  /**
   * Plays the next chunk from the queue. Updates tracking index.
   */
  private playNextChunk(options: TTSOptions): void {
    // Calculate the index of the *next* chunk to play
    const nextChunkIndexToPlay = this.currentChunkIndex + 1;

    // Exit conditions: paused, stopped, queue empty, or no more chunks exist
    if (this.isPaused || !this.isPlaying || this.audioQueue.length === 0 || nextChunkIndexToPlay >= this.currentOriginalTextChunks.length) {
      // Check if it naturally finished the last chunk
      if (!this.isPaused && this.isPlaying && this.audioQueue.length === 0 && nextChunkIndexToPlay >= this.currentOriginalTextChunks.length) {
          console.log("Finished playing all chunks naturally.");
          this.stopAudio();
      } else {
          // console.log("playNextChunk: Conditions not met (paused, stopped, queue empty, or index out of bounds).");
      }
      return;
    }

    const nextBlob = this.audioQueue.shift();
    if (!nextBlob) {
      console.error("playNextChunk: Queue claimed non-empty but shift failed.");
      this.stopAudio();
      return;
    }

    // --- NEW: Update index to the chunk we are about to play ---
    this.currentChunkIndex = nextChunkIndexToPlay;
    console.log(`Playing next chunk, index: ${this.currentChunkIndex}`);
    // --- End New ---

    const audio = new Audio(URL.createObjectURL(nextBlob));
    this.currentAudio = audio;

    audio.onended = () => {
      if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
      if (this.isPlaying && !this.isPaused) {
        // Recursively call to play the one after the index that just finished
        this.playNextChunk(options);
      } else if (!this.isPaused) {
        // If stopped during playback or finished last chunk and was stopped
        this.stopAudio();
      }
      // If paused, do nothing - wait for resume
    };

    audio.play().catch(error => {
      console.error(`Error playing audio chunk index ${this.currentChunkIndex}:`, error);
      if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
      // If an error occurs, stop playback for stability.
      this.stopAudio();
    });
  }

  // --- Pause/Resume Methods (Largely Unchanged) ---
  public pauseAudio(): void {
    if (this.currentAudio && !this.currentAudio.paused && this.isPlaying) {
      this.currentAudio.pause();
      this.isPaused = true;
      console.log(`Audio paused. Current chunk index: ${this.currentChunkIndex}. Approx char index: ${this.getCurrentPlaybackStartIndex()}`);
    }
  }

  public resumeAudio(): void {
    // Simple resume: just play the current audio element if it exists and was paused.
    if (this.currentAudio && this.currentAudio.paused && this.isPlaying) {
      this.isPaused = false;
      this.currentAudio.play().then(() => {
        console.log(`Audio resumed. Current chunk index: ${this.currentChunkIndex}`);
      }).catch(error => {
        console.error("Error resuming audio:", error);
        this.stopAudio(); // Stop if resume fails
      });
    } else if (this.isPaused && this.isPlaying) {
        // If paused between chunks (this.currentAudio is null or finished)
        console.warn("Attempting to resume between chunks. May require user to click Resume Reading again.");
        // For simplicity, stop. The UI showing "Resume Reading" will allow restarting from saved index.
        this.isPaused = false; // Allow interval check to see session is no longer active
        this.stopAudio();

    }
  }

  // --- NEW: Method to get current playback start index ---
  /**
   * Calculates the starting character index in the original text based on
   * the chunks played *before* the current chunk.
   * Returns -1 if playback is not active or index is unavailable.
   */
  public getCurrentPlaybackStartIndex(): number {
    // Can only calculate if we have chunks and a valid current index
    if (!this.isPlaying || this.currentChunkIndex < 0 || !this.currentOriginalTextChunks || this.currentOriginalTextChunks.length === 0) {
      return -1;
    }

    // Ensure index doesn't go beyond bounds if called exactly on finish
    const validIndex = Math.min(this.currentChunkIndex, this.currentOriginalTextChunks.length);

    // Sum the lengths of all chunks *before* the current one
    let characterIndex = 0;
    for (let i = 0; i < validIndex; i++) {
      characterIndex += this.currentOriginalTextChunks[i]?.length || 0;
      // NOTE: This assumes no extra characters (like spaces) were added/lost during chunking.
      // If your splitIntoChunks logic adds/removes characters, this calculation needs adjustment.
    }
    return characterIndex;
  }
  // --- End New ---


  // --- State Check Methods (Unchanged logic) ---
  public isCurrentlyPlaying(): boolean { return this.isPlaying && !this.isPaused; }
  public isCurrentlyPaused(): boolean { return this.isPaused; }
  public isSessionActive(): boolean { return this.isPlaying; } // Session is active if playing or paused
  public isCurrentlyProcessing(): boolean { return this.isProcessing; }

  // --- Stop Method ---
  public stopAudio(): void {
    // console.log("stopAudio called.");
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      if (this.currentAudio.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.currentAudio.src);
      }
      this.currentAudio = null;
    }
    this.audioQueue = [];
    this.isPlaying = false;
    this.isPaused = false;
    this.isProcessing = false;

    // --- NEW: Reset tracking state ---
    this.currentOriginalTextChunks = [];
    this.currentChunkIndex = -1;
    // --- End New ---

    // console.log("Audio stopped and state reset."); // Optional: for debugging
  }

  // --- Utility Methods (Ensure these are implemented correctly) ---
  private splitIntoChunks(text: string, maxChunkLength: number = 200): string[] {
    // --- PASTE YOUR ACTUAL splitIntoChunks IMPLEMENTATION HERE ---
    if (!text) return [];
    const sentenceMatches = text.match(/[^.!?]+[.!?]+/g);
    if (sentenceMatches) {
      const sentences = sentenceMatches.map(s => s.trim());
      const chunks: string[] = [];
      for (const sentence of sentences) {
        if (sentence.length <= maxChunkLength) {
          chunks.push(sentence);
        } else {
          const subChunks = this.breakLongChunk(sentence, maxChunkLength);
          chunks.push(...subChunks);
        }
      }
      return chunks.filter(chunk => chunk.length > 0);
    }
    return this.breakLongChunk(text, maxChunkLength).filter(chunk => chunk.length > 0);
  }

  private breakLongChunk(text: string, maxLength: number): string[] {
    // --- PASTE YOUR ACTUAL breakLongChunk IMPLEMENTATION HERE ---
    const chunks: string[] = [];
     let currentPosition = 0;
     while (currentPosition < text.length) {
         let endPosition = Math.min(currentPosition + maxLength, text.length);
         if (endPosition < text.length) {
             let lastSpace = text.lastIndexOf(' ', endPosition);
             if (lastSpace > currentPosition + Math.min(maxLength / 2, 50)) { // Avoid breaking too early
                 endPosition = lastSpace + 1; // Include space for next chunk start
             }
         }
         chunks.push(text.substring(currentPosition, endPosition).trim());
         currentPosition = endPosition;
     }
     return chunks.filter(chunk => chunk.length > 0);
  }


  private async generateAudioBlob(text: string, options: TTSOptions): Promise<Blob> {
      // --- PASTE YOUR ACTUAL generateAudioBlob fetch IMPLEMENTATION HERE ---
      try {
        console.log(`Generating audio for chunk (start): "${text.substring(0,30)}..."`);
        const response = await fetch(this.serverUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', },
          body: JSON.stringify({
            text,
            voice: options.voice || 'en-US-BrianMultilingualNeural',
            format: options.format || 'audio-24khz-48kbitrate-mono-mp3',
            rate: options.rate,
            pitch: options.pitch
          }),
          signal: this.abortController?.signal, // Use the signal
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to generate audio (${response.status}): ${errorText}`);
        }
        return await response.blob();
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          console.log('Audio generation aborted');
        } else {
          console.error('Error generating audio blob:', error);
        }
        throw error; // Re-throw error
      }
  }

  // --- Legacy Methods ---
  // async generateAudio(text: string, options: TTSOptions = {}): Promise<Blob> { /* ... */ return new Blob();}
  // --- Legacy Methods (Keep if needed, but recommend phasing out) ---
  async generateAudio(text: string, options: TTSOptions = {}): Promise<Blob> {
    console.warn("generateAudio is deprecated, use speakTextInChunks");
    return this.generateAudioBlob(text, options);
  }


  // async playAudio(audioBlob: Blob): Promise<void> async playAudio(audioBlob: Blob): Promise<void> { /* ... */ }


  async playAudio(audioBlob: Blob): Promise<void> {
     console.warn("playAudio is deprecated, use speakTextInChunks");
     this.stopAudio();
     this.isPlaying = true; // Session is active
     this.isPaused = false;
     this.isProcessing = false;

     return new Promise<void>((resolve, reject) => {
       const audio = new Audio(URL.createObjectURL(audioBlob));
       this.currentAudio = audio;
       audio.onended = () => {
         if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
         this.currentAudio = null;
         this.isPlaying = false;
         resolve();
       };
       audio.onerror = (error) => {
         if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
         this.currentAudio = null;
         this.isPlaying = false;
         reject(error);
       };
       audio.play().catch(err => {
         if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
         this.currentAudio = null;
         this.isPlaying = false;
         reject(err);
       });
     });
  }

  async streamAudio(text: string, options: TTSOptions = {}): Promise<void> {
     console.warn("streamAudio is deprecated, use speakTextInChunks");
     return this.speakTextInChunks(text, options);
  }

  // async streamAudio(text: string, options: TTSOptions = {}): Promise<void> { /* ... */ }
}

export default TTSService;