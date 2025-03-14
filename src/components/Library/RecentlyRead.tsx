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

  return (
    <div className="recently-read-section">
      <h2>Recently Read</h2>
      <div className="recent-books">
        {books.map(book => (
          <div key={book.id} className="book-card recent" onClick={() => openBook(book)}>
            <div className="book-cover">
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
              <p className="last-read">
                Last read: {new Date(book.lastRead).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentlyRead;