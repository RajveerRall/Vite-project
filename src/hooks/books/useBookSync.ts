import { useState, useEffect, useCallback } from 'react';
import { BookData } from '@/types/books';

export interface UseBookSyncReturn {
    isSyncingFromCloud: boolean;
    syncBooks: (localBooks: BookData[]) => Promise<BookData[]>;
    syncBookToCloud: (book: BookData) => Promise<void>;
    syncProgressToCloud: (bookId: string, currentPage: number, lastChapter: any, progress: number, revision?: number) => Promise<void>;
    flushProgressSync: () => Promise<void>;
    removeBookFromCloud: (bookId: string) => Promise<void>;
}

/**
 * Custom hook for managing cloud sync operations
 * Handles syncing books to/from Supabase
 * Extracted from BookContext to separate cloud sync concerns
 */
export function useBookSync(
    _userId: string | undefined,
    _isAuthenticated: boolean,
    _isInitialLoadComplete: boolean
): UseBookSyncReturn {
    // Force sync state to always be false
    const [isSyncingFromCloud, setIsSyncingFromCloud] = useState<boolean>(false);

    // No-op versions of all sync functions
    const syncBooks = useCallback(async (localBooks: BookData[]): Promise<BookData[]> => {
        // console.log('[useBookSync] Cloud sync disabled (Local Mode). Returning local books immediately.');
        return localBooks;
    }, []);

    const syncBookToCloud = useCallback(async (_book: BookData) => {
        // console.log('[useBookSync] Cloud upload disabled (Local Mode).');
        return Promise.resolve();
    }, []);

    const syncProgressToCloud = useCallback(async (_bookId: string, _currentPage: number, _lastChapter: any, _progress: number, _revision?: number) => {
        // console.log(`[useBookSync] Cloud progress sync disabled (Local Mode). Book: ${_bookId}, Page: ${_currentPage}`);
        return Promise.resolve();
    }, []);

    const flushProgressSync = useCallback(async () => {
        return Promise.resolve();
    }, []);

    const removeBookFromCloud = useCallback(async (_bookId: string) => {
        // console.log(`[useBookSync] Cloud delete disabled (Local Mode). Book: ${_bookId}`);
        return Promise.resolve();
    }, []);

    // Ensure we don't accidentally stick in loading state
    useEffect(() => {
        if (isSyncingFromCloud) {
            setIsSyncingFromCloud(false);
        }
    }, [isSyncingFromCloud]);

    return {
        isSyncingFromCloud: false, // Always return false
        syncBooks,
        syncBookToCloud,
        syncProgressToCloud,
        flushProgressSync,
        removeBookFromCloud,
    };
}
