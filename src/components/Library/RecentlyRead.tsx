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

    // Use the calculated progress percentage
    const getReadingProgress = (book: BookData) => {
        if (book.progress !== undefined) {
            return book.progress;
        }
        // Fallback for older books or newly added ones
        if (book.currentPage && book.currentPage > 0) {
            return Math.min(book.currentPage * 5, 80);
        }
        return 0;
    };

    return (
        <div className="recently-read-section mb-5">
            <h2 className="text-xl font-medium text-gray-800 mb-3">Currently Reading</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {books.map(book => (
                    <div
                        key={book.id}
                        className="book-card recent bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
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
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="default-cover w-full h-full flex items-center justify-center bg-amber-800">
                                        <span className="text-xl font-medium text-white">{book.title.charAt(0)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Book details on the right */}
                            <div className="flex flex-col p-3 flex-grow">
                                {/* Reading progress bar - Moved above title */}
                                <div className="mb-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Progress</p>
                                        <span className="text-xs font-bold text-indigo-700">{getReadingProgress(book)}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-500 ease-out"
                                            style={{ width: `${getReadingProgress(book)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-base font-medium text-gray-800 line-clamp-1">{book.title}</h3>
                                    <p className="text-sm text-gray-600 line-clamp-1">{book.author}</p>
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