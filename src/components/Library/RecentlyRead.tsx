// // // // src/components/Library/RecentlyRead.tsx
// // // import React from 'react';
// // // import { BookData } from '../../types/books';
// // // import { useBook } from '../../context/BookContext';

// // // interface RecentlyReadProps {
// // //   books: BookData[];
// // // }

// // // const RecentlyRead: React.FC<RecentlyReadProps> = ({ books }) => {
// // //   const { openBook } = useBook();

// // //   if (books.length === 0) {
// // //     return null;
// // //   }

// // //   return (
// // //     <div className="recently-read-section">
// // //       <h2>Recently Read</h2>
// // //       <div className="recent-books">
// // //         {books.map(book => (
// // //           <div key={book.id} className="book-card recent" onClick={() => openBook(book)}>
// // //             <div className="book-cover">
// // //               {book.coverUrl ? (
// // //                 <img src={book.coverUrl} alt={`Cover of ${book.title}`} />
// // //               ) : (
// // //                 <div className="default-cover">
// // //                   <span>{book.title.charAt(0)}</span>
// // //                 </div>
// // //               )}
// // //             </div>
// // //             <div className="book-info">
// // //               <h3>{book.title}</h3>
// // //               <p>{book.author}</p>
// // //               <p className="last-read">
// // //                 Last read: {new Date(book.lastRead).toLocaleDateString()}
// // //               </p>
// // //             </div>
// // //           </div>
// // //         ))}
// // //       </div>
// // //     </div>
// // //   );
// // // };

// // // export default RecentlyRead;

// // // src/components/Library/RecentlyRead.tsx
// // import React from 'react';
// // import { BookData } from '../../types/books';
// // import { useBook } from '../../context/BookContext';

// // interface RecentlyReadProps {
// //   books: BookData[];
// // }

// // const RecentlyRead: React.FC<RecentlyReadProps> = ({ books }) => {
// //   const { openBook } = useBook();

// //   if (books.length === 0) {
// //     return null;
// //   }

// //   // Simple visual progress indicator
// //   const getReadingProgress = (book: BookData) => {
// //     // If we have current page data, use that for a visual indicator
// //     if (book.currentPage && book.currentPage > 0) {
// //       return Math.min(book.currentPage * 5, 80); // Just a visual approximation
// //     }
// //     return 10; // Minimal progress for newly added books
// //   };

// //   return (
// //     <div className="recently-read-section mb-8">
// //       <h2 className="text-2xl font-semibold mb-6">Recently Read</h2>
      
// //       <div className="recent-books grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
// //         {books.map(book => (
// //           <div 
// //             key={book.id} 
// //             className="book-card recent bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
// //             onClick={() => openBook(book)}
// //           >
// //             {/* Card content structure properly contained */}
// //             <div className="flex flex-col h-full">
// //               {/* Top part with cover and info */}
// //               <div className="flex flex-grow">
// //                 <div className="book-cover w-24 bg-slate-200 dark:bg-slate-700 flex-shrink-0">
// //                   {book.coverUrl ? (
// //                     <img 
// //                       src={book.coverUrl} 
// //                       alt={`Cover of ${book.title}`}
// //                       className="w-full h-full object-cover" 
// //                     />
// //                   ) : (
// //                     <div className="default-cover w-full h-full flex items-center justify-center">
// //                       <span className="text-2xl font-semibold text-slate-400 dark:text-slate-500">{book.title.charAt(0)}</span>
// //                     </div>
// //                   )}
// //                 </div>
                
// //                 <div className="book-info p-4 flex-grow flex flex-col justify-between">
// //                   <div>
// //                     <h3 className="font-medium text-base line-clamp-1">{book.title}</h3>
// //                     <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{book.author}</p>
// //                   </div>
                  
// //                   <div className="mt-auto">
// //                     <div className="flex items-center justify-between text-xs mb-1">
// //                       <span>Reading Progress</span>
// //                     </div>
// //                     <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
// //                       <div 
// //                         className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full"
// //                         style={{ width: `${getReadingProgress(book)}%` }}
// //                       ></div>
// //                     </div>
// //                   </div>
// //                 </div>
// //               </div>
              
// //               {/* Footer with date and button - now properly in the card */}
// //               <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
// //                 <p className="last-read text-xs text-slate-500 dark:text-slate-400">
// //                   Last read: {new Date(book.lastRead).toLocaleDateString()}
// //                 </p>
// //                 <button 
// //                   className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:text-indigo-800 dark:hover:text-indigo-300"
// //                   onClick={(e) => {
// //                     e.stopPropagation();
// //                     openBook(book);
// //                   }}
// //                 >
// //                   Continue
// //                 </button>
// //               </div>
// //             </div>
// //           </div>
// //         ))}
// //       </div>
// //     </div>
// //   );
// // };

// // export default RecentlyRead;


// // src/components/Library/RecentlyRead.tsx
// import React from 'react';
// import { BookData } from '../../types/books';
// import { useBook } from '../../context/BookContext';

// interface RecentlyReadProps {
//   books: BookData[];
// }

// const RecentlyRead: React.FC<RecentlyReadProps> = ({ books }) => {
//   const { openBook } = useBook();

//   if (books.length === 0) {
//     return null;
//   }

//   // Simple visual progress indicator
//   const getReadingProgress = (book: BookData) => {
//     // If we have current page data, use that for a visual indicator
//     if (book.currentPage && book.currentPage > 0) {
//       return Math.min(book.currentPage * 5, 80); // Just a visual approximation
//     }
//     return 10; // Minimal progress for newly added books
//   };

//   return (
//     <div className="recently-read-section mb-8">
//       <h2 className="text-2xl font-medium text-gray-800 mb-6">Recently Read</h2>
      
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {books.map(book => (
//           <div 
//             key={book.id} 
//             className="book-card recent bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden cursor-pointer"
//             onClick={() => openBook(book)}
//           >
//             <div className="flex h-full">
//               {/* Book cover on the left */}
//               <div className="book-cover w-24 min-w-24 h-auto bg-gray-100 flex-shrink-0">
//                 {book.coverUrl ? (
//                   <img 
//                     src={book.coverUrl} 
//                     alt={`Cover of ${book.title}`}
//                     className="w-full h-full object-cover" 
//                   />
//                 ) : (
//                   <div className="default-cover w-full h-full flex items-center justify-center bg-amber-800">
//                     <span className="text-xl font-medium text-white">{book.title.charAt(0)}</span>
//                   </div>
//                 )}
//               </div>
              
//               {/* Book details on the right */}
//               <div className="flex flex-col p-4 flex-grow">
//                 <div>
//                   <h3 className="text-base font-medium text-gray-800 line-clamp-1">{book.title}</h3>
//                   <p className="text-sm text-gray-600 line-clamp-1">{book.author}</p>
//                 </div>
                
//                 {/* Reading progress bar */}
//                 <div className="mt-4">
//                   <p className="text-xs text-gray-600 mb-1">Reading Progress</p>
//                   <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
//                     <div 
//                       className="h-full bg-indigo-600 rounded-full"
//                       style={{ width: `${getReadingProgress(book)}%` }}
//                     ></div>
//                   </div>
//                 </div>
                
//                 {/* Last read date and continue button */}
//                 <div className="mt-auto pt-4 flex justify-between items-center">
//                   <span className="text-xs text-gray-500">
//                     Last read: {new Date(book.lastRead).toLocaleDateString()}
//                   </span>
//                   <button 
//                     className="text-sm text-indigo-600 font-medium hover:text-indigo-800"
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       openBook(book);
//                     }}
//                   >
//                     Continue
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default RecentlyRead;



// src/components/Library/RecentlyRead.tsx
import React from 'react';
import { BookData } from '../../types/books';
import { useBook } from '../../context/BookContext';

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
      <h2 className="text-xl font-medium text-gray-800 mb-3">Recently Read</h2>
      
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
                  <img 
                    src={book.coverUrl} 
                    alt={`Cover of ${book.title}`}
                    className="w-full h-full object-cover" 
                  />
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