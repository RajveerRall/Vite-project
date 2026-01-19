/**
 * Repository for managing TTS progress persistence in localStorage
 * Implements Repository pattern for storage operations
 */

import { TTS_STORAGE } from '../constants/tts';
import { IProgressRepository, TTSProgressData } from '../types/tts';

export class TTSProgressRepository implements IProgressRepository {
  private instanceId: string;

  constructor(instanceId?: string) {
    this.instanceId = instanceId || `TTSRepo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Generate storage key for a book/page combination
   */
  getStorageKey(bookTitle: string, pageDisplay: number): string | null {
    if (!bookTitle) return null;
    const safeTitle = bookTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${TTS_STORAGE.PREFIX}${safeTitle}_page${pageDisplay}`;
  }

  /**
   * Save resume index to localStorage
   */
  async saveResumeIndex(bookTitle: string, pageDisplay: number, index: number): Promise<void> {
    const key = this.getStorageKey(bookTitle, pageDisplay);
    if (!key || index < 0) return;

    try {
      const data: TTSProgressData = {
        index,
        timestamp: Date.now(),
        pageDisplay,
        bookTitle,
      };

      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`[TTS Repository] Error saving:`, error);
      throw new Error(`Failed to save resume index: ${error}`);
    }
  }

  /**
   * Load resume index from localStorage
   */
  async loadResumeIndex(
    bookTitle: string,
    pageDisplay: number,
    pageTextLength: number
  ): Promise<number | null> {
    const key = this.getStorageKey(bookTitle, pageDisplay);
    if (!key) return null;

    try {
      const storedData = localStorage.getItem(key);
      if (!storedData) return null;

      const data: TTSProgressData = JSON.parse(storedData);

      // Validate data structure
      if (!data || typeof data.index !== 'number') {
        localStorage.removeItem(key);
        return null;
      }

      // Check if index is still valid (not beyond page text length)
      if (pageTextLength > 0 && data.index >= pageTextLength) {
        localStorage.removeItem(key);
        return null;
      }

      // Check if data is too old (optional: expire after MAX_AGE)
      const age = Date.now() - data.timestamp;
      if (age > TTS_STORAGE.MAX_AGE_MS) {
        localStorage.removeItem(key);
        return null;
      }

      return data.index;
    } catch (error) {
      console.error(`[TTS Repository] Error loading:`, error);
      // Clean up corrupted data
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Clear resume index from localStorage
   */
  async clearResumeIndex(bookTitle: string, pageDisplay: number): Promise<void> {
    const key = this.getStorageKey(bookTitle, pageDisplay);
    if (!key) return;

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`[TTS Repository] Error clearing:`, error);
      throw new Error(`Failed to clear resume index: ${error}`);
    }
  }
}

/**
 * Factory function to create a repository instance
 */
export function createTTSProgressRepository(instanceId?: string): TTSProgressRepository {
  return new TTSProgressRepository(instanceId);
}

