// src/components/Reader/ReaderWrapper.tsx
// Wrapper component to handle URL params, state restoration, and book loading

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useBook } from '../../context/BookContext';
import { getReaderState, saveReaderState, clearReaderState } from '../../utils/readerState';
import { trackEvent } from '../../lib/analytics';
import Reader from './index';
import SuspenseLoader from '../Common/SuspenseLoader';
import { useToast } from '../../context/ToastContext';

const ReaderWrapper: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const { 
    books, 
    currentBook, 
    openBook, 
    isReading,
    isClosing,
    isInitialLoadComplete,
    currentPageDisplay,
    navigateToTocItem,
    isLoading: bookContextLoading,
    isSyncingFromCloud
  } = useBook();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restorationMethod, setRestorationMethod] = useState<string>('');
  const restorationAttemptedRef = useRef<string | null>(null); // Track which bookId we've attempted to restore
  const booksLengthRef = useRef(books.length); // Track books.length to detect meaningful changes

  useEffect(() => {
    // Update books length ref
    booksLengthRef.current = books.length;
    const restoreReaderState = async () => {
      // CRITICAL: Don't restore if book is being closed
      // This prevents race conditions when closeBook() navigates away
      if (isClosing) {
        console.log('[ReaderWrapper] Book is closing, aborting restoration');
        console.log('[ReaderWrapper Debug] isClosing state:', isClosing);
        setLoading(false);
        return;
      }
      
      // CRITICAL: Wait for initial book load to complete
      // This prevents "book not found" errors during page reload
      // BUT: If book is already open and reading, we don't need to wait
      // ALSO: If books array is empty, wait a bit longer for default book to load (for unauthenticated users)
      if (!isInitialLoadComplete && !isReading) {
        console.log('[ReaderWrapper] Waiting for initial book load to complete...', { isInitialLoadComplete, isReading, currentBookId: currentBook?.id });
        setLoading(true);
        return;
      }
      
      // Wait for cloud sync to complete if it's in progress (prevents trying to restore before sync downloads books)
      // This is especially important when user signs in and books are being downloaded from cloud
      if (isSyncingFromCloud && !isReading) {
        console.log('[ReaderWrapper] Cloud sync in progress, waiting for books to download...', { isSyncingFromCloud, bookId });
        setLoading(true);
        return;
      }
      
      // If books array is empty but we just finished initial load, wait for default book to load
      // This handles the race condition where default book loads after isInitialLoadComplete is set
      // Only wait if we're looking for the default book (unauthenticated users)
      if (isInitialLoadComplete && books.length === 0 && bookId === 'default-book-1984' && !isReading) {
        console.log('[ReaderWrapper] Books array is empty after initial load, waiting for default book...', { bookId, booksCount: books.length });
        // The useEffect will re-run when books array updates (it's in the dependency array)
        setLoading(true);
        return;
      }
      
      // If book is already open and reading, we're good to go
      if (isReading && currentBook?.id === bookId) {
        console.log('[ReaderWrapper] Book is already open and reading, proceeding');
        setLoading(false);
        return;
      }
      
      // OPTIMIZATION: Prevent redundant restoration attempts
      // Only restore if we haven't already attempted this bookId, or if the book isn't already open
      if (restorationAttemptedRef.current === bookId && currentBook?.id === bookId && isReading) {
        console.log('[ReaderWrapper] Restoration already completed for this book, skipping');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      console.log('[ReaderWrapper] Starting state restoration', { bookId, booksCount: books.length, isClosing, isInitialLoadComplete, attemptedBookId: restorationAttemptedRef.current });
      
      // PRIORITY 1: URL parameters (highest priority)
      if (bookId) {
        console.log('[ReaderWrapper] Attempting URL-based restoration');
        setRestorationMethod('url');
        
        const book = books.find(b => b.id === bookId);
        
        if (!book) {
          console.error('[ReaderWrapper] Book not found in local library:', bookId);
          console.log('[ReaderWrapper Debug] Books array during book not found:', books);
          console.log('[ReaderWrapper Debug] isInitialLoadComplete:', isInitialLoadComplete);
          console.log('[ReaderWrapper Debug] isClosing:', isClosing);
          // Track error for analytics
          trackEvent('reader_restoration_error', {
            method: 'url',
            error: 'book_not_found',
            book_id: bookId
          });
          // Clear any stale saved state and redirect with toast
          try { clearReaderState(); } catch {}
          addToast('Unable to open book: This book is not in your library yet. Please sync or try again.', 'error');
          navigate('/', { replace: true });
          return;
        }
        
        // Get page from URL query params
        const searchParams = new URLSearchParams(location.search);
        const pageParam = searchParams.get('page');
        const targetPage = pageParam ? parseInt(pageParam, 10) : book.currentPage;
        
        console.log('[ReaderWrapper] URL restoration details', {
          bookTitle: book.title,
          targetPage,
          currentPage: book.currentPage,
          hasPageParam: !!pageParam,
          isReading,
          currentBookId: currentBook?.id
        });
        
        // Check if this book is already open and in reading state
        // This prevents reopening when user clicks back button or during navigation
        if (currentBook?.id === bookId && isReading) {
          console.log('[ReaderWrapper] Book already open and reading, skipping reopen');
          // Still save state for persistence
          saveReaderState({
            bookId: book.id,
            page: targetPage || currentPageDisplay,
            timestamp: Date.now(),
            bookTitle: book.title
          });
          setLoading(false);
          return;
        }
        
        // Open book if not already open
        if (!currentBook || currentBook.id !== bookId || !isReading) {
          console.log('[ReaderWrapper] Opening book:', book.title);
          try {
            await openBook(book);
            
            // ✅ ONLY mark restoration as completed AFTER openBook succeeds
            // This prevents the ref from blocking retries if opening fails
            restorationAttemptedRef.current = bookId;
            console.log('[ReaderWrapper] Book opened successfully, marking restoration complete');
            
            // Wait a bit for isReading to be set (openBook is async and sets state)
            // Then save state
            setTimeout(() => {
              saveReaderState({
                bookId: book.id,
                page: targetPage || book.currentPage,
                timestamp: Date.now(),
                bookTitle: book.title
              });
              
              // Track successful restoration
              trackEvent('reader_state_restored', {
                method: 'url',
                book_id: bookId,
                page: targetPage || book.currentPage,
                book_title: book.title
              });
            }, 100);
            
          } catch (err) {
            console.error('[ReaderWrapper] Failed to open book:', err);
            console.log('[ReaderWrapper Debug] isClosing after openBook failure:', isClosing);
            console.log('[ReaderWrapper Debug] isInitialLoadComplete after openBook failure:', isInitialLoadComplete);
            // ❌ Reset ref on failure so user can retry
            restorationAttemptedRef.current = null;
            console.log('[ReaderWrapper] Opening failed, reset restoration flag for retry');
            
            // Redirect back with toast
            addToast(`Unable to open book: ${err instanceof Error ? err.message : 'An unexpected error occurred while opening the book.'}`, 'error');
            setLoading(false);
            navigate('/', { replace: true });
            return;
          }
        }
        
        setLoading(false);
        return;
      }
      
      // PRIORITY 2: localStorage recent session (< 1 hour)
      console.log('[ReaderWrapper] Checking localStorage for recent session');
      const recentState = getReaderState();
      if (recentState) {
        console.log('[ReaderWrapper] Found recent session in localStorage:', recentState);
        setRestorationMethod('localStorage');
        
        const book = books.find(b => b.id === recentState.bookId);
        if (book) {
          // Redirect to proper URL
          const redirectUrl = `/reader/${book.id}?page=${recentState.page}`;
          console.log('[ReaderWrapper] Redirecting to URL:', redirectUrl);
          navigate(redirectUrl, { replace: true });
          return;
        } else {
          console.log('[ReaderWrapper] Book from localStorage not found, clearing state');
          clearReaderState();
        }
      }
      
      // PRIORITY 3: No restoration possible, redirect to library immediately with toast
      console.log('[ReaderWrapper] No restoration possible, redirecting to library');
      setRestorationMethod('none');
      // Track that no restoration was possible
      trackEvent('reader_restoration_error', {
        method: 'none',
        error: 'no_book_selected',
        has_url_book_id: !!bookId,
        has_recent_session: !!recentState
      });
      addToast('No book selected: We could not restore your reading session.', 'error');
      navigate('/', { replace: true });
    };
    
    // Only attempt restoration if we have books loaded
    // OR if book is already reading (in which case restoration might have happened already)
    if (books.length > 0 || bookContextLoading === false || (isReading && currentBook?.id === bookId)) {
      restoreReaderState();
    }
  }, [bookId, books.length, location.search, isClosing, isInitialLoadComplete, isReading, currentBook?.id, bookContextLoading, isSyncingFromCloud]); // Optimized dependencies
  
  // Reset restoration ref when navigating to a different book
  useEffect(() => {
    if (restorationAttemptedRef.current !== bookId) {
      console.log('[ReaderWrapper] BookId changed, resetting restoration flag');
      restorationAttemptedRef.current = null;
    }
  }, [bookId]);

  // Show loading while BookContext is loading books
  if (bookContextLoading) {
    return <SuspenseLoader />;
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Open Book</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            Return to Library
          </button>
        </div>
      </div>
    );
  }

  // Show loading while restoring state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Opening Book</h2>
          <p className="text-sm text-gray-600">
            {restorationMethod === 'url' && 'Loading from URL...'}
            {restorationMethod === 'localStorage' && 'Restoring from recent session...'}
            {!restorationMethod && 'Preparing...'}
          </p>
        </div>
      </div>
    );
  }

  // Show reader if book is successfully opened
  // Also check if we're not still trying to restore (avoid flicker)
  if (isReading && currentBook && !loading) {
    return <Reader />;
  }

  // If book is loading/opening, show loading state
  if (loading || (currentBook && !isReading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Opening Book</h2>
          <p className="text-sm text-gray-600">
            {restorationMethod === 'url' && 'Loading from URL...'}
            {restorationMethod === 'localStorage' && 'Restoring from recent session...'}
            {!restorationMethod && 'Preparing...'}
          </p>
        </div>
      </div>
    );
  }

  // Fallback loading state
  return <SuspenseLoader />;
};

export default ReaderWrapper;
