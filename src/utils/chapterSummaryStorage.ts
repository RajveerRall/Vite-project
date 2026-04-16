/**
 * Utility functions for storing and retrieving chapter summaries in localStorage
 */

export interface ChapterSummary {
  summary: string;
  chapterTitle?: string;
  timestamp: number;
  bookId: string;
}

/**
 * Generate a unique key for a chapter summary
 * Uses bookId + chapterTitle if available, otherwise uses a hash of chapterText
 */
export function getChapterSummaryKey(
  bookId: string,
  chapterTitle?: string,
  chapterText?: string
): string {
  if (chapterTitle) {
    // Use bookId + chapterTitle for unique identification
    return `chapter-summary-${bookId}-${chapterTitle}`;
  } else if (chapterText) {
    // Fallback: use a simple hash of first 100 chars + length
    const hash = chapterText.substring(0, 100).length + '-' + chapterText.length;
    return `chapter-summary-${bookId}-${hash}`;
  }
  return `chapter-summary-${bookId}-unknown`;
}

/**
 * Save a chapter summary to localStorage
 */
export function saveChapterSummary(
  bookId: string,
  summary: string,
  chapterTitle?: string,
  chapterText?: string
): void {
  try {
    const key = getChapterSummaryKey(bookId, chapterTitle, chapterText);
    const data: ChapterSummary = {
      summary,
      chapterTitle,
      timestamp: Date.now(),
      bookId,
    };
    localStorage.setItem(key, JSON.stringify(data));
    console.log('[chapterSummaryStorage] Saved summary to localStorage:', key);
  } catch (error) {
    console.error('[chapterSummaryStorage] Failed to save summary:', error);
  }
}

/**
 * Load a chapter summary from localStorage
 */
export function loadChapterSummary(
  bookId: string,
  chapterTitle?: string,
  chapterText?: string
): ChapterSummary | null {
  try {
    const key = getChapterSummaryKey(bookId, chapterTitle, chapterText);
    const stored = localStorage.getItem(key);
    if (stored) {
      const data: ChapterSummary = JSON.parse(stored);
      // Verify it's for the same book
      if (data.bookId === bookId) {
        console.log('[chapterSummaryStorage] Loaded summary from localStorage:', key);
        return data;
      }
    }
  } catch (error) {
    console.error('[chapterSummaryStorage] Failed to load summary:', error);
  }
  return null;
}

/**
 * Clear all chapter summaries for a specific book (optional cleanup)
 */
export function clearBookSummaries(bookId: string): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(`chapter-summary-${bookId}-`)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('[chapterSummaryStorage] Failed to clear summaries:', error);
  }
}








