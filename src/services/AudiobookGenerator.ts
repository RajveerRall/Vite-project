import { KokoroTTSService } from './KokoroTTSService';

// Audiobook generation interfaces
export interface AudiobookOptions {
  voice: string;
  speed: number;
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
          startTime: totalDuration,
          isGenerated: true,
          isGenerating: false
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
    
    // Extract TOC from toc.ncx file
    const tocContent = await loadedZip.file('OEBPS/toc.ncx')?.async('text');
    const tocMap = new Map<string, string>(); // file path -> title mapping
    
    if (tocContent) {
      try {
        const tocDoc = parser.parseFromString(tocContent, 'application/xml');
        const navPoints = tocDoc.getElementsByTagName('navPoint');
        
        for (let i = 0; i < navPoints.length; i++) {
          const navPoint = navPoints[i];
          const navLabel = navPoint.getElementsByTagName('navLabel')[0];
          const content = navPoint.getElementsByTagName('content')[0];
          
          if (navLabel && content) {
            const title = navLabel.getElementsByTagName('text')[0]?.textContent?.trim();
            const src = content.getAttribute('src');
            
            if (title && src) {
              // Convert src path to match our file paths
              const filePath = src.startsWith('html/') ? `OEBPS/${src}` : `OEBPS/html/${src}`;
              tocMap.set(filePath, title);
            }
          }
        }
        
        console.log(`[AudiobookGenerator] Loaded ${tocMap.size} chapter titles from TOC`);
      } catch (error) {
        console.warn('[AudiobookGenerator] Could not parse TOC file:', error);
      }
    }
    
    // Extract chapters
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
        
        // Get chapter title from TOC, fallback to generic name
        let title = tocMap.get(filePath) || `Chapter ${i + 1}`;
        
        // Clean up the title (remove extra whitespace, etc.)
        title = title.replace(/\s+/g, ' ').trim();
        
        // Estimate duration using improved calculation
        const wordCount = textContent.split(/\s+/).length;
        
        // Use default settings for initial estimation
        const defaultOptions: AudiobookOptions = {
          voice: 'af_heart',
          speed: 1.0,
          includeChapters: true
        };
        
        const estimatedDuration = this.getAccurateDurationEstimate(textContent, defaultOptions);
        
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
   * Get more accurate duration estimate based on TTS settings
   */
  private getAccurateDurationEstimate(textContent: string, options: AudiobookOptions): number {
    const wordCount = textContent.split(/\s+/).length;
    
    // Base TTS speed (words per minute)
    let baseWPM = 150; // Default Kokoro speed
    
    // Adjust for voice speed setting
    baseWPM = baseWPM * options.speed;
    
    // Note: Quality is now auto-detected, so we use a standard overhead
    
    // Calculate base duration
    const baseDuration = (wordCount / baseWPM) * 60; // seconds
    
    // Add overheads
    const punctuationOverhead = baseDuration * 0.12; // 12% for punctuation pauses
    const processingOverhead = baseDuration * 0.08; // 8% for TTS processing
    const kokoroOverhead = baseDuration * 0.05; // 5% for Kokoro-specific processing
    
    return baseDuration + punctuationOverhead + processingOverhead + kokoroOverhead;
  }

  /**
   * Generate audio for a single chapter using Kokoro TTS
   */
  private async generateChapterAudio(chapter: Chapter, options: AudiobookOptions): Promise<Blob> {
    console.log(`[AudiobookGenerator] Generating audio for chapter: ${chapter.title}`);
    
    // Use KokoroTTSService directly - same as the working offline TTS
    const captureService = new KokoroTTSService();
    
    try {
      // Initialize with the selected voice
      await captureService.initialize((progress) => {
        console.log(`[AudiobookGenerator] Kokoro initialization progress: ${progress}%`);
      }, options.voice);
      
      // Use the new generateAudioStream method to capture audio
      console.log(`[AudiobookGenerator] Generating audio stream for chapter: ${chapter.title}`);
      const audioBlob = await captureService.generateAudioStream(chapter.content, options.voice);
      
      console.log(`[AudiobookGenerator] Successfully generated audio: ${audioBlob.size} bytes`);
      return audioBlob;
      
    } catch (error) {
      console.error(`[AudiobookGenerator] Failed to generate audio for chapter "${chapter.title}":`, error);
      throw error;
    } finally {
      // Clean up
      captureService.dispose();
    }
  }
  
  /**
   * Preprocess text to improve TTS quality (same as KokoroTTSService)
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
   * Generate audio for a text chunk using Kokoro TTS
   */
  private async generateAudioChunk(text: string, voice: string): Promise<Blob> {
    console.log(`[AudiobookGenerator] Generating audio with voice: ${voice}`);
    
    // Use the same initialization approach as KokoroTTSService.ts
    const { KokoroTTS } = await import('kokoro-js');
    
    try {
      // Check for WebGPU support (same as KokoroTTSService.ts)
      const supportsWebGPU = 'gpu' in navigator;
      console.log("WebGPU supported:", supportsWebGPU);

      // Initialize Kokoro TTS (same approach as KokoroTTSService.ts)
      const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";

      // Automatically choose the best device/dtype combination
      let device: "webgpu" | "wasm" | "cpu";
      let dtype: "fp32" | "fp16" | "q8" | "q4" | "q4f16";
      
      if (supportsWebGPU) {
        device = "webgpu";
        dtype = "fp32";
        console.log(`[AudiobookGenerator] Auto-detected WebGPU support: Using WebGPU + fp32 (best quality)`);
      } else {
        device = "wasm";
        dtype = "q8";
        console.log(`[AudiobookGenerator] No WebGPU support: Using WASM + q8 (compatible)`);
      }
      
      console.log(`[AudiobookGenerator] Initializing with device: ${device}, dtype: ${dtype}`);
      
      const tts = await KokoroTTS.from_pretrained(model_id, {
        dtype: dtype,
        device: device,
        progress_callback: (progressInfo: any) => {
          console.log("Loading progress:", progressInfo);
        }
      });

      console.log("Kokoro TTS model loaded successfully for audiobook generation");
      
      // Generate audio with the specified voice using the generate method
      console.log(`[AudiobookGenerator] Generating audio with voice: ${voice}`);
      const audio = await tts.generate(text, {
        voice: voice as any, // Type assertion for voice parameter
      });
      
      // Convert audio to Blob using browser-compatible methods
      console.log(`[AudiobookGenerator] Converting audio to Blob for browser download`);
      
      let audioBlob: Blob;
      
      // Try the most common methods in order of preference
      if (audio.toBlob && typeof audio.toBlob === 'function') {
        audioBlob = await audio.toBlob();
        console.log(`[AudiobookGenerator] Used toBlob() method - ${audioBlob.size} bytes`);
      } else if (audio.toWav && typeof audio.toWav === 'function') {
        const wavData = audio.toWav();
        audioBlob = new Blob([wavData], { type: 'audio/wav' });
        console.log(`[AudiobookGenerator] Used toWav() method - ${audioBlob.size} bytes`);
      } else if ((audio as any).arrayBuffer && typeof (audio as any).arrayBuffer === 'function') {
        const audioData = await (audio as any).arrayBuffer();
        audioBlob = new Blob([audioData], { type: 'audio/wav' });
        console.log(`[AudiobookGenerator] Used arrayBuffer() method - ${audioBlob.size} bytes`);
      } else {
        // Last resort: try to access the audio data directly
        console.log(`[AudiobookGenerator] Audio object methods:`, Object.getOwnPropertyNames(audio));
        throw new Error('Unable to extract audio data from Kokoro TTS result');
      }
      
      console.log(`[AudiobookGenerator] Successfully generated audio with voice: ${voice}`);
      return audioBlob;
      
    } catch (error) {
      console.error(`[AudiobookGenerator] Failed to generate audio with voice ${voice}:`, error);
      throw error;
    }
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
    _epubFile: File,
    _options: AudiobookOptions
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
