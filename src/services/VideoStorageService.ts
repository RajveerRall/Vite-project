/**
 * Video Storage Service
 * Handles saving videos in organized folders by book name
 * Uses File System Access API when available, falls back to IndexedDB
 */

interface SavedVideo {
  bookTitle: string;
  chapterIndex: number;
  chapterTitle: string;
  fileName: string;
  blob: Blob;
  timestamp: number;
  filePath?: string; // For File System Access API
}

export class VideoStorageService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'VideoStorageDB';
  private readonly DB_VERSION = 1;
  private directoryHandle: any = null; // Store directory handle for reuse

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('videos')) {
          const store = db.createObjectStore('videos', { keyPath: 'id' });
          store.createIndex('bookTitle', 'bookTitle', { unique: false });
          store.createIndex('chapterIndex', 'chapterIndex', { unique: false });
        }
      };
    });
  }

  /**
   * Request directory access (one-time setup per book)
   */
  async requestDirectoryAccess(bookTitle: string): Promise<boolean> {
    if (!('showDirectoryPicker' in window)) {
      return false;
    }

    try {
      const sanitizedBookTitle = this.sanitizeFileName(bookTitle);
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'downloads'
      });

      // Get or create book folder
      this.directoryHandle = await handle.getDirectoryHandle(sanitizedBookTitle, { create: true });
      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[VideoStorage] User cancelled directory selection');
      } else {
        console.warn('[VideoStorage] Failed to get directory access:', error);
      }
      return false;
    }
  }

  /**
   * Save video using File System Access API (if available) or IndexedDB
   */
  async saveVideo(
    bookTitle: string,
    chapterIndex: number,
    chapterTitle: string,
    videoBlob: Blob
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    if (!this.db) {
      await this.init();
    }

    // Sanitize book title for folder name
    const sanitizedBookTitle = this.sanitizeFileName(bookTitle);
    const sanitizedChapterTitle = this.sanitizeFileName(chapterTitle);
    const fileName = `${String(chapterIndex).padStart(3, '0')}_${sanitizedChapterTitle}.mp4`;

    // Try File System Access API first (Chrome/Edge)
    if ('showDirectoryPicker' in window && this.directoryHandle) {
      try {
        return await this.saveWithFileSystemAPI(fileName, videoBlob, {
          bookTitle,
          chapterIndex,
          chapterTitle
        });
      } catch (error) {
        console.warn('[VideoStorage] File System API failed, using IndexedDB:', error);
        this.directoryHandle = null; // Reset on error
      }
    }

    // Fallback to IndexedDB + direct download
    return await this.saveToIndexedDB(bookTitle, chapterIndex, chapterTitle, fileName, videoBlob);
  }

  private async saveWithFileSystemAPI(
    fileName: string,
    videoBlob: Blob,
    metadata: { bookTitle: string; chapterIndex: number; chapterTitle: string }
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      if (!this.directoryHandle) {
        throw new Error('Directory handle not available');
      }

      // Create file in book folder
      const fileHandle = await this.directoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(videoBlob);
      await writable.close();

      // Save metadata to IndexedDB for tracking
      const id = `${metadata.bookTitle}-ch${metadata.chapterIndex}`;
      const savedVideo: SavedVideo = {
        bookTitle: metadata.bookTitle,
        chapterIndex: metadata.chapterIndex,
        chapterTitle: metadata.chapterTitle,
        fileName,
        blob: videoBlob,
        timestamp: Date.now(),
        filePath: `${this.directoryHandle.name}/${fileName}`
      };

      const transaction = this.db!.transaction(['videos'], 'readwrite');
      await new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('videos').put({ id, ...savedVideo });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      return {
        success: true,
        filePath: `${this.directoryHandle.name}/${fileName}`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to save with File System API'
      };
    }
  }

  private async saveToIndexedDB(
    bookTitle: string,
    chapterIndex: number,
    chapterTitle: string,
    fileName: string,
    videoBlob: Blob
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const id = `${bookTitle}-ch${chapterIndex}`;
      const savedVideo: SavedVideo = {
        bookTitle,
        chapterIndex,
        chapterTitle,
        fileName,
        blob: videoBlob,
        timestamp: Date.now()
      };

      const transaction = this.db!.transaction(['videos'], 'readwrite');
      await new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('videos').put({ id, ...savedVideo });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Also trigger download as fallback
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return {
        success: true,
        filePath: `IndexedDB: ${id}`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to save to IndexedDB'
      };
    }
  }

  /**
   * Get all saved videos for a book
   */
  async getBookVideos(bookTitle: string): Promise<SavedVideo[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['videos'], 'readonly');
      const store = transaction.objectStore('videos');
      const index = store.index('bookTitle');
      const request = index.getAll(bookTitle);

      request.onsuccess = () => {
        const videos = request.result
          .map((item: any) => {
            const { id, ...video } = item;
            return video;
          })
          .sort((a: SavedVideo, b: SavedVideo) => a.chapterIndex - b.chapterIndex);
        resolve(videos);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if all chapters are saved for a book
   */
  async areAllChaptersSaved(bookTitle: string, totalChapters: number): Promise<boolean> {
    const videos = await this.getBookVideos(bookTitle);
    return videos.length === totalChapters;
  }

  /**
   * Get video blob by book title and chapter index
   */
  async getVideoBlob(bookTitle: string, chapterIndex: number): Promise<Blob | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const id = `${bookTitle}-ch${chapterIndex}`;
      const transaction = this.db!.transaction(['videos'], 'readonly');
      const request = transaction.objectStore('videos').get(id);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.blob) {
          resolve(result.blob);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sanitize filename for filesystem
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 100);
  }
}

export const videoStorageService = new VideoStorageService();




