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
      <h2 className="text-xl font-medium text-gray-800 mb-3">My Library</h2>
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