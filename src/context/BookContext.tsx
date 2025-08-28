// src/context/BookContext.tsx
import { trackEvent } from '../lib/analytics';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import localforage from 'localforage';
import JSZip from 'jszip';
// Dynamic import for xmldom to avoid blocking initial page load
// const { DOMParser } = await import('xmldom');
import { getDirectoryPath, resolveRelativePath } from '../utils/pathUtils';

// Helper function to get DOMParser dynamically
const getDOMParser = async () => {
  const { DOMParser } = await import('xmldom');
  return DOMParser;
};
import { processHtmlContent, extractTextFromHtml, cleanEpubContent, deepCleanEpubContent } from '../utils/textExtraction';
import { BookData, TOCItem } from '@/types/books'; // Ensure BookData includes all necessary fields like lastChapter
import { useAuth } from "./AuthContext";
// import { supabase, uploadFile, deleteFile, getFileUrl, type BookRecord } from '../lib/supabase'; // Switch to dynamic import
import { generateUUID } from '../lib/utils';

// Lightweight local type to avoid importing supabase client at startup
interface CloudBookRecord {
  id: string;
  user_id: string;
  title: string;
  author?: string;
  current_page: number;
  last_chapter?: string | null;
  total_pages: number;
  last_read: string;
  file_url?: string | null;
  cover_url?: string | null;
}

localforage.config({
  name: "EbookReaderApp",  // Database name
  storeName: "bookStorage" // Object store for BookContext's data
});

// ... (BookContextValue interface - should be the same as the last full version I provided)
interface BookContextValue {
  books: BookData[];
  addBook: (file: File) => Promise<void>;
  removeBook: (bookId: string) => Promise<void>;
  currentBook: BookData | null;
  isReading: boolean;
  isLoading: boolean;
  isPageLoading: boolean;
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
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;
  const [books, setBooks] = useState<BookData[]>([]);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState<boolean>(false); // New state
  const [isSyncingFromCloud, setIsSyncingFromCloud] = useState<boolean>(false); // New loading state
  
  // ... (all other state declarations from the previous full version remain the same)
  const [currentBook, setCurrentBook] = useState<BookData | null>(null);
  const [isReading, setIsReading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
  // *** NEW: Add a ref to ensure the default book is only loaded once per session ***
  const defaultBookLoadAttempted = useRef(false);
    // 2. Add a ref to track when a book reading session starts
  const readingStartTimestamp = useRef<number | null>(null);


  // 1. Load books from LocalForage on initial mount
  useEffect(() => {
    const loadBooksFromStorage = async () => {
      console.log("[LocalForage Load] Attempting to load books.");
      // Use unique timer name to avoid conflicts in development
      const timerName = `[Perf] localforage-initial-load-${Date.now()}`;
      console.time(timerName);
      setIsLoading(true);
      try {
        const keys = await localforage.keys();
        
        // Use user-specific prefixes when authenticated, fallback to old format for backwards compatibility
        const userPrefix = userId ? `user_${userId}_` : '';
        const metadataPrefix = userPrefix ? `${userPrefix}book_metadata_` : 'book_metadata_';
        const bookMetadataKeys = keys.filter(key => key.startsWith(metadataPrefix));
        
        console.log(`[LocalForage Load] Using prefix: "${metadataPrefix}", found ${bookMetadataKeys.length} books`);
        let loadedBooks: BookData[] = [];

        // *** NEW: If no books are in storage, load the default book ***
        if (bookMetadataKeys.length === 0 && !defaultBookLoadAttempted.current) {
          console.log("[Default Book] Library is empty. Attempting to load default book.");
          defaultBookLoadAttempted.current = true; // Prevent re-loading

          // AWAIT the result of loading the default book.
          const defaultBook = await loadDefaultBook();
          if (defaultBook) {
            // Add it directly to the array we will use to set the state.
            loadedBooks.push(defaultBook);
          }
        } else {
            // If storage is NOT empty, load from it as before.
            for (const key of bookMetadataKeys) {
                const bookId = key.replace(metadataPrefix, '');
                const metadata = await localforage.getItem(key) as BookData;
                const filePrefix = userPrefix ? `${userPrefix}book_file_` : 'book_file_';
                const fileKey = `${filePrefix}${bookId}`;
                const file = await localforage.getItem(fileKey) as File;

                if (metadata && file) {
                    console.log(`[LocalForage Load] Loaded book: ${metadata.title}, currentPage: ${metadata.currentPage}, lastChapter: ${metadata.lastChapter?.label || 'none'}`);
                    
                    // Regenerate cover URL since blob URLs don't persist across page reloads
                    const freshCoverUrl = await regenerateCoverUrl(file);
                    const bookWithFreshCover = { 
                        ...metadata, 
                        file: file,
                        coverUrl: freshCoverUrl || metadata.coverUrl // Use fresh URL if available, otherwise keep old one
                    };
                    
                    console.log(`[LocalForage Load] Cover regenerated for "${metadata.title}": ${freshCoverUrl ? 'Success' : 'Failed'}`);
                    loadedBooks.push(bookWithFreshCover);
                }
            }
        }

        // Set the state ONCE with the final list of books.
        setBooks(loadedBooks);
        console.log("[LocalForage Load] Finished loading books. Final Count:", loadedBooks.length);
        
        // *** NEW: Ensure default book is always available when user is not authenticated ***
        if (!userId && loadedBooks.length === 0 && !defaultBookLoadAttempted.current) {
          console.log("[Default Book] User not authenticated and no books loaded, ensuring default book is available");
          const defaultBook = await loadDefaultBook();
          if (defaultBook) {
            setBooks([defaultBook]);
            console.log("[Default Book] Default book loaded for unauthenticated user");
          }
        }

      } catch (error) {
        console.error("[LocalForage Load] Error loading books from storage", error);
        setBooks([]); // Fallback to empty library on error
      } finally {
        console.timeEnd(timerName);
        setIsLoading(false);
        setIsInitialLoadComplete(true);
      }
    };

    loadBooksFromStorage();
  }, [userId]); // Depend on userId so it reloads when user signs in/out

  // *** NEW: Clean up user-specific data when user signs out ***
  useEffect(() => {
    if (!userId && isInitialLoadComplete) {
      // User has signed out, clear all user-specific books and reset to default
      console.log('[BookContext] User signed out, clearing user-specific books');
      
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
               const bookId = key.replace('book_metadata_', '');
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
          
          // Reset flags
          defaultBookLoadAttempted.current = false;
          setIsInitialLoadComplete(false);
          
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
          const defaultBook = await loadDefaultBook();
          if (defaultBook) {
            setBooks([defaultBook]);
            console.log('[BookContext] Default book loaded after sign-out cleanup');
          }
        } catch (error) {
          console.error('[BookContext] Error clearing user data:', error);
        }
      };
      
      clearUserData();
    }
  }, [userId, isInitialLoadComplete]);


  // =================================================================
// PASTE THIS ENTIRE BLOCK INTO YOUR BookContext.tsx FILE
// =================================================================

  // 2. Save books to LocalForage whenever the 'books' array changes
useEffect(() => {
  // This is a safety check. It prevents the app from saving an empty
  // book list when it first starts, before it has loaded your library.
  if (!isInitialLoadComplete) {
    return;
  }

  // *** NEW: Don't cleanup during sync to prevent race conditions ***
  // This prevents the race condition where cleanup runs before Supabase sync completes
  if (isSyncingFromCloud) {
    console.log('[LocalForage Save] Skipping cleanup during sync to prevent race conditions');
    return;
  }

  // *** NEW: Don't cleanup if we're in the middle of authentication changes ***
  // This prevents cleanup from running during sign-in/sign-out transitions
  if (!isInitialLoadComplete) {
    console.log('[LocalForage Save] Skipping cleanup - initial load not complete');
    return;
  }

  // *** NEW: Don't cleanup if user is signing out (userId is undefined) ***
  // This prevents cleanup from running during the sign-out process
  if (!userId && books.length === 0) {
    console.log('[LocalForage Save] Skipping cleanup - user signing out, books already cleared');
    return;
  }

  // *** NEW: Don't cleanup if we're in the middle of clearing user data ***
  // This prevents cleanup from running during the sign-out cleanup process
  if (!userId && !isInitialLoadComplete) {
    console.log('[LocalForage Save] Skipping cleanup - user data clearing in progress');
    return;
  }

  const saveBooksToStorage = async () => {
    console.log(`[LocalForage Save] A change was detected. Saving ${books.length} books.`);
    try {
      // To correctly handle book removals, we will find all keys for books
      // that are no longer in our current library state and remove them.
      const allKeysInStorage = await localforage.keys();
      const currentBookIds = new Set(books.map(b => b.id));

      for (const key of allKeysInStorage) {
        if (key.startsWith('book_metadata_') || key.startsWith('book_file_')) {
          const bookIdInKey = key.replace('book_metadata_', '').replace('book_file_', '');
          if (!currentBookIds.has(bookIdInKey)) {
            // *** NEW: Never remove the default book (1984) ***
            const metadata = await localforage.getItem(key) as BookData;
            if (metadata && metadata.title === '1984') {
              console.log(`[LocalForage Save] Preserving default book: ${metadata.title}`);
              continue; // Skip removal for default book
            }
            
            console.log(`[LocalForage Save] Removing stale book key: ${key}`);
            await localforage.removeItem(key);
          }
        }
      }

      // Now, save each book that is currently in the state.
      for (const book of books) {
        // We separate the large file from its metadata for efficiency
        const { file, ...metadata } = book;
        console.log(`[LocalForage Save] Saving book: ${metadata.title}, currentPage: ${metadata.currentPage}, lastChapter: ${metadata.lastChapter?.label || 'none'}`);
        await localforage.setItem(`book_metadata_${book.id}`, metadata);
        await localforage.setItem(`book_file_${book.id}`, file);
      }

      console.log("[LocalForage Save] All books have been successfully saved.");

    } catch (error) {
      console.error('[LocalForage Save] An error occurred while saving books:', error);
    }
  };

  saveBooksToStorage();

}, [books, isInitialLoadComplete, isSyncingFromCloud]); // This hook runs ONLY when the 'books' array changes.

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

  // Sync books from cloud when user signs in
  useEffect(() => {
    console.log('[SupabaseSync] 🔍 Effect triggered:', { isAuthenticated, userId });
    
    const syncBooksOnLogin = async () => {
      if (isAuthenticated && userId) {
        try {
          console.log('[SupabaseSync] 🚀 Starting sync - User authenticated:', { userId });
          setIsSyncingFromCloud(true);
          console.log('[SupabaseSync] User signed in, starting progressive sync...');

          const { supabase } = await import('../lib/supabase');

          // Fetch books metadata from Supabase
          const { data: cloudBooksData, error } = await supabase
            .from('books')
            .select('*')
            .eq('user_id', userId)
            .order('last_read', { ascending: false });

          if (error) {
            throw new Error(`Supabase fetch error: ${error.message}`);
          }

          console.log(`[SupabaseSync] Retrieved ${cloudBooksData.length} books from Supabase`);

          if (cloudBooksData.length === 0) {
            console.log('[SupabaseSync] No cloud books to sync');
            setIsSyncingFromCloud(false);
            return;
          }

          // Debug: Show file_url values from database
          console.log('[SupabaseSync] 🔍 Database file_url values:');
          cloudBooksData.forEach((book, index) => {
            console.log(`[SupabaseSync] Book ${index + 1}: "${book.title}" - file_url: ${book.file_url || 'null'}`);
          });

          // Step 1: Check which books are missing locally and need to be downloaded
          const downloadStartTime = performance.now();
          const currentLocalBooks = books;
          
          // Debug: List available storage buckets
          try {
            console.log('[SupabaseSync] 🔍 Checking available storage buckets...');
            const { data: buckets } = await supabase.storage.listBuckets();
            if (buckets) {
              console.log('[SupabaseSync] Available buckets:', buckets.map(b => b.name));
            }
          } catch (bucketError) {
            console.warn('[SupabaseSync] Could not list buckets:', bucketError);
          }
          
          // Simple duplicate check by ID only (as it was working before)
          const existingBookIds = new Set(currentLocalBooks.map(book => book.id));
          
          // Separate books into existing and missing
          const existingCloudBooks = cloudBooksData.filter((cloudBook: CloudBookRecord) => 
            existingBookIds.has(cloudBook.id)
          );
          const missingCloudBooks = cloudBooksData.filter((cloudBook: CloudBookRecord) => 
            !existingBookIds.has(cloudBook.id)
          );

          console.log(`[SupabaseSync] 📊 Books analysis:`);
          console.log(`[SupabaseSync] - Already local: ${existingCloudBooks.length} books`);
          console.log(`[SupabaseSync] - Need download: ${missingCloudBooks.length} books`);

          // Step 2: Update existing books with cloud metadata (without re-downloading files)
          let updatedBooks = [...currentLocalBooks];
          existingCloudBooks.forEach((cloudBook: CloudBookRecord) => {
            const localIndex = updatedBooks.findIndex(book => book.id === cloudBook.id);
            if (localIndex >= 0) {
              const localBook = updatedBooks[localIndex];
              const cloudDate = new Date(cloudBook.last_read);
              const localDate = new Date(localBook.lastRead);

              // Use the version with the most recent reading progress
              if (cloudDate > localDate) {
                updatedBooks[localIndex] = {
                  ...localBook, // Keep local file and cover
                  currentPage: cloudBook.current_page,
                  lastChapter: cloudBook.last_chapter ? { 
                    id: 'restored-chapter', 
                    href: cloudBook.last_chapter, 
                    label: cloudBook.last_chapter.split('/').pop()?.replace('.html', '') || 'Chapter',
                    children: []
                  } : localBook.lastChapter,
                  totalPages: cloudBook.total_pages || localBook.totalPages,
                  lastRead: cloudBook.last_read,
                };
                console.log(`[SupabaseSync] ♻️ Updated existing book metadata: "${cloudBook.title}"`);
              } else {
                console.log(`[SupabaseSync] ⏭️ Local version newer, keeping: "${cloudBook.title}"`);
              }
            }
          });

          if (missingCloudBooks.length === 0) {
            console.log('[SupabaseSync] ✅ All books already exist locally, sync complete!');
            setBooks(updatedBooks);
            setIsSyncingFromCloud(false);
            return;
          }

          console.log(`[SupabaseSync] 🚀 Starting PROGRESSIVE download for ${missingCloudBooks.length} missing books...`);
          console.log(`[SupabaseSync] Placeholders will appear immediately, books will complete as they download`);
          
          // Step 3: Create placeholders only for missing books
          const placeholderBooks = missingCloudBooks.map((cloudBook: CloudBookRecord) => ({
            id: cloudBook.id,
            title: cloudBook.title || 'Loading...',
            author: cloudBook.author || 'Loading...',
            file: new File([''], 'loading.epub', { type: 'application/epub+zip' }), // Empty placeholder
            coverUrl: null, // Will be set when download completes
            currentPage: cloudBook.current_page || 0,
            lastChapter: cloudBook.last_chapter ? { 
              id: 'restored-chapter', 
              href: cloudBook.last_chapter, 
              label: cloudBook.last_chapter.split('/').pop()?.replace('.html', '') || 'Chapter',
              children: []
            } : null,
            totalPages: cloudBook.total_pages || 0,
            lastRead: cloudBook.last_read || new Date().toISOString(),
            isDownloading: true, // Show loading state
          }));

          // Step 4: Add placeholders to existing books and show immediately
          // IMPORTANT: Keep any default books that aren't in cloud storage
          const defaultBooks = currentLocalBooks.filter(book => 
            !cloudBooksData.some(cloudBook => cloudBook.id === book.id) &&
            book.title === '1984' // Keep the default book
          );
          
          const booksWithPlaceholders = [...updatedBooks, ...defaultBooks, ...placeholderBooks];
          setBooks(booksWithPlaceholders);
          console.log(`[SupabaseSync] 📦 ${placeholderBooks.length} placeholder books + ${defaultBooks.length} default books added to UI`);

          // Step 5: Start downloading only missing books individually (parallel)
          let completedCount = 0;
          const totalBooks = missingCloudBooks.length;

          const downloadPromises = missingCloudBooks.map(async (cloudBook: CloudBookRecord, index: number) => {
            try {
              // Only try the bucket that actually exists in your Supabase project
              const possibleBuckets = ['book-files'];
              let fileData: Blob | null = null;
              let successfulBucket = '';
              
              // First, try to use the file_url from the database if it exists
              if (cloudBook.file_url) {
                try {
                  console.log(`[SupabaseSync] [${index + 1}/${totalBooks}] Trying file_url from database: ${cloudBook.file_url}`);
                  
                  // Fix malformed file_urls that have wrong endpoints and image parameters
                  let correctedUrl = cloudBook.file_url;
                  
                  // Remove image quality parameters
                  if (correctedUrl.includes('?quality=')) {
                    correctedUrl = correctedUrl.split('?')[0];
                    console.log(`[SupabaseSync] [${index + 1}/${totalBooks}] Removed image quality parameter`);
                  }
                  
                  // Fix wrong endpoint from /render/image/public/ to /object/
                  if (correctedUrl.includes('/render/image/public/')) {
                    correctedUrl = correctedUrl.replace('/render/image/public/', '/object/');
                    console.log(`[SupabaseSync] [${index + 1}/${totalBooks}] Fixed endpoint from render/image to object`);
                  }
                  
                  // Extract bucket and path from corrected URL
                  const url = new URL(correctedUrl);
                  const pathParts = url.pathname.split('/');
                  
                  // Find the bucket name (should be after /storage/v1/object/)
                  const objectIndex = pathParts.findIndex(part => part === 'object');
                  if (objectIndex !== -1 && objectIndex + 1 < pathParts.length) {
                    const bucketFromUrl = pathParts[objectIndex + 1];
                    const pathFromUrl = pathParts.slice(objectIndex + 2).join('/');
                    
                    console.log(`[SupabaseSync] [${index + 1}/${totalBooks}] Corrected parsing - bucket: ${bucketFromUrl}, path: ${pathFromUrl}`);
                    
                    if (bucketFromUrl && pathFromUrl) {
                      // For private buckets, use Supabase client download instead of public URL
                      try {
                        const { supabase } = await import('../lib/supabase');
                        const { data, error } = await supabase.storage
                          .from(bucketFromUrl)
                          .download(pathFromUrl);
                        
                        if (error) {
                          throw error;
                        }
                        
                        if (data && data.size > 0) {
                          fileData = data;
                          successfulBucket = bucketFromUrl;
                          console.log(`[SupabaseSync] [${index + 1}/${totalBooks}] ✅ Downloaded using Supabase client from private bucket: ${bucketFromUrl}`);
                        }
                      } catch (clientError) {
                        console.log(`[SupabaseSync] [${index + 1}/${totalBooks}] ❌ Supabase client download failed:`, clientError);
                        throw clientError;
                      }
                    }
                  } else {
                    throw new Error('Could not parse corrected file_url structure');
                  }
                } catch (urlError) {
                  console.log(`[SupabaseSync] [${index + 1}/${totalBooks}] ❌ Failed using corrected file_url:`, urlError);
                }
              }
              
              // If file_url didn't work, try the fallback bucket approach
              if (!fileData || fileData.size === 0) {
                for (const bucket of possibleBuckets) {
                  try {
                    const downloadPath = `${userId}/${cloudBook.id}.epub`;
                    console.log(`[SupabaseSync] [${index + 1}/${totalBooks}] Trying bucket: ${bucket}, path: ${downloadPath}`);
                    
                    // Use Supabase client download for private buckets
                    const { supabase } = await import('../lib/supabase');
                    const { data, error } = await supabase.storage
                      .from(bucket)
                      .download(downloadPath);
                    
                    if (error) {
                      throw error;
                    }
                    
                    if (data && data.size > 0) {
                      fileData = data;
                      successfulBucket = bucket;
                      console.log(`[SupabaseSync] [${index + 1}/${totalBooks}] ✅ Downloaded from bucket: ${bucket}`);
                      break;
                    }
                  } catch (bucketError) {
                    console.log(`[SupabaseSync] [${index + 1}/${totalBooks}] ❌ Failed with bucket ${bucket}:`, bucketError);
                    continue; // Try next bucket
                  }
                }
              }

              if (!fileData || fileData.size === 0) {
                throw new Error(`All buckets failed for book: ${cloudBook.title}`);
              }

              // Validate file size
              if (fileData.size < 1000) {
                throw new Error(`File too small (${fileData.size} bytes), likely corrupted`);
              }

              console.log(`[SupabaseSync] [${index + 1}/${totalBooks}] ✅ "${cloudBook.title}" downloaded successfully from bucket: ${successfulBucket}`);

              const file = new File([fileData], `${cloudBook.title}.epub`, { type: 'application/epub+zip' });
              
              // Handle cover - inline regeneration to avoid dependency issues
              let coverUrl: string | null = null;
              if (cloudBook.cover_url) {
                coverUrl = cloudBook.cover_url;
              } else {
                // Inline cover regeneration
                try {
                  const zip = new JSZip();
                  const loadedZip = await zip.loadAsync(file);
                  
                  // Try different cover extraction methods
                  const coverBlob = await (async () => {
                    // Method 1: Look for cover.jpg/cover.png in root
                    for (const name of ['cover.jpg', 'cover.jpeg', 'cover.png']) {
                      const coverFile = loadedZip.file(name);
                      if (coverFile) {
                        return await coverFile.async('blob');
                      }
                    }
                    
                    // Method 2: Look in common directories
                    for (const dir of ['images/', 'Images/', 'OEBPS/images/', 'OEBPS/Images/']) {
                      for (const name of ['cover.jpg', 'cover.jpeg', 'cover.png']) {
                        const coverFile = loadedZip.file(dir + name);
                        if (coverFile) {
                          return await coverFile.async('blob');
                        }
                      }
                    }
                    
                    return null;
                  })();
                  
                  if (coverBlob) {
                    coverUrl = URL.createObjectURL(coverBlob);
                  }
                } catch (coverError) {
                  console.warn('[SupabaseSync] Could not extract cover:', coverError);
                }
              }

              // Create complete book object
              const completeBook = {
                id: cloudBook.id,
                title: cloudBook.title || 'Unknown Title',
                author: cloudBook.author || 'Unknown Author',
                file,
                coverUrl,
                currentPage: cloudBook.current_page || 0,
                lastChapter: cloudBook.last_chapter ? { 
                  id: 'restored-chapter', 
                  href: cloudBook.last_chapter, 
                  label: cloudBook.last_chapter.split('/').pop()?.replace('.html', '') || 'Chapter',
                  children: []
                } : null,
                totalPages: cloudBook.total_pages || 0,
                lastRead: cloudBook.last_read || new Date().toISOString(),
                isDownloading: false, // Mark as complete
              };

              // Step 4: Update the specific book immediately when download completes
              setBooks(currentBooks => {
                return currentBooks.map(book => 
                  book.id === cloudBook.id ? completeBook : book
                );
              });

              completedCount++;
              console.log(`[SupabaseSync] 📥 Book ${completedCount}/${totalBooks} ready: "${cloudBook.title}"`);

              return completeBook;

            } catch (error) {
              console.error(`[SupabaseSync] [${index + 1}/${totalBooks}] ❌ Failed to download "${cloudBook.title}":`, error);
              
              // *** NEW: Keep failed book as placeholder with error state instead of removing it ***
              setBooks(currentBooks => {
                return currentBooks.map(book => 
                  book.id === cloudBook.id 
                    ? {
                        ...book,
                        isDownloading: false,
                        downloadFailed: true, // Add error flag
                        title: `${cloudBook.title} (Download Failed)`,
                        author: cloudBook.author || 'Unknown Author',
                        file: new File([''], 'download-failed.epub', { type: 'application/epub+zip' }), // Empty placeholder
                      }
                    : book
                );
              });

              return null;
            }
          });

          // Wait for all downloads to complete
          await Promise.all(downloadPromises);

          const totalDownloadTime = performance.now() - downloadStartTime;
          console.log(`[SupabaseSync] 🎉 Smart sync complete in ${totalDownloadTime.toFixed(0)}ms`);
          console.log(`[SupabaseSync] 📊 Results: ${completedCount}/${totalBooks} new books downloaded, ${existingCloudBooks.length} already local`);
          
          // Ensure default book is always available after sync
          await ensureDefaultBookAvailable();

        } catch (error) {
          console.error('[SupabaseSync] Progressive sync failed:', error);
        } finally {
          setIsSyncingFromCloud(false);
        }
      } else {
        console.log('[SupabaseSync] ❌ Sync not started - User not authenticated:', { isAuthenticated, userId });
      }
    };

    syncBooksOnLogin();
  }, [isAuthenticated, userId]); // Simplified dependencies

// =================================================================

  // *** NEW: Function to regenerate cover URL from book file ***
  const regenerateCoverUrl = async (bookFile: File): Promise<string | null> => {
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(bookFile);
      const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
      if (!containerXml) return null;
      
      const DOMParser = await getDOMParser();
      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerXml, 'application/xml');
      const rootfiles = containerDoc.getElementsByTagName('rootfile');
      if (rootfiles.length === 0) return null;
      
      const opfPath = rootfiles[0].getAttribute('full-path') || '';
      const opfContent = await loadedZip.file(opfPath)?.async('text');
      if (!opfContent) return null;
      
      const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      const metaCover = Array.from(opfDoc.getElementsByTagName('meta')).find(m => m.getAttribute('name') === 'cover');
      if (metaCover) {
        const coverId = metaCover.getAttribute('content');
        const coverItem = Array.from(opfDoc.getElementsByTagName('item')).find(item => item.getAttribute('id') === coverId);
        if (coverItem) {
          const href = coverItem.getAttribute('href');
          if (href) {
            const coverPath = resolveRelativePath(getDirectoryPath(opfPath), href);
            const coverBlob = await loadedZip.file(coverPath)?.async('blob');
            if (coverBlob) {
              return URL.createObjectURL(coverBlob);
            }
          }
        }
      }
      return null;
    } catch (error) {
      console.error('[regenerateCoverUrl] Error regenerating cover:', error);
      return null;
    }
  };

  // *** NEW: Function to ensure default book is always available ***
  const ensureDefaultBookAvailable = async (): Promise<void> => {
    // Check if 1984 is already in the books array
    const hasDefaultBook = books.some(book => book.title === '1984');
    if (!hasDefaultBook) {
      console.log('[Default Book] 1984 not found, loading default book...');
      const defaultBook = await loadDefaultBook();
      if (defaultBook) {
        setBooks(prevBooks => [...prevBooks, defaultBook]);
        console.log('[Default Book] 1984 added to library');
      }
    }
  };

  // *** NEW: Function to load the default sample book ***
  const loadDefaultBook = async (): Promise<BookData | null> => {
    // Load 1984.epub from the public folder
    const defaultBookPath = '/1984.epub';
    console.log(`[Default Book] Fetching from: ${defaultBookPath}`);
    setIsLoading(true); // Show loading indicator
    try {
      const response = await fetch(defaultBookPath);
      if (!response.ok) {
        throw new Error(`Network response was not ok. Status: ${response.status}`);
      }
      const bookBlob = await response.blob();
      const bookFile = new File([bookBlob], "1984.epub", { type: 'application/epub+zip' });

      // ---- This is the same logic copied from the start of your `addBook` function ----
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(bookFile);
      const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
      if (!containerXml) throw new Error('Invalid EPUB: container.xml not found');
      const DOMParser = await getDOMParser();
      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerXml, 'application/xml');
      const rootfiles = containerDoc.getElementsByTagName('rootfile');
      const opfPath = rootfiles[0]?.getAttribute('full-path') || '';
      const opfContent = await loadedZip.file(opfPath)?.async('text');
      if (!opfContent) throw new Error('Invalid EPUB: OPF file not found');
      const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      const title = opfDoc.getElementsByTagName('dc:title')[0]?.textContent?.trim() || 'Unknown Title';
      const author = opfDoc.getElementsByTagName('dc:creator')[0]?.textContent?.trim() || 'Unknown Author';
      
      const id = generateUUID();

      // This part for cover is complex, can be simplified or kept if needed
      let coverUrl: string | null = null;
       const metaCover = Array.from(opfDoc.getElementsByTagName('meta')).find(m => m.getAttribute('name') === 'cover');
        if (metaCover) {
            const coverId = metaCover.getAttribute('content');
            const coverItem = Array.from(opfDoc.getElementsByTagName('item')).find(item => item.getAttribute('id') === coverId);
            if (coverItem) {
                const href = coverItem.getAttribute('href');
                if (href) {
                    const coverPath = resolveRelativePath(getDirectoryPath(opfPath), href);
                    const coverBlob = await loadedZip.file(coverPath)?.async('blob');
                    if(coverBlob) coverUrl = URL.createObjectURL(coverBlob);
                }
            }
        }
      
      const newBook: BookData = {
        id, title, author, coverUrl,
        currentPage: 0, totalPages: 0,
        file: bookFile, lastRead: new Date().toISOString(),
      };
      
      console.log(`[Default Book] Successfully processed: ${newBook.title}`);
      // Instead of calling setBooks, RETURN the created book object
      return newBook;

    } catch (error) {
      console.error("[Default Book] Failed to load the default book:", error);
      return null; // Return null on failure
    } finally {
        setIsLoading(false);
    }
  };

  // const addBook = async (file: File): Promise<void> => {
  //   // This function is now only used for USER uploads, not the default book.
  //   console.log(`[addBook] Attempting to add book: ${file.name}`);
  //   if (file.name.split('.').pop()?.toLowerCase() !== 'epub') {
  //     alert('Please upload an EPUB file.');
  //     return;
  //   }
  //   setIsLoading(true); // Global loading for adding a book
  //   try {
  //     const zip = new JSZip(); // Using JSZip from BookContext
  //     const loadedZip = await zip.loadAsync(file);

  //     const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
  //     if (!containerXml) throw new Error('Invalid EPUB: container.xml not found');
  //     const parser = new DOMParser();
  //     const containerDoc = parser.parseFromString(containerXml, 'application/xml');
  //     const rootfiles = containerDoc.getElementsByTagName('rootfile');
  //     if (rootfiles.length === 0) throw new Error('Invalid EPUB: No rootfile found');
  //     const currentOpfPath = rootfiles[0].getAttribute('full-path') || '';
  //     const opfContent = await loadedZip.file(currentOpfPath)?.async('text');
  //     if (!opfContent) throw new Error('Invalid EPUB: OPF file not found');
  //     const opfDoc = parser.parseFromString(opfContent, 'application/xml');

  //     const titleElements = opfDoc.getElementsByTagName('dc:title');
  //     const title = titleElements.length > 0 ? titleElements[0].textContent?.trim() || 'Unknown Title' : 'Unknown Title';
  //     const creatorElements = opfDoc.getElementsByTagName('dc:creator');
  //     const author = creatorElements.length > 0 ? creatorElements[0].textContent?.trim() || 'Unknown Author' : 'Unknown Author';
  //     // Simple ID generation, ensure it's unique enough for your needs
  //     const id = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  //     let coverUrl: string | null = null;
  //     const metaTags = opfDoc.getElementsByTagName('meta');
  //     let coverId = '';
  //     for (let i = 0; i < metaTags.length; i++) {
  //       if (metaTags[i].getAttribute('name') === 'cover') {
  //         coverId = metaTags[i].getAttribute('content') || '';
  //         break;
  //       }
  //     }
  //     if (coverId) {
  //       const items = opfDoc.getElementsByTagName('item');
  //       for (let i = 0; i < items.length; i++) {
  //         if (items[i].getAttribute('id') === coverId) {
  //           const href = items[i].getAttribute('href');
  //           if (href) {
  //             const coverPath = resolveRelativePath(getDirectoryPath(currentOpfPath), href);
  //             const coverBlob = await loadedZip.file(coverPath)?.async('blob');
  //             if (coverBlob) {
  //               coverUrl = await new Promise<string>((resolve) => {
  //                 const reader = new FileReader();
  //                 reader.onloadend = () => resolve(reader.result as string);
  //                 reader.readAsDataURL(coverBlob);
  //               });
  //             }
  //           }
  //           break;
  //         }
  //       }
  //     }

  //     const newBook: BookData = {
  //       id,
  //       title,
  //       author,
  //       coverUrl,
  //       currentPage: 0,
  //       totalPages: 0, // This will be calculated when the book is opened
  //       file, // The actual File object
  //       lastRead: new Date().toISOString(),
  //       // lastChapter: undefined, // Initialized as undefined
  //     };
  //     console.log(`[addBook] New book created: ${newBook.title}, ID: ${newBook.id}`);
  //     setBooks(prevBooks => {
  //       // Check if book with same ID already exists to prevent duplicates
  //       if (prevBooks.find(b => b.id === newBook.id)) {
  //           console.warn(`[addBook] Book with ID ${newBook.id} already exists. Not adding duplicate.`);
  //           alert(`Book "${newBook.title}" is already in your library.`);
  //           return prevBooks;
  //       }
  //       console.log(`[addBook] Adding book to state. Previous count: ${prevBooks.length}`);
  //       return [...prevBooks, newBook];
  //     });

  //     // 3. TRACK THE EVENT!
  //     trackEvent('add_book', {
  //     // You can add more details, e.g., distinguish between upload and drag-drop if you want
  //       method: 'upload', 
  //     });
  //   } catch (error) {
  //     console.error('[addBook] Error processing EPUB file:', error);
  //     alert(`Error adding book: ${(error as Error).message}`);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };


    // 👇 THIS IS THE NEW, UNIVERSAL addBook FUNCTION BASED ON YOUR PROVEN LOGIC 👇
  const addBook = async (file: File): Promise<void> => {
    setIsLoading(true);
    try {
      // Step 1: Process the book locally to get its metadata.
      // This is the universal foundation, used for all users.
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
      if (!containerXml) throw new Error('Invalid EPUB: container.xml not found');

      const DOMParser = await getDOMParser();
      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerXml, 'application/xml');
      const rootfiles = containerDoc.getElementsByTagName('rootfile');
      if (rootfiles.length === 0) throw new Error('Invalid EPUB: No rootfile found');

      const opfPath = rootfiles[0].getAttribute('full-path') || '';
      const opfContent = await loadedZip.file(opfPath)?.async('text');
      if (!opfContent) throw new Error('Invalid EPUB: OPF file not found');
      
      const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      const title = opfDoc.getElementsByTagName('dc:title')[0]?.textContent?.trim() || 'Unknown Title';
      const author = opfDoc.getElementsByTagName('dc:creator')[0]?.textContent?.trim() || 'Unknown Author';

      let coverUrl: string | null = null;
      const metaCover = Array.from(opfDoc.getElementsByTagName('meta')).find(m => m.getAttribute('name') === 'cover');
      if (metaCover) {
        const coverId = metaCover.getAttribute('content');
        const coverItem = Array.from(opfDoc.getElementsByTagName('item')).find(item => item.getAttribute('id') === coverId);
        if (coverItem) {
          const href = coverItem.getAttribute('href');
          if (href) {
            const coverPath = resolveRelativePath(getDirectoryPath(opfPath), href);
            const coverBlob = await loadedZip.file(coverPath)?.async('blob');
            if (coverBlob) coverUrl = URL.createObjectURL(coverBlob);
          }
        }
      }

      const newBook: BookData = {
        id: generateUUID(),
        title,
        author,
        coverUrl,
        currentPage: 0,
        totalPages: 0,
        file,
        lastRead: new Date().toISOString(),
      };
      
      // Step 2: Update the local state IMMEDIATELY for a fast UI response.
      // This makes the book appear in the library right away for everyone.
      setBooks(prevBooks => [...prevBooks, newBook]);

      // Step 3 (Conditional Enhancement): If the user is signed in, sync the new book to the cloud.
      if (isAuthenticated) {
        // This runs in the background ("fire and forget") so the UI is not blocked.
        syncBookToCloud(newBook);
      }

      trackEvent('add_book', { 
        method: 'upload',
        book_title: newBook.title,
        book_author: newBook.author || 'Unknown',
        book_id: newBook.id,
        has_cover: !!newBook.coverUrl,
        platform: 'web',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[addBook] Error processing EPUB file:', error);
      throw new Error(`Error adding book: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };



  // Sync book to Supabase (for new book uploads)
  const syncBookToCloud = async (book: BookData) => {
    if (!isAuthenticated || !userId) return;
    
    try {
      console.log(`[SupabaseSync] Starting sync for "${book.title}"`);
      const { uploadFile, getFileUrl, supabase } = await import('../lib/supabase');
      
      // Upload EPUB file to Supabase Storage
      const fileName = `${book.id}.epub`;
      const filePath = `${userId}/${fileName}`;
      
      console.log(`[SupabaseSync] Upload path: ${filePath}`);
      console.log(`[SupabaseSync] User ID: ${userId}`);
      console.log(`[SupabaseSync] Book ID: ${book.id}`);
      
      const fileUpload = await uploadFile('book-files', filePath, book.file);
      const fileUrl = getFileUrl('book-files', filePath);
      
      // Upload cover image if available
      let coverUrl = null;
      if (book.coverUrl && book.coverUrl.startsWith('blob:')) {
        try {
          // Extract cover from EPUB and upload to Supabase
          const coverBlob = await fetch(book.coverUrl).then(r => r.blob());
          const coverPath = `${userId}/${book.id}-cover.jpg`;
          await uploadFile('book-covers', coverPath, coverBlob);
          coverUrl = getFileUrl('book-covers', coverPath);
        } catch (coverError) {
          console.warn('[SupabaseSync] Could not upload cover:', coverError);
        }
      }

      // Save book metadata to Supabase database
      const bookRecord = {
        id: book.id, // IMPORTANT: Use the same ID as the file path
        user_id: userId,
        title: book.title,
        author: book.author || '',
        current_page: book.currentPage,
        last_chapter: typeof book.lastChapter === 'string' ? book.lastChapter : book.lastChapter?.href || '',
        total_pages: book.totalPages,
        last_read: book.lastRead,
        file_url: fileUrl,
        cover_url: coverUrl || undefined
      };

      const { data, error } = await supabase
        .from('books')
        .upsert(bookRecord as any, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        throw new Error(`Supabase database error: ${error.message}`);
      }

      console.log(`[SupabaseSync] Successfully synced "${book.title}" to Supabase`);
      
    } catch (error) {
      console.error("[SupabaseSync] Error in syncBookToCloud:", error);
      // Don't throw - let the book save locally even if cloud sync fails
    }
  };

  // Sync book progress to Supabase (for reading progress updates)
  const syncProgressToCloud = async (bookId: string, currentPage: number, lastChapter: any) => {
    if (!isAuthenticated || !userId) return;
    
    try {
      const { supabase } = await import('../lib/supabase');
      const lastChapterStr = typeof lastChapter === 'string' ? lastChapter : lastChapter?.href || '';
      
      const { error } = await supabase
        .from('books')
        .update({
          current_page: currentPage,
          last_chapter: lastChapterStr,
          last_read: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('id', bookId);

      if (error) {
        throw new Error(`Supabase update error: ${error.message}`);
      }

      console.log(`[SupabaseSync] Updated progress for book ${bookId}: page ${currentPage}`);
    } catch (error) {
      console.error('[SupabaseSync] Error syncing progress:', error);
    }
  };


  // --- All other functions (findChapterForPageCallback, loadPageCallback, useEffect for page loading, openBook, closeBook, nextPage, prevPage, navigateToTocItem, removeBook, extractTocFromEntries, togglePlayMode)
  // --- should be taken from the last full version of BookContext.tsx I provided, as their internal logic was mostly okay.
  // --- The primary fix here is for the load/save effects.
  // --- Remember to include the `isPageLoading` state and its management.

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

        // Sync progress to cloud if user is signed in
        if (isAuthenticated && userId) {
          syncProgressToCloud(currentBookRef.id, pageIdxToLoad, chapterForPage);
        }
      }
      setTimeout(() => { /* Image/CSS processing logic - unchanged */
        const contentElement = document.querySelector('.epub-content');
        if (contentElement) {
          const images = contentElement.querySelectorAll('img');
          images.forEach(async (img: HTMLImageElement) => {
            const epubSrc = img.getAttribute('data-epub-src');
            if (epubSrc && !epubSrc.startsWith('blob:')) {
              try {
                const imageBlob = await zipToUse.file(epubSrc)?.async('blob');
                if (imageBlob) {
                  img.src = URL.createObjectURL(imageBlob);
                  // Fade in the image smoothly once it loads
                  img.onload = () => {
                    img.style.opacity = '1';
                  };
                } else { 
                  console.warn(`Image not found in zip: ${epubSrc}`); 
                  img.alt = `Missing: ${epubSrc}`;
                  img.style.opacity = '0.5'; // Show placeholder state
                }
              } catch (e) { 
                console.error(`Error loading image ${epubSrc}:`, e);
                img.style.opacity = '0.3'; // Show error state
              }
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
  }, [findChapterForPageCallback]);

  useEffect(() => { /* useEffect for Page Loading - unchanged */
    console.log('[useEffect PageLoad] Triggered. States:', {
      currentBookName: currentBook?.title, bookZipExists: !!bookZip, htmlFilesCount: htmlFiles.length,
      currentPageToLoad, tocCount: toc.length, isReading
    });
    if (isReading && currentBook && bookZip && htmlFiles && htmlFiles.length > 0 &&
        currentPageToLoad >= 0 && currentPageToLoad < htmlFiles.length) {
      console.log('[useEffect PageLoad] Conditions MET. Calling loadPageCallback.');
      loadPageCallback(currentPageToLoad, bookZip, htmlFiles, currentBook, toc);
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

  const removeBook = async (bookId: string): Promise<void> => {
    const bookToRemove = books.find(b => b.id === bookId);
    if (bookToRemove?.coverUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(bookToRemove.coverUrl);
    }
    trackEvent('remove_book', {
      book_title: bookToRemove?.title || 'Unknown',
      book_author: bookToRemove?.author || 'Unknown',
      book_id: bookId,
      had_cover: !!bookToRemove?.coverUrl,
      platform: 'web',
      timestamp: new Date().toISOString()
    });
    console.log(`[removeBook] Removing book ID: ${bookId}`);
    
    // Remove from local state
    setBooks(prevBooks => prevBooks.filter(b => b.id !== bookId));
    
    // Remove from Supabase if user is signed in
    if (isAuthenticated && userId) {
      try {
        const { supabase, deleteFile } = await import('../lib/supabase');
        // Get book info for file cleanup
        const { data: bookData } = await supabase
          .from('books')
          .select('file_url, cover_url')
          .eq('user_id', userId)
          .eq('id', bookId)
          .single();

        if (bookData) {
          // Delete files from storage
          if (bookData.file_url) {
            const filePath = `${userId}/${bookId}.epub`;
            await deleteFile('book-files', filePath);
          }
          if (bookData.cover_url) {
            const coverPath = `${userId}/${bookId}-cover.jpg`;
            await deleteFile('book-covers', coverPath);
          }
        }

        // Delete database record
        const { error } = await supabase
          .from('books')
          .delete()
          .eq('user_id', userId)
          .eq('id', bookId);

        if (error) {
          throw new Error(`Supabase delete error: ${error.message}`);
        }

        console.log(`[SupabaseSync] Removed book ${bookId} from Supabase`);
      } catch (error) {
        console.error('[SupabaseSync] Error removing book from Supabase:', error);
      }
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

  const openBook = async (book: BookData): Promise<void> => { /* Unchanged from previous full version */
    console.log(`[openBook] Opening: ${book.title}`); 
    console.time(`[Performance] Opening ${book.title}`);
    setIsLoading(true); closeBook(false);
    setBookTitle(book.title); setBookAuthor(book.author); setCurrentBook(book);
    try {
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
      let pageIdxToLoadInitially = 0; // Default to first page
      
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
      // If no lastChapter, use currentPage
      else if (book.currentPage != null && book.currentPage >= 0 && book.currentPage < currentFileOrder.length) {
        pageIdxToLoadInitially = book.currentPage;
        console.log(`[openBook] Using saved currentPage: ${book.currentPage}`);
      } else {
        console.log(`[openBook] No valid saved position found, starting from beginning`);
      }
      
      // Ensure the page index is within valid bounds
      pageIdxToLoadInitially = Math.max(0, Math.min(pageIdxToLoadInitially, currentFileOrder.length - 1));
      
      setCurrentPageToLoad(pageIdxToLoadInitially); setCurrentPageDisplay(pageIdxToLoadInitially);
      console.log(`[openBook] Successfully prepared: ${book.title}. Page to load: ${pageIdxToLoadInitially} (total pages: ${currentFileOrder.length})`);
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
      console.error('[openBook ERROR]', error); closeBook(true); alert(`Error opening book: ${(error as Error).message}`);
    } finally { setIsLoading(false); }
  };

  const closeBook = (resetGlobalLoading = true): void => { /* Unchanged */
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
    setOpfPath(''); setHtmlFiles([]); setToc([]); setCurrentContent(''); setBookTitle('');
    setBookAuthor(''); setIsPlayModeVisible(false); setCurrentPageText('');
    setCurrentPageToLoad(0); setCurrentPageDisplay(0);
    if (resetGlobalLoading) setIsLoading(false);
    setIsPageLoading(false);
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

  const value: BookContextValue = {
    books, addBook, removeBook,
    currentBook, isReading, isLoading, isPageLoading, bookTitle, bookAuthor,
    currentPageDisplay, totalPages, currentContent, currentPageText, toc,
    openBook, closeBook, nextPage, prevPage, navigateToTocItem,
    htmlFiles, opfPath,
    isPlayModeVisible, togglePlayMode,
    isSyncingFromCloud, // Add loading state
  };

  return (
    <BookContext.Provider value={value}>
      {children}
    </BookContext.Provider>
  );
};