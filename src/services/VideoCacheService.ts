/**
 * Robust Video Generation Cache Service
 * Handles caching of audio blobs, SRT data, and scene images using IndexedDB
 * Includes quota management, transaction safety, and error recovery
 */

import { generateCacheKey, CacheKeyInput } from '../utils/cacheKeyGenerator';

export interface CacheData {
  audioBlobs: Blob[];
  durations: number[];
  srtData: string;
  sceneImages?: File[];
  sceneAnalysis?: { scenes: any[] };
  metadata: {
    bookTitle: string;
    chapterTitle: string;
    totalDuration: number;
    chunkCount: number;
    timestamp: number;
    version: string;
  };
}

export interface PartialCacheData {
  audioBlobs?: Blob[];
  durations?: number[];
  srtData?: string;
  sceneImages?: File[];
  sceneAnalysis?: { scenes: any[] };
  metadata?: CacheData['metadata'];
}

export interface CacheStatus {
  hasCache: boolean;
  cacheSize: number;
  cacheDate: Date | null;
  chunkCount: number;
  totalDuration: number;
}

const DB_NAME = 'VideoGeneratorCache';
const DB_VERSION = 2;
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_VERSION = 'v1';

export class VideoCacheService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private cacheLocks = new Map<string, Promise<any>>();

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[VideoCache] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[VideoCache] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('audioChunks')) {
          const audioStore = db.createObjectStore('audioChunks', { keyPath: 'id' });
          audioStore.createIndex('cacheKey', 'cacheKey', { unique: false });
          audioStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('srtData')) {
          db.createObjectStore('srtData', { keyPath: 'cacheKey' });
        }

        if (!db.objectStoreNames.contains('sceneImages')) {
          const imageStore = db.createObjectStore('sceneImages', { keyPath: 'id' });
          imageStore.createIndex('cacheKey', 'cacheKey', { unique: false });
          imageStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'cacheKey' });
        }

        if (!db.objectStoreNames.contains('sceneAnalysis')) {
          db.createObjectStore('sceneAnalysis', { keyPath: 'cacheKey' });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Check available storage quota
   */
  async checkQuota(): Promise<{ available: number; used: number; quota: number }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          available: (estimate.quota || 0) - (estimate.usage || 0),
          used: estimate.usage || 0,
          quota: estimate.quota || 0
        };
      }
    } catch (error) {
      console.warn('[VideoCache] Failed to check quota:', error);
    }
    return { available: 0, used: 0, quota: 0 };
  }

  /**
   * Execute operation with lock to prevent race conditions
   */
  private async withLock<T>(cacheKey: string, operation: () => Promise<T>): Promise<T> {
    // Wait for existing lock
    while (this.cacheLocks.has(cacheKey)) {
      try {
        await this.cacheLocks.get(cacheKey);
      } catch {
        // Lock failed, continue
      }
    }

    const lock = operation().finally(() => {
      this.cacheLocks.delete(cacheKey);
    });

    this.cacheLocks.set(cacheKey, lock);
    return lock;
  }

  /**
   * Save all cache data atomically
   */
  async saveCache(cacheKey: string, data: CacheData): Promise<void> {
    if (!this.db) {
      await this.init();
      if (!this.db) {
        throw new Error('Failed to initialize IndexedDB');
      }
    }

    return this.withLock(cacheKey, async () => {
      // Check quota before saving
      const quota = await this.checkQuota();
      const estimatedSize = this.estimateCacheSize(data);
      
      if (estimatedSize > quota.available * 0.9) {
        console.warn('[VideoCache] Quota nearly full, cleaning up old cache...');
        await this.cleanupOldCache();
        
        // Recheck quota
        const newQuota = await this.checkQuota();
        if (estimatedSize > newQuota.available * 0.9) {
          throw new Error('Insufficient storage quota for cache');
        }
      }

      const transaction = this.db!.transaction(
        ['audioChunks', 'srtData', 'sceneImages', 'metadata', 'sceneAnalysis'],
        'readwrite'
      );

      try {
        // Save audio chunks
        const audioStore = transaction.objectStore('audioChunks');
        for (let i = 0; i < data.audioBlobs.length; i++) {
          await new Promise<void>((resolve, reject) => {
            const request = audioStore.put({
              id: `${cacheKey}-chunk-${i}`,
              cacheKey,
              index: i,
              blob: data.audioBlobs[i],
              duration: data.durations[i],
              timestamp: Date.now()
            });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }

        // Save SRT data
        const srtStore = transaction.objectStore('srtData');
        await new Promise<void>((resolve, reject) => {
          const request = srtStore.put({
            cacheKey,
            srtData: data.srtData,
            timestamp: Date.now()
          });
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

        // Save scene images if available
        if (data.sceneImages && data.sceneImages.length > 0) {
          const imageStore = transaction.objectStore('sceneImages');
          for (let i = 0; i < data.sceneImages.length; i++) {
            await new Promise<void>((resolve, reject) => {
              const request = imageStore.put({
                id: `${cacheKey}-image-${i}`,
                cacheKey,
                index: i,
                blob: data.sceneImages![i],
                timestamp: Date.now()
              });
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          }
        }

        // Save scene analysis if available
        if (data.sceneAnalysis) {
          const sceneAnalysisStore = transaction.objectStore('sceneAnalysis');
          await new Promise<void>((resolve, reject) => {
            const request = sceneAnalysisStore.put({
              cacheKey,
              scenes: data.sceneAnalysis!.scenes,
              timestamp: Date.now()
            });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }

        // Save metadata
        const metadataStore = transaction.objectStore('metadata');
        await new Promise<void>((resolve, reject) => {
          const request = metadataStore.put({
            cacheKey,
            ...data.metadata,
            version: CACHE_VERSION,
            timestamp: Date.now()
          });
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

        // Wait for transaction to complete
        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });

        console.log(`[VideoCache] Successfully saved cache for key: ${cacheKey}`);
      } catch (error) {
        transaction.abort();
        throw error;
      }
    });
  }

  /**
   * Load cache data with validation
   */
  async loadCache(cacheKey: string): Promise<PartialCacheData | null> {
    if (!this.db) {
      await this.init();
      if (!this.db) return null;
    }

    return this.withLock(cacheKey, async () => {
      // Validate cache first
      const isValid = await this.validateCache(cacheKey);
      if (!isValid) {
        console.log(`[VideoCache] Cache invalid for key: ${cacheKey}`);
        return null;
      }

      const result: PartialCacheData = {};

      try {
        // Load metadata
        const metadata = await this.getMetadata(cacheKey);
        if (metadata) {
          result.metadata = metadata;
        }

        // Load audio chunks
        const audioChunks = await this.getAudioChunks(cacheKey);
        if (audioChunks) {
          result.audioBlobs = audioChunks.blobs;
          result.durations = audioChunks.durations;
        }

        // Load SRT data
        const srtData = await this.getSRT(cacheKey);
        if (srtData) {
          result.srtData = srtData;
        }

        // Load scene images
        const sceneImages = await this.getSceneImages(cacheKey);
        if (sceneImages) {
          result.sceneImages = sceneImages;
        }

        // Load scene analysis
        const sceneAnalysis = await this.getSceneAnalysis(cacheKey);
        if (sceneAnalysis) {
          result.sceneAnalysis = sceneAnalysis;
        }

        // Return null if we have nothing
        if (!result.audioBlobs && !result.srtData && !result.sceneImages) {
          return null;
        }

        console.log(`[VideoCache] Loaded cache for key: ${cacheKey}`);
        return result;
      } catch (error) {
        console.error(`[VideoCache] Failed to load cache:`, error);
        return null;
      }
    });
  }

  /**
   * Validate cache integrity
   */
  private async validateCache(cacheKey: string): Promise<boolean> {
    try {
      const metadata = await this.getMetadata(cacheKey);
      if (!metadata) return false;

      // Check expiration
      if (Date.now() - metadata.timestamp > MAX_CACHE_AGE) {
        console.log(`[VideoCache] Cache expired for key: ${cacheKey}`);
        await this.clearCache(cacheKey);
        return false;
      }

      // Check version
      if (metadata.version !== CACHE_VERSION) {
        console.log(`[VideoCache] Cache version mismatch for key: ${cacheKey}`);
        await this.clearCache(cacheKey);
        return false;
      }

      // Verify audio chunks exist and are valid
      const audioChunks = await this.getAudioChunks(cacheKey);
      if (!audioChunks || audioChunks.blobs.length !== metadata.chunkCount) {
        return false;
      }

      // Verify blob sizes
      for (let i = 0; i < audioChunks.blobs.length; i++) {
        if (audioChunks.blobs[i].size === 0) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`[VideoCache] Validation error:`, error);
      return false;
    }
  }

  /**
   * Get audio chunks
   */
  private async getAudioChunks(cacheKey: string): Promise<{ blobs: Blob[]; durations: number[] } | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['audioChunks'], 'readonly');
      const store = transaction.objectStore('audioChunks');
      const index = store.index('cacheKey');
      const request = index.getAll(cacheKey);

      request.onsuccess = () => {
        const chunks = request.result;
        if (!chunks || chunks.length === 0) {
          resolve(null);
          return;
        }

        chunks.sort((a, b) => a.index - b.index);
        resolve({
          blobs: chunks.map(c => c.blob),
          durations: chunks.map(c => c.duration)
        });
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get SRT data
   */
  private async getSRT(cacheKey: string): Promise<string | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['srtData'], 'readonly');
      const store = transaction.objectStore('srtData');
      const request = store.get(cacheKey);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.srtData || null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get scene images
   */
  private async getSceneImages(cacheKey: string): Promise<File[] | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sceneImages'], 'readonly');
      const store = transaction.objectStore('sceneImages');
      const index = store.index('cacheKey');
      const request = index.getAll(cacheKey);

      request.onsuccess = () => {
        const images = request.result;
        if (!images || images.length === 0) {
          resolve(null);
          return;
        }

        images.sort((a, b) => a.index - b.index);
        resolve(images.map(img => new File([img.blob], `scene-${img.index}.png`, { type: 'image/png' })));
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get scene analysis
   */
  private async getSceneAnalysis(cacheKey: string): Promise<{ scenes: any[] } | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sceneAnalysis'], 'readonly');
      const store = transaction.objectStore('sceneAnalysis');
      const request = store.get(cacheKey);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.scenes) {
          resolve({ scenes: result.scenes });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get metadata
   */
  private async getMetadata(cacheKey: string): Promise<CacheData['metadata'] | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(cacheKey);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          delete result.cacheKey; // Remove cacheKey from metadata
          resolve(result as CacheData['metadata']);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cache status
   */
  async getCacheStatus(cacheKey: string): Promise<{ hasCache: boolean; cacheSize: number; cacheDate: Date | null }> {
    try {
      const metadata = await this.getMetadata(cacheKey);
      if (!metadata) {
        return { hasCache: false, cacheSize: 0, cacheDate: null };
      }

      const audioChunks = await this.getAudioChunks(cacheKey);
      const srtData = await this.getSRT(cacheKey);
      const sceneImages = await this.getSceneImages(cacheKey);

      let cacheSize = 0;
      if (audioChunks) {
        cacheSize += audioChunks.blobs.reduce((sum, blob) => sum + blob.size, 0);
      }
      if (srtData) {
        cacheSize += new Blob([srtData]).size;
      }
      if (sceneImages) {
        cacheSize += sceneImages.reduce((sum, file) => sum + file.size, 0);
      }

      return {
        hasCache: true,
        cacheSize,
        cacheDate: new Date(metadata.timestamp)
      };
    } catch (error) {
      console.error('[VideoCache] Failed to get cache status:', error);
      return { hasCache: false, cacheSize: 0, cacheDate: null };
    }
  }

  /**
   * Clear cache for specific key
   */
  async clearCache(cacheKey: string): Promise<void> {
    if (!this.db) {
      await this.init();
      if (!this.db) return;
    }

    return this.withLock(cacheKey, async () => {
      const transaction = this.db!.transaction(
        ['audioChunks', 'srtData', 'sceneImages', 'metadata', 'sceneAnalysis'],
        'readwrite'
      );

      try {
        // Delete audio chunks
        const audioStore = transaction.objectStore('audioChunks');
        const audioIndex = audioStore.index('cacheKey');
        const audioRequest = audioIndex.openKeyCursor(IDBKeyRange.only(cacheKey));
        
        audioRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            audioStore.delete(cursor.primaryKey);
            cursor.continue();
          }
        };

        // Delete SRT data
        const srtStore = transaction.objectStore('srtData');
        srtStore.delete(cacheKey);

        // Delete scene images
        const imageStore = transaction.objectStore('sceneImages');
        const imageIndex = imageStore.index('cacheKey');
        const imageRequest = imageIndex.openKeyCursor(IDBKeyRange.only(cacheKey));
        
        imageRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            imageStore.delete(cursor.primaryKey);
            cursor.continue();
          }
        };

        // Delete scene analysis
        const sceneAnalysisStore = transaction.objectStore('sceneAnalysis');
        sceneAnalysisStore.delete(cacheKey);

        // Delete metadata
        const metadataStore = transaction.objectStore('metadata');
        metadataStore.delete(cacheKey);

        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });

        console.log(`[VideoCache] Cleared cache for key: ${cacheKey}`);
      } catch (error) {
        transaction.abort();
        throw error;
      }
    });
  }

  /**
   * Cleanup old cache entries
   */
  async cleanupOldCache(maxAge: number = MAX_CACHE_AGE): Promise<void> {
    if (!this.db) {
      await this.init();
      if (!this.db) return;
    }

    const cutoff = Date.now() - maxAge;
    console.log(`[VideoCache] Cleaning up cache older than ${new Date(cutoff).toISOString()}`);

    // Cleanup audio chunks
    await this.cleanupStore('audioChunks', 'timestamp', cutoff);
    
    // Cleanup scene images
    await this.cleanupStore('sceneImages', 'timestamp', cutoff);
    
    // Cleanup SRT and metadata (use metadata timestamp)
    const transaction = this.db.transaction(['metadata', 'srtData'], 'readwrite');
    const metadataStore = transaction.objectStore('metadata');
    const metadataRequest = metadataStore.openCursor();

    metadataRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const metadata = cursor.value;
        if (metadata.timestamp < cutoff) {
          const cacheKey = metadata.cacheKey;
          metadataStore.delete(cacheKey);
          transaction.objectStore('srtData').delete(cacheKey);
        }
        cursor.continue();
      }
    };

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Cleanup store by timestamp
   */
  private async cleanupStore(storeName: string, indexName: string, cutoff: number): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.openCursor(IDBKeyRange.upperBound(cutoff));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Estimate cache size
   */
  private estimateCacheSize(data: CacheData): number {
    let size = 0;
    
    // Audio blobs
    size += data.audioBlobs.reduce((sum, blob) => sum + blob.size, 0);
    
    // SRT data
    size += new Blob([data.srtData]).size;
    
    // Scene images
    if (data.sceneImages) {
      size += data.sceneImages.reduce((sum, file) => sum + file.size, 0);
    }
    
    // Scene analysis (JSON string size estimate)
    if (data.sceneAnalysis) {
      size += JSON.stringify(data.sceneAnalysis).length * 1.5; // Estimate with overhead
    }
    
    // Metadata overhead (estimate)
    size += 1024; // ~1KB for metadata
    
    return size;
  }

  /**
   * Save cache with graceful error handling (doesn't throw)
   */
  async saveCacheSafe(cacheKey: string, data: CacheData): Promise<boolean> {
    try {
      await this.saveCache(cacheKey, data);
      return true;
    } catch (error) {
      console.warn('[VideoCache] Failed to save cache (non-blocking):', error);
      return false;
    }
  }
}

// Singleton instance
export const videoCacheService = new VideoCacheService();

