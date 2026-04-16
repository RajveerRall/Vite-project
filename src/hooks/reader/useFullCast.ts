import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import localforage from 'localforage';
import { trackEvent } from '../../lib/analytics';
import { requestFullCast, ttsForLine } from '../../services/fullCastTTS';
import { isTrackingEnabled } from '../../utils/trackingConfig';
import {
  analyzeScenes,
  generateSceneImages,
  matchSceneToText,
  loadSceneAnalysis,
  saveSceneAnalysis,
  cleanupSceneImages
} from '../../services/sceneAnalysis';
import { Scene, SceneImage } from '../../types/fullCast';
import { highlightChunkInHtml } from '../../utils/htmlHighlight';

export interface UseFullCastReturn {
  // State
  isActive: boolean;
  status: string;
  buffered: number;
  needsTap: boolean;
  isPaused: boolean;
  hasStartedPlaying: boolean;

  // Visual Scene State
  scenes: Scene[];
  sceneImages: SceneImage[];
  currentScene: Scene | null;
  isScenesLoading: boolean;
  showScenes: boolean;

  // Highlighting
  highlightedContent: string;

  // Commands
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setShowScenes: (show: boolean) => void;
  setCurrentScene: (scene: Scene | null) => void;
  handleGenerateSceneImage: () => Promise<void>;

  // Progress & Seeking
  currentChunkIndex: number;
  totalChunks: number;
  seekToPercentage: (percentage: number) => void;

  // Errors
  apiError: string | null;
  setApiError: (error: string | null) => void;
}

interface AudioQueueItem {
  blob: Blob;
  line: { dialogue: string; provider?: string; voiceId?: string };
}

/**
 * Custom hook for managing Picture Mode audiobook playback and visual synchronization
 */
export function useFullCast(
  currentPageText: string | undefined,
  currentContent: string | undefined,
  currentPageDisplay: number,
  bookTitle: string,
  currentChapterTitle?: string
): UseFullCastReturn {
  // --- Audio State ---
  const [isActive, setIsActive] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  const [buffered, setBuffered] = useState<number>(0);
  const [needsTap, setNeedsTap] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState<boolean>(false);

  // --- Visual Scene State ---
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [sceneImages, setSceneImages] = useState<SceneImage[]>([]);
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [isScenesLoading, setIsScenesLoading] = useState<boolean>(false);
  const [showScenes, setShowScenes] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentChunkIndexState, setCurrentChunkIndexState] = useState<number>(0);

  // --- Highlighting State ---
  const [highlightedContent, setHighlightedContent] = useState<string>(currentContent || '');

  // --- Refs ---
  const isPlayingRef = useRef<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);
  const isConsumingRef = useRef<boolean>(false); // FIX: Lock to prevent overlapping consume calls
  const audioQueueRef = useRef<AudioQueueItem[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunkIndexRef = useRef<number>(0);
  const chunksRef = useRef<string[]>([]);
  const startTsRef = useRef<number>(0);
  const scenesRef = useRef<Scene[]>([]);
  const textRef = useRef<string | undefined>(currentPageText);
  const contentRef = useRef<string | undefined>(currentContent);
  const pageDisplayRef = useRef<number>(currentPageDisplay);
  const hasStartedPlayingRef = useRef<boolean>(false);

  // Keep refs in sync with state for use in closures
  useEffect(() => {
    scenesRef.current = scenes;
  }, [scenes]);

  useEffect(() => {
    textRef.current = currentPageText;
  }, [currentPageText]);

  useEffect(() => {
    contentRef.current = currentContent;
  }, [currentContent]);

  useEffect(() => {
    pageDisplayRef.current = currentPageDisplay;
  }, [currentPageDisplay]);

  useEffect(() => {
    hasStartedPlayingRef.current = hasStartedPlaying;
  }, [hasStartedPlaying]);

  // Update highlighted content when content changes
  useEffect(() => {
    setHighlightedContent(currentContent || '');
  }, [currentContent]);

  // --- Helpers ---
  const getSafeKey = useCallback(() => {
    // Fallback: Use text snippet hash to ensure uniqueness even if chapter title is missing
    const textSnippet = (currentPageText || '').substring(0, 15).replace(/\s/g, '');
    return `full-cast-${bookTitle}-${currentChapterTitle || currentPageDisplay}-${textSnippet}`
      .replace(/[^a-z0-9-]/gi, '-')
      .toLowerCase();
  }, [bookTitle, currentChapterTitle, currentPageDisplay, currentPageText]);

  // --- Producer ---
  const produce = useCallback(async () => {
    if (!isPlayingRef.current || isFetchingRef.current) return;
    const LOOKAHEAD = 3;
    if (audioQueueRef.current.length >= LOOKAHEAD) return;

    if (chunkIndexRef.current >= chunksRef.current.length) {
      if (chunkIndexRef.current === chunksRef.current.length && audioQueueRef.current.length === 0) {
        trackEvent('full_cast_completed', {
          total_chunks: chunksRef.current.length,
          page_number: currentPageDisplay,
        });
      }
      return;
    }

    const currentIdx = chunkIndexRef.current;
    isFetchingRef.current = true;
    setStatus(`Casting (chunk ${currentIdx + 1}/${chunksRef.current.length})…`);
    const chunk = chunksRef.current[currentIdx];
    let producedAny = false;

    try {
      // === SIMPLE NARRATION MODE ===
      const USE_SIMPLE_NARRATION = true;
      let lines: any[] = [];

      if (USE_SIMPLE_NARRATION) {
        lines = [{
          character: 'Narrator',
          dialogue: chunk,
          provider: 'msedge',
          voiceId: 'en-US-BrianMultilingualNeural'
        }];
      } else {
        const { script } = await requestFullCast(chunk, {
          llm: 'gemini-2.0-flash',
          parser: 'chatThread',
          useVoiceCasting: true
        });
        lines = Array.isArray(script) ? script : [];
      }

      for (const line of lines) {
        if (!isPlayingRef.current) break;
        const dialogue: string = line?.dialogue || line?.line || '';
        if (!dialogue) continue;
        const provider = line?.provider as string | undefined;
        const voiceId = line?.voiceId as string | undefined;
        try {
          const blob = await ttsForLine(dialogue, provider, voiceId);
          audioQueueRef.current.push({ blob, line: { dialogue, provider, voiceId } });
          setBuffered(audioQueueRef.current.length);
          producedAny = true;
        } catch (e) {
          console.error('[Full Cast] TTS failed for line', e);
        }
      }
    } catch (e) {
      console.error('[Full Cast] casting/synthesis failed for chunk', e);
    } finally {
      isFetchingRef.current = false;
      if (producedAny) {
        chunkIndexRef.current = currentIdx + 1;
        setCurrentChunkIndexState(currentIdx + 1);
      } else {
        if (isPlayingRef.current) {
          setTimeout(() => { if (isPlayingRef.current) produce(); }, 800);
          return;
        }
      }
      if (isPlayingRef.current && audioQueueRef.current.length < LOOKAHEAD) {
        produce();
      }
    }
  }, []); // Stable produce

  // --- Consumer ---
  const consume = useCallback(async () => {
    // FIX: Guard against concurrent consume calls or inactive state
    if (!isPlayingRef.current || isConsumingRef.current) return;

    if (audioQueueRef.current.length === 0) {
      produce();
      if (!hasStartedPlayingRef.current) {
        setStatus('Buffering…');
      }
      if (chunkIndexRef.current < chunksRef.current.length || isFetchingRef.current) {
        setTimeout(consume, 500);
      }
      return;
    }

    // Set the lock
    isConsumingRef.current = true;

    try {
      const item = audioQueueRef.current.shift()!;
      const { blob, line } = item;
      setBuffered(audioQueueRef.current.length);
      const url = URL.createObjectURL(blob);

      console.log('[Picture Mode] Playing chunk:', {
        dialoguePreview: line?.dialogue?.substring(0, 60),
        queueRemaining: audioQueueRef.current.length,
        chunkIndex: chunkIndexRef.current
      });

      const audio = audioRef.current!;

      // Properly stop and wait for silent loop to finish before loading new chunk
      try {
        audio.pause();
        audio.currentTime = 0;
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        console.debug('[Full Cast] Pause during transition (non-critical):', e);
      }

      audio.src = url;
      audio.loop = false;
      audio.volume = 1.0;

      const setupHighlighting = () => {
        if (line?.dialogue && textRef.current) {
          try {
            const highlighted = highlightChunkInHtml(
              contentRef.current || '',
              textRef.current,
              line.dialogue
            );
            setHighlightedContent(highlighted);
            console.log('[Picture Mode] Highlighted dialogue:', line.dialogue.substring(0, 50));
          } catch (err) {
            console.warn('[Picture Mode] Failed to highlight dialogue:', err);
          }
        }
      };

      audio.onplay = () => {
        startTsRef.current = Date.now();
        setStatus('Playing…');
        setHasStartedPlaying(true);
        setNeedsTap(false);
        setupHighlighting();

        if (scenesRef.current.length > 0 && line?.dialogue) {
          if (line.dialogue.length >= 10) {
            setCurrentScene(prevScene => {
              const currentIdx = prevScene?.sceneIndex || 0;
              const result = matchSceneToText(line.dialogue, scenesRef.current, currentIdx);
              const matchedScene = result.scene;
              if (matchedScene && (prevScene === null || matchedScene.sceneIndex > currentIdx)) {
                return matchedScene;
              }
              return prevScene;
            });
          }
        }
      };

      audio.onended = () => {
        URL.revokeObjectURL(url);
        const elapsed = (Date.now() - startTsRef.current) / 1000;
        if (isTrackingEnabled()) {
          window.dispatchEvent(new CustomEvent('tts-usage-updated', {
            detail: { seconds: elapsed, source: 'full-cast' }
          }));
        }
        produce();
        consume();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        consume();
      };

      // Trigger highlighting immediately
      setupHighlighting();

      try {
        await audio.play();
      } catch (e) {
        if ((e as any)?.name !== 'AbortError') {
          console.error('[Full Cast] play failed', e);
          setNeedsTap(true);
          setStatus('Tap to start audio');
        } else {
          console.debug('[Full Cast] Play interrupted by pause (will retry):', e);
          setTimeout(async () => {
            // FIX: Added isPlayingRef check to prevent orphaned retry if stopped
            if (isPlayingRef.current && audio.src === url) {
              try {
                await audio.play();
              } catch (retryError) {
                if ((retryError as any)?.name !== 'AbortError') {
                  console.error('[Full Cast] Retry play failed', retryError);
                  setNeedsTap(true);
                  setStatus('Tap to start audio');
                }
              }
            }
          }, 100);
        }
      }
    } finally {
      // Release the lock so the next trigger can process
      isConsumingRef.current = false;
    }
  }, [produce]); // Stable consume (depends on produce which is now stable)

  // --- Commands ---
  const pause = useCallback(() => {
    try { audioRef.current?.pause(); } catch { }
    isPlayingRef.current = false;
    setIsPaused(true);
    setStatus('Paused');
  }, []);

  const resume = useCallback(async () => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    setIsPaused(false);

    if (audioRef.current && audioRef.current.src && audioRef.current.src !== '') {
      try {
        await audioRef.current.play();
        setStatus('Playing…');
        return;
      } catch (e) {
        console.error('[Full Cast] resume play failed', e);
        setNeedsTap(true);
        setStatus('Tap to start audio');
      }
    }

    produce();
    consume();
  }, [produce, consume]);

  const stop = useCallback(() => {
    try {
      isPlayingRef.current = false;
      isFetchingRef.current = false;
      isConsumingRef.current = false; // Reset lock

      if (audioRef.current) {
        audioRef.current.onplay = null;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.onpause = null;
        audioRef.current.onwaiting = null;

        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.removeAttribute('src'); // Force removal
        audioRef.current.load();
      }

      (window as any).__fullCastAudio = null;
      (window as any).__fullCastStop = null;
      (window as any).__fullCastPause = null;
      (window as any).__fullCastResume = null;

      if (sceneImages.length > 0) {
        cleanupSceneImages(sceneImages);
      }
    } catch (e) {
      console.error('[Full Cast] Error during stop:', e);
    } finally {
      setIsActive(false);
      setNeedsTap(false);
      setIsPaused(false);
      setHasStartedPlaying(false);
      audioQueueRef.current = [];
      chunksRef.current = [];
      chunkIndexRef.current = 0;
      setScenes([]);
      setSceneImages([]);
      setCurrentScene(null);
      setHighlightedContent(currentContent || '');
    }
  }, [sceneImages, currentContent]);

  // --- On-Demand Scene Generation ---
  const handleGenerateSceneImage = useCallback(async () => {
    try {
      setShowScenes(true);
      setIsScenesLoading(true);

      const selection = window.getSelection()?.toString().trim() || '';
      const fullText = (currentPageText || currentContent || '').trim();
      if (!fullText) {
        setIsScenesLoading(false);
        return;
      }

      let currentScenes = scenesRef.current;
      const safeKey = getSafeKey();

      if (!currentScenes || currentScenes.length === 0) {
        try {
          const cached = await loadSceneAnalysis(safeKey);
          if (cached && cached.scenes && cached.scenes.length > 0) {
            currentScenes = cached.scenes;
            setScenes(currentScenes);
            setSceneImages(cached.sceneImages || []);
          } else {
            const userKey = await localforage.getItem<string>('user_gemini_api_key') || undefined;
            currentScenes = await analyzeScenes(fullText, bookTitle, {
              bookTheme: 'atmospheric narrative',
              colorPalette: 'cinematic with dramatic lighting'
            }, userKey);
            setScenes(currentScenes);
          }
        } catch (err) {
          console.warn('[Full Cast] Analysis failed:', err);
          currentScenes = [];
        }
      }

      if (!currentScenes || currentScenes.length === 0) return;

      let target: Scene | null = null;
      if (selection) {
        const { scene } = matchSceneToText(selection, currentScenes, 0);
        target = scene;
      }
      if (!target) {
        const { scene } = matchSceneToText(fullText.slice(0, 400), currentScenes, 0);
        target = scene || currentScenes[0];
      }
      if (!target) return;

      setCurrentScene(target);

      const userKey = await localforage.getItem<string>('user_gemini_api_key') || undefined;
      const newImages = await generateSceneImages([target], (img) => {
        setSceneImages(prev => [...prev, img]);
      }, {}, userKey);

      if (newImages && newImages.length > 0) {
        setSceneImages(prev => {
          const existing = new Set(prev.map(i => i.sceneIndex));
          const toAdd = newImages.filter(i => !existing.has(i.sceneIndex));
          return [...prev, ...toAdd];
        });
      }
    } catch (err: any) {
      console.error('[Full Cast] Generation failed:', err);
      // Check for API key related errors
      if (err.message?.includes('401') || err.message?.includes('403') || err.message?.includes('invalid') || err.message?.includes('API key')) {
        setApiError('Invalid or unauthorized API key. Please check your settings.');
      } else if (err.message?.includes('429') || err.message?.includes('limit') || err.message?.includes('Quota')) {
        setApiError('API Rate limit exceeded or quota reached.');
      }
    } finally {
      setIsScenesLoading(false);
    }
  }, [currentPageText, currentContent, bookTitle, getSafeKey]);

  // --- Request Handler ---
  useEffect(() => {
    const handler = async () => {
      // FIX: IDEMPOTENCY - If already playing, stop current playback before starting new
      if (isPlayingRef.current || isActive) {
        console.log('[Full Cast] Instance already active, performing clean restart');
        stop();
        // Wait a small bit for cleanup to settle
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setIsActive(true);
      setStatus('Preparing Picture Mode...');
      setShowScenes(true);
      setIsScenesLoading(true);
      isPlayingRef.current = true;
      setIsPaused(false);
      setHasStartedPlaying(false);
      setBuffered(0);

      const fullText = (currentPageText || currentContent || '').trim();
      if (!fullText) {
        setIsActive(false);
        setIsScenesLoading(false);
        return;
      }

      trackEvent('full_cast_processing_start', {
        text_length: fullText.length,
        page_number: currentPageDisplay
      });

      // Smart chunking: Split at sentence boundaries for better sync resolution
      const MAX_CHUNK_CHARS = 200;
      const paragraphs = fullText.split(/\n\s*\n/);
      const newChunks: string[] = [];

      // Use Intl.Segmenter for robust, locale-aware sentence splitting (Standard approach)
      const segmenter = typeof Intl !== 'undefined' && (Intl as any).Segmenter
        ? new (Intl as any).Segmenter('en', { granularity: 'sentence' })
        : null;

      for (let p of paragraphs) {
        p = p.trim();
        if (!p) continue;

        let sentences: string[] = [];

        if (segmenter) {
          // fast, robust, native segmentation
          sentences = Array.from(segmenter.segment(p)).map((s: any) => s.segment);
        } else {
          // Regex fallback (improved to handle quotes)
          sentences = p.match(/[^.!?]+(?:[.!?]+['”"’)]*)?(?:\s|$)|[^.!?]+$/g) || [p];
        }
        let currentChunk = "";

        for (const sentence of sentences) {
          const s = sentence.trim();
          if (!s) continue;

          if (currentChunk.length + s.length > MAX_CHUNK_CHARS && currentChunk.length > 0) {
            newChunks.push(currentChunk.trim());
            currentChunk = "";
          }

          currentChunk += (currentChunk ? " " : "") + s;

          // If a single sentence is still too long, split it hard
          while (currentChunk.length > MAX_CHUNK_CHARS * 2) {
            newChunks.push(currentChunk.slice(0, MAX_CHUNK_CHARS).trim());
            currentChunk = currentChunk.slice(MAX_CHUNK_CHARS);
          }
        }
        if (currentChunk.trim()) {
          newChunks.push(currentChunk.trim());
        }
      }

      // INTEGRITY CHECK: Verify we haven't lost text during segmentation
      const joinedChunks = newChunks.join(' ');
      const normOriginal = fullText.replace(/\s+/g, ' ').trim();
      const lengthDiff = Math.abs(normOriginal.length - joinedChunks.length);

      if (lengthDiff > 20) {
        console.warn('[Full Cast] ⚠️  Text Integrity Warning: SEGMENTATION DATA LOSS DETECTED', {
          originalLen: normOriginal.length,
          processedLen: joinedChunks.length,
          diff: lengthDiff
        });
      }

      chunksRef.current = newChunks;
      console.log(`[Full Cast] Split text into ${newChunks.length} chunks for synced playback`);

      const audio = new Audio();
      audioRef.current = audio;
      (window as any).__fullCastAudio = audio;

      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABGDZGF0YQQAAAAAAA==';
      audio.loop = true;
      audio.volume = 0.01;

      audio.play().catch(e => {
        console.warn("Audio autoplay blocked initially:", e);
        setNeedsTap(true);
        setStatus("Tap 'Play' when ready");
      });

      isPlayingRef.current = true;
      isFetchingRef.current = false;
      audioQueueRef.current = [];
      chunkIndexRef.current = 0;
      startTsRef.current = 0;

      setIsActive(true);
      setStatus('Generating visual scenes…');
      setBuffered(0);
      setHasStartedPlaying(false);
      setScenes([]);
      setSceneImages([]);
      setCurrentScene(null);

      (window as any).__fullCastStop = stop;
      (window as any).__fullCastPause = pause;
      (window as any).__fullCastResume = resume;

      try {
        setIsScenesLoading(true);
        const safeKey = getSafeKey();
        const cached = await loadSceneAnalysis(safeKey);

        let activeScenes: Scene[] = [];
        let activeImages: SceneImage[] = [];

        if (cached && cached.scenes && cached.scenes.length > 0) {
          activeScenes = cached.scenes;
          activeImages = cached.sceneImages || [];
          setScenes(activeScenes);
          setSceneImages(activeImages);
          if (activeScenes[0]) {
            setCurrentScene(activeScenes[0]);
            setShowScenes(true);
          }
        } else {
          const userKey = await localforage.getItem<string>('user_gemini_api_key') || undefined;
          const rawScenes = await analyzeScenes(fullText, bookTitle, {
            bookTheme: 'atmospheric narrative',
            colorPalette: 'cinematic with dramatic lighting'
          }, userKey);
          activeScenes = rawScenes.map((s, i) => ({
            ...s,
            sceneIndex: typeof s.sceneIndex === 'number' ? s.sceneIndex : i
          }));
          setScenes(activeScenes);
          if (activeScenes[0]) {
            setCurrentScene(activeScenes[0]);
            setShowScenes(true);
          }

          if (activeScenes.length > 0) {
            try {
              const userKey = await localforage.getItem<string>('user_gemini_api_key') || undefined;
              await generateSceneImages(activeScenes, (img) => {
                setSceneImages(prev => {
                  const exists = prev.some(i => i.sceneIndex === img.sceneIndex);
                  if (exists) return prev;
                  return [...prev, img];
                });
                activeImages.push(img);
              }, {}, userKey);

              if (activeImages.length > 0) {
                saveSceneAnalysis(safeKey, activeScenes, activeImages)
                  .then(() => console.log('[Full Cast] Cached results for', safeKey))
                  .catch(e => console.warn('[Full Cast] Cache save failed', e));
              }
            } catch (err) {
              console.error('[Full Cast] Batch image generation failed:', err);
            }
          }
        }
      } catch (err: any) {
        console.error('[Full Cast] Preparation failed:', err);
        // Check for API key related errors
        if (err.message?.includes('401') || err.message?.includes('403') || err.message?.includes('invalid') || err.message?.includes('API key')) {
          setApiError('Invalid or unauthorized API key. Please check your settings.');
        } else if (err.message?.includes('429') || err.message?.includes('limit') || err.message?.includes('Quota')) {
          setApiError('API Rate limit exceeded or quota reached.');
        }
      } finally {
        setIsScenesLoading(false);
      }

      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio.loop = false;
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.debug('[Full Cast] Error stopping silent loop (non-critical):', e);
        audio.loop = false;
        audio.currentTime = 0;
        if (audio.src && audio.src.startsWith('data:audio')) {
          audio.src = '';
        }
      }

      setStatus('Starting audio…');
      produce();
      consume();
    };

    window.addEventListener('full-cast-request', handler as any);
    return () => {
      window.removeEventListener('full-cast-request', handler as any);
      if (audioRef.current) {
        audioRef.current.onplay = null;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [bookTitle, getSafeKey, stop, pause, resume]); // Stable useEffect. Removed currentPageText, currentContent, currentPageDisplay, produce, consume.

  // --- Deterministic Scene Mapping ---
  // Pre-calculate which scene each chunk belongs to.
  // This allows O(1) lookup during seeking and guarantees continuity.
  // --- Deterministic Scene Mapping ---
  // Pre-calculate which scene each chunk belongs to.
  const chunkToSceneMap = useMemo(() => {
    // Safety check
    if (!chunksRef.current || chunksRef.current.length === 0 || !scenes || scenes.length === 0) {
      return [];
    }

    const map: Scene[] = [];
    let currentSceneIdx = 0;

    // Normalization helper (lowercase, alphanumeric only)
    const norm = (t: string) => (t || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    chunksRef.current.forEach((chunk) => {
      const chunkNorm = norm(chunk);

      // If chunk is empty/punctuation, just use current scene
      if (chunkNorm.length < 5) {
        map.push(scenes[currentSceneIdx]);
        return;
      }

      // Check "Look Ahead" window (Current + Next 2 scenes)
      // We look for the FIRST scene that matches this chunk
      let matchIdx = -1;

      const searchEnd = Math.min(currentSceneIdx + 3, scenes.length);
      for (let i = currentSceneIdx; i < searchEnd; i++) {
        const scene = scenes[i];
        const sceneNorm = norm(scene.anchor_text);

        // Match logic: Does the scene anchor generally contain this chunk?
        // Or is the chunk so big it contains the anchor?
        if (sceneNorm.includes(chunkNorm) || (chunkNorm.length > 20 && chunkNorm.includes(sceneNorm.substring(0, 50)))) {
          matchIdx = i;
          break;
        }
      }

      // If we found a match in a future scene (or current), advance pointer
      if (matchIdx !== -1) {
        currentSceneIdx = matchIdx;
      }

      map.push(scenes[currentSceneIdx]);
    });

    console.log(`[Full Cast] Scene Map Generated: Coherent scenes assigned to ${map.length}/${chunksRef.current.length} chunks.`);
    // Debug first few mappings
    map.slice(0, 5).forEach((s, i) => console.log(`Chunk ${i} -> Scene ${s.sceneIndex}`));

    return map;
  }, [scenes, chunksRef.current.length]); // Re-run when scenes load or chunks change

  // --- Seeking ---
  const seekToPercentage = useCallback((percentage: number) => {
    if (!chunksRef.current.length) return;

    // 1. Calculate target index
    const targetIndex = Math.floor((percentage / 100) * chunksRef.current.length);
    const safeIndex = Math.max(0, Math.min(targetIndex, chunksRef.current.length - 1));

    console.log(`[Full Cast] Seeking to ${safeIndex} (${percentage.toFixed(1)}%)`);

    // 2. Stop current playback but keep active state
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ''; // FIX: Clear src to stop 'consume' retry loop
      audioRef.current.currentTime = 0;
    }

    // 3. Reset queue and pointers
    audioQueueRef.current = [];
    chunkIndexRef.current = safeIndex;
    setCurrentChunkIndexState(safeIndex);

    // 4. Force restart consumption
    // We must break the old lock and manually restart the loop
    isConsumingRef.current = false;

    // 5. Instant Scene Update
    // Use the pre-calculated deterministic map
    const targetScene = chunkToSceneMap[safeIndex];
    if (targetScene) {
      console.log(`[Full Cast] Seek mapped to scene: ${targetScene.sceneIndex}`);
      setCurrentScene(targetScene);
    }

    if (isActive) {
      setStatus('Seeking...');
      isFetchingRef.current = false;
      produce();
      // Wait a tick for produce to maybe fill something or just restart loop
      setTimeout(() => consume(), 0);
    }
  }, [isActive, produce, consume]);

  return {
    isActive,
    status,
    buffered,
    needsTap,
    isPaused,
    hasStartedPlaying,
    scenes,
    sceneImages,
    currentScene,
    isScenesLoading,
    showScenes,
    highlightedContent,
    pause,
    resume,
    stop,
    setShowScenes,
    setCurrentScene,
    handleGenerateSceneImage,
    apiError,
    setApiError,

    // New Seek Props
    currentChunkIndex: currentChunkIndexState,
    totalChunks: chunksRef.current.length,
    seekToPercentage
  };
}