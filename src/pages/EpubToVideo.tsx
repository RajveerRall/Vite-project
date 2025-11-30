import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, Settings, FileText, Video, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/Common/SEO';
import { useEpubExtraction } from '../hooks/useEpubExtraction';
import { requestFullCast, ttsForLine, type DialogueLine } from '../services/fullCastTTS';
import { videoCacheService } from '../services/VideoCacheService';
import { videoStorageService } from '../services/VideoStorageService';
import { generateCacheKey } from '../utils/cacheKeyGenerator';

interface VideoSettings {
  format: 'youtube' | 'mobile';
  style: 'ereader' | 'split';
  highlightMode: 'none' | 'sentence' | 'word';  // Changed from enableHighlight boolean
  enableSceneImages: boolean;  // NEW: Toggle for AI-generated scene images
  useMultiVoice: boolean;  // NEW: Toggle for multi-voice casting
  showText: boolean;  // NEW: Toggle for showing text in video
  useSttSrt: boolean;  // NEW: Use STT-generated SRT for accurate text sync
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
  savedPath?: string; // Path where video was saved
}

const EpubToVideo: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<VideoSettings>({
    format: 'youtube',
    style: 'ereader',
    highlightMode: 'none',  // Default to no highlighting
    enableSceneImages: true,  // Default: AI scene images enabled
    useMultiVoice: true,  // Default: Multi-voice casting enabled
    showText: true,  // Default: Show text in video
    useSttSrt: false  // Default: Use TTS-provided SRT (set to true for STT-based SRT)
  });
  // Queue state
  const [videoQueue, setVideoQueue] = useState<QueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [_currentProcessingId, setCurrentProcessingId] = useState<string | null>(null);
  const [cacheStatuses, setCacheStatuses] = useState<Map<string, { hasCache: boolean; cacheSize: number; cacheDate: Date | null }>>(new Map());
  // Merge state
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState({ percentage: 0, message: '' });
  const [directoryAccessGranted, setDirectoryAccessGranted] = useState(false);

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
   * FIXED: Now handles sentences that individually exceed maxLength by splitting them by words
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
      
      // FIX: If a single sentence exceeds maxLength, split it by words
      if (trimmedSentence.length > maxLength) {
        // First, save current chunk if it exists
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // Split the long sentence by words
        const words = trimmedSentence.split(/\s+/);
        let wordChunk = '';
        
        for (const word of words) {
          const potentialWordChunk = wordChunk 
            ? (wordChunk + ' ' + word)
            : word;
          
          if (potentialWordChunk.length > maxLength && wordChunk) {
            chunks.push(wordChunk.trim());
            wordChunk = word;
          } else {
            wordChunk = potentialWordChunk;
          }
        }
        
        // Add remaining word chunk
        if (wordChunk.trim()) {
          currentChunk = wordChunk.trim();
        }
        continue;
      }
      
      // Normal case: sentence fits within limit
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
    
    // Add remaining chunk (but check it's not too long)
    if (currentChunk.trim()) {
      if (currentChunk.trim().length > maxLength) {
        // Final safety check: split if still too long
        const words = currentChunk.trim().split(/\s+/);
        let wordChunk = '';
        for (const word of words) {
          const potential = wordChunk ? (wordChunk + ' ' + word) : word;
          if (potential.length > maxLength && wordChunk) {
            chunks.push(wordChunk.trim());
            wordChunk = word;
          } else {
            wordChunk = potential;
          }
        }
        if (wordChunk.trim()) {
          chunks.push(wordChunk.trim());
        }
      } else {
        chunks.push(currentChunk.trim());
      }
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

      // Check for duplicate script lines
      const scriptTexts = script.map((line: DialogueLine) => line.dialogue);
      const duplicateLines: number[] = [];
      const seenTexts = new Map<string, number[]>();
      scriptTexts.forEach((text: string, idx: number) => {
        if (!seenTexts.has(text)) {
          seenTexts.set(text, [idx]);
        } else {
          seenTexts.get(text)!.push(idx);
          if (seenTexts.get(text)!.length === 2) {
            duplicateLines.push(...seenTexts.get(text)!);
          } else {
            duplicateLines.push(idx);
          }
        }
      });
      if (duplicateLines.length > 0) {
        console.warn(`[Video Generation] ⚠️  Found ${duplicateLines.length} duplicate script lines!`);
        console.warn(`[Video Generation] Duplicate line indices:`, duplicateLines);
        // Show first 5 duplicates
        duplicateLines.slice(0, 5).forEach(idx => {
          console.warn(`  - Line ${idx + 1}: "${scriptTexts[idx].substring(0, 80)}..."`);
        });
      } else {
        console.log(`[Video Generation] ✓ No duplicate script lines found`);
      }

      // Initialize cache service and generate cache key
      await videoCacheService.init();
      const cacheKey = await generateCacheKey({
        bookTitle: uploadedFile?.name || 'Unknown',
        chapterIndex: chapter.index,
        content: chapter.content,
        settings
      });
      console.log(`[Video Generation] Cache key: ${cacheKey}`);
      console.log(`[Video Generation] Chapter index: ${chapter.index}, Chapter title: ${chapter.title}`);

      // Check cache before generating audio
      const cachedData = await videoCacheService.loadCache(cacheKey);
      
      // Diagnostic: Verify cached data belongs to this chapter
      if (cachedData && cachedData.metadata) {
        console.log(`[Video Generation] Cached data metadata:`, {
          bookTitle: cachedData.metadata.bookTitle,
          chapterTitle: cachedData.metadata.chapterTitle,
          chunkCount: cachedData.metadata.chunkCount,
          totalDuration: cachedData.metadata.totalDuration,
          timestamp: cachedData.metadata.timestamp ? new Date(cachedData.metadata.timestamp).toISOString() : 'unknown'
        });
        // Verify cache belongs to this chapter
        if (cachedData.metadata.chapterTitle !== chapter.title) {
          console.error(`[Video Generation] ⚠️  CACHE MISMATCH! Cached chapter "${cachedData.metadata.chapterTitle}" does not match current chapter "${chapter.title}"`);
        }
        if (cachedData.audioBlobs) {
          console.log(`[Video Generation] Cached audio blobs count: ${cachedData.audioBlobs.length}`);
          // Log first few blob sizes to detect duplicates
          cachedData.audioBlobs.slice(0, 5).forEach((blob, i) => {
            console.log(`[Video Generation] Cached blob ${i}: ${blob.size} bytes`);
          });
        }
      }
      
      let audioBlobs: Blob[] = [];
      console.log(`[Video Generation] Initialized audioBlobs as empty array (length: ${audioBlobs.length})`);
      let durations: number[] = [];
      let combinedSrt = '';
      let cumulativeDuration = 0;
      let sceneImageFiles: File[] = [];
      let useCachedAudio = false;
      let srtEntryCounts: number[] = [];  // Track SRT entry counts per chunk (accessible in both cached and non-cached paths)

      if (cachedData && cachedData.audioBlobs && cachedData.audioBlobs.length > 0) {
        console.log('[Video Generation] Using cached audio data');
        console.log(`[Video Generation] BEFORE assignment: audioBlobs.length = ${audioBlobs.length}`);
        audioBlobs = cachedData.audioBlobs;
        console.log(`[Video Generation] AFTER assignment: audioBlobs.length = ${audioBlobs.length}`);
        
        // Check for duplicate blob sizes (potential duplicates)
        const blobSizes = audioBlobs.map(b => b.size);
        const sizeCounts = new Map<number, number>();
        blobSizes.forEach(size => {
          sizeCounts.set(size, (sizeCounts.get(size) || 0) + 1);
        });
        const duplicates = Array.from(sizeCounts.entries()).filter(([, count]) => count > 1);
        if (duplicates.length > 0) {
          console.warn(`[Video Generation] ⚠️  Found ${duplicates.length} duplicate blob sizes in cached audio!`);
          duplicates.slice(0, 5).forEach(([size, count]) => {
            const indices = blobSizes.map((s, idx) => s === size ? idx : -1).filter(idx => idx >= 0);
            console.warn(`  - Size ${size} bytes appears ${count} times at indices: ${indices.slice(0, 10).join(', ')}`);
          });
        }
        
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

        sceneAnalysisPromise = (async () => {
          const makeRequest = async () => {
            const response = await fetch(`${FULL_CAST_TTS_URL}/api/analyze-scenes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: chapter.content,
                bookTitle: uploadedFile?.name || 'Unknown',
                chapter: chapter.title,
                maxScenes: null, // Let LLM decide optimal scene count based on content
                bookTheme: 'atmospheric narrative',
                colorPalette: 'muted tones with dramatic contrasts',
                videoFormat: settings.format,
                styleKey,
                bibleMode: 'use',
                strictImageCompliance: true,
                detailLevel: 'high'
              })
            });
            
            if (!response.ok) {
              throw new Error(`Scene analysis API returned ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
          };

          try {
            // First attempt
            return await makeRequest();
          } catch (err) {
            console.warn('[Video Generation] Scene analysis failed (attempt 1):', err);
            console.log('[Video Generation] Retrying scene analysis...');
            
            try {
              // Retry once with 1 second delay
              await new Promise(resolve => setTimeout(resolve, 1000));
              return await makeRequest();
            } catch (retryErr) {
              console.warn('[Video Generation] Scene analysis failed (retry attempt):', retryErr);
              return { scenes: [] }; // Fallback to empty scenes
            }
          }
        })();
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

      // Check for duplicate TTS task text
      const taskTexts = ttsTasks.map(task => task.text);
      const duplicateTasks: number[] = [];
      const seenTaskTexts = new Map<string, number[]>();
      taskTexts.forEach((text, idx) => {
        if (!seenTaskTexts.has(text)) {
          seenTaskTexts.set(text, [idx]);
        } else {
          seenTaskTexts.get(text)!.push(idx);
          if (seenTaskTexts.get(text)!.length === 2) {
            duplicateTasks.push(...seenTaskTexts.get(text)!);
          } else {
            duplicateTasks.push(idx);
          }
        }
      });
      if (duplicateTasks.length > 0) {
        console.warn(`[Video Generation] ⚠️  Found ${duplicateTasks.length} duplicate TTS tasks!`);
        console.warn(`[Video Generation] Duplicate task indices:`, duplicateTasks.slice(0, 10));
        // Show first 3 duplicates
        duplicateTasks.slice(0, 3).forEach(idx => {
          const task = ttsTasks[idx];
          console.warn(`  - Task ${idx} (Line ${task.lineIndex + 1}, Chunk ${task.chunkIndex + 1}): "${task.text.substring(0, 60)}..."`);
        });
      } else {
        console.log(`[Video Generation] ✓ No duplicate TTS tasks found`);
      }

      console.log(`[Video Generation] Processing with batch size of 3 (max concurrent requests)`);

      // Collect audio blobs and metadata
        console.log(`[Video Generation] NOT using cached audio - resetting audioBlobs`);
        audioBlobs = [];
        console.log(`[Video Generation] Reset audioBlobs.length = ${audioBlobs.length}`);
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
        console.log(`[Video Generation] Pushed blob ${audioBlobs.length - 1}: ${result.blob.size} bytes, audioBlobs.length now = ${audioBlobs.length}`);
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
      console.log(`[Video Generation] Final audioBlobs check before upload:`);
      console.log(`  - Total chunks: ${audioBlobs.length}`);
      console.log(`  - Chapter: ${chapter.title} (index ${chapter.index})`);
      
      // Check for duplicate blob sizes
      const finalBlobSizes = audioBlobs.map(b => b.size);
      const finalSizeCounts = new Map<number, number[]>();
      finalBlobSizes.forEach((size, idx) => {
        if (!finalSizeCounts.has(size)) {
          finalSizeCounts.set(size, []);
        }
        finalSizeCounts.get(size)!.push(idx);
      });
      const finalDuplicates = Array.from(finalSizeCounts.entries()).filter(([, indices]) => indices.length > 1);
      if (finalDuplicates.length > 0) {
        console.warn(`[Video Generation] ⚠️  Found ${finalDuplicates.length} duplicate blob sizes in final audioBlobs!`);
        finalDuplicates.slice(0, 10).forEach(([size, indices]) => {
          console.warn(`  - Size ${size} bytes appears ${indices.length} times at indices: ${indices.slice(0, 20).join(', ')}${indices.length > 20 ? '...' : ''}`);
        });
      } else {
        console.log(`[Video Generation] ✓ No duplicate blob sizes found in final audioBlobs`);
      }
      
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
      formData.append('show_text', settings.showText.toString());
      formData.append('use_stt_srt', settings.useSttSrt.toString());
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

      // Step 4: Save the generated video using VideoStorageService
      updateProgress({
        stage: 'complete',
        percentage: 100,
        message: 'Video generated successfully!'
      });

      const videoBlob = await response.blob();
      const bookTitle = uploadedFile?.name || 'Unknown';
      
      // Request directory access on first video (if File System API is available)
      if (!directoryAccessGranted && 'showDirectoryPicker' in window) {
        const granted = await videoStorageService.requestDirectoryAccess(bookTitle);
        setDirectoryAccessGranted(granted);
        if (granted) {
          console.log('[Video Generation] Directory access granted for organized storage');
        }
      }

      // Save video using VideoStorageService
      const saveResult = await videoStorageService.saveVideo(
        bookTitle,
        chapter.index,
        chapter.title,
        videoBlob
      );

      if (saveResult.success) {
        console.log('[Video Generation] Video saved to:', saveResult.filePath);
        
        // Update queue item with saved path
        setVideoQueue(prev => prev.map(item => 
          item.id === queueItem.id 
            ? { ...item, status: 'completed', savedPath: saveResult.filePath }
            : item
        ));
      } else {
        console.warn('[Video Generation] Failed to save video:', saveResult.error);
        // Fallback to direct download
      const videoUrl = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `${chapter.title}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(videoUrl);

        // Still mark as completed
        setVideoQueue(prev => prev.map(item => 
          item.id === queueItem.id 
            ? { ...item, status: 'completed' }
            : item
        ));
      }

      console.log('[Video Generation] Video generated and saved successfully');
    } catch (error) {
      console.error('[Video Generation] Failed:', error);
      throw error; // Re-throw to mark queue item as failed
    }
  }, [chapters, uploadedFile, settings, directoryAccessGranted]);

  // Regenerate SRT using Whisper STT for better accuracy
  const regenerateSrtWithStt = useCallback(async (chapterIndex: number) => {
    const chapter = chapters.find(c => c.index === chapterIndex);
    if (!chapter) {
      alert('Chapter not found');
      return;
    }

    try {
      // Get cached audio or generate it
      const cacheKey = generateCacheKey(uploadedFile?.name || 'Unknown', chapterIndex);
      await videoCacheService.init();
      const cachedData = await videoCacheService.loadCache(cacheKey);
      
      if (!cachedData?.audioBlobs || cachedData.audioBlobs.length === 0) {
        alert('No audio found. Please generate video first.');
        return;
      }

      // Combine audio blobs
      const combinedAudio = new Blob(cachedData.audioBlobs, { type: 'audio/mpeg' });

      // Call STT endpoint
      const formData = new FormData();
      formData.append('audio', combinedAudio, 'audio.mp3');
      formData.append('original_text', chapter.content);
      formData.append('book_title', uploadedFile?.name || 'Unknown');
      formData.append('chapter_title', chapter.title);
      formData.append('model_size', 'base'); // Can be made configurable

      console.log('[STT] Calling /api/generate-srt-from-audio endpoint...');
      const response = await fetch('http://localhost:8000/api/generate-srt-from-audio', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`STT API returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Update cache with new SRT
        const updatedCache = {
          ...cachedData,
          srtData: result.srt_content
        };
        await videoCacheService.saveCacheSafe(cacheKey, updatedCache);
        
        console.log(`[STT] SRT regenerated successfully! ${result.entry_count} entries created.`);
        alert(`SRT regenerated successfully! ${result.entry_count} entries created. You can now regenerate the video with accurate text sync.`);
        
        // Optionally trigger video regeneration here if desired
        // For now, user can manually regenerate video
      } else {
        throw new Error(result.error || 'STT generation failed');
      }
    } catch (error: any) {
      console.error('[STT] Error:', error);
      alert(`Failed to regenerate SRT: ${error.message || error}`);
    }
  }, [chapters, uploadedFile]);

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

  // Merge all completed videos into a single video
  const handleMergeVideos = useCallback(async () => {
    if (!uploadedFile) {
      alert('Please upload a book first');
      return;
    }

    const bookTitle = uploadedFile.name || 'Unknown';
    setIsMerging(true);
    setMergeProgress({ percentage: 0, message: 'Preparing to merge videos...' });

    try {
      // Get all saved videos for this book
      const videos = await videoStorageService.getBookVideos(bookTitle);
      
      if (videos.length === 0) {
        alert('No videos found to merge. Please generate videos first.');
        setIsMerging(false);
        return;
      }

      setMergeProgress({ percentage: 10, message: `Found ${videos.length} videos to merge...` });

      // Get video generator URL
      let videoGeneratorUrl = 'http://localhost:8000';
      try {
        const { portableConfig } = await import('../config/portable');
        videoGeneratorUrl = portableConfig.videoGeneratorUrl;
      } catch (e) {
        videoGeneratorUrl = import.meta.env.VITE_VIDEO_GENERATOR_URL || 'http://localhost:8000';
      }

      setMergeProgress({ percentage: 20, message: 'Preparing video files for merge...' });

      // Create FormData with all videos
      const formData = new FormData();
      formData.append('book_title', bookTitle);
      formData.append('video_count', videos.length.toString());
      
      // Add video blobs in order
      videos.forEach((video, index) => {
        formData.append('videos', video.blob, video.fileName);
        console.log(`[Video Merge] Added video ${index + 1}: ${video.fileName}`);
      });

      setMergeProgress({ percentage: 40, message: 'Sending merge request to server...' });

      // Send to backend to merge
      const response = await fetch(`${videoGeneratorUrl}/merge-videos`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Merge failed: ${response.statusText} - ${errorText}`);
      }

      setMergeProgress({ percentage: 80, message: 'Merging videos on server...' });

      // The server will return the merged video
      const mergedBlob = await response.blob();
      
      setMergeProgress({ percentage: 90, message: 'Downloading merged video...' });

      // Save merged video
      const sanitizedBookTitle = bookTitle.replace(/\.[^/.]+$/, '').replace(/[<>:"/\\|?*]/g, '_');
      const mergedFileName = `${sanitizedBookTitle}_Complete.mp4`;
      
      const saveResult = await videoStorageService.saveVideo(
        bookTitle,
        -1, // Special index for merged video
        'Complete',
        mergedBlob
      );

      if (saveResult.success) {
        console.log('[Video Merge] Merged video saved to:', saveResult.filePath);
      } else {
        // Fallback to direct download
        const mergedUrl = URL.createObjectURL(mergedBlob);
        const a = document.createElement('a');
        a.href = mergedUrl;
        a.download = mergedFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(mergedUrl);
      }

      setMergeProgress({ percentage: 100, message: 'Merge complete!' });
      
      setTimeout(() => {
        alert(`Successfully merged ${videos.length} chapters into complete video!`);
      }, 500);
    } catch (error: any) {
      console.error('[Video Merge] Failed:', error);
      alert(`Failed to merge videos: ${error.message}`);
    } finally {
      setIsMerging(false);
      setTimeout(() => {
        setMergeProgress({ percentage: 0, message: '' });
      }, 2000);
    }
  }, [uploadedFile]);

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
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => regenerateSrtWithStt(chapter.index)}
                                        className="text-blue-600 hover:text-blue-800 underline text-xs"
                                        title="Regenerate SRT using Whisper STT for better accuracy"
                                      >
                                        Regenerate SRT
                                      </button>
                                      <button
                                        onClick={() => clearChapterCache(chapter.index)}
                                        className="text-red-600 hover:text-red-800 underline text-xs"
                                        title="Clear cache for this chapter"
                                      >
                                        Clear
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          
                          {/* STT SRT Regeneration Button (show even if no cache) */}
                          {queueItem?.status === 'completed' && (
                            <div className="mt-2">
                              <button
                                onClick={() => regenerateSrtWithStt(chapter.index)}
                                className="w-full px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors"
                                title="Regenerate SRT using Whisper STT for accurate text synchronization"
                              >
                                🔄 Regenerate SRT with STT
                              </button>
                            </div>
                          )}
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
                    
                    {/* Merge Videos Button */}
                    {videoQueue.length > 0 && 
                     videoQueue.every(item => item.status === 'completed' || item.status === 'failed') &&
                     videoQueue.filter(item => item.status === 'completed').length > 0 && (
                      <button
                        onClick={handleMergeVideos}
                        disabled={isMerging}
                        className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm disabled:opacity-50 flex items-center justify-center"
                      >
                        {isMerging ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Merging... {mergeProgress.percentage}%
                          </>
                        ) : (
                          <>
                            <Video className="w-4 h-4 mr-2" />
                            Merge All Videos ({videoQueue.filter(i => i.status === 'completed').length} chapters)
                          </>
                        )}
                      </button>
                    )}

                    {isMerging && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        {mergeProgress.message}
                      </div>
                    )}
                    
                    {/* Clear Queue Button */}
                    <button
                      onClick={() => {
                        if (confirm('Clear all queue items?')) {
                          setVideoQueue([]);
                        }
                      }}
                      disabled={isProcessingQueue || isMerging}
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

                {/* Show Text Toggle */}
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.showText}
                      onChange={(e) => {
                        console.log('[Settings] showText checkbox changed to:', e.target.checked);
                        setSettings(prev => ({
                          ...prev,
                          showText: e.target.checked
                        }));
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      Show text in video
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    When disabled, video will only show scene images (if enabled) with audio, no text overlay
                  </p>
                </div>

                {/* Use STT SRT Toggle */}
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.useSttSrt}
                      onChange={(e) => {
                        console.log('[Settings] useSttSrt checkbox changed to:', e.target.checked);
                        setSettings(prev => ({
                          ...prev,
                          useSttSrt: e.target.checked
                        }));
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      Use STT for accurate text sync
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Regenerate SRT using Whisper speech-to-text for better text synchronization (slower but more accurate)
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
