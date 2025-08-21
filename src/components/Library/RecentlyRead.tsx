// src/components/Library/RecentlyRead.tsx
import React from 'react';
import { BookData } from '../../types/books';
import { useBook } from '../../context/BookContext';
import { getResponsiveCoverUrls } from '../../utils/imageOptimization';

interface RecentlyReadProps {
  books: BookData[];
}

const RecentlyRead: React.FC<RecentlyReadProps> = ({ books }) => {
  const { openBook } = useBook();

  if (books.length === 0) {
    return null;
  }

  // Simple visual progress indicator
  const getReadingProgress = (book: BookData) => {
    // If we have current page data, use that for a visual indicator
    if (book.currentPage && book.currentPage > 0) {
      return Math.min(book.currentPage * 5, 80); // Just a visual approximation
    }
    return 10; // Minimal progress for newly added books
  };

  return (
    <div className="recently-read-section mb-5">
      <h2 className="text-xl font-medium text-gray-800 mb-3">Currently Reading</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {books.map(book => (
          <div 
            key={book.id} 
            className="book-card recent bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden cursor-pointer"
            onClick={() => openBook(book)}
          >
            <div className="flex h-full">
              {/* Book cover on the left */}
              <div className="book-cover w-20 min-w-20 h-auto bg-gray-100 flex-shrink-0">
                {book.coverUrl ? (
                  (() => {
                    const { src, srcSet, sizes } = getResponsiveCoverUrls(book.coverUrl);
                    return (
                  <img 
                        src={src}
                        srcSet={srcSet}
                    alt={`Cover of ${book.title}`}
                    className="w-full h-full object-cover" 
                        loading="lazy"
                  />
                    );
                  })()
                ) : (
                  <div className="default-cover w-full h-full flex items-center justify-center bg-amber-800">
                    <span className="text-xl font-medium text-white">{book.title.charAt(0)}</span>
                  </div>
                )}
              </div>
              
              {/* Book details on the right */}
              <div className="flex flex-col p-3 flex-grow">
                <div>
                  <h3 className="text-base font-medium text-gray-800 line-clamp-1">{book.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-1">{book.author}</p>
                </div>
                
                {/* Reading progress bar */}
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-1">Reading Progress</p>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${getReadingProgress(book)}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Last read date and continue button */}
                <div className="mt-auto pt-2 flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Last read: {new Date(book.lastRead).toLocaleDateString()}
                  </span>
                  <button 
                    className="text-sm text-indigo-600 font-medium hover:text-indigo-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      openBook(book);
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentlyRead;