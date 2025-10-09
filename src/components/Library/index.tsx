// src/components/Library/index.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useBook } from '../../context/BookContext';
import BookGrid from './BookGrid';
import './Library.css';
import { trackEvent } from '../../lib/analytics'; // Make sure to import it
import { useAuth } from "../../context/AuthContext";


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

        {/* Cloud Sync Loading Overlay - REMOVED for progressive loading */}
        {/* Books now show individual loading states instead of blocking the entire page */}

        {/* Simple sync status indicator */}
        {isSyncingFromCloud && (
          <div className="mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <p className="text-sm text-blue-800">
                  🚀 Smart sync in progress - only downloading new books...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* --- START: Simplified Display Logic --- */}
        
                 {/* Showcase Carousel: Always visible */}
        {/* Showcase disabled for performance */}

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

        {/* Hero title */}
        <section className="text-center mt-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
            AI Narrator to read aloud your ebooks
          </h1>
          <p className="mt-2 sm:mt-3 text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
            Upload an EPUB to convert it to audio and follow along with synchronized text highlighting.
          </p>
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
          <h3 className="text-lg font-semibold mb-1.5 text-gray-800">Upload your EPUB or PDF</h3>
          <p className="text-sm text-gray-500 mb-3">Drag & drop a .epub or .pdf file, or click to choose</p>
          <button className="browse-button" onClick={handleUploadClick}>
            Choose EPUB or PDF
          </button>
          <input ref={fileInputRef} type="file" accept="application/epub+zip,.epub,application/pdf,.pdf" onChange={handleFileChange} className="hidden" />
          <p className="mt-2 text-xs text-gray-500">After upload, open your book and tap Read Aloud.</p>
        </div>

        {/* Free ebook resources */}
        <section className="mt-12 text-center">
          <h3 className="text-base font-semibold text-gray-700">Looking for eBooks?</h3>
          <p className="text-sm text-gray-500 mt-1">Find free public domain books or purchase new releases to convert to audio.</p>
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
        </section>

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

    </div>
  );
};

export default Library;