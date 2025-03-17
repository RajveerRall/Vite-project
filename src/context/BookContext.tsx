// // src/context/BookContext.tsx
// import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// import JSZip from 'jszip';
// import { DOMParser } from 'xmldom';
// // import { BookData, TOCItem } from '../types/book';
// import { getDirectoryPath, resolveRelativePath } from '../utils/pathUtils';
// import { processHtmlContent, extractTextFromHtml } from '../utils/textExtraction';
// import { BookData, TOCItem } from '@/types/books';

// interface BookContextValue {
// // Library state
// books: BookData[];
// addBook: (file: File) => Promise<void>;
// removeBook: (bookId: string) => void;

// // Current book state
// currentBook: BookData | null;
// isReading: boolean;
// isLoading: boolean;
// bookTitle: string;
// bookAuthor: string;
// currentPage: number;
// totalPages: number;
// currentContent: string;
// currentPageText: string;
// toc: TOCItem[];

// // Book actions
// openBook: (book: BookData) => Promise<void>;
// closeBook: () => void;
// nextPage: () => void;
// prevPage: () => void;
// navigateToTocItem: (item: TOCItem) => void;

// // Book details
// htmlFiles: string[];
// opfPath: string;

// // Play mode
// isPlayModeVisible: boolean;
// togglePlayMode: () => void;
// }

// const BookContext = createContext<BookContextValue | undefined>(undefined);

// export const useBook = (): BookContextValue => {
// const context = useContext(BookContext);
// if (context === undefined) {
//   throw new Error('useBook must be used within a BookProvider');
// }
// return context;
// };

// interface BookProviderProps {
// children: ReactNode;
// }

// export const BookProvider: React.FC<BookProviderProps> = ({ children }) => {
// // Library state
// const [books, setBooks] = useState<BookData[]>([]);

// // Current book state
// const [currentBook, setCurrentBook] = useState<BookData | null>(null);
// const [isReading, setIsReading] = useState<boolean>(false);
// const [isLoading, setIsLoading] = useState<boolean>(false);
// const [bookTitle, setBookTitle] = useState<string>('');
// const [bookAuthor, setBookAuthor] = useState<string>('');
// const [currentPage, setCurrentPage] = useState<number>(0);
// const [totalPages, setTotalPages] = useState<number>(0);
// const [currentContent, setCurrentContent] = useState<string>('');
// const [currentPageText, setCurrentPageText] = useState<string>('');
// const [toc, setToc] = useState<TOCItem[]>([]);
// const [bookZip, setBookZip] = useState<JSZip | null>(null);
// const [opfPath, setOpfPath] = useState<string>('');
// const [htmlFiles, setHtmlFiles] = useState<string[]>([]);

// // Play mode state
// const [isPlayModeVisible, setIsPlayModeVisible] = useState<boolean>(false);

// // Load books from localStorage on initial render
// useEffect(() => {
//   const savedBooks = localStorage.getItem('ebooks');
//   if (savedBooks) {
//     try {
//       setBooks(JSON.parse(savedBooks));
//     } catch (e) {
//       console.error("Error loading books from localStorage", e);
//       setBooks([]);
//     }
//   }
// }, []);

// // Save books to localStorage when they change
// useEffect(() => {
//   if (books.length > 0) {
//     try {
//       // We need to serialize the books without the File objects
//       const serializableBooks = books.map(book => {
//         const { file, ...serializableBook } = book;
//         return serializableBook;
//       });
//       localStorage.setItem('ebooks', JSON.stringify(serializableBooks));
//     } catch (e) {
//       console.error("Error saving books to localStorage", e);
//     }
//   }
// }, [books]);

// // Add a new book to the library
// const addBook = async (file: File): Promise<void> => {
//   if (file.name.split('.').pop()?.toLowerCase() !== 'epub') {
//     throw new Error('Please upload an EPUB file');
//   }

//   setIsLoading(true);

//   try {
//     // Load the epub file using JSZip
//     const zip = new JSZip();
//     const content = await zip.loadAsync(file);
    
//     // Find the container.xml file
//     const containerXml = await content.file('META-INF/container.xml')?.async('text');
//     if (!containerXml) {
//       throw new Error('Invalid EPUB: container.xml not found');
//     }
    
//     // Parse the container.xml to find the OPF file
//     const parser = new DOMParser();
//     const containerDoc = parser.parseFromString(containerXml, 'application/xml');
//     const rootfiles = containerDoc.getElementsByTagName('rootfile');
    
//     if (rootfiles.length === 0) {
//       throw new Error('Invalid EPUB: No rootfile found in container.xml');
//     }
    
//     // Get the path to the OPF file
//     const opfPath = rootfiles[0].getAttribute('full-path') || '';
    
//     // Load the OPF file
//     const opfContent = await content.file(opfPath)?.async('text');
//     if (!opfContent) {
//       throw new Error('Invalid EPUB: OPF file not found');
//     }
    
//     // Parse the OPF file to get metadata
//     const opfDoc = parser.parseFromString(opfContent, 'application/xml');
    
//     // Get the book title
//     const titleElements = opfDoc.getElementsByTagName('dc:title');
//     const title = titleElements.length > 0 
//       ? titleElements[0].textContent || 'Unknown Title'
//       : 'Unknown Title';
    
//     // Get the book author
//     const creatorElements = opfDoc.getElementsByTagName('dc:creator');
//     const author = creatorElements.length > 0
//       ? creatorElements[0].textContent || 'Unknown Author'
//       : 'Unknown Author';
    
//     // Generate a unique ID
//     const id = Date.now().toString();
    
//     // Find the cover image
//     let coverUrl = null;
//     const metaTags = opfDoc.getElementsByTagName('meta');
//     let coverId = '';
    
//     // Try to find the cover ID
//     for (let i = 0; i < metaTags.length; i++) {
//       const meta = metaTags[i];
//       if (meta.getAttribute('name') === 'cover') {
//         coverId = meta.getAttribute('content') || '';
//         break;
//       }
//     }
    
//     // If we found a cover ID, find the actual file
//     if (coverId) {
//       const items = opfDoc.getElementsByTagName('item');
//       for (let i = 0; i < items.length; i++) {
//         const item = items[i];
//         if (item.getAttribute('id') === coverId) {
//           const href = item.getAttribute('href') || '';
//           // Get the directory of the OPF file to resolve relative paths
//           const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
//           const coverPath = opfDir + href;
          
//           // Get the cover image as a blob
//           const coverBlob = await content.file(coverPath)?.async('blob');
//           if (coverBlob) {
//             coverUrl = URL.createObjectURL(coverBlob);
//           }
//           break;
//         }
//       }
//     }
    
//     // Create a new book object
//     const newBook: BookData = {
//       id,
//       title,
//       author,
//       coverUrl,
//       currentPage: 0,
//       file,
//       lastRead: new Date().toISOString()
//     };
    
//     // Add the book to our library
//     setBooks(prevBooks => [...prevBooks, newBook]);
    
//   } catch (error) {
//     console.error('Error processing EPUB file:', error);
//     throw error;
//   } finally {
//     setIsLoading(false);
//   }
// };

// // Remove a book from the library
// const removeBook = (bookId: string): void => {
//   // Find the book to remove its cover URL
//   const book = books.find(b => b.id === bookId);
//   if (book && book.coverUrl) {
//     URL.revokeObjectURL(book.coverUrl);
//   }
  
//   setBooks(prevBooks => prevBooks.filter(b => b.id !== bookId));
// };

// // Open a book to read
// const openBook = async (book: BookData): Promise<void> => {
//   setIsLoading(true);
//   setBookTitle(book.title);
//   setBookAuthor(book.author);
//   setCurrentPage(book.currentPage || 0);
//   setCurrentBook(book);
  
//   try {
//     // Load the epub file again
//     const zip = new JSZip();
//     const content = await zip.loadAsync(book.file);
//     setBookZip(content);
    
//     // Find the container.xml file
//     const containerXml = await content.file('META-INF/container.xml')?.async('text');
//     if (!containerXml) {
//       throw new Error('Invalid EPUB: container.xml not found');
//     }
    
//     // Parse the container.xml to find the OPF file
//     const parser = new DOMParser();
//     const containerDoc = parser.parseFromString(containerXml, 'application/xml');
//     const rootfiles = containerDoc.getElementsByTagName('rootfile');
    
//     if (rootfiles.length === 0) {
//       throw new Error('Invalid EPUB: No rootfile found in container.xml');
//     }
    
//     // Get the path to the OPF file
//     const opf = rootfiles[0].getAttribute('full-path') || '';
//     setOpfPath(opf);
    
//     // Load the OPF file
//     const opfContent = await content.file(opf)?.async('text');
//     if (!opfContent) {
//       throw new Error('Invalid EPUB: OPF file not found');
//     }
    
//     // Parse the OPF file
//     const opfDoc = parser.parseFromString(opfContent, 'application/xml');
    
//     // Get the spine - this defines the reading order
//     const spine = opfDoc.getElementsByTagName('spine')[0];
//     const itemrefs = spine.getElementsByTagName('itemref');
    
//     // Get the manifest - this maps IDs to file paths
//     const manifest = opfDoc.getElementsByTagName('manifest')[0];
//     const items = manifest.getElementsByTagName('item');
    
//     // Map the spine items to their file paths
//     const fileOrder: string[] = [];
//     for (let i = 0; i < itemrefs.length; i++) {
//       const idref = itemrefs[i].getAttribute('idref');
//       for (let j = 0; j < items.length; j++) {
//         if (items[j].getAttribute('id') === idref) {
//           const href = items[j].getAttribute('href') || '';
//           // Get the directory of the OPF file to resolve relative paths
//           const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
//           fileOrder.push(opfDir + href);
//           break;
//         }
//       }
//     }
    
//     setHtmlFiles(fileOrder);
//     setTotalPages(fileOrder.length);
    
//     // Extract table of contents
//     const extractToc = async (): Promise<TOCItem[]> => {
//       let tocPath = '';
//       let tocItems: TOCItem[] = [];
//       let tocFound = false;
      
//       // Method 1: Check for nav document (EPUB3)
//       for (let i = 0; i < items.length; i++) {
//         const item = items[i];
//         const properties = item.getAttribute('properties');
//         if (properties && properties.includes('nav')) {
//           const href = item.getAttribute('href') || '';
//           const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
//           tocPath = opfDir + href;
          
//           try {
//             const tocContent = await content.file(tocPath)?.async('text');
//             if (tocContent) {
//               const tocDoc = parser.parseFromString(tocContent, 'text/html');
//               const navs = tocDoc.getElementsByTagName('nav');
              
//               for (let i = 0; i < navs.length; i++) {
//                 const nav = navs[i];
//                 const type = nav.getAttribute('epub:type');
//                 if (type === 'toc') {
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
                          
//                           const nestedOl = li.getElementsByTagName('ol')[0];
//                           if (nestedOl) {
//                             item.children = parseTocItems(nestedOl);
//                           }
                          
//                           items.push(item);
//                         }
//                       }
                      
//                       return items;
//                     };
                    
//                     tocItems = parseTocItems(ol);
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
//         const tocAttr = spine.getAttribute('toc');
//         if (tocAttr) {
//           for (let i = 0; i < items.length; i++) {
//             const item = items[i];
//             if (item.getAttribute('id') === tocAttr) {
//               const href = item.getAttribute('href') || '';
//               const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
//               tocPath = opfDir + href;
//               break;
//             }
//           }
//         } else {
//           // Try media-type approach
//           for (let i = 0; i < items.length; i++) {
//             const item = items[i];
//             if (item.getAttribute('media-type') === 'application/x-dtbncx+xml') {
//               const href = item.getAttribute('href') || '';
//               const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
//               tocPath = opfDir + href;
//               break;
//             }
//           }
//         }
        
//         if (tocPath) {
//           try {
//             const ncxContent = await content.file(tocPath)?.async('text');
//             if (ncxContent) {
//               const ncxDoc = parser.parseFromString(ncxContent, 'application/xml');
//               const navPoints = ncxDoc.getElementsByTagName('navPoint');
              
//               if (navPoints.length > 0) {
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
                
//                 // Create all items
//                 const tempItems: TOCItem[] = [];
//                 const navPointMap = new Map<string, TOCItem>();
                
//                 for (let i = 0; i < navPoints.length; i++) {
//                   const navPoint = navPoints[i];
//                   const id = navPoint.getAttribute('id') || '';
//                   const item = processNavPoint(navPoint, i);
//                   navPointMap.set(id, item);
//                   tempItems.push(item);
//                 }
                
//                 // Build hierarchy
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
//                       // Remove from top level
//                       const index = tempItems.findIndex(item => item.id === childItem.id);
//                       if (index !== -1) {
//                         tempItems.splice(index, 1);
//                       }
//                     }
//                   }
//                 }
                
//                 tocItems = tempItems;
//                 tocFound = true;
//               }
//             }
//           } catch (error) {
//             console.error("Error parsing EPUB2 NCX file:", error);
//           }
//         }
//       }
      
//       // Method 3: Create from spine if no TOC found
//       if (!tocFound) {
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
//       }
      
//       return tocItems;
//     };
    
//     // Set the TOC
//     const tocItems = await extractToc();
//     setToc(tocItems);
    
//     // Load the first HTML file
//     if (fileOrder.length > 0) {
//       await loadPage(book.currentPage || 0);
//     } else {
//       throw new Error('No HTML files found in the EPUB');
//     }
    
//     // Update the last read date for this book
//     setBooks(prevBooks => 
//       prevBooks.map(b => 
//         b.id === book.id 
//           ? { ...b, lastRead: new Date().toISOString() } 
//           : b
//       )
//     );
    
//     // Switch to reading view
//     setIsReading(true);
//   } catch (error) {
//     console.error('Error opening EPUB file:', error);
//     throw error;
//   } finally {
//     setIsLoading(false);
//   }
// };

// // Load a specific page
// const loadPage = async (pageIndex: number): Promise<void> => {
//   if (!bookZip || pageIndex < 0 || pageIndex >= htmlFiles.length) {
//     return;
//   }
  
//   try {
//     // Load the HTML content
//     const htmlContent = await bookZip.file(htmlFiles[pageIndex])?.async('text');
//     if (!htmlContent) {
//       throw new Error(`Could not load page ${pageIndex}`);
//     }
    
//     // Get the directory of the HTML file to resolve relative paths
//     const fileDir = getDirectoryPath(htmlFiles[pageIndex]);
    
//     // Process the HTML to fix relative paths
//     const processedHtml = processHtmlContent(htmlContent, fileDir);
    
//     setCurrentContent(processedHtml);
//     setCurrentPage(pageIndex);
    
//     // Extract text for SimplePlayMode
//     const extractedText = extractTextFromHtml(processedHtml);
//     setCurrentPageText(extractedText);
    
//     // Update the current page in the books array
//     if (currentBook) {
//       setBooks(prevBooks => 
//         prevBooks.map(b => 
//           b.id === currentBook.id 
//             ? { ...b, currentPage: pageIndex } 
//             : b
//         )
//       );
//     }
    
//     // After rendering the content, load any images
//     setTimeout(() => {
//       const content = document.querySelector('.epub-content');
//       if (content) {
//         const images = content.querySelectorAll('img[src^="data:image/png;base64,IMAGE_PLACEHOLDER_"]');
//         images.forEach(async (img: Element) => {
//           const src = (img as HTMLImageElement).src;
//           const imagePath = src.replace('data:image/png;base64,IMAGE_PLACEHOLDER_', '');
          
//           try {
//             const imageBlob = await bookZip.file(imagePath)?.async('blob');
//             if (imageBlob) {
//               const imageUrl = URL.createObjectURL(imageBlob);
//               (img as HTMLImageElement).src = imageUrl;
//             }
//           } catch (error) {
//             console.error(`Error loading image: ${imagePath}`, error);
//           }
//         });
        
//         const links = content.querySelectorAll('link[href^="data:text/css;base64,CSS_PLACEHOLDER_"]');
//         links.forEach(async (link: Element) => {
//           const href = (link as HTMLLinkElement).href;
//           const cssPath = href.replace('data:text/css;base64,CSS_PLACEHOLDER_', '');
          
//           try {
//             const cssContent = await bookZip.file(cssPath)?.async('text');
//             if (cssContent) {
//               // Create a new style element with the CSS content
//               const style = document.createElement('style');
//               style.textContent = cssContent;
//               link.parentNode?.replaceChild(style, link);
//             }
//           } catch (error) {
//             console.error(`Error loading CSS: ${cssPath}`, error);
//           }
//         });
//       }
//     }, 100);
    
//   } catch (error) {
//     console.error('Error loading page:', error);
//     throw error;
//   }
// };

// // Navigate to the next page
// const nextPage = (): void => {
//   if (currentPage < totalPages - 1) {
//     loadPage(currentPage + 1);
//   }
// };

// // Navigate to the previous page
// const prevPage = (): void => {
//   if (currentPage > 0) {
//     loadPage(currentPage - 1);
//   }
// };

// // Navigate to a specific TOC item
// const navigateToTocItem = (item: TOCItem): void => {
//   // Handle fragment-only hrefs
//   if (item.href.startsWith('#')) {
//     const fragment = item.href.substring(1);
//     const element = document.getElementById(fragment);
//     if (element) {
//       element.scrollIntoView({ behavior: 'smooth' });
//     }
//     return;
//   }
  
//   // Split to get file path and optional fragment
//   let [filePath, fragment] = item.href.split('#');
  
//   // Remove any query parameters
//   filePath = filePath.split('?')[0];
  
//   // Normalize the path (handle ../ and ./)
//   const opfDir = getDirectoryPath(opfPath);
  
//   // Try multiple approaches to find the correct file
  
//   // Approach 1: Direct match
//   let fileIndex = htmlFiles.findIndex(file => file.endsWith(filePath));
  
//   // Approach 2: Try with the OPF directory
//   if (fileIndex === -1 && !filePath.startsWith('/')) {
//     const fullPath = opfDir + filePath;
//     fileIndex = htmlFiles.findIndex(file => file === fullPath);
//   }
  
//   // Approach 3: Try resolving relative paths
//   if (fileIndex === -1) {
//     const resolvedPath = resolveRelativePath(opfDir, filePath);
//     fileIndex = htmlFiles.findIndex(file => file === resolvedPath);
//   }
  
//   // Approach 4: Just match the filename
//   if (fileIndex === -1) {
//     const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
//     fileIndex = htmlFiles.findIndex(file => file.endsWith('/' + fileName));
//   }
  
//   if (fileIndex !== -1) {
//     loadPage(fileIndex);
    
//     // If there's a fragment, scroll to it after loading
//     if (fragment) {
//       setTimeout(() => {
//         const element = document.getElementById(fragment);
//         if (element) {
//           element.scrollIntoView({ behavior: 'smooth' });
//         }
//       }, 300);
//     }
//   }
// };

// // Close the book and return to the library
// const closeBook = (): void => {
//   // Reset all book state
//   setCurrentBook(null);
//   setBookZip(null);
//   setOpfPath('');
//   setHtmlFiles([]);
//   setToc([]);
//   setCurrentContent('');
//   setIsReading(false);
//   setBookTitle('');
//   setBookAuthor('');
//   setIsPlayModeVisible(false);
//   setCurrentPageText('');
// };

// // Toggle PlayMode visibility
// const togglePlayMode = (): void => {
//   setIsPlayModeVisible(!isPlayModeVisible);
// };

// const value: BookContextValue = {
//   // Library state
//   books,
//   addBook,
//   removeBook,
  
//   // Current book state
//   currentBook,
//   isReading,
//   isLoading,
//   bookTitle,
//   bookAuthor,
//   currentPage,
//   totalPages,
//   currentContent,
//   currentPageText,
//   toc,
  
//   // Book actions
//   openBook,
//   closeBook,
//   nextPage,
//   prevPage,
//   navigateToTocItem,
  
//   // Book details
//   htmlFiles,
//   opfPath,
  
//   // Play mode
//   isPlayModeVisible,
//   togglePlayMode
// };

// return (
//   <BookContext.Provider value={value}>
//     {children}
//   </BookContext.Provider>
// );
// };



import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import localforage from 'localforage';
import JSZip from 'jszip';
import { DOMParser } from 'xmldom';
import { getDirectoryPath, resolveRelativePath } from '../utils/pathUtils';
import { processHtmlContent, extractTextFromHtml } from '../utils/textExtraction';
import { BookData, TOCItem } from '@/types/books';

// Configure localforage for book storage
localforage.config({
  name: "EbookReaderApp",
  storeName: "bookStorage"
});

interface BookContextValue {
  // Library state
  books: BookData[];
  addBook: (file: File) => Promise<void>;
  removeBook: (bookId: string) => Promise<void>;

  // Current book state
  currentBook: BookData | null;
  isReading: boolean;
  isLoading: boolean;
  bookTitle: string;
  bookAuthor: string;
  currentPage: number;
  totalPages: number;
  currentContent: string;
  currentPageText: string;
  toc: TOCItem[];

  // Book actions
  openBook: (book: BookData) => Promise<void>;
  closeBook: () => void;
  nextPage: () => void;
  prevPage: () => void;
  navigateToTocItem: (item: TOCItem) => void;

  // Book details
  htmlFiles: string[];
  opfPath: string;

  // Play mode
  isPlayModeVisible: boolean;
  togglePlayMode: () => void;
}

const BookContext = createContext<BookContextValue | undefined>(undefined);

export const useBook = (): BookContextValue => {
  const context = useContext(BookContext);
  if (context === undefined) {
    throw new Error('useBook must be used within a BookProvider');
  }
  return context;
};

interface BookProviderProps {
  children: ReactNode;
}

export const BookProvider: React.FC<BookProviderProps> = ({ children }) => {
  // Library state
  const [books, setBooks] = useState<BookData[]>([]);

  // Current book state
  const [currentBook, setCurrentBook] = useState<BookData | null>(null);
  const [isReading, setIsReading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [bookTitle, setBookTitle] = useState<string>('');
  const [bookAuthor, setBookAuthor] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentContent, setCurrentContent] = useState<string>('');
  const [currentPageText, setCurrentPageText] = useState<string>('');
  const [toc, setToc] = useState<TOCItem[]>([]);
  const [bookZip, setBookZip] = useState<JSZip | null>(null);
  const [opfPath, setOpfPath] = useState<string>('');
  const [htmlFiles, setHtmlFiles] = useState<string[]>([]);

  // Play mode state
  const [isPlayModeVisible, setIsPlayModeVisible] = useState<boolean>(false);

  // Load books from localforage on initial render
  useEffect(() => {
    const loadBooks = async () => {
      try {
        // Retrieve all stored book metadata keys
        const keys = await localforage.keys();
        const bookMetadataKeys = keys.filter(key => key.startsWith('book_metadata_'));
        
        // Load each book's metadata
        const loadedBooks: BookData[] = [];
        for (const key of bookMetadataKeys) {
          const bookId = key.replace('book_metadata_', '');
          
          // Retrieve metadata
          const metadata = await localforage.getItem(key);
          
          // Retrieve file
          const fileKey = `book_file_${bookId}`;
          const file = await localforage.getItem(fileKey);
          
          if (metadata && file) {
            loadedBooks.push({
              ...(metadata as Omit<BookData, 'file'>),
              file: file as File
            });
          }
        }
        
        // Set the books in state
        setBooks(loadedBooks);
      } catch (error) {
        console.error("Error loading books from storage", error);
      }
    };

    loadBooks();
  }, []);

  // Save books to localforage when they change
  useEffect(() => {
    const saveBooks = async () => {
      try {
        // Remove any existing keys first
        const keys = await localforage.keys();
        const bookMetadataKeys = keys.filter(key => 
          key.startsWith('book_metadata_') || key.startsWith('book_file_')
        );
        
        for (const key of bookMetadataKeys) {
          await localforage.removeItem(key);
        }

        // Save each book's metadata and file
        for (const book of books) {
          // Save metadata
          await localforage.setItem(`book_metadata_${book.id}`, {
            id: book.id,
            title: book.title,
            author: book.author,
            coverUrl: book.coverUrl,
            currentPage: book.currentPage,
            lastRead: book.lastRead
          });
          
          // Save file
          await localforage.setItem(`book_file_${book.id}`, book.file);
        }
      } catch (error) {
        console.error("Error saving books to storage", error);
      }
    };

    if (books.length > 0) {
      saveBooks();
    }
  }, [books]);

  // // Add a new book to the library
  // const addBook = async (file: File): Promise<void> => {
  //   if (file.name.split('.').pop()?.toLowerCase() !== 'epub') {
  //     throw new Error('Please upload an EPUB file');
  //   }

  //   setIsLoading(true);

  //   try {
  //     // Load the epub file using JSZip
  //     const zip = new JSZip();
  //     const content = await zip.loadAsync(file);
      
  //     // Find the container.xml file
  //     const containerXml = await content.file('META-INF/container.xml')?.async('text');
  //     if (!containerXml) {
  //       throw new Error('Invalid EPUB: container.xml not found');
  //     }
      
  //     // Parse the container.xml to find the OPF file
  //     const parser = new DOMParser();
  //     const containerDoc = parser.parseFromString(containerXml, 'application/xml');
  //     const rootfiles = containerDoc.getElementsByTagName('rootfile');
      
  //     if (rootfiles.length === 0) {
  //       throw new Error('Invalid EPUB: No rootfile found in container.xml');
  //     }
      
  //     // Get the path to the OPF file
  //     const opfPath = rootfiles[0].getAttribute('full-path') || '';
      
  //     // Load the OPF file
  //     const opfContent = await content.file(opfPath)?.async('text');
  //     if (!opfContent) {
  //       throw new Error('Invalid EPUB: OPF file not found');
  //     }
      
  //     // Parse the OPF file to get metadata
  //     const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      
  //     // Get the book title
  //     const titleElements = opfDoc.getElementsByTagName('dc:title');
  //     const title = titleElements.length > 0 
  //       ? titleElements[0].textContent || 'Unknown Title'
  //       : 'Unknown Title';
      
  //     // Get the book author
  //     const creatorElements = opfDoc.getElementsByTagName('dc:creator');
  //     const author = creatorElements.length > 0
  //       ? creatorElements[0].textContent || 'Unknown Author'
  //       : 'Unknown Author';
      
  //     // Generate a unique ID
  //     const id = Date.now().toString();
      
  //     // Find the cover image
  //     let coverUrl = null;
  //     const metaTags = opfDoc.getElementsByTagName('meta');
  //     let coverId = '';
      
  //     // Try to find the cover ID
  //     for (let i = 0; i < metaTags.length; i++) {
  //       const meta = metaTags[i];
  //       if (meta.getAttribute('name') === 'cover') {
  //         coverId = meta.getAttribute('content') || '';
  //         break;
  //       }
  //     }
      
  //     // If we found a cover ID, find the actual file
  //     if (coverId) {
  //       const items = opfDoc.getElementsByTagName('item');
  //       for (let i = 0; i < items.length; i++) {
  //         const item = items[i];
  //         if (item.getAttribute('id') === coverId) {
  //           const href = item.getAttribute('href') || '';
  //           // Get the directory of the OPF file to resolve relative paths
  //           const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
  //           const coverPath = opfDir + href;
            
  //           // Get the cover image as a blob
  //           const coverBlob = await content.file(coverPath)?.async('blob');
  //           if (coverBlob) {
  //             coverUrl = URL.createObjectURL(coverBlob);
  //           }
  //           break;
  //         }
  //       }
  //     }
      
  //     // Create a new book object
  //     const newBook: BookData = {
  //       id,
  //       title,
  //       author,
  //       coverUrl,
  //       currentPage: 0,
  //       file,
  //       lastRead: new Date().toISOString()
  //     };
      
  //     // Add the book to our library
  //     setBooks(prevBooks => [...prevBooks, newBook]);
      
  //   } catch (error) {
  //     console.error('Error processing EPUB file:', error);
  //     throw error;
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };


  // Add a new book to the library
  const addBook = async (file: File): Promise<void> => {
    if (file.name.split('.').pop()?.toLowerCase() !== 'epub') {
      throw new Error('Please upload an EPUB file');
    }

    setIsLoading(true);

    try {
      // Load the epub file using JSZip
      const zip = new JSZip();
      const content = await zip.loadAsync(file);
      
      // Find the container.xml file
      const containerXml = await content.file('META-INF/container.xml')?.async('text');
      if (!containerXml) {
        throw new Error('Invalid EPUB: container.xml not found');
      }
      
      // Parse the container.xml to find the OPF file
      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerXml, 'application/xml');
      const rootfiles = containerDoc.getElementsByTagName('rootfile');
      
      if (rootfiles.length === 0) {
        throw new Error('Invalid EPUB: No rootfile found in container.xml');
      }
      
      // Get the path to the OPF file
      const opfPath = rootfiles[0].getAttribute('full-path') || '';
      
      // Load the OPF file
      const opfContent = await content.file(opfPath)?.async('text');
      if (!opfContent) {
        throw new Error('Invalid EPUB: OPF file not found');
      }
      
      // Parse the OPF file to get metadata
      const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      
      // Get the book title
      const titleElements = opfDoc.getElementsByTagName('dc:title');
      const title = titleElements.length > 0 
        ? titleElements[0].textContent || 'Unknown Title'
        : 'Unknown Title';
      
      // Get the book author
      const creatorElements = opfDoc.getElementsByTagName('dc:creator');
      const author = creatorElements.length > 0
        ? creatorElements[0].textContent || 'Unknown Author'
        : 'Unknown Author';
      
      // Generate a unique ID
      const id = Date.now().toString();
      
      // Find the cover image
      let coverUrl = null;
      let coverBlob: Blob | null = null;
      const metaTags = opfDoc.getElementsByTagName('meta');
      let coverId = '';
      
      // Try to find the cover ID
      for (let i = 0; i < metaTags.length; i++) {
        const meta = metaTags[i];
        if (meta.getAttribute('name') === 'cover') {
          coverId = meta.getAttribute('content') || '';
          break;
        }
      }
      
      // If we found a cover ID, find the actual file
      // If we found a cover ID, find the actual file
      if (coverId) {
        const items = opfDoc.getElementsByTagName('item');
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.getAttribute('id') === coverId) {
            const href = item.getAttribute('href') || '';
            // Get the directory of the OPF file to resolve relative paths
            const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
            const coverPath = opfDir + href;
            
            // Get the cover image as a blob
            const potentialCoverBlob = await content.file(coverPath)?.async('blob');
            
            // Only proceed if blob exists
            if (potentialCoverBlob) {
              // Convert blob to base64
              coverUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  resolve(reader.result as string);
                };
                reader.readAsDataURL(potentialCoverBlob);
              });
            }
            break;
          }
        }
      }
      
      // Create a new book object
      const newBook: BookData = {
        id,
        title,
        author,
        coverUrl, // Now this is a base64 string or null
        currentPage: 0,
        totalPages: 0,
        file,
        lastRead: new Date().toISOString(),
        lastChapter: undefined // Optional, can be omitted
      };
      
      // Add the book to our library
      setBooks(prevBooks => [...prevBooks, newBook]);
      
    } catch (error) {
      console.error('Error processing EPUB file:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Remove a book from the library
  const removeBook = async (bookId: string): Promise<void> => {
    // Find the book to remove its cover URL
    const book = books.find(b => b.id === bookId);
    if (book && book.coverUrl) {
      URL.revokeObjectURL(book.coverUrl);
    }
    
    // Remove from localforage
    try {
      await localforage.removeItem(`book_metadata_${bookId}`);
      await localforage.removeItem(`book_file_${bookId}`);
    } catch (error) {
      console.error('Error removing book from storage', error);
    }
    
    // Remove from state
    setBooks(prevBooks => prevBooks.filter(b => b.id !== bookId));
  };

  // // Open a book to read
  // const openBook = async (book: BookData): Promise<void> => {
  //   setIsLoading(true);
  //   setBookTitle(book.title);
  //   setBookAuthor(book.author);
  //   setCurrentPage(book.currentPage || 0);
  //   setCurrentBook(book);
    
  //   try {
  //     // Load the epub file again
  //     const zip = new JSZip();
  //     const content = await zip.loadAsync(book.file);
  //     setBookZip(content);
      
  //     // Find the container.xml file
  //     const containerXml = await content.file('META-INF/container.xml')?.async('text');
  //     if (!containerXml) {
  //       throw new Error('Invalid EPUB: container.xml not found');
  //     }
      
  //     // Parse the container.xml to find the OPF file
  //     const parser = new DOMParser();
  //     const containerDoc = parser.parseFromString(containerXml, 'application/xml');
  //     const rootfiles = containerDoc.getElementsByTagName('rootfile');
      
  //     if (rootfiles.length === 0) {
  //       throw new Error('Invalid EPUB: No rootfile found in container.xml');
  //     }
      
  //     // Get the path to the OPF file
  //     const opf = rootfiles[0].getAttribute('full-path') || '';
  //     setOpfPath(opf);
      
  //     // Load the OPF file
  //     const opfContent = await content.file(opf)?.async('text');
  //     if (!opfContent) {
  //       throw new Error('Invalid EPUB: OPF file not found');
  //     }
      
  //     // Parse the OPF file
  //     const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      
  //     // Get the spine - this defines the reading order
  //     const spine = opfDoc.getElementsByTagName('spine')[0];
  //     const itemrefs = spine.getElementsByTagName('itemref');
      
  //     // Get the manifest - this maps IDs to file paths
  //     const manifest = opfDoc.getElementsByTagName('manifest')[0];
  //     const items = manifest.getElementsByTagName('item');
      
  //     // Map the spine items to their file paths
  //     const fileOrder: string[] = [];
  //     for (let i = 0; i < itemrefs.length; i++) {
  //       const idref = itemrefs[i].getAttribute('idref');
  //       for (let j = 0; j < items.length; j++) {
  //         if (items[j].getAttribute('id') === idref) {
  //           const href = items[j].getAttribute('href') || '';
  //           // Get the directory of the OPF file to resolve relative paths
  //           const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
  //           fileOrder.push(opfDir + href);
  //           break;
  //         }
  //       }
  //     }
      
  //     setHtmlFiles(fileOrder);
  //     setTotalPages(fileOrder.length);
      
  //     // Extract table of contents (keep your existing TOC extraction logic)
  //     // Extract table of contents
  //     const extractToc = async (): Promise<TOCItem[]> => {
  //       let tocPath = '';
  //       let tocItems: TOCItem[] = [];
  //       let tocFound = false;
        
  //       // Method 1: Check for nav document (EPUB3)
  //       for (let i = 0; i < items.length; i++) {
  //         const item = items[i];
  //         const properties = item.getAttribute('properties');
  //         if (properties && properties.includes('nav')) {
  //           const href = item.getAttribute('href') || '';
  //           const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
  //           tocPath = opfDir + href;
            
  //           try {
  //             const tocContent = await content.file(tocPath)?.async('text');
  //             if (tocContent) {
  //               const tocDoc = parser.parseFromString(tocContent, 'text/html');
  //               const navs = tocDoc.getElementsByTagName('nav');
                
  //               for (let i = 0; i < navs.length; i++) {
  //                 const nav = navs[i];
  //                 const type = nav.getAttribute('epub:type');
  //                 if (type === 'toc') {
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
                            
  //                           const nestedOl = li.getElementsByTagName('ol')[0];
  //                           if (nestedOl) {
  //                             item.children = parseTocItems(nestedOl);
  //                           }
                            
  //                           items.push(item);
  //                         }
  //                       }
                        
  //                       return items;
  //                     };
                      
  //                     tocItems = parseTocItems(ol);
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


  // Open a book to read
  const openBook = async (book: BookData): Promise<void> => {
    setIsLoading(true);
    setBookTitle(book.title);
    setBookAuthor(book.author);
    setCurrentPage(book.currentPage || 0);
    setCurrentBook(book);
    
    try {
      // Load the epub file again
      const zip = new JSZip();
      const content = await zip.loadAsync(book.file);
      setBookZip(content);
      
      // Find the container.xml file
      const containerXml = await content.file('META-INF/container.xml')?.async('text');
      if (!containerXml) {
        throw new Error('Invalid EPUB: container.xml not found');
      }
      
      // Parse the container.xml to find the OPF file
      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerXml, 'application/xml');
      const rootfiles = containerDoc.getElementsByTagName('rootfile');
      
      if (rootfiles.length === 0) {
        throw new Error('Invalid EPUB: No rootfile found in container.xml');
      }
      
      // Get the path to the OPF file
      const opf = rootfiles[0].getAttribute('full-path') || '';
      setOpfPath(opf);
      
      // Load the OPF file
      const opfContent = await content.file(opf)?.async('text');
      if (!opfContent) {
        throw new Error('Invalid EPUB: OPF file not found');
      }
      
      // Parse the OPF file
      const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      
      // Get the spine - this defines the reading order
      const spine = opfDoc.getElementsByTagName('spine')[0];
      const itemrefs = spine.getElementsByTagName('itemref');
      
      // Get the manifest - this maps IDs to file paths
      const manifest = opfDoc.getElementsByTagName('manifest')[0];
      const items = manifest.getElementsByTagName('item');
      
      // Map the spine items to their file paths
      const fileOrder: string[] = [];
      for (let i = 0; i < itemrefs.length; i++) {
        const idref = itemrefs[i].getAttribute('idref');
        for (let j = 0; j < items.length; j++) {
          if (items[j].getAttribute('id') === idref) {
            const href = items[j].getAttribute('href') || '';
            // Get the directory of the OPF file to resolve relative paths
            const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
            fileOrder.push(opfDir + href);
            break;
          }
        }
      }
      
      // Set the HTML files array
      setHtmlFiles(fileOrder);
      setTotalPages(fileOrder.length);
      
      // Extract table of contents
      const extractToc = async (): Promise<TOCItem[]> => {
        // Existing TOC extraction code ...
        // (keeping the implementation the same)
        let tocPath = '';
        let tocItems: TOCItem[] = [];
        let tocFound = false;
        
        // Method 1: Check for nav document (EPUB3)
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const properties = item.getAttribute('properties');
          if (properties && properties.includes('nav')) {
            const href = item.getAttribute('href') || '';
            const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
            tocPath = opfDir + href;
            
            try {
              const tocContent = await content.file(tocPath)?.async('text');
              if (tocContent) {
                const tocDoc = parser.parseFromString(tocContent, 'text/html');
                const navs = tocDoc.getElementsByTagName('nav');
                
                for (let i = 0; i < navs.length; i++) {
                  const nav = navs[i];
                  const type = nav.getAttribute('epub:type');
                  if (type === 'toc') {
                    const ol = nav.getElementsByTagName('ol')[0];
                    if (ol) {
                      const parseTocItems = (ol: Element): TOCItem[] => {
                        const items: TOCItem[] = [];
                        const lis = ol.getElementsByTagName('li');
                        
                        for (let j = 0; j < lis.length; j++) {
                          const li = lis[j];
                          const a = li.getElementsByTagName('a')[0];
                          if (a) {
                            const href = a.getAttribute('href') || '';
                            const label = a.textContent || '';
                            const id = `toc-${j}`;
                            
                            const item: TOCItem = {
                              id,
                              href,
                              label,
                              children: []
                            };
                            
                            const nestedOl = li.getElementsByTagName('ol')[0];
                            if (nestedOl) {
                              item.children = parseTocItems(nestedOl);
                            }
                            
                            items.push(item);
                          }
                        }
                        
                        return items;
                      };
                      
                      tocItems = parseTocItems(ol);
                      tocFound = true;
                      break;
                    }
                  }
                }
              }
            } catch (error) {
              console.error("Error parsing EPUB3 nav document:", error);
            }
            
            break;
          }
        }
        
        // Method 2: Check for NCX file (EPUB2)
        if (!tocFound) {
          const tocAttr = spine.getAttribute('toc');
          if (tocAttr) {
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.getAttribute('id') === tocAttr) {
                const href = item.getAttribute('href') || '';
                const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
                tocPath = opfDir + href;
                break;
              }
            }
          } else {
            // Try media-type approach
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.getAttribute('media-type') === 'application/x-dtbncx+xml') {
                const href = item.getAttribute('href') || '';
                const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
                tocPath = opfDir + href;
                break;
              }
            }
          }
          
          if (tocPath) {
            try {
              const ncxContent = await content.file(tocPath)?.async('text');
              if (ncxContent) {
                const ncxDoc = parser.parseFromString(ncxContent, 'application/xml');
                const navPoints = ncxDoc.getElementsByTagName('navPoint');
                
                if (navPoints.length > 0) {
                  const processNavPoint = (navPoint: Element, index: number): TOCItem => {
                    const navLabel = navPoint.getElementsByTagName('navLabel')[0];
                    const text = navLabel?.getElementsByTagName('text')[0]?.textContent || '';
                    const content = navPoint.getElementsByTagName('content')[0];
                    const src = content?.getAttribute('src') || '';
                    
                    return {
                      id: `toc-${index}`,
                      label: text,
                      href: src,
                      children: []
                    };
                  };
                  
                  // Create all items
                  const tempItems: TOCItem[] = [];
                  const navPointMap = new Map<string, TOCItem>();
                  
                  for (let i = 0; i < navPoints.length; i++) {
                    const navPoint = navPoints[i];
                    const id = navPoint.getAttribute('id') || '';
                    const item = processNavPoint(navPoint, i);
                    navPointMap.set(id, item);
                    tempItems.push(item);
                  }
                  
                  // Build hierarchy
                  for (let i = 0; i < navPoints.length; i++) {
                    const navPoint = navPoints[i];
                    const id = navPoint.getAttribute('id') || '';
                    const parentNode = navPoint.parentNode as Element;
                    
                    if (parentNode && parentNode.nodeName === 'navPoint') {
                      const parentId = parentNode.getAttribute('id') || '';
                      const parentItem = navPointMap.get(parentId);
                      const childItem = navPointMap.get(id);
                      
                      if (parentItem && childItem) {
                        parentItem.children.push(childItem);
                        // Remove from top level
                        const index = tempItems.findIndex(item => item.id === childItem.id);
                        if (index !== -1) {
                          tempItems.splice(index, 1);
                        }
                      }
                    }
                  }
                  
                  tocItems = tempItems;
                  tocFound = true;
                }
              }
            } catch (error) {
              console.error("Error parsing EPUB2 NCX file:", error);
            }
          }
        }
        
      //   // Method 3: Create from spine if no TOC found
      //   if (!tocFound) {
      //     for (let i = 0; i < fileOrder.length; i++) {
      //       const filePath = fileOrder[i];
      //       const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
      //       const label = fileName.replace(/\.x?html?$/, '').replace(/[-_]/g, ' ');
            
      //       tocItems.push({
      //         id: `toc-${i}`,
      //         label: label.charAt(0).toUpperCase() + label.slice(1), // Capitalize first letter
      //         href: filePath.substring(opf.substring(0, opf.lastIndexOf('/') + 1).length),
      //         children: []
      //       });
      //     }
      //   }
        
      //   return tocItems;
      // };


      // Method 3: Create from spine if no TOC found
      if (!tocFound) {
          for (let i = 0; i < fileOrder.length; i++) {
            const filePath = fileOrder[i];
            const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
            const label = fileName.replace(/\.x?html?$/, '').replace(/[-_]/g, ' ');
            
            tocItems.push({
              id: `toc-${i}`,
              label: label.charAt(0).toUpperCase() + label.slice(1), // Capitalize first letter
              href: filePath.substring(opf.substring(0, opf.lastIndexOf('/') + 1).length),
              children: []
            });
          }
        }
        
        return tocItems;
      };
      
      // Set the TOC
      const tocItems = await extractToc();
      setToc(tocItems);
      
      // // // // Load the first HTML file
      // if (fileOrder.length > 0) {
      //   await loadPage(book.currentPage || 0);
      // } else {
      //   throw new Error('No HTML files found in the EPUB');
      // }



      // // Update the last read date for this book
      // // setBooks(prevBooks => 
      // //   prevBooks.map(b => 
      // //     b.id === book.id 
      // //       ? { ...b, lastRead: new Date().toISOString() } 
      // //       : b
      // //   )
      // // );

      //     // Determine the page to load
      // let pageToLoad = book.currentPage || 0;

      //   // If there's a last chapter, find its corresponding page
      //   if (book.lastChapter) {
      //     const chapterIndex = toc.findIndex(item => 
      //       item.id === book.lastChapter?.id
      //     );

      //     if (chapterIndex !== -1) {
      //       // Find the first page that matches the chapter's file
      //       const chapterFilePath = book.lastChapter?.href.split('#')[0];
      //       const pageIndex = htmlFiles.findIndex(file => 
      //         file.endsWith(chapterFilePath || '')
      //       );

      //       if (pageIndex !== -1) {
      //         pageToLoad = pageIndex;
      //       }
      //     }
      //   }

      //   // Load the appropriate page
      //   if (htmlFiles.length > 0) {
      //     await loadPage(pageToLoad);
      // } else {
      //     throw new Error('No HTML files found in the EPUB');
      // }

          // CHECK HERE: We need to check fileOrder directly, not htmlFiles
      if (fileOrder.length > 0) {
        // Determine the page to load
        let pageToLoad = book.currentPage || 0;

        // If there's a last chapter, find its corresponding page
        if (book.lastChapter) {
          const chapterIndex = tocItems.findIndex(item => 
            item.id === book.lastChapter?.id
          );

          if (chapterIndex !== -1) {
            // Find the first page that matches the chapter's file
            const chapterFilePath = book.lastChapter?.href.split('#')[0];
            const pageIndex = fileOrder.findIndex(file => 
              file.endsWith(chapterFilePath || '')
            );

            if (pageIndex !== -1) {
              pageToLoad = pageIndex;
            }
          }
        }

        // Load the appropriate page using fileOrder directly
        await loadPage(pageToLoad);
      } else {
        throw new Error('No HTML files found in the EPUB');
      }


      // Update the last read date and last chapter for this book
      // Update the last read date and last chapter for this book
      // setBooks(prevBooks => 
      //   prevBooks.map(b => 
      //     b.id === book.id 
      //       ? { 
      //           ...b, 
      //           lastRead: new Date().toISOString(),
      //           lastChapter: toc.length > 0 ? findChapterForPage(book.currentPage || 0) : undefined
      //         } as BookData
      //       : b
      //   )
      // );


          // Update the last read date and last chapter for this book
      setBooks(prevBooks => 
        prevBooks.map(b => 
          b.id === book.id 
            ? { 
                ...b, 
                lastRead: new Date().toISOString(),
                lastChapter: tocItems.length > 0 ? findChapterForPage(book.currentPage || 0) : undefined
              } as BookData
            : b
        )
      );
      
      // Switch to reading view
      setIsReading(true);
    } catch (error) {
      console.error('Error opening EPUB file:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };


  // Helper function to find the chapter for a given page
  const findChapterForPage = (pageIndex: number): TOCItem | null => {
    // Find the TOC item that corresponds to this page
    for (let i = 0; i < toc.length; i++) {
      const tocItem = toc[i];
      
      // Try to find the file path in the TOC item
      const itemFilePath = tocItem.href.split('#')[0];
      
      // Check if the current page's file matches the TOC item's file
      if (htmlFiles[pageIndex].endsWith(itemFilePath)) {
        return tocItem;
      }
    }
    
    return null;
  };

  // // Load a specific page
  // const loadPage = async (pageIndex: number): Promise<void> => {
  //   if (!bookZip || pageIndex < 0 || pageIndex >= htmlFiles.length) {
  //     return;
  //   }
    
  //   try {
  //     // Load the HTML content
  //     const htmlContent = await bookZip.file(htmlFiles[pageIndex])?.async('text');
  //     if (!htmlContent) {
  //       throw new Error(`Could not load page ${pageIndex}`);
  //     }
      
  //     // Get the directory of the HTML file to resolve relative paths
  //     const fileDir = getDirectoryPath(htmlFiles[pageIndex]);
      
  //     // Process the HTML to fix relative paths
  //     const processedHtml = processHtmlContent(htmlContent, fileDir);
      
  //     setCurrentContent(processedHtml);
  //     setCurrentPage(pageIndex);
    
  //     // Extract text for SimplePlayMode
  //     const extractedText = extractTextFromHtml(processedHtml);
  //     setCurrentPageText(extractedText);

  //     // Find the corresponding TOC item for this page
  //     const currentChapter = findChapterForPage(pageIndex);

  //     // // Update the current page in the books array
  //     // if (currentBook) {
  //     //   setBooks(prevBooks => 
  //     //     prevBooks.map(b => 
  //     //       b.id === currentBook.id 
  //     //         ? { ...b, currentPage: pageIndex } 
  //     //         : b
  //     //     )
  //     //   );
  //     // }


  //     // Update the current page in the books array
  //     if (currentBook) {
  //       setBooks(prevBooks => 
  //         prevBooks.map(b => 
  //           b.id === currentBook.id 
  //             ? { 
  //                 ...b, 
  //                 currentPage: pageIndex,
  //                 lastChapter: currentChapter // Save the current chapter
  //               } 
  //             : b
  //         )
  //       );
  //     }
        
  //     // After rendering the content, load any images
  //     setTimeout(() => {
  //       const content = document.querySelector('.epub-content');
  //       if (content) {
  //         const images = content.querySelectorAll('img[src^="data:image/png;base64,IMAGE_PLACEHOLDER_"]');
  //         images.forEach(async (img: Element) => {
  //           const src = (img as HTMLImageElement).src;
  //           const imagePath = src.replace('data:image/png;base64,IMAGE_PLACEHOLDER_', '');
            
  //           try {
  //             const imageBlob = await bookZip.file(imagePath)?.async('blob');
  //             if (imageBlob) {
  //               const imageUrl = URL.createObjectURL(imageBlob);
  //               (img as HTMLImageElement).src = imageUrl;
  //             }
  //           } catch (error) {
  //             console.error(`Error loading image: ${imagePath}`, error);
  //           }
  //         });
          
  //         const links = content.querySelectorAll('link[href^="data:text/css;base64,CSS_PLACEHOLDER_"]');
  //         links.forEach(async (link: Element) => {
  //           const href = (link as HTMLLinkElement).href;
  //           const cssPath = href.replace('data:text/css;base64,CSS_PLACEHOLDER_', '');
            
  //           try {
  //             const cssContent = await bookZip.file(cssPath)?.async('text');
  //             if (cssContent) {
  //               // Create a new style element with the CSS content
  //               const style = document.createElement('style');
  //               style.textContent = cssContent;
  //               link.parentNode?.replaceChild(style, link);
  //             }
  //           } catch (error) {
  //             console.error(`Error loading CSS: ${cssPath}`, error);
  //           }
  //         });
  //       }
  //     }, 100);
      
  //   } catch (error) {
  //     console.error('Error loading page:', error);
  //     throw error;
  //   }
  // };


  // Load a specific page
  const loadPage = async (pageIndex: number): Promise<void> => {
    // console.log('Loading page:', {
    //   pageIndex,
    //   bookZipExists: !!bookZip,
    //   htmlFilesLength: htmlFiles.length
    // });

    // if (!bookZip || pageIndex < 0 || pageIndex >= htmlFiles.length) {
    //   console.error('Invalid page load conditions');
    //   return;
    // }

    console.log('Loading page:', {
      pageIndex,
      bookZipExists: !!bookZip,
      htmlFilesLength: htmlFiles.length
    });
  
    if (!bookZip || pageIndex < 0 || pageIndex >= htmlFiles.length) {
      console.error('Invalid page load conditions', {
        bookZipExists: !!bookZip,
        pageIndex,
        htmlFilesLength: htmlFiles.length
      });
      return;
    }
    
    try {
      // Load the HTML content
      const htmlContent = await bookZip.file(htmlFiles[pageIndex])?.async('text');
      console.log('HTML Content:', {
        contentLength: htmlContent?.length,
        filePath: htmlFiles[pageIndex]
      });

      if (!htmlContent) {
        throw new Error(`Could not load page ${pageIndex}`);
      }
      
      // Get the directory of the HTML file to resolve relative paths
      const fileDir = getDirectoryPath(htmlFiles[pageIndex]);
      
      // Process the HTML to fix relative paths
      const processedHtml = processHtmlContent(htmlContent, fileDir);
      
      console.log('Processed HTML:', {
        length: processedHtml.length,
        firstChars: processedHtml.slice(0, 200)
      });

      // Ensure content is not empty
      if (!processedHtml.trim()) {
        console.warn('Processed HTML is empty');
      }
      
      // Set the content
      setCurrentContent(processedHtml);
      setCurrentPage(pageIndex);
    
      // Extract text for SimplePlayMode
      const extractedText = extractTextFromHtml(processedHtml);
      setCurrentPageText(extractedText);

      console.log('Extracted Text:', {
        length: extractedText.length,
        firstChars: extractedText.slice(0, 200)
      });

      // Find the corresponding TOC item for this page
      const currentChapter = findChapterForPage(pageIndex);

      // Update the current page in the books array
      if (currentBook) {
        setBooks(prevBooks => 
          prevBooks.map(b => 
            b.id === currentBook.id 
              ? { 
                  ...b, 
                  currentPage: pageIndex,
                  lastChapter: currentChapter // Save the current chapter
                } 
              : b
          )
        );
      }
          
      // After rendering the content, load any images
      setTimeout(() => {
        const content = document.querySelector('.epub-content');
        console.log('Content Element:', !!content);

        if (content) {
          // Explicitly set innerHTML
          content.innerHTML = processedHtml;

          const images = content.querySelectorAll('img[src^="data:image/png;base64,IMAGE_PLACEHOLDER_"]');
          images.forEach(async (img: Element) => {
            const src = (img as HTMLImageElement).src;
            const imagePath = src.replace('data:image/png;base64,IMAGE_PLACEHOLDER_', '');
            
            try {
              const imageBlob = await bookZip.file(imagePath)?.async('blob');
              if (imageBlob) {
                const imageUrl = URL.createObjectURL(imageBlob);
                (img as HTMLImageElement).src = imageUrl;
              }
            } catch (error) {
              console.error(`Error loading image: ${imagePath}`, error);
            }
          });
          
          const links = content.querySelectorAll('link[href^="data:text/css;base64,CSS_PLACEHOLDER_"]');
          links.forEach(async (link: Element) => {
            const href = (link as HTMLLinkElement).href;
            const cssPath = href.replace('data:text/css;base64,CSS_PLACEHOLDER_', '');
            
            try {
              const cssContent = await bookZip.file(cssPath)?.async('text');
              if (cssContent) {
                // Create a new style element with the CSS content
                const style = document.createElement('style');
                style.textContent = cssContent;
                link.parentNode?.replaceChild(style, link);
              }
            } catch (error) {
              console.error(`Error loading CSS: ${cssPath}`, error);
            }
          });
        }
      }, 100);
      
    } catch (error) {
      console.error('Error loading page:', error);
      throw error;
    }
  };

  // Navigate to the next page
  const nextPage = (): void => {
    if (currentPage < totalPages - 1) {
      loadPage(currentPage + 1);
    }
  };

  // Navigate to the previous page
  const prevPage = (): void => {
    if (currentPage > 0) {
      loadPage(currentPage - 1);
    }
  };

  // Navigate to a specific TOC item
  const navigateToTocItem = (item: TOCItem): void => {
    // Handle fragment-only hrefs
    if (item.href.startsWith('#')) {
      const fragment = item.href.substring(1);
      const element = document.getElementById(fragment);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    
    // Split to get file path and optional fragment
    let [filePath, fragment] = item.href.split('#');
    
    // Remove any query parameters
    filePath = filePath.split('?')[0];
    
    // Normalize the path (handle ../ and ./)
    const opfDir = getDirectoryPath(opfPath);
    
    // Try multiple approaches to find the correct file
    let fileIndex = htmlFiles.findIndex(file => file.endsWith(filePath));
    
    // Try with the OPF directory
    if (fileIndex === -1 && !filePath.startsWith('/')) {
      const fullPath = opfDir + filePath;
      fileIndex = htmlFiles.findIndex(file => file === fullPath);
    }
    
    // Try resolving relative paths
    if (fileIndex === -1) {
      const resolvedPath = resolveRelativePath(opfDir, filePath);
      fileIndex = htmlFiles.findIndex(file => file === resolvedPath);
    }
    
    // Just match the filename
    if (fileIndex === -1) {
      const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
      fileIndex = htmlFiles.findIndex(file => file.endsWith('/' + fileName));
    }
    
    if (fileIndex !== -1) {
      loadPage(fileIndex);
      
      // If there's a fragment, scroll to it after loading
      if (fragment) {
        setTimeout(() => {
          const element = document.getElementById(fragment);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 300);
      }
    }
  };

  // Close the book and return to the library
  const closeBook = (): void => {
    // Reset all book state
    setCurrentBook(null);
    setBookZip(null);
    setOpfPath('');
    setHtmlFiles([]);
    setToc([]);
    setCurrentContent('');
    setIsReading(false);
    setBookTitle('');
    setBookAuthor('');
    setIsPlayModeVisible(false);
    setCurrentPageText('');
  };

  // Toggle PlayMode visibility
  const togglePlayMode = (): void => {
    setIsPlayModeVisible(!isPlayModeVisible);
  };

  const value: BookContextValue = {
    // Library state
    books,
    addBook,
    removeBook,
    
    // Current book state
    currentBook,
    isReading,
    isLoading,
    bookTitle,
    bookAuthor,
    currentPage,
    totalPages,
    currentContent,
    currentPageText,
    toc,
    
    // Book actions
    openBook,
    closeBook,
    nextPage,
    prevPage,
    navigateToTocItem,
    
    // Book details
    htmlFiles,
    opfPath,
    
    // Play mode
    isPlayModeVisible,
    togglePlayMode
  };

  return (
    <BookContext.Provider value={value}>
      {children}
    </BookContext.Provider>
  );
  };