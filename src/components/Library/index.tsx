// // // // // // src/components/Library/index.tsx
// // // // // import React, { useRef } from 'react';
// // // // // import { useBook } from '../../context/BookContext';
// // // // // import BookGrid from './BookGrid';
// // // // // import RecentlyRead from './RecentlyRead';
// // // // // import './Library.css';

// // // // // const Library: React.FC = () => {
// // // // //   const { books, addBook, isLoading } = useBook();
// // // // //   const fileInputRef = useRef<HTMLInputElement>(null);
  
// // // // //   const handleUploadClick = () => {
// // // // //     if (fileInputRef.current) {
// // // // //       fileInputRef.current.click();
// // // // //     }
// // // // //   };
  
// // // // //   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
// // // // //     if (e.target.files && e.target.files.length > 0) {
// // // // //       try {
// // // // //         await addBook(e.target.files[0]);
// // // // //         e.target.value = ''; // Reset the input
// // // // //       } catch (error) {
// // // // //         alert(error instanceof Error ? error.message : 'Error uploading book');
// // // // //       }
// // // // //     }
// // // // //   };
  
// // // // //   // Get sorted books for recently read section
// // // // //   const sortedBooks = [...books].sort((a, b) => 
// // // // //     new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
// // // // //   );
  
// // // // //   // Get recently read books (top 3)
// // // // //   const recentBooks = sortedBooks.slice(0, 3);
  
// // // // //   return (
// // // // //     <div className="library">
// // // // //       <header className="library-header">
// // // // //         <h1>My E-Book Library</h1>
// // // // //         <div className="upload-container">
// // // // //           <button className="upload-button" onClick={handleUploadClick}>
// // // // //             Upload Book
// // // // //           </button>
// // // // //           <input
// // // // //             ref={fileInputRef}
// // // // //             type="file"
// // // // //             accept=".epub"
// // // // //             onChange={handleFileChange}
// // // // //             style={{ display: 'none' }}
// // // // //           />
// // // // //         </div>
// // // // //       </header>
      
// // // // //       {isLoading && (
// // // // //         <div className="loading">
// // // // //           <div className="loading-spinner"></div>
// // // // //           <p>Loading book...</p>
// // // // //         </div>
// // // // //       )}
      
// // // // //       {books.length === 0 ? (
// // // // //         <div className="empty-library">
// // // // //           <p>Your library is empty. Upload an EPUB book to get started!</p>
// // // // //         </div>
// // // // //       ) : (
// // // // //         <>
// // // // //           <RecentlyRead books={recentBooks} />
// // // // //           <BookGrid books={sortedBooks} />
// // // // //         </>
// // // // //       )}
// // // // //     </div>
// // // // //   );
// // // // // };

// // // // // export default Library;


// // // // // src/components/Library/index.tsx
// // // // import React, { useRef, useState } from 'react';
// // // // import { useBook } from '../../context/BookContext';
// // // // import BookGrid from './BookGrid';
// // // // import RecentlyRead from './RecentlyRead';
// // // // import './Library.css';

// // // // const Library: React.FC = () => {
// // // //   const { books, addBook, isLoading } = useBook();
// // // //   const fileInputRef = useRef<HTMLInputElement>(null);
// // // //   const [dragActive, setDragActive] = useState<boolean>(false);
  
// // // //   const handleUploadClick = () => {
// // // //     if (fileInputRef.current) {
// // // //       fileInputRef.current.click();
// // // //     }
// // // //   };
  
// // // //   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
// // // //     if (e.target.files && e.target.files.length > 0) {
// // // //       try {
// // // //         await addBook(e.target.files[0]);
// // // //         e.target.value = ''; // Reset the input
// // // //       } catch (error) {
// // // //         alert(error instanceof Error ? error.message : 'Error uploading book');
// // // //       }
// // // //     }
// // // //   };

// // // //   const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
// // // //     e.preventDefault();
// // // //     e.stopPropagation();
    
// // // //     if (e.type === 'dragenter' || e.type === 'dragover') {
// // // //       setDragActive(true);
// // // //     } else if (e.type === 'dragleave') {
// // // //       setDragActive(false);
// // // //     }
// // // //   };

// // // //   const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
// // // //     e.preventDefault();
// // // //     e.stopPropagation();
// // // //     setDragActive(false);
    
// // // //     if (e.dataTransfer.files && e.dataTransfer.files[0]) {
// // // //       try {
// // // //         await addBook(e.dataTransfer.files[0]);
// // // //       } catch (error) {
// // // //         alert(error instanceof Error ? error.message : 'Error uploading book');
// // // //       }
// // // //     }
// // // //   };
  
// // // //   // Get sorted books for recently read section
// // // //   const sortedBooks = [...books].sort((a, b) => 
// // // //     new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
// // // //   );
  
// // // //   // Get recently read books (top 3)
// // // //   const recentBooks = sortedBooks.slice(0, 3);
  
// // // //   return (
// // // //     <div className="library min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
// // // //       {/* Top Navigation */}
// // // //       <header className="library-header bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
// // // //         <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
// // // //           <div className="flex items-center space-x-2">
// // // //             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
// // // //               <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
// // // //             </svg>
// // // //             <h1 className="text-xl font-semibold">My E-Book Library</h1>
// // // //           </div>
          
// // // //           <div className="upload-container">
// // // //             <button className="upload-button px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors" onClick={handleUploadClick}>
// // // //               Upload Book
// // // //             </button>
// // // //             <input
// // // //               ref={fileInputRef}
// // // //               type="file"
// // // //               accept=".epub"
// // // //               onChange={handleFileChange}
// // // //               style={{ display: 'none' }}
// // // //             />
// // // //           </div>
// // // //         </div>
// // // //       </header>

// // // //       <main className="max-w-6xl mx-auto px-4 py-8">
// // // //         {/* Upload Area (Drag & Drop) */}
// // // //         <div 
// // // //           className={`mb-8 border-2 border-dashed rounded-xl p-8 text-center transition-colors
// // // //             ${dragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-700'}`}
// // // //           onDragEnter={handleDrag}
// // // //           onDragOver={handleDrag}
// // // //           onDragLeave={handleDrag}
// // // //           onDrop={handleDrop}
// // // //         >
// // // //           <div className="flex flex-col items-center justify-center">
// // // //             <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-400 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
// // // //               <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
// // // //             </svg>
            
// // // //             <h3 className="text-lg font-medium mb-2">Add a new book to your library</h3>
// // // //             <p className="text-slate-500 dark:text-slate-400 mb-4">Drag & drop your EPUB file here, or click upload button</p>
// // // //           </div>
// // // //         </div>

// // // //         {/* Loading Indicator */}
// // // //         {isLoading && (
// // // //           <div className="loading fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
// // // //             <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg flex flex-col items-center">
// // // //               <div className="loading-spinner w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
// // // //               <p className="text-slate-600 dark:text-slate-300">Loading book...</p>
// // // //             </div>
// // // //           </div>
// // // //         )}

// // // //         {/* Library Content */}
// // // //         {books.length === 0 ? (
// // // //           <div className="empty-library text-center py-16 bg-slate-100 dark:bg-slate-800 rounded-xl">
// // // //             <p className="text-slate-500 dark:text-slate-400">Your library is empty. Upload an EPUB book to get started!</p>
// // // //           </div>
// // // //         ) : (
// // // //           <>
// // // //             {/* Recently Read Section */}
// // // //             <RecentlyRead books={recentBooks} />
            
// // // //             {/* All Books Section */}
// // // //             <BookGrid books={sortedBooks} />
// // // //           </>
// // // //         )}
// // // //       </main>
// // // //     </div>
// // // //   );
// // // // };

// // // // export default Library;



// // // // src/components/Library/index.tsx
// // // import React, { useRef, useState } from 'react';
// // // import { useBook } from '../../context/BookContext';
// // // import BookGrid from './BookGrid';
// // // import RecentlyRead from './RecentlyRead';
// // // import './Library.css';

// // // const Library: React.FC = () => {
// // //   const { books, addBook, isLoading } = useBook();
// // //   const fileInputRef = useRef<HTMLInputElement>(null);
// // //   const [dragActive, setDragActive] = useState<boolean>(false);
  
// // //   const handleUploadClick = () => {
// // //     if (fileInputRef.current) {
// // //       fileInputRef.current.click();
// // //     }
// // //   };
  
// // //   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
// // //     if (e.target.files && e.target.files.length > 0) {
// // //       try {
// // //         await addBook(e.target.files[0]);
// // //         e.target.value = ''; // Reset the input
// // //       } catch (error) {
// // //         alert(error instanceof Error ? error.message : 'Error uploading book');
// // //       }
// // //     }
// // //   };

// // //   const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
// // //     e.preventDefault();
// // //     e.stopPropagation();
    
// // //     if (e.type === 'dragenter' || e.type === 'dragover') {
// // //       setDragActive(true);
// // //     } else if (e.type === 'dragleave') {
// // //       setDragActive(false);
// // //     }
// // //   };

// // //   const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
// // //     e.preventDefault();
// // //     e.stopPropagation();
// // //     setDragActive(false);
    
// // //     if (e.dataTransfer.files && e.dataTransfer.files[0]) {
// // //       try {
// // //         await addBook(e.dataTransfer.files[0]);
// // //       } catch (error) {
// // //         alert(error instanceof Error ? error.message : 'Error uploading book');
// // //       }
// // //     }
// // //   };
  
// // //   // Get sorted books for recently read section
// // //   const sortedBooks = [...books].sort((a, b) => 
// // //     new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
// // //   );
  
// // //   // Get recently read books (top 3)
// // //   const recentBooks = sortedBooks.slice(0, 3);
  
// // //   return (
// // //     <div className="library min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
// // //       {/* Top Navigation */}
// // //       <header className="library-header bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
// // //         <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
// // //           <div className="flex items-center space-x-2">
// // //             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
// // //               <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
// // //             </svg>
// // //             <h1 className="text-xl font-semibold">My E-Book Library</h1>
// // //           </div>
// // //         </div>
// // //       </header>

// // //       <main className="max-w-6xl mx-auto px-4 py-8">
// // //         {/* Upload Area (Drag & Drop) with Upload Button */}
// // //         <div 
// // //           className={`mb-8 border-2 border-dashed rounded-xl p-8 text-center transition-colors
// // //             ${dragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-700'}`}
// // //           onDragEnter={handleDrag}
// // //           onDragOver={handleDrag}
// // //           onDragLeave={handleDrag}
// // //           onDrop={handleDrop}
// // //         >
// // //           <div className="flex flex-col items-center justify-center">
// // //             <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-400 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
// // //               <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
// // //             </svg>
            
// // //             <h3 className="text-lg font-medium mb-2">Add a new book to your library</h3>
// // //             <p className="text-slate-500 dark:text-slate-400 mb-4">Drag & drop your EPUB file here, or click the button below</p>
            
// // //             {/* Upload button now inside the drag area */}
// // //             <button 
// // //               className="upload-button px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors" 
// // //               onClick={handleUploadClick}
// // //             >
// // //               Upload Book
// // //             </button>
// // //             <input
// // //               ref={fileInputRef}
// // //               type="file"
// // //               accept=".epub"
// // //               onChange={handleFileChange}
// // //               style={{ display: 'none' }}
// // //             />
// // //           </div>
// // //         </div>

// // //         {/* Loading Indicator */}
// // //         {isLoading && (
// // //           <div className="loading fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
// // //             <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg flex flex-col items-center">
// // //               <div className="loading-spinner w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
// // //               <p className="text-slate-600 dark:text-slate-300">Loading book...</p>
// // //             </div>
// // //           </div>
// // //         )}

// // //         {/* Library Content */}
// // //         {books.length === 0 ? (
// // //           <div className="empty-library text-center py-16 bg-slate-100 dark:bg-slate-800 rounded-xl">
// // //             <p className="text-slate-500 dark:text-slate-400">Your library is empty. Upload an EPUB book to get started!</p>
// // //           </div>
// // //         ) : (
// // //           <>
// // //             {/* Recently Read Section */}
// // //             <RecentlyRead books={recentBooks} />
            
// // //             {/* All Books Section */}
// // //             <BookGrid books={sortedBooks} />
// // //           </>
// // //         )}
// // //       </main>
// // //     </div>
// // //   );
// // // };

// // // export default Library;

// // // src/components/Library/index.tsx
// // import React, { useRef, useState } from 'react';
// // import { useBook } from '../../context/BookContext';
// // import BookGrid from './BookGrid';
// // import RecentlyRead from './RecentlyRead';
// // import './Library.css';

// // const Library: React.FC = () => {
// //   const { books, addBook, isLoading } = useBook();
// //   const fileInputRef = useRef<HTMLInputElement>(null);
// //   const [dragActive, setDragActive] = useState<boolean>(false);
  
// //   const handleUploadClick = () => {
// //     if (fileInputRef.current) {
// //       fileInputRef.current.click();
// //     }
// //   };
  
// //   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
// //     if (e.target.files && e.target.files.length > 0) {
// //       try {
// //         await addBook(e.target.files[0]);
// //         e.target.value = ''; // Reset the input
// //       } catch (error) {
// //         alert(error instanceof Error ? error.message : 'Error uploading book');
// //       }
// //     }
// //   };

// //   const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
// //     e.preventDefault();
// //     e.stopPropagation();
    
// //     if (e.type === 'dragenter' || e.type === 'dragover') {
// //       setDragActive(true);
// //     } else if (e.type === 'dragleave') {
// //       setDragActive(false);
// //     }
// //   };

// //   const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
// //     e.preventDefault();
// //     e.stopPropagation();
// //     setDragActive(false);
    
// //     if (e.dataTransfer.files && e.dataTransfer.files[0]) {
// //       try {
// //         await addBook(e.dataTransfer.files[0]);
// //       } catch (error) {
// //         alert(error instanceof Error ? error.message : 'Error uploading book');
// //       }
// //     }
// //   };
  
// //   // Get sorted books for recently read section
// //   const sortedBooks = [...books].sort((a, b) => 
// //     new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
// //   );
  
// //   // Get recently read books (top 3)
// //   const recentBooks = sortedBooks.slice(0, 3);
  
// //   return (
// //     <div className="library min-h-screen bg-white text-gray-800">
// //       {/* Simple Elegant Header */}
// //       <header className="max-w-4xl mx-auto px-6 py-12">
// //         {/* <div className="max-w-4xl mx-auto px-6 text-center">
// //           <h1 className="text-2xl font-medium text-gray-800">YoRead</h1>
// //         </div> */}
// //                 <div className="text-center mb-8">
// //           <h2 className="text-xl font-medium text-gray-800 mb-2">Welcome to YoRead</h2>
// //           <p className="text-gray-600 max-w-lg mx-auto">
// //             Upload an ePub file to start reading with a focused, distraction-free experience
// //           </p>
// //         </div>
// //       </header>

// //       <main className="max-w-4xl mx-auto px-6 py-12">
// //         {/* Welcome Message */}
// //         {/* <div className="text-center mb-8">
// //           <h2 className="text-xl font-medium text-gray-800 mb-2">Welcome to YoRead</h2>
// //           <p className="text-gray-600 max-w-lg mx-auto">
// //             Upload an ePub file to start reading with a focused, distraction-free experience
// //           </p>
// //         </div> */}

// //         {/* Upload Area */}
// //         <div 
// //           className={`mb-12 border-2 border-dashed rounded-lg p-12 text-center transition-colors
// //             ${dragActive 
// //               ? 'border-amber-600 bg-amber-50' 
// //               : 'border-gray-300 hover:border-gray-400'}`}
// //           onDragEnter={handleDrag}
// //           onDragOver={handleDrag}
// //           onDragLeave={handleDrag}
// //           onDrop={handleDrop}
// //         >
// //           <div className="flex flex-col items-center justify-center">
// //             <div className="mb-6 text-amber-800">
// //               <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
// //                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
// //               </svg>
// //             </div>
            
// //             <h3 className="text-lg font-medium mb-2 text-gray-800">Upload your eBook</h3>
// //             <p className="text-gray-600 mb-6">
// //               Drag and drop your ePub file here, or click to browse
// //             </p>
            
// //             {/* Browse Files Button */}
// //             <button 
// //               className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded transition-colors font-medium flex items-center" 
// //               onClick={handleUploadClick}
// //             >
// //               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
// //                 <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
// //               </svg>
// //               Browse files
// //             </button>
// //             <input
// //               ref={fileInputRef}
// //               type="file"
// //               accept=".epub"
// //               onChange={handleFileChange}
// //               style={{ display: 'none' }}
// //             />
// //           </div>
// //         </div>

// //         {/* Supports ePub note */}
// //         <div className="text-center text-gray-500 text-sm mb-16">
// //           Supports .epub files
// //         </div>

// //         {/* eBook Resource Links */}
// //         <div className="mb-16 text-center">
// //           <p className="text-gray-600 mb-2">Find free eBooks:</p>
// //           <div className="flex items-center justify-center space-x-6">
// //             <a 
// //               href="https://www.gutenberg.org" 
// //               target="_blank" 
// //               rel="noopener noreferrer" 
// //               className="text-amber-800 hover:underline"
// //             >
// //               Project Gutenberg
// //             </a>
// //             <a 
// //               href="https://www.planetebook.com" 
// //               target="_blank" 
// //               rel="noopener noreferrer" 
// //               className="text-amber-800 hover:underline"
// //             >
// //               Planet eBook
// //             </a>
// //           </div>
// //         </div>

// //         {/* Loading Indicator */}
// //         {isLoading && (
// //           <div className="loading fixed inset-0 bg-white/90 flex items-center justify-center z-50">
// //             <div className="p-6 flex flex-col items-center">
// //               <div className="loading-spinner w-12 h-12 border-4 border-gray-200 border-t-amber-800 rounded-full animate-spin mb-4"></div>
// //               <p className="text-gray-700">Loading your book...</p>
// //             </div>
// //           </div>
// //         )}

// //         {/* Book Grid - Only show if we have books */}
// //         {books.length > 0 && (
// //           <>
// //             <div className="border-t border-gray-200 pt-8 mt-8">
// //               <h2 className="text-xl font-medium text-gray-800 mb-6">Your Library</h2>
              
// //               {/* Recently Read Section */}
// //               <RecentlyRead books={recentBooks} />
              
// //               {/* All Books Section */}
// //               <BookGrid books={sortedBooks} />
// //             </div>
// //           </>
// //         )}
// //       </main>

// //       {/* Simple Footer */}
// //       <footer className="py-6 border-t border-gray-200 mt-12">
// //         <div className="max-w-4xl mx-auto px-6 text-center text-gray-500 text-sm">
// //           YoRead - A focused eBook reading experience
// //         </div>
// //       </footer>
// //     </div>
// //   );
// // };

// // export default Library;



// // src/components/Library/index.tsx
// import React, { useRef, useState } from 'react';
// import { useBook } from '../../context/BookContext';
// import BookGrid from './BookGrid';
// import RecentlyRead from './RecentlyRead';
// import './Library.css';

// const Library: React.FC = () => {
//   const { books, addBook, isLoading } = useBook();
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const [dragActive, setDragActive] = useState<boolean>(false);
  
//   const handleUploadClick = () => {
//     if (fileInputRef.current) {
//       fileInputRef.current.click();
//     }
//   };
  
//   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files && e.target.files.length > 0) {
//       try {
//         await addBook(e.target.files[0]);
//         e.target.value = ''; // Reset the input
//       } catch (error) {
//         alert(error instanceof Error ? error.message : 'Error uploading book');
//       }
//     }
//   };

//   const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
//     e.preventDefault();
//     e.stopPropagation();
    
//     if (e.type === 'dragenter' || e.type === 'dragover') {
//       setDragActive(true);
//     } else if (e.type === 'dragleave') {
//       setDragActive(false);
//     }
//   };

//   const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setDragActive(false);
    
//     if (e.dataTransfer.files && e.dataTransfer.files[0]) {
//       try {
//         await addBook(e.dataTransfer.files[0]);
//       } catch (error) {
//         alert(error instanceof Error ? error.message : 'Error uploading book');
//       }
//     }
//   };
  
//   // Get sorted books for recently read section
//   const sortedBooks = [...books].sort((a, b) => 
//     new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
//   );
  
//   // Get recently read books (top 3)
//   const recentBooks = sortedBooks.slice(0, 3);
  
//   return (
//     <div className="library min-h-screen bg-white text-gray-800">
//       {/* Simple Elegant Header */}
//       <header className="library-header border-b border-gray-200 py-3">
//         <div className="max-w-4xl mx-auto px-4 text-center">
//           <h1 className="text-2xl font-medium text-gray-800">AI Reader for Your Books</h1>
//         </div>
//       </header>

//       <main className="max-w-4xl mx-auto px-4 py-6">
//         {/* Welcome Message - only show if no books */}
//         {books.length === 0 && (
//           <div className="text-center mb-4">
//             <h2 className="text-xl font-medium text-gray-800 mb-1">Welcome to YoRead</h2>
//             <p className="text-gray-600 max-w-lg mx-auto">
//               Upload an ePub file to start reading with a focused, distraction-free experience
//             </p>
//           </div>
//         )}

//         {/* Upload Area - reduced padding */}
//         <div 
//           className={`mb-5 border-2 border-dashed rounded-lg p-6 text-center transition-colors
//             ${dragActive 
//               ? 'border-amber-600 bg-amber-50' 
//               : 'border-gray-300 hover:border-gray-400'}`}
//           onDragEnter={handleDrag}
//           onDragOver={handleDrag}
//           onDragLeave={handleDrag}
//           onDrop={handleDrop}
//         >
//           <div className="flex flex-col items-center justify-center">
//             <div className="mb-3 text-amber-800">
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
//               </svg>
//             </div>
            
//             <h3 className="text-lg font-medium mb-1.5 text-gray-800">Upload your eBook</h3>
//             <p className="text-gray-600 mb-3">
//               Drag and drop your ePub file here, or click to browse
//             </p>
            
//             {/* Browse Files Button */}
//             <button 
//               className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded transition-colors font-medium flex items-center" 
//               onClick={handleUploadClick}
//             >
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                 <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
//               </svg>
//               Browse files
//             </button>
//             <input
//               ref={fileInputRef}
//               type="file"
//               accept=".epub"
//               onChange={handleFileChange}
//               style={{ display: 'none' }}
//             />
//           </div>
//         </div>

//         {/* Supports ePub note - reduced margin */}
//         <div className="text-center text-gray-500 text-sm mb-4">
//           Supports .epub files
//         </div>

//         {/* eBook Resource Links - reduced margin */}
//         <div className="mb-5 text-center">
//           <p className="text-gray-600 mb-1.5">Find free eBooks:</p>
//           <div className="flex items-center justify-center space-x-6">
//             <a 
//               href="https://www.gutenberg.org" 
//               target="_blank" 
//               rel="noopener noreferrer" 
//               className="text-amber-800 hover:underline"
//             >
//               Project Gutenberg
//             </a>
//             <a 
//               href="https://www.planetebook.com" 
//               target="_blank" 
//               rel="noopener noreferrer" 
//               className="text-amber-800 hover:underline"
//             >
//               Planet eBook
//             </a>
//           </div>
//         </div>

//         {/* Loading Indicator */}
//         {isLoading && (
//           <div className="loading fixed inset-0 bg-white/90 flex items-center justify-center z-50">
//             <div className="p-6 flex flex-col items-center">
//               <div className="loading-spinner w-12 h-12 border-4 border-gray-200 border-t-amber-800 rounded-full animate-spin mb-4"></div>
//               <p className="text-gray-700">Loading your book...</p>
//             </div>
//           </div>
//         )}

//         {/* Book Grid - Only show if we have books - reduced spacing */}
//         {books.length > 0 && (
//           <>
//             <div className={`${books.length > 0 ? 'border-t border-gray-200 pt-5 mt-5' : ''}`}>
//               {/* Recently Read Section */}
//               <RecentlyRead books={recentBooks} />
              
//               {/* All Books Section */}
//               <BookGrid books={sortedBooks} />
//             </div>
//           </>
//         )}
//       </main>

//       {/* Simple Footer - reduced padding */}
//       <footer className="py-4 border-t border-gray-200 mt-6">
//         <div className="max-w-4xl mx-auto px-4 text-center text-gray-500 text-sm">
//           YoRead - A focused eBook reading experience
//         </div>
//       </footer>
//     </div>
//   );
// };

// export default Library;



// src/components/Library/index.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useBook } from '../../context/BookContext';
import BookGrid from './BookGrid';
import RecentlyRead from './RecentlyRead';
import './Library.css';

const Library: React.FC = () => {
  const { books, addBook, isLoading } = useBook();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  // Toast notification states
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        const fileName = e.target.files[0].name;
        await addBook(e.target.files[0]);
        e.target.value = ''; // Reset the input
        
        // Show success toast
        setToastMessage(`"${fileName}" has been added to your library`);
        setToastType('success');
        setShowToast(true);
      } catch (error) {
        // Show error toast
        setToastMessage(error instanceof Error ? error.message : 'Error uploading book');
        setToastType('error');
        setShowToast(true);
      }
    }
  };

  // Hide toast after 3 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      try {
        const fileName = e.dataTransfer.files[0].name;
        await addBook(e.dataTransfer.files[0]);
        
        // Show success toast
        setToastMessage(`"${fileName}" has been added to your library`);
        setToastType('success');
        setShowToast(true);
      } catch (error) {
        // Show error toast
        setToastMessage(error instanceof Error ? error.message : 'Error uploading book');
        setToastType('error');
        setShowToast(true);
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
    <div className="library min-h-screen bg-white text-gray-800">
      {/* Simple Elegant Header */}
      <header className="library-header border-b border-gray-200 py-3">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-medium text-gray-800">YoRead: Your AI Book Reader</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Toast Notification */}
        {showToast && (
          <div className={`toast fixed top-4 right-4 z-50 rounded-md shadow-md px-4 py-3 flex items-center ${
            toastType === 'success' ? 'bg-amber-100 text-amber-800 border-l-4 border-amber-500' : 
                                     'bg-red-100 text-red-800 border-l-4 border-red-500'
          }`}>
            <div className="flex-shrink-0 mr-3">
              {toastType === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div>{toastMessage}</div>
            <button 
              className="ml-auto text-gray-500 hover:text-gray-900"
              onClick={() => setShowToast(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Welcome Message - only show if no books */}
        {books.length === 0 && (
          <div className="text-center mb-4">
            <h2 className="text-xl font-medium text-gray-800 mb-1">Welcome to YoRead</h2>
            <p className="text-gray-600 max-w-lg mx-auto">
              Upload an ePub file to start reading with a focused, distraction-free experience
            </p>
          </div>
        )}

        {/* Upload Area - reduced padding */}
        <div 
          className={`mb-5 border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${dragActive 
              ? 'border-amber-600 bg-amber-50' 
              : 'border-gray-300 hover:border-gray-400'}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center">
            <div className="mb-3 text-amber-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            
            <h3 className="text-lg font-medium mb-1.5 text-gray-800">Upload your eBook</h3>
            <p className="text-gray-600 mb-3">
              Drag and drop your ePub file here, or click to browse
            </p>
            
            {/* Browse Files Button */}
            <button 
              className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded transition-colors font-medium flex items-center" 
              onClick={handleUploadClick}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Browse files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".epub"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Supports ePub note - reduced margin */}
        <div className="text-center text-gray-500 text-sm mb-4">
          Supports .epub files
        </div>

        {/* eBook Resource Links - reduced margin */}
        <div className="mb-5 text-center">
          <p className="text-gray-600 mb-1.5">Find free eBooks:</p>
          <div className="flex items-center justify-center space-x-6">
            <a 
              href="https://www.gutenberg.org" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-amber-800 hover:underline"
            >
              Project Gutenberg
            </a>
            <a 
              href="https://www.planetebook.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-amber-800 hover:underline"
            >
              Planet eBook
            </a>
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="loading fixed inset-0 bg-white/90 flex items-center justify-center z-50">
            <div className="p-6 flex flex-col items-center">
              <div className="loading-spinner w-12 h-12 border-4 border-gray-200 border-t-amber-800 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-700">Loading your book...</p>
            </div>
          </div>
        )}

        {/* Book Grid - Only show if we have books - reduced spacing */}
        {books.length > 0 && (
          <>
            <div className={`${books.length > 0 ? 'border-t border-gray-200 pt-5 mt-5' : ''}`}>
              {/* Recently Read Section */}
              <RecentlyRead books={recentBooks} />
              
              {/* All Books Section */}
              <BookGrid books={sortedBooks} />
            </div>
          </>
        )}
      </main>

      {/* Simple Footer - reduced padding */}
      <footer className="py-4 border-t border-gray-200 mt-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-gray-500 text-sm">
          YoRead - A focused eBook reading experience
        </div>
      </footer>
    </div>
  );
};

export default Library;