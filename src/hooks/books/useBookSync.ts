// src/hooks/books/useBookSync.ts
// Hook for managing cloud sync operations

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BookData } from '@/types/books';
import { CloudBookRepository } from '../../services/books/repository/CloudBookRepository';
import { BookSyncService } from '../../services/books/BookSyncService';
import { DefaultBookService } from '../../services/books/DefaultBookService';

export interface UseBookSyncReturn {
    isSyncingFromCloud: boolean;
    syncBooks: (localBooks: BookData[]) => Promise<BookData[]>;
    syncBookToCloud: (book: BookData) => Promise<void>;
    syncProgressToCloud: (bookId: string, currentPage: number, lastChapter: any, progress: number) => Promise<void>;
    flushProgressSync: () => Promise<void>;
    removeBookFromCloud: (bookId: string) => Promise<void>;
}

/**
 * Custom hook for managing cloud sync operations
 * Handles syncing books to/from Supabase
 * Extracted from BookContext to separate cloud sync concerns
 */
export function useBookSync(
    userId: string | undefined,
    isAuthenticated: boolean,
    isInitialLoadComplete: boolean
): UseBookSyncReturn {
    const [isSyncingFromCloud, setIsSyncingFromCloud] = useState<boolean>(false);
    const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Track pending progress and in-flight sync to prevent race conditions
    const pendingProgressRef = useRef<{
        bookId: string;
        currentPage: number;
        lastChapter: any;
        progress: number;
    } | null>(null);
    const currentSyncPromiseRef = useRef<Promise<void> | null>(null);

    // Create repository instance when user is authenticated (memoized)
    const cloudRepository = useMemo(() => {
        if (!userId) return null;
        return new CloudBookRepository(userId);
    }, [userId]);

    // Sync a single book to cloud
    const syncBookToCloud = useCallback(
        async (book: BookData) => {
            if (!isAuthenticated || !userId || !cloudRepository) return;

            try {
                await cloudRepository.syncBookToCloud(book);
            } catch (error) {
                console.error('[useBookSync] Error syncing book to cloud:', error);
                // Don't throw - allow local save even if cloud sync fails
            }
        },
        [isAuthenticated, userId, cloudRepository]
    );

    // Helper function to perform the actual sync
    const performSync = useCallback(
        async (progress: { bookId: string; currentPage: number; lastChapter: any; progress: number }) => {
            try {
                await cloudRepository!.updateBookProgress(
                    progress.bookId,
                    progress.currentPage,
                    progress.lastChapter,
                    progress.progress
                );
                console.log(
                    `[useBookSync] Updated progress for book ${progress.bookId}: page ${progress.currentPage}, progress ${progress.progress}%`
                );
            } catch (error) {
                console.error('[useBookSync] Error syncing progress:', error);
            }
        },
        [cloudRepository]
    );

    // Sync reading progress to cloud (with race condition prevention)
    const syncProgressToCloud = useCallback(
        async (bookId: string, currentPage: number, lastChapter: any, progress: number) => {
            if (!isAuthenticated || !userId || !cloudRepository) return;

            // Always store the latest progress
            pendingProgressRef.current = { bookId, currentPage, lastChapter, progress };

            // If a sync is already in progress, chain the new sync after it completes
            if (currentSyncPromiseRef.current) {
                currentSyncPromiseRef.current = currentSyncPromiseRef.current
                    .then(async () => {
                        // After previous sync completes, check if there's newer progress
                        const pending = pendingProgressRef.current;
                        if (pending) {
                            await performSync(pending);
                        }
                    })
                    .catch(async () => {
                        // If previous sync failed, still try to sync latest progress
                        const pending = pendingProgressRef.current;
                        if (pending) {
                            await performSync(pending);
                        }
                    })
                    .finally(() => {
                        currentSyncPromiseRef.current = null;
                    });
                return;
            }

            // No sync in progress, start sync immediately with latest progress
            const syncPromise = (async () => {
                const pending = pendingProgressRef.current;
                if (!pending) {
                    currentSyncPromiseRef.current = null;
                    return;
                }

                // Store what we're about to sync
                const progressToSync = { ...pending };

                try {
                    await performSync(progressToSync);
                } finally {
                    currentSyncPromiseRef.current = null;

                    // After sync completes, check if newer progress arrived while we were syncing
                    const latestPending = pendingProgressRef.current;
                    if (
                        latestPending &&
                        (latestPending.bookId !== progressToSync.bookId ||
                            latestPending.currentPage !== progressToSync.currentPage)
                    ) {
                        // Newer progress arrived while we were syncing, sync it now
                        // This creates a new promise chain
                        const nextSyncPromise = performSync(latestPending).finally(() => {
                            currentSyncPromiseRef.current = null;
                        });
                        currentSyncPromiseRef.current = nextSyncPromise;
                    }
                }
            })();

            currentSyncPromiseRef.current = syncPromise;
        },
        [isAuthenticated, userId, cloudRepository, performSync]
    );

    // Flush any pending progress sync (useful when closing book)
    const flushProgressSync = useCallback(async () => {
        if (!isAuthenticated || !userId || !cloudRepository) return;

        // Wait for any in-flight sync to complete
        if (currentSyncPromiseRef.current) {
            try {
                await currentSyncPromiseRef.current;
            } catch {
                // Ignore errors from previous sync
            }
        }

        // Sync any pending progress
        const pending = pendingProgressRef.current;
        if (pending) {
            try {
                await performSync(pending);
                pendingProgressRef.current = null;
            } catch (error) {
                console.error('[useBookSync] Error flushing progress sync:', error);
            }
        }
    }, [isAuthenticated, userId, cloudRepository, performSync]);

    // Remove book from cloud
    const removeBookFromCloud = useCallback(
        async (bookId: string) => {
            if (!isAuthenticated || !userId || !cloudRepository) return;

            try {
                await cloudRepository.deleteBook(bookId);
                console.log(`[useBookSync] Removed book ${bookId} from cloud`);
            } catch (error) {
                console.error('[useBookSync] Error removing book from cloud:', error);
            }
        },
        [isAuthenticated, userId, cloudRepository]
    );

    // Sync books from cloud (progressive download)
    const syncBooks = useCallback(
        async (localBooks: BookData[]): Promise<BookData[]> => {
            if (!isAuthenticated || !userId || !cloudRepository) {
                return localBooks;
            }

            // CRITICAL: Wait for initial load to complete before syncing
            if (!isInitialLoadComplete) {
                console.log('[useBookSync] Waiting for initial load to complete before syncing...');
                return localBooks;
            }

            try {
                console.log('[useBookSync] 🚀 Starting sync - User authenticated:', { userId });
                setIsSyncingFromCloud(true);

                // Set up fallback timeout to reset UI state if query hangs
                // This prevents the loader from persisting indefinitely
                const FALLBACK_TIMEOUT_MS = 60000; // 60 seconds
                fallbackTimeoutRef.current = setTimeout(() => {
                    console.warn('[useBookSync] ⚠️ Fallback timeout triggered - Query taking longer than expected');
                    setIsSyncingFromCloud(false);
                }, FALLBACK_TIMEOUT_MS);

                // Fetch books from cloud
                console.log('[useBookSync] Fetching books from cloud repository...');
                const cloudBooks = await cloudRepository.fetchUserBooks();

                // Clear fallback timeout since query completed successfully
                if (fallbackTimeoutRef.current) {
                    clearTimeout(fallbackTimeoutRef.current);
                    fallbackTimeoutRef.current = null;
                }

                console.log(`[useBookSync] Retrieved ${cloudBooks.length} books from Supabase`);

                if (cloudBooks.length === 0) {
                    console.log('[useBookSync] No cloud books to sync');
                    setIsSyncingFromCloud(false);
                    return localBooks;
                }

                // Use BookSyncService to handle progressive sync
                const { updatedBooks, placeholderBooks, downloadPromises } =
                    await BookSyncService.syncBooksProgressive(
                        localBooks,
                        cloudBooks,
                        cloudRepository,
                        (completed, total) => {
                            console.log(`[useBookSync] Progress: ${completed}/${total} books downloaded`);
                        }
                    );

                // Start with updated books + placeholders
                let currentBooks = [...updatedBooks, ...placeholderBooks];

                // Process downloads as they complete
                const downloadResults = await Promise.all(downloadPromises);

                downloadResults.forEach(downloadedBook => {
                    if (downloadedBook) {
                        currentBooks = BookSyncService.processDownloadedBooks(
                            currentBooks,
                            downloadedBook
                        );
                    }
                });

                // Ensure default book is available
                const defaultBook = await DefaultBookService.ensureDefaultBookAvailable(
                    currentBooks
                );
                if (defaultBook && !DefaultBookService.findDefaultBook(currentBooks)) {
                    currentBooks.push(defaultBook);
                }

                console.log(`[useBookSync] 🎉 Sync complete`);
                setIsSyncingFromCloud(false);
                return currentBooks;
            } catch (error) {
                // Clear fallback timeout since we're handling the error
                if (fallbackTimeoutRef.current) {
                    clearTimeout(fallbackTimeoutRef.current);
                    fallbackTimeoutRef.current = null;
                }

                console.error('[useBookSync] Progressive sync failed:', error);
                setIsSyncingFromCloud(false);
                return localBooks;
            } finally {
                if (fallbackTimeoutRef.current) {
                    clearTimeout(fallbackTimeoutRef.current);
                    fallbackTimeoutRef.current = null;
                }
                setIsSyncingFromCloud(false);
            }
        },
        [isAuthenticated, userId, cloudRepository, isInitialLoadComplete]
    );

    // Cleanup timeout and refs on unmount
    useEffect(() => {
        return () => {
            if (fallbackTimeoutRef.current) {
                clearTimeout(fallbackTimeoutRef.current);
                fallbackTimeoutRef.current = null;
            }
            // Clear progress tracking refs
            pendingProgressRef.current = null;
            currentSyncPromiseRef.current = null;
        };
    }, []);

    return {
        isSyncingFromCloud,
        syncBooks,
        syncBookToCloud,
        syncProgressToCloud,
        flushProgressSync,
        removeBookFromCloud,
    };
}
