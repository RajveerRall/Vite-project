import { KokoroTTSService, ProgressCallback } from './KokoroTTSService';
import { BookData, TOCItem } from '../types/books';

// Audiobook generation interfaces
export interface AudiobookOptions {
  voice: string;
  speed: number;
  quality: 'standard' | 'premium';
  includeChapters: boolean;
  backgroundMusic?: boolean;
}

export interface ChapterAudio {
  chapterIndex: number;
  title: string;
  audioBlob: Blob;
  duration: number;
  startTime: number;
  isGenerated: boolean;
  isGenerating: boolean;
  error?: string;
}

export interface AudiobookProgress {
  stage: 'initializing' | 'parsing' | 'generating' | 'encoding' | 'complete' | 'error';
  currentChapter: number;
  totalChapters: number;
  progress: number;
  estimatedTime: string;
  currentAction: string;
}

export interface Chapter {
  index: number;
  title: string;
  content: string;
  htmlContent: string;
  estimatedDuration: number;
}

/**
 * Audiobook Generator Service
 * Leverages existing Kokoro TTS and BookContext infrastructure
 */
export class AudiobookGenerator {
  private kokoroService: KokoroTTSService;
  private audioContext: AudioContext;
  private isInitialized: boolean = false;
  
  // Progress tracking
  private onProgressUpdate: ((progress: AudiobookProgress) => void) | null = null;
  
  constructor() {
    this.kokoroService = new KokoroTTSService();
    this.audioContext = new AudioContext();
  }
  
  /**
   * Initialize the audiobook generator
   */
  public async initialize(progressCallback: (progress: AudiobookProgress) => void): Promise<void> {
    this.onProgressUpdate = progressCallback;
    
    try {
      // Initialize Kokoro TTS
      await this.kokoroService.initialize((progress: number) => {
        this.updateProgress({
          stage: 'initializing',
          currentChapter: 0,
          totalChapters: 0,
          progress: progress,
          estimatedTime: 'Initializing...',
          currentAction: 'Loading Kokoro TTS model'
        });
      });
      
      this.isInitialized = true;
      console.log('[AudiobookGenerator] Initialized successfully');
      
    } catch (error) {
      console.error('[AudiobookGenerator] Initialization failed:', error);
      this.updateProgress({
        stage: 'error',
        currentChapter: 0,
        totalChapters: 0,
        progress: 0,
        estimatedTime: 'Error',
        currentAction: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      throw error;
    }
  }
  
  /**
   * Extract chapters from EPUB file without generating audio
   */
  public async extractChaptersOnly(epubFile: File): Promise<Chapter[]> {
    if (!this.isInitialized) {
      throw new Error('AudiobookGenerator not initialized. Call initialize() first.');
    }
    
    try {
      this.updateProgress({
        stage: 'parsing',
        currentChapter: 0,
        totalChapters: 0,
        progress: 50,
        estimatedTime: 'Parsing EPUB...',
        currentAction: 'Extracting chapters and content'
      });
      
      const chapters = await this.extractChaptersFromEpub(epubFile);
      
      this.updateProgress({
        stage: 'complete',
        currentChapter: chapters.length,
        totalChapters: chapters.length,
        progress: 100,
        estimatedTime: 'Complete!',
        currentAction: `${chapters.length} chapters extracted successfully`
      });
      
      return chapters;
      
    } catch (error) {
      console.error('[AudiobookGenerator] Chapter extraction failed:', error);
      this.updateProgress({
        stage: 'error',
        currentChapter: 0,
        totalChapters: 0,
        progress: 0,
        estimatedTime: 'Error',
        currentAction: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      throw error;
    }
  }
  
  /**
   * Generate audio for a single chapter
   */
  public async generateSingleChapter(
    chapter: Chapter, 
    options: AudiobookOptions,
    onProgress?: (progress: number) => void
  ): Promise<ChapterAudio> {
    if (!this.isInitialized) {
      throw new Error('AudiobookGenerator not initialized. Call initialize() first.');
    }
    
    try {
      onProgress?.(0);
      
      this.updateProgress({
        stage: 'generating',
        currentChapter: chapter.index + 1,
        totalChapters: 1,
        progress: 0,
        estimatedTime: 'Generating audio...',
        currentAction: `Generating audio for: ${chapter.title}`
      });
      
      const audioBlob = await this.generateChapterAudio(chapter, options);
      const duration = await this.getAudioDuration(audioBlob);
      
      onProgress?.(100);
      
      this.updateProgress({
        stage: 'complete',
        currentChapter: 1,
        totalChapters: 1,
        progress: 100,
        estimatedTime: 'Complete!',
        currentAction: `Audio generated for: ${chapter.title}`
      });
      
      return {
        chapterIndex: chapter.index,
        title: chapter.title,
        audioBlob,
        duration,
        startTime: 0, // Will be calculated when combining
        isGenerated: true,
        isGenerating: false
      };
      
    } catch (error) {
      console.error(`[AudiobookGenerator] Failed to generate audio for chapter "${chapter.title}":`, error);
      
      return {
        chapterIndex: chapter.index,
        title: chapter.title,
        audioBlob: new Blob(['error'], { type: 'audio/wav' }),
        duration: 0,
        startTime: 0,
        isGenerated: false,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  public async generateAudiobook(
    epubFile: File,
    options: AudiobookOptions
  ): Promise<Blob> {
    if (!this.isInitialized) {
      throw new Error('AudiobookGenerator not initialized. Call initialize() first.');
    }
    
    try {
      // Step 1: Parse EPUB and extract chapters
      this.updateProgress({
        stage: 'parsing',
        currentChapter: 0,
        totalChapters: 0,
        progress: 10,
        estimatedTime: 'Parsing EPUB...',
        currentAction: 'Extracting chapters and content'
      });
      
      const chapters = await this.extractChaptersFromEpub(epubFile);
      
      this.updateProgress({
        stage: 'generating',
        currentChapter: 0,
        totalChapters: chapters.length,
        progress: 20,
        estimatedTime: `Generating ${chapters.length} chapters...`,
        currentAction: 'Starting audio generation'
      });
      
      // Step 2: Generate audio for each chapter
      const chapterAudios: ChapterAudio[] = [];
      let totalDuration = 0;
      
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        
        this.updateProgress({
          stage: 'generating',
          currentChapter: i + 1,
          totalChapters: chapters.length,
          progress: 20 + (i / chapters.length) * 60,
          estimatedTime: `Chapter ${i + 1}/${chapters.length}`,
          currentAction: `Generating audio for: ${chapter.title}`
        });
        
        const audioBlob = await this.generateChapterAudio(chapter, options);
        const duration = await this.getAudioDuration(audioBlob);
        
        chapterAudios.push({
          chapterIndex: i,
          title: chapter.title,
          audioBlob,
          duration,
          startTime: totalDuration
        });
        
        totalDuration += duration;
        
        console.log(`[AudiobookGenerator] Generated chapter ${i + 1}/${chapters.length}: "${chapter.title}" (${duration.toFixed(1)}s)`);
      }
      
      // Step 3: Combine chapters into single audiobook
      this.updateProgress({
        stage: 'encoding',
        currentChapter: chapters.length,
        totalChapters: chapters.length,
        progress: 80,
        estimatedTime: 'Finalizing audiobook...',
        currentAction: 'Combining chapters and adding metadata'
      });
      
      const audiobookBlob = await this.combineChaptersIntoAudiobook(chapterAudios, epubFile, options);
      
      this.updateProgress({
        stage: 'complete',
        currentChapter: chapters.length,
        totalChapters: chapters.length,
        progress: 100,
        estimatedTime: 'Complete!',
        currentAction: 'Audiobook ready for download'
      });
      
      console.log(`[AudiobookGenerator] Audiobook generation complete: ${(audiobookBlob.size / 1024 / 1024).toFixed(1)}MB`);
      return audiobookBlob;
      
    } catch (error) {
      console.error('[AudiobookGenerator] Generation failed:', error);
      this.updateProgress({
        stage: 'error',
        currentChapter: 0,
        totalChapters: 0,
        progress: 0,
        estimatedTime: 'Error',
        currentAction: `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      throw error;
    }
  }
  
  /**
   * Extract chapters from EPUB file using existing BookContext logic
   */
  private async extractChaptersFromEpub(epubFile: File): Promise<Chapter[]> {
    try {
      console.log('[AudiobookGenerator] Starting EPUB parsing...');
      
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(epubFile);
      
      console.log('[AudiobookGenerator] EPUB ZIP loaded successfully');
    
    // Parse container.xml (same as BookContext)
    const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
    if (!containerXml) throw new Error('Invalid EPUB: container.xml not found');
    
    console.log('[AudiobookGenerator] Parsing container.xml...');
    const { getDOMParser } = await import('../context/book/domParser');
    const DOMParser = await getDOMParser();
    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXml, 'application/xml');
    const rootfiles = containerDoc.getElementsByTagName('rootfile');
    if (rootfiles.length === 0) throw new Error('Invalid EPUB: No rootfile found');
    
    const opfPath = rootfiles[0].getAttribute('full-path') || '';
    const opfContent = await loadedZip.file(opfPath)?.async('text');
    if (!opfContent) throw new Error('Invalid EPUB: OPF file not found');
    
    const opfDoc = parser.parseFromString(opfContent, 'application/xml');
    const manifestElement = opfDoc.getElementsByTagName('manifest')[0];
    const spineElement = opfDoc.getElementsByTagName('spine')[0];
    if (!manifestElement || !spineElement) throw new Error('Invalid EPUB: Missing manifest or spine');
    
    // Extract spine order (same as BookContext)
    const manifestItems = manifestElement.getElementsByTagName('item');
    const spineItemRefs = spineElement.getElementsByTagName('itemref');
    const { getDirectoryPath, resolveRelativePath } = await import('../utils/pathUtils');
    const opfDir = getDirectoryPath(opfPath);
    
    const fileOrder: string[] = [];
    for (let i = 0; i < spineItemRefs.length; i++) {
      const idref = spineItemRefs[i].getAttribute('idref');
      for (let j = 0; j < manifestItems.length; j++) {
        if (manifestItems[j].getAttribute('id') === idref) {
          const href = manifestItems[j].getAttribute('href');
          if (href) fileOrder.push(resolveRelativePath(opfDir, href));
          break;
        }
      }
    }
    
    // Extract TOC (simplified version of BookContext logic)
    const chapters: Chapter[] = [];
    
    for (let i = 0; i < fileOrder.length; i++) {
      const filePath = fileOrder[i];
      const htmlContent = await loadedZip.file(filePath)?.async('text');
      
      if (htmlContent) {
        // Clean HTML content (using your existing utilities)
        const { processHtmlContent, extractTextFromHtml, cleanEpubContent } = await import('../utils/textExtraction');
        const processedHtml = processHtmlContent(htmlContent, getDirectoryPath(filePath), loadedZip, filePath);
        const cleanedHtml = cleanEpubContent(processedHtml);
        const textContent = extractTextFromHtml(cleanedHtml);
        
        // Generate chapter title
        const fileName = filePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
        const title = fileName || `Chapter ${i + 1}`;
        
        // Estimate duration (rough calculation: ~150 words per minute)
        const wordCount = textContent.split(/\s+/).length;
        const estimatedDuration = (wordCount / 150) * 60; // seconds
        
        chapters.push({
          index: i,
          title,
          content: textContent,
          htmlContent: cleanedHtml,
          estimatedDuration
        });
        
        console.log(`[AudiobookGenerator] Extracted chapter ${i + 1}: "${title}" (${wordCount} words, ~${estimatedDuration.toFixed(1)}s)`);
      }
    }
    
    console.log(`[AudiobookGenerator] Successfully extracted ${chapters.length} chapters`);
    return chapters;
    
    } catch (error) {
      console.error('[AudiobookGenerator] Error extracting chapters from EPUB:', error);
      throw new Error(`Failed to parse EPUB: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate audio for a single chapter using Kokoro TTS
   */
  private async generateChapterAudio(chapter: Chapter, options: AudiobookOptions): Promise<Blob> {
    // Use your existing Kokoro TTS service to generate audio
    // This is a simplified implementation - we'll enhance it step by step
    
    const text = chapter.content;
    const chunks = this.splitTextIntoChunks(text, 2000); // Your existing chunking logic
    const audioChunks: Blob[] = [];
    
    for (const chunk of chunks) {
      try {
        // Generate audio for this chunk using Kokoro
        const audioBlob = await this.generateAudioChunk(chunk, options.voice);
        audioChunks.push(audioBlob);
      } catch (error) {
        console.error(`[AudiobookGenerator] Failed to generate audio for chunk:`, error);
        // Continue with other chunks
      }
    }
    
    // Combine all chunks into single audio blob
    return await this.combineAudioChunks(audioChunks);
  }
  
  /**
   * Generate audio for a text chunk using Kokoro TTS
   */
  private async generateAudioChunk(text: string, voice: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const audioChunks: ArrayBuffer[] = [];
      let isComplete = false;
      
      // Create a custom Kokoro TTS service instance for audio capture
      const captureService = new KokoroTTSService();
      
      // Set up callbacks to capture audio instead of playing it
      captureService.setCallbacks(
        (text: string) => {
          // Text update callback - we don't need this for audio generation
          console.log(`[AudiobookGenerator] Processing: ${text.substring(0, 50)}...`);
        },
        (error: string) => {
          console.error(`[AudiobookGenerator] TTS Error: ${error}`);
          if (!isComplete) {
            isComplete = true;
            reject(new Error(error));
          }
        },
        () => {
          // Completion callback - combine all audio chunks
          console.log(`[AudiobookGenerator] Audio generation complete for chunk`);
          if (!isComplete) {
            isComplete = true;
            try {
              const combinedAudio = this.combineAudioBuffers(audioChunks);
              const blob = new Blob([combinedAudio], { type: 'audio/wav' });
              resolve(blob);
            } catch (error) {
              reject(error);
            }
          }
        }
      );
      
      // Override the audio playback methods to capture audio instead
      const originalPlayAudioFromArrayBuffer = captureService['playAudioFromArrayBuffer'];
      captureService['playAudioFromArrayBuffer'] = async (audioData: ArrayBuffer) => {
        console.log(`[AudiobookGenerator] Captured audio chunk: ${audioData.byteLength} bytes`);
        audioChunks.push(audioData);
        // Don't actually play the audio, just capture it
      };
      
      const originalPlayRawAudioData = captureService['playRawAudioData'];
      captureService['playRawAudioData'] = (audioData: Float32Array, sampleRate: number) => {
        console.log(`[AudiobookGenerator] Captured raw audio: ${audioData.length} samples at ${sampleRate}Hz`);
        // Convert Float32Array to ArrayBuffer
        const buffer = new ArrayBuffer(audioData.length * 4);
        const view = new Float32Array(buffer);
        view.set(audioData);
        audioChunks.push(buffer);
        // Don't actually play the audio, just capture it
      };
      
      // Initialize and generate audio
      captureService.initialize((progress) => {
        console.log(`[AudiobookGenerator] Kokoro initialization progress: ${progress}%`);
      }).then(() => {
        // Generate audio for the text
        captureService.playText(text, voice).catch((error) => {
          if (!isComplete) {
            isComplete = true;
            reject(error);
          }
        });
      }).catch((error) => {
        if (!isComplete) {
          isComplete = true;
          reject(error);
        }
      });
      
      // Set a timeout to prevent hanging
      setTimeout(() => {
        if (!isComplete) {
          isComplete = true;
          reject(new Error('Audio generation timeout'));
        }
      }, 30000); // 30 second timeout
    });
  }
  
  /**
   * Combine multiple audio buffers into a single buffer
   */
  private combineAudioBuffers(audioChunks: ArrayBuffer[]): ArrayBuffer {
    if (audioChunks.length === 0) {
      throw new Error('No audio chunks to combine');
    }
    
    if (audioChunks.length === 1) {
      return audioChunks[0];
    }
    
    // Calculate total length
    const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const combinedBuffer = new ArrayBuffer(totalLength);
    const combinedView = new Uint8Array(combinedBuffer);
    
    let offset = 0;
    for (const chunk of audioChunks) {
      const chunkView = new Uint8Array(chunk);
      combinedView.set(chunkView, offset);
      offset += chunk.byteLength;
    }
    
    console.log(`[AudiobookGenerator] Combined ${audioChunks.length} audio chunks into ${totalLength} bytes`);
    return combinedBuffer;
  }
  
  /**
   * Split text into manageable chunks for TTS processing
   */
  private splitTextIntoChunks(text: string, maxLength: number): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxLength && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
  
  /**
   * Combine multiple audio chunks into a single blob
   */
  private async combineAudioChunks(audioChunks: Blob[]): Promise<Blob> {
    if (audioChunks.length === 0) {
      return new Blob(['empty'], { type: 'audio/wav' });
    }
    
    if (audioChunks.length === 1) {
      return audioChunks[0];
    }
    
    try {
      // For now, we'll concatenate the raw audio data
      // In a more sophisticated implementation, we'd properly merge WAV headers
      const arrayBuffers: ArrayBuffer[] = [];
      
      for (const chunk of audioChunks) {
        const arrayBuffer = await chunk.arrayBuffer();
        arrayBuffers.push(arrayBuffer);
      }
      
      const combinedBuffer = this.combineAudioBuffers(arrayBuffers);
      return new Blob([combinedBuffer], { type: 'audio/wav' });
      
    } catch (error) {
      console.error('[AudiobookGenerator] Error combining audio chunks:', error);
      // Fallback: return the first chunk
      return audioChunks[0];
    }
  }
  
  /**
   * Get duration of audio blob
   */
  private async getAudioDuration(audioBlob: Blob): Promise<number> {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const duration = audioBuffer.duration;
      audioContext.close();
      console.log(`[AudiobookGenerator] Calculated audio duration: ${duration.toFixed(2)}s`);
      return duration;
    } catch (error) {
      console.warn('[AudiobookGenerator] Could not calculate audio duration:', error);
      // Fallback: estimate duration based on file size (rough approximation)
      const estimatedDuration = audioBlob.size / 16000; // Rough estimate for WAV files
      return Math.max(1, estimatedDuration); // At least 1 second
    }
  }
  
  /**
   * Combine chapters into final audiobook with metadata
   */
  private async combineChaptersIntoAudiobook(
    chapterAudios: ChapterAudio[],
    epubFile: File,
    options: AudiobookOptions
  ): Promise<Blob> {
    // For now, return the first chapter as a placeholder
    // We'll implement proper audiobook packaging in the next step
    return chapterAudios[0]?.audioBlob || new Blob(['empty audiobook'], { type: 'audio/wav' });
  }
  
  /**
   * Update progress callback
   */
  private updateProgress(progress: AudiobookProgress): void {
    this.onProgressUpdate?.(progress);
  }
  
  /**
   * Cleanup resources
   */
  public dispose(): void {
    // Cleanup any resources
    this.audioContext.close();
  }
}
