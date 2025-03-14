// import React, { useState, useEffect } from 'react';
// import { KokoroTTS } from 'kokoro-js';

// function App() {
//   const [text, setText] = useState('Life is like a box of chocolates. You never know what you\'re gonna get.');
//   const [selectedVoice, setSelectedVoice] = useState('af_heart');
//   const [isLoading, setIsLoading] = useState(true);
//   const [isGenerating, setIsGenerating] = useState(false);
//   const [tts, setTTS] = useState(null);
//   const [error, setError] = useState(null);
//   const [voices, setVoices] = useState([]);
//   const [audioResults, setAudioResults] = useState([]);

//   // Load the model directly
//   useEffect(() => {
//     async function loadModel() {
//       try {
//         console.log("Loading Kokoro model...");
//         const model = await KokoroTTS.from_pretrained(
//           "onnx-community/Kokoro-82M-ONNX",
//           { dtype: "q8" }
//         );
        
//         console.log("Model loaded successfully");
//         setTTS(model);
        
//         // Get available voices
//         try {
//           console.log("Getting available voices...");
//           const availableVoices = model.list_voices();
//           console.log("Available voices:", availableVoices);
          
//           if (availableVoices && availableVoices.length > 0) {
//             setVoices(availableVoices);
//           } else {
//             console.warn("No voices returned from list_voices(), using fallback list");
//             setVoices(['af_heart', 'af_bella', 'af_sky', 'af_nicole', 'am_michael', 'bf_emma']);
//           }
//         } catch (voiceError) {
//           console.warn("Could not get voices:", voiceError);
//           // Fallback voices
//           setVoices(['af_heart', 'af_bella', 'af_sky', 'af_nicole', 'am_michael', 'bf_emma']);
//         }
        
//       } catch (err) {
//         console.error("Error loading model:", err);
//         setError(`Error loading model: ${err.message || String(err)}`);
//       } finally {
//         setIsLoading(false);
//       }
//     }
    
//     loadModel();
//   }, []);

//   // Handle text-to-speech generation
//   const handleGenerate = async () => {
//     if (!tts || !text.trim() || isGenerating) return;
    
//     setIsGenerating(true);
//     try {
//       console.log(`Generating speech for: "${text}" with voice: ${selectedVoice}`);
      
//       const audio = await tts.generate(text, { voice: selectedVoice });
//       console.log("Audio generated:", audio);
      
//       // Convert to a playable format
//       const blob = audio.toBlob();
//       const url = URL.createObjectURL(blob);
      
//       // Add to results
//       setAudioResults(prev => [{ text, url, timestamp: new Date() }, ...prev]);
      
//     } catch (err) {
//       console.error("Error generating speech:", err);
//       setError(`Error generating speech: ${err.message || String(err)}`);
//     } finally {
//       setIsGenerating(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
//       <div className="max-w-2xl mx-auto">
//         <div className="bg-white rounded-xl shadow-lg p-8">
//           <h1 className="text-3xl font-bold text-gray-800 mb-6">Kokoro Text to Speech</h1>
          
//           {isLoading ? (
//             <div className="flex items-center justify-center p-12">
//               <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
//               <span className="ml-3 text-gray-600">Loading TTS model...</span>
//             </div>
//           ) : (
//             <>
//               {error && (
//                 <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
//                   {error}
//                 </div>
//               )}
              
//               <div className="mb-6">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Select Voice
//                 </label>
//                 <select
//                   value={selectedVoice}
//                   onChange={(e) => setSelectedVoice(e.target.value)}
//                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
//                 >
//                   {voices.map((voice) => (
//                     <option key={voice} value={voice}>
//                       {voice}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div className="mb-6">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Enter Text
//                 </label>
//                 <textarea
//                   value={text}
//                   onChange={(e) => setText(e.target.value)}
//                   placeholder="Type something to hear it spoken..."
//                   className="w-full h-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
//                 />
//               </div>

//               <button
//                 onClick={handleGenerate}
//                 disabled={!tts || isGenerating || !text.trim()}
//                 className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition
//                   ${!tts || isGenerating || !text.trim() 
//                     ? 'bg-gray-400 cursor-not-allowed' 
//                     : 'bg-purple-600 hover:bg-purple-700'}`}
//               >
//                 {isGenerating ? (
//                   <>
//                     <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
//                     Generating...
//                   </>
//                 ) : (
//                   <>
//                     Generate
//                   </>
//                 )}
//               </button>
              
//               {audioResults.length > 0 && (
//                 <div className="mt-8">
//                   <h2 className="text-xl font-bold text-gray-800 mb-4">Generated Audio</h2>
//                   <div className="space-y-4 max-h-[300px] overflow-y-auto">
//                     {audioResults.map((result, index) => (
//                       <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
//                         <p className="text-gray-700 mb-2">{result.text}</p>
//                         <audio 
//                           controls 
//                           src={result.url} 
//                           className="w-full"
//                           onEnded={() => URL.revokeObjectURL(result.url)}
//                         >
//                           Your browser does not support audio playback.
//                         </audio>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// // // // // // // // // // // export default App;
// // // // // // // // // import React from 'react'
// // // // // // // // // import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
// // // // // // // // // import RootLayout from '../src/layouts/RootLayout'
// // // // // // // // // import EnhancedEbookReader from '../src/pages/EnhancedEbookReader'

// // // // // // // // // function App() {
// // // // // // // // //   return (
// // // // // // // // //     <Router>
// // // // // // // // //       <RootLayout>
// // // // // // // // //         <Routes>
// // // // // // // // //           <Route path="/" element={<EnhancedEbookReader />} />
// // // // // // // // //         </Routes>
// // // // // // // // //       </RootLayout>
// // // // // // // // //     </Router>
// // // // // // // // //   )
// // // // // // // // // }

// // // // // // // // // export default App

// // // // // // // // // import React from 'react'
// // // // // // // // // import { Button } from "./components/ui/button"

// // // // // // // // // function App() {
// // // // // // // // //   return (
// // // // // // // // //     <div className="p-8">
// // // // // // // // //       <h1 className="text-2xl font-bold mb-4">Test Page</h1>
// // // // // // // // //       <Button>Test Button</Button>
// // // // // // // // //     </div>
// // // // // // // // //   )
// // // // // // // // // }

// // // // // // // // // export default App



// // // // // // App.tsx
// // // // // import React, { useState, useRef, useCallback, useEffect } from "react"
// // // // // import { BrowserRouter as Router } from "react-router-dom"
// // // // // import { ReactReader } from "react-reader"
// // // // // import { Button } from "./components/ui/button"
// // // // // import { Input } from "./components/ui/input"
// // // // // import axios from "axios"
// // // // // import localforage from "localforage"

// // // // // function App() {
// // // // //   const [book, setBook] = useState<ArrayBuffer | null>(null)
// // // // //   const [location, setLocation] = useState<string | null>(null)
// // // // //   const [currentPageContent, setCurrentPageContent] = useState<string>("")
// // // // //   const renditionRef = useRef<any>(null)
// // // // //   const containerRef = useRef<HTMLDivElement>(null)
// // // // //   const extractedTextsRef = useRef<string[]>([])
// // // // //   const [bookName, setBookName] = useState<string>("")
// // // // //   const [theme, setTheme] = useState<string>("light")

// // // // //   // Global patch for window.fetch to fix duplicated paths
// // // // //   useEffect(() => {
// // // // //     const originalFetch = window.fetch;
// // // // //     window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
// // // // //       let requestInput: RequestInfo;
// // // // //       if (input instanceof URL) {
// // // // //         requestInput = input.toString();
// // // // //       } else {
// // // // //         requestInput = input;
// // // // //       }
// // // // //       if (typeof requestInput === "string" && requestInput.includes("/OEBPS/OEBPS/")) {
// // // // //         requestInput = requestInput.replace("/OEBPS/OEBPS/", "/OEBPS/");
// // // // //         console.log("Global fetch fixed URL:", requestInput);
// // // // //       }
// // // // //       return originalFetch(requestInput, init);
// // // // //     }) as typeof window.fetch;
// // // // //     return () => {
// // // // //       window.fetch = originalFetch;
// // // // //     };
// // // // //   }, []);
  
// // // // //   // Load saved EPUB from storage on mount
// // // // //   useEffect(() => {
// // // // //     localforage.getItem("currentEpub").then((storedBook) => {
// // // // //       if (storedBook) {
// // // // //         setBook(storedBook as ArrayBuffer);
// // // // //       }
// // // // //     });
// // // // //   }, []);

// // // // //   useEffect(() => {
// // // // //     const savedLocation = localStorage.getItem("currentEpubLocation");
// // // // //     if (savedLocation) {
// // // // //       setLocation(savedLocation);
// // // // //     }
// // // // //   }, []);

// // // // //   // Update iframe sandbox attribute
// // // // //   useEffect(() => {
// // // // //     if (!containerRef.current) return;
// // // // //     const intervalId = setInterval(() => {
// // // // //       const iframe = containerRef.current?.querySelector("iframe");
// // // // //       if (iframe) {
// // // // //         iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
// // // // //         console.log("Iframe sandbox updated to:", iframe.getAttribute("sandbox"));
// // // // //         clearInterval(intervalId);
// // // // //       } else {
// // // // //         console.warn("Iframe not found inside containerRef.");
// // // // //       }
// // // // //     }, 500);
// // // // //     return () => clearInterval(intervalId);
// // // // //   }, [book, location]);

// // // // //   const isOnCover = () => {
// // // // //     if (!renditionRef.current || !renditionRef.current.book || !renditionRef.current.location) return false;
// // // // //     const spineItems = renditionRef.current.book.spine.spineItems;
// // // // //     if (!spineItems || spineItems.length === 0) return false;
// // // // //     return spineItems[0].linear === "no";
// // // // //   };

// // // // //   const goToChapterOne = () => {
// // // // //     if (!renditionRef.current || !renditionRef.current.book) return;
// // // // //     const spineItems = renditionRef.current.book.spine.spineItems;
// // // // //     const chapterOne = spineItems.find((item: any) => item.linear === "yes");
// // // // //     if (chapterOne) {
// // // // //       renditionRef.current.display(chapterOne.href);
// // // // //     }
// // // // //   };

// // // // //   const saveEpub = async (epubData: ArrayBuffer): Promise<void> => {
// // // // //     await localforage.setItem('currentEpub', epubData);
// // // // //   }

// // // // //   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
// // // // //     const file = event.target.files?.[0];
// // // // //     if (file) {
// // // // //       const reader = new FileReader();
// // // // //       reader.onload = (e: ProgressEvent<FileReader>) => {
// // // // //         const result = e.target?.result;
// // // // //         if (result) {
// // // // //           setBook(result as ArrayBuffer);
// // // // //           // Save the book persistently
// // // // //           saveEpub(result as ArrayBuffer);
// // // // //         }
// // // // //       };
// // // // //       reader.readAsArrayBuffer(file);
// // // // //     }
// // // // //   };

// // // // //   const extractText = () => {
// // // // //     if (!renditionRef.current || !renditionRef.current.location) return;
// // // // //     const { start } = renditionRef.current.location;
// // // // //     if (start?.cfi) {
// // // // //       setTimeout(() => {
// // // // //         renditionRef.current.book
// // // // //           .getRange(start.cfi)
// // // // //           .then((range: Range | null) => {
// // // // //             if (range) {
// // // // //               const text = range.toString();
// // // // //               console.log("Extracted Text:", text);
// // // // //               extractedTextsRef.current.push(text);
// // // // //               console.log("All Extracted Texts:", extractedTextsRef.current);
// // // // //               setCurrentPageContent(prev => prev || text);
// // // // //             } else {
// // // // //               setCurrentPageContent(prev => prev || "Text extraction failed.");
// // // // //             }
// // // // //           })
// // // // //           .catch((error: unknown) => {
// // // // //             console.error("Error getting range:", error);
// // // // //             setCurrentPageContent(prev => prev || "Error extracting text.");
// // // // //           });
// // // // //       }, 700);
// // // // //     }
// // // // //   };

// // // // //   const getRendition = useCallback((rendition: any) => {
// // // // //     renditionRef.current = rendition;
  
// // // // //     if (rendition.book && typeof rendition.book.request === "function") {
// // // // //       const originalRequest = rendition.book.request.bind(rendition.book);
// // // // //       rendition.book.request = (url: string, options: any) => {
// // // // //         if (url.includes("/OEBPS/OEBPS/")) {
// // // // //           url = url.replace("/OEBPS/OEBPS/", "/OEBPS/");
// // // // //           console.log("Fixed URL:", url);
// // // // //         }
// // // // //         return originalRequest(url, options);
// // // // //       };
// // // // //     }
  
// // // // //     // Extract the book metadata
// // // // //     rendition.book.ready.then(() => {
// // // // //       const metadata = rendition.book.package.metadata;
// // // // //       if (metadata && metadata.title) {
// // // // //         console.log("Book title extracted:", metadata.title);
// // // // //         setBookName(metadata.title);
// // // // //       }
// // // // //     });
    
// // // // //     rendition.hooks.content.register((contents: any) => {
// // // // //       const styleEl = contents.document.createElement("style");
// // // // //       if (theme === "dark") {
// // // // //         styleEl.innerHTML = `
// // // // //             body {
// // // // //               background-color: #2c2c2c !important;
// // // // //               color: #dcdcdc !important;
// // // // //             }
// // // // //             a {
// // // // //               color: #82aaff !important;
// // // // //             }
// // // // //           `;
// // // // //       } else {
// // // // //         styleEl.innerHTML = `
// // // // //             body {
// // // // //               background-color: #ffffff !important;
// // // // //               color: #000000 !important;
// // // // //             }
// // // // //             a {
// // // // //               color: #0070f3 !important;
// // // // //             }
// // // // //           `;
// // // // //       }
// // // // //       contents.document.head.appendChild(styleEl);
  
// // // // //       setTimeout(() => {
// // // // //         const extractedText = contents.document.body.innerText.trim();
// // // // //         setCurrentPageContent(extractedText || "No text found on this page.");
// // // // //       }, 500);
// // // // //     });
  
// // // // //     rendition.on("locationChanged", locationChanged);
  
// // // // //     setTimeout(() => {
// // // // //       if (isOnCover()) {
// // // // //         goToChapterOne();
// // // // //       }
// // // // //     }, 1000);
// // // // //   }, [theme]);

// // // // //   const locationChanged = (epubcifi: any) => {
// // // // //     let newLocation: string | null = null;
// // // // //     if (typeof epubcifi === "string") {
// // // // //       newLocation = epubcifi;
// // // // //     } else if (epubcifi && epubcifi.href) {
// // // // //       newLocation = epubcifi.href;
// // // // //     } else {
// // // // //       console.warn("Unexpected location format:", epubcifi);
// // // // //     }
// // // // //     if (newLocation) {
// // // // //       if (newLocation !== (location as string)) {
// // // // //         setLocation(newLocation);
// // // // //         extractText();
// // // // //         localStorage.setItem("currentEpubLocation", newLocation);
// // // // //       } else {
// // // // //         extractText();
// // // // //       }
// // // // //     }
// // // // //   };

// // // // //   useEffect(() => {
// // // // //     const handleKeyDown = (e: KeyboardEvent) => {
// // // // //       if (!renditionRef.current) return;
// // // // //       if (e.key === "ArrowRight") {
// // // // //         renditionRef.current.next();
// // // // //       } else if (e.key === "ArrowLeft") {
// // // // //         renditionRef.current.prev();
// // // // //       }
// // // // //     };
// // // // //     window.addEventListener("keydown", handleKeyDown);
// // // // //     return () => window.removeEventListener("keydown", handleKeyDown);
// // // // //   }, []);

// // // // //   return (
// // // // //     <Router>
// // // // //       <div className="w-full p-4">
// // // // //         <h1 className="text-2xl font-bold mb-4">Simple EPUB Reader</h1>
// // // // //         <Input 
// // // // //           type="file" 
// // // // //           accept=".epub" 
// // // // //           onChange={handleFileUpload} 
// // // // //           className="mb-4"
// // // // //         />
// // // // //         {book ? (
// // // // //           <div 
// // // // //             ref={containerRef} 
// // // // //             className="relative mb-4 h-[80vh] border border-gray-300 dark:border-gray-700 rounded shadow overflow-hidden bg-white dark:bg-gray-900 w-full"
// // // // //           >
// // // // //             <ReactReader 
// // // // //               url={book} 
// // // // //               location={location} 
// // // // //               getRendition={getRendition} 
// // // // //               locationChanged={locationChanged}
// // // // //             />
// // // // //           </div>
// // // // //         ) : (
// // // // //           <p className="mb-4 text-center text-gray-600 dark:text-gray-300">
// // // // //             Please upload an EPUB file to get started.
// // // // //           </p>
// // // // //         )}
// // // // //         <div className="mb-4">
// // // // //           <p>Current page content preview:</p>
// // // // //           <div className="mt-2 p-3 border rounded bg-gray-50 dark:bg-gray-800">
// // // // //             {currentPageContent 
// // // // //               ? currentPageContent.substring(0, 150) + (currentPageContent.length > 150 ? '...' : '')
// // // // //               : 'No content extracted yet.'}
// // // // //           </div>
// // // // //         </div>
// // // // //         <div>
// // // // //           <Button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
// // // // //             Toggle Theme ({theme})
// // // // //           </Button>
// // // // //         </div>
// // // // //       </div>
// // // // //     </Router>
// // // // //   );
// // // // // }

// // // // // export default App


// // // // // import React, { useState, useEffect } from 'react';
// // // // // import ePub from 'epubjs';
// // // // // import { Book, Rendition } from 'epubjs/types/index';
// // // // // import './App.css';

// // // // // interface BookData {
// // // // //   id: string;
// // // // //   title: string;
// // // // //   author: string;
// // // // //   coverUrl: string;
// // // // //   progress: number;
// // // // //   file: File;
// // // // //   lastRead: Date;
// // // // // }

// // // // // function App() {
// // // // //   // State management
// // // // //   const [books, setBooks] = useState<BookData[]>(() => {
// // // // //     const savedBooks = localStorage.getItem('ebooks');
// // // // //     return savedBooks ? JSON.parse(savedBooks) : [];
// // // // //   });
// // // // //   const [currentBook, setCurrentBook] = useState<Book | null>(null);
// // // // //   const [rendition, setRendition] = useState<Rendition | null>(null);
// // // // //   const [currentCfi, setCurrentCfi] = useState<string>('');
// // // // //   const [isReading, setIsReading] = useState<boolean>(false);
// // // // //   const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
// // // // //   const [currentPage, setCurrentPage] = useState<number>(0);
// // // // //   const [totalPages, setTotalPages] = useState<number>(0);
// // // // //   const [bookTitle, setBookTitle] = useState<string>('');
// // // // //   const [searchResults, setSearchResults] = useState<any[]>([]);
// // // // //   const [searchQuery, setSearchQuery] = useState<string>('');

// // // // //   // Save books to localStorage whenever the books state changes
// // // // //   useEffect(() => {
// // // // //     localStorage.setItem('ebooks', JSON.stringify(books));
// // // // //   }, [books]);

// // // // //   // Handle file upload
// // // // //   const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
// // // // //     const files = event.target.files;
// // // // //     if (!files || files.length === 0) return;

// // // // //     const file = files[0];
// // // // //     const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
// // // // //     if (fileExtension !== 'epub') {
// // // // //       alert('Please upload an EPUB file');
// // // // //       return;
// // // // //     }

// // // // //     try {
// // // // //       // Create a new Book object
// // // // //       const book = ePub(URL.createObjectURL(file));
      
// // // // //       // Load book metadata
// // // // //       const metadata = await book.loaded.metadata;
// // // // //       const coverUrl = await book.coverUrl();
      
// // // // //       // Generate a unique ID
// // // // //       const id = Date.now().toString();
      
// // // // //       // Create new book data
// // // // //       const newBook: BookData = {
// // // // //         id,
// // // // //         title: metadata.title || 'Unknown Title',
// // // // //         author: metadata.creator || 'Unknown Author',
// // // // //         coverUrl: coverUrl || '',
// // // // //         progress: 0,
// // // // //         file,
// // // // //         lastRead: new Date()
// // // // //       };
      
// // // // //       // Add the new book to the books array
// // // // //       setBooks(prevBooks => [...prevBooks, newBook]);
      
// // // // //       // Reset file input
// // // // //       event.target.value = '';
      
// // // // //       alert(`"${newBook.title}" has been added to your library!`);
// // // // //     } catch (error) {
// // // // //       console.error('Error loading book:', error);
// // // // //       alert('Error loading the book. Please try again.');
// // // // //     }
// // // // //   };

// // // // //   // Open a book
// // // // //   const openBook = async (bookData: BookData) => {
// // // // //     try {
// // // // //       // Create a FileReader
// // // // //       const reader = new FileReader();
// // // // //       reader.onload = async (e) => {
// // // // //         try {
// // // // //           // Create a new Book object
// // // // //           const book = ePub(e.target?.result);
          
// // // // //           // Set the current book
// // // // //           setCurrentBook(book);
          
// // // // //           // Create a rendition
// // // // //           const bookRendition = book.renderTo('viewer', {
// // // // //             width: '100%',
// // // // //             height: '100%',
// // // // //             spread: 'none'
// // // // //           });
          
// // // // //           // Set the rendition
// // // // //           setRendition(bookRendition);
          
// // // // //           // Display the content
// // // // //           if (bookData.progress) {
// // // // //             // Resume from the last reading position
// // // // //             bookRendition.display(bookData.progress);
// // // // //           } else {
// // // // //             // Start from the beginning
// // // // //             bookRendition.display();
// // // // //           }
          
// // // // //           // Update book title
// // // // //           setBookTitle(bookData.title);
          
// // // // //           // Calculate total pages
// // // // //           const totalPgs = await book.locations.generate(1024);
// // // // //           setTotalPages(totalPgs);
          
// // // // //           // Update last read date
// // // // //           updateLastReadDate(bookData.id);
          
// // // // //           // Switch to reading view
// // // // //           setIsReading(true);
// // // // //         } catch (error) {
// // // // //           console.error('Error rendering book:', error);
// // // // //           alert('Error rendering the book. Please try again.');
// // // // //         }
// // // // //       };
      
// // // // //       // Read the file
// // // // //       reader.readAsArrayBuffer(bookData.file);
// // // // //     } catch (error) {
// // // // //       console.error('Error opening book:', error);
// // // // //       alert('Error opening the book. Please try again.');
// // // // //     }
// // // // //   };

// // // // //   // Update the last read date for a book
// // // // //   const updateLastReadDate = (bookId: string) => {
// // // // //     setBooks(prevBooks => 
// // // // //       prevBooks.map(book => 
// // // // //         book.id === bookId 
// // // // //           ? { ...book, lastRead: new Date() } 
// // // // //           : book
// // // // //       )
// // // // //     );
// // // // //   };

// // // // //   // Save reading progress
// // // // //   const saveProgress = (cfi: string, bookId: string) => {
// // // // //     setBooks(prevBooks => 
// // // // //       prevBooks.map(book => 
// // // // //         book.id === bookId 
// // // // //           ? { ...book, progress: cfi } 
// // // // //           : book
// // // // //       )
// // // // //     );
// // // // //   };

// // // // //   // Navigate to the next page
// // // // //   const nextPage = () => {
// // // // //     if (rendition) {
// // // // //       rendition.next();
// // // // //     }
// // // // //   };

// // // // //   // Navigate to the previous page
// // // // //   const prevPage = () => {
// // // // //     if (rendition) {
// // // // //       rendition.prev();
// // // // //     }
// // // // //   };

// // // // //   // Toggle text-to-speech
// // // // //   const toggleTTS = () => {
// // // // //     if (isSpeaking) {
// // // // //       window.speechSynthesis.cancel();
// // // // //       setIsSpeaking(false);
// // // // //     } else {
// // // // //       if (rendition) {
// // // // //         // Get the current content
// // // // //         const iframe = document.querySelector('iframe');
// // // // //         if (iframe) {
// // // // //           const doc = iframe.contentDocument;
// // // // //           if (doc) {
// // // // //             const text = doc.body.textContent || '';
// // // // //             const utterance = new SpeechSynthesisUtterance(text);
// // // // //             window.speechSynthesis.speak(utterance);
// // // // //             setIsSpeaking(true);
            
// // // // //             // When speech ends
// // // // //             utterance.onend = () => {
// // // // //               setIsSpeaking(false);
// // // // //             };
// // // // //           }
// // // // //         }
// // // // //       }
// // // // //     }
// // // // //   };

// // // // //   // Close the book and return to the library
// // // // //   const closeBook = () => {
// // // // //     if (isSpeaking) {
// // // // //       window.speechSynthesis.cancel();
// // // // //       setIsSpeaking(false);
// // // // //     }
    
// // // // //     if (currentBook && rendition) {
// // // // //       rendition.destroy();
// // // // //     }
    
// // // // //     setCurrentBook(null);
// // // // //     setRendition(null);
// // // // //     setIsReading(false);
// // // // //     setCurrentCfi('');
// // // // //     setCurrentPage(0);
// // // // //     setTotalPages(0);
// // // // //     setBookTitle('');
// // // // //   };

// // // // //   // Remove a book from the library
// // // // //   const removeBook = (bookId: string) => {
// // // // //     const confirmDelete = window.confirm('Are you sure you want to remove this book from your library?');
// // // // //     if (confirmDelete) {
// // // // //       setBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
// // // // //     }
// // // // //   };

// // // // //   // Search function
// // // // //   const handleSearch = () => {
// // // // //     if (currentBook && searchQuery) {
// // // // //       currentBook.spine.each((item: any) => {
// // // // //         item.load(currentBook.load.bind(currentBook)).then((doc: Document) => {
// // // // //           const results = item.find(searchQuery);
// // // // //           if (results.length > 0) {
// // // // //             setSearchResults(prevResults => [...prevResults, ...results]);
// // // // //           }
// // // // //         });
// // // // //       });
// // // // //     }
// // // // //   };

// // // // //   // Clear search results
// // // // //   const clearSearch = () => {
// // // // //     setSearchResults([]);
// // // // //     setSearchQuery('');
// // // // //   };

// // // // //   // Jump to a search result
// // // // //   const goToSearchResult = (cfi: string) => {
// // // // //     if (rendition) {
// // // // //       rendition.display(cfi);
// // // // //     }
// // // // //   };

// // // // //   // Get sorted books by last read date (most recent first)
// // // // //   const sortedBooks = [...books].sort((a, b) => 
// // // // //     new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
// // // // //   );

// // // // //   return (
// // // // //     <div className="app">
// // // // //       {!isReading ? (
// // // // //         <div className="library">
// // // // //           <header className="library-header">
// // // // //             <h1>My E-Book Library</h1>
// // // // //             <div className="upload-container">
// // // // //               <label htmlFor="file-upload" className="upload-button">
// // // // //                 Upload Book
// // // // //               </label>
// // // // //               <input
// // // // //                 id="file-upload"
// // // // //                 type="file"
// // // // //                 accept=".epub"
// // // // //                 onChange={handleFileUpload}
// // // // //                 style={{ display: 'none' }}
// // // // //               />
// // // // //             </div>
// // // // //           </header>
          
// // // // //           {books.length === 0 ? (
// // // // //             <div className="empty-library">
// // // // //               <p>Your library is empty. Upload an EPUB book to get started!</p>
// // // // //             </div>
// // // // //           ) : (
// // // // //             <>
// // // // //               <h2>Recently Read</h2>
// // // // //               <div className="recent-books">
// // // // //                 {sortedBooks.slice(0, 3).map(book => (
// // // // //                   <div key={book.id} className="book-card recent" onClick={() => openBook(book)}>
// // // // //                     <div className="book-cover">
// // // // //                       {book.coverUrl ? (
// // // // //                         <img src={book.coverUrl} alt={`Cover of ${book.title}`} />
// // // // //                       ) : (
// // // // //                         <div className="default-cover">
// // // // //                           <span>{book.title.charAt(0)}</span>
// // // // //                         </div>
// // // // //                       )}
// // // // //                     </div>
// // // // //                     <div className="book-info">
// // // // //                       <h3>{book.title}</h3>
// // // // //                       <p>{book.author}</p>
// // // // //                       <p className="last-read">
// // // // //                         Last read: {new Date(book.lastRead).toLocaleDateString()}
// // // // //                       </p>
// // // // //                     </div>
// // // // //                   </div>
// // // // //                 ))}
// // // // //               </div>
              
// // // // //               <h2>All Books</h2>
// // // // //               <div className="books-grid">
// // // // //                 {sortedBooks.map(book => (
// // // // //                   <div key={book.id} className="book-card">
// // // // //                     <div className="book-cover" onClick={() => openBook(book)}>
// // // // //                       {book.coverUrl ? (
// // // // //                         <img src={book.coverUrl} alt={`Cover of ${book.title}`} />
// // // // //                       ) : (
// // // // //                         <div className="default-cover">
// // // // //                           <span>{book.title.charAt(0)}</span>
// // // // //                         </div>
// // // // //                       )}
// // // // //                     </div>
// // // // //                     <div className="book-info">
// // // // //                       <h3>{book.title}</h3>
// // // // //                       <p>{book.author}</p>
// // // // //                     </div>
// // // // //                     <div className="book-actions">
// // // // //                       <button onClick={() => openBook(book)}>Read</button>
// // // // //                       <button onClick={() => removeBook(book.id)} className="remove-book">
// // // // //                         Remove
// // // // //                       </button>
// // // // //                     </div>
// // // // //                   </div>
// // // // //                 ))}
// // // // //               </div>
// // // // //             </>
// // // // //           )}
// // // // //         </div>
// // // // //       ) : (
// // // // //         <div className="reader">
// // // // //           <header className="reader-header">
// // // // //             <div className="reader-nav">
// // // // //               <button onClick={closeBook} className="back-button">
// // // // //                 ← Back to Library
// // // // //               </button>
// // // // //               <h2>{bookTitle}</h2>
// // // // //             </div>
// // // // //             <div className="reader-controls">
// // // // //               <button onClick={prevPage}>Previous</button>
// // // // //               <span>
// // // // //                 Page {currentPage} of {totalPages}
// // // // //               </span>
// // // // //               <button onClick={nextPage}>Next</button>
// // // // //               <button onClick={toggleTTS} className={isSpeaking ? 'active' : ''}>
// // // // //                 {isSpeaking ? 'Stop TTS' : 'Read Aloud'}
// // // // //               </button>
// // // // //             </div>
// // // // //           </header>
          
// // // // //           <div className="reader-container">
// // // // //             <div className="search-container">
// // // // //               <input
// // // // //                 type="text"
// // // // //                 value={searchQuery}
// // // // //                 onChange={(e) => setSearchQuery(e.target.value)}
// // // // //                 placeholder="Search in book..."
// // // // //               />
// // // // //               <button onClick={handleSearch}>Search</button>
// // // // //               {searchResults.length > 0 && (
// // // // //                 <button onClick={clearSearch}>Clear</button>
// // // // //               )}
// // // // //             </div>
            
// // // // //             {searchResults.length > 0 && (
// // // // //               <div className="search-results">
// // // // //                 <h3>Search Results ({searchResults.length})</h3>
// // // // //                 <ul>
// // // // //                   {searchResults.map((result, index) => (
// // // // //                     <li key={index} onClick={() => goToSearchResult(result.cfi)}>
// // // // //                       {result.excerpt}
// // // // //                     </li>
// // // // //                   ))}
// // // // //                 </ul>
// // // // //               </div>
// // // // //             )}
            
// // // // //             <div id="viewer" className="epub-viewer"></div>
// // // // //           </div>
// // // // //         </div>
// // // // //       )}
// // // // //     </div>
// // // // //   );
// // // // // }

// // // // // export default App;
// // // // import React, { useState, useEffect } from 'react';
// // // // import JSZip from 'jszip';
// // // // import { DOMParser } from 'xmldom';
// // // // import './App.css';

// // // // interface BookData {
// // // //   id: string;
// // // //   title: string;
// // // //   author: string;
// // // //   coverUrl: string | null;
// // // //   currentPage: number;
// // // //   file: File;
// // // //   lastRead: string;
// // // // }

// // // // interface TOCItem {
// // // //   id: string;
// // // //   href: string;
// // // //   label: string;
// // // //   children: TOCItem[];
// // // // }

// // // // function App() {
// // // //   // State for the library and reading
// // // //   const [books, setBooks] = useState<BookData[]>([]);
// // // //   const [currentBook, setCurrentBook] = useState<any>(null);
// // // //   const [isReading, setIsReading] = useState<boolean>(false);
// // // //   const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
// // // //   const [currentPage, setCurrentPage] = useState<number>(0);
// // // //   const [bookTitle, setBookTitle] = useState<string>('');
// // // //   const [bookAuthor, setBookAuthor] = useState<string>('');
// // // //   const [isLoading, setIsLoading] = useState<boolean>(false);
// // // //   const [toc, setToc] = useState<TOCItem[]>([]);
// // // //   const [totalPages, setTotalPages] = useState<number>(0);
// // // //   const [currentContent, setCurrentContent] = useState<string>('');
// // // //   const [searchQuery, setSearchQuery] = useState<string>('');
// // // //   const [bookZip, setBookZip] = useState<JSZip | null>(null);
// // // //   const [opfPath, setOpfPath] = useState<string>('');
// // // //   const [htmlFiles, setHtmlFiles] = useState<string[]>([]);

// // // //   // Load books from localStorage on initial render
// // // //   useEffect(() => {
// // // //     const savedBooks = localStorage.getItem('ebooks');
// // // //     if (savedBooks) {
// // // //       // We can't save File objects in localStorage, so we need to handle that separately
// // // //       try {
// // // //         setBooks(JSON.parse(savedBooks));
// // // //       } catch (e) {
// // // //         console.error("Error loading books from localStorage", e);
// // // //         setBooks([]);
// // // //       }
// // // //     }
// // // //   }, []);

// // // //   // Save books to localStorage when they change
// // // //   useEffect(() => {
// // // //     if (books.length > 0) {
// // // //       try {
// // // //         // We need to serialize the books without the File objects
// // // //         const serializableBooks = books.map(book => {
// // // //           const { file, ...serializableBook } = book;
// // // //           return serializableBook;
// // // //         });
// // // //         localStorage.setItem('ebooks', JSON.stringify(serializableBooks));
// // // //       } catch (e) {
// // // //         console.error("Error saving books to localStorage", e);
// // // //       }
// // // //     }
// // // //   }, [books]);

// // // //   // Handle file upload
// // // //   const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
// // // //     const files = event.target.files;
// // // //     if (!files || files.length === 0) return;

// // // //     const file = files[0];
// // // //     const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
// // // //     if (fileExtension !== 'epub') {
// // // //       alert('Please upload an EPUB file');
// // // //       return;
// // // //     }

// // // //     setIsLoading(true);

// // // //     try {
// // // //       // Load the epub file using JSZip
// // // //       const zip = new JSZip();
// // // //       const content = await zip.loadAsync(file);
      
// // // //       // Find the container.xml file
// // // //       const containerXml = await content.file('META-INF/container.xml')?.async('text');
// // // //       if (!containerXml) {
// // // //         throw new Error('Invalid EPUB: container.xml not found');
// // // //       }
      
// // // //       // Parse the container.xml to find the OPF file
// // // //       const parser = new DOMParser();
// // // //       const containerDoc = parser.parseFromString(containerXml, 'application/xml');
// // // //       const rootfiles = containerDoc.getElementsByTagName('rootfile');
      
// // // //       if (rootfiles.length === 0) {
// // // //         throw new Error('Invalid EPUB: No rootfile found in container.xml');
// // // //       }
      
// // // //       // Get the path to the OPF file
// // // //       const opfPath = rootfiles[0].getAttribute('full-path') || '';
      
// // // //       // Load the OPF file
// // // //       const opfContent = await content.file(opfPath)?.async('text');
// // // //       if (!opfContent) {
// // // //         throw new Error('Invalid EPUB: OPF file not found');
// // // //       }
      
// // // //       // Parse the OPF file to get metadata
// // // //       const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      
// // // //       // Get the book title
// // // //       const titleElements = opfDoc.getElementsByTagName('dc:title');
// // // //       const title = titleElements.length > 0 
// // // //         ? titleElements[0].textContent || 'Unknown Title'
// // // //         : 'Unknown Title';
      
// // // //       // Get the book author
// // // //       const creatorElements = opfDoc.getElementsByTagName('dc:creator');
// // // //       const author = creatorElements.length > 0
// // // //         ? creatorElements[0].textContent || 'Unknown Author'
// // // //         : 'Unknown Author';
      
// // // //       // Generate a unique ID
// // // //       const id = Date.now().toString();
      
// // // //       // Find the cover image
// // // //       let coverUrl = null;
// // // //       const metaTags = opfDoc.getElementsByTagName('meta');
// // // //       let coverId = '';
      
// // // //       // Try to find the cover ID
// // // //       for (let i = 0; i < metaTags.length; i++) {
// // // //         const meta = metaTags[i];
// // // //         if (meta.getAttribute('name') === 'cover') {
// // // //           coverId = meta.getAttribute('content') || '';
// // // //           break;
// // // //         }
// // // //       }
      
// // // //       // If we found a cover ID, find the actual file
// // // //       if (coverId) {
// // // //         const items = opfDoc.getElementsByTagName('item');
// // // //         for (let i = 0; i < items.length; i++) {
// // // //           const item = items[i];
// // // //           if (item.getAttribute('id') === coverId) {
// // // //             const href = item.getAttribute('href') || '';
// // // //             // Get the directory of the OPF file to resolve relative paths
// // // //             const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
// // // //             const coverPath = opfDir + href;
            
// // // //             // Get the cover image as a blob
// // // //             const coverBlob = await content.file(coverPath)?.async('blob');
// // // //             if (coverBlob) {
// // // //               coverUrl = URL.createObjectURL(coverBlob);
// // // //             }
// // // //             break;
// // // //           }
// // // //         }
// // // //       }
      
// // // //       // Create a new book object
// // // //       const newBook: BookData = {
// // // //         id,
// // // //         title,
// // // //         author,
// // // //         coverUrl,
// // // //         currentPage: 0,
// // // //         file,
// // // //         lastRead: new Date().toISOString()
// // // //       };
      
// // // //       // Add the book to our library
// // // //       setBooks(prevBooks => [...prevBooks, newBook]);
      
// // // //       // Reset the file input
// // // //       event.target.value = '';
      
// // // //       alert(`"${title}" has been added to your library!`);
// // // //     } catch (error) {
// // // //       console.error('Error processing EPUB file:', error);
// // // //       alert('Error processing the EPUB file. Please try again.');
// // // //     } finally {
// // // //       setIsLoading(false);
// // // //     }
// // // //   };

// // // //   // Open a book to read
// // // //   const openBook = async (book: BookData) => {
// // // //     setIsLoading(true);
// // // //     setBookTitle(book.title);
// // // //     setBookAuthor(book.author);
// // // //     setCurrentPage(book.currentPage || 0);
    
// // // //     try {
// // // //       // Load the epub file again
// // // //       const zip = new JSZip();
// // // //       const content = await zip.loadAsync(book.file);
// // // //       setBookZip(content);
      
// // // //       // Find the container.xml file
// // // //       const containerXml = await content.file('META-INF/container.xml')?.async('text');
// // // //       if (!containerXml) {
// // // //         throw new Error('Invalid EPUB: container.xml not found');
// // // //       }
      
// // // //       // Parse the container.xml to find the OPF file
// // // //       const parser = new DOMParser();
// // // //       const containerDoc = parser.parseFromString(containerXml, 'application/xml');
// // // //       const rootfiles = containerDoc.getElementsByTagName('rootfile');
      
// // // //       if (rootfiles.length === 0) {
// // // //         throw new Error('Invalid EPUB: No rootfile found in container.xml');
// // // //       }
      
// // // //       // Get the path to the OPF file
// // // //       const opf = rootfiles[0].getAttribute('full-path') || '';
// // // //       setOpfPath(opf);
      
// // // //       // Load the OPF file
// // // //       const opfContent = await content.file(opf)?.async('text');
// // // //       if (!opfContent) {
// // // //         throw new Error('Invalid EPUB: OPF file not found');
// // // //       }
      
// // // //       // Parse the OPF file
// // // //       const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      
// // // //       // Get the spine - this defines the reading order
// // // //       const spine = opfDoc.getElementsByTagName('spine')[0];
// // // //       const itemrefs = spine.getElementsByTagName('itemref');
      
// // // //       // Get the manifest - this maps IDs to file paths
// // // //       const manifest = opfDoc.getElementsByTagName('manifest')[0];
// // // //       const items = manifest.getElementsByTagName('item');
      
// // // //       // Map the spine items to their file paths
// // // //       const fileOrder: string[] = [];
// // // //       for (let i = 0; i < itemrefs.length; i++) {
// // // //         const idref = itemrefs[i].getAttribute('idref');
// // // //         for (let j = 0; j < items.length; j++) {
// // // //           if (items[j].getAttribute('id') === idref) {
// // // //             const href = items[j].getAttribute('href') || '';
// // // //             // Get the directory of the OPF file to resolve relative paths
// // // //             const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
// // // //             fileOrder.push(opfDir + href);
// // // //             break;
// // // //           }
// // // //         }
// // // //       }
      
// // // //       setHtmlFiles(fileOrder);
// // // //       setTotalPages(fileOrder.length);
      
// // // //       // Get the table of contents if it exists
// // // //       // Look for the TOC item in the manifest
// // // //       let tocPath = '';
// // // //       for (let i = 0; i < items.length; i++) {
// // // //         const item = items[i];
// // // //         const properties = item.getAttribute('properties');
// // // //         if (properties && properties.includes('nav')) {
// // // //           const href = item.getAttribute('href') || '';
// // // //           // Get the directory of the OPF file to resolve relative paths
// // // //           const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
// // // //           tocPath = opfDir + href;
// // // //           break;
// // // //         }
// // // //       }
      
// // // //       // If we found a TOC, parse it
// // // //       if (tocPath) {
// // // //         const tocContent = await content.file(tocPath)?.async('text');
// // // //         if (tocContent) {
// // // //           const tocDoc = parser.parseFromString(tocContent, 'text/html');
// // // //           const navs = tocDoc.getElementsByTagName('nav');
          
// // // //           // Find the TOC nav element
// // // //           for (let i = 0; i < navs.length; i++) {
// // // //             const nav = navs[i];
// // // //             const type = nav.getAttribute('epub:type');
// // // //             if (type === 'toc') {
// // // //               // Parse the TOC entries
// // // //               const ol = nav.getElementsByTagName('ol')[0];
// // // //               if (ol) {
// // // //                 const parseTocItems = (ol: Element): TOCItem[] => {
// // // //                   const items: TOCItem[] = [];
// // // //                   const lis = ol.getElementsByTagName('li');
                  
// // // //                   for (let j = 0; j < lis.length; j++) {
// // // //                     const li = lis[j];
// // // //                     const a = li.getElementsByTagName('a')[0];
// // // //                     if (a) {
// // // //                       const href = a.getAttribute('href') || '';
// // // //                       const label = a.textContent || '';
// // // //                       const id = `toc-${j}`;
                      
// // // //                       const item: TOCItem = {
// // // //                         id,
// // // //                         href,
// // // //                         label,
// // // //                         children: []
// // // //                       };
                      
// // // //                       // Check for nested lists
// // // //                       const nestedOl = li.getElementsByTagName('ol')[0];
// // // //                       if (nestedOl) {
// // // //                         item.children = parseTocItems(nestedOl);
// // // //                       }
                      
// // // //                       items.push(item);
// // // //                     }
// // // //                   }
                  
// // // //                   return items;
// // // //                 };
                
// // // //                 setToc(parseTocItems(ol));
// // // //               }
// // // //               break;
// // // //             }
// // // //           }
// // // //         }
// // // //       }
      
// // // //       // Load the first HTML file
// // // //       if (fileOrder.length > 0) {
// // // //         await loadPage(book.currentPage || 0);
// // // //       } else {
// // // //         throw new Error('No HTML files found in the EPUB');
// // // //       }
      
// // // //       // Update the last read date for this book
// // // //       setBooks(prevBooks => 
// // // //         prevBooks.map(b => 
// // // //           b.id === book.id 
// // // //             ? { ...b, lastRead: new Date().toISOString() } 
// // // //             : b
// // // //         )
// // // //       );
      
// // // //       // Switch to reading view
// // // //       setIsReading(true);
// // // //     } catch (error) {
// // // //       console.error('Error opening EPUB file:', error);
// // // //       alert('Error opening the EPUB file. Please try again.');
// // // //     } finally {
// // // //       setIsLoading(false);
// // // //     }
// // // //   };

// // // //   // Load a specific page
// // // //   const loadPage = async (pageIndex: number) => {
// // // //     if (!bookZip || pageIndex < 0 || pageIndex >= htmlFiles.length) {
// // // //       return;
// // // //     }
    
// // // //     try {
// // // //       // Load the HTML content
// // // //       const htmlContent = await bookZip.file(htmlFiles[pageIndex])?.async('text');
// // // //       if (!htmlContent) {
// // // //         throw new Error(`Could not load page ${pageIndex}`);
// // // //       }
      
// // // //       // Get the directory of the HTML file to resolve relative paths
// // // //       const fileDir = htmlFiles[pageIndex].substring(0, htmlFiles[pageIndex].lastIndexOf('/') + 1);
      
// // // //       // Process the HTML to fix relative paths
// // // //       let processedHtml = htmlContent;
      
// // // //       // Fix image paths
// // // //       processedHtml = processedHtml.replace(
// // // //         /<img([^>]*)src=["']([^"']*)["']/g,
// // // //         (match, attributes, src) => {
// // // //           if (src.startsWith('http')) {
// // // //             return match; // Absolute URL, no changes needed
// // // //           }
          
// // // //           // Construct a data URL for the image
// // // //           const imagePath = src.startsWith('/') ? src.substring(1) : fileDir + src;
// // // //           return `<img${attributes}src="data:image/png;base64,IMAGE_PLACEHOLDER_${imagePath}"`;
// // // //         }
// // // //       );
      
// // // //       // Fix CSS paths
// // // //       processedHtml = processedHtml.replace(
// // // //         /<link([^>]*)href=["']([^"']*)["']/g,
// // // //         (match, attributes, href) => {
// // // //           if (href.startsWith('http')) {
// // // //             return match; // Absolute URL, no changes needed
// // // //           }
          
// // // //           // Construct a data URL for the CSS
// // // //           const cssPath = href.startsWith('/') ? href.substring(1) : fileDir + href;
// // // //           return `<link${attributes}href="data:text/css;base64,CSS_PLACEHOLDER_${cssPath}"`;
// // // //         }
// // // //       );
      
// // // //       setCurrentContent(processedHtml);
// // // //       setCurrentPage(pageIndex);
      
// // // //       // Update the current page in the books array
// // // //       if (currentBook) {
// // // //         setBooks(prevBooks => 
// // // //           prevBooks.map(b => 
// // // //             b.id === currentBook.id 
// // // //               ? { ...b, currentPage: pageIndex } 
// // // //               : b
// // // //           )
// // // //         );
// // // //       }
      
// // // //       // After rendering the content, load any images
// // // //       setTimeout(() => {
// // // //         const content = document.querySelector('.epub-content');
// // // //         if (content) {
// // // //           const images = content.querySelectorAll('img[src^="data:image/png;base64,IMAGE_PLACEHOLDER_"]');
// // // //           images.forEach(async (img: Element) => {
// // // //             const src = (img as HTMLImageElement).src;
// // // //             const imagePath = src.replace('data:image/png;base64,IMAGE_PLACEHOLDER_', '');
            
// // // //             try {
// // // //               const imageBlob = await bookZip.file(imagePath)?.async('blob');
// // // //               if (imageBlob) {
// // // //                 const imageUrl = URL.createObjectURL(imageBlob);
// // // //                 (img as HTMLImageElement).src = imageUrl;
// // // //               }
// // // //             } catch (error) {
// // // //               console.error(`Error loading image: ${imagePath}`, error);
// // // //             }
// // // //           });
          
// // // //           const links = content.querySelectorAll('link[href^="data:text/css;base64,CSS_PLACEHOLDER_"]');
// // // //           links.forEach(async (link: Element) => {
// // // //             const href = (link as HTMLLinkElement).href;
// // // //             const cssPath = href.replace('data:text/css;base64,CSS_PLACEHOLDER_', '');
            
// // // //             try {
// // // //               const cssContent = await bookZip.file(cssPath)?.async('text');
// // // //               if (cssContent) {
// // // //                 // Create a new style element with the CSS content
// // // //                 const style = document.createElement('style');
// // // //                 style.textContent = cssContent;
// // // //                 link.parentNode?.replaceChild(style, link);
// // // //               }
// // // //             } catch (error) {
// // // //               console.error(`Error loading CSS: ${cssPath}`, error);
// // // //             }
// // // //           });
// // // //         }
// // // //       }, 100);
      
// // // //     } catch (error) {
// // // //       console.error('Error loading page:', error);
// // // //       alert(`Error loading page ${pageIndex}. Please try again.`);
// // // //     }
// // // //   };

// // // //   // Navigate to the next page
// // // //   const nextPage = () => {
// // // //     if (currentPage < totalPages - 1) {
// // // //       loadPage(currentPage + 1);
// // // //     }
// // // //   };

// // // //   // Navigate to the previous page
// // // //   const prevPage = () => {
// // // //     if (currentPage > 0) {
// // // //       loadPage(currentPage - 1);
// // // //     }
// // // //   };

// // // //   // Navigate to a specific TOC item
// // // //   const navigateToTocItem = (item: TOCItem) => {
// // // //     // The href might be something like "chapter1.html#section2"
// // // //     const [filePath, fragment] = item.href.split('#');
    
// // // //     // Find the index of this file in our htmlFiles array
// // // //     const fileIndex = htmlFiles.findIndex(file => file.endsWith(filePath));
    
// // // //     if (fileIndex !== -1) {
// // // //       loadPage(fileIndex);
      
// // // //       // If there's a fragment, scroll to it after loading
// // // //       if (fragment) {
// // // //         setTimeout(() => {
// // // //           const element = document.getElementById(fragment);
// // // //           if (element) {
// // // //             element.scrollIntoView({ behavior: 'smooth' });
// // // //           }
// // // //         }, 300);
// // // //       }
// // // //     }
// // // //   };

// // // //   // Toggle text-to-speech
// // // //   const toggleTTS = () => {
// // // //     if (isSpeaking) {
// // // //       window.speechSynthesis.cancel();
// // // //       setIsSpeaking(false);
// // // //     } else {
// // // //       const content = document.querySelector('.epub-content');
// // // //       if (content) {
// // // //         const text = content.textContent || '';
// // // //         const utterance = new SpeechSynthesisUtterance(text);
// // // //         window.speechSynthesis.speak(utterance);
// // // //         setIsSpeaking(true);
        
// // // //         utterance.onend = () => {
// // // //           setIsSpeaking(false);
// // // //         };
// // // //       }
// // // //     }
// // // //   };

// // // //   // Close the book and return to the library
// // // //   const closeBook = () => {
// // // //     if (isSpeaking) {
// // // //       window.speechSynthesis.cancel();
// // // //       setIsSpeaking(false);
// // // //     }
    
// // // //     setCurrentBook(null);
// // // //     setBookZip(null);
// // // //     setOpfPath('');
// // // //     setHtmlFiles([]);
// // // //     setToc([]);
// // // //     setCurrentContent('');
// // // //     setIsReading(false);
// // // //     setBookTitle('');
// // // //     setBookAuthor('');
// // // //   };

// // // //   // Remove a book from the library
// // // //   const removeBook = (bookId: string) => {
// // // //     const confirmDelete = window.confirm('Are you sure you want to remove this book from your library?');
// // // //     if (confirmDelete) {
// // // //       // Find the book to remove its cover URL
// // // //       const book = books.find(b => b.id === bookId);
// // // //       if (book && book.coverUrl) {
// // // //         URL.revokeObjectURL(book.coverUrl);
// // // //       }
      
// // // //       setBooks(prevBooks => prevBooks.filter(b => b.id !== bookId));
// // // //     }
// // // //   };

// // // //   // Search for text in the current page
// // // //   const handleSearch = () => {
// // // //     if (!searchQuery) return;
    
// // // //     const content = document.querySelector('.epub-content');
// // // //     if (content) {
// // // //       // Remove any previous highlights
// // // //       const highlights = content.querySelectorAll('.search-highlight');
// // // //       highlights.forEach(highlight => {
// // // //         const parent = highlight.parentNode;
// // // //         if (parent) {
// // // //           parent.replaceChild(document.createTextNode((highlight as HTMLElement).innerText), highlight);
// // // //         }
// // // //       });
      
// // // //       // If the query is empty after clearing, we're done
// // // //       if (!searchQuery.trim()) return;
      
// // // //       // Create a walker to traverse all text nodes
// // // //       const walker = document.createTreeWalker(
// // // //         content,
// // // //         NodeFilter.SHOW_TEXT,
// // // //         {
// // // //           acceptNode: (node) => {
// // // //             // Skip script and style tags
// // // //             const parent = node.parentNode as HTMLElement;
// // // //             if (parent && ['SCRIPT', 'STYLE'].includes(parent.tagName)) {
// // // //               return NodeFilter.FILTER_REJECT;
// // // //             }
// // // //             return NodeFilter.FILTER_ACCEPT;
// // // //           }
// // // //         }
// // // //       );
      
// // // //       // Search all text nodes
// // // //       let node;
// // // //       while (node = walker.nextNode()) {
// // // //         const text = node.textContent || '';
// // // //         const lowerText = text.toLowerCase();
// // // //         const lowerQuery = searchQuery.toLowerCase();
        
// // // //         let index = lowerText.indexOf(lowerQuery);
// // // //         if (index !== -1) {
// // // //           // We found the text, now we need to replace it with a highlighted version
// // // //           const parent = node.parentNode;
// // // //           if (parent) {
// // // //             let currentIndex = 0;
// // // //             const fragments = [];
            
// // // //             // Add all instances of the search query in this text node
// // // //             while (index !== -1) {
// // // //               // Add the text before the match
// // // //               if (index > currentIndex) {
// // // //                 fragments.push(document.createTextNode(text.substring(currentIndex, index)));
// // // //               }
              
// // // //               // Add the highlighted match
// // // //               const highlight = document.createElement('span');
// // // //               highlight.className = 'search-highlight';
// // // //               highlight.textContent = text.substring(index, index + searchQuery.length);
// // // //               fragments.push(highlight);
              
// // // //               // Update indices
// // // //               currentIndex = index + searchQuery.length;
// // // //               index = lowerText.indexOf(lowerQuery, currentIndex);
// // // //             }
            
// // // //             // Add any remaining text
// // // //             if (currentIndex < text.length) {
// // // //               fragments.push(document.createTextNode(text.substring(currentIndex)));
// // // //             }
            
// // // //             // Replace the original text node with our fragments
// // // //             parent.replaceChild(fragments[0], node);
// // // //             for (let i = 1; i < fragments.length; i++) {
// // // //               parent.insertBefore(fragments[i], fragments[i-1].nextSibling);
// // // //             }
// // // //           }
// // // //         }
// // // //       }
      
// // // //       // Scroll to the first highlight
// // // //       const firstHighlight = content.querySelector('.search-highlight');
// // // //       if (firstHighlight) {
// // // //         firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
// // // //       }
// // // //     }
// // // //   };

// // // //   // Clear the search
// // // //   const clearSearch = () => {
// // // //     setSearchQuery('');
    
// // // //     // Remove any highlights
// // // //     const content = document.querySelector('.epub-content');
// // // //     if (content) {
// // // //       const highlights = content.querySelectorAll('.search-highlight');
// // // //       highlights.forEach(highlight => {
// // // //         const parent = highlight.parentNode;
// // // //         if (parent) {
// // // //           parent.replaceChild(document.createTextNode((highlight as HTMLElement).innerText), highlight);
// // // //         }
// // // //       });
// // // //     }
// // // //   };

// // // //   // Get sorted books by last read date (most recent first)
// // // //   const sortedBooks = [...books].sort((a, b) => 
// // // //     new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
// // // //   );

// // // //   // Render the TOC recursively
// // // //   const renderTocItems = (items: TOCItem[]) => {
// // // //     return (
// // // //       <ul>
// // // //         {items.map(item => (
// // // //           <li key={item.id}>
// // // //             <button onClick={() => navigateToTocItem(item)}>{item.label}</button>
// // // //             {item.children.length > 0 && renderTocItems(item.children)}
// // // //           </li>
// // // //         ))}
// // // //       </ul>
// // // //     );
// // // //   };

// // // //   return (
// // // //     <div className="app">
// // // //       {!isReading ? (
// // // //         <div className="library">
// // // //           <header className="library-header">
// // // //             <h1>My E-Book Library</h1>
// // // //             <div className="upload-container">
// // // //               <label htmlFor="file-upload" className="upload-button">
// // // //                 Upload Book
// // // //               </label>
// // // //               <input
// // // //                 id="file-upload"
// // // //                 type="file"
// // // //                 accept=".epub"
// // // //                 onChange={handleFileUpload}
// // // //                 style={{ display: 'none' }}
// // // //               />
// // // //             </div>
// // // //           </header>
          
// // // //           {isLoading && (
// // // //             <div className="loading">
// // // //               <div className="loading-spinner"></div>
// // // //               <p>Loading book...</p>
// // // //             </div>
// // // //           )}
          
// // // //           {books.length === 0 ? (
// // // //             <div className="empty-library">
// // // //               <p>Your library is empty. Upload an EPUB book to get started!</p>
// // // //             </div>
// // // //           ) : (
// // // //             <>
// // // //               <h2>Recently Read</h2>
// // // //               <div className="recent-books">
// // // //                 {sortedBooks.slice(0, 3).map(book => (
// // // //                   <div key={book.id} className="book-card recent" onClick={() => openBook(book)}>
// // // //                     <div className="book-cover">
// // // //                       {book.coverUrl ? (
// // // //                         <img src={book.coverUrl} alt={`Cover of ${book.title}`} />
// // // //                       ) : (
// // // //                         <div className="default-cover">
// // // //                           <span>{book.title.charAt(0)}</span>
// // // //                         </div>
// // // //                       )}
// // // //                     </div>
// // // //                     <div className="book-info">
// // // //                       <h3>{book.title}</h3>
// // // //                       <p>{book.author}</p>
// // // //                       <p className="last-read">
// // // //                         Last read: {new Date(book.lastRead).toLocaleDateString()}
// // // //                       </p>
// // // //                     </div>
// // // //                   </div>
// // // //                 ))}
// // // //               </div>
              
// // // //               <h2>All Books</h2>
// // // //               <div className="books-grid">
// // // //                 {sortedBooks.map(book => (
// // // //                   <div key={book.id} className="book-card">
// // // //                     <div className="book-cover" onClick={() => openBook(book)}>
// // // //                       {book.coverUrl ? (
// // // //                         <img src={book.coverUrl} alt={`Cover of ${book.title}`} />
// // // //                       ) : (
// // // //                         <div className="default-cover">
// // // //                           <span>{book.title.charAt(0)}</span>
// // // //                         </div>
// // // //                       )}
// // // //                     </div>
// // // //                     <div className="book-info">
// // // //                       <h3>{book.title}</h3>
// // // //                       <p>{book.author}</p>
// // // //                     </div>
// // // //                     <div className="book-actions">
// // // //                       <button onClick={(e) => {
// // // //                         e.stopPropagation();
// // // //                         openBook(book);
// // // //                       }}>Read</button>
// // // //                       <button 
// // // //                         onClick={(e) => {
// // // //                           e.stopPropagation();
// // // //                           removeBook(book.id);
// // // //                         }} 
// // // //                         className="remove-book">
// // // //                         Remove
// // // //                       </button>
// // // //                     </div>
// // // //                   </div>
// // // //                 ))}
// // // //               </div>
// // // //             </>
// // // //           )}
// // // //         </div>
// // // //       ) : (
// // // //         <div className="reader">
// // // //           <header className="reader-header">
// // // //             <div className="reader-nav">
// // // //               <button onClick={closeBook} className="back-button">
// // // //                 ← Back to Library
// // // //               </button>
// // // //               <h2>{bookTitle}</h2>
// // // //               <p className="author">{bookAuthor}</p>
// // // //             </div>
// // // //             <div className="reader-controls">
// // // //               <button onClick={prevPage} disabled={currentPage === 0}>Previous</button>
// // // //               <span className="page-info">
// // // //                 Page {currentPage + 1} of {totalPages}
// // // //               </span>
// // // //               <button onClick={nextPage} disabled={currentPage === totalPages - 1}>Next</button>
// // // //               <button onClick={toggleTTS} className={isSpeaking ? 'active' : ''}>
// // // //                 {isSpeaking ? 'Stop TTS' : 'Read Aloud'}
// // // //               </button>
// // // //             </div>
// // // //           </header>
          
// // // //           <div className="reader-container">
// // // //             {isLoading && (
// // // //               <div className="loading-overlay">
// // // //                 <div className="loading-spinner"></div>
// // // //                 <p>Loading book...</p>
// // // //               </div>
// // // //             )}
            
// // // //             <div className="reader-sidebar">
// // // //               <div className="toc-container">
// // // //                 <h3>Table of Contents</h3>
// // // //                 {toc.length > 0 ? renderTocItems(toc) : <p>No table of contents available</p>}
// // // //               </div>
// // // //             </div>
            
// // // //             <div className="reader-main">
// // // //               <div className="search-container">
// // // //                 <input
// // // //                   type="text"
// // // //                   value={searchQuery}
// // // //                   onChange={(e) => setSearchQuery(e.target.value)}
// // // //                   placeholder="Search in current page..."
// // // //                   onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
// // // //                 />
// // // //                 <button onClick={handleSearch}>Search</button>
// // // //                 <button onClick={clearSearch}>Clear</button>
// // // //               </div>
              
// // // //               <div className="epub-content" dangerouslySetInnerHTML={{ __html: currentContent }}></div>
// // // //             </div>
// // // //           </div>
// // // //         </div>
// // // //       )}
// // // //     </div>
// // // //   );
// // // // }

// // // // export default App;



// // // import React, { useState, useEffect } from 'react';
// // // import JSZip from 'jszip';
// // // import { DOMParser } from 'xmldom';
// // // import './App.css';

// // // interface BookData {
// // //   id: string;
// // //   title: string;
// // //   author: string;
// // //   coverUrl: string | null;
// // //   currentPage: number;
// // //   file: File;
// // //   lastRead: string;
// // // }

// // // interface TOCItem {
// // //   id: string;
// // //   href: string;
// // //   label: string;
// // //   children: TOCItem[];
// // // }

// // // function App() {
// // //   // State for the library and reading
// // //   const [books, setBooks] = useState<BookData[]>([]);
// // //   const [currentBook, setCurrentBook] = useState<any>(null);
// // //   const [isReading, setIsReading] = useState<boolean>(false);
// // //   const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
// // //   const [currentPage, setCurrentPage] = useState<number>(0);
// // //   const [bookTitle, setBookTitle] = useState<string>('');
// // //   const [bookAuthor, setBookAuthor] = useState<string>('');
// // //   const [isLoading, setIsLoading] = useState<boolean>(false);
// // //   const [toc, setToc] = useState<TOCItem[]>([]);
// // //   const [totalPages, setTotalPages] = useState<number>(0);
// // //   const [currentContent, setCurrentContent] = useState<string>('');
// // //   const [searchQuery, setSearchQuery] = useState<string>('');
// // //   const [bookZip, setBookZip] = useState<JSZip | null>(null);
// // //   const [opfPath, setOpfPath] = useState<string>('');
// // //   const [htmlFiles, setHtmlFiles] = useState<string[]>([]);

// // //   // Load books from localStorage on initial render
// // //   useEffect(() => {
// // //     const savedBooks = localStorage.getItem('ebooks');
// // //     if (savedBooks) {
// // //       // We can't save File objects in localStorage, so we need to handle that separately
// // //       try {
// // //         setBooks(JSON.parse(savedBooks));
// // //       } catch (e) {
// // //         console.error("Error loading books from localStorage", e);
// // //         setBooks([]);
// // //       }
// // //     }
// // //   }, []);

// // //   // Save books to localStorage when they change
// // //   useEffect(() => {
// // //     if (books.length > 0) {
// // //       try {
// // //         // We need to serialize the books without the File objects
// // //         const serializableBooks = books.map(book => {
// // //           const { file, ...serializableBook } = book;
// // //           return serializableBook;
// // //         });
// // //         localStorage.setItem('ebooks', JSON.stringify(serializableBooks));
// // //       } catch (e) {
// // //         console.error("Error saving books to localStorage", e);
// // //       }
// // //     }
// // //   }, [books]);

// // //   // Handle file upload
// // //   const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
// // //     const files = event.target.files;
// // //     if (!files || files.length === 0) return;

// // //     const file = files[0];
// // //     const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
// // //     if (fileExtension !== 'epub') {
// // //       alert('Please upload an EPUB file');
// // //       return;
// // //     }

// // //     setIsLoading(true);

// // //     try {
// // //       // Load the epub file using JSZip
// // //       const zip = new JSZip();
// // //       const content = await zip.loadAsync(file);
      
// // //       // Find the container.xml file
// // //       const containerXml = await content.file('META-INF/container.xml')?.async('text');
// // //       if (!containerXml) {
// // //         throw new Error('Invalid EPUB: container.xml not found');
// // //       }
      
// // //       // Parse the container.xml to find the OPF file
// // //       const parser = new DOMParser();
// // //       const containerDoc = parser.parseFromString(containerXml, 'application/xml');
// // //       const rootfiles = containerDoc.getElementsByTagName('rootfile');
      
// // //       if (rootfiles.length === 0) {
// // //         throw new Error('Invalid EPUB: No rootfile found in container.xml');
// // //       }
      
// // //       // Get the path to the OPF file
// // //       const opfPath = rootfiles[0].getAttribute('full-path') || '';
      
// // //       // Load the OPF file
// // //       const opfContent = await content.file(opfPath)?.async('text');
// // //       if (!opfContent) {
// // //         throw new Error('Invalid EPUB: OPF file not found');
// // //       }
      
// // //       // Parse the OPF file to get metadata
// // //       const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      
// // //       // Get the book title
// // //       const titleElements = opfDoc.getElementsByTagName('dc:title');
// // //       const title = titleElements.length > 0 
// // //         ? titleElements[0].textContent || 'Unknown Title'
// // //         : 'Unknown Title';
      
// // //       // Get the book author
// // //       const creatorElements = opfDoc.getElementsByTagName('dc:creator');
// // //       const author = creatorElements.length > 0
// // //         ? creatorElements[0].textContent || 'Unknown Author'
// // //         : 'Unknown Author';
      
// // //       // Generate a unique ID
// // //       const id = Date.now().toString();
      
// // //       // Find the cover image
// // //       let coverUrl = null;
// // //       const metaTags = opfDoc.getElementsByTagName('meta');
// // //       let coverId = '';
      
// // //       // Try to find the cover ID
// // //       for (let i = 0; i < metaTags.length; i++) {
// // //         const meta = metaTags[i];
// // //         if (meta.getAttribute('name') === 'cover') {
// // //           coverId = meta.getAttribute('content') || '';
// // //           break;
// // //         }
// // //       }
      
// // //       // If we found a cover ID, find the actual file
// // //       if (coverId) {
// // //         const items = opfDoc.getElementsByTagName('item');
// // //         for (let i = 0; i < items.length; i++) {
// // //           const item = items[i];
// // //           if (item.getAttribute('id') === coverId) {
// // //             const href = item.getAttribute('href') || '';
// // //             // Get the directory of the OPF file to resolve relative paths
// // //             const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
// // //             const coverPath = opfDir + href;
            
// // //             // Get the cover image as a blob
// // //             const coverBlob = await content.file(coverPath)?.async('blob');
// // //             if (coverBlob) {
// // //               coverUrl = URL.createObjectURL(coverBlob);
// // //             }
// // //             break;
// // //           }
// // //         }
// // //       }
      
// // //       // Create a new book object
// // //       const newBook: BookData = {
// // //         id,
// // //         title,
// // //         author,
// // //         coverUrl,
// // //         currentPage: 0,
// // //         file,
// // //         lastRead: new Date().toISOString()
// // //       };
      
// // //       // Add the book to our library
// // //       setBooks(prevBooks => [...prevBooks, newBook]);
      
// // //       // Reset the file input
// // //       event.target.value = '';
      
// // //       alert(`"${title}" has been added to your library!`);
// // //     } catch (error) {
// // //       console.error('Error processing EPUB file:', error);
// // //       alert('Error processing the EPUB file. Please try again.');
// // //     } finally {
// // //       setIsLoading(false);
// // //     }
// // //   };

// // //   // Open a book to read
// // //   const openBook = async (book: BookData) => {
// // //     setIsLoading(true);
// // //     setBookTitle(book.title);
// // //     setBookAuthor(book.author);
// // //     setCurrentPage(book.currentPage || 0);
    
// // //     try {
// // //       // Load the epub file again
// // //       const zip = new JSZip();
// // //       const content = await zip.loadAsync(book.file);
// // //       setBookZip(content);
      
// // //       // Find the container.xml file
// // //       const containerXml = await content.file('META-INF/container.xml')?.async('text');
// // //       if (!containerXml) {
// // //         throw new Error('Invalid EPUB: container.xml not found');
// // //       }
      
// // //       // Parse the container.xml to find the OPF file
// // //       const parser = new DOMParser();
// // //       const containerDoc = parser.parseFromString(containerXml, 'application/xml');
// // //       const rootfiles = containerDoc.getElementsByTagName('rootfile');
      
// // //       if (rootfiles.length === 0) {
// // //         throw new Error('Invalid EPUB: No rootfile found in container.xml');
// // //       }
      
// // //       // Get the path to the OPF file
// // //       const opf = rootfiles[0].getAttribute('full-path') || '';
// // //       setOpfPath(opf);
      
// // //       // Load the OPF file
// // //       const opfContent = await content.file(opf)?.async('text');
// // //       if (!opfContent) {
// // //         throw new Error('Invalid EPUB: OPF file not found');
// // //       }
      
// // //       // Parse the OPF file
// // //       const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      
// // //       // Get the spine - this defines the reading order
// // //       const spine = opfDoc.getElementsByTagName('spine')[0];
// // //       const itemrefs = spine.getElementsByTagName('itemref');
      
// // //       // Get the manifest - this maps IDs to file paths
// // //       const manifest = opfDoc.getElementsByTagName('manifest')[0];
// // //       const items = manifest.getElementsByTagName('item');
      
// // //       // Map the spine items to their file paths
// // //       const fileOrder: string[] = [];
// // //       for (let i = 0; i < itemrefs.length; i++) {
// // //         const idref = itemrefs[i].getAttribute('idref');
// // //         for (let j = 0; j < items.length; j++) {
// // //           if (items[j].getAttribute('id') === idref) {
// // //             const href = items[j].getAttribute('href') || '';
// // //             // Get the directory of the OPF file to resolve relative paths
// // //             const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
// // //             fileOrder.push(opfDir + href);
// // //             break;
// // //           }
// // //         }
// // //       }
      
// // //       setHtmlFiles(fileOrder);
// // //       setTotalPages(fileOrder.length);
      
// // //       // Get the table of contents using multiple methods
// // //       // Method 1: Check for nav document (EPUB3)
// // //       let tocPath = '';
// // //       let tocFound = false;
      
// // //       // Look for the nav document in the manifest
// // //       for (let i = 0; i < items.length; i++) {
// // //         const item = items[i];
// // //         const properties = item.getAttribute('properties');
// // //         if (properties && properties.includes('nav')) {
// // //           const href = item.getAttribute('href') || '';
// // //           // Get the directory of the OPF file to resolve relative paths
// // //           const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
// // //           tocPath = opfDir + href;
// // //           console.log("Found EPUB3 nav document at:", tocPath);
          
// // //           // Try to parse the EPUB3 nav
// // //           try {
// // //             const tocContent = await content.file(tocPath)?.async('text');
// // //             if (tocContent) {
// // //               const tocDoc = parser.parseFromString(tocContent, 'text/html');
// // //               const navs = tocDoc.getElementsByTagName('nav');
              
// // //               // Find the TOC nav element
// // //               for (let i = 0; i < navs.length; i++) {
// // //                 const nav = navs[i];
// // //                 const type = nav.getAttribute('epub:type');
// // //                 if (type === 'toc') {
// // //                   // Parse the TOC entries
// // //                   const ol = nav.getElementsByTagName('ol')[0];
// // //                   if (ol) {
// // //                     const parseTocItems = (ol: Element): TOCItem[] => {
// // //                       const items: TOCItem[] = [];
// // //                       const lis = ol.getElementsByTagName('li');
                      
// // //                       for (let j = 0; j < lis.length; j++) {
// // //                         const li = lis[j];
// // //                         const a = li.getElementsByTagName('a')[0];
// // //                         if (a) {
// // //                           const href = a.getAttribute('href') || '';
// // //                           const label = a.textContent || '';
// // //                           const id = `toc-${j}`;
                          
// // //                           const item: TOCItem = {
// // //                             id,
// // //                             href,
// // //                             label,
// // //                             children: []
// // //                           };
                          
// // //                           // Check for nested lists
// // //                           const nestedOl = li.getElementsByTagName('ol')[0];
// // //                           if (nestedOl) {
// // //                             item.children = parseTocItems(nestedOl);
// // //                           }
                          
// // //                           items.push(item);
// // //                         }
// // //                       }
                      
// // //                       return items;
// // //                     };
                    
// // //                     setToc(parseTocItems(ol));
// // //                     tocFound = true;
// // //                     break;
// // //                   }
// // //                 }
// // //               }
// // //             }
// // //           } catch (error) {
// // //             console.error("Error parsing EPUB3 nav document:", error);
// // //           }
          
// // //           break;
// // //         }
// // //       }
      
// // //       // Method 2: Check for NCX file (EPUB2)
// // //       if (!tocFound) {
// // //         // Look for the NCX file reference in the spine
// // //         const tocAttr = spine.getAttribute('toc');
// // //         if (tocAttr) {
// // //           console.log("Found toc attribute in spine:", tocAttr);
// // //           // Find the corresponding item in the manifest
// // //           for (let i = 0; i < items.length; i++) {
// // //             const item = items[i];
// // //             if (item.getAttribute('id') === tocAttr) {
// // //               const href = item.getAttribute('href') || '';
// // //               // Get the directory of the OPF file to resolve relative paths
// // //               const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
// // //               tocPath = opfDir + href;
// // //               console.log("Found EPUB2 NCX at:", tocPath);
// // //               break;
// // //             }
// // //           }
// // //         } else {
// // //           // If no toc attribute, look for an item with media-type "application/x-dtbncx+xml"
// // //           for (let i = 0; i < items.length; i++) {
// // //             const item = items[i];
// // //             if (item.getAttribute('media-type') === 'application/x-dtbncx+xml') {
// // //               const href = item.getAttribute('href') || '';
// // //               // Get the directory of the OPF file to resolve relative paths
// // //               const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
// // //               tocPath = opfDir + href;
// // //               console.log("Found EPUB2 NCX by media-type at:", tocPath);
// // //               break;
// // //             }
// // //           }
// // //         }
        
// // //         // If we found an NCX file, try to parse it
// // //         if (tocPath) {
// // //           try {
// // //             const ncxContent = await content.file(tocPath)?.async('text');
// // //             if (ncxContent) {
// // //               const ncxDoc = parser.parseFromString(ncxContent, 'application/xml');
// // //               const navPoints = ncxDoc.getElementsByTagName('navPoint');
              
// // //               if (navPoints.length > 0) {
// // //                 const tocItems: TOCItem[] = [];
                
// // //                 const processNavPoint = (navPoint: Element, index: number): TOCItem => {
// // //                   const navLabel = navPoint.getElementsByTagName('navLabel')[0];
// // //                   const text = navLabel?.getElementsByTagName('text')[0]?.textContent || '';
// // //                   const content = navPoint.getElementsByTagName('content')[0];
// // //                   const src = content?.getAttribute('src') || '';
                  
// // //                   return {
// // //                     id: `toc-${index}`,
// // //                     label: text,
// // //                     href: src,
// // //                     children: []
// // //                   };
// // //                 };
                
// // //                 // First pass: create all items
// // //                 const navPointMap = new Map<string, TOCItem>();
// // //                 for (let i = 0; i < navPoints.length; i++) {
// // //                   const navPoint = navPoints[i];
// // //                   const id = navPoint.getAttribute('id') || '';
// // //                   const item = processNavPoint(navPoint, i);
// // //                   navPointMap.set(id, item);
// // //                   tocItems.push(item);
// // //                 }
                
// // //                 // Second pass: build hierarchy
// // //                 for (let i = 0; i < navPoints.length; i++) {
// // //                   const navPoint = navPoints[i];
// // //                   const id = navPoint.getAttribute('id') || '';
// // //                   const parentNode = navPoint.parentNode;
                  
// // //                   if (parentNode && parentNode.nodeName === 'navPoint') {
// // //                     const parentId = parentNode.getAttribute('id') || '';
// // //                     const parentItem = navPointMap.get(parentId);
// // //                     const childItem = navPointMap.get(id);
                    
// // //                     if (parentItem && childItem) {
// // //                       parentItem.children.push(childItem);
// // //                       // Remove from the top level
// // //                       const index = tocItems.findIndex(item => item.id === childItem.id);
// // //                       if (index !== -1) {
// // //                         tocItems.splice(index, 1);
// // //                       }
// // //                     }
// // //                   }
// // //                 }
                
// // //                 setToc(tocItems);
// // //                 tocFound = true;
// // //               }
// // //             }
// // //           } catch (error) {
// // //             console.error("Error parsing EPUB2 NCX file:", error);
// // //           }
// // //         }
// // //       }
      
// // //       // Method 3: Create TOC from spine if no TOC found
// // //       if (!tocFound) {
// // //         console.log("No TOC found, creating from spine");
// // //         const tocItems: TOCItem[] = [];
        
// // //         for (let i = 0; i < fileOrder.length; i++) {
// // //           const filePath = fileOrder[i];
// // //           const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
// // //           const label = fileName.replace(/\.x?html?$/, '').replace(/[-_]/g, ' ');
          
// // //           tocItems.push({
// // //             id: `toc-${i}`,
// // //             label: label.charAt(0).toUpperCase() + label.slice(1), // Capitalize first letter
// // //             href: filePath.substring(opf.substring(0, opf.lastIndexOf('/') + 1).length),
// // //             children: []
// // //           });
// // //         }
        
// // //         setToc(tocItems);
// // //       }
      
// // //       // Load the first HTML file
// // //       if (fileOrder.length > 0) {
// // //         await loadPage(book.currentPage || 0);
// // //       } else {
// // //         throw new Error('No HTML files found in the EPUB');
// // //       }
      
// // //       // Update the last read date for this book
// // //       setBooks(prevBooks => 
// // //         prevBooks.map(b => 
// // //           b.id === book.id 
// // //             ? { ...b, lastRead: new Date().toISOString() } 
// // //             : b
// // //         )
// // //       );
      
// // //       // Switch to reading view
// // //       setIsReading(true);
// // //     } catch (error) {
// // //       console.error('Error opening EPUB file:', error);
// // //       alert('Error opening the EPUB file. Please try again.');
// // //     } finally {
// // //       setIsLoading(false);
// // //     }
// // //   };

// // //   // Load a specific page
// // //   const loadPage = async (pageIndex: number) => {
// // //     if (!bookZip || pageIndex < 0 || pageIndex >= htmlFiles.length) {
// // //       return;
// // //     }
    
// // //     try {
// // //       // Load the HTML content
// // //       const htmlContent = await bookZip.file(htmlFiles[pageIndex])?.async('text');
// // //       if (!htmlContent) {
// // //         throw new Error(`Could not load page ${pageIndex}`);
// // //       }
      
// // //       // Get the directory of the HTML file to resolve relative paths
// // //       const fileDir = htmlFiles[pageIndex].substring(0, htmlFiles[pageIndex].lastIndexOf('/') + 1);
      
// // //       // Process the HTML to fix relative paths
// // //       let processedHtml = htmlContent;
      
// // //       // Fix image paths
// // //       processedHtml = processedHtml.replace(
// // //         /<img([^>]*)src=["']([^"']*)["']/g,
// // //         (match, attributes, src) => {
// // //           if (src.startsWith('http')) {
// // //             return match; // Absolute URL, no changes needed
// // //           }
          
// // //           // Construct a data URL for the image
// // //           const imagePath = src.startsWith('/') ? src.substring(1) : fileDir + src;
// // //           return `<img${attributes}src="data:image/png;base64,IMAGE_PLACEHOLDER_${imagePath}"`;
// // //         }
// // //       );
      
// // //       // Fix CSS paths
// // //       processedHtml = processedHtml.replace(
// // //         /<link([^>]*)href=["']([^"']*)["']/g,
// // //         (match, attributes, href) => {
// // //           if (href.startsWith('http')) {
// // //             return match; // Absolute URL, no changes needed
// // //           }
          
// // //           // Construct a data URL for the CSS
// // //           const cssPath = href.startsWith('/') ? href.substring(1) : fileDir + href;
// // //           return `<link${attributes}href="data:text/css;base64,CSS_PLACEHOLDER_${cssPath}"`;
// // //         }
// // //       );
      
// // //       setCurrentContent(processedHtml);
// // //       setCurrentPage(pageIndex);
      
// // //       // Update the current page in the books array
// // //       if (currentBook) {
// // //         setBooks(prevBooks => 
// // //           prevBooks.map(b => 
// // //             b.id === currentBook.id 
// // //               ? { ...b, currentPage: pageIndex } 
// // //               : b
// // //           )
// // //         );
// // //       }
      
// // //       // After rendering the content, load any images
// // //       setTimeout(() => {
// // //         const content = document.querySelector('.epub-content');
// // //         if (content) {
// // //           const images = content.querySelectorAll('img[src^="data:image/png;base64,IMAGE_PLACEHOLDER_"]');
// // //           images.forEach(async (img: Element) => {
// // //             const src = (img as HTMLImageElement).src;
// // //             const imagePath = src.replace('data:image/png;base64,IMAGE_PLACEHOLDER_', '');
            
// // //             try {
// // //               const imageBlob = await bookZip.file(imagePath)?.async('blob');
// // //               if (imageBlob) {
// // //                 const imageUrl = URL.createObjectURL(imageBlob);
// // //                 (img as HTMLImageElement).src = imageUrl;
// // //               }
// // //             } catch (error) {
// // //               console.error(`Error loading image: ${imagePath}`, error);
// // //             }
// // //           });
          
// // //           const links = content.querySelectorAll('link[href^="data:text/css;base64,CSS_PLACEHOLDER_"]');
// // //           links.forEach(async (link: Element) => {
// // //             const href = (link as HTMLLinkElement).href;
// // //             const cssPath = href.replace('data:text/css;base64,CSS_PLACEHOLDER_', '');
            
// // //             try {
// // //               const cssContent = await bookZip.file(cssPath)?.async('text');
// // //               if (cssContent) {
// // //                 // Create a new style element with the CSS content
// // //                 const style = document.createElement('style');
// // //                 style.textContent = cssContent;
// // //                 link.parentNode?.replaceChild(style, link);
// // //               }
// // //             } catch (error) {
// // //               console.error(`Error loading CSS: ${cssPath}`, error);
// // //             }
// // //           });
// // //         }
// // //       }, 100);
      
// // //     } catch (error) {
// // //       console.error('Error loading page:', error);
// // //       alert(`Error loading page ${pageIndex}. Please try again.`);
// // //     }
// // //   };

// // //   // Navigate to the next page
// // //   const nextPage = () => {
// // //     if (currentPage < totalPages - 1) {
// // //       loadPage(currentPage + 1);
// // //     }
// // //   };

// // //   // Navigate to the previous page
// // //   const prevPage = () => {
// // //     if (currentPage > 0) {
// // //       loadPage(currentPage - 1);
// // //     }
// // //   };

// // //   // Navigate to a specific TOC item
// // //   const navigateToTocItem = (item: TOCItem) => {
// // //     // The href might be in various formats:
// // //     // - chapter1.html#section2
// // //     // - chapter1.html
// // //     // - ../Text/chapter1.html
// // //     // - #section (fragment only)
    
// // //     console.log("Navigating to TOC item:", item);
    
// // //     // Handle fragment-only hrefs
// // //     if (item.href.startsWith('#')) {
// // //       // Try to find the fragment in the current page
// // //       const fragment = item.href.substring(1);
// // //       const element = document.getElementById(fragment);
// // //       if (element) {
// // //         element.scrollIntoView({ behavior: 'smooth' });
// // //         return;
// // //       }
// // //       return;
// // //     }
    
// // //     // Split to get file path and optional fragment
// // //     let [filePath, fragment] = item.href.split('#');
    
// // //     // Remove any query parameters
// // //     filePath = filePath.split('?')[0];
    
// // //     // Normalize the path (handle ../ and ./)
// // //     const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
    
// // //     // Try multiple approaches to find the correct file
    
// // //     // Approach 1: Direct match
// // //     let fileIndex = htmlFiles.findIndex(file => file.endsWith(filePath));
    
// // //     // Approach 2: Try with the OPF directory
// // //     if (fileIndex === -1 && !filePath.startsWith('/')) {
// // //       const fullPath = opfDir + filePath;
// // //       fileIndex = htmlFiles.findIndex(file => file === fullPath);
// // //     }
    
// // //     // Approach 3: Try resolving relative paths
// // //     if (fileIndex === -1) {
// // //       const resolvedPath = resolveRelativePath(opfDir, filePath);
// // //       fileIndex = htmlFiles.findIndex(file => file === resolvedPath);
// // //     }
    
// // //     // Approach 4: Just match the filename
// // //     if (fileIndex === -1) {
// // //       const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
// // //       fileIndex = htmlFiles.findIndex(file => file.endsWith('/' + fileName));
// // //     }
    
// // //     console.log("File index for path:", filePath, "is:", fileIndex);
    
// // //     if (fileIndex !== -1) {
// // //       loadPage(fileIndex);
      
// // //       // If there's a fragment, scroll to it after loading
// // //       if (fragment) {
// // //         setTimeout(() => {
// // //           const element = document.getElementById(fragment);
// // //           if (element) {
// // //             element.scrollIntoView({ behavior: 'smooth' });
// // //           }
// // //         }, 300);
// // //       }
// // //     } else {
// // //       console.error("Could not find file for TOC item:", item);
// // //     }
// // //   };
  
// // //   // Helper function to resolve relative paths
// // //   const resolveRelativePath = (basePath: string, relativePath: string): string => {
// // //     // Handle ./ at the beginning (current directory)
// // //     if (relativePath.startsWith('./')) {
// // //       return basePath + relativePath.substring(2);
// // //     }
    
// // //     // Handle ../ (parent directory)
// // //     if (relativePath.startsWith('../')) {
// // //       // Remove the last directory from basePath
// // //       const basePathParts = basePath.split('/');
// // //       basePathParts.pop(); // Remove the last empty string (from trailing slash)
// // //       basePathParts.pop(); // Remove the last directory
// // //       const newBasePath = basePathParts.join('/') + '/';
      
// // //       // Remove the ../ from the relative path
// // //       const newRelativePath = relativePath.substring(3);
      
// // //       // If there are more ../, resolve recursively
// // //       if (newRelativePath.startsWith('../')) {
// // //         return resolveRelativePath(newBasePath, newRelativePath);
// // //       }
      
// // //       return newBasePath + newRelativePath;
// // //     }
    
// // //     // If it doesn't start with ./ or ../, just append to the base path
// // //     return basePath + relativePath;
// // //   };

// // //   // Toggle text-to-speech
// // //   const toggleTTS = () => {
// // //     if (isSpeaking) {
// // //       window.speechSynthesis.cancel();
// // //       setIsSpeaking(false);
// // //     } else {
// // //       const content = document.querySelector('.epub-content');
// // //       if (content) {
// // //         const text = content.textContent || '';
// // //         const utterance = new SpeechSynthesisUtterance(text);
// // //         window.speechSynthesis.speak(utterance);
// // //         setIsSpeaking(true);
        
// // //         utterance.onend = () => {
// // //           setIsSpeaking(false);
// // //         };
// // //       }
// // //     }
// // //   };

// // //   // Close the book and return to the library
// // //   const closeBook = () => {
// // //     if (isSpeaking) {
// // //       window.speechSynthesis.cancel();
// // //       setIsSpeaking(false);
// // //     }
    
// // //     setCurrentBook(null);
// // //     setBookZip(null);
// // //     setOpfPath('');
// // //     setHtmlFiles([]);
// // //     setToc([]);
// // //     setCurrentContent('');
// // //     setIsReading(false);
// // //     setBookTitle('');
// // //     setBookAuthor('');
// // //   };

// // //   // Remove a book from the library
// // //   const removeBook = (bookId: string) => {
// // //     const confirmDelete = window.confirm('Are you sure you want to remove this book from your library?');
// // //     if (confirmDelete) {
// // //       // Find the book to remove its cover URL
// // //       const book = books.find(b => b.id === bookId);
// // //       if (book && book.coverUrl) {
// // //         URL.revokeObjectURL(book.coverUrl);
// // //       }
      
// // //       setBooks(prevBooks => prevBooks.filter(b => b.id !== bookId));
// // //     }
// // //   };

// // //   // Search for text in the current page
// // //   const handleSearch = () => {
// // //     if (!searchQuery) return;
    
// // //     const content = document.querySelector('.epub-content');
// // //     if (content) {
// // //       // Remove any previous highlights
// // //       const highlights = content.querySelectorAll('.search-highlight');
// // //       highlights.forEach(highlight => {
// // //         const parent = highlight.parentNode;
// // //         if (parent) {
// // //           parent.replaceChild(document.createTextNode((highlight as HTMLElement).innerText), highlight);
// // //         }
// // //       });
      
// // //       // If the query is empty after clearing, we're done
// // //       if (!searchQuery.trim()) return;
      
// // //       // Create a walker to traverse all text nodes
// // //       const walker = document.createTreeWalker(
// // //         content,
// // //         NodeFilter.SHOW_TEXT,
// // //         {
// // //           acceptNode: (node) => {
// // //             // Skip script and style tags
// // //             const parent = node.parentNode as HTMLElement;
// // //             if (parent && ['SCRIPT', 'STYLE'].includes(parent.tagName)) {
// // //               return NodeFilter.FILTER_REJECT;
// // //             }
// // //             return NodeFilter.FILTER_ACCEPT;
// // //           }
// // //         }
// // //       );
      
// // //       // Search all text nodes
// // //       let node;
// // //       while (node = walker.nextNode()) {
// // //         const text = node.textContent || '';
// // //         const lowerText = text.toLowerCase();
// // //         const lowerQuery = searchQuery.toLowerCase();
        
// // //         let index = lowerText.indexOf(lowerQuery);
// // //         if (index !== -1) {
// // //           // We found the text, now we need to replace it with a highlighted version
// // //           const parent = node.parentNode;
// // //           if (parent) {
// // //             let currentIndex = 0;
// // //             const fragments = [];
            
// // //             // Add all instances of the search query in this text node
// // //             while (index !== -1) {
// // //               // Add the text before the match
// // //               if (index > currentIndex) {
// // //                 fragments.push(document.createTextNode(text.substring(currentIndex, index)));
// // //               }
              
// // //               // Add the highlighted match
// // //               const highlight = document.createElement('span');
// // //               highlight.className = 'search-highlight';
// // //               highlight.textContent = text.substring(index, index + searchQuery.length);
// // //               fragments.push(highlight);
              
// // //               // Update indices
// // //               currentIndex = index + searchQuery.length;
// // //               index = lowerText.indexOf(lowerQuery, currentIndex);
// // //             }
            
// // //             // Add any remaining text
// // //             if (currentIndex < text.length) {
// // //               fragments.push(document.createTextNode(text.substring(currentIndex)));
// // //             }
            
// // //             // Replace the original text node with our fragments
// // //             parent.replaceChild(fragments[0], node);
// // //             for (let i = 1; i < fragments.length; i++) {
// // //               parent.insertBefore(fragments[i], fragments[i-1].nextSibling);
// // //             }
// // //           }
// // //         }
// // //       }
      
// // //       // Scroll to the first highlight
// // //       const firstHighlight = content.querySelector('.search-highlight');
// // //       if (firstHighlight) {
// // //         firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
// // //       }
// // //     }
// // //   };

// // //   // Clear the search
// // //   const clearSearch = () => {
// // //     setSearchQuery('');
    
// // //     // Remove any highlights
// // //     const content = document.querySelector('.epub-content');
// // //     if (content) {
// // //       const highlights = content.querySelectorAll('.search-highlight');
// // //       highlights.forEach(highlight => {
// // //         const parent = highlight.parentNode;
// // //         if (parent) {
// // //           parent.replaceChild(document.createTextNode((highlight as HTMLElement).innerText), highlight);
// // //         }
// // //       });
// // //     }
// // //   };

// // //   // Get sorted books by last read date (most recent first)
// // //   const sortedBooks = [...books].sort((a, b) => 
// // //     new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
// // //   );

// // //   // Render the TOC recursively
// // //   const renderTocItems = (items: TOCItem[]) => {
// // //     return (
// // //       <ul>
// // //         {items.map(item => (
// // //           <li key={item.id}>
// // //             <button onClick={() => navigateToTocItem(item)}>{item.label}</button>
// // //             {item.children.length > 0 && renderTocItems(item.children)}
// // //           </li>
// // //         ))}
// // //       </ul>
// // //     );
// // //   };

// // //   return (
// // //     <div className="app">
// // //       {!isReading ? (
// // //         <div className="library">
// // //           <header className="library-header">
// // //             <h1>My E-Book Library</h1>
// // //             <div className="upload-container">
// // //               <label htmlFor="file-upload" className="upload-button">
// // //                 Upload Book
// // //               </label>
// // //               <input
// // //                 id="file-upload"
// // //                 type="file"
// // //                 accept=".epub"
// // //                 onChange={handleFileUpload}
// // //                 style={{ display: 'none' }}
// // //               />
// // //             </div>
// // //           </header>
          
// // //           {isLoading && (
// // //             <div className="loading">
// // //               <div className="loading-spinner"></div>
// // //               <p>Loading book...</p>
// // //             </div>
// // //           )}
          
// // //           {books.length === 0 ? (
// // //             <div className="empty-library">
// // //               <p>Your library is empty. Upload an EPUB book to get started!</p>
// // //             </div>
// // //           ) : (
// // //             <>
// // //               <h2>Recently Read</h2>
// // //               <div className="recent-books">
// // //                 {sortedBooks.slice(0, 3).map(book => (
// // //                   <div key={book.id} className="book-card recent" onClick={() => openBook(book)}>
// // //                     <div className="book-cover">
// // //                       {book.coverUrl ? (
// // //                         <img src={book.coverUrl} alt={`Cover of ${book.title}`} />
// // //                       ) : (
// // //                         <div className="default-cover">
// // //                           <span>{book.title.charAt(0)}</span>
// // //                         </div>
// // //                       )}
// // //                     </div>
// // //                     <div className="book-info">
// // //                       <h3>{book.title}</h3>
// // //                       <p>{book.author}</p>
// // //                       <p className="last-read">
// // //                         Last read: {new Date(book.lastRead).toLocaleDateString()}
// // //                       </p>
// // //                     </div>
// // //                   </div>
// // //                 ))}
// // //               </div>
              
// // //               <h2>All Books</h2>
// // //               <div className="books-grid">
// // //                 {sortedBooks.map(book => (
// // //                   <div key={book.id} className="book-card">
// // //                     <div className="book-cover" onClick={() => openBook(book)}>
// // //                       {book.coverUrl ? (
// // //                         <img src={book.coverUrl} alt={`Cover of ${book.title}`} />
// // //                       ) : (
// // //                         <div className="default-cover">
// // //                           <span>{book.title.charAt(0)}</span>
// // //                         </div>
// // //                       )}
// // //                     </div>
// // //                     <div className="book-info">
// // //                       <h3>{book.title}</h3>
// // //                       <p>{book.author}</p>
// // //                     </div>
// // //                     <div className="book-actions">
// // //                       <button onClick={(e) => {
// // //                         e.stopPropagation();
// // //                         openBook(book);
// // //                       }}>Read</button>
// // //                       <button 
// // //                         onClick={(e) => {
// // //                           e.stopPropagation();
// // //                           removeBook(book.id);
// // //                         }} 
// // //                         className="remove-book">
// // //                         Remove
// // //                       </button>
// // //                     </div>
// // //                   </div>
// // //                 ))}
// // //               </div>
// // //             </>
// // //           )}
// // //         </div>
// // //       ) : (
// // //         <div className="reader">
// // //           <header className="reader-header">
// // //             <div className="reader-nav">
// // //               <button onClick={closeBook} className="back-button">
// // //                 ← Back to Library
// // //               </button>
// // //               <h2>{bookTitle}</h2>
// // //               <p className="author">{bookAuthor}</p>
// // //             </div>
// // //             <div className="reader-controls">
// // //               <button onClick={prevPage} disabled={currentPage === 0}>Previous</button>
// // //               <span className="page-info">
// // //                 Page {currentPage + 1} of {totalPages}
// // //               </span>
// // //               <button onClick={nextPage} disabled={currentPage === totalPages - 1}>Next</button>
// // //               <button onClick={toggleTTS} className={isSpeaking ? 'active' : ''}>
// // //                 {isSpeaking ? 'Stop TTS' : 'Read Aloud'}
// // //               </button>
// // //             </div>
// // //           </header>
          
// // //           <div className="reader-container">
// // //             {isLoading && (
// // //               <div className="loading-overlay">
// // //                 <div className="loading-spinner"></div>
// // //                 <p>Loading book...</p>
// // //               </div>
// // //             )}
            
// // //             <div className="reader-sidebar">
// // //               <div className="toc-container">
// // //                 <h3>Table of Contents</h3>
// // //                 {toc.length > 0 ? renderTocItems(toc) : <p>No table of contents available</p>}
// // //               </div>
// // //             </div>
            
// // //             <div className="reader-main">
// // //               <div className="search-container">
// // //                 <input
// // //                   type="text"
// // //                   value={searchQuery}
// // //                   onChange={(e) => setSearchQuery(e.target.value)}
// // //                   placeholder="Search in current page..."
// // //                   onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
// // //                 />
// // //                 <button onClick={handleSearch}>Search</button>
// // //                 <button onClick={clearSearch}>Clear</button>
// // //               </div>
              
// // //               <div className="epub-content" dangerouslySetInnerHTML={{ __html: currentContent }}></div>
// // //             </div>
// // //           </div>
// // //         </div>
// // //       )}
// // //     </div>
// // //   );
// // // }

// // // export default App;




// // import React, { useState, useEffect } from 'react';
// // import JSZip from 'jszip';
// // import { DOMParser } from 'xmldom';
// // import './App.css';

// // interface BookData {
// //   id: string;
// //   title: string;
// //   author: string;
// //   coverUrl: string | null;
// //   currentPage: number;
// //   file: File;
// //   lastRead: string;
// // }

// // interface TOCItem {
// //   id: string;
// //   href: string;
// //   label: string;
// //   children: TOCItem[];
// // }

// // function App() {
// //   // State for the library and reading
// //   const [books, setBooks] = useState<BookData[]>([]);
// //   const [currentBook, setCurrentBook] = useState<any>(null);
// //   const [isReading, setIsReading] = useState<boolean>(false);
// //   const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
// //   const [currentPage, setCurrentPage] = useState<number>(0);
// //   const [bookTitle, setBookTitle] = useState<string>('');
// //   const [bookAuthor, setBookAuthor] = useState<string>('');
// //   const [isLoading, setIsLoading] = useState<boolean>(false);
// //   const [toc, setToc] = useState<TOCItem[]>([]);
// //   const [totalPages, setTotalPages] = useState<number>(0);
// //   const [currentContent, setCurrentContent] = useState<string>('');
// //   const [searchQuery, setSearchQuery] = useState<string>('');
// //   const [bookZip, setBookZip] = useState<JSZip | null>(null);
// //   const [opfPath, setOpfPath] = useState<string>('');
// //   const [htmlFiles, setHtmlFiles] = useState<string[]>([]);

// //   // Load books from localStorage on initial render
// //   useEffect(() => {
// //     const savedBooks = localStorage.getItem('ebooks');
// //     if (savedBooks) {
// //       // We can't save File objects in localStorage, so we need to handle that separately
// //       try {
// //         setBooks(JSON.parse(savedBooks));
// //       } catch (e) {
// //         console.error("Error loading books from localStorage", e);
// //         setBooks([]);
// //       }
// //     }
// //   }, []);

// //   // Save books to localStorage when they change
// //   useEffect(() => {
// //     if (books.length > 0) {
// //       try {
// //         // We need to serialize the books without the File objects
// //         const serializableBooks = books.map(book => {
// //           const { file, ...serializableBook } = book;
// //           return serializableBook;
// //         });
// //         localStorage.setItem('ebooks', JSON.stringify(serializableBooks));
// //       } catch (e) {
// //         console.error("Error saving books to localStorage", e);
// //       }
// //     }
// //   }, [books]);

// //   // Handle file upload
// //   const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
// //     const files = event.target.files;
// //     if (!files || files.length === 0) return;

// //     const file = files[0];
// //     const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
// //     if (fileExtension !== 'epub') {
// //       alert('Please upload an EPUB file');
// //       return;
// //     }

// //     setIsLoading(true);

// //     try {
// //       // Load the epub file using JSZip
// //       const zip = new JSZip();
// //       const content = await zip.loadAsync(file);
      
// //       // Find the container.xml file
// //       const containerXml = await content.file('META-INF/container.xml')?.async('text');
// //       if (!containerXml) {
// //         throw new Error('Invalid EPUB: container.xml not found');
// //       }
      
// //       // Parse the container.xml to find the OPF file
// //       const parser = new DOMParser();
// //       const containerDoc = parser.parseFromString(containerXml, 'application/xml');
// //       const rootfiles = containerDoc.getElementsByTagName('rootfile');
      
// //       if (rootfiles.length === 0) {
// //         throw new Error('Invalid EPUB: No rootfile found in container.xml');
// //       }
      
// //       // Get the path to the OPF file
// //       const opfPath = rootfiles[0].getAttribute('full-path') || '';
      
// //       // Load the OPF file
// //       const opfContent = await content.file(opfPath)?.async('text');
// //       if (!opfContent) {
// //         throw new Error('Invalid EPUB: OPF file not found');
// //       }
      
// //       // Parse the OPF file to get metadata
// //       const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      
// //       // Get the book title
// //       const titleElements = opfDoc.getElementsByTagName('dc:title');
// //       const title = titleElements.length > 0 
// //         ? titleElements[0].textContent || 'Unknown Title'
// //         : 'Unknown Title';
      
// //       // Get the book author
// //       const creatorElements = opfDoc.getElementsByTagName('dc:creator');
// //       const author = creatorElements.length > 0
// //         ? creatorElements[0].textContent || 'Unknown Author'
// //         : 'Unknown Author';
      
// //       // Generate a unique ID
// //       const id = Date.now().toString();
      
// //       // Find the cover image
// //       let coverUrl = null;
// //       const metaTags = opfDoc.getElementsByTagName('meta');
// //       let coverId = '';
      
// //       // Try to find the cover ID
// //       for (let i = 0; i < metaTags.length; i++) {
// //         const meta = metaTags[i];
// //         if (meta.getAttribute('name') === 'cover') {
// //           coverId = meta.getAttribute('content') || '';
// //           break;
// //         }
// //       }
      
// //       // If we found a cover ID, find the actual file
// //       if (coverId) {
// //         const items = opfDoc.getElementsByTagName('item');
// //         for (let i = 0; i < items.length; i++) {
// //           const item = items[i];
// //           if (item.getAttribute('id') === coverId) {
// //             const href = item.getAttribute('href') || '';
// //             // Get the directory of the OPF file to resolve relative paths
// //             const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
// //             const coverPath = opfDir + href;
            
// //             // Get the cover image as a blob
// //             const coverBlob = await content.file(coverPath)?.async('blob');
// //             if (coverBlob) {
// //               coverUrl = URL.createObjectURL(coverBlob);
// //             }
// //             break;
// //           }
// //         }
// //       }
      
// //       // Create a new book object
// //       const newBook: BookData = {
// //         id,
// //         title,
// //         author,
// //         coverUrl,
// //         currentPage: 0,
// //         file,
// //         lastRead: new Date().toISOString()
// //       };
      
// //       // Add the book to our library
// //       setBooks(prevBooks => [...prevBooks, newBook]);
      
// //       // Reset the file input
// //       event.target.value = '';
      
// //       alert(`"${title}" has been added to your library!`);
// //     } catch (error) {
// //       console.error('Error processing EPUB file:', error);
// //       alert('Error processing the EPUB file. Please try again.');
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   // Open a book to read
// //   const openBook = async (book: BookData) => {
// //     setIsLoading(true);
// //     setBookTitle(book.title);
// //     setBookAuthor(book.author);
// //     setCurrentPage(book.currentPage || 0);
    
// //     try {
// //       // Load the epub file again
// //       const zip = new JSZip();
// //       const content = await zip.loadAsync(book.file);
// //       setBookZip(content);
      
// //       // Find the container.xml file
// //       const containerXml = await content.file('META-INF/container.xml')?.async('text');
// //       if (!containerXml) {
// //         throw new Error('Invalid EPUB: container.xml not found');
// //       }
      
// //       // Parse the container.xml to find the OPF file
// //       const parser = new DOMParser();
// //       const containerDoc = parser.parseFromString(containerXml, 'application/xml');
// //       const rootfiles = containerDoc.getElementsByTagName('rootfile');
      
// //       if (rootfiles.length === 0) {
// //         throw new Error('Invalid EPUB: No rootfile found in container.xml');
// //       }
      
// //       // Get the path to the OPF file
// //       const opf = rootfiles[0].getAttribute('full-path') || '';
// //       setOpfPath(opf);
      
// //       // Load the OPF file
// //       const opfContent = await content.file(opf)?.async('text');
// //       if (!opfContent) {
// //         throw new Error('Invalid EPUB: OPF file not found');
// //       }
      
// //       // Parse the OPF file
// //       const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      
// //       // Get the spine - this defines the reading order
// //       const spine = opfDoc.getElementsByTagName('spine')[0];
// //       const itemrefs = spine.getElementsByTagName('itemref');
      
// //       // Get the manifest - this maps IDs to file paths
// //       const manifest = opfDoc.getElementsByTagName('manifest')[0];
// //       const items = manifest.getElementsByTagName('item');
      
// //       // Map the spine items to their file paths
// //       const fileOrder: string[] = [];
// //       for (let i = 0; i < itemrefs.length; i++) {
// //         const idref = itemrefs[i].getAttribute('idref');
// //         for (let j = 0; j < items.length; j++) {
// //           if (items[j].getAttribute('id') === idref) {
// //             const href = items[j].getAttribute('href') || '';
// //             // Get the directory of the OPF file to resolve relative paths
// //             const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
// //             fileOrder.push(opfDir + href);
// //             break;
// //           }
// //         }
// //       }
      
// //       setHtmlFiles(fileOrder);
// //       setTotalPages(fileOrder.length);
      
// //       // Get the table of contents using multiple methods
// //       // Method 1: Check for nav document (EPUB3)
// //       let tocPath = '';
// //       let tocFound = false;
      
// //       // Look for the nav document in the manifest
// //       for (let i = 0; i < items.length; i++) {
// //         const item = items[i];
// //         const properties = item.getAttribute('properties');
// //         if (properties && properties.includes('nav')) {
// //           const href = item.getAttribute('href') || '';
// //           // Get the directory of the OPF file to resolve relative paths
// //           const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
// //           tocPath = opfDir + href;
// //           console.log("Found EPUB3 nav document at:", tocPath);
          
// //           // Try to parse the EPUB3 nav
// //           try {
// //             const tocContent = await content.file(tocPath)?.async('text');
// //             if (tocContent) {
// //               const tocDoc = parser.parseFromString(tocContent, 'text/html');
// //               const navs = tocDoc.getElementsByTagName('nav');
              
// //               // Find the TOC nav element
// //               for (let i = 0; i < navs.length; i++) {
// //                 const nav = navs[i];
// //                 const type = nav.getAttribute('epub:type');
// //                 if (type === 'toc') {
// //                   // Parse the TOC entries
// //                   const ol = nav.getElementsByTagName('ol')[0];
// //                   if (ol) {
// //                     const parseTocItems = (ol: Element): TOCItem[] => {
// //                       const items: TOCItem[] = [];
// //                       const lis = ol.getElementsByTagName('li');
                      
// //                       for (let j = 0; j < lis.length; j++) {
// //                         const li = lis[j];
// //                         const a = li.getElementsByTagName('a')[0];
// //                         if (a) {
// //                           const href = a.getAttribute('href') || '';
// //                           const label = a.textContent || '';
// //                           const id = `toc-${j}`;
                          
// //                           const item: TOCItem = {
// //                             id,
// //                             href,
// //                             label,
// //                             children: []
// //                           };
                          
// //                           // Check for nested lists
// //                           const nestedOl = li.getElementsByTagName('ol')[0];
// //                           if (nestedOl) {
// //                             item.children = parseTocItems(nestedOl);
// //                           }
                          
// //                           items.push(item);
// //                         }
// //                       }
                      
// //                       return items;
// //                     };
                    
// //                     setToc(parseTocItems(ol));
// //                     tocFound = true;
// //                     break;
// //                   }
// //                 }
// //               }
// //             }
// //           } catch (error) {
// //             console.error("Error parsing EPUB3 nav document:", error);
// //           }
          
// //           break;
// //         }
// //       }
      
// //       // Method 2: Check for NCX file (EPUB2)
// //       if (!tocFound) {
// //         // Look for the NCX file reference in the spine
// //         const tocAttr = spine.getAttribute('toc');
// //         if (tocAttr) {
// //           console.log("Found toc attribute in spine:", tocAttr);
// //           // Find the corresponding item in the manifest
// //           for (let i = 0; i < items.length; i++) {
// //             const item = items[i];
// //             if (item.getAttribute('id') === tocAttr) {
// //               const href = item.getAttribute('href') || '';
// //               // Get the directory of the OPF file to resolve relative paths
// //               const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
// //               tocPath = opfDir + href;
// //               console.log("Found EPUB2 NCX at:", tocPath);
// //               break;
// //             }
// //           }
// //         } else {
// //           // If no toc attribute, look for an item with media-type "application/x-dtbncx+xml"
// //           for (let i = 0; i < items.length; i++) {
// //             const item = items[i];
// //             if (item.getAttribute('media-type') === 'application/x-dtbncx+xml') {
// //               const href = item.getAttribute('href') || '';
// //               // Get the directory of the OPF file to resolve relative paths
// //               const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
// //               tocPath = opfDir + href;
// //               console.log("Found EPUB2 NCX by media-type at:", tocPath);
// //               break;
// //             }
// //           }
// //         }
        
// //         // If we found an NCX file, try to parse it
// //         if (tocPath) {
// //           try {
// //             const ncxContent = await content.file(tocPath)?.async('text');
// //             if (ncxContent) {
// //               const ncxDoc = parser.parseFromString(ncxContent, 'application/xml');
// //               const navPoints = ncxDoc.getElementsByTagName('navPoint');
              
// //               if (navPoints.length > 0) {
// //                 const tocItems: TOCItem[] = [];
                
// //                 const processNavPoint = (navPoint: Element, index: number): TOCItem => {
// //                   const navLabel = navPoint.getElementsByTagName('navLabel')[0];
// //                   const text = navLabel?.getElementsByTagName('text')[0]?.textContent || '';
// //                   const content = navPoint.getElementsByTagName('content')[0];
// //                   const src = content?.getAttribute('src') || '';
                  
// //                   return {
// //                     id: `toc-${index}`,
// //                     label: text,
// //                     href: src,
// //                     children: []
// //                   };
// //                 };
                
// //                 // First pass: create all items
// //                 const navPointMap = new Map<string, TOCItem>();
// //                 for (let i = 0; i < navPoints.length; i++) {
// //                   const navPoint = navPoints[i];
// //                   const id = navPoint.getAttribute('id') || '';
// //                   const item = processNavPoint(navPoint, i);
// //                   navPointMap.set(id, item);
// //                   tocItems.push(item);
// //                 }
                
// //                 // Second pass: build hierarchy
// //                 for (let i = 0; i < navPoints.length; i++) {
// //                   const navPoint = navPoints[i];
// //                   const id = navPoint.getAttribute('id') || '';
// //                   const parentNode = navPoint.parentNode as Element;
                  
// //                   if (parentNode && parentNode.nodeName === 'navPoint') {
// //                     const parentId = parentNode.getAttribute('id') || '';
// //                     const parentItem = navPointMap.get(parentId);
// //                     const childItem = navPointMap.get(id);
                    
// //                     if (parentItem && childItem) {
// //                       parentItem.children.push(childItem);
// //                       // Remove from the top level
// //                       const index = tocItems.findIndex(item => item.id === childItem.id);
// //                       if (index !== -1) {
// //                         tocItems.splice(index, 1);
// //                       }
// //                     }
// //                   }
// //                 }
                
// //                 setToc(tocItems);
// //                 tocFound = true;
// //               }
// //             }
// //           } catch (error) {
// //             console.error("Error parsing EPUB2 NCX file:", error);
// //           }
// //         }
// //       }
      
// //       // Method 3: Create TOC from spine if no TOC found
// //       if (!tocFound) {
// //         console.log("No TOC found, creating from spine");
// //         const tocItems: TOCItem[] = [];
        
// //         for (let i = 0; i < fileOrder.length; i++) {
// //           const filePath = fileOrder[i];
// //           const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
// //           const label = fileName.replace(/\.x?html?$/, '').replace(/[-_]/g, ' ');
          
// //           tocItems.push({
// //             id: `toc-${i}`,
// //             label: label.charAt(0).toUpperCase() + label.slice(1), // Capitalize first letter
// //             href: filePath.substring(opf.substring(0, opf.lastIndexOf('/') + 1).length),
// //             children: []
// //           });
// //         }
        
// //         setToc(tocItems);
// //       }
      
// //       // Load the first HTML file
// //       if (fileOrder.length > 0) {
// //         await loadPage(book.currentPage || 0);
// //       } else {
// //         throw new Error('No HTML files found in the EPUB');
// //       }
      
// //       // Update the last read date for this book
// //       setBooks(prevBooks => 
// //         prevBooks.map(b => 
// //           b.id === book.id 
// //             ? { ...b, lastRead: new Date().toISOString() } 
// //             : b
// //         )
// //       );
      
// //       // Switch to reading view
// //       setIsReading(true);
// //     } catch (error) {
// //       console.error('Error opening EPUB file:', error);
// //       alert('Error opening the EPUB file. Please try again.');
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   // Load a specific page
// //   const loadPage = async (pageIndex: number) => {
// //     if (!bookZip || pageIndex < 0 || pageIndex >= htmlFiles.length) {
// //       return;
// //     }
    
// //     try {
// //       // Load the HTML content
// //       const htmlContent = await bookZip.file(htmlFiles[pageIndex])?.async('text');
// //       if (!htmlContent) {
// //         throw new Error(`Could not load page ${pageIndex}`);
// //       }
      
// //       // Get the directory of the HTML file to resolve relative paths
// //       const fileDir = htmlFiles[pageIndex].substring(0, htmlFiles[pageIndex].lastIndexOf('/') + 1);
      
// //       // Process the HTML to fix relative paths
// //       let processedHtml = htmlContent;
      
// //       // Fix image paths
// //       processedHtml = processedHtml.replace(
// //         /<img([^>]*)src=["']([^"']*)["']/g,
// //         (match, attributes, src) => {
// //           if (src.startsWith('http')) {
// //             return match; // Absolute URL, no changes needed
// //           }
          
// //           // Construct a data URL for the image
// //           const imagePath = src.startsWith('/') ? src.substring(1) : fileDir + src;
// //           return `<img${attributes}src="data:image/png;base64,IMAGE_PLACEHOLDER_${imagePath}"`;
// //         }
// //       );
      
// //       // Fix CSS paths
// //       processedHtml = processedHtml.replace(
// //         /<link([^>]*)href=["']([^"']*)["']/g,
// //         (match, attributes, href) => {
// //           if (href.startsWith('http')) {
// //             return match; // Absolute URL, no changes needed
// //           }
          
// //           // Construct a data URL for the CSS
// //           const cssPath = href.startsWith('/') ? href.substring(1) : fileDir + href;
// //           return `<link${attributes}href="data:text/css;base64,CSS_PLACEHOLDER_${cssPath}"`;
// //         }
// //       );
      
// //       setCurrentContent(processedHtml);
// //       setCurrentPage(pageIndex);
      
// //       // Update the current page in the books array
// //       if (currentBook) {
// //         setBooks(prevBooks => 
// //           prevBooks.map(b => 
// //             b.id === currentBook.id 
// //               ? { ...b, currentPage: pageIndex } 
// //               : b
// //           )
// //         );
// //       }
      
// //       // After rendering the content, load any images
// //       setTimeout(() => {
// //         const content = document.querySelector('.epub-content');
// //         if (content) {
// //           const images = content.querySelectorAll('img[src^="data:image/png;base64,IMAGE_PLACEHOLDER_"]');
// //           images.forEach(async (img: Element) => {
// //             const src = (img as HTMLImageElement).src;
// //             const imagePath = src.replace('data:image/png;base64,IMAGE_PLACEHOLDER_', '');
            
// //             try {
// //               const imageBlob = await bookZip.file(imagePath)?.async('blob');
// //               if (imageBlob) {
// //                 const imageUrl = URL.createObjectURL(imageBlob);
// //                 (img as HTMLImageElement).src = imageUrl;
// //               }
// //             } catch (error) {
// //               console.error(`Error loading image: ${imagePath}`, error);
// //             }
// //           });
          
// //           const links = content.querySelectorAll('link[href^="data:text/css;base64,CSS_PLACEHOLDER_"]');
// //           links.forEach(async (link: Element) => {
// //             const href = (link as HTMLLinkElement).href;
// //             const cssPath = href.replace('data:text/css;base64,CSS_PLACEHOLDER_', '');
            
// //             try {
// //               const cssContent = await bookZip.file(cssPath)?.async('text');
// //               if (cssContent) {
// //                 // Create a new style element with the CSS content
// //                 const style = document.createElement('style');
// //                 style.textContent = cssContent;
// //                 link.parentNode?.replaceChild(style, link);
// //               }
// //             } catch (error) {
// //               console.error(`Error loading CSS: ${cssPath}`, error);
// //             }
// //           });
// //         }
// //       }, 100);
      
// //     } catch (error) {
// //       console.error('Error loading page:', error);
// //       alert(`Error loading page ${pageIndex}. Please try again.`);
// //     }
// //   };

// //   // Navigate to the next page
// //   const nextPage = () => {
// //     if (currentPage < totalPages - 1) {
// //       loadPage(currentPage + 1);
// //     }
// //   };

// //   // Navigate to the previous page
// //   const prevPage = () => {
// //     if (currentPage > 0) {
// //       loadPage(currentPage - 1);
// //     }
// //   };

// //   // Navigate to a specific TOC item
// //   const navigateToTocItem = (item: TOCItem) => {
// //     // The href might be in various formats:
// //     // - chapter1.html#section2
// //     // - chapter1.html
// //     // - ../Text/chapter1.html
// //     // - #section (fragment only)
    
// //     console.log("Navigating to TOC item:", item);
    
// //     // Handle fragment-only hrefs
// //     if (item.href.startsWith('#')) {
// //       // Try to find the fragment in the current page
// //       const fragment = item.href.substring(1);
// //       const element = document.getElementById(fragment);
// //       if (element) {
// //         element.scrollIntoView({ behavior: 'smooth' });
// //         return;
// //       }
// //       return;
// //     }
    
// //     // Split to get file path and optional fragment
// //     let [filePath, fragment] = item.href.split('#');
    
// //     // Remove any query parameters
// //     filePath = filePath.split('?')[0];
    
// //     // Normalize the path (handle ../ and ./)
// //     const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
    
// //     // Try multiple approaches to find the correct file
    
// //     // Approach 1: Direct match
// //     let fileIndex = htmlFiles.findIndex(file => file.endsWith(filePath));
    
// //     // Approach 2: Try with the OPF directory
// //     if (fileIndex === -1 && !filePath.startsWith('/')) {
// //       const fullPath = opfDir + filePath;
// //       fileIndex = htmlFiles.findIndex(file => file === fullPath);
// //     }
    
// //     // Approach 3: Try resolving relative paths
// //     if (fileIndex === -1) {
// //       const resolvedPath = resolveRelativePath(opfDir, filePath);
// //       fileIndex = htmlFiles.findIndex(file => file === resolvedPath);
// //     }
    
// //     // Approach 4: Just match the filename
// //     if (fileIndex === -1) {
// //       const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
// //       fileIndex = htmlFiles.findIndex(file => file.endsWith('/' + fileName));
// //     }
    
// //     console.log("File index for path:", filePath, "is:", fileIndex);
    
// //     if (fileIndex !== -1) {
// //       loadPage(fileIndex);
      
// //       // If there's a fragment, scroll to it after loading
// //       if (fragment) {
// //         setTimeout(() => {
// //           const element = document.getElementById(fragment);
// //           if (element) {
// //             element.scrollIntoView({ behavior: 'smooth' });
// //           }
// //         }, 300);
// //       }
// //     } else {
// //       console.error("Could not find file for TOC item:", item);
// //     }
// //   };
  
// //   // Helper function to resolve relative paths
// //   const resolveRelativePath = (basePath: string, relativePath: string): string => {
// //     // Handle ./ at the beginning (current directory)
// //     if (relativePath.startsWith('./')) {
// //       return basePath + relativePath.substring(2);
// //     }
    
// //     // Handle ../ (parent directory)
// //     if (relativePath.startsWith('../')) {
// //       // Remove the last directory from basePath
// //       const basePathParts = basePath.split('/');
// //       basePathParts.pop(); // Remove the last empty string (from trailing slash)
// //       basePathParts.pop(); // Remove the last directory
// //       const newBasePath = basePathParts.join('/') + '/';
      
// //       // Remove the ../ from the relative path
// //       const newRelativePath = relativePath.substring(3);
      
// //       // If there are more ../, resolve recursively
// //       if (newRelativePath.startsWith('../')) {
// //         return resolveRelativePath(newBasePath, newRelativePath);
// //       }
      
// //       return newBasePath + newRelativePath;
// //     }
    
// //     // If it doesn't start with ./ or ../, just append to the base path
// //     return basePath + relativePath;
// //   };

// //   // Toggle text-to-speech
// //   const toggleTTS = () => {
// //     if (isSpeaking) {
// //       window.speechSynthesis.cancel();
// //       setIsSpeaking(false);
// //     } else {
// //       const content = document.querySelector('.epub-content');
// //       if (content) {
// //         const text = content.textContent || '';
// //         const utterance = new SpeechSynthesisUtterance(text);
// //         window.speechSynthesis.speak(utterance);
// //         setIsSpeaking(true);
        
// //         utterance.onend = () => {
// //           setIsSpeaking(false);
// //         };
// //       }
// //     }
// //   };

// //   // Close the book and return to the library
// //   const closeBook = () => {
// //     if (isSpeaking) {
// //       window.speechSynthesis.cancel();
// //       setIsSpeaking(false);
// //     }
    
// //     setCurrentBook(null);
// //     setBookZip(null);
// //     setOpfPath('');
// //     setHtmlFiles([]);
// //     setToc([]);
// //     setCurrentContent('');
// //     setIsReading(false);
// //     setBookTitle('');
// //     setBookAuthor('');
// //   };

// //   // Remove a book from the library
// //   const removeBook = (bookId: string) => {
// //     const confirmDelete = window.confirm('Are you sure you want to remove this book from your library?');
// //     if (confirmDelete) {
// //       // Find the book to remove its cover URL
// //       const book = books.find(b => b.id === bookId);
// //       if (book && book.coverUrl) {
// //         URL.revokeObjectURL(book.coverUrl);
// //       }
      
// //       setBooks(prevBooks => prevBooks.filter(b => b.id !== bookId));
// //     }
// //   };

// //   // Search for text in the current page
// //   const handleSearch = () => {
// //     if (!searchQuery) return;
    
// //     const content = document.querySelector('.epub-content');
// //     if (content) {
// //       // Remove any previous highlights
// //       const highlights = content.querySelectorAll('.search-highlight');
// //       highlights.forEach(highlight => {
// //         const parent = highlight.parentNode;
// //         if (parent) {
// //           parent.replaceChild(document.createTextNode((highlight as HTMLElement).innerText), highlight);
// //         }
// //       });
      
// //       // If the query is empty after clearing, we're done
// //       if (!searchQuery.trim()) return;
      
// //       // Create a walker to traverse all text nodes
// //       const walker = document.createTreeWalker(
// //         content,
// //         NodeFilter.SHOW_TEXT,
// //         {
// //           acceptNode: (node) => {
// //             // Skip script and style tags
// //             const parent = node.parentNode as HTMLElement;
// //             if (parent && ['SCRIPT', 'STYLE'].includes(parent.tagName)) {
// //               return NodeFilter.FILTER_REJECT;
// //             }
// //             return NodeFilter.FILTER_ACCEPT;
// //           }
// //         }
// //       );
      
// //       // Search all text nodes
// //       let node;
// //       while (node = walker.nextNode()) {
// //         const text = node.textContent || '';
// //         const lowerText = text.toLowerCase();
// //         const lowerQuery = searchQuery.toLowerCase();
        
// //         let index = lowerText.indexOf(lowerQuery);
// //         if (index !== -1) {
// //           // We found the text, now we need to replace it with a highlighted version
// //           const parent = node.parentNode;
// //           if (parent) {
// //             let currentIndex = 0;
// //             const fragments = [];
            
// //             // Add all instances of the search query in this text node
// //             while (index !== -1) {
// //               // Add the text before the match
// //               if (index > currentIndex) {
// //                 fragments.push(document.createTextNode(text.substring(currentIndex, index)));
// //               }
              
// //               // Add the highlighted match
// //               const highlight = document.createElement('span');
// //               highlight.className = 'search-highlight';
// //               highlight.textContent = text.substring(index, index + searchQuery.length);
// //               fragments.push(highlight);
              
// //               // Update indices
// //               currentIndex = index + searchQuery.length;
// //               index = lowerText.indexOf(lowerQuery, currentIndex);
// //             }
            
// //             // Add any remaining text
// //             if (currentIndex < text.length) {
// //               fragments.push(document.createTextNode(text.substring(currentIndex)));
// //             }
            
// //             // Replace the original text node with our fragments
// //             parent.replaceChild(fragments[0], node);
// //             for (let i = 1; i < fragments.length; i++) {
// //               parent.insertBefore(fragments[i], fragments[i-1].nextSibling);
// //             }
// //           }
// //         }
// //       }
      
// //       // Scroll to the first highlight
// //       const firstHighlight = content.querySelector('.search-highlight');
// //       if (firstHighlight) {
// //         firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
// //       }
// //     }
// //   };

// //   // Clear the search
// //   const clearSearch = () => {
// //     setSearchQuery('');
    
// //     // Remove any highlights
// //     const content = document.querySelector('.epub-content');
// //     if (content) {
// //       const highlights = content.querySelectorAll('.search-highlight');
// //       highlights.forEach(highlight => {
// //         const parent = highlight.parentNode;
// //         if (parent) {
// //           parent.replaceChild(document.createTextNode((highlight as HTMLElement).innerText), highlight);
// //         }
// //       });
// //     }
// //   };

// //   // Get sorted books by last read date (most recent first)
// //   const sortedBooks = [...books].sort((a, b) => 
// //     new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
// //   );

// //   // Render the TOC recursively
// //   const renderTocItems = (items: TOCItem[]) => {
// //     return (
// //       <ul>
// //         {items.map(item => (
// //           <li key={item.id}>
// //             <button onClick={() => navigateToTocItem(item)}>{item.label}</button>
// //             {item.children.length > 0 && renderTocItems(item.children)}
// //           </li>
// //         ))}
// //       </ul>
// //     );
// //   };

// //   return (
// //     <div className="app">
// //       {!isReading ? (
// //         <div className="library">
// //           <header className="library-header">
// //             <h1>My E-Book Library</h1>
// //             <div className="upload-container">
// //               <label htmlFor="file-upload" className="upload-button">
// //                 Upload Book
// //               </label>
// //               <input
// //                 id="file-upload"
// //                 type="file"
// //                 accept=".epub"
// //                 onChange={handleFileUpload}
// //                 style={{ display: 'none' }}
// //               />
// //             </div>
// //           </header>
          
// //           {isLoading && (
// //             <div className="loading">
// //               <div className="loading-spinner"></div>
// //               <p>Loading book...</p>
// //             </div>
// //           )}
          
// //           {books.length === 0 ? (
// //             <div className="empty-library">
// //               <p>Your library is empty. Upload an EPUB book to get started!</p>
// //             </div>
// //           ) : (
// //             <>
// //               <h2>Recently Read</h2>
// //               <div className="recent-books">
// //                 {sortedBooks.slice(0, 3).map(book => (
// //                   <div key={book.id} className="book-card recent" onClick={() => openBook(book)}>
// //                     <div className="book-cover">
// //                       {book.coverUrl ? (
// //                         <img src={book.coverUrl} alt={`Cover of ${book.title}`} />
// //                       ) : (
// //                         <div className="default-cover">
// //                           <span>{book.title.charAt(0)}</span>
// //                         </div>
// //                       )}
// //                     </div>
// //                     <div className="book-info">
// //                       <h3>{book.title}</h3>
// //                       <p>{book.author}</p>
// //                       <p className="last-read">
// //                         Last read: {new Date(book.lastRead).toLocaleDateString()}
// //                       </p>
// //                     </div>
// //                   </div>
// //                 ))}
// //               </div>
              
// //               <h2>All Books</h2>
// //               <div className="books-grid">
// //                 {sortedBooks.map(book => (
// //                   <div key={book.id} className="book-card">
// //                     <div className="book-cover" onClick={() => openBook(book)}>
// //                       {book.coverUrl ? (
// //                         <img src={book.coverUrl} alt={`Cover of ${book.title}`} />
// //                       ) : (
// //                         <div className="default-cover">
// //                           <span>{book.title.charAt(0)}</span>
// //                         </div>
// //                       )}
// //                     </div>
// //                     <div className="book-info">
// //                       <h3>{book.title}</h3>
// //                       <p>{book.author}</p>
// //                     </div>
// //                     <div className="book-actions">
// //                       <button onClick={(e) => {
// //                         e.stopPropagation();
// //                         openBook(book);
// //                       }}>Read</button>
// //                       <button 
// //                         onClick={(e) => {
// //                           e.stopPropagation();
// //                           removeBook(book.id);
// //                         }} 
// //                         className="remove-book">
// //                         Remove
// //                       </button>
// //                     </div>
// //                   </div>
// //                 ))}
// //               </div>
// //             </>
// //           )}
// //         </div>
// //       ) : (
// //         <div className="reader">
// //           <header className="reader-header">
// //             <div className="reader-nav">
// //               <button onClick={closeBook} className="back-button">
// //                 ← Back to Library
// //               </button>
// //               <h2>{bookTitle}</h2>
// //               <p className="author">{bookAuthor}</p>
// //             </div>
// //             <div className="reader-controls">
// //               <button onClick={prevPage} disabled={currentPage === 0}>Previous</button>
// //               <span className="page-info">
// //                 Page {currentPage + 1} of {totalPages}
// //               </span>
// //               <button onClick={nextPage} disabled={currentPage === totalPages - 1}>Next</button>
// //               <button onClick={toggleTTS} className={isSpeaking ? 'active' : ''}>
// //                 {isSpeaking ? 'Stop TTS' : 'Read Aloud'}
// //               </button>
// //             </div>
// //           </header>
          
// //           <div className="reader-container">
// //             {isLoading && (
// //               <div className="loading-overlay">
// //                 <div className="loading-spinner"></div>
// //                 <p>Loading book...</p>
// //               </div>
// //             )}
            
// //             <div className="reader-sidebar">
// //               <div className="toc-container">
// //                 <h3>Table of Contents</h3>
// //                 {toc.length > 0 ? renderTocItems(toc) : <p>No table of contents available</p>}
// //               </div>
// //             </div>
            
// //             <div className="reader-main">
// //               <div className="search-container">
// //                 <input
// //                   type="text"
// //                   value={searchQuery}
// //                   onChange={(e) => setSearchQuery(e.target.value)}
// //                   placeholder="Search in current page..."
// //                   onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
// //                 />
// //                 <button onClick={handleSearch}>Search</button>
// //                 <button onClick={clearSearch}>Clear</button>
// //               </div>
              
// //               <div className="epub-content" dangerouslySetInnerHTML={{ __html: currentContent }}></div>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // export default App;


// import React, { useState, useEffect } from 'react';
// import JSZip from 'jszip';
// import { DOMParser } from 'xmldom';
// import './App.css';

// // First let's create the SimplePlayMode component directly in App.tsx for simplicity
// // We'll move it to its own file later if everything works

// interface SimplePlayModeProps {
//   currentPageContent: string;
//   onClose: () => void;
// }

// const SimplePlayMode: React.FC<SimplePlayModeProps> = ({
//   currentPageContent,
//   onClose
// }) => {
//   // State to track if audio is playing
//   const [isPlaying, setIsPlaying] = useState(false);
  
//   // Basic function to start speech synthesis
//   const startSpeech = () => {
//     if ('speechSynthesis' in window) {
//       const utterance = new SpeechSynthesisUtterance(currentPageContent);
//       utterance.onend = () => {
//         setIsPlaying(false);
//       };
//       window.speechSynthesis.speak(utterance);
//       setIsPlaying(true);
//     } else {
//       alert('Speech synthesis not supported in your browser');
//     }
//   };
  
//   // Function to stop speech
//   const stopSpeech = () => {
//     if ('speechSynthesis' in window) {
//       window.speechSynthesis.cancel();
//       setIsPlaying(false);
//     }
//   };

//   // Clear speech synthesis when component unmounts
//   useEffect(() => {
//     return () => {
//       if ('speechSynthesis' in window) {
//         window.speechSynthesis.cancel();
//       }
//     };
//   }, []);

//   return (
//     <div className="simple-play-mode">
//       <div className="play-mode-content">
//         <div className="play-mode-header">
//           <h2>Audio Player</h2>
//           <button onClick={onClose} className="close-button">×</button>
//         </div>
        
//         <div className="play-mode-text">
//           <p>{currentPageContent.slice(0, 200)}...</p>
//         </div>
        
//         <div className="play-mode-controls">
//           {!isPlaying ? (
//             <button onClick={startSpeech}>Play</button>
//           ) : (
//             <button onClick={stopSpeech}>Stop</button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// // Add CSS styles for SimplePlayMode
// const playModeStyles = `
// .simple-play-mode {
//   position: fixed;
//   top: 0;
//   left: 0;
//   right: 0;
//   bottom: 0;
//   background-color: rgba(0, 0, 0, 0.7);
//   display: flex;
//   justify-content: center;
//   align-items: center;
//   z-index: 1000;
// }

// .play-mode-content {
//   background-color: white;
//   border-radius: 8px;
//   width: 90%;
//   max-width: 500px;
//   max-height: 80vh;
//   overflow-y: auto;
//   padding: 20px;
//   box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
// }

// .play-mode-header {
//   display: flex;
//   justify-content: space-between;
//   align-items: center;
//   margin-bottom: 20px;
//   border-bottom: 1px solid #eee;
//   padding-bottom: 10px;
// }

// .play-mode-header h2 {
//   margin: 0;
//   font-size: 1.5rem;
// }

// .close-button {
//   background: none;
//   border: none;
//   font-size: 1.5rem;
//   cursor: pointer;
//   color: #666;
// }

// .close-button:hover {
//   color: #333;
// }

// .play-mode-text {
//   margin-bottom: 20px;
//   max-height: 200px;
//   overflow-y: auto;
//   padding: 10px;
//   background-color: #f9f9f9;
//   border-radius: 4px;
// }

// .play-mode-controls {
//   display: flex;
//   justify-content: center;
// }

// .play-mode-controls button {
//   background-color: #4a69bd;
//   color: white;
//   border: none;
//   padding: 10px 20px;
//   border-radius: 4px;
//   cursor: pointer;
//   font-size: 1rem;
// }

// .play-mode-controls button:hover {
//   background-color: #3867a9;
// }
// `;

// interface BookData {
//   id: string;
//   title: string;
//   author: string;
//   coverUrl: string | null;
//   currentPage: number;
//   file: File;
//   lastRead: string;
// }

// interface TOCItem {
//   id: string;
//   href: string;
//   label: string;
//   children: TOCItem[];
// }

// function App() {
//   // State for the library and reading
//   const [books, setBooks] = useState<BookData[]>([]);
//   const [currentBook, setCurrentBook] = useState<any>(null);
//   const [isReading, setIsReading] = useState<boolean>(false);
//   const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
//   const [currentPage, setCurrentPage] = useState<number>(0);
//   const [bookTitle, setBookTitle] = useState<string>('');
//   const [bookAuthor, setBookAuthor] = useState<string>('');
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [toc, setToc] = useState<TOCItem[]>([]);
//   const [totalPages, setTotalPages] = useState<number>(0);
//   const [currentContent, setCurrentContent] = useState<string>('');
//   const [searchQuery, setSearchQuery] = useState<string>('');
//   const [bookZip, setBookZip] = useState<JSZip | null>(null);
//   const [opfPath, setOpfPath] = useState<string>('');
//   const [htmlFiles, setHtmlFiles] = useState<string[]>([]);
  
//   // New state for SimplePlayMode
//   const [isPlayModeVisible, setIsPlayModeVisible] = useState<boolean>(false);
//   const [currentPageText, setCurrentPageText] = useState<string>('');

//   // Load books from localStorage on initial render
//   useEffect(() => {
//     // Add the styles to the document head
//     const styleElement = document.createElement('style');
//     styleElement.innerHTML = playModeStyles;
//     document.head.appendChild(styleElement);
    
//     // Load books from localStorage
//     const savedBooks = localStorage.getItem('ebooks');
//     if (savedBooks) {
//       // We can't save File objects in localStorage, so we need to handle that separately
//       try {
//         setBooks(JSON.parse(savedBooks));
//       } catch (e) {
//         console.error("Error loading books from localStorage", e);
//         setBooks([]);
//       }
//     }
    
//     // Clean up styles when component unmounts
//     return () => {
//       document.head.removeChild(styleElement);
//     };
//   }, []);

//   // Save books to localStorage when they change
//   useEffect(() => {
//     if (books.length > 0) {
//       try {
//         // We need to serialize the books without the File objects
//         const serializableBooks = books.map(book => {
//           const { file, ...serializableBook } = book;
//           return serializableBook;
//         });
//         localStorage.setItem('ebooks', JSON.stringify(serializableBooks));
//       } catch (e) {
//         console.error("Error saving books to localStorage", e);
//       }
//     }
//   }, [books]);

//   // Handle file upload
//   const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
//     const files = event.target.files;
//     if (!files || files.length === 0) return;

//     const file = files[0];
//     const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
//     if (fileExtension !== 'epub') {
//       alert('Please upload an EPUB file');
//       return;
//     }

//     setIsLoading(true);

//     try {
//       // Load the epub file using JSZip
//       const zip = new JSZip();
//       const content = await zip.loadAsync(file);
      
//       // Find the container.xml file
//       const containerXml = await content.file('META-INF/container.xml')?.async('text');
//       if (!containerXml) {
//         throw new Error('Invalid EPUB: container.xml not found');
//       }
      
//       // Parse the container.xml to find the OPF file
//       const parser = new DOMParser();
//       const containerDoc = parser.parseFromString(containerXml, 'application/xml');
//       const rootfiles = containerDoc.getElementsByTagName('rootfile');
      
//       if (rootfiles.length === 0) {
//         throw new Error('Invalid EPUB: No rootfile found in container.xml');
//       }
      
//       // Get the path to the OPF file
//       const opfPath = rootfiles[0].getAttribute('full-path') || '';
      
//       // Load the OPF file
//       const opfContent = await content.file(opfPath)?.async('text');
//       if (!opfContent) {
//         throw new Error('Invalid EPUB: OPF file not found');
//       }
      
//       // Parse the OPF file to get metadata
//       const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      
//       // Get the book title
//       const titleElements = opfDoc.getElementsByTagName('dc:title');
//       const title = titleElements.length > 0 
//         ? titleElements[0].textContent || 'Unknown Title'
//         : 'Unknown Title';
      
//       // Get the book author
//       const creatorElements = opfDoc.getElementsByTagName('dc:creator');
//       const author = creatorElements.length > 0
//         ? creatorElements[0].textContent || 'Unknown Author'
//         : 'Unknown Author';
      
//       // Generate a unique ID
//       const id = Date.now().toString();
      
//       // Find the cover image
//       let coverUrl = null;
//       const metaTags = opfDoc.getElementsByTagName('meta');
//       let coverId = '';
      
//       // Try to find the cover ID
//       for (let i = 0; i < metaTags.length; i++) {
//         const meta = metaTags[i];
//         if (meta.getAttribute('name') === 'cover') {
//           coverId = meta.getAttribute('content') || '';
//           break;
//         }
//       }
      
//       // If we found a cover ID, find the actual file
//       if (coverId) {
//         const items = opfDoc.getElementsByTagName('item');
//         for (let i = 0; i < items.length; i++) {
//           const item = items[i];
//           if (item.getAttribute('id') === coverId) {
//             const href = item.getAttribute('href') || '';
//             // Get the directory of the OPF file to resolve relative paths
//             const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
//             const coverPath = opfDir + href;
            
//             // Get the cover image as a blob
//             const coverBlob = await content.file(coverPath)?.async('blob');
//             if (coverBlob) {
//               coverUrl = URL.createObjectURL(coverBlob);
//             }
//             break;
//           }
//         }
//       }
      
//       // Create a new book object
//       const newBook: BookData = {
//         id,
//         title,
//         author,
//         coverUrl,
//         currentPage: 0,
//         file,
//         lastRead: new Date().toISOString()
//       };
      
//       // Add the book to our library
//       setBooks(prevBooks => [...prevBooks, newBook]);
      
//       // Reset the file input
//       event.target.value = '';
      
//       alert(`"${title}" has been added to your library!`);
//     } catch (error) {
//       console.error('Error processing EPUB file:', error);
//       alert('Error processing the EPUB file. Please try again.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Open a book to read
//   const openBook = async (book: BookData) => {
//     setIsLoading(true);
//     setBookTitle(book.title);
//     setBookAuthor(book.author);
//     setCurrentPage(book.currentPage || 0);
    
//     try {
//       // Load the epub file again
//       const zip = new JSZip();
//       const content = await zip.loadAsync(book.file);
//       setBookZip(content);
      
//       // Find the container.xml file
//       const containerXml = await content.file('META-INF/container.xml')?.async('text');
//       if (!containerXml) {
//         throw new Error('Invalid EPUB: container.xml not found');
//       }
      
//       // Parse the container.xml to find the OPF file
//       const parser = new DOMParser();
//       const containerDoc = parser.parseFromString(containerXml, 'application/xml');
//       const rootfiles = containerDoc.getElementsByTagName('rootfile');
      
//       if (rootfiles.length === 0) {
//         throw new Error('Invalid EPUB: No rootfile found in container.xml');
//       }
      
//       // Get the path to the OPF file
//       const opf = rootfiles[0].getAttribute('full-path') || '';
//       setOpfPath(opf);
      
//       // Load the OPF file
//       const opfContent = await content.file(opf)?.async('text');
//       if (!opfContent) {
//         throw new Error('Invalid EPUB: OPF file not found');
//       }
      
//       // Parse the OPF file
//       const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      
//       // Get the spine - this defines the reading order
//       const spine = opfDoc.getElementsByTagName('spine')[0];
//       const itemrefs = spine.getElementsByTagName('itemref');
      
//       // Get the manifest - this maps IDs to file paths
//       const manifest = opfDoc.getElementsByTagName('manifest')[0];
//       const items = manifest.getElementsByTagName('item');
      
//       // Map the spine items to their file paths
//       const fileOrder: string[] = [];
//       for (let i = 0; i < itemrefs.length; i++) {
//         const idref = itemrefs[i].getAttribute('idref');
//         for (let j = 0; j < items.length; j++) {
//           if (items[j].getAttribute('id') === idref) {
//             const href = items[j].getAttribute('href') || '';
//             // Get the directory of the OPF file to resolve relative paths
//             const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
//             fileOrder.push(opfDir + href);
//             break;
//           }
//         }
//       }
      
//       setHtmlFiles(fileOrder);
//       setTotalPages(fileOrder.length);
      
//       // Get the table of contents using multiple methods
//       // Method 1: Check for nav document (EPUB3)
//       let tocPath = '';
//       let tocFound = false;
      
//       // Look for the nav document in the manifest
//       for (let i = 0; i < items.length; i++) {
//         const item = items[i];
//         const properties = item.getAttribute('properties');
//         if (properties && properties.includes('nav')) {
//           const href = item.getAttribute('href') || '';
//           // Get the directory of the OPF file to resolve relative paths
//           const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
//           tocPath = opfDir + href;
//           console.log("Found EPUB3 nav document at:", tocPath);
          
//           // Try to parse the EPUB3 nav
//           try {
//             const tocContent = await content.file(tocPath)?.async('text');
//             if (tocContent) {
//               const tocDoc = parser.parseFromString(tocContent, 'text/html');
//               const navs = tocDoc.getElementsByTagName('nav');
              
//               // Find the TOC nav element
//               for (let i = 0; i < navs.length; i++) {
//                 const nav = navs[i];
//                 const type = nav.getAttribute('epub:type');
//                 if (type === 'toc') {
//                   // Parse the TOC entries
//                   const ol = nav.getElementsByTagName('ol')[0];
//                   if (ol) {
//                     const parseTocItems = (ol: Element): TOCItem[] => {
//                       const items: TOCItem[] = [];
//                       const lis = ol.getElementsByTagName('li');
                      
//                       for (let j = 0; j < lis.length; j++) {
//                         const li = lis[j];
//                         const a = li.getElementsByTagName('a')[0];
//                         if (a) {
//                           const href = a.getAttribute('href') || '';
//                           const label = a.textContent || '';
//                           const id = `toc-${j}`;
                          
//                           const item: TOCItem = {
//                             id,
//                             href,
//                             label,
//                             children: []
//                           };
                          
//                           // Check for nested lists
//                           const nestedOl = li.getElementsByTagName('ol')[0];
//                           if (nestedOl) {
//                             item.children = parseTocItems(nestedOl);
//                           }
                          
//                           items.push(item);
//                         }
//                       }
                      
//                       return items;
//                     };
                    
//                     setToc(parseTocItems(ol));
//                     tocFound = true;
//                     break;
//                   }
//                 }
//               }
//             }
//           } catch (error) {
//             console.error("Error parsing EPUB3 nav document:", error);
//           }
          
//           break;
//         }
//       }
      
//       // Method 2: Check for NCX file (EPUB2)
//       if (!tocFound) {
//         // Look for the NCX file reference in the spine
//         const tocAttr = spine.getAttribute('toc');
//         if (tocAttr) {
//           console.log("Found toc attribute in spine:", tocAttr);
//           // Find the corresponding item in the manifest
//           for (let i = 0; i < items.length; i++) {
//             const item = items[i];
//             if (item.getAttribute('id') === tocAttr) {
//               const href = item.getAttribute('href') || '';
//               // Get the directory of the OPF file to resolve relative paths
//               const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
//               tocPath = opfDir + href;
//               console.log("Found EPUB2 NCX at:", tocPath);
//               break;
//             }
//           }
//         } else {
//           // If no toc attribute, look for an item with media-type "application/x-dtbncx+xml"
//           for (let i = 0; i < items.length; i++) {
//             const item = items[i];
//             if (item.getAttribute('media-type') === 'application/x-dtbncx+xml') {
//               const href = item.getAttribute('href') || '';
//               // Get the directory of the OPF file to resolve relative paths
//               const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
//               tocPath = opfDir + href;
//               console.log("Found EPUB2 NCX by media-type at:", tocPath);
//               break;
//             }
//           }
//         }
        
//         // If we found an NCX file, try to parse it
//         if (tocPath) {
//           try {
//             const ncxContent = await content.file(tocPath)?.async('text');
//             if (ncxContent) {
//               const ncxDoc = parser.parseFromString(ncxContent, 'application/xml');
//               const navPoints = ncxDoc.getElementsByTagName('navPoint');
              
//               if (navPoints.length > 0) {
//                 const tocItems: TOCItem[] = [];
                
//                 const processNavPoint = (navPoint: Element, index: number): TOCItem => {
//                   const navLabel = navPoint.getElementsByTagName('navLabel')[0];
//                   const text = navLabel?.getElementsByTagName('text')[0]?.textContent || '';
//                   const content = navPoint.getElementsByTagName('content')[0];
//                   const src = content?.getAttribute('src') || '';
                  
//                   return {
//                     id: `toc-${index}`,
//                     label: text,
//                     href: src,
//                     children: []
//                   };
//                 };
                
//                 // First pass: create all items
//                 const navPointMap = new Map<string, TOCItem>();
//                 for (let i = 0; i < navPoints.length; i++) {
//                   const navPoint = navPoints[i];
//                   const id = navPoint.getAttribute('id') || '';
//                   const item = processNavPoint(navPoint, i);
//                   navPointMap.set(id, item);
//                   tocItems.push(item);
//                 }
                
//                 // Second pass: build hierarchy
//                 for (let i = 0; i < navPoints.length; i++) {
//                   const navPoint = navPoints[i];
//                   const id = navPoint.getAttribute('id') || '';
//                   const parentNode = navPoint.parentNode as Element;
                  
//                   if (parentNode && parentNode.nodeName === 'navPoint') {
//                     const parentId = parentNode.getAttribute('id') || '';
//                     const parentItem = navPointMap.get(parentId);
//                     const childItem = navPointMap.get(id);
                    
//                     if (parentItem && childItem) {
//                       parentItem.children.push(childItem);
//                       // Remove from the top level
//                       const index = tocItems.findIndex(item => item.id === childItem.id);
//                       if (index !== -1) {
//                         tocItems.splice(index, 1);
//                       }
//                     }
//                   }
//                 }
                
//                 setToc(tocItems);
//                 tocFound = true;
//               }
//             }
//           } catch (error) {
//             console.error("Error parsing EPUB2 NCX file:", error);
//           }
//         }
//       }
      
//       // Method 3: Create TOC from spine if no TOC found
//       if (!tocFound) {
//         console.log("No TOC found, creating from spine");
//         const tocItems: TOCItem[] = [];
        
//         for (let i = 0; i < fileOrder.length; i++) {
//           const filePath = fileOrder[i];
//           const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
//           const label = fileName.replace(/\.x?html?$/, '').replace(/[-_]/g, ' ');
          
//           tocItems.push({
//             id: `toc-${i}`,
//             label: label.charAt(0).toUpperCase() + label.slice(1), // Capitalize first letter
//             href: filePath.substring(opf.substring(0, opf.lastIndexOf('/') + 1).length),
//             children: []
//           });
//         }
        
//         setToc(tocItems);
//       }
      
//       // Load the first HTML file
//       if (fileOrder.length > 0) {
//         await loadPage(book.currentPage || 0);
//       } else {
//         throw new Error('No HTML files found in the EPUB');
//       }
      
//       // Update the last read date for this book
//       setBooks(prevBooks => 
//         prevBooks.map(b => 
//           b.id === book.id 
//             ? { ...b, lastRead: new Date().toISOString() } 
//             : b
//         )
//       );
      
//       // Switch to reading view
//       setIsReading(true);
//     } catch (error) {
//       console.error('Error opening EPUB file:', error);
//       alert('Error opening the EPUB file. Please try again.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Extract text content from HTML for SimplePlayMode
//   const extractPageText = (htmlContent: string) => {
//     try {
//       // Create a temporary div to parse the HTML
//       const tempDiv = document.createElement('div');
//       tempDiv.innerHTML = htmlContent;
      
//       // Extract text content
//       let textContent = tempDiv.textContent || '';
      
//       // Clean up the text (remove excess whitespace)
//       textContent = textContent.replace(/\s+/g, ' ').trim();
      
//       // Update the state
//       setCurrentPageText(textContent);
//       console.log('Extracted text length:', textContent.length);
//     } catch (error) {
//       console.error('Error extracting text:', error);
//       setCurrentPageText('');
//     }
//   };

//   // Load a specific page
//   const loadPage = async (pageIndex: number) => {
//     if (!bookZip || pageIndex < 0 || pageIndex >= htmlFiles.length) {
//       return;
//     }
    
//     try {
//       // Load the HTML content
//       const htmlContent = await bookZip.file(htmlFiles[pageIndex])?.async('text');
//       if (!htmlContent) {
//         throw new Error(`Could not load page ${pageIndex}`);
//       }
      
//       // Get the directory of the HTML file to resolve relative paths
//       const fileDir = htmlFiles[pageIndex].substring(0, htmlFiles[pageIndex].lastIndexOf('/') + 1);
      
//       // Process the HTML to fix relative paths
//       let processedHtml = htmlContent;
      
//       // Fix image paths
//       processedHtml = processedHtml.replace(
//         /<img([^>]*)src=["']([^"']*)["']/g,
//         (match, attributes, src) => {
//           if (src.startsWith('http')) {
//             return match; // Absolute URL, no changes needed
//           }
          
//           // Construct a data URL for the image
//           const imagePath = src.startsWith('/') ? src.substring(1) : fileDir + src;
//           return `<img${attributes}src="data:image/png;base64,IMAGE_PLACEHOLDER_${imagePath}"`;
//         }
//       );
      
//       // Fix CSS paths
//       processedHtml = processedHtml.replace(
//         /<link([^>]*)href=["']([^"']*)["']/g,
//         (match, attributes, href) => {
//           if (href.startsWith('http')) {
//             return match; // Absolute URL, no changes needed
//           }
          
//           // Construct a data URL for the CSS
//           const cssPath = href.startsWith('/') ? href.substring(1) : fileDir + href;
//           return `<link${attributes}href="data:text/css;base64,CSS_PLACEHOLDER_${cssPath}"`;
//         }
//       );
      
//       setCurrentContent(processedHtml);
//       setCurrentPage(pageIndex);
      
//       // Extract text for SimplePlayMode
//       extractPageText(processedHtml);
      
//       // Update the current page in the books array
//       if (currentBook) {
//         setBooks(prevBooks => 
//           prevBooks.map(b => 
//             b.id === currentBook.id 
//               ? { ...b, currentPage: pageIndex } 
//               : b
//           )
//         );
//       }
      
//       // After rendering the content, load any images
//       setTimeout(() => {
//         const content = document.querySelector('.epub-content');
//         if (content) {
//           const images = content.querySelectorAll('img[src^="data:image/png;base64,IMAGE_PLACEHOLDER_"]');
//           images.forEach(async (img: Element) => {
//             const src = (img as HTMLImageElement).src;
//             const imagePath = src.replace('data:image/png;base64,IMAGE_PLACEHOLDER_', '');
            
//             try {
//               const imageBlob = await bookZip.file(imagePath)?.async('blob');
//               if (imageBlob) {
//                 const imageUrl = URL.createObjectURL(imageBlob);
//                 (img as HTMLImageElement).src = imageUrl;
//               }
//             } catch (error) {
//               console.error(`Error loading image: ${imagePath}`, error);
//             }
//           });
          
//           const links = content.querySelectorAll('link[href^="data:text/css;base64,CSS_PLACEHOLDER_"]');
//           links.forEach(async (link: Element) => {
//             const href = (link as HTMLLinkElement).href;
//             const cssPath = href.replace('data:text/css;base64,CSS_PLACEHOLDER_', '');
            
//             try {
//               const cssContent = await bookZip.file(cssPath)?.async('text');
//               if (cssContent) {
//                 // Create a new style element with the CSS content
//                 const style = document.createElement('style');
//                 style.textContent = cssContent;
//                 link.parentNode?.replaceChild(style, link);
//               }
//             } catch (error) {
//               console.error(`Error loading CSS: ${cssPath}`, error);
//             }
//           });
//         }
//       }, 100);
      
//     } catch (error) {
//       console.error('Error loading page:', error);
//       alert(`Error loading page ${pageIndex}. Please try again.`);
//     }
//   };

//   // Navigate to the next page
//   const nextPage = () => {
//     if (currentPage < totalPages - 1) {
//       loadPage(currentPage + 1);
//     }
//   };

//   // Navigate to the previous page
//   const prevPage = () => {
//     if (currentPage > 0) {
//       loadPage(currentPage - 1);
//     }
//   };

//   // Navigate to a specific TOC item
//   const navigateToTocItem = (item: TOCItem) => {
//     // The href might be in various formats:
//     // - chapter1.html#section2
//     // - chapter1.html
//     // - ../Text/chapter1.html
//     // - #section (fragment only)
    
//     console.log("Navigating to TOC item:", item);
    
//     // Handle fragment-only hrefs
//     if (item.href.startsWith('#')) {
//       // Try to find the fragment in the current page
//       const fragment = item.href.substring(1);
//       const element = document.getElementById(fragment);
//       if (element) {
//         element.scrollIntoView({ behavior: 'smooth' });
//         return;
//       }
//       return;
//     }
    
//     // Split to get file path and optional fragment
//     let [filePath, fragment] = item.href.split('#');
    
//     // Remove any query parameters
//     filePath = filePath.split('?')[0];
    
//     // Normalize the path (handle ../ and ./)
//     const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
    
//     // Try multiple approaches to find the correct file
    
//     // Approach 1: Direct match
//     let fileIndex = htmlFiles.findIndex(file => file.endsWith(filePath));
    
//     // Approach 2: Try with the OPF directory
//     if (fileIndex === -1 && !filePath.startsWith('/')) {
//       const fullPath = opfDir + filePath;
//       fileIndex = htmlFiles.findIndex(file => file === fullPath);
//     }
    
//     // Approach 3: Try resolving relative paths
//     if (fileIndex === -1) {
//       const resolvedPath = resolveRelativePath(opfDir, filePath);
//       fileIndex = htmlFiles.findIndex(file => file === resolvedPath);
//     }
    
//     // Approach 4: Just match the filename
//     if (fileIndex === -1) {
//       const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
//       fileIndex = htmlFiles.findIndex(file => file.endsWith('/' + fileName));
//     }
    
//     console.log("File index for path:", filePath, "is:", fileIndex);
    
//     if (fileIndex !== -1) {
//       loadPage(fileIndex);
      
//       // If there's a fragment, scroll to it after loading
//       if (fragment) {
//         setTimeout(() => {
//           const element = document.getElementById(fragment);
//           if (element) {
//             element.scrollIntoView({ behavior: 'smooth' });
//           }
//         }, 300);
//       }
//     } else {
//       console.error("Could not find file for TOC item:", item);
//     }
//   };
  
//   // Helper function to resolve relative paths
//   const resolveRelativePath = (basePath: string, relativePath: string): string => {
//     // Handle ./ at the beginning (current directory)
//     if (relativePath.startsWith('./')) {
//       return basePath + relativePath.substring(2);
//     }
    
//     // Handle ../ (parent directory)
//     if (relativePath.startsWith('../')) {
//       // Remove the last directory from basePath
//       const basePathParts = basePath.split('/');
//       basePathParts.pop(); // Remove the last empty string (from trailing slash)
//       basePathParts.pop(); // Remove the last directory
//       const newBasePath = basePathParts.join('/') + '/';
      
//       // Remove the ../ from the relative path
//       const newRelativePath = relativePath.substring(3);
      
//       // If there are more ../, resolve recursively
//       if (newRelativePath.startsWith('../')) {
//         return resolveRelativePath(newBasePath, newRelativePath);
//       }
      
//       return newBasePath + newRelativePath;
//     }
    
//     // If it doesn't start with ./ or ../, just append to the base path
//     return basePath + relativePath;
//   };

//   // Toggle text-to-speech
//   const toggleTTS = () => {
//     if (isSpeaking) {
//       window.speechSynthesis.cancel();
//       setIsSpeaking(false);
//     } else {
//       const content = document.querySelector('.epub-content');
//       if (content) {
//         const text = content.textContent || '';
//         const utterance = new SpeechSynthesisUtterance(text);
//         window.speechSynthesis.speak(utterance);
//         setIsSpeaking(true);
        
//         utterance.onend = () => {
//           setIsSpeaking(false);
//         };
//       }
//     }
//   };
  
//   // Toggle SimplePlayMode visibility
//   const togglePlayMode = () => {
//     // Make sure we have extracted text
//     if (!currentPageText) {
//       extractPageText(currentContent);
//     }
    
//     setIsPlayModeVisible(!isPlayModeVisible);
//     console.log('Play mode toggled:', !isPlayModeVisible);
//   };

//   // Close the book and return to the library
//   const closeBook = () => {
//     if (isSpeaking) {
//       window.speechSynthesis.cancel();
//       setIsSpeaking(false);
//     }
    
//     // Also close the play mode if open
//     if (isPlayModeVisible) {
//       setIsPlayModeVisible(false);
//     }
    
//     setCurrentBook(null);
//     setBookZip(null);
//     setOpfPath('');
//     setHtmlFiles([]);
//     setToc([]);
//     setCurrentContent('');
//     setIsReading(false);
//     setBookTitle('');
//     setBookAuthor('');
//   };

//   // Remove a book from the library
//   const removeBook = (bookId: string) => {
//     const confirmDelete = window.confirm('Are you sure you want to remove this book from your library?');
//     if (confirmDelete) {
//       // Find the book to remove its cover URL
//       const book = books.find(b => b.id === bookId);
//       if (book && book.coverUrl) {
//         URL.revokeObjectURL(book.coverUrl);
//       }
      
//       setBooks(prevBooks => prevBooks.filter(b => b.id !== bookId));
//     }
//   };

//   // Search for text in the current page
//   const handleSearch = () => {
//     if (!searchQuery) return;
    
//     const content = document.querySelector('.epub-content');
//     if (content) {
//       // Remove any previous highlights
//       const highlights = content.querySelectorAll('.search-highlight');
//       highlights.forEach(highlight => {
//         const parent = highlight.parentNode;
//         if (parent) {
//           parent.replaceChild(document.createTextNode((highlight as HTMLElement).innerText), highlight);
//         }
//       });
      
//       // If the query is empty after clearing, we're done
//       if (!searchQuery.trim()) return;
      
//       // Create a walker to traverse all text nodes
//       const walker = document.createTreeWalker(
//         content,
//         NodeFilter.SHOW_TEXT,
//         {
//           acceptNode: (node) => {
//             // Skip script and style tags
//             const parent = node.parentNode as HTMLElement;
//             if (parent && ['SCRIPT', 'STYLE'].includes(parent.tagName)) {
//               return NodeFilter.FILTER_REJECT;
//             }
//             return NodeFilter.FILTER_ACCEPT;
//           }
//         }
//       );
      
//       // Search all text nodes
//       let node;
//       while (node = walker.nextNode()) {
//         const text = node.textContent || '';
//         const lowerText = text.toLowerCase();
//         const lowerQuery = searchQuery.toLowerCase();
        
//         let index = lowerText.indexOf(lowerQuery);
//         if (index !== -1) {
//           // We found the text, now we need to replace it with a highlighted version
//           const parent = node.parentNode;
//           if (parent) {
//             let currentIndex = 0;
//             const fragments = [];
            
//             // Add all instances of the search query in this text node
//             while (index !== -1) {
//               // Add the text before the match
//               if (index > currentIndex) {
//                 fragments.push(document.createTextNode(text.substring(currentIndex, index)));
//               }
              
//               // Add the highlighted match
//               const highlight = document.createElement('span');
//               highlight.className = 'search-highlight';
//               highlight.textContent = text.substring(index, index + searchQuery.length);
//               fragments.push(highlight);
              
//               // Update indices
//               currentIndex = index + searchQuery.length;
//               index = lowerText.indexOf(lowerQuery, currentIndex);
//             }
            
//             // Add any remaining text
//             if (currentIndex < text.length) {
//               fragments.push(document.createTextNode(text.substring(currentIndex)));
//             }
            
//             // Replace the original text node with our fragments
//             parent.replaceChild(fragments[0], node);
//             for (let i = 1; i < fragments.length; i++) {
//               parent.insertBefore(fragments[i], fragments[i-1].nextSibling);
//             }
//           }
//         }
//       }
      
//       // Scroll to the first highlight
//       const firstHighlight = content.querySelector('.search-highlight');
//       if (firstHighlight) {
//         firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
//       }
//     }
//   };

//   // Clear the search
//   const clearSearch = () => {
//     setSearchQuery('');
    
//     // Remove any highlights
//     const content = document.querySelector('.epub-content');
//     if (content) {
//       const highlights = content.querySelectorAll('.search-highlight');
//       highlights.forEach(highlight => {
//         const parent = highlight.parentNode;
//         if (parent) {
//           parent.replaceChild(document.createTextNode((highlight as HTMLElement).innerText), highlight);
//         }
//       });
//     }
//   };

//   // Get sorted books by last read date (most recent first)
//   const sortedBooks = [...books].sort((a, b) => 
//     new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
//   );

//   // Render the TOC recursively
//   const renderTocItems = (items: TOCItem[]) => {
//     return (
//       <ul>
//         {items.map(item => (
//           <li key={item.id}>
//             <button onClick={() => navigateToTocItem(item)}>{item.label}</button>
//             {item.children.length > 0 && renderTocItems(item.children)}
//           </li>
//         ))}
//       </ul>
//     );
//   };

//   return (
//     <div className="app">
//       {!isReading ? (
//         <div className="library">
//           <header className="library-header">
//             <h1>My E-Book Library</h1>
//             <div className="upload-container">
//               <label htmlFor="file-upload" className="upload-button">
//                 Upload Book
//               </label>
//               <input
//                 id="file-upload"
//                 type="file"
//                 accept=".epub"
//                 onChange={handleFileUpload}
//                 style={{ display: 'none' }}
//               />
//             </div>
//           </header>
          
//           {isLoading && (
//             <div className="loading">
//               <div className="loading-spinner"></div>
//               <p>Loading book...</p>
//             </div>
//           )}
          
//           {books.length === 0 ? (
//             <div className="empty-library">
//               <p>Your library is empty. Upload an EPUB book to get started!</p>
//             </div>
//           ) : (
//             <>
//               <h2>Recently Read</h2>
//               <div className="recent-books">
//                 {sortedBooks.slice(0, 3).map(book => (
//                   <div key={book.id} className="book-card recent" onClick={() => openBook(book)}>
//                     <div className="book-cover">
//                       {book.coverUrl ? (
//                         <img src={book.coverUrl} alt={`Cover of ${book.title}`} />
//                       ) : (
//                         <div className="default-cover">
//                           <span>{book.title.charAt(0)}</span>
//                         </div>
//                       )}
//                     </div>
//                     <div className="book-info">
//                       <h3>{book.title}</h3>
//                       <p>{book.author}</p>
//                       <p className="last-read">
//                         Last read: {new Date(book.lastRead).toLocaleDateString()}
//                       </p>
//                     </div>
//                   </div>
//                 ))}
//               </div>
              
//               <h2>All Books</h2>
//               <div className="books-grid">
//                 {sortedBooks.map(book => (
//                   <div key={book.id} className="book-card">
//                     <div className="book-cover" onClick={() => openBook(book)}>
//                       {book.coverUrl ? (
//                         <img src={book.coverUrl} alt={`Cover of ${book.title}`} />
//                       ) : (
//                         <div className="default-cover">
//                           <span>{book.title.charAt(0)}</span>
//                         </div>
//                       )}
//                     </div>
//                     <div className="book-info">
//                       <h3>{book.title}</h3>
//                       <p>{book.author}</p>
//                     </div>
//                     <div className="book-actions">
//                       <button onClick={(e) => {
//                         e.stopPropagation();
//                         openBook(book);
//                       }}>Read</button>
//                       <button 
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           removeBook(book.id);
//                         }} 
//                         className="remove-book">
//                         Remove
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </>
//           )}
//         </div>
//       ) : (
//         <div className="reader">
//           <header className="reader-header">
//             <div className="reader-nav">
//               <button onClick={closeBook} className="back-button">
//                 ← Back to Library
//               </button>
//               <h2>{bookTitle}</h2>
//               <p className="author">{bookAuthor}</p>
//             </div>
//             <div className="reader-controls">
//               <button onClick={prevPage} disabled={currentPage === 0}>Previous</button>
//               <span className="page-info">
//                 Page {currentPage + 1} of {totalPages}
//               </span>
//               <button onClick={nextPage} disabled={currentPage === totalPages - 1}>Next</button>
//               <button onClick={toggleTTS} className={isSpeaking ? 'active' : ''}>
//                 {isSpeaking ? 'Stop TTS' : 'Read Aloud'}
//               </button>
//               {/* Add Audiobook button */}
//               <button 
//                 onClick={togglePlayMode} 
//                 className={isPlayModeVisible ? 'active' : ''}
//                 style={{ marginLeft: '8px' }}
//               >
//                 Audiobook Mode
//               </button>
//             </div>
//           </header>
          
//           <div className="reader-container">
//             {isLoading && (
//               <div className="loading-overlay">
//                 <div className="loading-spinner"></div>
//                 <p>Loading book...</p>
//               </div>
//             )}
            
//             <div className="reader-sidebar">
//               <div className="toc-container">
//                 <h3>Table of Contents</h3>
//                 {toc.length > 0 ? renderTocItems(toc) : <p>No table of contents available</p>}
//               </div>
//             </div>
            
//             <div className="reader-main">
//               <div className="search-container">
//                 <input
//                   type="text"
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                   placeholder="Search in current page..."
//                   onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
//                 />
//                 <button onClick={handleSearch}>Search</button>
//                 <button onClick={clearSearch}>Clear</button>
//               </div>
              
//               <div className="epub-content" dangerouslySetInnerHTML={{ __html: currentContent }}></div>
//             </div>

//             {/* SimplePlayMode Overlay */}
//             {isPlayModeVisible && (
//               <SimplePlayMode
//                 currentPageContent={currentPageText}
//                 onClose={() => setIsPlayModeVisible(false)}
//               />
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default App;



// src/App.tsx
import React from 'react';
import { BookProvider, useBook } from './context/BookContext';
import Library from './components/Library';
import Reader from './components/Reader';
import './App.css';

const AppContent: React.FC = () => {
  const { isReading } = useBook();
  
  return (
    <div className="app">
      {isReading ? <Reader /> : <Library />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BookProvider>
      <AppContent />
    </BookProvider>
  );
};

export default App;