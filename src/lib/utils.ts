// lib/utils.ts
import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Combine class names with tailwind-merge
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a unique ID for cache storage
export function generateCacheKey(prefix: string, content: string): string {
  // Create a simple hash from the first 100 characters of the content
  const chars = Array.from(content).slice(0, 100);
  const numbers = chars.map(char => char.charCodeAt(0));
  const uint8Array = new Uint8Array(numbers);
  
  const hash = btoa(
    Array.from(uint8Array)
      .map(byte => String.fromCharCode(byte))
      .join('')
  ).replace(/[^a-zA-Z0-9]/g, '');
  
  return `${prefix}_${hash}`;
}

// Helper function to safely store audio blobs in IndexedDB
export async function saveAudioToCache(key: string, audioBlob: Blob): Promise<boolean> {
  try {
    const db = await openAudioDatabase();
    const transaction = db.transaction(['audioCache'], 'readwrite');
    const store = transaction.objectStore('audioCache');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({ key, blob: audioBlob, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to store audio in cache'));
    });
    
    return true;
  } catch (error) {
    console.error('Error saving audio to cache:', error);
    return false;
  }
}

// Helper function to retrieve audio blobs from IndexedDB
export async function getAudioFromCache(key: string): Promise<Blob | null> {
  try {
    const db = await openAudioDatabase();
    const transaction = db.transaction(['audioCache'], 'readonly');
    const store = transaction.objectStore('audioCache');
    
    const result = await new Promise<{ key: string; blob: Blob; timestamp: number } | undefined>((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to retrieve audio from cache'));
    });
    
    return result?.blob || null;
  } catch (error) {
    console.error('Error retrieving audio from cache:', error);
    return null;
  }
}

// Initialize IndexedDB for audio storage
async function openAudioDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('kokoroAudioCache', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('audioCache')) {
        const store = db.createObjectStore('audioCache', { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to open IndexedDB'));
  });
}

// Clean up old cache entries (call this periodically)
export async function cleanupAudioCache(maxAgeHours: number = 24): Promise<void> {
  try {
    const db = await openAudioDatabase();
    const transaction = db.transaction(['audioCache'], 'readwrite');
    const store = transaction.objectStore('audioCache');
    const timestampIndex = store.index('timestamp');
    
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    const range = IDBKeyRange.upperBound(cutoffTime);
    
    const request = timestampIndex.openCursor(range);
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
  } catch (error) {
    console.error('Error cleaning up audio cache:', error);
  }
}