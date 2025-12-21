// src/components/Library/BookGrid.tsx
import React, { useState } from 'react';
import { BookData } from '../../types/books';
import { useBook } from '../../context/BookContext';
import { trackEvent } from '../../lib/analytics';

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
        const book = books.find(b => b.id === bookId);
        trackEvent('remove_book_start', {
            book_title: book?.title || 'Unknown Book',
        });
        setShowConfirmDelete(bookId);
    };

    const handleRemoveConfirm = (bookId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const book = books.find(b => b.id === bookId);
        trackEvent('remove_book_confirm', {
            book_title: book?.title || 'Unknown Book',
        });
        removeBook(bookId);
        setShowConfirmDelete(null);
    };

    const handleRemoveCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        const book = books.find(b => b.id === showConfirmDelete);
        trackEvent('remove_book_cancel', {
            book_title: book?.title || 'Unknown Book',
        });
        setShowConfirmDelete(null);
    };

    return (
        <div className="books-section mb-4">
            <div className="books-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                {books.map(book => (
                    <div key={book.id} className="book-card relative bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:border-amber-300 transition-all duration-300 group hover:-translate-y-1">
                        {/* Loading Overlay */}
                        {book.isDownloading && (
                            <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-20 rounded-lg">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                    <p className="text-xs text-gray-600 font-medium">Downloading...</p>
                                    <p className="text-xs text-gray-400 mt-1">{book.title}</p>
                                </div>
                            </div>
                        )}

                        <div
                            className={`book-cover aspect-[2/3] relative bg-gradient-to-br from-gray-50 to-gray-100 ${book.isDownloading ? 'pointer-events-none' : 'cursor-pointer'} group-hover:scale-105 transition-transform duration-300`}
                            onClick={() => !book.isDownloading && openBook(book)}
                        >
                            {book.coverUrl ? (
                                <img
                                    src={book.coverUrl}
                                    alt={`Cover of ${book.title}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="default-cover w-full h-full flex items-center justify-center bg-amber-800">
                                    <span className="text-2xl font-medium text-white">{book.title.charAt(0)}</span>
                                </div>
                            )}
                        </div>

                        <div className="book-info p-3">
                            {/* Reading Progress - Moved above title and made more visible */}
                            {book.progress !== undefined && book.progress > 0 && !book.isDownloading && (
                                <div className="mb-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Progress</span>
                                        <span className="text-xs font-bold text-amber-700">{book.progress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                        <div
                                            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500 ease-out"
                                            style={{ width: `${book.progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <h3 className="font-semibold text-sm line-clamp-1 text-gray-900 group-hover:text-amber-900 transition-colors">{book.title}</h3>
                            <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">{book.author}</p>
                            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatDate(book.lastRead)}
                            </p>
                        </div>

                        <div className="book-actions p-3 pt-0 flex gap-2">
                            <button
                                className={`flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all duration-200 ${book.isDownloading
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-amber-800 hover:bg-amber-900 text-white shadow-sm hover:shadow-md'
                                    }`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!book.isDownloading) {
                                        openBook(book);
                                    }
                                }}
                                disabled={book.isDownloading}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                {book.isDownloading ? 'Loading...' : 'Read'}
                            </button>

                            <button
                                className={`flex items-center justify-center px-2.5 py-2 rounded-lg font-medium transition-all duration-200 ${book.isDownloading
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200'
                                    }`}
                                onClick={(e) => !book.isDownloading && handleRemovePrompt(book.id, e)}
                                disabled={book.isDownloading}
                                title="Remove book"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>

                        {/* Delete Confirmation Overlay */}
                        {showConfirmDelete === book.id && (
                            <div className="absolute inset-0 bg-white rounded-xl shadow-2xl p-4 flex flex-col z-10 border-2 border-red-200">
                                <div className="flex items-center justify-center mb-3">
                                    <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <p className="text-sm mb-4 text-center font-medium text-gray-900">Remove this book from your library?</p>
                                <div className="mt-auto flex gap-2">
                                    <button
                                        className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
                                        onClick={handleRemoveCancel}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
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