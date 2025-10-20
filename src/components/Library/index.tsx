// src/components/Library/index.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useBook } from '../../context/BookContext';
import BookGrid from './BookGrid';
import './Library.css';
import { trackEvent } from '../../lib/analytics'; // Make sure to import it
import { useAuth } from "../../context/AuthContext";

// Book collage now uses optimized sprite sheet instead of individual images


const Library: React.FC = () => {
  const { books, addBook, isLoading, openBook, isSyncingFromCloud } = useBook();
  
  // showcase/sample loading removed
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  // Toast notification states
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const { isAuthenticated } = useAuth();
    // State specifically for the anonymous user's showcase carousel
  // showcase state removed
 
   // Defer mounting Carousel until after first paint/idle
 // showcase state removed

  // ⚡ OPTIMIZED: Load sample books from preprocessed data (instant loading!)
  // Showcase disabled: skip loading sample books

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
        method: 'browse_click'
      });
      try {
        const fileName = e.target.files[0].name;
        const newBook = await addBook(e.target.files[0]);
        e.target.value = ''; // Reset the input

        // Show success toast
        setToastMessage(`"${fileName}" has been added to your library`);
        setToastType('success');
        setShowToast(true);

        // Auto-open the newly uploaded book
        console.log('[Library] Auto-opening uploaded book:', newBook.title);
        openBook(newBook);
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
        const newBook = await addBook(e.dataTransfer.files[0]);
        
        // Show success toast
        setToastMessage(`"${fileName}" has been added to your library`);
        setToastType('success');
        setShowToast(true);

        // Auto-open the newly uploaded book
        console.log('[Library] Auto-opening uploaded book:', newBook.title);
        openBook(newBook);
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

        {/* Cloud Sync Toast Notification - Fixed position at top */}
        {isSyncingFromCloud && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
            <div className="bg-blue-600 text-white rounded-full shadow-xl px-5 py-3 flex items-center gap-3 border border-blue-500">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <p className="text-sm font-medium">
                🚀 Syncing your library...
              </p>
            </div>
          </div>
        )}

        {/* --- All sections are independent --- */}

        {/* Hero Section with Background Collage */}
        <div className="relative mb-16">
          {/* Full-width background - breaks out of max-w-5xl container */}
          <div className="absolute left-1/2 -translate-x-1/2 w-screen -top-8 sm:-top-12 bottom-0">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Gradient overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/60 to-white/85 z-10"></div>
              
              {/* Book covers sprite - optimized single image */}
              <div 
                className="absolute inset-0 opacity-60"
                style={{
                  backgroundImage: 'url(/assets/book-collage-sprite.webp)',
                  backgroundSize: '800px 600px',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'repeat'
                }}
              />
            </div>
          </div>

          {/* Content - stays within max-w-5xl */}
          <div className="relative z-20">
        {/* Hero title */}
            <section className="pt-6">
              <div className="max-w-4xl mx-auto text-center bg-white/60 backdrop-blur-sm rounded-lg border border-gray-200/70 shadow-sm px-4 sm:px-5 py-4 edge-fade">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 whitespace-nowrap" style={{ fontFamily: "'Roboto Flex', sans-serif" }}>
                  AI Narrator to read aloud your ebooks
                </h1>
                <p className="mt-2 sm:mt-3 text-base sm:text-lg text-gray-700 max-w-3xl mx-auto">
            Upload an EPUB to convert it to audio and follow along with synchronized text highlighting.
          </p>
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
          {/* Minimal, clear messaging for EPUB + TTS */}
          <h3 className="text-lg font-semibold mb-1.5 text-gray-800">Upload your EPUB, PDF, or MOBI</h3>
          <p className="text-sm text-gray-500 mb-3">Drag & drop a .epub, .pdf, or .mobi file, or click to choose</p>
          <button className="browse-button" onClick={handleUploadClick}>
            Choose EPUB, PDF, or MOBI
          </button>
          <input ref={fileInputRef} type="file" accept="application/epub+zip,.epub,application/pdf,.pdf,application/x-mobipocket-ebook,.mobi" onChange={handleFileChange} className="hidden" />
          <p className="mt-2 text-xs text-gray-500">After upload, open your book and tap Read Aloud.</p>
        </div>

        {/* Free ebook resources */}
            <section className="mt-12 pb-8">
              <div className="max-w-2xl mx-auto text-center bg-white/60 backdrop-blur-sm rounded-lg border border-gray-200/70 shadow-sm px-4 sm:px-5 py-4 edge-fade">
                <h3 className="text-base font-semibold text-gray-800">Looking for eBooks?</h3>
                <p className="text-sm text-gray-600 mt-1">Find free public domain books or purchase new releases to convert to audio.</p>
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
            <button 
              onClick={() => handleExternalLinkClick('eBooks.com', 'https://www.ebooks.com/en-bh/')} 
              className="font-medium text-amber-800 hover:underline"
            >
              Buy New eBooks
            </button>
                </div>
          </div>
        </section>
          </div>
        </div>

        {/* User's Library Section: Appears here ONLY if they have books */}
        {books.length > 0 && (
          <section className="user-library-section mt-16 border-t-2 border-amber-200 pt-10 pb-8 bg-gradient-to-b from-amber-50/30 to-transparent rounded-t-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-900 to-amber-700 bg-clip-text text-transparent">
                  {isAuthenticated ? "Your Cloud Library" : "Your Current Library"}
                </h2>
                <p className="text-sm text-gray-600 mt-1">Your personal collection of ebooks</p>
              </div>
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

    </div>
  );
};

export default Library;