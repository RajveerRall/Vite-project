// // // src/components/Library/BookGrid.tsx
// // import React from 'react';
// // import { BookData } from '../../types/books';
// // import { useBook } from '../../context/BookContext';

// // interface BookGridProps {
// //   books: BookData[];
// // }

// // const BookGrid: React.FC<BookGridProps> = ({ books }) => {
// //   const { openBook, removeBook } = useBook();

// //   return (
// //     <div className="books-section">
// //       <h2>All Books</h2>
// //       <div className="books-grid">
// //         {books.map(book => (
// //           <div key={book.id} className="book-card">
// //             <div className="book-cover" onClick={() => openBook(book)}>
// //               {book.coverUrl ? (
// //                 <img src={book.coverUrl} alt={`Cover of ${book.title}`} />
// //               ) : (
// //                 <div className="default-cover">
// //                   <span>{book.title.charAt(0)}</span>
// //                 </div>
// //               )}
// //             </div>
// //             <div className="book-info">
// //               <h3>{book.title}</h3>
// //               <p>{book.author}</p>
// //             </div>
// //             <div className="book-actions">
// //               <button onClick={(e) => {
// //                 e.stopPropagation();
// //                 openBook(book);
// //               }}>Read</button>
// //               <button 
// //                 onClick={(e) => {
// //                   e.stopPropagation();
// //                   const confirmDelete = window.confirm('Are you sure you want to remove this book from your library?');
// //                   if (confirmDelete) {
// //                     removeBook(book.id);
// //                   }
// //                 }} 
// //                 className="remove-book">
// //                 Remove
// //               </button>
// //             </div>
// //           </div>
// //         ))}
// //       </div>
// //     </div>
// //   );
// // };

// // export default BookGrid;


// // src/components/Library/BookGrid.tsx
// import React, { useState } from 'react';
// import { BookData } from '../../types/books';
// import { useBook } from '../../context/BookContext';

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
//     <div className="books-section mb-8">
//       <h2 className="text-2xl font-semibold mb-6">All Books</h2>
//       <div className="books-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
//         {books.map(book => (
//           <div key={book.id} className="book-card relative bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow group">
//             <div 
//               className="book-cover aspect-[2/3] relative bg-slate-200 dark:bg-slate-700 cursor-pointer" 
//               onClick={() => openBook(book)}
//             >
//               {book.coverUrl ? (
//                 <img 
//                   src={book.coverUrl} 
//                   alt={`Cover of ${book.title}`}
//                   className="w-full h-full object-cover" 
//                 />
//               ) : (
//                 <div className="default-cover w-full h-full flex items-center justify-center">
//                   <span className="text-3xl font-semibold text-slate-400 dark:text-slate-500">{book.title.charAt(0)}</span>
//                 </div>
//               )}
//             </div>
            
//             <div className="book-info p-3">
//               <h3 className="font-medium text-sm line-clamp-1">{book.title}</h3>
//               <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{book.author}</p>
//               <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
//                 Last read: {formatDate(book.lastRead)}
//               </p>
//             </div>
            
//             <div className="book-actions p-3 pt-0 flex justify-between">
//               <button 
//                 className="text-xs px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 rounded transition-colors"
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   openBook(book);
//                 }}
//               >
//                 Read
//               </button>
              
//               <button 
//                 className="remove-book text-xs px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded transition-colors"
//                 onClick={(e) => handleRemovePrompt(book.id, e)}
//               >
//                 Remove
//               </button>
//             </div>
            
//             {/* Delete Confirmation Overlay */}
//             {showConfirmDelete === book.id && (
//               <div className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 flex flex-col z-10">
//                 <p className="text-sm mb-6 text-center">Are you sure you want to remove this book from your library?</p>
//                 <div className="mt-auto flex justify-between space-x-2">
//                   <button 
//                     className="flex-1 px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-sm transition-colors"
//                     onClick={handleRemoveCancel}
//                   >
//                     Cancel
//                   </button>
//                   <button 
//                     className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
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

  const handleRemovePrompt = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmDelete(bookId);
  };

  const handleRemoveConfirm = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeBook(bookId);
    setShowConfirmDelete(null);
  };

  const handleRemoveCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmDelete(null);
  };

  return (
    <div className="books-section mb-4">
      <h2 className="text-xl font-medium text-gray-800 mb-3">All Books</h2>
      <div className="books-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {books.map(book => (
          <div key={book.id} className="book-card relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm group">
            <div 
              className="book-cover aspect-[2/3] relative bg-gray-100 cursor-pointer" 
              onClick={() => openBook(book)}
            >
              {book.coverUrl ? (
                <img 
                  src={book.coverUrl} 
                  alt={`Cover of ${book.title}`}
                  className="w-full h-full object-cover" 
                />
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
              <button 
                className="text-xs px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  openBook(book);
                }}
              >
                Read
              </button>
              
              <button 
                className="remove-book text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                onClick={(e) => handleRemovePrompt(book.id, e)}
              >
                Remove
              </button>
            </div>
            
            {/* Delete Confirmation Overlay */}
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