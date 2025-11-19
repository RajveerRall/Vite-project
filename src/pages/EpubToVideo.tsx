import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, Settings, FileText, Video, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/Common/SEO';
import { useEpubExtraction } from '../hooks/useEpubExtraction';
import { requestFullCast, ttsForLine } from '../services/fullCastTTS';
import { videoCacheService } from '../services/VideoCacheService';
import { generateCacheKey } from '../utils/cacheKeyGenerator';

interface VideoSettings {
  format: 'youtube' | 'mobile';
  style: 'ereader' | 'split';
  highlightMode: 'none' | 'sentence' | 'word';  // Changed from enableHighlight boolean
  enableSceneImages: boolean;  // NEW: Toggle for AI-generated scene images
  useMultiVoice: boolean;  // NEW: Toggle for multi-voice casting
}

interface VideoProgress {
  stage: 'idle' | 'parsing' | 'audio' | 'video' | 'complete';
  percentage: number;
  message: string;
}

interface QueueItem {
  id: string;
  chapterIndex: number;
  chapterTitle: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: VideoProgress;
  error?: string;
  estimatedDuration: number;
}

const EpubToVideo: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<VideoSettings>({
    format: 'youtube',
    style: 'ereader',
    highlightMode: 'none',  // Default to no highlighting
    enableSceneImages: true,  // Default: AI scene images enabled
    useMultiVoice: true  // Default: Multi-voice casting enabled
  });
  // Queue state
  const [videoQueue, setVideoQueue] = useState<QueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [currentProcessingId, setCurrentProcessingId] = useState<string | null>(null);
  const [cacheStatuses, setCacheStatuses] = useState<Map<string, { hasCache: boolean; cacheSize: number; cacheDate: Date | null }>>(new Map());

  // Use the EPUB extraction hook (no TTS initialization)
  const { 
    isInitializing, 
    chapters, 
    extractChapters, 
    reset 
  } = useEpubExtraction();

  // Format duration from seconds to readable format
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      if (remainingSeconds === 0) {
        return `${minutes}m`;
      } else {
        return `${minutes}m ${remainingSeconds}s`;
      }
    }
  };

  // Helper functions for video generation
  const parseTimeToSeconds = (timeStr: string): number => {
    const match = timeStr.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!match) return 0;
    const [, hours, minutes, seconds, ms] = match;
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(ms) / 1000;
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const extractLastSrtEndTime = (srtContent: string): number | null => {
    const lines = srtContent.split('\n');
    let lastEndTime: number | null = null;
    
    // Search from end to find the last timestamp entry
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.includes('-->')) {
        const [, endTime] = line.split('-->').map(t => t.trim());
        lastEndTime = parseTimeToSeconds(endTime);
        break;
      }
    }
    
    return lastEndTime;
  };

  const countSrtEntries = (srtContent: string): number => {
    /**
     * Count the number of SRT entries in a chunk's SRT content.
     * SRT entries are separated by double newlines (empty lines).
     */
    if (!srtContent || srtContent.trim().length === 0) {
      return 0;
    }
    
    // Normalize line endings and split by double newlines
    const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const blocks = normalized.trim().split('\n\n');
    
    // Count blocks that contain a timestamp (-->)
    let count = 0;
    for (const block of blocks) {
      if (block.includes('-->')) {
        count++;
      }
    }
    
    return count;
  };

  const adjustSrtTimestamps = (srtContent: string, offsetSeconds: number, startIndex: number): string => {
    console.log(`[adjustSrtTimestamps] Called with offset=${offsetSeconds.toFixed(3)}s, startIndex=${startIndex}`);
    
    const lines = srtContent.split('\n');
    let adjustedLines = [];
    let currentIndex = startIndex;
    let timestampCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (/^\d+$/.test(line)) {
        adjustedLines.push(currentIndex.toString());
        currentIndex++;
      } else if (line.includes('-->')) {
        timestampCount++;
        const [startTime, endTime] = line.split('-->').map(t => t.trim());
        const originalStartSeconds = parseTimeToSeconds(startTime);
        const originalEndSeconds = parseTimeToSeconds(endTime);
        const newStartSeconds = originalStartSeconds + offsetSeconds;
        const newEndSeconds = originalEndSeconds + offsetSeconds;
        
        if (timestampCount === 1) {
          // Log first timestamp for debugging
          console.log(`[adjustSrtTimestamps] First entry: ${startTime} -> ${formatTime(newStartSeconds)} (offset: ${offsetSeconds.toFixed(3)}s)`);
        }
        
        adjustedLines.push(`${formatTime(newStartSeconds)} --> ${formatTime(newEndSeconds)}`);
      } else {
        adjustedLines.push(line);
      }
    }
    
    console.log(`[adjustSrtTimestamps] Adjusted ${timestampCount} timestamp entries`);
    return adjustedLines.join('\n');
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check both MIME type and file extension for better compatibility
      // Some browsers/systems report EPUB with different MIME types or empty string
      const isValidEpub = 
        file.type === 'application/epub+zip' || 
        file.name.toLowerCase().endsWith('.epub');
      
      if (isValidEpub) {
        setUploadedFile(file);
        reset(); // Reset any previous state
      } else {
        alert('Please upload a valid EPUB file.');
      }
    }
  }, [reset]);

  const handleSettingsChange = useCallback((key: keyof VideoSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Split long text into optimal chunks for TTS
   * Based on ModularTTS chunkText logic: maxLength = 1700 chars (conservative)
   */
  const chunkScriptLine = useCallback((text: string, maxLength: number = 1000): string[] => {
    if (!text || text.trim().length === 0) return [];
    
    if (text.length <= maxLength) {
      return [text];
    }
    
    // Split by sentence boundaries first
    const sentences = text.match(/[^.!?]+[.!?]*|[^.!?\s]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;
      
      // Check if adding this sentence would exceed maxLength
      const potentialChunk = currentChunk 
        ? (currentChunk + ' ' + trimmedSentence)
        : trimmedSentence;
      
      if (potentialChunk.length > maxLength && currentChunk) {
        // Save current chunk and start new one
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.trim().length > 0);
  }, []);

  const handleExtractChapters = useCallback(async () => {
    if (!uploadedFile) return;

    try {
      await extractChapters(uploadedFile);
      console.log('[EpubToVideo] Chapters extracted successfully:', chapters.length);
    } catch (err) {
      console.error('[EpubToVideo] Chapter extraction failed:', err);
    }
  }, [uploadedFile, extractChapters, chapters.length]);

  // Check cache status for a chapter
  const checkCacheStatus = useCallback(async (chapterIndex: number) => {
    const chapter = chapters.find(c => c.index === chapterIndex);
    if (!chapter || !uploadedFile) return;

    try {
      await videoCacheService.init();
      const cacheKey = await generateCacheKey({
        bookTitle: uploadedFile.name || 'Unknown',
        chapterIndex,
        content: chapter.content,
        settings
      });
      
      const status = await videoCacheService.getCacheStatus(cacheKey);
      setCacheStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(`${chapterIndex}`, status);
        return newMap;
      });
    } catch (error) {
      console.warn('[Cache] Failed to check cache status:', error);
    }
  }, [chapters, uploadedFile, settings]);

  // Clear cache for a chapter
  const clearChapterCache = useCallback(async (chapterIndex: number) => {
    const chapter = chapters.find(c => c.index === chapterIndex);
    if (!chapter || !uploadedFile) return;

    if (!confirm(`Clear cache for "${chapter.title}"?`)) return;

    try {
      await videoCacheService.init();
      const cacheKey = await generateCacheKey({
        bookTitle: uploadedFile.name || 'Unknown',
        chapterIndex,
        content: chapter.content,
        settings
      });
      
      await videoCacheService.clearCache(cacheKey);
      setCacheStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(`${chapterIndex}`, { hasCache: false, cacheSize: 0, cacheDate: null });
        return newMap;
      });
      alert('Cache cleared successfully');
    } catch (error) {
      console.error('[Cache] Failed to clear cache:', error);
      alert('Failed to clear cache');
    }
  }, [chapters, uploadedFile, settings]);

  // Add chapter to queue
  const addToQueue = useCallback((chapterIndex: number) => {
    const chapter = chapters.find(c => c.index === chapterIndex);
    if (!chapter) {
      console.error('[Queue] Chapter not found:', chapterIndex);
      return;
    }

    const queueItem: QueueItem = {
      id: `${Date.now()}-${chapterIndex}`,
      chapterIndex,
      chapterTitle: chapter.title,
      status: 'queued',
      progress: { stage: 'idle', percentage: 0, message: '' },
      estimatedDuration: chapter.estimatedDuration
    };

    setVideoQueue(prev => [...prev, queueItem]);
    console.log(`[Queue] Added "${chapter.title}" to queue`);
    
    // Check cache status when adding to queue
    checkCacheStatus(chapterIndex);
  }, [chapters, checkCacheStatus]);

  // Check cache status when chapters are loaded
  useEffect(() => {
    if (chapters.length > 0 && uploadedFile) {
      chapters.forEach(chapter => {
        checkCacheStatus(chapter.index);
      });
    }
  }, [chapters.length, uploadedFile, checkCacheStatus]);

  // Generate video for a specific queue item
  const generateVideoForQueueItem = useCallback(async (queueItem: QueueItem) => {
    const chapter = chapters.find(c => c.index === queueItem.chapterIndex);
    
    if (!chapter || !chapter.content) {
      throw new Error('Chapter content not available');
    }

    console.log(`[Video Generation] Starting video generation for chapter: ${chapter.title}`);
    console.log(`[Video Generation] Chapter content length: ${chapter.content.length}`);

    // Helper to update this specific queue item's progress
    const updateProgress = (progress: VideoProgress) => {
      setVideoQueue(prev => prev.map(item => 
        item.id === queueItem.id 
          ? { ...item, progress }
          : item
      ));
    };
    
    try {
      // Step 1: Generate script with Full Cast TTS
      const isMultiVoice = settings.useMultiVoice;
      updateProgress({
        stage: 'parsing',
        percentage: 20,
        message: isMultiVoice 
          ? 'Analyzing text with Full Cast...' 
          : 'Preparing text with single narrator...'
      });

      console.log(`[Video Generation] Sending full chapter text to Full Cast (${chapter.content.length} characters)`);
      console.log(`[Video Generation] Mode: ${isMultiVoice ? 'Multi-voice' : 'Single narrator'}`);
      console.log(`[Video Generation] About to call requestFullCast...`);

      let script;
      try {
        const result = await requestFullCast(chapter.content, { 
          llm: 'gemini-2.0-flash', 
          parser: isMultiVoice ? 'chatThread' : 'singleNarrator',
          useVoiceCasting: isMultiVoice
        });
        script = result.script;
        console.log(`[Video Generation] requestFullCast completed successfully`);
      } catch (error) {
        console.error(`[Video Generation] requestFullCast failed:`, error);
        throw new Error(`Full Cast API call failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      if (!script || script.length === 0) {
        throw new Error('No script generated');
      }

      console.log(`[Video Generation] Received ${script.length} script lines from Full Cast`);

      // Initialize cache service and generate cache key
      await videoCacheService.init();
      const cacheKey = await generateCacheKey({
        bookTitle: uploadedFile?.name || 'Unknown',
        chapterIndex: chapter.index,
        content: chapter.content,
        settings
      });
      console.log(`[Video Generation] Cache key: ${cacheKey}`);

      // Check cache before generating audio
      const cachedData = await videoCacheService.loadCache(cacheKey);
      let audioBlobs: Blob[] = [];
      let durations: number[] = [];
      let combinedSrt = '';
      let cumulativeDuration = 0;
      let sceneImageFiles: File[] = [];
      let useCachedAudio = false;
      let srtEntryCounts: number[] = [];  // Track SRT entry counts per chunk (accessible in both cached and non-cached paths)

      if (cachedData && cachedData.audioBlobs && cachedData.audioBlobs.length > 0) {
        console.log('[Video Generation] Using cached audio data');
        audioBlobs = cachedData.audioBlobs;
        durations = cachedData.durations || [];
        combinedSrt = cachedData.srtData || '';
        cumulativeDuration = cachedData.metadata?.totalDuration || durations.reduce((sum, d) => sum + d, 0);
        sceneImageFiles = cachedData.sceneImages || [];
        useCachedAudio = true;
        
        // Calculate SRT entry counts from cached SRT data
        // Parse combined SRT to count entries per chunk (approximate)
        // Note: This is an approximation since we don't have exact chunk boundaries in cached data
        srtEntryCounts = [];
        if (combinedSrt) {
          // Split by double newlines (actual newlines, not escaped string)
          // The SRT is stored with actual \n\n characters, not the string "\\n\\n"
          const chunkSrts = combinedSrt.split(/\n\n+/).filter(s => s.trim().length > 0);
          console.log(`[Video Generation] Split cached SRT into ${chunkSrts.length} chunks`);
          
          for (let i = 0; i < chunkSrts.length; i++) {
            const chunkSrt = chunkSrts[i];
            const count = countSrtEntries(chunkSrt);
            console.log(`[Video Generation] Cached chunk ${i}: ${count} SRT entries (preview: ${chunkSrt.substring(0, 50)}...)`);
            srtEntryCounts.push(count);
          }
          
          // Ensure we have counts for all chunks (pad with 0 if needed)
          while (srtEntryCounts.length < audioBlobs.length) {
            srtEntryCounts.push(0);
          }
          console.log(`[Video Generation] Calculated SRT entry counts from cache:`, srtEntryCounts);
          console.log(`[Video Generation] Total SRT entries counted: ${srtEntryCounts.reduce((sum, count) => sum + count, 0)}`);
        } else {
          // No SRT data, fill with zeros
          console.log(`[Video Generation] WARNING: No cached SRT data, filling with zeros`);
          for (let i = 0; i < audioBlobs.length; i++) {
            srtEntryCounts.push(0);
          }
        }
        
        updateProgress({
          stage: 'audio',
          percentage: 75,
          message: 'Using cached audio...'
        });
      }

      // Step 1.5: Start scene analysis in parallel (if enabled)
      // Use portable config if available
      let FULL_CAST_TTS_URL = 'http://localhost:4001';
      try {
        const { portableConfig } = await import('../config/portable');
        FULL_CAST_TTS_URL = portableConfig.fullCastTtsUrl;
      } catch (e) {
        FULL_CAST_TTS_URL = import.meta.env.VITE_FULL_CAST_TTS_URL || 'http://localhost:4001';
      }
      let sceneAnalysisPromise: Promise<any> | null = null;

      console.log('[Video Generation] Checking scene images setting:', {
        enableSceneImages: settings.enableSceneImages,
        fullSettings: settings
      });

      if (settings.enableSceneImages) {
        // Check if we have cached scene analysis
        if (cachedData && cachedData.sceneAnalysis) {
          console.log('[Video Generation] Using cached scene analysis, skipping API call');
          sceneAnalysisPromise = Promise.resolve(cachedData.sceneAnalysis);
        } else {
          // Call API only if not cached
        console.log('[Video Generation] Starting parallel scene analysis...');
        // Derive a stable style key from book title/file name
        const rawTitle = uploadedFile?.name || chapter.title || 'Unknown';
        const normalized = rawTitle.toLowerCase().replace(/[^a-z0-9\-]+/g, '-').replace(/^-+|-+$/g, '');
        const styleKey = `yoread-${normalized}`;

        sceneAnalysisPromise = fetch(`${FULL_CAST_TTS_URL}/api/analyze-scenes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: chapter.content,
            bookTitle: uploadedFile?.name || 'Unknown',
            chapter: chapter.title,
            maxScenes: Math.ceil(chapter.content.length / 1500), // Let LLM decide optimal scene count (no hard limit)
            bookTheme: 'atmospheric narrative',
            colorPalette: 'muted tones with dramatic contrasts',
            videoFormat: settings.format,
            styleKey,
            bibleMode: 'use',
            strictImageCompliance: true,
            detailLevel: 'high'
          })
        })
          .then(res => res.json())
          .catch(err => {
            console.warn('[Video Generation] Scene analysis failed:', err);
            return { scenes: [] };
          });
        }
      }

      // Step 2: Generate audio for each script line with SRT (batched parallel processing)
      // Skip if we have cached audio
      if (!useCachedAudio) {
      updateProgress({
        stage: 'audio',
        percentage: 50,
        message: 'Preparing audio generation...'
      });

      // Flatten all chunks into tasks with metadata
      interface TtsTask {
        lineIndex: number;
        chunkIndex: number;
        totalChunksForLine: number;
        text: string;
        provider?: string;
        voiceId?: string;
        lineDialogue: string;
      }

      const ttsTasks: TtsTask[] = [];
      for (let i = 0; i < script.length; i++) {
        const line = script[i];
        const textChunks = chunkScriptLine(line.dialogue);
        
        for (let chunkIdx = 0; chunkIdx < textChunks.length; chunkIdx++) {
          ttsTasks.push({
            lineIndex: i,
            chunkIndex: chunkIdx,
            totalChunksForLine: textChunks.length,
            text: textChunks[chunkIdx],
            provider: line.provider,
            voiceId: line.voiceId,
            lineDialogue: line.dialogue
          });
        }
      }

      console.log(`[Video Generation] Prepared ${ttsTasks.length} TTS tasks from ${script.length} script lines`);
      console.log(`[Video Generation] Processing with batch size of 3 (max concurrent requests)`);

      // Collect audio blobs and metadata
        audioBlobs = [];
        durations = [];
        combinedSrt = '';
        cumulativeDuration = 0;
        srtEntryCounts = [];  // Reset for non-cached audio generation

      // Process TTS tasks in batches of 3
      interface TtsResult {
        taskIndex: number;
        blob: Blob;
        duration: number;
        srtContent?: string;
        lineIndex: number;
        chunkIndex: number;
      }

      const allResults: TtsResult[] = [];
      const batchSize = 2;
      let completedTasks = 0;

      for (let i = 0; i < ttsTasks.length; i += batchSize) {
        const batch = ttsTasks.slice(i, i + batchSize);
        const batchPromises = batch.map(async (task, batchIdx) => {
          const taskIndex = i + batchIdx;
          try {
            const { blob, srtContent, duration } = await ttsForLine(
              task.text, 
              task.provider, 
              task.voiceId, 
              { includeSrt: true, includeTiming: true }
            );

            // Log chunk details
            console.log(`[Video Generation] Line ${task.lineIndex + 1}, Chunk ${task.chunkIndex + 1}/${task.totalChunksForLine} (Task ${taskIndex + 1}/${ttsTasks.length}):`);
            console.log(`  - Text length: ${task.text.length} chars`);
            console.log(`  - Audio blob size: ${blob.size} bytes`);
            console.log(`  - Duration: ${duration || 'undefined'} seconds`);
            console.log(`  - SRT content length: ${srtContent ? srtContent.length : 'undefined'} characters`);

            if (!blob || blob.size === 0) {
              console.error(`[Video Generation] Line ${task.lineIndex + 1}, Chunk ${task.chunkIndex + 1} returned empty blob!`);
              throw new Error(`Audio generation failed for line ${task.lineIndex + 1}, chunk ${task.chunkIndex + 1}`);
            }

            return {
              taskIndex,
              blob,
              duration: duration || 0,
              srtContent: srtContent || undefined,
              lineIndex: task.lineIndex,
              chunkIndex: task.chunkIndex
            };
          } catch (error) {
            console.error(`[Video Generation] Failed to generate audio for line ${task.lineIndex + 1}, chunk ${task.chunkIndex + 1}:`, error);
            throw error; // Don't continue with incomplete audio
          }
        });

        const batchResults = await Promise.all(batchPromises);
        allResults.push(...batchResults);
        
        // Update progress after each batch completes
        completedTasks += batchResults.length;
        const audioProgress = 50 + (completedTasks / ttsTasks.length) * 30;
        updateProgress({
          stage: 'audio',
          percentage: Math.round(audioProgress),
          message: `Generating audio ${completedTasks}/${ttsTasks.length}...`
        });
      }

      // Sort results by taskIndex to maintain original order
      allResults.sort((a, b) => a.taskIndex - b.taskIndex);

      // Process results in order and update cumulative tracking
      for (const result of allResults) {
        audioBlobs.push(result.blob);
        durations.push(result.duration);

        if (result.srtContent && result.duration > 0) {
          // Count SRT entries in this chunk (for sequence correlation)
          const srtEntryCount = countSrtEntries(result.srtContent);
          srtEntryCounts.push(srtEntryCount);
          console.log(`[Video Generation] Chunk ${audioBlobs.length}: ${srtEntryCount} SRT entries (preview: ${result.srtContent.substring(0, 50)}...)`);
          
          // Extract last SRT end time BEFORE adjustment to determine actual SRT span
          const lastSrtEndTime = extractLastSrtEndTime(result.srtContent);
          
          // Adjust SRT timestamps for this chunk
          const adjustedSrt = adjustSrtTimestamps(
            result.srtContent, 
            cumulativeDuration, 
            audioBlobs.length  // Use total chunk index
          );
          
          combinedSrt += adjustedSrt + '\n\n';
          
          // CRITICAL FIX: Use ACTUAL AUDIO DURATION to advance cumulative duration
          // SRT end time may be shorter than audio due to gaps/pauses, causing drift accumulation
          // Using audio duration ensures accurate timing tracking and prevents drift
          if (lastSrtEndTime !== null) {
            // Use actual audio duration, not SRT end time, to prevent drift
            cumulativeDuration += result.duration;
            
            const srtSpan = lastSrtEndTime;
            const adjustedLastEndTime = lastSrtEndTime + (cumulativeDuration - result.duration);
            console.log(`[Video Generation] Line ${result.lineIndex + 1}, Chunk ${result.chunkIndex + 1} added: audio=${result.duration}s, SRT span=${srtSpan.toFixed(3)}s, total=${cumulativeDuration.toFixed(2)}s`);
          } else {
            // Fallback to audio duration if SRT extraction fails
            cumulativeDuration += result.duration;
            console.log(`[Video Generation] Line ${result.lineIndex + 1}, Chunk ${result.chunkIndex + 1} added: duration=${result.duration}s (fallback, SRT extraction failed), total=${cumulativeDuration.toFixed(2)}s`);
          }
        } else if (result.duration > 0) {
          // No SRT content for this chunk
          srtEntryCounts.push(0);
          cumulativeDuration += result.duration;
          console.log(`[Video Generation] Line ${result.lineIndex + 1}, Chunk ${result.chunkIndex + 1} added (no SRT): duration=${result.duration}s, total=${cumulativeDuration.toFixed(2)}s`);
        } else {
          srtEntryCounts.push(0);
          console.warn(`[Video Generation] Line ${result.lineIndex + 1}, Chunk ${result.chunkIndex + 1} missing both data: duration=${result.duration}, srtContent=${!!result.srtContent}`);
        }
      }

      console.log('[Video Generation] Audio collection complete:');
      console.log(`  - Total chunks: ${audioBlobs.length}`);
      console.log(`  - Individual sizes:`, audioBlobs.map(b => b.size));
      console.log(`  - Total duration: ${cumulativeDuration}s`);

        // Save to cache after successful generation (non-blocking)
        const cacheData = {
          audioBlobs,
          durations,
          srtData: combinedSrt,
          sceneImages: sceneImageFiles.length > 0 ? sceneImageFiles : undefined,
          metadata: {
            bookTitle: uploadedFile?.name || 'Unknown',
            chapterTitle: chapter.title,
            totalDuration: cumulativeDuration,
            chunkCount: audioBlobs.length,
            timestamp: Date.now(),
            version: 'v1'
          }
        };
        
        // Save cache (non-blocking, won't throw errors)
        videoCacheService.saveCacheSafe(cacheKey, cacheData).then(success => {
          if (success) {
            console.log('[Video Generation] Cache saved successfully');
            // Update cache status in UI
            checkCacheStatus(chapter.index);
          } else {
            console.warn('[Video Generation] Cache save failed (non-critical)');
          }
        });
      } else {
        console.log('[Video Generation] Using cached audio, skipping generation');
        console.log(`  - Total chunks: ${audioBlobs.length}`);
        console.log(`  - Total duration: ${cumulativeDuration}s`);
      }
      
      // Phase 2: Log chunk metadata before upload
      console.log(`[Video Generation] Preparing to upload ${audioBlobs.length} audio chunks`);
      let totalSize = 0;
      audioBlobs.forEach((blob, i) => {
        totalSize += blob.size;
        console.log(`[Video Generation] Chunk ${i}: ${blob.size} bytes (${(blob.size/1024/1024).toFixed(2)} MB), duration=${durations[i]?.toFixed(2) || 'unknown'}s`);
      });
      console.log(`[Video Generation] Total audio size: ${totalSize} bytes (${(totalSize/1024/1024).toFixed(2)} MB)`);

      // Validation before sending to Python server
      if (cumulativeDuration === 0) {
        throw new Error('No audio duration calculated - audio generation may have failed');
      }

      if (!combinedSrt || combinedSrt.trim().length === 0) {
        console.warn('No SRT data generated - video will use basic timing');
      }

      // Step 2.5: Generate scene images (if enabled) or reconstruct metadata from cache
      let sceneImages: any[] = [];

      if (settings.enableSceneImages && sceneAnalysisPromise) {
        try {
          // Await scene analysis (needed even when using cached audio for metadata)
          const sceneAnalysisResult = await sceneAnalysisPromise;
          const { scenes } = sceneAnalysisResult;
          console.log('[Video Generation] Scene analysis complete:', scenes.length, 'scenes');

          // Save scene analysis to cache if it was generated (not from cache)
          if (!useCachedAudio || !cachedData?.sceneAnalysis) {
            // Scene analysis was just generated, save it to cache
            if (scenes && scenes.length > 0) {
              const updatedCacheData = {
                audioBlobs,
                durations,
                srtData: combinedSrt,
                sceneImages: sceneImageFiles.length > 0 ? sceneImageFiles : undefined,
                sceneAnalysis: { scenes },
                metadata: {
                  bookTitle: uploadedFile?.name || 'Unknown',
                  chapterTitle: chapter.title,
                  totalDuration: cumulativeDuration,
                  chunkCount: audioBlobs.length,
                  timestamp: Date.now(),
                  version: 'v1'
                }
              };
              videoCacheService.saveCacheSafe(cacheKey, updatedCacheData).catch(err => {
                console.warn('[Video Generation] Failed to save scene analysis to cache:', err);
              });
            }
          }

          if (useCachedAudio && sceneImageFiles.length > 0) {
            // Reconstruct scene images metadata from cached files and scene analysis
            console.log('[Video Generation] Reconstructing scene images metadata from cache...');
            sceneImages = sceneImageFiles.map((file, index) => {
              // Try to match cached file to scene by index or filename
              const matchingScene = scenes[index] || scenes.find((s: any) => 
                file.name.includes(s.anchor_text?.substring(0, 20) || '') || 
                file.name.includes(`scene-${index}`)
              );
              return {
                sceneIndex: index,
                filename: file.name,
                mimeType: file.type || 'image/png',
                anchor_text: matchingScene?.anchor_text || ''
              };
            });
            console.log(`[Video Generation] Reconstructed metadata for ${sceneImages.length} cached scene images`);
          } else if (scenes.length > 0) {
            // Generate images if we have scenes but no cached images
            // (regardless of whether audio is cached)
        updateProgress({
          stage: 'audio',
          percentage: 75,
          message: 'Generating scene images...'
        });

            // Generate images for scenes
            const imageResponse = await fetch(`${FULL_CAST_TTS_URL}/api/generate-scene-images`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                scenes,
                videoFormat: settings.format,
                // Inform image generator about split layout so it chooses a column-friendly ratio
                sceneLayout: settings.style === 'split' ? 'split' : 'overlay',
                imageAspect: settings.style === 'split' ? '3:4' : undefined,
                // Reuse saved anchors for consistency
                styleKey: `yoread-${(uploadedFile?.name || chapter.title || 'Unknown').toLowerCase().replace(/[^a-z0-9\\-]+/g, '-').replace(/^-+|-+$/g, '')}`,
                useSavedReferences: true
              })
            });

            if (imageResponse.ok) {
              const imageResult = await imageResponse.json();
              sceneImages = imageResult.images || [];
              console.log('[Video Generation] Generated images:', sceneImages.length);

              // Download images from Full Cast TTS server
              for (const img of sceneImages) {
                try {
                  const imgUrl = `${FULL_CAST_TTS_URL}/${img.filename}`;
                  const imgResponse = await fetch(imgUrl);
                  if (imgResponse.ok) {
                    const blob = await imgResponse.blob();
                    const file = new File([blob], img.filename, { type: img.mimeType || 'image/png' });
                    sceneImageFiles.push(file);
                  }
                } catch (err) {
                  console.warn(`Failed to download image ${img.filename}:`, err);
                }
              }
            }
          }
        } catch (error) {
          console.warn('[Video Generation] Scene analysis/image generation error:', error);
          // Continue without images
        }
      }

      console.log(`[Video Generation] Sending to Python server:`);
      console.log(`  - Audio chunks: ${audioBlobs.length}`);
      console.log(`  - Total duration: ${cumulativeDuration.toFixed(2)}s`);
      console.log(`  - SRT data length: ${combinedSrt.length} characters`);
      console.log(`  - SRT segments: ${combinedSrt.split(/\n\n+/).length}`);
      console.log(`  - Scene images: ${sceneImages.length}`);

      // Step 3: Send to Python server for video generation
      updateProgress({
        stage: 'video',
        percentage: 80,
        message: 'Generating video...'
      });

      console.log(`[Video Generation] Sending to Python server`);
      console.log(`[Video Generation] Audio duration: ${cumulativeDuration}s`);
      console.log(`[Video Generation] SRT segments: ${combinedSrt.split(/\n\n+/).length}`);

      console.log(`[Video Generation] Sending ${audioBlobs.length} individual audio chunks`);

      // Estimate FormData size (rough calculation)
      const estimatedFormDataSize = totalSize + combinedSrt.length + chapter.content.length;
      console.log(`[Video Generation] Estimated FormData size: ~${(estimatedFormDataSize/1024/1024).toFixed(2)} MB`);
      if (estimatedFormDataSize > 100 * 1024 * 1024) {
        console.warn(`⚠️  WARNING: FormData size (${(estimatedFormDataSize/1024/1024).toFixed(2)} MB) exceeds typical FastAPI limit (100 MB)`);
      }

      const formData = new FormData();
      
      // Send individual audio chunks instead of combining them
      audioBlobs.forEach((blob, index) => {
        console.log(`[Video Generation] Appending chunk ${index} to FormData: ${blob.size} bytes`);
        formData.append('audio_chunks', blob, `audio_${index}.mp3`);
      });
      
      // Send metadata about each chunk (including SRT entry counts for course correction)
      const audioMetadata = audioBlobs.map((blob, index) => ({
        index,
        size: blob.size,
        duration: durations[index] || 0,
        srtEntryCount: srtEntryCounts[index] || 0  // NEW: SRT entry count per chunk for sequence correlation
      }));
      formData.append('audio_metadata', JSON.stringify(audioMetadata));
      console.log(`[Video Generation] Sending SRT entry counts:`, srtEntryCounts);
      
      formData.append('text', chapter.content);
      formData.append('srt_data', combinedSrt);
      
      // CRITICAL FIX: Use actual audio duration (sum of durations) instead of SRT-based cumulativeDuration
      // The cumulativeDuration is used for SRT timeline continuity, but can be wrong if SRT contains
      // malformed entries (like JSON). The actual audio durations are always accurate.
      const actualTotalDuration = durations.reduce((sum, d) => sum + d, 0);
      formData.append('total_duration', actualTotalDuration.toString());
      
      // Log both for debugging
      console.log(`[Video Generation] SRT-based cumulative duration: ${cumulativeDuration.toFixed(2)}s`);
      console.log(`[Video Generation] Actual audio duration (sum): ${actualTotalDuration.toFixed(2)}s`);
      console.log(`[Video Generation] Using actual audio duration for video generation`);
      formData.append('book_title', uploadedFile?.name || 'Unknown');
      formData.append('chapter_title', chapter.title);
      formData.append('author', 'Unknown Author');
      formData.append('format', settings.format);
      formData.append('style', settings.style);
      formData.append('highlight_mode', settings.highlightMode);
      // New split layout controls for Python backend
      formData.append('scene_layout', settings.style === 'split' ? 'split' : 'overlay');
      formData.append('image_side', 'left'); // change to 'right' to flip columns

      // Add scene images if available
      if (sceneImages.length > 0) {
        // Add metadata
        formData.append('scene_images_metadata', JSON.stringify(sceneImages.map(img => ({
          sceneIndex: img.sceneIndex,
          filename: img.filename,
          mimeType: img.mimeType,
          anchor_text: img.anchor_text
        }))));

        // Add image files
        sceneImageFiles.forEach(file => {
          formData.append('scene_image_files', file);
        });

        console.log(`[Video Generation] Added ${sceneImages.length} scene images to FormData`);
      }

      // Use portable config for video generator URL
      let videoGeneratorUrl = 'http://localhost:8000';
      try {
        const { portableConfig } = await import('../config/portable');
        videoGeneratorUrl = portableConfig.videoGeneratorUrl;
      } catch (e) {
        videoGeneratorUrl = import.meta.env.VITE_VIDEO_GENERATOR_URL || 'http://localhost:8000';
      }
      
      const response = await fetch(`${videoGeneratorUrl}/generate-video`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Video generation failed: ${response.statusText}`);
      }

      // Step 4: Download the generated video
      updateProgress({
        stage: 'complete',
        percentage: 100,
        message: 'Video generated successfully!'
      });

      const videoBlob = await response.blob();
      const videoUrl = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `${chapter.title}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(videoUrl);

      console.log('[Video Generation] Video generated and downloaded successfully');
    } catch (error) {
      console.error('[Video Generation] Failed:', error);
      throw error; // Re-throw to mark queue item as failed
    }
  }, [chapters, uploadedFile, settings]);

  // Process queue sequentially
  const processQueue = useCallback(async () => {
    if (isProcessingQueue) {
      console.log('[Queue] Already processing, skipping');
      return;
    }

    setIsProcessingQueue(true);
    console.log('[Queue] Starting queue processing');

    try {
      while (true) {
        // Get fresh queue state each iteration to avoid stale closures
        const currentQueueState = await new Promise<QueueItem[]>(resolve => {
          setVideoQueue(queue => {
            resolve(queue);
            return queue;
          });
        });

        // Find next queued item from FRESH state
        const nextItem = currentQueueState.find(item => item.status === 'queued');
        
        if (!nextItem) {
          console.log('[Queue] No more items to process');
          break;
        }

        console.log(`[Queue] Processing: ${nextItem.chapterTitle}`);
        setCurrentProcessingId(nextItem.id);

        // Mark as processing
        setVideoQueue(prev => prev.map(item => 
          item.id === nextItem.id 
            ? { ...item, status: 'processing' as const }
            : item
        ));

        // Wait for state to update
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
          // Generate video for this item
          await generateVideoForQueueItem(nextItem);
          
          // Mark as completed
          console.log(`[Queue] ✓ Completed: ${nextItem.chapterTitle}`);
          setVideoQueue(prev => prev.map(item => 
            item.id === nextItem.id 
              ? { 
                  ...item, 
                  status: 'completed' as const,
                  progress: { stage: 'complete', percentage: 100, message: 'Complete!' }
                }
              : item
          ));

          // Wait for state update before next iteration
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          // Mark as failed - STOP processing queue
          console.error(`[Queue] ✗ Failed: ${nextItem.chapterTitle}`, error);
          setVideoQueue(prev => prev.map(item => 
            item.id === nextItem.id 
              ? { 
                  ...item, 
                  status: 'failed' as const,
                  error: error instanceof Error ? error.message : String(error),
                  progress: { stage: 'idle', percentage: 0, message: 'Failed' }
                }
              : item
          ));
          
          // STOP processing on failure
          console.log('[Queue] Stopped due to failure');
          break;
        }
      }
    } finally {
      setIsProcessingQueue(false);
      setCurrentProcessingId(null);
      console.log('[Queue] Queue processing ended');
    }
  }, [generateVideoForQueueItem, isProcessingQueue]);

  // Auto-start queue when items are added (only when queue length changes)
  const queueLengthRef = useRef(videoQueue.length);
  const hasQueuedRef = useRef(false);
  
  useEffect(() => {
    const queuedItems = videoQueue.filter(item => item.status === 'queued');
    const hasQueuedItems = queuedItems.length > 0;
    
    // Only trigger if:
    // 1. We have queued items AND
    // 2. (Queue length changed OR we didn't have queued items before) AND
    // 3. Not already processing
    const shouldStart = hasQueuedItems && 
                       (queueLengthRef.current !== videoQueue.length || !hasQueuedRef.current) &&
                       !isProcessingQueue;
    
    queueLengthRef.current = videoQueue.length;
    hasQueuedRef.current = hasQueuedItems;
    
    if (shouldStart) {
      console.log('[Queue] Auto-starting queue processing');
      processQueue();
    }
  }, [videoQueue.length, isProcessingQueue, processQueue]);

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO 
        title="EPUB to Video Generator - YoRead (Free)"
        description="Transform your EPUB books into engaging videos with AI voices and synchronized text highlighting - completely free!"
        keywords={['epub to video', 'ebook video', 'video generator', 'AI voices', 'text to video', 'free video converter']}
        url="https://yoread.com/epub-to-video"
      />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-xl font-semibold text-gray-800 flex items-center">
                <ArrowLeft className="w-5 h-5 mr-2" />
                YoRead
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600">EPUB to Video</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-red-100 p-3 rounded-full">
              <Video className="w-8 h-8 text-red-800" />
            </div>
          </div>
          <div className="flex items-center justify-center mb-3">
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mr-3">
              EPUB to Video Generator
            </h1>
            <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
              FREE
            </span>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform your EPUB books into engaging videos with AI voices, synchronized text highlighting, 
            and professional quality. <span className="font-semibold text-green-700">Completely free to use!</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* File Upload Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-red-800" />
                Upload Your EPUB
                <span className="ml-2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                  FREE
                </span>
              </h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-400 transition-colors">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <div className="space-y-3">
                  <div>
                    <label htmlFor="epub-upload" className="cursor-pointer">
                      <span className="text-base font-medium text-gray-700">
                        {uploadedFile ? uploadedFile.name : 'Choose EPUB file or drag & drop'}
                      </span>
                    </label>
                    <input
                      id="epub-upload"
                      type="file"
                      accept=".epub,application/epub+zip"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Supported formats: EPUB files up to 50MB
                  </p>
                </div>
              </div>

              {uploadedFile && (
                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      <span className="text-green-800 font-medium text-sm">
                        {uploadedFile.name} uploaded successfully
                      </span>
                    </div>
                  </div>
                  
                  {chapters.length === 0 && (
                    <button
                      onClick={handleExtractChapters}
                      disabled={isInitializing}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      {isInitializing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Extracting Chapters...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Extract Chapters
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Chapters List with Queue */}
            {chapters.length > 0 && (
              <div className="space-y-6">
                {/* Chapters List */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-red-800" />
                  Chapters ({chapters.length})
                </h3>
                
                <div className="space-y-3">
                  {chapters.map((chapter) => {
                      const queueItem = videoQueue.find(item => item.chapterIndex === chapter.index);
                      const isInQueue = !!queueItem;
                      const isProcessing = queueItem?.status === 'processing';
                      
                    return (
                        <div key={chapter.index} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {chapter.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                                {chapter.content.length} characters • ~{formatDuration(chapter.estimatedDuration)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {chapter.content.substring(0, 100)}...
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                              {!isInQueue ? (
                          <button
                                  onClick={() => addToQueue(chapter.index)}
                                  className="flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs"
                                >
                                <Video className="w-3 h-3 mr-1" />
                                  Add to Queue
                          </button>
                              ) : (
                                <span className={`px-3 py-1 rounded-md text-xs font-medium ${
                                  queueItem.status === 'queued' ? 'bg-gray-200 text-gray-700' :
                                  queueItem.status === 'processing' ? 'bg-blue-200 text-blue-700' :
                                  queueItem.status === 'completed' ? 'bg-green-200 text-green-700' :
                                  'bg-red-200 text-red-700'
                                }`}>
                                  {queueItem.status === 'queued' && '⏳ Queued'}
                                  {queueItem.status === 'processing' && '⚙️ Processing'}
                                  {queueItem.status === 'completed' && '✓ Complete'}
                                  {queueItem.status === 'failed' && '✗ Failed'}
                                </span>
                              )}
                            </div>
                        </div>
                        
                          {/* Progress Bar */}
                          {isProcessing && queueItem.progress.percentage > 0 && (
                            <div className="mt-3">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${queueItem.progress.percentage}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                                {queueItem.progress.message}
                            </p>
                          </div>
                        )}

                          {/* Error Message */}
                          {queueItem?.status === 'failed' && queueItem.error && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                              {queueItem.error}
                          </div>
                        )}

                          {/* Cache Status */}
                          {(() => {
                            const cacheStatus = cacheStatuses.get(`${chapter.index}`);
                            if (cacheStatus?.hasCache) {
                              return (
                                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="text-green-700 font-medium">✓ Cached</span>
                                      <span className="text-green-600 ml-2">
                                        {(cacheStatus.cacheSize / 1024 / 1024).toFixed(2)} MB
                                      </span>
                                      {cacheStatus.cacheDate && (
                                        <span className="text-green-500 ml-2">
                                          ({new Date(cacheStatus.cacheDate).toLocaleDateString()})
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => clearChapterCache(chapter.index)}
                                      className="text-red-600 hover:text-red-800 underline text-xs"
                                      title="Clear cache for this chapter"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                      </div>
                    );
                  })}
                  </div>
                </div>

                {/* Queue Summary Panel */}
                {videoQueue.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Queue Status
                    </h3>
                    
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-gray-700">
                          {videoQueue.filter(i => i.status === 'queued').length}
                        </div>
                        <div className="text-xs text-gray-500">Queued</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {videoQueue.filter(i => i.status === 'processing').length}
                        </div>
                        <div className="text-xs text-gray-500">Processing</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {videoQueue.filter(i => i.status === 'completed').length}
                        </div>
                        <div className="text-xs text-gray-500">Completed</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {videoQueue.filter(i => i.status === 'failed').length}
                        </div>
                        <div className="text-xs text-gray-500">Failed</div>
                      </div>
                    </div>
                    
                    {isProcessingQueue && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center">
                          <Loader2 className="w-4 h-4 text-blue-600 mr-2 animate-spin" />
                          <span className="text-blue-800 font-medium text-sm">
                            Processing queue... ({videoQueue.filter(i => i.status === 'completed').length}/{videoQueue.length} complete)
                          </span>
                </div>
                      </div>
                    )}
                    
                    {/* Clear Queue Button */}
                    <button
                      onClick={() => {
                        if (confirm('Clear all queue items?')) {
                          setVideoQueue([]);
                        }
                      }}
                      disabled={isProcessingQueue}
                      className="mt-4 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm disabled:opacity-50"
                    >
                      Clear Queue
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Settings Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-red-800" />
                Video Settings
              </h3>
              
              <div className="space-y-6">
                {/* Video Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video Format
                  </label>
                  <select
                    value={settings.format}
                    onChange={(e) => handleSettingsChange('format', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  >
                    <option value="youtube">YouTube (1920x1080)</option>
                    <option value="mobile">Mobile (1080x1920)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {settings.format === 'youtube' 
                      ? 'Horizontal format for YouTube, TikTok, etc.' 
                      : 'Vertical format for Instagram Stories, TikTok, etc.'
                    }
                  </p>
                </div>

                {/* Video Style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video Style
                  </label>
                  <select
                    value={settings.style}
                    onChange={(e) => handleSettingsChange('style', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  >
                    <option value="ereader">Full Screen (Scene + Text Overlay)</option>
                    <option value="split">Split Screen (Image Left, Text Right)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {settings.style === 'ereader' 
                      ? 'Scene image as background with semi-transparent text container' 
                      : 'Scene image on left half, text container on right half'
                    }
                  </p>
                </div>

                {/* Highlighting Mode Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text Highlighting
                  </label>
                  <select
                    value={settings.highlightMode}
                    onChange={(e) => handleSettingsChange('highlightMode', e.target.value as 'none' | 'sentence' | 'word')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">No Highlighting</option>
                    <option value="sentence">Sentence-Level (Current sentence only)</option>
                    <option value="word">Word-Level (Each word as spoken)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {settings.highlightMode === 'sentence' && 'Highlights the current sentence being spoken'}
                    {settings.highlightMode === 'word' && 'Highlights each word as it is spoken'}
                    {settings.highlightMode === 'none' && 'No text highlighting'}
                  </p>
                </div>

                {/* Scene Images Toggle */}
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.enableSceneImages}
                      onChange={(e) => {
                        console.log('[Settings] enableSceneImages checkbox changed to:', e.target.checked);
                        setSettings(prev => ({
                          ...prev,
                          enableSceneImages: e.target.checked
                        }));
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      Add AI-generated scene images
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Automatically adds atmospheric background images to your video
                  </p>
                </div>

                {/* Multi-Voice Casting Toggle */}
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.useMultiVoice}
                      onChange={(e) => {
                        console.log('[Settings] useMultiVoice checkbox changed to:', e.target.checked);
                        setSettings(prev => ({
                          ...prev,
                          useMultiVoice: e.target.checked
                        }));
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      Multi-Voice Casting
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Enable to assign different voices to different characters. Disable for single narrator mode.
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  AI-powered voices
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Synchronized text highlighting
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Multiple voice characters
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  YouTube & Mobile formats
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  High-quality video output
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span className="font-semibold text-green-700">100% Free to use</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EpubToVideo;
