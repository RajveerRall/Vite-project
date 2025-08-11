// src/components/Library/index.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useBook } from '../../context/BookContext';
import BookGrid from './BookGrid';
import './Library.css';
import { trackEvent } from '../../lib/analytics'; // Make sure to import it
import { useAuth, SignInButton } from "@clerk/clerk-react";
import { BookCarousel } from './BookCarousel';
import sampleBookPaths from '../../lib/sampleBookManifest.json';
import { BookData } from '@/types/books'; // Make sure BookData is imported
// 👇 We need to import the tools and helpers for deep processing
import JSZip from 'jszip';
import { DOMParser } from 'xmldom';
import { getDirectoryPath, resolveRelativePath } from '../../utils/pathUtils'; // Assuming you have this utility

// This helper function is now upgraded to perform "deep processing" to find the real cover.
async function processBookFileForDisplay(file: File): Promise<BookData | null> {
  try {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);

    // --- Start: Logic copied and adapted from BookContext's addBook function ---
    const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
    if (!containerXml) throw new Error('Invalid EPUB: container.xml not found');
    
    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXml, 'application/xml');
    const rootfiles = containerDoc.getElementsByTagName('rootfile');
    if (rootfiles.length === 0) throw new Error('Invalid EPUB: No rootfile found');

    const opfPath = rootfiles[0].getAttribute('full-path') || '';
    const opfContent = await loadedZip.file(opfPath)?.async('text');
    if (!opfContent) throw new Error('Invalid EPUB: OPF file not found');
    
    const opfDoc = parser.parseFromString(opfContent, 'application/xml');

    const title = opfDoc.getElementsByTagName('dc:title')[0]?.textContent?.trim() || file.name.replace('.epub', '');
    const author = opfDoc.getElementsByTagName('dc:creator')[0]?.textContent?.trim() || 'Unknown Author';

    let coverUrl = ''; // Default to empty string
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
            // Create a temporary URL for the image blob
            coverUrl = URL.createObjectURL(coverBlob);
          }
        }
      }
    }
    // --- End: Adapted logic ---

    return {
      id: file.name, // Use filename as a unique ID for the carousel
      title,
      author,
      coverUrl, // This will now be a valid blob: URL if a cover is found
      file,
      currentPage: 0,
      totalPages: 0,
      lastRead: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error processing sample book "${file.name}":`, error);
    return null;
  }
}

const Library: React.FC = () => {
  const { books, addBook, isLoading, openBook } = useBook();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  // Toast notification states
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const { isSignedIn } = useAuth();
    // State specifically for the anonymous user's showcase carousel
  const [carouselBooks, setCarouselBooks] = useState<BookData[]>([]);
  const [isCarouselLoading, setIsCarouselLoading] = useState<boolean>(true);
  const displayBooks = isSignedIn ? books : carouselBooks;



    // This effect runs only once to load the sample books for the carousel
  useEffect(() => {
    // Only load the carousel if the user is logged out
    if (!isSignedIn) {
      const loadSampleBooks = async () => {
        setIsCarouselLoading(true);
        const loadedBooks: BookData[] = [];

        for (const bookPath of sampleBookPaths) {
          try {
            // Fetch each book from the public/sample-books folder
            const response = await fetch(`/sample-books/${bookPath}`);
            const blob = await response.blob();
            const file = new File([blob], bookPath, { type: 'application/epub+zip' });
            
            // For now, we'll use a simplified processing step.
            // You can enhance this with epub.js to get real covers/titles.
            const bookData = await processBookFileForDisplay(file);

            // --- ADDED: A check to ensure we only add valid books ---
            if (bookData) {
              loadedBooks.push(bookData);
            }

          } catch (error) {
            console.error(`Failed to load sample book: ${bookPath}`, error);
          }
        }
        setCarouselBooks(loadedBooks);
        setIsCarouselLoading(false);
      };

      loadSampleBooks();
    }
  }, [isSignedIn]); // Reruns if the user logs in or out
  
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
    // Use the .library class for the background and font, and Tailwind for layout
    <div className="library bg-slate-50">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Toast Notification would go here */}


        {/* --- Toast Notification --- */}
        {/* {showToast && (
          <div className={`fixed top-6 right-6 z-50 rounded-md shadow-lg max-w-sm w-full p-4 border-l-4 ${
            toastType === 'success'
              ? 'bg-amber-50 border-amber-500 text-amber-900'
              : 'bg-red-50 border-red-500 text-red-900'
          }`}>

          </div>
        )}00*/}
        

        {/* --- Toast Notification --- */}
        {showToast && (
          <div
            role="alert"
            className={`fixed top-6 right-6 z-50 rounded-md shadow-lg max-w-sm w-full p-4 border-l-4 transition-transform transform-gpu animate-toast-in ${
              toastType === 'success'
                ? 'bg-amber-50 border-amber-500 text-amber-900'
                : 'bg-red-50 border-red-500 text-red-900'
            }`}
          >
            <div className="flex items-start">
              {/* Icon */}
              <div className="flex-shrink-0">
                {toastType === 'success' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              {/* Message */}
              <div className="ml-3 w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium">
                  {toastType === 'success' ? 'Success' : 'Error'}
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  {toastMessage}
                </p>
              </div>

              {/* Close Button */}
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  onClick={() => setShowToast(false)}
                  className="inline-flex rounded-md bg-transparent text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                >
                  <span className="sr-only">Close</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Conditional Hero Section --- */}
        {/* {books.length > 0 ? (
          <section className="book-carousel-section">
            <h2>Your Library</h2>
            <BookCarousel books={sortedBooks} onBookSelect={openBook} />
          </section>
        ) : (
          !isLoading && (
            <section className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Your Personal Reading Space
              </h1>
              <p className="mt-4 text-lg leading-8 text-gray-600">
                Upload your first ePub file to start building your library.
              </p>
            </section>
          )
        )} */}


        {/* --- Showcase Section: ONLY for Logged-Out Users --- */}
        {!isSignedIn && carouselBooks.length > 0 && (
          <section className="showcase-section mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">
              Listen to your favourite books
            </h2>
            <BookCarousel books={carouselBooks} onBookSelect={openBook} />
          </section>
        )}

        {/* --- Welcome Message: ONLY for new Anonymous Users with NO books --- */}
        {!isSignedIn && books.length === 0 && !isCarouselLoading && carouselBooks.length === 0 && (
          <section className="text-center mb-12">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Your Personal Reading Space
            </h1>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Upload an ePub file to start building your library.
            </p>
          </section>
        )}


        {/* Free ebook resources*/}
        <section className="mt-16 text-center">
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
        
        {/* --- Upload Area: Uses classes from Library.css --- */}
        <div 
          // We apply the .upload-area class AND the dynamic .active class
          className={`upload-area mt-10 max-w-2xl mx-auto ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <div className="upload-icon">
             {/* Book Icon SVG */}
             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
          </div>
          <h3 className="text-lg font-medium mb-1.5 text-gray-800">Upload your eBook</h3>
          <p className="text-gray-600 mb-3">Drag and drop your ePub file here, or click to browse</p>
          <button className="browse-button" onClick={handleUploadClick}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Browse files
          </button>
          <input ref={fileInputRef} type="file" accept=".epub" onChange={handleFileChange} className="hidden" />
        </div>



        {/* --- User's Library Section: Grid for ANY user with books --- */}
        {books.length > 0 && (
          <section className="user-library-section mt-16 border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">
              {/* Dynamic title */}
              {isSignedIn ? "Your Cloud Library" : "Your Current Library"}
            </h2>
            <BookGrid books={sortedBooks} />
          </section>
        )}


        

        {/* --- Sign-Up Prompt --- */}
        {!isSignedIn && (
          <div className="mt-8 text-center bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-amber-900">
              Enjoying YoRead? 
              <SignInButton mode="modal">
                <button className="font-semibold text-amber-800 hover:text-amber-900 underline mx-1">
                  Sign up for free 
                </button>
              </SignInButton>
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