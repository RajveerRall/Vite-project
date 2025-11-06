// src/context/BookContext.tsx
import { trackEvent } from '../lib/analytics';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import localforage from 'localforage'; // Phase 3: Still needed for cleanup operations
import JSZip from 'jszip';
// Dynamic import for xmldom to avoid blocking initial page load
// const { DOMParser } = await import('xmldom');
import { getDirectoryPath, resolveRelativePath } from '../utils/pathUtils';
import { getDOMParser } from './book/domParser';
// import { regenerateCoverUrl } from './book/storage'; // Phase 2: No longer needed directly (handled by repository)

// getDOMParser moved to ./book/domParser
import { processHtmlContent, extractTextFromHtml, cleanEpubContent, deepCleanEpubContent } from '../utils/textExtraction';
import { BookData, TOCItem } from '@/types/books'; // Ensure BookData includes all necessary fields like lastChapter
import { useAuth } from "./AuthContext";
import { imageBlobUrlCache, imageDimensionsCache } from '../utils/imageCache';
// import { supabase, uploadFile, deleteFile, getFileUrl, type BookRecord } from '../lib/supabase'; // Switch to dynamic import
// import { generateUUID } from '../lib/utils'; // Phase 2: No longer needed directly (handled by hooks)
import { registerAdapter, getAdapterForFile } from './book/formats';
import { epubAdapter } from './book/formats/epubAdapter';
import { pdfAdapter } from './book/formats/pdfAdapter';
import { mobiAdapter } from './book/formats/mobiAdapter';
// import { saveReaderState } from '../utils/readerState'; // Phase 3: Now handled by useBookNavigation hook

// Phase 2: Import custom hooks
import { useBookStorage } from '../hooks/books/useBookStorage';
import { useBookSync } from '../hooks/books/useBookSync';
import { useBookLibrary } from '../hooks/books/useBookLibrary';
import { useBookNavigation } from '../hooks/books/useBookNavigation';

// Phase 3: CloudBookRecord moved to CloudBookRepository.ts

// Phase 3: LocalForage config moved to LocalBookRepository

// ... (BookContextValue interface - should be the same as the last full version I provided)
interface BookContextValue {
  books: BookData[];
  addBook: (file: File) => Promise<BookData>;
  removeBook: (bookId: string) => Promise<void>;
  currentBook: BookData | null;
  isReading: boolean;
  isClosing: boolean; // Track when book is being closed
  isLoading: boolean;
  isPageLoading: boolean;
  isInitialLoadComplete: boolean; // Track if initial book load from storage is complete
  bookTitle: string;
  bookAuthor: string;
  currentPageDisplay: number;
  totalPages: number;
  currentContent: string;
  currentPageText: string;
  toc: TOCItem[];
  openBook: (book: BookData) => Promise<void>;
  closeBook: (resetGlobalLoading?: boolean) => void; // Added optional param
  nextPage: () => void;
  prevPage: () => void;
  navigateToTocItem: (item: TOCItem) => void;
  htmlFiles: string[];
  opfPath: string;
  isPlayModeVisible: boolean;
  togglePlayMode: () => void;
  isSyncingFromCloud: boolean; // Add loading state for cloud sync
  // NEW: derived current chapter title for display
  currentChapterTitle: string;
}


const BookContext = createContext<BookContextValue | undefined>(undefined);

export const useBook = (): BookContextValue => {
  const context = useContext(BookContext);
  if (context === undefined) throw new Error('useBook must be used within a BookProvider');
  return context;
};

interface BookProviderProps {
  children: ReactNode;
}

export const BookProvider: React.FC<BookProviderProps> = ({ children }) => {
  // Register format adapters once
  useEffect(() => {
    try {
      registerAdapter(epubAdapter);
      registerAdapter(pdfAdapter);
      registerAdapter(mobiAdapter);
    } catch {}
  }, []);
  const { isAuthenticated, user, hasExplicitlySignedOut } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const [isClosing, setIsClosing] = useState<boolean>(false); // Track when book is being closed to prevent reopening
  
  // Phase 2: Use custom hooks for storage and sync
  const {
    books: storageBooks,
    setBooks,
    isLoading,
    isInitialLoadComplete,
    setIsInitialLoadComplete,
    saveBooks: saveBooksToStorage,
  } = useBookStorage(userId);

  const {
    isSyncingFromCloud,
    syncBooks,
    syncBookToCloud,
    syncProgressToCloud,
    removeBookFromCloud,
  } = useBookSync(userId, isAuthenticated, isInitialLoadComplete);

  // Use storage books as the source of truth
  const books = storageBooks;
  
  // Reading state (not handled by hooks)
  const [currentBook, setCurrentBook] = useState<BookData | null>(null);
  const [isReading, setIsReading] = useState<boolean>(false);
  // Phase 3: Loading state for book operations (openBook/closeBook)
  // Note: isLoading from useBookStorage handles general loading, this is for specific operations
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isBookOperationLoading, setIsBookOperationLoading] = useState<boolean>(false);
  const [isPageLoading, setIsPageLoading] = useState<boolean>(false);
  const [bookTitle, setBookTitle] = useState<string>('');
  const [bookAuthor, setBookAuthor] = useState<string>('');
  const [currentPageDisplay, setCurrentPageDisplay] = useState<number>(0);
  const [currentPageToLoad, setCurrentPageToLoad] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentContent, setCurrentContent] = useState<string>('');
  const [currentPageText, setCurrentPageText] = useState<string>('');
  const [toc, setToc] = useState<TOCItem[]>([]);
  const [bookZip, setBookZip] = useState<any | null>(null); // Changed type to any
  const [opfPath, setOpfPath] = useState<string>('');
  const [htmlFiles, setHtmlFiles] = useState<string[]>([]);
  const [isPlayModeVisible, setIsPlayModeVisible] = useState<boolean>(false);
  
  // Phase 3: Default book refs removed - now handled by DefaultBookService
  // Track reading session start time for analytics
  const readingStartTimestamp = useRef<number | null>(null);
  // Guard ref to prevent infinite loop in sign-out cleanup
  const cleanupCompletedRef = useRef<boolean>(false);
  
  // Phase 2: Use custom hooks for library operations (after ALL state declarations)
  const { addBook: addBookToLibrary, removeBook: removeBookFromLibrary } = useBookLibrary(
    books,
    setBooks,
    setIsBookOperationLoading, // Use local loading state for book operations
    isAuthenticated,
    syncBookToCloud
  );
  
  // Phase 2: Use navigation hook (after ALL state declarations)
  useBookNavigation(isReading, currentBook, currentPageDisplay, totalPages);
  // Adapter session for non-EPUB formats (single active book at a time)
  const currentAdapterSessionRef = useRef<{
    bookId: string;
    adapterId: string;
    loadPage: (index: number) => Promise<{ html: string; text: string }>;
    getToc: () => Promise<TOCItem[]>;
    dispose?: () => void;
  } | null>(null);

  // NEW: Derive currentChapterTitle from the current book's lastChapter label
  const currentChapterTitle = useMemo(() => {
    if (!currentBook) return '';
    const fresh = books.find(b => b.id === currentBook.id);
    const label = (fresh?.lastChapter as any)?.label || (currentBook.lastChapter as any)?.label;
    return typeof label === 'string' ? label : '';
  }, [books, currentBook]);

  // Phase 2: Storage is now handled by useBookStorage hook
  // The hook automatically loads books on mount and when userId changes

  // *** FIXED: Clean up user-specific data when user signs out ***
  // This effect now includes safeguards to prevent clearing books during page refresh
  // when the user is just temporarily unauthenticated
  useEffect(() => {
    // DEBUG: Log condition variables to diagnose inconsistent behavior
    console.log('[BookContext Cleanup Check] Condition variables:', {
      userId: userId || 'null',
      isInitialLoadComplete,
      hasExplicitlySignedOut,
      cleanupCompleted: cleanupCompletedRef.current,
      conditionMet: !userId && isInitialLoadComplete && hasExplicitlySignedOut && !cleanupCompletedRef.current
    });
    
    // FIXED: Only run cleanup if user has EXPLICITLY signed out
    // Also check if cleanup has already completed to prevent infinite loop
    if (!userId && isInitialLoadComplete && hasExplicitlySignedOut && !cleanupCompletedRef.current) {
      console.log('[BookContext Cleanup] Starting cleanup process...');
      // Mark cleanup as started to prevent re-running
      cleanupCompletedRef.current = true;
      
      // Add a delay to prevent clearing books during page refresh
      // This gives the auth context time to restore the user's session
      const timeoutId = setTimeout(async () => {
        if (!userId) {
          // FIXED: Don't reset state if we're on the reader route and a book is open
          // This prevents the loader from appearing unnecessarily during auth state changes
          const isOnReaderRoute = window.location.pathname.startsWith('/reader');
          if (isOnReaderRoute && isReading && currentBook) {
            console.log('[BookContext] Book is open and reading on reader route, skipping cleanup that would reset isInitialLoadComplete');
            cleanupCompletedRef.current = false; // Reset flag so cleanup can run later
            return; // Skip cleanup to preserve reading state
          }
          
          // The hasExplicitlySignedOut flag is already checked in the outer useEffect condition
          // If we're here, it means the user has explicitly signed out
          // No need for additional "hasUploadedBooks" safeguards
          console.log('[BookContext] User confirmed signed out after delay, clearing user-specific books');
          
          const clearUserData = async () => {
            try {
              // Clear all books from state
              setBooks([]);
              
              // Clear ALL user-specific keys from localforage (including current user's keys)
              const allKeys = await localforage.keys();
              console.log('[BookContext] All keys in storage:', allKeys);
              
              // Remove any keys that start with 'user_' (user-specific data)
              const userKeys = allKeys.filter(key => 
                key.startsWith('user_') && 
                (key.includes('book_metadata_') || key.includes('book_file_'))
              );
              
              console.log('[BookContext] Found user-specific keys to remove:', userKeys);
              
              for (const key of userKeys) {
                await localforage.removeItem(key);
                console.log(`[BookContext] Removed user key: ${key}`);
              }
              
              // *** FIXED: Remove ALL book keys when user signs out, except the default book ***
              // When userId is undefined (signed out), we need to clear all books
              const allBookKeys = allKeys.filter(key => 
                key.includes('book_metadata_') || key.includes('book_file_')
              );
              
              console.log('[BookContext] Found all book keys to process:', allBookKeys);
              
              for (const key of allBookKeys) {
                // Check if this is the default book (1984) - preserve it
                if (key.startsWith('book_metadata_')) {
                  const metadata = await localforage.getItem(key) as BookData;
                  if (metadata && metadata.title === '1984') {
                    console.log(`[BookContext] Preserving default book key: ${key}`);
                    continue; // Keep the default book
                  }
                }
                
                // Remove all other book keys
                await localforage.removeItem(key);
                console.log(`[BookContext] Removed book key: ${key}`);
              }
             
              // Clear current book state
              setCurrentBook(null);
              setIsReading(false);
              setBookZip(null);
              setOpfPath('');
              setHtmlFiles([]);
              setToc([]);
              setCurrentContent('');
              setBookTitle('');
              setBookAuthor('');
              setIsPlayModeVisible(false);
              setCurrentPageText('');
              setCurrentPageToLoad(0);
              setCurrentPageDisplay(0);
              setTotalPages(0);
              
              console.log('[BookContext] User data cleared, ready for new user or default book');
              
              // *** NEW: Load the default book after clearing user data ***
              // This ensures users always see the default book when signed out
              const { DefaultBookService } = await import('../services/books/DefaultBookService');
              const defaultBook = await DefaultBookService.loadDefaultBook();
              if (defaultBook) {
                setBooks([defaultBook]);
                console.log('[BookContext] Default book loaded after sign-out cleanup');
                // OPTIMIZED: Only set isInitialLoadComplete once at the end
                // No need to toggle false/true - just set it to true after cleanup completes
                setIsInitialLoadComplete(true);
              } else {
                // Even if default book failed to load, set isInitialLoadComplete to true
                // to prevent infinite loader state
                setIsInitialLoadComplete(true);
              }
            } catch (error) {
              console.error('[BookContext] Error clearing user data:', error);
              // Ensure isInitialLoadComplete is set even on error
              setIsInitialLoadComplete(true);
            }
          };
          
          clearUserData();
        } else {
          console.log('[BookContext] User re-authenticated during delay, skipping book cleanup');
          cleanupCompletedRef.current = false; // Reset flag if user re-authenticated
        }
      }, 2000); // 2 second delay to allow auth context to restore session
      
      // Cleanup timeout if userId changes before delay completes
      return () => {
        clearTimeout(timeoutId);
        // If effect re-runs before timeout completes, reset the flag
        cleanupCompletedRef.current = false;
      };
    }
  }, [userId, isInitialLoadComplete, hasExplicitlySignedOut]);
  
  // Reset cleanup guard when user signs in (userId becomes defined)
  // This allows cleanup to run again if user signs out again later
  useEffect(() => {
    if (userId) {
      cleanupCompletedRef.current = false;
      console.log('[BookContext] User signed in, resetting cleanup guard');
    }
  }, [userId]);

  // =================================================================
// PASTE THIS ENTIRE BLOCK INTO YOUR BookContext.tsx FILE
// =================================================================

  // Phase 3: Save books to storage when books array changes
  // Use ref to prevent save/load loops
  const isSavingRef = useRef(false);
  const lastSavedBooksRef = useRef<string>('');
  
  useEffect(() => {
    // This is a safety check. It prevents the app from saving an empty
    // book list when it first starts, before it has loaded your library.
    if (!isInitialLoadComplete) {
      return;
    }

    // Don't save during sync to prevent race conditions
    if (isSyncingFromCloud) {
      console.log('[BookContext Save] Skipping save during sync to prevent race conditions');
      return;
    }

    // Don't save if user is signing out (userId is undefined) and books are already cleared
    if (!userId && books.length === 0) {
      console.log('[BookContext Save] Skipping save - user signing out, books already cleared');
      return;
    }

    // Prevent save/load loops: only save if books actually changed
    const booksKey = JSON.stringify(books.map(b => ({ id: b.id, currentPage: b.currentPage, lastChapter: b.lastChapter })));
    if (lastSavedBooksRef.current === booksKey) {
      console.log('[BookContext Save] Books unchanged, skipping save');
      return;
    }

    // Prevent concurrent saves
    if (isSavingRef.current) {
      console.log('[BookContext Save] Save already in progress, skipping');
      return;
    }

    isSavingRef.current = true;
    lastSavedBooksRef.current = booksKey;

    // Save books using the hook's save function
    saveBooksToStorage(books, true)
      .then(() => {
        isSavingRef.current = false;
      })
      .catch(error => {
        console.error('[BookContext Save] Error saving books:', error);
        isSavingRef.current = false;
        lastSavedBooksRef.current = ''; // Reset to allow retry
      });
  }, [books, isInitialLoadComplete, isSyncingFromCloud, userId, saveBooksToStorage]);

  // Cleanup blob URLs when component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      books.forEach(book => {
        if (book.coverUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(book.coverUrl);
        }
      });
    };
  }, []); // Empty dependency array means this runs only on unmount

  // Phase 3: Cloud sync is handled by useBookSync hook
  // Track if sync has already run to prevent infinite loops
  const syncHasRunRef = useRef<string | null>(null);
  const booksRef = useRef(books);
  
  // Keep booksRef in sync with books
  useEffect(() => {
    booksRef.current = books;
  }, [books]);
  
  // Trigger sync when user signs in and initial load completes
  useEffect(() => {
    // Only sync once per authentication session
    const syncKey = userId && isInitialLoadComplete ? `${userId}-${isInitialLoadComplete}` : null;
    
    if (isAuthenticated && userId && isInitialLoadComplete && syncHasRunRef.current !== syncKey) {
      console.log('[BookContext] Triggering sync for user:', userId);
      syncHasRunRef.current = syncKey;
      
      // Use ref to get current books without causing dependency issues
      const currentBooks = booksRef.current;
      syncBooks(currentBooks)
        .then(syncedBooks => {
          // Only update if books actually changed (deep comparison)
          const booksChanged =
            syncedBooks.length !== currentBooks.length ||
            syncedBooks.some((b, i) => b.id !== currentBooks[i]?.id);
          if (booksChanged) {
            console.log('[BookContext] Books changed after sync, updating state');
            setBooks(syncedBooks);
          } else {
            console.log('[BookContext] No changes after sync, skipping update');
          }
        })
        .catch(error => {
          console.error('[BookContext] Sync error:', error);
          // Reset sync flag on error so it can retry
          syncHasRunRef.current = null;
        });
    }
    
    // Reset sync flag when user changes (signs out or different user signs in)
    if (!isAuthenticated || !userId) {
      syncHasRunRef.current = null;
    }
  }, [isAuthenticated, userId, isInitialLoadComplete, syncBooks, setBooks]); // syncBooks is stable from useCallback

// =================================================================

  // Phase 3: Cleanup - removed commented code and duplicate functions
  // All storage, sync, and library operations are now handled by hooks

  // Use library hook for addBook
  const addBook = addBookToLibrary;

    const findChapterForPageCallback = useCallback((pageIndex: number, currentToc: TOCItem[], currentHtmlFiles: string[]): TOCItem | null => {
    if (!currentHtmlFiles || currentHtmlFiles.length === 0 || !currentToc || currentToc.length === 0 || pageIndex < 0 || pageIndex >= currentHtmlFiles.length) return null;
    const currentFile = currentHtmlFiles[pageIndex];
    if (!currentFile) return null;
    const searchInToc = (items: TOCItem[]): TOCItem | null => {
        for (const tocItem of items) {
            if (tocItem.href) {
                 const itemFilePath = tocItem.href.split('#')[0];
                 if (currentFile.endsWith(itemFilePath)) return tocItem;
            }
            if (tocItem.children?.length) {
                const foundInChildren = searchInToc(tocItem.children);
                if (foundInChildren) return foundInChildren;
            }
        }
        return null;
    };
    return searchInToc(currentToc);
  }, []);

  const loadPageCallback = useCallback(async (
    pageIdxToLoad: number,
    zipToUse: any,
    filesInOrder: string[],
    currentBookRef: BookData | null,
    currentTocRef: TOCItem[]
  ) => {
    console.log(`[loadPageCallback ENTER] pageIdxToLoad: ${pageIdxToLoad}, zipExists: ${!!zipToUse}, filesLength: ${filesInOrder?.length ?? 0}`);
    if (!zipToUse || !filesInOrder || filesInOrder.length === 0 || pageIdxToLoad < 0 || pageIdxToLoad >= filesInOrder.length) {
      console.error(`[loadPageCallback ABORT] Invalid conditions. pageIdx: ${pageIdxToLoad}, zip: ${!!zipToUse}, filesLen: ${filesInOrder?.length ?? 0}`);
      setCurrentContent('<div>Error: Could not load page.</div>');
      setCurrentPageText('');
      setIsPageLoading(false);
      return;
    }
    setIsPageLoading(true);
    try {
      const filePath = filesInOrder[pageIdxToLoad];
      console.log(`[loadPageCallback] Loading file: ${filePath}`);
      const htmlTextContent = await zipToUse.file(filePath)?.async('text');
      if (htmlTextContent == null) throw new Error(`Could not load HTML for ${filePath}`);
      console.log(`[loadPageCallback] HTML fetched for ${filePath}, length: ${htmlTextContent.length}`);
      const fileDir = getDirectoryPath(filePath);
      const processedHtml = processHtmlContent(htmlTextContent, fileDir, zipToUse, filePath);
      console.log(`[loadPageCallback] HTML processed for ${filePath}`);
      
      // Clean the HTML content to remove headers, titles, and navigation elements
      const cleanedHtml = cleanEpubContent(processedHtml);
      console.log(`[loadPageCallback] HTML cleaned for ${filePath}`);
      
      // Apply deep cleaning to remove CSS rules, metadata, and other unwanted content
      const deepCleanedHtml = deepCleanEpubContent(cleanedHtml);
      console.log(`[loadPageCallback] HTML deep cleaned for ${filePath}`);
      
      setCurrentContent(deepCleanedHtml);
      setCurrentPageDisplay(pageIdxToLoad);
      const extractedText = extractTextFromHtml(deepCleanedHtml);
      console.log(`[DEBUG] extractTextFromHtml result:`, {
        originalLength: processedHtml.length,
        extractedLength: extractedText.length,
        extractedPreview: extractedText.substring(0, 200),
        hasHtmlTags: /<[^>]+>/.test(extractedText)
      });
      setCurrentPageText(extractedText);
      if (currentBookRef) {
        const chapterForPage = findChapterForPageCallback(pageIdxToLoad, currentTocRef, filesInOrder);
        console.log(`[loadPageCallback] Saving progress - page: ${pageIdxToLoad}, chapter: ${chapterForPage?.label || 'none'}, bookId: ${currentBookRef.id}`);
        setBooks(prevBooks =>
          prevBooks.map(b =>
            b.id === currentBookRef.id ? { ...b, currentPage: pageIdxToLoad, lastChapter: chapterForPage } : b
          )
        );

        // Phase 2: Sync progress to cloud using hook
          syncProgressToCloud(currentBookRef.id, pageIdxToLoad, chapterForPage);
      }
      setTimeout(() => { /* Image/CSS processing logic - unchanged */
        const contentElement = document.querySelector('.epub-content');
        if (contentElement) {
          const images = contentElement.querySelectorAll('img');
          images.forEach(async (img: HTMLImageElement) => {
            // Check if src is set to about:blank or invalid - this indicates it needs processing
            const currentSrc = img.getAttribute('src') || img.src;
            const epubSrc = img.getAttribute('data-epub-src');
            
            // Skip if image already has a valid blob URL
            if (currentSrc && currentSrc.startsWith('blob:')) {
              return;
            }
            
            // Only process if we have a valid epubSrc
            if (epubSrc && epubSrc.trim() && !epubSrc.startsWith('blob:') && epubSrc !== 'about:blank') {
              try {
                const imageBlob = await zipToUse.file(epubSrc)?.async('blob');
                if (imageBlob) {
                  const blobUrl = URL.createObjectURL(imageBlob);
                  img.src = blobUrl;
                  
                  // Cache blob URL and dimensions for future use
                  imageBlobUrlCache.set(epubSrc, blobUrl);
                  
                  // Fade in the image smoothly once it loads
                  img.onload = () => {
                    img.style.opacity = '1';
                    // Cache dimensions when image loads
                    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                      imageDimensionsCache.set(epubSrc, {
                        width: img.naturalWidth,
                        height: img.naturalHeight
                      });
                    }
                  };
                  img.onerror = () => {
                    console.warn(`Image failed to load from blob URL: ${epubSrc}`);
                    img.style.opacity = '0.5';
                  };
                } else { 
                  console.warn(`Image not found in zip: ${epubSrc}`); 
                  img.alt = `Missing: ${epubSrc}`;
                  img.style.opacity = '0.5'; // Show placeholder state
                  // Remove invalid src to prevent about:blank errors
                  img.removeAttribute('src');
                }
              } catch (e) { 
                console.error(`Error loading image ${epubSrc}:`, e);
                img.style.opacity = '0.3'; // Show error state
                // Remove invalid src to prevent about:blank errors
                img.removeAttribute('src');
              }
            } else if (currentSrc === 'about:blank' || !epubSrc || epubSrc === 'about:blank') {
              // Handle images with invalid src or missing epubSrc
              console.warn(`Image has invalid src or missing data-epub-src:`, { src: currentSrc, epubSrc });
              img.removeAttribute('src');
              img.style.opacity = '0.3';
              img.alt = 'Image unavailable';
            }
          });
          const links = contentElement.querySelectorAll('link[data-epub-css-href]');
          links.forEach(async (link: Element) => {
            const cssPath = (link as HTMLLinkElement).getAttribute('data-epub-css-href');
            if(cssPath){
                try {
                    const cssFileContent = await zipToUse.file(cssPath)?.async('text');
                    if (cssFileContent) {
                        const style = document.createElement('style');
                        style.textContent = cssFileContent;
                        link.parentNode?.replaceChild(style, link);
                    } else { console.warn(`CSS not found: ${cssPath}`); link.remove(); }
                } catch (e) { console.error(`Error loading CSS ${cssPath}:`, e); }
            }
          });
        }
      }, 100);
    } catch (error) {
      console.error('[loadPageCallback ERROR]', error);
      setCurrentContent(`<div>Error loading page: ${(error as Error).message}</div>`);
      setCurrentPageText('');
    } finally {
      setIsPageLoading(false);
      console.log(`[loadPageCallback EXIT] pageIdxToLoad: ${pageIdxToLoad}`);
    }
  }, [findChapterForPageCallback, isAuthenticated, userId, syncProgressToCloud]);

  useEffect(() => { /* useEffect for Page Loading - supports adapter sessions */
    console.log('[useEffect PageLoad] Triggered. States:', {
      currentBookName: currentBook?.title, bookZipExists: !!bookZip, htmlFilesCount: htmlFiles.length,
      currentPageToLoad, tocCount: toc.length, isReading
    });
    const session = currentAdapterSessionRef.current;
    const useAdapter = !!(session && currentBook && session.bookId === currentBook.id && session.adapterId !== 'epub');
    if (isReading && currentBook && htmlFiles && htmlFiles.length > 0 &&
        currentPageToLoad >= 0 && currentPageToLoad < htmlFiles.length) {
      if (useAdapter && session) {
        (async () => {
          try {
            setIsPageLoading(true);
            const { html, text } = await session.loadPage(currentPageToLoad);
            setCurrentContent(html);
            setCurrentPageDisplay(currentPageToLoad);
            setCurrentPageText(text);
            const chapterForPage = findChapterForPageCallback(currentPageToLoad, toc, htmlFiles);
            setBooks(prevBooks =>
              prevBooks.map(b =>
                b.id === currentBook.id ? { ...b, currentPage: currentPageToLoad, lastChapter: chapterForPage } : b
              )
            );
            // Phase 2: Sync progress to cloud using hook
              syncProgressToCloud(currentBook.id, currentPageToLoad, chapterForPage);
          } catch (e) {
            console.error('[useEffect PageLoad Adapter ERROR]', e);
            setCurrentContent(`<div>Error loading page: ${(e as Error).message}</div>`);
            setCurrentPageText('');
          } finally {
            setIsPageLoading(false);
          }
        })();
      } else if (bookZip) {
        console.log('[useEffect PageLoad] Conditions MET. Calling loadPageCallback.');
        loadPageCallback(currentPageToLoad, bookZip, htmlFiles, currentBook, toc);
      } else {
        console.log('[useEffect PageLoad] No adapter session and no EPUB zip available.');
      }
    } else {
      console.log('[useEffect PageLoad] Conditions NOT MET or book not in reading state.');
      if (!currentBook || !isReading) {
        setCurrentContent(''); setCurrentPageText(''); setCurrentPageDisplay(0);
        console.log('[useEffect PageLoad] Cleaned up content for closed/non-reading book.');
      } else {
         console.log('[useEffect PageLoad] Book open but other conditions failed.');
      }
    }
  }, [currentBook, bookZip, htmlFiles, currentPageToLoad, loadPageCallback, toc, isReading]);

  // Phase 3: Use library hook for removeBook with cloud cleanup
  const removeBook = async (bookId: string): Promise<void> => {
    // Remove from local state using library hook
    await removeBookFromLibrary(bookId);
    
    // Remove from cloud if user is signed in
    if (isAuthenticated && userId) {
      await removeBookFromCloud(bookId);
    }
  };

  const extractTocFromEntries = useCallback(async ( /* Unchanged */
    zip: any, manifestItems: HTMLCollectionOf<Element>, spineElement: Element | null,
    opfFileDirVal: string, xmlParser: DOMParser, fileOrderList: string[]
  ): Promise<TOCItem[]> => {
    let tocPath = ''; let tocItems: TOCItem[] = []; let tocFound = false;
    const opfFileDir = opfFileDirVal;
    for (let i = 0; i < manifestItems.length; i++) {
        const item = manifestItems[i];
        const properties = item.getAttribute('properties');
        if (properties && properties.includes('nav')) {
            const href = item.getAttribute('href');
            if (href) {
                tocPath = resolveRelativePath(opfFileDir, href);
                try {
                    const navContent = await zip.file(tocPath)?.async('text');
                    if (navContent) {
                        const navDoc = xmlParser.parseFromString(navContent, 'application/xhtml+xml');
                        const navElements = navDoc.getElementsByTagName('nav');
                        for (let k = 0; k < navElements.length; k++) {
                            if (navElements[k].getAttribute('epub:type') === 'toc') {
                                const ol = navElements[k].getElementsByTagName('ol')[0];
                                if (ol) {
                                    const parseNavOl = (element: Element, currentNavDocPath: string): TOCItem[] => {
                                        const children: TOCItem[] = [];
                                        const listItems = Array.from(element.childNodes).filter(n => n.nodeName === 'li') as Element[];
                                        listItems.forEach((li, index) => {
                                            const anchor = li.getElementsByTagName('a')[0];
                                            if (anchor) {
                                                const tocHref = anchor.getAttribute('href') || '';
                                                const resolvedHref = resolveRelativePath(getDirectoryPath(currentNavDocPath), tocHref);
                                                const childItem: TOCItem = {
                                                    id: `toc-nav-${resolvedHref}-${index}`,
                                                    label: anchor.textContent?.trim() || 'Untitled',
                                                    href: resolvedHref, children: [],
                                                };
                                                const nestedOl = li.getElementsByTagName('ol')[0];
                                                if (nestedOl) childItem.children = parseNavOl(nestedOl, currentNavDocPath);
                                                children.push(childItem);
                                            }
                                        }); return children;
                                    };
                                    tocItems = parseNavOl(ol, tocPath); tocFound = true; break;
                                } } } }
                } catch (e) { console.error("Error parsing EPUB3 nav:", tocPath, e); }
                if (tocFound) break;
            } } }
    if (!tocFound && spineElement) { /* NCX parsing - unchanged */
        const tocId = spineElement.getAttribute('toc'); let ncxHref = '';
        if (tocId) {
            for (let i = 0; i < manifestItems.length; i++) {
                if (manifestItems[i].getAttribute('id') === tocId) { ncxHref = manifestItems[i].getAttribute('href') || ''; break; } }
        } else {
             for (let i = 0; i < manifestItems.length; i++) {
                if (manifestItems[i].getAttribute('media-type') === 'application/x-dtbncx+xml') { ncxHref = manifestItems[i].getAttribute('href') || ''; break; } } }
        if (ncxHref) {
            tocPath = resolveRelativePath(opfFileDir, ncxHref);
            try {
                const ncxContent = await zip.file(tocPath)?.async('text');
                if (ncxContent) {
                    const ncxDoc = xmlParser.parseFromString(ncxContent, 'application/xml');
                    const navMap = ncxDoc.getElementsByTagName('navMap')[0];
                    if (navMap) {
                        const parseNavPoints = (parentElement: Element, currentNcxDocPath: string): TOCItem[] => {
                            const children: TOCItem[] = [];
                             const navPoints = Array.from(parentElement.childNodes).filter(n => n.nodeName === 'navPoint') as Element[];
                            navPoints.forEach((navPoint) => {
                                const navLabel = navPoint.getElementsByTagName('navLabel')[0]?.getElementsByTagName('text')[0]?.textContent?.trim() || 'Untitled';
                                const contentSrc = navPoint.getElementsByTagName('content')[0]?.getAttribute('src') || '';
                                const resolvedSrc = resolveRelativePath(getDirectoryPath(currentNcxDocPath), contentSrc);
                                const item: TOCItem = {
                                    id: navPoint.getAttribute('id') || `toc-ncx-${resolvedSrc}`,
                                    label: navLabel, href: resolvedSrc,
                                    children: parseNavPoints(navPoint, currentNcxDocPath),
                                }; children.push(item);
                            }); return children;
                        };
                        tocItems = parseNavPoints(navMap, tocPath); tocFound = true;
                    } }
            } catch (e) { console.error("Error parsing NCX:", tocPath, e); }
        } }
    if (!tocFound || tocItems.length === 0) { /* Fallback to spine - unchanged */
        tocItems = fileOrderList.map((filePath, index) => ({
            id: `spine-toc-${index}`,
            label: filePath.substring(filePath.lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "") || `Chapter ${index + 1}`,
            href: filePath, children: [],
        })); }
    return tocItems;
  }, []);

  const openBook = async (book: BookData): Promise<void> => { /* Extended to support adapter sessions */
    console.log(`[openBook] Opening: ${book.title}`); 
    console.time(`[Performance] Opening ${book.title}`);
    setIsBookOperationLoading(true);
    setIsClosing(false);
    setBookTitle(book.title); setBookAuthor(book.author); setCurrentBook(book);

    // Fire-and-forget: warm up Kokoro via microserver to reduce cold starts
    try {
      const { triggerKokoroWakeup } = await import('../utils/kokoroWakeup');
      triggerKokoroWakeup();
    } catch {}
    try {
      // Determine if a non-EPUB adapter should handle this book
      const adapter = await getAdapterForFile(book.file);
      console.log(`[openBook] Detected adapter for ${book.file.name}:`, adapter?.id || 'none');
      if (adapter && adapter.id !== 'epub') {
        console.log(`[openBook] Using adapter: ${adapter.id}`);
        const result = await adapter.open(book.file);
        console.log(`[openBook] Adapter result meta:`, result.meta);
        currentAdapterSessionRef.current = {
          bookId: book.id,
          adapterId: adapter.id,
          loadPage: result.loadPage,
          getToc: result.getToc,
          dispose: result.dispose,
        };

        const fileOrder = Array.from({ length: Math.max(1, result.meta.totalPages || 0) }, (_, i) => `page-${i + 1}`);
        setHtmlFiles(fileOrder); setTotalPages(fileOrder.length);
        console.log(`[openBook] Calling getToc() for adapter ${adapter.id}...`);
        const extractedToc = await result.getToc();
        console.log(`[openBook] Extracted TOC from adapter:`, extractedToc);
        setToc(extractedToc);
        setBookZip(null); setIsReading(true);

        // PRIORITY 1: URL parameter (if present) - highest priority
        const urlParams = new URLSearchParams(window.location.search);
        const urlPageParam = urlParams.get('page');
        let pageIdxToLoadInitially = 0;
        
        if (urlPageParam !== null) {
          const urlPage = parseInt(urlPageParam, 10);
          if (!isNaN(urlPage) && urlPage >= 0 && urlPage < fileOrder.length) {
            pageIdxToLoadInitially = urlPage;
            console.log(`[openBook Adapter] Using URL page parameter: ${urlPage}`);
          } else {
            console.warn(`[openBook Adapter] Invalid URL page parameter: ${urlPageParam}, falling back to saved position`);
          }
        }
        
        // PRIORITY 2: Use saved currentPage if no URL param
        if (urlPageParam === null && book.currentPage != null && book.currentPage >= 0 && book.currentPage < fileOrder.length) {
          pageIdxToLoadInitially = book.currentPage;
          console.log(`[openBook Adapter] Using saved currentPage: ${book.currentPage}`);
        }
        
        pageIdxToLoadInitially = Math.max(0, Math.min(pageIdxToLoadInitially, fileOrder.length - 1));
        setCurrentPageToLoad(pageIdxToLoadInitially); setCurrentPageDisplay(pageIdxToLoadInitially);
        
        // Navigate to reader URL
        navigate(`/reader/${book.id}?page=${pageIdxToLoadInitially}`);
        
        // Track navigation event
        trackEvent('book_navigation', {
          method: 'open_book',
          book_id: book.id,
          book_title: book.title,
          target_page: pageIdxToLoadInitially,
          has_url_page_param: false
        });
        setBooks(prevBooks => prevBooks.map(b => b.id === book.id ? { ...b, lastRead: new Date().toISOString(), totalPages: fileOrder.length } : b));
        trackEvent('open_book', {
          book_title: book.title,
          book_author: book.author || 'Unknown',
          book_id: book.id,
          total_pages: fileOrder.length,
          starting_page: pageIdxToLoadInitially,
          has_last_chapter: !!book.lastChapter,
          platform: 'web',
          timestamp: new Date().toISOString()
        });
        readingStartTimestamp.current = Date.now();
        console.timeEnd(`[Performance] Opening ${book.title}`);
        console.log(`[Performance] Book ${book.title} opened successfully`);
        return;
      }
      // Remove dynamic import - JSZip is now preloaded
      console.log(`[Performance] Loading ZIP for ${book.title}...`);
      const zip = new JSZip(); const loadedZip = await zip.loadAsync(book.file);
      console.log(`[Performance] ZIP loaded, processing EPUB structure...`);
      const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
      if (!containerXml) throw new Error('EPUB Load Error: META-INF/container.xml not found');
      const DOMParser = await getDOMParser();
      const parser = new DOMParser(); 
      const containerDoc = parser.parseFromString(containerXml, 'application/xml');
      const rootfiles = containerDoc.getElementsByTagName('rootfile');
      if (rootfiles.length === 0) throw new Error('EPUB Load Error: No rootfile in container.xml');
      const currentOpfPath = rootfiles[0].getAttribute('full-path') || ''; setOpfPath(currentOpfPath);
      const opfFileDir = getDirectoryPath(currentOpfPath);
      const opfContent = await loadedZip.file(currentOpfPath)?.async('text');
      if (!opfContent) throw new Error(`EPUB Load Error: OPF file not found at ${currentOpfPath}`);
      const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      const manifestElement = opfDoc.getElementsByTagName('manifest')[0];
      const spineElement = opfDoc.getElementsByTagName('spine')[0];
      if (!manifestElement || !spineElement) throw new Error('EPUB Load Error: Missing manifest or spine.');
      const manifestItems = manifestElement.getElementsByTagName('item'); const spineItemRefs = spineElement.getElementsByTagName('itemref');
      const currentFileOrder: string[] = [];
      for (let i = 0; i < spineItemRefs.length; i++) {
        const idref = spineItemRefs[i].getAttribute('idref');
        for (let j = 0; j < manifestItems.length; j++) {
          if (manifestItems[j].getAttribute('id') === idref) {
            const href = manifestItems[j].getAttribute('href');
            if (href) currentFileOrder.push(resolveRelativePath(opfFileDir, href));
            else console.warn(`Manifest item ${idref} has no href.`);
            break;
          } } }
      if (currentFileOrder.length === 0) throw new Error("EPUB Load Error: No content files in spine.");
      setHtmlFiles(currentFileOrder); setTotalPages(currentFileOrder.length);
      console.log(`[Performance] Extracting table of contents...`);
      
      // Defer TOC extraction slightly to improve perceived performance
      const extractedToc = await new Promise<TOCItem[]>((resolve) => {
        setTimeout(async () => {
          const toc = await extractTocFromEntries(loadedZip, manifestItems, spineElement, opfFileDir, parser, currentFileOrder);
          resolve(toc);
        }, 0); // Allow UI to update first
      });
      
      setToc(extractedToc);
      setBookZip(loadedZip); setIsReading(true);
      
      // IMPROVED: Better logic for determining the initial page to load
      // PRIORITY 1: URL parameter (if present) - highest priority
      const urlParams = new URLSearchParams(window.location.search);
      const urlPageParam = urlParams.get('page');
      let pageIdxToLoadInitially = 0; // Default to first page
      
      if (urlPageParam !== null) {
        const urlPage = parseInt(urlPageParam, 10);
        if (!isNaN(urlPage) && urlPage >= 0 && urlPage < currentFileOrder.length) {
          pageIdxToLoadInitially = urlPage;
          console.log(`[openBook] Using URL page parameter: ${urlPage}`);
        } else {
          console.warn(`[openBook] Invalid URL page parameter: ${urlPageParam}, falling back to saved position`);
        }
      }
      
      // PRIORITY 2: If no URL param, try to use the lastChapter if it exists and is valid
      if (urlPageParam === null) {
        console.log(`[openBook] Book restoration data - currentPage: ${book.currentPage}, lastChapter: ${book.lastChapter?.label || 'none'}`);
        
        // First, try to use the lastChapter if it exists and is valid
        if (book.lastChapter?.href && extractedToc.length > 0) {
          console.log(`[openBook] Attempting to restore from lastChapter: ${book.lastChapter.href}`);
          const chapterPath = book.lastChapter.href.split('#')[0];
          
          // Try multiple matching strategies for better compatibility
          let pageIndexFromChapter = currentFileOrder.findIndex(file => {
            // Strategy 1: Exact match
            if (file === chapterPath) return true;
            // Strategy 2: File ends with the chapter path
            if (file.endsWith('/' + chapterPath)) return true;
            // Strategy 3: Chapter path ends with the file name (reverse match)
            const fileName = file.split('/').pop() || '';
            const chapterFileName = chapterPath.split('/').pop() || '';
            if (fileName === chapterFileName && fileName.length > 0) return true;
            // Strategy 4: Both paths normalized (remove leading ./ or ../)
            const normalizedFile = file.replace(/^\.\.?\//g, '');
            const normalizedChapter = chapterPath.replace(/^\.\.?\//g, '');
            if (normalizedFile === normalizedChapter) return true;
            return false;
          });
          
          if (pageIndexFromChapter !== -1) {
            pageIdxToLoadInitially = pageIndexFromChapter;
            console.log(`[openBook] Successfully matched lastChapter to page index: ${pageIndexFromChapter}`);
          } else {
            console.warn(`[openBook] Could not match lastChapter "${chapterPath}" to any file in currentFileOrder:`, currentFileOrder);
            // Fallback to currentPage if lastChapter matching fails
            if (book.currentPage != null && book.currentPage >= 0 && book.currentPage < currentFileOrder.length) {
              pageIdxToLoadInitially = book.currentPage;
              console.log(`[openBook] Falling back to saved currentPage: ${book.currentPage}`);
            }
          }
        }
        
        // PRIORITY 3: If no lastChapter was found/used and no URL param, use currentPage
        if (pageIdxToLoadInitially === 0 && book.currentPage != null && book.currentPage >= 0 && book.currentPage < currentFileOrder.length) {
          pageIdxToLoadInitially = book.currentPage;
          console.log(`[openBook] Using saved currentPage: ${book.currentPage}`);
        }
      }
      
      // Final fallback: if we still have pageIdxToLoadInitially === 0 and no URL param was set
      if (pageIdxToLoadInitially === 0 && urlPageParam === null && book.currentPage != null && book.currentPage >= 0 && book.currentPage < currentFileOrder.length) {
        pageIdxToLoadInitially = book.currentPage;
        console.log(`[openBook] Final fallback: Using saved currentPage: ${book.currentPage}`);
      }
      
      if (pageIdxToLoadInitially === 0 && urlPageParam === null && !book.lastChapter && (!book.currentPage || book.currentPage === 0)) {
        console.log(`[openBook] No valid saved position found, starting from beginning`);
      }
      
      // Ensure the page index is within valid bounds
      pageIdxToLoadInitially = Math.max(0, Math.min(pageIdxToLoadInitially, currentFileOrder.length - 1));
      
      setCurrentPageToLoad(pageIdxToLoadInitially); setCurrentPageDisplay(pageIdxToLoadInitially);
      console.log(`[openBook] Successfully prepared: ${book.title}. Page to load: ${pageIdxToLoadInitially} (total pages: ${currentFileOrder.length})`);
      
      // Navigate to reader URL
      navigate(`/reader/${book.id}?page=${pageIdxToLoadInitially}`);
      
      // Track navigation event
      trackEvent('book_navigation', {
        method: 'open_book',
        book_id: book.id,
        book_title: book.title,
        target_page: pageIdxToLoadInitially,
        has_url_page_param: false
      });
      
      setBooks(prevBooks => prevBooks.map(b => b.id === book.id ? { ...b, lastRead: new Date().toISOString() } : b));
      // 4. TRACK THE EVENT AND START THE TIMER
      trackEvent('open_book', {
        book_title: book.title,
        book_author: book.author || 'Unknown',
        book_id: book.id,
        total_pages: currentFileOrder.length,
        starting_page: pageIdxToLoadInitially,
        has_last_chapter: !!book.lastChapter,
        platform: 'web',
        timestamp: new Date().toISOString()
      });
      readingStartTimestamp.current = Date.now(); // Start the timer
      console.timeEnd(`[Performance] Opening ${book.title}`);
      console.log(`[Performance] Book ${book.title} opened successfully`);
    } catch (error) {
      console.timeEnd(`[Performance] Opening ${book.title}`);
      console.error(`[Performance] Failed to open ${book.title}:`, error);
      console.error('[openBook ERROR]', error);
      // Cleanup state on error without calling closeBook (which navigates away)
      setIsReading(false);
      setCurrentBook(null);
      setBookZip(null);
      setIsBookOperationLoading(false);
      alert(`Error opening book: ${(error as Error).message}`);
    } finally {
      setIsBookOperationLoading(false);
    }
  };

  const closeBook = (resetGlobalLoading = true): void => { /* Unchanged */
    // CRITICAL: Set closing flag FIRST to prevent ReaderWrapper from reopening
    setIsClosing(true);
    console.log('[closeBook] Setting isClosing flag to true');
    console.log('[closeBook Debug] Current Book when closing:', currentBook?.id);
    console.log('[closeBook Debug] isReading when closing:', isReading);
    // 5. TRACK THE EVENT AND CALCULATE DURATION
    if (readingStartTimestamp.current && currentBook) {
      const endTime = Date.now();
      const durationInSeconds = Math.round((endTime - readingStartTimestamp.current) / 1000);
      
      trackEvent('close_book', {
        book_title: currentBook.title,
        book_author: currentBook.author || 'Unknown',
        book_id: currentBook.id,
        reading_duration_seconds: durationInSeconds,
        final_page: currentPageDisplay,
        total_pages_read: currentPageDisplay + 1,
        platform: 'web',
        timestamp: new Date().toISOString()
      });

      readingStartTimestamp.current = null; // Reset the timer
    }
    console.log("[closeBook] Closing book."); setIsReading(false); setCurrentBook(null); setBookZip(null);
    console.log('[closeBook Debug] After state reset: isReading:', isReading, 'currentBook:', currentBook);
    setOpfPath(''); setHtmlFiles([]); setToc([]); setCurrentContent(''); setBookTitle('');
    setBookAuthor(''); setIsPlayModeVisible(false); setCurrentPageText('');
    setCurrentPageToLoad(0); setCurrentPageDisplay(0);
    if (resetGlobalLoading) setIsBookOperationLoading(false);
    setIsPageLoading(false);
    
    // Navigate back to library
    navigate('/');
    
    // Reset closing flag after navigation completes
    setTimeout(() => {
      setIsClosing(false);
      console.log('[closeBook] Reset isClosing flag to false');
    }, 150); // Slightly longer timeout to ensure navigation completes
    
    // Track navigation event
    trackEvent('book_navigation', {
      method: 'close_book',
      book_id: currentBook?.id || 'unknown',
      book_title: currentBook?.title || 'unknown',
      target_page: 'library',
      final_page: currentPageDisplay
    });
  };

  const nextPage = (): void => { /* Unchanged */


    if (isReading && currentPageToLoad < totalPages - 1) {
      // 6. TRACK PAGE TURNS
      trackEvent('turn_page', {
        direction: 'next',
        page_number: currentPageToLoad + 1,
        book_title: currentBook?.title || 'Unknown',
        book_id: currentBook?.id || 'Unknown',
        total_pages: totalPages,
        progress_percentage: Math.round(((currentPageToLoad + 1) / totalPages) * 100),
        platform: 'web',
        timestamp: new Date().toISOString()
      });
      console.log(`[nextPage] current: ${currentPageToLoad}, total: ${totalPages}`);
      setCurrentPageToLoad(prev => prev + 1);
    }
  };
  const prevPage = (): void => { /* Unchanged */
    if (isReading && currentPageToLoad > 0) {

      // 6. TRACK PAGE TURNS
      trackEvent('turn_page', {
        direction: 'previous',
        page_number: currentPageToLoad - 1,
        book_title: currentBook?.title || 'Unknown',
        book_id: currentBook?.id || 'Unknown',
        total_pages: totalPages,
        progress_percentage: Math.round(((currentPageToLoad - 1) / totalPages) * 100),
        platform: 'web',
        timestamp: new Date().toISOString()
      });
      console.log(`[prevPage] current: ${currentPageToLoad}`);
      setCurrentPageToLoad(prev => prev - 1);
    }
  };
  const navigateToTocItem = (item: TOCItem): void => { /* Unchanged */
    if (!isReading || !htmlFiles || htmlFiles.length === 0) {
    
    console.warn("[navigateToTocItem] Aborted: Not reading or no HTML files."); return; }
    const [pathPart, fragment] = item.href.split('#');
    console.log(`[navigateToTocItem] To href: ${item.href} (pathPart: ${pathPart})`);
    const fileIndex = htmlFiles.findIndex(file => file === pathPart);
    if (fileIndex !== -1) {
          // THIS is the point of success. Track the event here.
      trackEvent('use_feature', {
        feature_name: 'table_of_contents',
        chapter_title: item.label,
        book_title: currentBook?.title || 'Unknown',
        book_id: currentBook?.id || 'Unknown',
        target_page: fileIndex + 1,
        total_pages: totalPages,
        platform: 'web',
        timestamp: new Date().toISOString()
      });
      console.log(`[navigateToTocItem] Found file at index: ${fileIndex}. Loading.`);
      setCurrentPageToLoad(fileIndex);
      if (fragment) { setTimeout(() => { /* fragment scrolling - unchanged */
          const element = document.getElementById(fragment);
          if (element) element.scrollIntoView({ behavior: 'smooth' });
          else console.warn(`[navigateToTocItem] Fragment not found: #${fragment}`);
        }, 350); }
    } else { console.warn(`[navigateToTocItem] Could not find file for TOC item: ${item.href}`); }
  };

  // const togglePlayMode = (): void => setIsPlayModeVisible(!isPlayModeVisible); /* Unchanged */

  const togglePlayMode = (): void => {
    // 8. TRACK TEXT-TO-SPEECH USAGE
    if (!isPlayModeVisible) { // Only track when the user STARTS it
        trackEvent('use_feature', {
            feature_name: 'text_to_speech',
            book_title: currentBook?.title || 'Unknown',
            book_id: currentBook?.id || 'Unknown',
            current_page: currentPageDisplay,
            total_pages: totalPages,
            platform: 'web',
            timestamp: new Date().toISOString()
        });
    }
    setIsPlayModeVisible(!isPlayModeVisible);
  };

  // URL synchronization: Update URL when page changes
  // Phase 3: Navigation URL sync is handled by useBookNavigation hook
  // Removed duplicate effect to avoid conflicts

  const value: BookContextValue = {
    books, addBook, removeBook,
    currentBook, isReading, isClosing, isLoading, isPageLoading, isInitialLoadComplete, bookTitle, bookAuthor,
    currentPageDisplay, totalPages, currentContent, currentPageText, toc,
    openBook, closeBook, nextPage, prevPage, navigateToTocItem,
    htmlFiles, opfPath,
    isPlayModeVisible, togglePlayMode,
    isSyncingFromCloud, // Add loading state
    currentChapterTitle,
  };

  return (
    <BookContext.Provider value={value}>
      {children}
    </BookContext.Provider>
  );
};