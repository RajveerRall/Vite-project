// src/components/Library/index.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useBook } from '../../context/BookContext';
import BookGrid from './BookGrid';
import './Library.css';
import { trackEvent } from '../../lib/analytics'; // Make sure to import it
import { useAuth } from "../../context/AuthContext";
const BookCarousel = React.lazy(() => import('./BookCarousel').then(m => ({ default: m.BookCarousel })));
import preprocessedBooks from '../../lib/preprocessedBooks.json';
import { BookData } from '@/types/books'; // Make sure BookData is imported

// Helper function to create book data from preprocessed information
function createBookFromPreprocessed(preprocessedBook: any): BookData {
  return {
    id: preprocessedBook.filename,
    title: preprocessedBook.title,
    author: preprocessedBook.author,
    coverUrl: preprocessedBook.coverPath || '', // Use extracted cover or empty string
    file: null as any, // Will be lazy-loaded when user clicks
    currentPage: 0,
    totalPages: 0,
    lastRead: new Date().toISOString(),
  };
}

const Library: React.FC = () => {
  const { books, addBook, isLoading, openBook, isSyncingFromCloud } = useBook();
  
  // 🚀 Lazy loading function for sample books
  const handleSampleBookSelect = async (book: BookData) => {
    if (!book.file) {
      try {
        console.log(`📖 Lazy loading: ${book.title}`);
        
        // Fetch the EPUB file only when user clicks
        const response = await fetch(`/sample-books/${book.id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch book: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const file = new File([blob], book.id, { type: 'application/epub+zip' });
        
        // Update the book with the actual file
        book.file = file;
        
        console.log(`✅ Loaded: ${book.title} (${Math.round(blob.size / 1024)}KB)`);
      } catch (error) {
        console.error(`❌ Failed to load ${book.title}:`, error);
        return; // Don't open the book if loading failed
      }
    }
    
    // Now open the book (either already had file or just loaded it)
    openBook(book);
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  // Toast notification states
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const { isAuthenticated } = useAuth();
    // State specifically for the anonymous user's showcase carousel
  const [carouselBooks, setCarouselBooks] = useState<BookData[]>([]);
  const [isCarouselLoading, setIsCarouselLoading] = useState<boolean>(true);
  const displayBooks = isAuthenticated ? books : carouselBooks;
 
 // Defer mounting Carousel until after first paint/idle
 const [showCarousel, setShowCarousel] = useState<boolean>(false);
 useEffect(() => {
   if ('requestIdleCallback' in window) {
     (window as any).requestIdleCallback(() => setShowCarousel(true));
   } else {
     setTimeout(() => setShowCarousel(true), 0);
   }
 }, []);







  //   // This effect runs only once to load the sample books for the carousel
  // useEffect(() => {
  //   // Only load the carousel if the user is logged out
  //   if (!isSignedIn) {
  //     const loadSampleBooks = async () => {
  //       setIsCarouselLoading(true);
  //       const loadedBooks: BookData[] = [];

  //       for (const bookPath of sampleBookPaths) {
  //         try {
  //           // Fetch each book from the public/sample-books folder
  //           const response = await fetch(`/sample-books/${bookPath}`);
  //           const blob = await response.blob();
  //           const file = new File([blob], bookPath, { type: 'application/epub+zip' });
            
  //           // For now, we'll use a simplified processing step.
  //           // You can enhance this with epub.js to get real covers/titles.
  //           const bookData = await processBookFileForDisplay(file);

  //           // --- ADDED: A check to ensure we only add valid books ---
  //           if (bookData) {
  //             loadedBooks.push(bookData);
  //           }

  //         } catch (error) {
  //           console.error(`Failed to load sample book: ${bookPath}`, error);
  //         }
  //       }
  //       setCarouselBooks(loadedBooks);
  //       setIsCarouselLoading(false);
  //     };

  //     loadSampleBooks();
  //   }
  // }, [isSignedIn]); // Reruns if the user logs in or out



  // ⚡ OPTIMIZED: Load sample books from preprocessed data (instant loading!)
  useEffect(() => {
    const loadSampleBooks = () => {
      setIsCarouselLoading(true);
      
      // Filter out corrupted books (like jane eyre.epub)
      const validPreprocessedBooks = preprocessedBooks.filter(book => 
        book.title !== 'jane eyre' && 
        book.title !== 'The Power of Now: A Guide to Spiritual Enlightenment' // Remove as requested
      );
      
      // Convert preprocessed data to BookData format (instant!)
      const books = validPreprocessedBooks.map(createBookFromPreprocessed);
      
      setCarouselBooks(books);
      setIsCarouselLoading(false);
    };

    // Add a small delay to let the page render first, then load instantly
    const timer = setTimeout(loadSampleBooks, 100);
    
    return () => clearTimeout(timer);
  }, []); // Runs once on mount



  
  const handleUploadClick = () => {
      // TRACK THE INTENT
    trackEvent('add_book_start', {
      method: 'browse_click'
    });
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // TRACK THE INTENT
      trackEvent('add_book_start', {
        method: 'drag_and_drop'
      });
      try {
        const fileName = e.target.files[0].name;
        await addBook(e.target.files[0]);
        e.target.value = ''; // Reset the input

        
        // Show success toast
        setToastMessage(`"${fileName}" has been added to your library`);
        setToastType('success');
        setShowToast(true);
      } catch (error) {
        // Show error toast
        setToastMessage(error instanceof Error ? error.message : 'Error uploading book');
        setToastType('error');
        setShowToast(true);
      }
    }
  };

  // Hide toast after 3 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      try {
        const fileName = e.dataTransfer.files[0].name;
        await addBook(e.dataTransfer.files[0]);
        
        // Show success toast
        setToastMessage(`"${fileName}" has been added to your library`);
        setToastType('success');
        setShowToast(true);
      } catch (error) {
        // Show error toast
        setToastMessage(error instanceof Error ? error.message : 'Error uploading book');
        setToastType('error');
        setShowToast(true);
      }
    }
  };
  
  // Get sorted books for recently read section
  const sortedBooks = [...books].sort((a, b) => 
    new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
  );


  const handleExternalLinkClick = (sourceName: string, url: string) => {
    // Track the user's choice
    trackEvent('select_content_source', {
      source_name: sourceName
    });
  
    // Open the link in a new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  

    return (
    <div className="library bg-slate-50">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* --- Toast Notification (remains the same) --- */}
        {showToast && (
          <div className={`toast ${toastType}`}>
            <p>{toastMessage}</p>
            <button onClick={() => setShowToast(false)} className="toast-close-btn">
              &times;
            </button>
          </div>
        )}

        {/* Cloud Sync Loading Overlay */}
        {isSyncingFromCloud && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-sm mx-4 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Syncing Your Books</h3>
              <p className="text-gray-600">
                Downloading your books from the cloud...<br/>
                <span className="text-sm text-gray-500">This may take a moment for large books</span>
              </p>
              {navigator.userAgent.includes('Edg') && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">
                    📌 <strong>Edge users:</strong> Downloads may be slower due to enhanced security settings. 
                    For faster syncing, consider using Chrome.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- START: Simplified Display Logic --- */}
        
        {/* Showcase Carousel: Always visible */}
        {isCarouselLoading ? (
          <div className="text-center mb-12"><p>Loading Collection...</p></div>
        ) : (showCarousel && carouselBooks.length > 0) && (
          <section className="showcase-section mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">
              Listen to Your Favourite Books
            </h2>
            <React.Suspense fallback={<div className="text-center mb-12"><p>Loading Collection...</p></div>}>
              <BookCarousel books={carouselBooks} onBookSelect={handleSampleBookSelect} />
            </React.Suspense>
          </section>
        )}

        {/* Welcome Message: Only for users with NO personal books */}
        {books.length === 0 && !isLoading && (
          <section className="text-center mb-12">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {isAuthenticated ? "Your Cloud Library is Empty" : "Your Personal Reading Space"}
            </h1>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Upload an ePub file to start building your library.
            </p>
          </section>
        )}
        
        {/* --- All sections below this point are independent --- */}

        {/* Free ebook resources */}
        <section className="mt-12 text-center">
          <h3 className="text-base font-semibold text-gray-700">Looking for free eBooks?</h3>
          <p className="text-sm text-gray-500 mt-1">These resources offer thousands of high-quality, public domain books.</p>
          <div className="mt-4 flex items-center justify-center space-x-6">
            <button 
              onClick={() => handleExternalLinkClick('Project Gutenberg', 'https://www.gutenberg.org')} 
              className="font-medium text-amber-800 hover:underline"
            >
              Project Gutenberg
            </button>
            <button 
              onClick={() => handleExternalLinkClick('Planet eBook', 'https://www.planetebook.com')} 
              className="font-medium text-amber-800 hover:underline"
            >
              Planet eBook
            </button>
          </div>
        </section>
        
        {/* Upload Area */}
        <div 
          className={`upload-area mt-10 max-w-2xl mx-auto ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          {/* ... SVG and text content ... */}
          <h3 className="text-lg font-medium mb-1.5 text-gray-800">Upload your eBook</h3>
          <p className="text-gray-600 mb-3">Drag and drop your ePub file here, or click to browse</p>
          <button className="browse-button" onClick={handleUploadClick}>
            Browse files
          </button>
          <input ref={fileInputRef} type="file" accept=".epub" onChange={handleFileChange} className="hidden" />
        </div>

        {/* User's Library Section: Appears here ONLY if they have books */}
        {books.length > 0 && (
          <section className="user-library-section mt-16 border-t border-gray-200 pt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                {isAuthenticated ? "Your Cloud Library" : "Your Current Library"}
              </h2>
              {isSyncingFromCloud && (
                <div className="flex items-center text-amber-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600 mr-2"></div>
                  <span className="text-sm">Syncing...</span>
                </div>
              )}
            </div>
            <BookGrid books={sortedBooks} />
          </section>
        )}

                {/* Sign-Up Prompt */}
        {!isAuthenticated && (
          <div className="mt-8 text-center bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-amber-900">
              Enjoying YoRead?{' '}
              <button 
                onClick={() => {
                  // Trigger the header's sign in modal
                  const signInBtn = document.querySelector('header button') as HTMLButtonElement;
                  signInBtn?.click();
                }}
                className="inline-link text-amber-800 hover:text-amber-900 underline font-medium mx-1 transition-colors"
              >
                Sign in
              </button>
              to access unique storytelling voices!
            </p>
          </div>
        )}
        
      </main>

      {/* --- Footer --- */}
      <footer className="py-6 border-t border-gray-200 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 text-center text-gray-500 text-sm">
          YoRead - A focused eBook reading experience
        </div>
      </footer>
    </div>
  );
};

export default Library;