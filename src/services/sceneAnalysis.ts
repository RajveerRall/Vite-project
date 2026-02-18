// src/services/sceneAnalysis.ts
// Service for analyzing text and generating scene images using Full Cast Server
import localforage from 'localforage';
import { Scene, SceneImage, SceneAnalysisOptions, CachedSceneAnalysis } from '../types/fullCast';

function normalizeText(text: string): string {
    if (!text) return '';
    return text
        .toLowerCase()
        // Replace smart quotes/apostrophes with standard ones
        .replace(/[\u2018\u2019\u201B]/g, "'")
        .replace(/[\u201C\u201D\u201F]/g, '"')
        // Replace dashes (em, en, etc) with simple hyphens or spaces
        .replace(/[\u2013\u2014]/g, '-')
        // Remove non-alphanumeric chars (keep spaces and basic punctuation for context)
        // Actually, for robust matching, let's strip EVERYTHING except letters/numbers
        // This makes "word - word" match "word word" match "word...word"
        .replace(/[^a-z0-9\s]/g, ' ')
        // Normalize whitespace (tabs, newlines, nbsp) to single space
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Analyze text and generate scene descriptions using Full Cast Server
 */
export async function analyzeScenes(
    text: string,
    bookTitle: string,
    options: SceneAnalysisOptions = {},
    apiKey?: string
): Promise<Scene[]> {
    const baseURL = import.meta.env.VITE_FULL_CAST_TTS_URL || 'http://localhost:4001';

    console.log('[SceneAnalysis] Analyzing scenes for:', bookTitle);
    console.log('[SceneAnalysis] Text length:', text.length);

    const response = await fetch(`${baseURL}/api/analyze-scenes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'X-Gemini-API-Key': apiKey } : {})
        },
        body: JSON.stringify({
            text,
            bookTitle,
            chapter: 'Current Chapter', // Could be enhanced to pass actual chapter name
            maxScenes: options.maxScenes || 5,
            bookTheme: options.bookTheme || 'atmospheric narrative',
            colorPalette: options.colorPalette || 'muted tones with dramatic contrasts',
            videoFormat: options.videoFormat || 'youtube',
            styleKey: options.styleKey || `yoread-${bookTitle.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`,
            bibleMode: 'use',
            strictImageCompliance: true,
            detailLevel: 'high'
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Scene analysis failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[SceneAnalysis] Received', data.scenes?.length || 0, 'scenes');

    return data.scenes || [];
}

/**
 * Generate images for analyzed scenes using Full Cast Server
 */
export async function generateSceneImages(
    scenes: Scene[],
    // Optional callback to notify caller as each image is generated
    onImageGenerated?: (image: SceneImage) => void,
    options: SceneAnalysisOptions = {},
    apiKey?: string
): Promise<SceneImage[]> {
    if (scenes.length === 0) {
        console.warn('[SceneAnalysis] No scenes to generate images for');
        return [];
    }

    const baseURL = import.meta.env.VITE_FULL_CAST_TTS_URL || 'http://localhost:4001';

    console.log('[SceneAnalysis] Generating images for', scenes.length, 'scenes');

    const response = await fetch(`${baseURL}/api/generate-scene-images`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'X-Gemini-API-Key': apiKey } : {})
        },
        body: JSON.stringify({
            scenes,
            videoFormat: options.videoFormat || 'youtube',
            styleKey: options.styleKey,
            useSavedReferences: true,
            sceneLayout: 'overlay',
            imageAspect: '16:9'
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Image generation failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[SceneAnalysis] Generated', data.generatedCount || 0, 'images');

    // Download images and create blob URLs
    const sceneImages: SceneImage[] = [];
    for (const img of data.images || []) {
        try {
            const imgUrl = `${baseURL}/${img.filename}`;
            const imgResponse = await fetch(imgUrl);
            let finalImageObject: SceneImage;

            if (imgResponse.ok) {
                const blob = await imgResponse.blob();
                const blobUrl = URL.createObjectURL(blob);
                finalImageObject = {
                    ...img,
                    sceneIndex: Number(img.sceneIndex),
                    url: blobUrl,
                    blob: blob // Store blob for persistent caching
                };
            } else {
                console.warn(`[SceneAnalysis] Image fetch not ok (${imgResponse.status}) for ${img.filename}, using direct URL fallback`);
                finalImageObject = {
                    ...img,
                    sceneIndex: Number(img.sceneIndex),
                    url: imgUrl
                };
            }

            sceneImages.push(finalImageObject);
            if (onImageGenerated) onImageGenerated(finalImageObject);

        } catch (err) {
            console.warn(`[SceneAnalysis] Failed to download image ${img.filename}:`, err);
            // Fallback: use direct image URL even if fetch failed
            const imgUrl = `${baseURL}/${img.filename}`;
            const fallbackObj = {
                ...img,
                sceneIndex: Number(img.sceneIndex),
                url: imgUrl
            };
            sceneImages.push(fallbackObj);
            if (onImageGenerated) onImageGenerated(fallbackObj);
        }
    }

    return sceneImages;
}

/**
 * Match current text to the most relevant scene.
 * Prioritizes containment (is spoken text inside anchor?) over general similarity.
 * Uses a forward-looking window to prevent backward jumps.
 */
export function matchSceneToText(
    currentText: string,
    scenes: Scene[],
    currentSceneIndex: number = 0
): { scene: Scene | null, confidence: number } {

    // 1. Ignore very short noise to prevent false positives
    if (!currentText || currentText.length < 10) {
        return { scene: null, confidence: 0 };
    }

    const normalizedCurrent = normalizeText(currentText);

    // 2. FORWARD-ONLY SEARCH WINDOW
    // Only look at the current scene + next N scenes.
    // This effectively enforces "Forward Only" logic and prevents matching random 
    // identical phrases from previous chapters/scenes.
    const lookahead = 4; // Increased from 2 to handle rapid dialogue
    // Slice end index is exclusive, so +1 to include current, +lookahead for extras
    const searchWindow = scenes.slice(currentSceneIndex, currentSceneIndex + 1 + lookahead);

    for (const scene of searchWindow) {
        const normalizedAnchor = normalizeText(scene.anchor_text);

        // 3. EXACT CONTAINMENT (Bidirectional)
        // Check if spoken text is inside anchor (common case: chunk is sentence of paragraph)
        // OR if anchor is inside spoken text (short anchor, long chunk)
        if (normalizedAnchor.includes(normalizedCurrent) || normalizedCurrent.includes(normalizedAnchor)) {
            return { scene, confidence: 1.0 };
        }

        // 4. TOKEN OVERLAP (Fuzzy Match)
        // Split and filter for significant words (>3 chars)
        const currentWords = normalizedCurrent.split(' ').filter(w => w.length > 3);
        const anchorWordsSet = new Set(normalizedAnchor.split(' ').filter(w => w.length > 3));

        if (currentWords.length > 0) {
            let hits = 0;
            for (const word of currentWords) {
                if (anchorWordsSet.has(word)) hits++;
            }

            // Calculate overlap relative to the SPOKEN chunk
            // If most of the words we are saying right now are in the scene description, it's a match.
            const overlapRatio = hits / currentWords.length;

            if (overlapRatio >= 0.75) {
                return { scene, confidence: overlapRatio };
            }
        }
    }

    return { scene: null, confidence: 0 };
}

/**
 * Cleanup blob URLs to prevent memory leaks
 */
export function cleanupSceneImages(sceneImages: SceneImage[]): void {
    sceneImages.forEach(img => {
        if (img.url) {
            URL.revokeObjectURL(img.url);
        }
    });
}

/**
 * Save scene analysis results to local storage
 */
export async function saveSceneAnalysis(key: string, scenes: Scene[], sceneImages: SceneImage[]): Promise<void> {
    const data: CachedSceneAnalysis = { scenes, sceneImages };
    await localforage.setItem(`scene_analysis_${key}`, data);
}

/**
 * Load scene analysis results from local storage
 */
export async function loadSceneAnalysis(key: string): Promise<CachedSceneAnalysis | null> {
    const data = await localforage.getItem<CachedSceneAnalysis>(`scene_analysis_${key}`);
    if (!data) return null;

    const baseURL = import.meta.env.VITE_FULL_CAST_TTS_URL || 'http://localhost:4001';

    // RE-HYDRATE: Ephemeral blob URLs from previous sessions won't work.
    if (data.sceneImages) {
        data.sceneImages = data.sceneImages.map(img => {
            // Priority 1: If we have the raw Blob, create a NEW valid URL for this session
            if (img.blob) {
                return {
                    ...img,
                    url: URL.createObjectURL(img.blob)
                };
            }

            // Priority 2: If we don't have the Blob but have a filename, 
            // fallback to a direct server URL (which is permanent while server is up)
            if (img.filename && (!img.url || img.url.startsWith('blob:'))) {
                return {
                    ...img,
                    url: `${baseURL}/${img.filename}`
                };
            }

            return img;
        });
    }

    return data;
}
