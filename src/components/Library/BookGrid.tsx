// src/components/Library/BookGrid.tsx
import React from 'react';
import { BookData } from '../../types/book';
import { useBook } from '../../context/BookContext';

interface BookGridProps {
  books: BookData[];
}

const BookGrid: React.FC<BookGridProps> = ({ books }) => {
  const { openBook, removeBook } = useBook();

  return (
    <div className="books-section">
      <h2>All Books</h2>
      <div className="books-grid">
        {books.map(book => (
          <div key={book.id} className="book-card">
            <div className="book-cover" onClick={() => openBook(book)}>
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={`Cover of ${book.title}`} />
              ) : (
                <div className="default-cover">
                  <span>{book.title.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="book-info">
              <h3>{book.title}</h3>
              <p>{book.author}</p>
            </div>
            <div className="book-actions">
              <button onClick={(e) => {
                e.stopPropagation();
                openBook(book);
              }}>Read</button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const confirmDelete = window.confirm('Are you sure you want to remove this book from your library?');
                  if (confirmDelete) {
                    removeBook(book.id);
                  }
                }} 
                className="remove-book">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookGrid;