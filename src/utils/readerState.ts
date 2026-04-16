// src/utils/readerState.ts
// Centralized state persistence utilities for reader state

export interface ReaderState {
  bookId: string;
  page: number;
  timestamp: number;
  bookTitle?: string;
  chapterTitle?: string;
}

const READER_STATE_KEY = 'yoread_reader_state';
const MAX_STATE_AGE = 60 * 60 * 1000; // 1 hour

/**
 * Save reader state to localStorage
 * @param state - The reader state to save
 */
export function saveReaderState(state: ReaderState): void {
  try {
    localStorage.setItem(READER_STATE_KEY, JSON.stringify(state));
    console.log('[ReaderState] Saved state:', { bookId: state.bookId, page: state.page });
  } catch (e) {
    console.error('[ReaderState] Failed to save:', e);
  }
}

/**
 * Get reader state from localStorage
 * @returns The saved reader state or null if not found/expired
 */
export function getReaderState(): ReaderState | null {
  try {
    const stored = localStorage.getItem(READER_STATE_KEY);
    if (!stored) return null;
    
    const state: ReaderState = JSON.parse(stored);
    
    // Check if state is still fresh (< 1 hour old)
    if (Date.now() - state.timestamp > MAX_STATE_AGE) {
      console.log('[ReaderState] State expired, clearing');
      clearReaderState();
      return null;
    }
    
    console.log('[ReaderState] Retrieved state:', { bookId: state.bookId, page: state.page });
    return state;
  } catch (e) {
    console.error('[ReaderState] Failed to load:', e);
    return null;
  }
}

/**
 * Clear reader state from localStorage
 */
export function clearReaderState(): void {
  try {
    localStorage.removeItem(READER_STATE_KEY);
    console.log('[ReaderState] Cleared state');
  } catch (e) {
    console.error('[ReaderState] Failed to clear:', e);
  }
}

/**
 * Check if there's a recent reading session
 * @returns true if there's a valid recent session
 */
export function hasRecentSession(): boolean {
  const state = getReaderState();
  return state !== null;
}

/**
 * Get the age of the current reader state in minutes
 * @returns Age in minutes, or null if no state
 */
export function getStateAge(): number | null {
  const state = getReaderState();
  if (!state) return null;
  
  return Math.floor((Date.now() - state.timestamp) / (1000 * 60));
}
