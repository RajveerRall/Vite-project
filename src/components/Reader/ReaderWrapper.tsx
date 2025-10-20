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
    isLoading: bookContextLoading 
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
        setLoading(false);
        return;
      }
      
      // CRITICAL: Wait for initial book load to complete
      // This prevents "book not found" errors during page reload
      if (!isInitialLoadComplete) {
        console.log('[ReaderWrapper] Waiting for initial book load to complete...');
        setLoading(true);
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
          // Track error for analytics
          trackEvent('reader_restoration_error', {
            method: 'url',
            error: 'book_not_found',
            book_id: bookId
          });
          // Clear any stale saved state and redirect with toast
          try { clearReaderState(); } catch {}
          addToast({
            type: 'error',
            title: 'Unable to open book',
            description: 'This book is not in your library yet. Please sync or try again.'
          });
          navigate('/', { replace: true });
          return;
        }
        
        // Check if this book is already open and in reading state
        // This prevents reopening when user clicks back button
        if (currentBook?.id === bookId && isReading) {
          console.log('[ReaderWrapper] Book already open, skipping reopen');
          setLoading(false);
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
          hasPageParam: !!pageParam
        });
        
        // Open book if not already open
        if (!currentBook || currentBook.id !== bookId) {
          console.log('[ReaderWrapper] Opening book:', book.title);
          try {
            await openBook(book);
            
            // ✅ ONLY mark restoration as completed AFTER openBook succeeds
            // This prevents the ref from blocking retries if opening fails
            restorationAttemptedRef.current = bookId;
            console.log('[ReaderWrapper] Book opened successfully, marking restoration complete');
            
          } catch (err) {
            console.error('[ReaderWrapper] Failed to open book:', err);
            
            // ❌ Reset ref on failure so user can retry
            restorationAttemptedRef.current = null;
            console.log('[ReaderWrapper] Opening failed, reset restoration flag for retry');
            
            // Redirect back with toast
            addToast({
              type: 'error',
              title: 'Unable to open book',
              description: err instanceof Error ? err.message : 'An unexpected error occurred while opening the book.'
            });
            setLoading(false);
            navigate('/', { replace: true });
            return;
          }
        }
        
        // Navigate to correct page if specified and different from current
        if (targetPage && targetPage !== currentPageDisplay && targetPage >= 0) {
          console.log('[ReaderWrapper] Navigating to page:', targetPage);
          // Note: We'll need to implement navigateToPage in BookContext
          // For now, we'll let the book open at its saved position
        }
        
        // Save current state to localStorage for future restoration
        saveReaderState({
          bookId: book.id,
          page: targetPage || book.currentPage,
          timestamp: Date.now(),
          bookTitle: book.title
        });
        
        setLoading(false);
        
        // Track successful restoration
        trackEvent('reader_state_restored', {
          method: 'url',
          book_id: bookId,
          page: targetPage || book.currentPage,
          book_title: book.title
        });
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
      addToast({
        type: 'error',
        title: 'No book selected',
        description: 'We could not restore your reading session.'
      });
      navigate('/', { replace: true });
    };
    
    // Only attempt restoration if we have books loaded
    if (books.length > 0 || bookContextLoading === false) {
      restoreReaderState();
    }
  }, [bookId, books.length, location.search, isClosing, isInitialLoadComplete, isReading, currentBook?.id]); // Optimized dependencies
  
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
  if (isReading && currentBook) {
    return <Reader />;
  }

  // Fallback loading state
  return <SuspenseLoader />;
};

export default ReaderWrapper;
