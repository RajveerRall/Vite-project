// src/components/Library/index.tsx
import React, { useRef } from 'react';
import { useBook } from '../../context/BookContext';
import BookGrid from './BookGrid';
import RecentlyRead from './RecentlyRead';
import './Library.css';

const Library: React.FC = () => {
  const { books, addBook, isLoading } = useBook();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        await addBook(e.target.files[0]);
        e.target.value = ''; // Reset the input
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Error uploading book');
      }
    }
  };
  
  // Get sorted books for recently read section
  const sortedBooks = [...books].sort((a, b) => 
    new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
  );
  
  // Get recently read books (top 3)
  const recentBooks = sortedBooks.slice(0, 3);
  
  return (
    <div className="library">
      <header className="library-header">
        <h1>My E-Book Library</h1>
        <div className="upload-container">
          <button className="upload-button" onClick={handleUploadClick}>
            Upload Book
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".epub"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      </header>
      
      {isLoading && (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading book...</p>
        </div>
      )}
      
      {books.length === 0 ? (
        <div className="empty-library">
          <p>Your library is empty. Upload an EPUB book to get started!</p>
        </div>
      ) : (
        <>
          <RecentlyRead books={recentBooks} />
          <BookGrid books={sortedBooks} />
        </>
      )}
    </div>
  );
};

export default Library;