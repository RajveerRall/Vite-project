// src/components/Library/index.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useBook } from '../../context/BookContext';
import BookGrid from './BookGrid';
import './Library.css';
import { trackEvent } from '../../lib/analytics'; // Make sure to import it


const Library: React.FC = () => {
  const { books, addBook, isLoading } = useBook();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  // Toast notification states
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  
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
    <div className="library min-h-screen bg-white text-gray-800">
      {/* Simple Elegant Header */}
      <header className="library-header border-b border-gray-200 py-3">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-medium text-gray-800">YoRead: Your AI Book Reader</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Toast Notification */}
        {showToast && (
          <div className={`toast fixed top-4 right-4 z-50 rounded-md shadow-md px-4 py-3 flex items-center ${
            toastType === 'success' ? 'bg-amber-100 text-amber-800 border-l-4 border-amber-500' : 
                                     'bg-red-100 text-red-800 border-l-4 border-red-500'
          }`}>
            <div className="flex-shrink-0 mr-3">
              {toastType === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div>{toastMessage}</div>
            <button 
              className="ml-auto text-gray-500 hover:text-gray-900"
              onClick={() => setShowToast(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Welcome Message - only show if no books */}
        {books.length === 0 && (
          <div className="text-center mb-4">
            <h2 className="text-xl font-medium text-gray-800 mb-1">Welcome to YoRead</h2>
            <p className="text-gray-600 max-w-lg mx-auto">
              Upload an ePub file to start reading with a focused, distraction-free experience
            </p>
          </div>
        )}

        {/* Upload Area - reduced padding */}
        <div 
          className={`mb-5 border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${dragActive 
              ? 'border-amber-600 bg-amber-50' 
              : 'border-gray-300 hover:border-gray-400'}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center">
            <div className="mb-3 text-amber-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            
            <h3 className="text-lg font-medium mb-1.5 text-gray-800">Upload your eBook</h3>
            <p className="text-gray-600 mb-3">
              Drag and drop your ePub file here, or click to browse
            </p>
            
            {/* Browse Files Button */}
            <button 
              className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded transition-colors font-medium flex items-center" 
              onClick={handleUploadClick}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Browse files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".epub"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Supports ePub note - reduced margin */}
        <div className="text-center text-gray-500 text-sm mb-4">
          Supports .epub files
        </div>

        {/* eBook Resource Links - reduced margin */}
        {/* <div className="mb-5 text-center">
          <p className="text-gray-600 mb-1.5">Find free eBooks:</p>
          <div className="flex items-center justify-center space-x-6">
            <a 
              href="https://www.gutenberg.org" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-amber-800 hover:underline"
            >
              Project Gutenberg
            </a>
            <a 
              href="https://www.planetebook.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-amber-800 hover:underline"
            >
              Planet eBook
            </a>
          </div>
        </div> */}


        <div className="mb-5 text-center">
        <p className="text-gray-600 mb-1.5">Find free eBooks:</p>
        <div className="flex items-center justify-center space-x-6">
            {/* Updated links to use the handler */}
            <button 
              onClick={() => handleExternalLinkClick('Project Gutenberg', 'https://www.gutenberg.org')} 
              className="text-amber-800 hover:underline"
            >
              Project Gutenberg
            </button>
            <button 
              onClick={() => handleExternalLinkClick('Planet eBook', 'https://www.planetebook.com')} 
              className="text-amber-800 hover:underline"
            >
              Planet eBook
            </button>
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="loading fixed inset-0 bg-white/90 flex items-center justify-center z-50">
            <div className="p-6 flex flex-col items-center">
              <div className="loading-spinner w-12 h-12 border-4 border-gray-200 border-t-amber-800 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-700">Loading your book...</p>
            </div>
          </div>
        )}

        {/* Book Grid section - simplified */}
        {books.length > 0 && (
          <div className="border-t border-gray-200 pt-5 mt-5">
            <BookGrid books={sortedBooks} />
          </div>
        )}
      </main>

      {/* Simple Footer - reduced padding */}
      <footer className="py-4 border-t border-gray-200 mt-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-gray-500 text-sm">
          YoRead - A focused eBook reading experience
        </div>
      </footer>
    </div>
  );
};

export default Library;