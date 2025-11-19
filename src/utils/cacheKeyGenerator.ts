/**
 * Cache key generation utilities for video generation caching
 * Uses SHA-256 hashing for robust cache key generation
 */

export interface CacheKeyInput {
  bookTitle: string;
  chapterIndex: number;
  content: string;
  settings: {
    useMultiVoice: boolean;
    enableSceneImages: boolean;
    format: string;
    style: string;
    highlightMode: string;
  };
}

/**
 * Hash a string using SHA-256
 */
export async function hashString(str: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('[CacheKey] Failed to hash string, using fallback:', error);
    // Fallback: simple hash (not cryptographically secure, but works)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}

/**
 * Normalize book title for cache key
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50); // Limit length
}

/**
 * Generate cache key for video generation
 * Format: video-cache-v1-{normalizedTitle}-ch{chapterIndex}-{contentHash}-{settingsHash}
 */
export async function generateCacheKey(input: CacheKeyInput): Promise<string> {
  const { bookTitle, chapterIndex, content, settings } = input;
  
  // Normalize book title
  const normalizedTitle = normalizeTitle(bookTitle);
  
  // Create settings key (only relevant settings that affect audio generation)
  const settingsKey = JSON.stringify({
    useMultiVoice: settings.useMultiVoice,
    enableSceneImages: settings.enableSceneImages,
    format: settings.format,
    style: settings.style,
    highlightMode: settings.highlightMode
  });
  
  // Generate hashes
  const contentHash = await hashString(content);
  const settingsHash = await hashString(settingsKey);
  
  // Combine into cache key with version prefix
  const cacheKey = `video-cache-v1-${normalizedTitle}-ch${chapterIndex}-${contentHash.substring(0, 16)}-${settingsHash.substring(0, 16)}`;
  
  return cacheKey;
}

/**
 * Extract components from cache key (for debugging)
 */
export function parseCacheKey(cacheKey: string): {
  version: string;
  bookTitle: string;
  chapterIndex: number;
  contentHash: string;
  settingsHash: string;
} | null {
  const match = cacheKey.match(/^video-cache-(v\d+)-(.+)-ch(\d+)-([a-f0-9]+)-([a-f0-9]+)$/);
  if (!match) return null;
  
  return {
    version: match[1],
    bookTitle: match[2],
    chapterIndex: parseInt(match[3], 10),
    contentHash: match[4],
    settingsHash: match[5]
  };
}



