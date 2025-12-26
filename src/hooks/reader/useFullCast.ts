// import { useState, useEffect, useCallback, useRef } from 'react';
// import { trackEvent } from '../../lib/analytics';
// import { requestFullCast, ttsForLine } from '../../services/fullCastTTS';
// import { isTrackingEnabled } from '../../utils/trackingConfig';
// import {
//   analyzeScenes,
//   generateSceneImages,
//   matchSceneToText,
//   loadSceneAnalysis,
//   saveSceneAnalysis,
//   cleanupSceneImages
// } from '../../services/sceneAnalysis';
// import { Scene, SceneImage } from '../../types/fullCast';
// import { highlightChunkInHtml } from '../../utils/htmlHighlight';

// export interface UseFullCastReturn {
//   // State
//   isActive: boolean;
//   status: string;
//   buffered: number;
//   needsTap: boolean;
//   isPaused: boolean;
//   hasStartedPlaying: boolean;

//   // Visual Scene State
//   scenes: Scene[];
//   sceneImages: SceneImage[];
//   currentScene: Scene | null;
//   isScenesLoading: boolean;
//   showScenes: boolean;

//   // Highlighting
//   highlightedContent: string;

//   // Commands
//   pause: () => void;
//   resume: () => void;
//   stop: () => void;
//   setShowScenes: (show: boolean) => void;
//   setCurrentScene: (scene: Scene | null) => void;
//   handleGenerateSceneImage: () => Promise<void>;
// }

// interface AudioQueueItem {
//   blob: Blob;
//   line: { dialogue: string; provider?: string; voiceId?: string };
// }

// /**
//  * Custom hook for managing Picture Mode audiobook playback and visual synchronization
//  */
// export function useFullCast(
//   currentPageText: string | undefined,
//   currentContent: string | undefined,
//   currentPageDisplay: number,
//   bookTitle: string,
//   currentChapterTitle?: string
// ): UseFullCastReturn {
//   // --- Audio State ---
//   const [isActive, setIsActive] = useState<boolean>(false);
//   const [status, setStatus] = useState<string>('');
//   const [buffered, setBuffered] = useState<number>(0);
//   const [needsTap, setNeedsTap] = useState<boolean>(false);
//   const [isPaused, setIsPaused] = useState<boolean>(false);
//   const [hasStartedPlaying, setHasStartedPlaying] = useState<boolean>(false);

//   // --- Visual Scene State ---
//   const [scenes, setScenes] = useState<Scene[]>([]);
//   const [sceneImages, setSceneImages] = useState<SceneImage[]>([]);
//   const [currentScene, setCurrentScene] = useState<Scene | null>(null);
//   const [isScenesLoading, setIsScenesLoading] = useState<boolean>(false);
//   const [showScenes, setShowScenes] = useState<boolean>(false);

//   // --- Highlighting State ---
//   const [highlightedContent, setHighlightedContent] = useState<string>(currentContent || '');

//   // --- Refs ---
//   const isPlayingRef = useRef<boolean>(false);
//   const isFetchingRef = useRef<boolean>(false);
//   const audioQueueRef = useRef<AudioQueueItem[]>([]);
//   const audioRef = useRef<HTMLAudioElement | null>(null);
//   const chunkIndexRef = useRef<number>(0);
//   const chunksRef = useRef<string[]>([]);
//   const startTsRef = useRef<number>(0);
//   const scenesRef = useRef<Scene[]>([]);
  
//   // Keep refs in sync with state for use in closures
//   useEffect(() => {
//     scenesRef.current = scenes;
//   }, [scenes]);

//   // Update highlighted content when content changes
//   useEffect(() => {
//     setHighlightedContent(currentContent || '');
//   }, [currentContent]);

//   // --- Helpers ---
//   const getSafeKey = useCallback(() => {
//     return `full-cast-${bookTitle}-${currentChapterTitle || currentPageDisplay}`
//       .replace(/[^a-z0-9-]/gi, '-')
//       .toLowerCase();
//   }, [bookTitle, currentChapterTitle, currentPageDisplay]);

//   // --- Producer ---
//   const produce = useCallback(async () => {
//     if (!isPlayingRef.current || isFetchingRef.current) return;
//     const LOOKAHEAD = 3;
//     if (audioQueueRef.current.length >= LOOKAHEAD) return;

//     if (chunkIndexRef.current >= chunksRef.current.length) {
//       if (chunkIndexRef.current === chunksRef.current.length && audioQueueRef.current.length === 0) {
//         trackEvent('full_cast_completed', {
//           total_chunks: chunksRef.current.length,
//           page_number: currentPageDisplay,
//         });
//       }
//       return;
//     }

//     const currentIdx = chunkIndexRef.current;
//     isFetchingRef.current = true;
//     setStatus(`Casting (chunk ${currentIdx + 1}/${chunksRef.current.length})…`);
//     const chunk = chunksRef.current[currentIdx];
//     let producedAny = false;

//     try {
//       // === SIMPLE NARRATION MODE ===
//       // Bypass LLM and send the entire chunk directly to TTS
//       const USE_SIMPLE_NARRATION = true;

//       let lines: any[] = [];

//       if (USE_SIMPLE_NARRATION) {
//         // DIRECT TTS: Treat the whole chunk as one "line"
//         // The server will handle splitting long text automatically
//         lines = [{
//           character: 'Narrator',
//           dialogue: chunk,
//           provider: 'msedge',
//           voiceId: 'en-US-BrianMultilingualNeural'
//         }];
//       } else {
//         // ORIGINAL LLM CASTING
//         const { script } = await requestFullCast(chunk, {
//           llm: 'gemini-2.0-flash',
//           parser: 'chatThread',
//           useVoiceCasting: true
//         });
//         lines = Array.isArray(script) ? script : [];
//       }

//       for (const line of lines) {
//         if (!isPlayingRef.current) break;
//         const dialogue: string = line?.dialogue || line?.line || '';
//         if (!dialogue) continue;
//         const provider = line?.provider as string | undefined;
//         const voiceId = line?.voiceId as string | undefined;
//         try {
//           const blob = await ttsForLine(dialogue, provider, voiceId);
//           audioQueueRef.current.push({ blob, line: { dialogue, provider, voiceId } });
//           setBuffered(audioQueueRef.current.length);
//           producedAny = true;
//         } catch (e) {
//           console.error('[Full Cast] TTS failed for line', e);
//         }
//       }
//     } catch (e) {
//       console.error('[Full Cast] casting/synthesis failed for chunk', e);
//     } finally {
//       isFetchingRef.current = false;
//       if (producedAny) {
//         chunkIndexRef.current = currentIdx + 1;
//       } else {
//         if (isPlayingRef.current) {
//           setTimeout(() => { if (isPlayingRef.current) produce(); }, 800);
//           return;
//         }
//       }
//       if (isPlayingRef.current && audioQueueRef.current.length < LOOKAHEAD) {
//         produce();
//       }
//     }
//   }, [currentPageDisplay]);

//   // --- Consumer ---
//   const consume = useCallback(async () => {
//     if (!isPlayingRef.current) return;
//     if (audioQueueRef.current.length === 0) {
//       produce();
//       if (!hasStartedPlaying) {
//         setStatus('Buffering…');
//       }
//       if (chunkIndexRef.current < chunksRef.current.length || isFetchingRef.current) {
//         setTimeout(consume, 500);
//       }
//       return;
//     }

//     const item = audioQueueRef.current.shift()!;
//     const { blob, line } = item;
//     setBuffered(audioQueueRef.current.length);
//     const url = URL.createObjectURL(blob);

//     // Debug: Log which chunk is being played
//     console.log('[Picture Mode] Playing chunk:', {
//       dialoguePreview: line?.dialogue?.substring(0, 60),
//       queueRemaining: audioQueueRef.current.length,
//       chunkIndex: chunkIndexRef.current
//     });

//     const audio = audioRef.current!;

//     // FIX: Properly stop and wait for silent loop to finish before loading new chunk
//     // This prevents AbortError when pause() interrupts play()
//     try {
//       audio.pause();
//       audio.currentTime = 0;
//       // Wait a small delay to ensure pause completes before loading new source
//       await new Promise(resolve => setTimeout(resolve, 50));
//     } catch (e) {
//       // Ignore pause errors - audio might already be paused or not playing
//       console.debug('[Full Cast] Pause during transition (non-critical):', e);
//     }

//     audio.src = url;
//     audio.loop = false;
//     audio.volume = 1.0;

//     // FIX: Helper function to set up highlighting - used both in onplay and immediately
//     const setupHighlighting = () => {
//       if (line?.dialogue && currentPageText) {
//         try {
//           const highlighted = highlightChunkInHtml(
//             currentContent || '',
//             currentPageText,
//             line.dialogue
//           );
//           setHighlightedContent(highlighted);
//           console.log('[Picture Mode] Highlighted dialogue:', line.dialogue.substring(0, 50));
//         } catch (err) {
//           console.warn('[Picture Mode] Failed to highlight dialogue:', err);
//         }
//       }
//     };

//     audio.onplay = () => {
//       startTsRef.current = Date.now();
//       setStatus('Playing…');
//       setHasStartedPlaying(true);
//       setNeedsTap(false);

//       // Highlight the currently spoken dialogue
//       setupHighlighting();

//       if (scenesRef.current.length > 0 && line?.dialogue) {
//         if (line.dialogue.length >= 10) { // Relaxed from 15
//           setCurrentScene(prevScene => {
//             const currentIdx = prevScene?.sceneIndex || 0;
//             const context = `[Full Cast Match] Spoken: "${line.dialogue.substring(0, 40)}${line.dialogue.length > 40 ? '...' : ''}"`;

//             const result = matchSceneToText(line.dialogue, scenesRef.current, currentIdx);
//             const matchedScene = result.scene;

//             if (matchedScene) {
//               if (matchedScene.sceneIndex > currentIdx) {
//                 console.log(`${context} -> Matched NEW scene: ${matchedScene.sceneIndex} (Confidence: ${result.confidence.toFixed(2)})`);
//                 return matchedScene;
//               } else {
//                 // Keep existing scene if it's the same or better confidence
//                 return prevScene;
//               }
//             } else {
//               // Only log failure if it's not super short
//               if (line.dialogue.length > 20) {
//                 console.debug(`${context} -> No match found in current window (Lookahead window from index ${currentIdx})`);
//               }
//               return prevScene;
//             }
//           });
//         }
//       } else if (line?.dialogue && scenesRef.current.length === 0) {
//         console.warn('[Full Cast Match] No scenes available in scenesRef yet to match against.');
//       }
//     };

//     audio.onended = () => {
//       URL.revokeObjectURL(url);
//       const elapsed = (Date.now() - startTsRef.current) / 1000;
//       // Re-enabled usage tracking as per user request
//       if (isTrackingEnabled()) {
//         window.dispatchEvent(new CustomEvent('tts-usage-updated', {
//           detail: { seconds: elapsed, source: 'full-cast' }
//         }));
//       }
//       produce();
//       consume();
//     };

//     audio.onerror = () => {
//       URL.revokeObjectURL(url);
//       consume();
//     };

//     // FIX: Trigger highlighting immediately when chunk is loaded (before play)
//     // This ensures highlighting works even with cached chapters where audio might start quickly
//     setupHighlighting();

//     try {
//       await audio.play();
//     } catch (e) {
//       // Only log non-AbortError errors as warnings
//       if ((e as any)?.name !== 'AbortError') {
//         console.error('[Full Cast] play failed', e);
//         setNeedsTap(true);
//         setStatus('Tap to start audio');
//       } else {
//         // AbortError is expected when pause() interrupts play() - retry after a brief delay
//         console.debug('[Full Cast] Play interrupted by pause (will retry):', e);
//         setTimeout(async () => {
//           if (isPlayingRef.current && audio.src === url) {
//             try {
//               await audio.play();
//             } catch (retryError) {
//               if ((retryError as any)?.name !== 'AbortError') {
//                 console.error('[Full Cast] Retry play failed', retryError);
//                 setNeedsTap(true);
//                 setStatus('Tap to start audio');
//               }
//             }
//           }
//         }, 100);
//       }
//     }
//   }, [produce, hasStartedPlaying, currentPageText, currentContent]);

//   // --- Commands ---
//   const pause = useCallback(() => {
//     try { audioRef.current?.pause(); } catch { }
//     isPlayingRef.current = false;
//     setIsPaused(true);
//     setStatus('Paused');
//   }, []);

//   const resume = useCallback(async () => {
//     if (isPlayingRef.current) return;
//     isPlayingRef.current = true;
//     setIsPaused(false);

//     // Check if we already have an audio source loaded. If so, just play it.
//     if (audioRef.current && audioRef.current.src && audioRef.current.src !== '') {
//       try {
//         await audioRef.current.play();
//         setStatus('Playing…');
//         return; // Don't call produce/consume if we just resumed existing audio
//       } catch (e) {
//         console.error('[Full Cast] resume play failed', e);
//         setNeedsTap(true);
//         setStatus('Tap to start audio');
//       }
//     }

//     // Fallback: If no audio loaded, try to fetch/play the next chunk
//     produce();
//     consume();
//   }, [produce, consume]);

//   const stop = useCallback(() => {
//     try {
//       isPlayingRef.current = false;
//       isFetchingRef.current = false;

//       if (audioRef.current) {
//         // Remove all event handlers first
//         audioRef.current.onplay = null;
//         audioRef.current.onended = null;
//         audioRef.current.onerror = null;

//         // Stop and clear audio
//         audioRef.current.pause();
//         audioRef.current.src = '';
//         audioRef.current.loop = false;
//         audioRef.current.load(); // Force reset the audio element
//       }

//       // Clear global reference
//       (window as any).__fullCastAudio = null;
//       (window as any).__fullCastStop = null;
//       (window as any).__fullCastPause = null;
//       (window as any).__fullCastResume = null;

//       if (sceneImages.length > 0) {
//         cleanupSceneImages(sceneImages);
//       }
//     } catch (e) {
//       console.error('[Full Cast] Error during stop:', e);
//     } finally {
//       setIsActive(false);
//       setNeedsTap(false);
//       setIsPaused(false);
//       setHasStartedPlaying(false);
//       audioQueueRef.current = [];
//       chunksRef.current = [];
//       chunkIndexRef.current = 0;
//       setScenes([]);
//       setSceneImages([]);
//       setCurrentScene(null);
//       // Clear highlighting when stopping
//       setHighlightedContent(currentContent || '');
//     }
//   }, [sceneImages, currentContent]);

//   // --- On-Demand Scene Generation ---
//   const handleGenerateSceneImage = useCallback(async () => {
//     try {
//       setShowScenes(true);
//       setIsScenesLoading(true);

//       const selection = window.getSelection()?.toString().trim() || '';
//       const fullText = (currentPageText || currentContent || '').trim();
//       if (!fullText) {
//         setIsScenesLoading(false);
//         return;
//       }

//       let currentScenes = scenesRef.current;
//       const safeKey = getSafeKey();

//       if (!currentScenes || currentScenes.length === 0) {
//         try {
//           const cached = await loadSceneAnalysis(safeKey);
//           if (cached && cached.scenes && cached.scenes.length > 0) {
//             currentScenes = cached.scenes;
//             setScenes(currentScenes);
//             setSceneImages(cached.sceneImages || []);
//           } else {
//             currentScenes = await analyzeScenes(fullText, bookTitle, {
//               bookTheme: 'atmospheric narrative',
//               colorPalette: 'cinematic with dramatic lighting'
//             });
//             setScenes(currentScenes);
//           }
//         } catch (err) {
//           console.warn('[Full Cast] Analysis failed:', err);
//           currentScenes = [];
//         }
//       }

//       if (!currentScenes || currentScenes.length === 0) return;

//       let target: Scene | null = null;
//       if (selection) {
//         const { scene } = matchSceneToText(selection, currentScenes, 0);
//         target = scene;
//       }
//       if (!target) {
//         const { scene } = matchSceneToText(fullText.slice(0, 400), currentScenes, 0);
//         target = scene || currentScenes[0];
//       }
//       if (!target) return;

//       setCurrentScene(target);

//       const newImages = await generateSceneImages([target], (img) => {
//         setSceneImages(prev => [...prev, img]);
//       });

//       if (newImages && newImages.length > 0) {
//         setSceneImages(prev => {
//           const existing = new Set(prev.map(i => i.sceneIndex));
//           const toAdd = newImages.filter(i => !existing.has(i.sceneIndex));
//           return [...prev, ...toAdd];
//         });
//       }
//     } catch (err) {
//       console.error('[Full Cast] Generation failed:', err);
//     } finally {
//       setIsScenesLoading(false);
//     }
//   }, [currentPageText, currentContent, bookTitle, getSafeKey]);

//   // --- Request Handler ---
//   useEffect(() => {
//     const handler = async () => {
//       // 1. Immediate Feedback
//       setIsActive(true);
//       setStatus('Preparing Picture Mode...');
//       setShowScenes(true); // Show overlay immediately
//       setIsScenesLoading(true);
//       isPlayingRef.current = true;
//       setIsPaused(false);
//       setHasStartedPlaying(false);
//       setBuffered(0);

//       const fullText = (currentPageText || currentContent || '').trim();
//       if (!fullText) {
//         setIsActive(false);
//         setIsScenesLoading(false);
//         return;
//       }

//       trackEvent('full_cast_processing_start', {
//         text_length: fullText.length,
//         page_number: currentPageDisplay
//       });

//       // Split text into chunks
//       const MAX_CHARS = 400;
//       const paras = fullText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
//       const sources = paras.length > 0 ? paras : [fullText];
//       const newChunks: string[] = [];
//       for (const src of sources) {
//         const t = src.trim();
//         if (!t) continue;
//         for (let i = 0; i < t.length; i += MAX_CHARS) {
//           newChunks.push(t.slice(i, i + MAX_CHARS));
//         }
//       }
//       chunksRef.current = newChunks;

//       // Initialize Audio Context & Unlock Autoplay
//       const audio = new Audio();
//       audioRef.current = audio;
//       (window as any).__fullCastAudio = audio;

//       // Silent loop for unlock
//       audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABGDZGF0YQQAAAAAAA==';
//       audio.loop = true;
//       audio.volume = 0.01;

//       audio.play().catch(e => {
//         console.warn("Audio autoplay blocked initially:", e);
//         setNeedsTap(true);
//         setStatus("Tap 'Play' when ready");
//       });

//       // Reset state
//       isPlayingRef.current = true;
//       isFetchingRef.current = false;
//       audioQueueRef.current = [];
//       chunkIndexRef.current = 0;
//       startTsRef.current = 0;

//       setIsActive(true);
//       setStatus('Generating visual scenes…');
//       setBuffered(0);
//       setHasStartedPlaying(false);
//       setScenes([]);
//       setSceneImages([]);
//       setCurrentScene(null);

//       // Global controls
//       (window as any).__fullCastStop = stop;
//       (window as any).__fullCastPause = pause;
//       (window as any).__fullCastResume = resume;

//       // Scene Analysis Phase
//       try {
//         setIsScenesLoading(true);
//         const safeKey = getSafeKey();
//         const cached = await loadSceneAnalysis(safeKey);

//         let activeScenes: Scene[] = [];
//         let activeImages: SceneImage[] = [];

//         if (cached && cached.scenes && cached.scenes.length > 0) {
//           activeScenes = cached.scenes;
//           activeImages = cached.sceneImages || [];
//           setScenes(activeScenes);
//           setSceneImages(activeImages);
//           if (activeScenes[0]) {
//             setCurrentScene(activeScenes[0]);
//             setShowScenes(true);
//           }
//         } else {
//           const rawScenes = await analyzeScenes(fullText, bookTitle, {
//             bookTheme: 'atmospheric narrative',
//             colorPalette: 'cinematic with dramatic lighting'
//           });
//           activeScenes = rawScenes.map((s, i) => ({
//             ...s,
//             sceneIndex: typeof s.sceneIndex === 'number' ? s.sceneIndex : i
//           }));
//           setScenes(activeScenes);
//           if (activeScenes[0]) {
//             setCurrentScene(activeScenes[0]);
//             setShowScenes(true);
//           }

//           if (activeScenes.length > 0) {
//             console.log('[Full Cast] Bulk generating images for', activeScenes.length, 'scenes');
//             try {
//               const allGeneratedImages = await generateSceneImages(activeScenes, (img) => {
//                 console.log('[Full Cast] Image arrived for scene', img.sceneIndex);
//                 setSceneImages(prev => {
//                   const exists = prev.some(i => i.sceneIndex === img.sceneIndex);
//                   if (exists) return prev;
//                   return [...prev, img];
//                 });
//                 activeImages.push(img);
//               });

//               console.log('[Full Cast] Batch generation complete. total images:', allGeneratedImages.length);

//               if (activeImages.length > 0) {
//                 saveSceneAnalysis(safeKey, activeScenes, activeImages)
//                   .then(() => console.log('[Full Cast] Cached results for', safeKey))
//                   .catch(e => console.warn('[Full Cast] Cache save failed', e));
//               }
//             } catch (err) {
//               console.error('[Full Cast] Batch image generation failed:', err);
//             }
//           }
//         }
//       } catch (err) {
//         console.error('[Full Cast] Preparation failed:', err);
//       } finally {
//         setIsScenesLoading(false);
//       }

//       // Start Audio Phase
//       // FIX: Properly stop silent loop before starting real audio
//       // This prevents AbortError when the first chunk tries to pause the silent loop
//       try {
//         audio.pause();
//         audio.currentTime = 0;
//         audio.src = ''; // Clear silent loop source
//         audio.loop = false;
//         // Wait a brief moment to ensure pause completes
//         await new Promise(resolve => setTimeout(resolve, 100));
//       } catch (e) {
//         console.debug('[Full Cast] Error stopping silent loop (non-critical):', e);
//         // Continue anyway - audio might already be stopped
//         audio.loop = false;
//         audio.currentTime = 0;
//         if (audio.src && audio.src.startsWith('data:audio')) {
//           audio.src = '';
//         }
//       }

//       setStatus('Starting audio…');
//       produce();
//       consume();
//     };

//     window.addEventListener('full-cast-request', handler as any);
//     return () => {
//       window.removeEventListener('full-cast-request', handler as any);
//       if (audioRef.current) {
//         audioRef.current.pause();
//         audioRef.current.src = '';
//       }
//     };
//   }, [currentPageText, currentContent, currentPageDisplay, bookTitle, getSafeKey, stop, pause, resume, produce, consume]);

//   return {
//     isActive,
//     status,
//     buffered,
//     needsTap,
//     isPaused,
//     hasStartedPlaying,
//     scenes,
//     sceneImages,
//     currentScene,
//     isScenesLoading,
//     showScenes,
//     highlightedContent,
//     pause,
//     resume,
//     stop,
//     setShowScenes,
//     setCurrentScene,
//     handleGenerateSceneImage,
//   };
// }



import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Keep refs in sync with state for use in closures
  useEffect(() => {
    scenesRef.current = scenes;
  }, [scenes]);

  // Update highlighted content when content changes
  useEffect(() => {
    setHighlightedContent(currentContent || '');
  }, [currentContent]);

  // --- Helpers ---
  const getSafeKey = useCallback(() => {
    return `full-cast-${bookTitle}-${currentChapterTitle || currentPageDisplay}`
      .replace(/[^a-z0-9-]/gi, '-')
      .toLowerCase();
  }, [bookTitle, currentChapterTitle, currentPageDisplay]);

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
  }, [currentPageDisplay]);

  // --- Consumer ---
  const consume = useCallback(async () => {
    // FIX: Guard against concurrent consume calls or inactive state
    if (!isPlayingRef.current || isConsumingRef.current) return;

    if (audioQueueRef.current.length === 0) {
      produce();
      if (!hasStartedPlaying) {
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
        if (line?.dialogue && currentPageText) {
          try {
            const highlighted = highlightChunkInHtml(
              currentContent || '',
              currentPageText,
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
              if (matchedScene && matchedScene.sceneIndex > currentIdx) {
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
  }, [produce, hasStartedPlaying, currentPageText, currentContent]);

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

      if (audioRef.current) {
        audioRef.current.onplay = null;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.loop = false;
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
            currentScenes = await analyzeScenes(fullText, bookTitle, {
              bookTheme: 'atmospheric narrative',
              colorPalette: 'cinematic with dramatic lighting'
            });
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

      const newImages = await generateSceneImages([target], (img) => {
        setSceneImages(prev => [...prev, img]);
      });

      if (newImages && newImages.length > 0) {
        setSceneImages(prev => {
          const existing = new Set(prev.map(i => i.sceneIndex));
          const toAdd = newImages.filter(i => !existing.has(i.sceneIndex));
          return [...prev, ...toAdd];
        });
      }
    } catch (err) {
      console.error('[Full Cast] Generation failed:', err);
    } finally {
      setIsScenesLoading(false);
    }
  }, [currentPageText, currentContent, bookTitle, getSafeKey]);

  // --- Request Handler ---
  useEffect(() => {
    const handler = async () => {
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

      const MAX_CHARS = 400;
      const paras = fullText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      const sources = paras.length > 0 ? paras : [fullText];
      const newChunks: string[] = [];
      for (const src of sources) {
        const t = src.trim();
        if (!t) continue;
        for (let i = 0; i < t.length; i += MAX_CHARS) {
          newChunks.push(t.slice(i, i + MAX_CHARS));
        }
      }
      chunksRef.current = newChunks;

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
          const rawScenes = await analyzeScenes(fullText, bookTitle, {
            bookTheme: 'atmospheric narrative',
            colorPalette: 'cinematic with dramatic lighting'
          });
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
              const allGeneratedImages = await generateSceneImages(activeScenes, (img) => {
                setSceneImages(prev => {
                  const exists = prev.some(i => i.sceneIndex === img.sceneIndex);
                  if (exists) return prev;
                  return [...prev, img];
                });
                activeImages.push(img);
              });

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
      } catch (err) {
        console.error('[Full Cast] Preparation failed:', err);
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
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [currentPageText, currentContent, currentPageDisplay, bookTitle, getSafeKey, stop, pause, resume, produce, consume]);

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
  };
}