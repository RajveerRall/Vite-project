import { 
  VideoGenerationProgress, 
  VideoOptions, 
  TextLayout, 
  WrappedLine, 
  SRTEntry, 
  VideoConfig 
} from '../types/longFormVideo';

export class LongFormVideoGenerator {
  private config: VideoConfig;

  constructor() {
    this.config = {
      canvasWidth: 1920,      // YouTube landscape
      canvasHeight: 1080,
      fontSize: 42,
      lineHeight: 1.6,
      highlightColor: '#FFE066',
      textColor: '#1a1a1a',
      padding: 120,
      scrollSpeed: 1.2        // Pixels per second
    };
  }

  /**
   * Generate a long-form video with smooth scrolling text
   */
  async generateLongFormVideo(
    text: string,
    audioBlob: Blob,
    srtContent: string,
    audioDuration: number,
    options: VideoOptions,
    onProgress?: (progress: VideoGenerationProgress) => void
  ): Promise<Blob> {
    try {
      // Update config based on format
      this.updateConfigForFormat(options.format);

      onProgress?.({
        stage: 'preparing',
        progress: 10,
        message: 'Preparing video generation...'
      });

      // Step 1: Pre-load fonts
      await this.preloadFonts();

      onProgress?.({
        stage: 'layout',
        progress: 20,
        message: 'Calculating text layout...'
      });

      // Step 2: Create canvas and calculate text layout
      const canvas = this.createCanvas();
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      const layout = this.precomputeTextLayout(ctx, text);
      const srtEntries = this.parseSRTContent(srtContent);

      onProgress?.({
        stage: 'recording',
        progress: 30,
        message: 'Starting video recording...'
      });

      // Step 3: Render scrolling video
      const videoBlob = await this.renderScrollingVideo(
        canvas,
        layout,
        srtEntries,
        audioDuration,
        audioBlob,
        options,
        onProgress
      );

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Video generation complete!'
      });

      return videoBlob;

    } catch (error) {
      console.error('[LongFormVideoGenerator] Generation failed:', error);
      throw error;
    }
  }

  /**
   * Update configuration based on video format
   */
  private updateConfigForFormat(format: 'youtube' | 'mobile'): void {
    if (format === 'mobile') {
      this.config = {
        ...this.config,
        canvasWidth: 1080,
        canvasHeight: 1920,
        fontSize: 48,
        padding: 100
      };
    } else {
      // YouTube landscape (default)
      this.config = {
        ...this.config,
        canvasWidth: 1920,
        canvasHeight: 1080,
        fontSize: 42,
        padding: 120
      };
    }
  }

  /**
   * Pre-load fonts for smooth rendering
   */
  private async preloadFonts(): Promise<void> {
    try {
      const fontFace = new FontFace(
        'Inter',
        'url(https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2)',
        { style: 'normal', weight: '400' }
      );
      
      await fontFace.load();
      document.fonts.add(fontFace);
      
      console.log('[LongFormVideoGenerator] Fonts pre-loaded successfully');
    } catch (error) {
      console.warn('[LongFormVideoGenerator] Font pre-loading failed, using fallback fonts:', error);
    }
  }

  /**
   * Create canvas element
   */
  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.config.canvasWidth;
    canvas.height = this.config.canvasHeight;
    return canvas;
  }

  /**
   * Pre-compute text layout for efficient rendering
   */
  private precomputeTextLayout(ctx: CanvasRenderingContext2D, text: string): TextLayout {
    // Split into sentences
    const sentences = this.splitIntoSentences(text);
    
    // Wrap each sentence
    const wrappedLines: WrappedLine[] = [];
    let totalHeight = 0;
    
    ctx.font = `${this.config.fontSize}px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    const maxWidth = this.config.canvasWidth - (2 * this.config.padding);
    
    for (const sentence of sentences) {
      const lines = this.wrapText(ctx, sentence, maxWidth);
      for (const line of lines) {
        wrappedLines.push({
          text: line,
          y: totalHeight,
          sentence: sentence
        });
        totalHeight += this.config.fontSize * this.config.lineHeight;
      }
    }
    
    console.log(`[LongFormVideoGenerator] Pre-computed ${wrappedLines.length} wrapped lines, total height: ${totalHeight}px`);
    
    return { wrappedLines, totalHeight };
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Normalize whitespace
    const normalized = text.replace(/\s+/g, ' ').trim();
    
    // Split on sentence boundaries - more lenient pattern
    const sentences = normalized.split(/(?<=[.!?])\s+/);
    
    // Clean up and filter empty sentences and very short fragments
    return sentences
      .map(s => s.trim())
      .filter(s => s.length > 5);
  }

  /**
   * Wrap text to fit within max width
   */
  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  /**
   * Parse SRT content into structured entries
   */
  private parseSRTContent(srtContent: string): SRTEntry[] {
    const entries: SRTEntry[] = [];
    const blocks = srtContent.trim().split(/\n\s*\n/);
    
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length >= 3) {
        const timeLine = lines[1];
        const text = lines.slice(2).join(' ');
        
        if (timeLine.includes('-->')) {
          const [startStr, endStr] = timeLine.split('-->').map(s => s.trim());
          const startTime = this.parseTimeToSeconds(startStr);
          const endTime = this.parseTimeToSeconds(endStr);
          
          entries.push({
            startTime,
            endTime,
            text: text.trim()
          });
        }
      }
    }
    
    console.log(`[LongFormVideoGenerator] Parsed ${entries.length} SRT entries`);
    return entries;
  }

  /**
   * Parse SRT time format to seconds
   */
  private parseTimeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const secParts = parts[2].split(',');
    const seconds = parseInt(secParts[0]);
    const milliseconds = parseInt(secParts[1]);
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }

  /**
   * Calculate scroll position based on current time
   */
  private calculateScrollPosition(
    currentTime: number,
    totalDuration: number,
    totalContentHeight: number,
    viewportHeight: number
  ): number {
    // Linear scroll through content based on time
    const progress = Math.min(currentTime / totalDuration, 1);
    const maxScroll = Math.max(totalContentHeight - viewportHeight, 0);
    return progress * maxScroll;
  }

  /**
   * Render scrolling video with MediaRecorder
   */
  private async renderScrollingVideo(
    canvas: HTMLCanvasElement,
    layout: TextLayout,
    srtEntries: SRTEntry[],
    audioDuration: number,
    audioBlob: Blob,
    options: VideoOptions,
    onProgress?: (progress: VideoGenerationProgress) => void
  ): Promise<Blob> {
    const ctx = canvas.getContext('2d')!;
    const stream = canvas.captureStream(30); // 30 FPS
    
    // Set up MediaRecorder with audio
    const { stream: audioStream, startAudio } = await this.createAudioStream(audioBlob);
    const combinedStream = new MediaStream([
      ...stream.getVideoTracks(),
      ...audioStream.getAudioTracks()
    ]);
    
    const mimeType = this.getSupportedMimeType();
    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 5000000
    });
    
    return new Promise((resolve, reject) => {
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        console.log('[LongFormVideoGenerator] MediaRecorder stopped normally');
        const videoBlob = new Blob(chunks, { type: mimeType });
        console.log(`[LongFormVideoGenerator] Video blob created: ${videoBlob.size} bytes`);
        resolve(videoBlob);
      };
      
      mediaRecorder.onerror = (event) => {
        reject(new Error(`MediaRecorder error: ${event}`));
      };
      
      // Start recording
      mediaRecorder.start();
      startAudio();
      console.log('[LongFormVideoGenerator] MediaRecorder started, duration:', audioDuration);
      
      onProgress?.({
        stage: 'recording',
        progress: 50,
        message: 'Recording video...'
      });
      
      // Animation loop
      const startTime = Date.now();
      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        
        if (elapsed >= audioDuration) {
          setTimeout(() => mediaRecorder.stop(), 500);
          return;
        }
        
        // Update progress
        const progressPercent = 50 + (elapsed / audioDuration) * 40;
        onProgress?.({
          stage: 'recording',
          progress: Math.round(progressPercent),
          message: `Recording... ${elapsed.toFixed(1)}s / ${audioDuration.toFixed(1)}s`
        });
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background
        this.drawBackground(ctx, options);
        
        // Calculate scroll position
        const scrollY = this.calculateScrollPosition(
          elapsed,
          audioDuration,
          layout.totalHeight,
          canvas.height
        );
        
        // Draw visible text with scroll offset
        this.drawTextWithScroll(ctx, layout, scrollY, options);
        
        // Optional: Draw highlights
        if (options.enableHighlight) {
          this.drawHighlights(ctx, layout, scrollY, elapsed, srtEntries);
        }
        
        // Draw chapter info
        this.drawChapterInfo(ctx, options);
        
        requestAnimationFrame(animate);
      };
      
      animate();
    });
  }

  /**
   * Create audio stream from TTS blob
   */
  private async createAudioStream(audioBlob: Blob): Promise<{
    stream: MediaStream;
    startAudio: () => void;
  }> {
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);
    
    return {
      stream: destination.stream,
      startAudio: () => {
        source.start();
        console.log('[LongFormVideoGenerator] Audio started');
      }
    };
  }

  /**
   * Get supported MIME type for video recording
   */
  private getSupportedMimeType(): string {
    const types = [
      'video/mp4; codecs=h264',
      'video/webm; codecs=vp9',
      'video/webm; codecs=vp8',
      'video/webm'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`[LongFormVideoGenerator] Using MIME type: ${type}`);
        return type;
      }
    }

    throw new Error('No supported video MIME types found');
  }

  /**
   * Draw background
   */
  private drawBackground(ctx: CanvasRenderingContext2D, options: VideoOptions): void {
    // Simple gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, this.config.canvasHeight);
    gradient.addColorStop(0, '#f8f9fa');
    gradient.addColorStop(1, '#e9ecef');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);
  }

  /**
   * Draw text with scroll offset
   */
  private drawTextWithScroll(
    ctx: CanvasRenderingContext2D,
    layout: TextLayout,
    scrollY: number,
    options: VideoOptions
  ): void {
    ctx.font = `${this.config.fontSize}px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.fillStyle = this.config.textColor;
    ctx.textBaseline = 'top';
    
    // Calculate header height to avoid overlap
    const headerHeight = this.config.fontSize * 0.8 + 20; // Title font size + margin
    const textStartY = this.config.padding + headerHeight;
    
    // Only draw lines visible in viewport
    for (const line of layout.wrappedLines) {
      const lineY = line.y - scrollY + textStartY;
      
      // Skip lines outside viewport
      if (lineY < -this.config.fontSize || lineY > this.config.canvasHeight) {
        continue;
      }
      
      ctx.fillText(line.text, this.config.padding, lineY);
    }
  }

  /**
   * Draw highlights based on SRT timing
   */
  private drawHighlights(
    ctx: CanvasRenderingContext2D,
    layout: TextLayout,
    scrollY: number,
    currentTime: number,
    srtEntries: SRTEntry[]
  ): void {
    // Find current SRT entry
    const currentEntry = srtEntries.find(
      entry => currentTime >= entry.startTime && currentTime <= entry.endTime
    );
    
    if (!currentEntry) return;
    
    // Find lines matching current text
    const matchingLines = layout.wrappedLines.filter(
      line => currentEntry.text.includes(line.sentence) || line.sentence.includes(currentEntry.text)
    );
    
    ctx.fillStyle = this.config.highlightColor;
    ctx.globalAlpha = 0.3;
    
    // Use same header height calculation as text drawing
    const headerHeight = this.config.fontSize * 0.8 + 20;
    const textStartY = this.config.padding + headerHeight;
    
    for (const line of matchingLines) {
      const lineY = line.y - scrollY + textStartY;
      
      if (lineY >= 0 && lineY <= this.config.canvasHeight) {
        const metrics = ctx.measureText(line.text);
        ctx.fillRect(
          this.config.padding - 5,
          lineY - 5,
          metrics.width + 10,
          this.config.fontSize * this.config.lineHeight
        );
      }
    }
    
    ctx.globalAlpha = 1.0;
  }

  /**
   * Draw chapter information
   */
  private drawChapterInfo(ctx: CanvasRenderingContext2D, options: VideoOptions): void {
    // Draw chapter title at top with proper spacing
    ctx.font = `${this.config.fontSize * 0.8}px Inter, sans-serif`;
    ctx.fillStyle = '#333';
    ctx.textBaseline = 'top';
    ctx.fillText(options.chapterTitle, this.config.padding, this.config.padding);
    
    // Draw book title and author at bottom with proper spacing
    const bottomY = this.config.canvasHeight - this.config.padding - 20;
    ctx.font = `${this.config.fontSize * 0.6}px Inter, sans-serif`;
    ctx.fillStyle = '#666';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${options.bookTitle} by ${options.author}`, this.config.padding, bottomY);
  }
}
