// // src/components/Library/BookGrid.tsx
// import React, { useState } from 'react';
// import { BookData } from '../../types/books';
// import { useBook } from '../../context/BookContext';
// import { trackEvent } from '../../lib/analytics';

// interface BookGridProps {
//   books: BookData[];
// }

// const BookGrid: React.FC<BookGridProps> = ({ books }) => {
//   const { openBook, removeBook } = useBook();
//   const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  
//   if (books.length === 0) {
//     return null;
//   }

//   const formatDate = (dateString: string) => {
//     const date = new Date(dateString);
//     return date.toLocaleDateString();
//   };

//   const handleRemovePrompt = (bookId: string, e: React.MouseEvent) => {
//     e.stopPropagation();
//     setShowConfirmDelete(bookId);
//   };

//   const handleRemoveConfirm = (bookId: string, e: React.MouseEvent) => {
//     e.stopPropagation();
//     removeBook(bookId);
//     setShowConfirmDelete(null);
//   };

//   const handleRemoveCancel = (e: React.MouseEvent) => {
//     e.stopPropagation();
//     setShowConfirmDelete(null);
//   };

//   return (
//     <div className="books-section mb-4">
//       <h2 className="text-xl font-medium text-gray-800 mb-3">My Library</h2>
//       <div className="books-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
//         {books.map(book => (
//           <div key={book.id} className="book-card relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm group">
//             <div 
//               className="book-cover aspect-[2/3] relative bg-gray-100 cursor-pointer" 
//               onClick={() => openBook(book)}
//             >
//               {book.coverUrl ? (
//                 <img 
//                   src={book.coverUrl} 
//                   alt={`Cover of ${book.title}`}
//                   className="w-full h-full object-cover" 
//                 />
//               ) : (
//                 <div className="default-cover w-full h-full flex items-center justify-center bg-amber-800">
//                   <span className="text-2xl font-medium text-white">{book.title.charAt(0)}</span>
//                 </div>
//               )}
//             </div>
            
//             <div className="book-info p-2">
//               <h3 className="font-medium text-sm line-clamp-1 text-gray-800">{book.title}</h3>
//               <p className="text-xs text-gray-600 line-clamp-1">{book.author}</p>
//               <p className="text-xs text-gray-500 mt-1">
//                 Last read: {formatDate(book.lastRead)}
//               </p>
//             </div>
            
//             <div className="book-actions p-2 pt-0 flex justify-between">
//               <button 
//                 className="text-xs px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded transition-colors"
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   openBook(book);
//                 }}
//               >
//                 Read
//               </button>
              
//               <button 
//                 className="remove-book text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
//                 onClick={(e) => handleRemovePrompt(book.id, e)}
//               >
//                 Remove
//               </button>
//             </div>
            
//             {/* Delete Confirmation Overlay */}
//             {showConfirmDelete === book.id && (
//               <div className="absolute inset-0 bg-white rounded-lg shadow-lg p-3 flex flex-col z-10">
//                 <p className="text-sm mb-4 text-center">Remove this book from your library?</p>
//                 <div className="mt-auto flex justify-between space-x-2">
//                   <button 
//                     className="flex-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm transition-colors"
//                     onClick={handleRemoveCancel}
//                   >
//                     Cancel
//                   </button>
//                   <button 
//                     className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
//                     onClick={(e) => handleRemoveConfirm(book.id, e)}
//                   >
//                     Delete
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default BookGrid;



// src/components/Library/BookGrid.tsx
import React, { useState } from 'react';
import { BookData } from '../../types/books';
import { useBook } from '../../context/BookContext';
import { trackEvent } from '../../lib/analytics';
import { getResponsiveCoverUrls } from '../../utils/imageOptimization';

interface BookGridProps {
  books: BookData[];
}

const BookGrid: React.FC<BookGridProps> = ({ books }) => {
  const { openBook, removeBook } = useBook();
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

  if (books.length === 0) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // This function is called when the user clicks the "Remove" button for the first time.
  const handleRemovePrompt = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Find the book to get its title for analytics
    const book = books.find(b => b.id === bookId);

    // Track the user's INTENT to remove a book.
    trackEvent('remove_book_start', {
      book_title: book?.title || 'Unknown Book',
    });

    setShowConfirmDelete(bookId);
  };

  // This function is called when the user clicks "Delete" in the confirmation dialog.
  const handleRemoveConfirm = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // The core `remove_book` event with full details is tracked inside the `removeBook` function.
    // Here, we track the specific UI confirmation.
    const book = books.find(b => b.id === bookId);
    trackEvent('remove_book_confirm', {
      book_title: book?.title || 'Unknown Book',
    });

    removeBook(bookId);
    setShowConfirmDelete(null);
  };

  // This function is called when the user clicks "Cancel" in the confirmation dialog.
  const handleRemoveCancel = (e: React.MouseEvent) => {
    e.stopPropagation();

    // It's useful to know how often users change their minds.
    // The `showConfirmDelete` state holds the ID of the book in question.
    const book = books.find(b => b.id === showConfirmDelete);
    trackEvent('remove_book_cancel', {
      book_title: book?.title || 'Unknown Book',
    });

    setShowConfirmDelete(null);
  };

  return (
    <div className="books-section mb-4">
      {/* <h2 className="text-xl font-medium text-gray-800 mb-3">My Library</h2> */}
      <div className="books-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {books.map(book => (
          <div key={book.id} className="book-card relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm group">
            {/* Loading Overlay for Progressive Downloads */}
            {book.isDownloading && (
              <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-20 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-xs text-gray-600 font-medium">Downloading...</p>
                  <p className="text-xs text-gray-400 mt-1">{book.title}</p>
                </div>
              </div>
            )}
            
            {/* NO CHANGE NEEDED for openBook, as it's tracked in the context */}
            <div 
              className={`book-cover aspect-[2/3] relative bg-gray-100 ${book.isDownloading ? 'pointer-events-none' : 'cursor-pointer'}`}
              onClick={() => !book.isDownloading && openBook(book)}
            >
              {book.coverUrl ? (
                (() => {
                  const { src, srcSet, sizes } = getResponsiveCoverUrls(book.coverUrl);
                  return (
                    <img 
                      src={src}
                      srcSet={srcSet}
                      sizes={sizes}
                      alt={`Cover of ${book.title}`}
                      className="w-full h-full object-cover" 
                      loading="lazy"
                    />
                  );
                })()
              ) : (
                <div className="default-cover w-full h-full flex items-center justify-center bg-amber-800">
                  <span className="text-2xl font-medium text-white">{book.title.charAt(0)}</span>
                </div>
              )}
            </div>
            
            <div className="book-info p-2">
              <h3 className="font-medium text-sm line-clamp-1 text-gray-800">{book.title}</h3>
              <p className="text-xs text-gray-600 line-clamp-1">{book.author}</p>
              <p className="text-xs text-gray-500 mt-1">
                Last read: {formatDate(book.lastRead)}
              </p>
            </div>
            
            <div className="book-actions p-2 pt-0 flex justify-between">
              {/* NO CHANGE NEEDED for openBook */}
              <button 
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  book.isDownloading 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!book.isDownloading) {
                  openBook(book);
                  }
                }}
                disabled={book.isDownloading}
              >
                {book.isDownloading ? 'Loading...' : 'Read'}
              </button>
              
              {/* UPDATED to call the new handler */}
              <button 
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  book.isDownloading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                onClick={(e) => !book.isDownloading && handleRemovePrompt(book.id, e)}
                disabled={book.isDownloading}
              >
                Remove
              </button>
            </div>
            
            {/* Delete Confirmation Overlay - Handlers are now tracked */}
            {showConfirmDelete === book.id && (
              <div className="absolute inset-0 bg-white rounded-lg shadow-lg p-3 flex flex-col z-10">
                <p className="text-sm mb-4 text-center">Remove this book from your library?</p>
                <div className="mt-auto flex justify-between space-x-2">
                  <button 
                    className="flex-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm transition-colors"
                    onClick={handleRemoveCancel}
                  >
                    Cancel
                  </button>
                  <button 
                    className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                    onClick={(e) => handleRemoveConfirm(book.id, e)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookGrid;