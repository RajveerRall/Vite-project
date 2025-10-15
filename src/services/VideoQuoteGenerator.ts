import { 
  VideoQuoteOptions, 
  VideoQuoteResult, 
  WordTimestamp, 
  SRTEntry,
  VideoGenerationProgress,
  BackgroundTemplate,
  VideoQuoteGeneratorConfig 
} from '../types/video';

export class VideoQuoteGenerator {
  private config: VideoQuoteGeneratorConfig;
  private backgroundTemplates: BackgroundTemplate[];

  constructor() {
    this.config = {
      canvasWidth: 1080,
      canvasHeight: 1920,
      fontSize: 48,
      lineHeight: 1.6, // Increased line height for better spacing
      highlightColor: '#FFB700', // Richer gold for better visibility
      textColor: '#1a1a1a', // Dark text on light paper
      attributionFontSize: 24,
      maxWordsPerLine: 6, // Reduced for better readability
      padding: 80 // Increased padding
    };

    this.backgroundTemplates = [
      {
        id: 'torn-cover',
        name: 'Book Cover (Torn Paper)',
        type: 'torn-cover'
      },
      {
        id: 'sunset',
        name: 'Sunset',
        type: 'gradient',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      },
      {
        id: 'ocean',
        name: 'Ocean',
        type: 'gradient',
        gradient: 'linear-gradient(120deg, #89f7fe 0%, #66a6ff 100%)',
        preview: 'linear-gradient(120deg, #89f7fe 0%, #66a6ff 100%)'
      },
      {
        id: 'forest',
        name: 'Forest',
        type: 'gradient',
        gradient: 'linear-gradient(135deg, #0fd850 0%, #f9f047 100%)',
        preview: 'linear-gradient(135deg, #0fd850 0%, #f9f047 100%)'
      },
      {
        id: 'twilight',
        name: 'Twilight',
        type: 'gradient',
        gradient: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
        preview: 'linear-gradient(135deg, #434343 0%, #000000 100%)'
      },
      {
        id: 'rose',
        name: 'Rose',
        type: 'gradient',
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        preview: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
      }
    ];
  }

  /**
   * Get available background templates
   */
  getBackgroundTemplates(): BackgroundTemplate[] {
    return this.backgroundTemplates;
  }

  /**
   * Generate a video quote from text selection
   */
  async generateVideoQuote(
    options: VideoQuoteOptions,
    onProgress?: (progress: VideoGenerationProgress) => void
  ): Promise<VideoQuoteResult> {
    try {
      // Step 1: Generate audio
      onProgress?.({
        stage: 'audio',
        progress: 10,
        message: 'Generating audio...'
      });

      const { blob: audioBlob, duration: audioDuration, srtEntries } = 
        await this.generateAudio(options.text, options.voice);

      onProgress?.({
        stage: 'timing',
        progress: 30,
        message: 'Calculating timing...'
      });

      // Step 2: Calculate timestamps using SRT data when available
      const timestamps = this.calculateTimestamps(
        options.text,
        audioDuration,
        srtEntries
      );

      onProgress?.({
        stage: 'rendering',
        progress: 50,
        message: 'Preparing video rendering...'
      });

      // PRE-LOAD cover image and video BEFORE animation starts
      let coverImage: HTMLImageElement | null = null;
      let tornPaperVideo: HTMLVideoElement | null = null;
      
      if (options.backgroundTemplate.type === 'torn-cover' && options.coverUrl) {
        try {
          onProgress?.({
            stage: 'rendering',
            progress: 60,
            message: 'Loading book cover and effects...'
          });
          
          // Load both in parallel
          const [cover, video] = await Promise.all([
            this.loadImage(options.coverUrl),
            this.loadTornPaperVideo().catch(() => null) // Graceful fallback
          ]);
          
          coverImage = cover;
          tornPaperVideo = video;
          
          console.log('[VideoQuoteGenerator] Cover and video pre-loaded successfully');
        } catch (err) {
          console.warn('[VideoQuoteGenerator] Cover failed to load, using fallback:', err);
          coverImage = null;
          tornPaperVideo = null;
        }
      }

      onProgress?.({
        stage: 'rendering',
        progress: 70,
        message: 'Starting video generation...'
      });

      // Step 3: Create canvas and render video
      const canvas = this.createCanvas();
      const videoBlob = await this.renderVideo(
        canvas,
        options,
        timestamps,
        audioBlob,
        audioDuration,
        coverImage, // Pass pre-loaded image
        tornPaperVideo, // Pass pre-loaded video
        onProgress
      );

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Video generation complete!'
      });

      return {
        videoBlob,
        duration: audioDuration,
        wordTimestamps: timestamps,
        audioBlob
      };

    } catch (error) {
      console.error('[VideoQuoteGenerator] Generation failed:', error);
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      throw error;
    }
  }

  /**
   * Generate audio using msedge TTS API with SRT data
   */
  private async generateAudio(text: string, voice: string): Promise<{
    blob: Blob;
    duration: number;
    srtEntries?: SRTEntry[];
  }> {
    try {
      console.log(`[VideoQuoteGenerator] Generating audio with SRT data`);
      
      const ttsApiUrl = import.meta.env.VITE_TTS_API_URL || '';
      const apiUrl = ttsApiUrl ? `${ttsApiUrl}/api/tts/srt` : '/api/tts/srt';
      
      const params = new URLSearchParams({
        text: text,
        voice: voice,
        format: 'audio-24khz-48kbitrate-mono-mp3'
      });
      
      const response = await fetch(`${apiUrl}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`TTS API Failed (${response.status})`);
      }

      // Parse JSON response
      const data = await response.json();
      console.log(`[VideoQuoteGenerator] Received response:`, data);
      
      // Download audio file - construct full URL
      const baseApiUrl = import.meta.env.VITE_TTS_API_URL || '';
      const audioUrl = baseApiUrl ? `${baseApiUrl}${data.audio_url}` : `http://localhost:8001${data.audio_url}`;
      
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.status}`);
      }
      
      const audioBlob = await audioResponse.blob();
      if (audioBlob.size === 0) {
        throw new Error(`Received empty audio blob`);
      }
      
      // Parse SRT content
      let srtEntries: SRTEntry[] | undefined;
      if (data.srt_content) {
        srtEntries = this.parseSRT(data.srt_content);
        console.log(`[VideoQuoteGenerator] Parsed ${srtEntries.length} SRT entries`);
      }
      
      // Get duration from last SRT entry or calculate from blob
      const duration = srtEntries && srtEntries.length > 0
        ? srtEntries[srtEntries.length - 1].endTime
        : await this.getBlobDurationSeconds(audioBlob);

      console.log(`[VideoQuoteGenerator] Generated audio: ${audioBlob.size} bytes, duration: ${duration}s`);
      
      return { blob: audioBlob, duration, srtEntries };

    } catch (error) {
      console.error('[VideoQuoteGenerator] Audio generation failed:', error);
      throw new Error(`Failed to generate audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get audio duration from blob using Web Audio API (same as useReaderTTS)
   */
  private async getBlobDurationSeconds(blob: Blob): Promise<number> {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
        audioContext.decodeAudioData(arrayBuffer, resolve, reject);
      });
      return Math.max(0, Math.round(audioBuffer.duration));
    } catch (error) {
      console.warn('[VideoQuoteGenerator] Failed to decode audio duration:', error);
      return 0;
    }
  }

  /**
   * Parse SRT format to extract timing entries
   */
  private parseSRT(srtContent: string): SRTEntry[] {
    const entries: SRTEntry[] = [];
    const blocks = srtContent.trim().split('\n\n');
    
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length < 3) continue;
      
      const index = parseInt(lines[0]);
      const timingLine = lines[1];
      const text = lines.slice(2).join('\n');
      
      // Parse timing: "00:00:00,050 --> 00:00:01,262"
      const [startStr, endStr] = timingLine.split(' --> ');
      const startTime = this.parseSRTTime(startStr);
      const endTime = this.parseSRTTime(endStr);
      
      entries.push({ index, startTime, endTime, text });
    }
    
    return entries;
  }

  /**
   * Convert SRT time format (HH:MM:SS,mmm) to seconds
   */
  private parseSRTTime(timeStr: string): number {
    const [timePart, msPart] = timeStr.split(',');
    const [hours, minutes, seconds] = timePart.split(':').map(Number);
    const milliseconds = Number(msPart);
    
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }

  /**
   * Calculate timestamps using SRT entries when available, fallback to estimation
   */
  private calculateTimestamps(
    text: string,
    totalDuration: number,
    srtEntries?: SRTEntry[]
  ): WordTimestamp[] {
    if (srtEntries && srtEntries.length > 0) {
      console.log(`[VideoQuoteGenerator] Using SRT timing data: ${srtEntries.length} entries`);
      
      return srtEntries.map((entry, index) => ({
        word: entry.text,
        startTime: entry.startTime,
        endTime: entry.endTime,
        index: index
      }));
    } else {
      // Fallback to estimation
      console.log(`[VideoQuoteGenerator] Using estimated timing data`);
      return this.calculateSentenceTimestamps(text, totalDuration);
    }
  }

  /**
   * Calculate sentence-level timestamps based on audio duration
   */
  private calculateSentenceTimestamps(text: string, totalDuration: number): WordTimestamp[] {
    // Split text into sentences (more natural than words)
    const sentences = text.split(/(?<=[.!?])\s+/).filter(sentence => sentence.trim().length > 0);
    
    if (sentences.length === 0) return [];
    
    // Calculate timing per sentence
    const avgSentenceDuration = totalDuration / sentences.length;
    const timestamps: WordTimestamp[] = [];
    
    let currentTime = 0;
    
    sentences.forEach((sentence, index) => {
      const cleanSentence = sentence.trim();
      
      // Slightly longer duration for sentences ending with punctuation
      let sentenceDuration = avgSentenceDuration;
      if (cleanSentence.match(/[.!?]$/)) {
        sentenceDuration *= 1.1; // 10% longer for sentence endings
      }
      
      timestamps.push({
        word: cleanSentence, // Using 'word' field for sentence content
        startTime: currentTime,
        endTime: currentTime + sentenceDuration,
        index: index
      });
      
      currentTime += sentenceDuration;
    });
    
    // Normalize to fit exact audio duration
    const scaleFactor = totalDuration / currentTime;
    timestamps.forEach(timestamp => {
      timestamp.startTime *= scaleFactor;
      timestamp.endTime *= scaleFactor;
    });
    
    console.log(`[VideoQuoteGenerator] Calculated ${timestamps.length} sentence timestamps for ${totalDuration}s audio`);
    return timestamps;
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
   * Render video with precise timing highlighting
   */
  private async renderVideo(
    canvas: HTMLCanvasElement,
    options: VideoQuoteOptions,
    timestamps: WordTimestamp[],
    audioBlob: Blob,
    audioDuration: number,
    coverImage: HTMLImageElement | null, // NEW PARAMETER
    tornPaperVideo: HTMLVideoElement | null, // NEW PARAMETER
    onProgress?: (progress: VideoGenerationProgress) => void
  ): Promise<Blob> {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Set up MediaRecorder
    const stream = canvas.captureStream(30); // 30 FPS
    const { stream: audioStream, startAudio } = await this.createAudioStream(audioBlob, tornPaperVideo);
    
    // Combine video and audio streams
    const combinedStream = new MediaStream([
      ...stream.getVideoTracks(),
      ...audioStream.getAudioTracks()
    ]);

    // Configure MediaRecorder
    const mimeType = this.getSupportedMimeType();
    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 5000000 // 5 Mbps
    });

    return new Promise((resolve, reject) => {
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('[VideoQuoteGenerator] MediaRecorder stopped normally');
        // clearTimeout(safetyTimeout); // Disabled for debugging
        const videoBlob = new Blob(chunks, { type: mimeType });
        console.log(`[VideoQuoteGenerator] Video blob created: ${videoBlob.size} bytes`);
        resolve(videoBlob);
      };

      mediaRecorder.onerror = (event) => {
        reject(new Error(`MediaRecorder error: ${event}`));
      };

      // Start recording
      mediaRecorder.start();
      startAudio(); // Start audio at the same time as recording
      console.log('[VideoQuoteGenerator] MediaRecorder started, duration:', audioDuration);

      // Safety timeout to ensure recording stops
      const safetyTimeoutMs = (audioDuration + 5) * 1000; // Increased buffer to 5 seconds
      console.log(`[VideoQuoteGenerator] Setting safety timeout for ${safetyTimeoutMs}ms (${audioDuration}s + 5s buffer)`);
      
      // Temporarily disable safety timeout to debug the issue
      // const safetyTimeout = setTimeout(() => {
      //   console.warn(`[VideoQuoteGenerator] Safety timeout triggered after ${safetyTimeoutMs}ms, forcing stop`);
      //   console.log(`[VideoQuoteGenerator] MediaRecorder state: ${mediaRecorder.state}`);
      //   if (mediaRecorder.state !== 'inactive') {
      //     mediaRecorder.stop();
      //   }
      // }, safetyTimeoutMs);
      
      console.log(`[VideoQuoteGenerator] Safety timeout disabled for debugging`);

      onProgress?.({
        stage: 'recording',
        progress: 60,
        message: 'Recording video...'
      });

      // Render animation
      this.renderAnimation(ctx, options, timestamps, audioDuration, coverImage, tornPaperVideo, () => {
        console.log('[VideoQuoteGenerator] Animation complete, stopping recorder in 500ms');
        // Stop recording after animation completes
        setTimeout(() => {
          console.log('[VideoQuoteGenerator] Stopping MediaRecorder');
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }, 500); // Reduced delay
      });

    });
  }

  /**
   * Create mixed audio stream from TTS blob and video audio
   */
  private async createAudioStream(
    audioBlob: Blob, 
    videoElement: HTMLVideoElement | null
  ): Promise<{
    stream: MediaStream;
    startAudio: () => void;
  }> {
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    
    // Create TTS audio source
    const ttsBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
    const ttsSource = audioContext.createBufferSource();
    ttsSource.buffer = ttsBuffer;
    
    // Create video audio source if video element is available
    let videoSource: MediaElementAudioSourceNode | null = null;
    if (videoElement) {
      try {
        videoSource = audioContext.createMediaElementSource(videoElement);
        videoSource.connect(destination);
        console.log('[VideoQuoteGenerator] Video audio connected');
      } catch (err) {
        console.warn('[VideoQuoteGenerator] Could not connect video audio:', err);
      }
    }
    
    // Connect TTS source
    ttsSource.connect(destination);
    
    return {
      stream: destination.stream,
      startAudio: () => {
        // Start video audio immediately (if available)
        if (videoSource) {
          console.log('[VideoQuoteGenerator] Video audio started immediately');
        }
        
        // Delay TTS audio start by 2 seconds to match video intro
        setTimeout(() => {
          ttsSource.start();
          console.log('[VideoQuoteGenerator] TTS audio started after 2s delay');
        }, 2000);
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
        console.log(`[VideoQuoteGenerator] Using MIME type: ${type}`);
        return type;
      }
    }

    throw new Error('No supported video MIME types found');
  }

  /**
   * Render animation with precise timing highlighting
   */
  private renderAnimation(
    ctx: CanvasRenderingContext2D,
    options: VideoQuoteOptions,
    timestamps: WordTimestamp[],
    audioDuration: number,
    coverImage: HTMLImageElement | null, // NEW PARAMETER
    tornPaperVideo: HTMLVideoElement | null, // NEW PARAMETER
    onComplete: () => void
  ): void {
    const startTime = Date.now();
    const VIDEO_INTRO_DURATION = 2.0; // Duration of torn paper animation
    
    console.log(`[VideoQuoteGenerator] Animation started, intro: ${VIDEO_INTRO_DURATION}s, total: ${audioDuration}s`);
    
    // Start video playback if available (plays once, then pauses on last frame)
    if (tornPaperVideo) {
      tornPaperVideo.currentTime = 0;
      tornPaperVideo.loop = false; // Don't loop
      tornPaperVideo.play().catch(err => {
        console.warn('[VideoQuoteGenerator] Video playback failed:', err);
      });
    }
    
    const animate = () => { // NO ASYNC - keep synchronous!
      const elapsed = (Date.now() - startTime) / 1000;
      
      // Log progress every 5 seconds
      if (Math.floor(elapsed) % 5 === 0 && elapsed > 0) {
        console.log(`[VideoQuoteGenerator] Animation progress: ${elapsed.toFixed(1)}s / ${audioDuration}s`);
      }
      
      if (elapsed >= audioDuration) {
        console.log(`[VideoQuoteGenerator] Animation completed after ${elapsed.toFixed(1)}s`);
        onComplete();
        return;
      }

      // Clear canvas
      ctx.clearRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);
      
      // Always draw with video composited over cover (if available)
      if (options.backgroundTemplate.type === 'torn-cover') {
        this.drawTornCoverWithVideo(ctx, coverImage, tornPaperVideo);
      } else {
        this.drawBackgroundSync(ctx, options.backgroundTemplate, coverImage);
      }
      
      // Only draw text and attribution AFTER video intro (when cover is torn)
      if (elapsed >= VIDEO_INTRO_DURATION) {
        // Adjust elapsed time for text animation (subtract intro duration)
        const textElapsed = elapsed - VIDEO_INTRO_DURATION;
        const textDuration = audioDuration - VIDEO_INTRO_DURATION;
        
        // Draw text with highlighting (scrolls over the video effect)
        this.drawTextWithHighlighting(ctx, options, timestamps, textElapsed, textDuration);
        
        // Draw attribution
        this.drawAttribution(ctx, options.bookTitle, options.author, options.backgroundTemplate.type);
      }
      
      requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Draw torn cover with video composited over it using pixel processing
   */
  private drawTornCoverWithVideo(
    ctx: CanvasRenderingContext2D,
    coverImage: HTMLImageElement | null,
    video: HTMLVideoElement | null
  ): void {
    const canvasWidth = this.config.canvasWidth;
    const canvasHeight = this.config.canvasHeight;
    
    // Draw full book cover as background
    if (coverImage) {
      ctx.drawImage(coverImage, 0, 0, canvasWidth, canvasHeight);
    } else {
      // Fallback gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    
    // If no video, just return (cover is already drawn)
    if (!video) return;
    
    // Create temporary canvas to process video frame
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    
    if (!tempCtx) return;
    
    // Scale video to fit canvas
    const videoAspect = video.videoWidth / video.videoHeight;
    const canvasAspect = canvasWidth / canvasHeight;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (videoAspect > canvasAspect) {
      drawHeight = canvasHeight;
      drawWidth = drawHeight * videoAspect;
      drawX = (canvasWidth - drawWidth) / 2;
      drawY = 0;
    } else {
      drawWidth = canvasWidth;
      drawHeight = drawWidth / videoAspect;
      drawX = 0;
      drawY = (canvasHeight - drawHeight) / 2;
    }
    
    // Draw video to temp canvas
    tempCtx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
    
    // Get pixel data
    const imageData = tempCtx.getImageData(0, 0, canvasWidth, canvasHeight);
    const data = imageData.data;
    
    // Process pixels: make black areas transparent
    const blackThreshold = 30; // Adjust if needed (0-255)
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // If pixel is close to black, make it transparent
      if (r < blackThreshold && g < blackThreshold && b < blackThreshold) {
        data[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }
    
    // Put processed pixels back
    tempCtx.putImageData(imageData, 0, 0);
    
    // Draw processed video frame over the cover
    ctx.drawImage(tempCanvas, 0, 0);
  }

  /**
   * Draw gradient background
   */
  private drawBackgroundSync(
    ctx: CanvasRenderingContext2D,
    template: BackgroundTemplate,
    coverImage: HTMLImageElement | null
  ): void {
    if (template.type === 'torn-cover') {
      this.drawTornCoverBackgroundSync(ctx, coverImage);
    } else {
      this.drawGradientBackground(ctx, template);
    }
  }

  /**
   * Draw gradient background (existing functionality)
   */
  private drawGradientBackground(ctx: CanvasRenderingContext2D, template: BackgroundTemplate): void {
    // Create gradient based on template
    const gradient = ctx.createLinearGradient(0, 0, this.config.canvasWidth, this.config.canvasHeight);
    
    // Parse gradient colors from CSS
    const gradientMatch = template.gradient?.match(/linear-gradient\(([^,]+),\s*([^)]+)\)/);
    if (gradientMatch) {
      const [, , colorStops] = gradientMatch;
      const stops = colorStops.split(',').map(stop => stop.trim());
      
      stops.forEach((stop, index) => {
        const [color, position] = stop.split(' ');
        const pos = position ? parseFloat(position) / 100 : index / (stops.length - 1);
        gradient.addColorStop(pos, color);
      });
    } else {
      // Fallback gradient
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);
  }

  /**
   * Draw torn cover background with book cover sections and paper middle
   */
  private drawTornCoverBackgroundSync(
    ctx: CanvasRenderingContext2D,
    coverImage: HTMLImageElement | null
  ): void {
    const canvasHeight = this.config.canvasHeight; // 1920
    const canvasWidth = this.config.canvasWidth; // 1080
    
    // Define sections
    const topHeight = canvasHeight * 0.30; // 576px
    const middleHeight = canvasHeight * 0.40; // 768px
    const bottomStart = topHeight + middleHeight; // 1344px
    
    if (coverImage) {
      // Draw top section of cover (30%) - SYNCHRONOUS
      ctx.drawImage(
        coverImage,
        0, 0, coverImage.width, coverImage.height * 0.30,
        0, 0, canvasWidth, topHeight
      );
      
      // Draw bottom section of cover (30%) - SYNCHRONOUS
      ctx.drawImage(
        coverImage,
        0, coverImage.height * 0.70, coverImage.width, coverImage.height * 0.30,
        0, bottomStart, canvasWidth, canvasHeight - bottomStart
      );
    } else {
      // Fallback gradient
      this.drawFallbackCoverSections(ctx, topHeight, bottomStart, canvasWidth, canvasHeight);
    }
    
    // Draw paper texture in middle section
    ctx.fillStyle = 'rgba(240, 237, 230, 1)'; // Darker cream for better contrast
    ctx.fillRect(0, topHeight, canvasWidth, middleHeight);
    
    // Draw realistic torn edges using pure canvas/math
    this.drawRealisticTornEdge(ctx, topHeight, canvasWidth, 'top');
    this.drawRealisticTornEdge(ctx, bottomStart, canvasWidth, 'bottom');
  }

  /**
   * Draw fallback gradient sections when cover is not available
   */
  private drawFallbackCoverSections(
    ctx: CanvasRenderingContext2D,
    topHeight: number,
    bottomStart: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, topHeight);
    ctx.fillRect(0, bottomStart, canvasWidth, canvasHeight - bottomStart);
  }

  /**
   * Draw realistic torn edge using mathematical curves (NO images needed)
   */
  private drawRealisticTornEdge(
    ctx: CanvasRenderingContext2D,
    y: number,
    width: number,
    direction: 'top' | 'bottom'
  ): void {
    ctx.save();
    
    // Create irregular torn edge path
    ctx.beginPath();
    ctx.moveTo(0, y);
    
    // Use random seed for consistent pattern (optional)
    const seed = y; // Use Y position as seed for consistency
    let randomState = seed;
    const seededRandom = () => {
      randomState = (randomState * 9301 + 49297) % 233280;
      return randomState / 233280;
    };
    
    // Draw irregular edge with multiple wave frequencies
    for (let x = 0; x <= width; x += 8) {
      // Combine multiple sine waves for natural variation
      const wave1 = Math.sin(x * 0.02) * 10;
      const wave2 = Math.sin(x * 0.05) * 6;
      const wave3 = Math.sin(x * 0.1) * 3;
      
      // Add random jaggedness
      const jag = (seededRandom() - 0.5) * 12;
      
      // Occasional larger "tears"
      const tear = (x % 80 < 15) ? (seededRandom() - 0.5) * 15 : 0;
      
      const totalOffset = wave1 + wave2 + wave3 + jag + tear;
      const edgeY = direction === 'top' ? y + totalOffset : y - totalOffset;
      
      ctx.lineTo(x, edgeY);
    }
    
    // Complete the shape for shadow
    const extend = 25;
    ctx.lineTo(width, direction === 'top' ? y + extend : y - extend);
    ctx.lineTo(width, y);
    ctx.lineTo(0, y);
    ctx.closePath();
    
    // Draw shadow gradient for depth
    const gradient = direction === 'top' 
      ? ctx.createLinearGradient(0, y - 10, 0, y + 20)
      : ctx.createLinearGradient(0, y - 20, 0, y + 10);
      
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.08)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.12)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.restore();
  }

  /**
   * Draw text with precise timing highlighting and scrolling support
   */
  private drawTextWithHighlighting(
    ctx: CanvasRenderingContext2D,
    options: VideoQuoteOptions,
    timestamps: WordTimestamp[],
    currentTime: number,
    totalDuration: number
  ): void {
    ctx.font = `bold ${this.config.fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    const maxWidth = this.config.canvasWidth - (2 * this.config.padding);
    const lineHeight = this.config.fontSize * this.config.lineHeight;
    
    // Define middle section bounds for torn cover template
    const topBound = this.config.canvasHeight * 0.30; // 576px
    const bottomBound = this.config.canvasHeight * 0.70; // 1344px
    const middleHeight = bottomBound - topBound; // 768px
    
    // Set clipping region for torn cover template
    if (options.backgroundTemplate.type === 'torn-cover') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, topBound, this.config.canvasWidth, middleHeight);
      ctx.clip();
    }
    
    // Calculate available height (excluding attribution area)
    const attributionHeight = 120; // Space for book title/author at bottom
    const availableHeight = options.backgroundTemplate.type === 'torn-cover' 
      ? middleHeight - (2 * this.config.padding) - attributionHeight
      : this.config.canvasHeight - (2 * this.config.padding) - attributionHeight;
    
    // Wrap each timestamp's text and track which lines belong to which timestamp
    const wrappedLines: Array<{
      text: string;
      timestamp: WordTimestamp;
    }> = [];
    
    timestamps.forEach(timestamp => {
      const lines = this.wrapTextToWidth(ctx, timestamp.word, maxWidth);
      
      lines.forEach(line => {
        wrappedLines.push({
          text: line,
          timestamp: timestamp
        });
      });
    });
    
    // Calculate total height and determine if scrolling is needed
    const totalHeight = wrappedLines.length * lineHeight;
    const needsScrolling = totalHeight > availableHeight;
    
    if (needsScrolling) {
      // Scrolling mode: calculate scroll progress and offset
      const scrollProgress = Math.min(currentTime / totalDuration, 1);
      
      // Calculate scroll range based on template type
      let startY: number;
      let endY: number;
      
      if (options.backgroundTemplate.type === 'torn-cover') {
        // For torn cover, scroll within middle section
        startY = topBound + (middleHeight / 2);
        endY = topBound + (middleHeight / 2) - totalHeight;
      } else {
        // For gradient templates, scroll in full canvas
        startY = this.config.canvasHeight / 2;
        endY = this.config.canvasHeight / 2 - totalHeight;
      }
      
      const scrollRange = startY - endY;
      
      // Calculate current scroll offset
      const scrollOffset = startY - (scrollProgress * scrollRange);
      
      // Draw each wrapped line with scroll offset and viewport culling
      wrappedLines.forEach((line, index) => {
        const y = scrollOffset + (index * lineHeight);
        
        // Viewport culling: only draw if line is within visible area (with buffer)
        const buffer = lineHeight;
        if (y > -buffer && y < this.config.canvasHeight + buffer) {
          // Calculate highlighting DYNAMICALLY during rendering
          const isHighlighted = currentTime >= line.timestamp.startTime && 
                                currentTime <= line.timestamp.endTime;
          
          if (isHighlighted) {
            ctx.fillStyle = this.config.highlightColor;
            ctx.shadowColor = this.config.highlightColor;
            ctx.shadowBlur = 10;
          } else {
            ctx.fillStyle = this.config.textColor;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 5;
          }
          
          ctx.fillText(line.text, this.config.canvasWidth / 2, y, maxWidth);
        }
      });
    } else {
      // Non-scrolling mode: center text based on template type
      let startY: number;
      
      if (options.backgroundTemplate.type === 'torn-cover') {
        // For torn cover, center within middle section
        startY = topBound + (middleHeight - totalHeight) / 2;
      } else {
        // For gradient templates, center in full canvas
        startY = (this.config.canvasHeight - totalHeight) / 2;
      }
      
      // Draw each wrapped line
      wrappedLines.forEach((line, index) => {
        // Calculate highlighting DYNAMICALLY during rendering
        const isHighlighted = currentTime >= line.timestamp.startTime && 
                              currentTime <= line.timestamp.endTime;
        
        if (isHighlighted) {
          ctx.fillStyle = this.config.highlightColor;
          ctx.shadowColor = this.config.highlightColor;
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = this.config.textColor;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 5;
        }
        
        const y = startY + (index * lineHeight);
        ctx.fillText(line.text, this.config.canvasWidth / 2, y, maxWidth);
      });
    }
    
    ctx.shadowBlur = 0;
    
    // Restore clipping region if it was set
    if (options.backgroundTemplate.type === 'torn-cover') {
      ctx.restore();
    }
  }

  /**
   * Draw book attribution with semi-transparent background
   */
  private drawAttribution(
    ctx: CanvasRenderingContext2D, 
    bookTitle: string, 
    author: string, 
    templateType?: string
  ): void {
    let attributionY: number;
    let backgroundY: number;
    let backgroundHeight: number;
    
    if (templateType === 'torn-cover') {
      // Position attribution on top cover area
      const topSectionHeight = this.config.canvasHeight * 0.30;
      attributionY = topSectionHeight - 80; // 80px from bottom of top section
      backgroundY = attributionY - 60;
      backgroundHeight = 120;
    } else {
      // Position attribution at bottom for gradient templates
      attributionY = this.config.canvasHeight - this.config.padding - 40;
      backgroundY = this.config.canvasHeight - 120;
      backgroundHeight = 120;
    }
    
    // Draw semi-transparent background for attribution area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, backgroundY, this.config.canvasWidth, backgroundHeight);
    
    ctx.font = `${this.config.attributionFontSize}px Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 5;
    
    // Draw book title
    ctx.fillText(bookTitle, this.config.canvasWidth / 2, attributionY);
    
    // Draw author
    ctx.font = `${this.config.attributionFontSize - 4}px Arial, sans-serif`;
    ctx.fillText(`by ${author}`, this.config.canvasWidth / 2, attributionY + 30);
    
    // Reset shadow
    ctx.shadowBlur = 0;
  }

  /**
   * Wrap text to fit within max width, breaking on word boundaries
   */
  private wrapTextToWidth(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        // Current line is full, push it and start new line
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    
    // Push remaining text
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines.length > 0 ? lines : [text];
  }

  /**
   * Load image from URL
   */
  private async loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  private async loadTornPaperVideo(): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.muted = true;
      
      video.onloadeddata = () => {
        console.log('[VideoQuoteGenerator] Torn paper video loaded');
        resolve(video);
      };
      
      video.onerror = (err) => {
        console.warn('[VideoQuoteGenerator] Failed to load torn paper video:', err);
        reject(err);
      };
      
      // Use cover-animate.mp4 as requested
      video.src = '/assets/cover-animate.mp4';
    });
  }
}
