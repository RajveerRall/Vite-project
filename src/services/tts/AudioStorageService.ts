
import localforage from 'localforage';

// Configure a separate instance for audio storage to avoid conflicting with book data
const audioStorage = localforage.createInstance({
    name: 'EbookReaderApp',
    storeName: 'tts_audio_cache'
});

export interface AudioStorageKeyParams {
    bookId: string;
    chapterId: string;
    chunkIndex: number;
    voice: string;
    speed: number;
}

export class AudioStorageService {
    /**
     * Generate a unique storage key for a specific audio chunk
     */
    private static getKey(params: AudioStorageKeyParams): string {
        // Sanitize IDs to ensure valid keys
        const safeBookId = params.bookId.replace(/[^a-z0-9]/yi, '_');
        const safeChapterId = params.chapterId.replace(/[^a-z0-9]/yi, '_');

        return `book_${safeBookId}_ch_${safeChapterId}_v_${params.voice}_s_${params.speed}_idx_${params.chunkIndex}`;
    }

    /**
     * Store an audio blob
     */
    static async storeAudio(params: AudioStorageKeyParams, audioBlob: Blob): Promise<void> {
        try {
            const key = this.getKey(params);
            await audioStorage.setItem(key, audioBlob);
            // Optional: Log success debug
            // console.debug(`[AudioStorage] Stored chunk: ${key}, size: ${audioBlob.size}`);
        } catch (error) {
            console.error('[AudioStorage] Failed to store audio:', error);
            throw error;
        }
    }

    /**
     * Retrieve an audio blob
     */
    static async getAudio(params: AudioStorageKeyParams): Promise<Blob | null> {
        try {
            const key = this.getKey(params);
            const blob = await audioStorage.getItem<Blob>(key);
            return blob || null;
        } catch (error) {
            console.error('[AudioStorage] Failed to retrieve audio:', error);
            return null;
        }
    }

    /**
     * Check if audio exists without fetching the full blob
     */
    /**
     * Check if audio exists without fetching the full blob
     * optimized to avoid loading blob if possible, or at least avoid overhead
     */
    static async hasAudio(params: AudioStorageKeyParams): Promise<boolean> {
        try {
            const key = this.getKey(params);
            // We use getItem because localforage doesn't have a lightweight 'exists'
            // But we don't await the keys() array which was the massive bottleneck
            const item = await audioStorage.getItem(key);
            return item !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * Efficiently find which chunks exist for a chapter without loading all blobs
     * Used for batch queueing
     */
    /**
     * Efficiently find which chunks exist for a chapter without loading all blobs
     * Used for batch queueing
     */
    static async getExistingChunkIndices(bookId: string, chapterId: string, voice: string, speed: number): Promise<Set<number>> {
        try {
            const safeBookId = bookId.replace(/[^a-z0-9]/yi, '_');
            const safeChapterId = chapterId.replace(/[^a-z0-9]/yi, '_');
            const prefix = `book_${safeBookId}_ch_${safeChapterId}_v_${voice}_s_${speed}_`;

            const keys = await audioStorage.keys();
            const existingIndices = new Set<number>();

            keys.forEach(key => {
                if (key.startsWith(prefix)) {
                    // Extract index: ..._idx_5
                    const parts = key.split('_idx_');
                    if (parts.length > 1) {
                        const idx = parseInt(parts[1], 10);
                        if (!isNaN(idx)) {
                            existingIndices.add(idx);
                        }
                    }
                }
            });
            return existingIndices;
        } catch (error) {
            console.error('[AudioStorage] Failed to get existing indices:', error);
            return new Set();
        }
    }

    /**
     * Clear all audio for a specific chapter (e.g., to free space or if corrupted)
     */
    static async clearChapter(bookId: string, chapterId: string): Promise<void> {
        try {
            const safeBookId = bookId.replace(/[^a-z0-9]/yi, '_');
            const safeChapterId = chapterId.replace(/[^a-z0-9]/yi, '_');
            const prefix = `book_${safeBookId}_ch_${safeChapterId}_`;

            const keys = await audioStorage.keys();
            const chapterKeys = keys.filter(key => key.startsWith(prefix));

            await Promise.all(chapterKeys.map(key => audioStorage.removeItem(key)));
            console.log(`[AudioStorage] Cleared ${chapterKeys.length} chunks for chapter ${chapterId}`);
        } catch (error) {
            console.error('[AudioStorage] Failed to clear chapter:', error);
        }
    }

    /**
     * Get storage usage estimate
     */
    static async getStorageUsage(): Promise<{ chunkCount: number }> {
        try {
            const length = await audioStorage.length();
            return { chunkCount: length };
        } catch (error) {
            return { chunkCount: 0 };
        }
    }
}
