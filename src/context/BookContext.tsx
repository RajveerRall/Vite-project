// // // src/context/BookContext.tsx
// // import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// // import JSZip from 'jszip';
// // import { DOMParser } from 'xmldom';
// // // import { BookData, TOCItem } from '../types/book';
// // import { getDirectoryPath, resolveRelativePath } from '../utils/pathUtils';
// // import { processHtmlContent, extractTextFromHtml } from '../utils/textExtraction';
// // import { BookData, TOCItem } from '@/types/books';

// // interface BookContextValue {
// // // Library state
// // books: BookData[];
// // addBook: (file: File) => Promise<void>;
// // removeBook: (bookId: string) => void;

// // // Current book state
// // currentBook: BookData | null;
// // isReading: boolean;
// // isLoading: boolean;
// // bookTitle: string;
// // bookAuthor: string;
// // currentPage: number;
// // totalPages: number;
// // currentContent: string;
// // currentPageText: string;
// // toc: TOCItem[];

// // // Book actions
// // openBook: (book: BookData) => Promise<void>;
// // closeBook: () => void;
// // nextPage: () => void;
// // prevPage: () => void;
// // navigateToTocItem: (item: TOCItem) => void;

// // // Book details
// // htmlFiles: string[];
// // opfPath: string;

// // // Play mode
// // isPlayModeVisible: boolean;
// // togglePlayMode: () => void;
// // }

// // const BookContext = createContext<BookContextValue | undefined>(undefined);

// // export const useBook = (): BookContextValue => {
// // const context = useContext(BookContext);
// // if (context === undefined) {
// //   throw new Error('useBook must be used within a BookProvider');
// // }
// // return context;
// // };

// // interface BookProviderProps {
// // children: ReactNode;
// // }

// // export const BookProvider: React.FC<BookProviderProps> = ({ children }) => {
// // // Library state
// // const [books, setBooks] = useState<BookData[]>([]);

// // // Current book state
// // const [currentBook, setCurrentBook] = useState<BookData | null>(null);
// // const [isReading, setIsReading] = useState<boolean>(false);
// // const [isLoading, setIsLoading] = useState<boolean>(false);
// // const [bookTitle, setBookTitle] = useState<string>('');
// // const [bookAuthor, setBookAuthor] = useState<string>('');
// // const [currentPage, setCurrentPage] = useState<number>(0);
// // const [totalPages, setTotalPages] = useState<number>(0);
// // const [currentContent, setCurrentContent] = useState<string>('');
// // const [currentPageText, setCurrentPageText] = useState<string>('');
// // const [toc, setToc] = useState<TOCItem[]>([]);
// // const [bookZip, setBookZip] = useState<JSZip | null>(null);
// // const [opfPath, setOpfPath] = useState<string>('');
// // const [htmlFiles, setHtmlFiles] = useState<string[]>([]);

// // // Play mode state
// // const [isPlayModeVisible, setIsPlayModeVisible] = useState<boolean>(false);

// // // Load books from localStorage on initial render
// // useEffect(() => {
// //   const savedBooks = localStorage.getItem('ebooks');
// //   if (savedBooks) {
// //     try {
// //       setBooks(JSON.parse(savedBooks));
// //     } catch (e) {
// //       console.error("Error loading books from localStorage", e);
// //       setBooks([]);
// //     }
// //   }
// // }, []);

// // // Save books to localStorage when they change
// // useEffect(() => {
// //   if (books.length > 0) {
// //     try {
// //       // We need to serialize the books without the File objects
// //       const serializableBooks = books.map(book => {
// //         const { file, ...serializableBook } = book;
// //         return serializableBook;
// //       });
// //       localStorage.setItem('ebooks', JSON.stringify(serializableBooks));
// //     } catch (e) {
// //       console.error("Error saving books to localStorage", e);
// //     }
// //   }
// // }, [books]);

// // // Add a new book to the library
// // const addBook = async (file: File): Promise<void> => {
// //   if (file.name.split('.').pop()?.toLowerCase() !== 'epub') {
// //     throw new Error('Please upload an EPUB file');
// //   }

// //   setIsLoading(true);

// //   try {
// //     // Load the epub file using JSZip
// //     const zip = new JSZip();
// //     const content = await zip.loadAsync(file);
    
// //     // Find the container.xml file
// //     const containerXml = await content.file('META-INF/container.xml')?.async('text');
// //     if (!containerXml) {
// //       throw new Error('Invalid EPUB: container.xml not found');
// //     }
    
// //     // Parse the container.xml to find the OPF file
// //     const parser = new DOMParser();
// //     const containerDoc = parser.parseFromString(containerXml, 'application/xml');
// //     const rootfiles = containerDoc.getElementsByTagName('rootfile');
    
// //     if (rootfiles.length === 0) {
// //       throw new Error('Invalid EPUB: No rootfile found in container.xml');
// //     }
    
// //     // Get the path to the OPF file
// //     const opfPath = rootfiles[0].getAttribute('full-path') || '';
    
// //     // Load the OPF file
// //     const opfContent = await content.file(opfPath)?.async('text');
// //     if (!opfContent) {
// //       throw new Error('Invalid EPUB: OPF file not found');
// //     }
    
// //     // Parse the OPF file to get metadata
// //     const opfDoc = parser.parseFromString(opfContent, 'application/xml');
    
// //     // Get the book title
// //     const titleElements = opfDoc.getElementsByTagName('dc:title');
// //     const title = titleElements.length > 0 
// //       ? titleElements[0].textContent || 'Unknown Title'
// //       : 'Unknown Title';
    
// //     // Get the book author
// //     const creatorElements = opfDoc.getElementsByTagName('dc:creator');
// //     const author = creatorElements.length > 0
// //       ? creatorElements[0].textContent || 'Unknown Author'
// //       : 'Unknown Author';
    
// //     // Generate a unique ID
// //     const id = Date.now().toString();
    
// //     // Find the cover image
// //     let coverUrl = null;
// //     const metaTags = opfDoc.getElementsByTagName('meta');
// //     let coverId = '';
    
// //     // Try to find the cover ID
// //     for (let i = 0; i < metaTags.length; i++) {
// //       const meta = metaTags[i];
// //       if (meta.getAttribute('name') === 'cover') {
// //         coverId = meta.getAttribute('content') || '';
// //         break;
// //       }
// //     }
    
// //     // If we found a cover ID, find the actual file
// //     if (coverId) {
// //       const items = opfDoc.getElementsByTagName('item');
// //       for (let i = 0; i < items.length; i++) {
// //         const item = items[i];
// //         if (item.getAttribute('id') === coverId) {
// //           const href = item.getAttribute('href') || '';
// //           // Get the directory of the OPF file to resolve relative paths
// //           const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
// //           const coverPath = opfDir + href;
          
// //           // Get the cover image as a blob
// //           const coverBlob = await content.file(coverPath)?.async('blob');
// //           if (coverBlob) {
// //             coverUrl = URL.createObjectURL(coverBlob);
// //           }
// //           break;
// //         }
// //       }
// //     }
    
// //     // Create a new book object
// //     const newBook: BookData = {
// //       id,
// //       title,
// //       author,
// //       coverUrl,
// //       currentPage: 0,
// //       file,
// //       lastRead: new Date().toISOString()
// //     };
    
// //     // Add the book to our library
// //     setBooks(prevBooks => [...prevBooks, newBook]);
    
// //   } catch (error) {
// //     console.error('Error processing EPUB file:', error);
// //     throw error;
// //   } finally {
// //     setIsLoading(false);
// //   }
// // };

// // // Remove a book from the library
// // const removeBook = (bookId: string): void => {
// //   // Find the book to remove its cover URL
// //   const book = books.find(b => b.id === bookId);
// //   if (book && book.coverUrl) {
// //     URL.revokeObjectURL(book.coverUrl);
// //   }
  
// //   setBooks(prevBooks => prevBooks.filter(b => b.id !== bookId));
// // };

// // // Open a book to read
// // const openBook = async (book: BookData): Promise<void> => {
// //   setIsLoading(true);
// //   setBookTitle(book.title);
// //   setBookAuthor(book.author);
// //   setCurrentPage(book.currentPage || 0);
// //   setCurrentBook(book);
  
// //   try {
// //     // Load the epub file again
// //     const zip = new JSZip();
// //     const content = await zip.loadAsync(book.file);
// //     setBookZip(content);
    
// //     // Find the container.xml file
// //     const containerXml = await content.file('META-INF/container.xml')?.async('text');
// //     if (!containerXml) {
// //       throw new Error('Invalid EPUB: container.xml not found');
// //     }
    
// //     // Parse the container.xml to find the OPF file
// //     const parser = new DOMParser();
// //     const containerDoc = parser.parseFromString(containerXml, 'application/xml');
// //     const rootfiles = containerDoc.getElementsByTagName('rootfile');
    
// //     if (rootfiles.length === 0) {
// //       throw new Error('Invalid EPUB: No rootfile found in container.xml');
// //     }
    
// //     // Get the path to the OPF file
// //     const opf = rootfiles[0].getAttribute('full-path') || '';
// //     setOpfPath(opf);
    
// //     // Load the OPF file
// //     const opfContent = await content.file(opf)?.async('text');
// //     if (!opfContent) {
// //       throw new Error('Invalid EPUB: OPF file not found');
// //     }
    
// //     // Parse the OPF file
// //     const opfDoc = parser.parseFromString(opfContent, 'application/xml');
    
// //     // Get the spine - this defines the reading order
// //     const spine = opfDoc.getElementsByTagName('spine')[0];
// //     const itemrefs = spine.getElementsByTagName('itemref');
    
// //     // Get the manifest - this maps IDs to file paths
// //     const manifest = opfDoc.getElementsByTagName('manifest')[0];
// //     const items = manifest.getElementsByTagName('item');
    
// //     // Map the spine items to their file paths
// //     const fileOrder: string[] = [];
// //     for (let i = 0; i < itemrefs.length; i++) {
// //       const idref = itemrefs[i].getAttribute('idref');
// //       for (let j = 0; j < items.length; j++) {
// //         if (items[j].getAttribute('id') === idref) {
// //           const href = items[j].getAttribute('href') || '';
// //           // Get the directory of the OPF file to resolve relative paths
// //           const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
// //           fileOrder.push(opfDir + href);
// //           break;
// //         }
// //       }
// //     }
    
// //     setHtmlFiles(fileOrder);
// //     setTotalPages(fileOrder.length);
    
// //     // Extract table of contents
// //     const extractToc = async (): Promise<TOCItem[]> => {
// //       let tocPath = '';
// //       let tocItems: TOCItem[] = [];
// //       let tocFound = false;
      
// //       // Method 1: Check for nav document (EPUB3)
// //       for (let i = 0; i < items.length; i++) {
// //         const item = items[i];
// //         const properties = item.getAttribute('properties');
// //         if (properties && properties.includes('nav')) {
// //           const href = item.getAttribute('href') || '';
// //           const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
// //           tocPath = opfDir + href;
          
// //           try {
// //             const tocContent = await content.file(tocPath)?.async('text');
// //             if (tocContent) {
// //               const tocDoc = parser.parseFromString(tocContent, 'text/html');
// //               const navs = tocDoc.getElementsByTagName('nav');
              
// //               for (let i = 0; i < navs.length; i++) {
// //                 const nav = navs[i];
// //                 const type = nav.getAttribute('epub:type');
// //                 if (type === 'toc') {
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
                          
// //                           const nestedOl = li.getElementsByTagName('ol')[0];
// //                           if (nestedOl) {
// //                             item.children = parseTocItems(nestedOl);
// //                           }
                          
// //                           items.push(item);
// //                         }
// //                       }
                      
// //                       return items;
// //                     };
                    
// //                     tocItems = parseTocItems(ol);
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
// //         const tocAttr = spine.getAttribute('toc');
// //         if (tocAttr) {
// //           for (let i = 0; i < items.length; i++) {
// //             const item = items[i];
// //             if (item.getAttribute('id') === tocAttr) {
// //               const href = item.getAttribute('href') || '';
// //               const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
// //               tocPath = opfDir + href;
// //               break;
// //             }
// //           }
// //         } else {
// //           // Try media-type approach
// //           for (let i = 0; i < items.length; i++) {
// //             const item = items[i];
// //             if (item.getAttribute('media-type') === 'application/x-dtbncx+xml') {
// //               const href = item.getAttribute('href') || '';
// //               const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
// //               tocPath = opfDir + href;
// //               break;
// //             }
// //           }
// //         }
        
// //         if (tocPath) {
// //           try {
// //             const ncxContent = await content.file(tocPath)?.async('text');
// //             if (ncxContent) {
// //               const ncxDoc = parser.parseFromString(ncxContent, 'application/xml');
// //               const navPoints = ncxDoc.getElementsByTagName('navPoint');
              
// //               if (navPoints.length > 0) {
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
                
// //                 // Create all items
// //                 const tempItems: TOCItem[] = [];
// //                 const navPointMap = new Map<string, TOCItem>();
                
// //                 for (let i = 0; i < navPoints.length; i++) {
// //                   const navPoint = navPoints[i];
// //                   const id = navPoint.getAttribute('id') || '';
// //                   const item = processNavPoint(navPoint, i);
// //                   navPointMap.set(id, item);
// //                   tempItems.push(item);
// //                 }
                
// //                 // Build hierarchy
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
// //                       // Remove from top level
// //                       const index = tempItems.findIndex(item => item.id === childItem.id);
// //                       if (index !== -1) {
// //                         tempItems.splice(index, 1);
// //                       }
// //                     }
// //                   }
// //                 }
                
// //                 tocItems = tempItems;
// //                 tocFound = true;
// //               }
// //             }
// //           } catch (error) {
// //             console.error("Error parsing EPUB2 NCX file:", error);
// //           }
// //         }
// //       }
      
// //       // Method 3: Create from spine if no TOC found
// //       if (!tocFound) {
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
// //       }
      
// //       return tocItems;
// //     };
    
// //     // Set the TOC
// //     const tocItems = await extractToc();
// //     setToc(tocItems);
    
// //     // Load the first HTML file
// //     if (fileOrder.length > 0) {
// //       await loadPage(book.currentPage || 0);
// //     } else {
// //       throw new Error('No HTML files found in the EPUB');
// //     }
    
// //     // Update the last read date for this book
// //     setBooks(prevBooks => 
// //       prevBooks.map(b => 
// //         b.id === book.id 
// //           ? { ...b, lastRead: new Date().toISOString() } 
// //           : b
// //       )
// //     );
    
// //     // Switch to reading view
// //     setIsReading(true);
// //   } catch (error) {
// //     console.error('Error opening EPUB file:', error);
// //     throw error;
// //   } finally {
// //     setIsLoading(false);
// //   }
// // };

// // // Load a specific page
// // const loadPage = async (pageIndex: number): Promise<void> => {
// //   if (!bookZip || pageIndex < 0 || pageIndex >= htmlFiles.length) {
// //     return;
// //   }
  
// //   try {
// //     // Load the HTML content
// //     const htmlContent = await bookZip.file(htmlFiles[pageIndex])?.async('text');
// //     if (!htmlContent) {
// //       throw new Error(`Could not load page ${pageIndex}`);
// //     }
    
// //     // Get the directory of the HTML file to resolve relative paths
// //     const fileDir = getDirectoryPath(htmlFiles[pageIndex]);
    
// //     // Process the HTML to fix relative paths
// //     const processedHtml = processHtmlContent(htmlContent, fileDir);
    
// //     setCurrentContent(processedHtml);
// //     setCurrentPage(pageIndex);
    
// //     // Extract text for SimplePlayMode
// //     const extractedText = extractTextFromHtml(processedHtml);
// //     setCurrentPageText(extractedText);
    
// //     // Update the current page in the books array
// //     if (currentBook) {
// //       setBooks(prevBooks => 
// //         prevBooks.map(b => 
// //           b.id === currentBook.id 
// //             ? { ...b, currentPage: pageIndex } 
// //             : b
// //         )
// //       );
// //     }
    
// //     // After rendering the content, load any images
// //     setTimeout(() => {
// //       const content = document.querySelector('.epub-content');
// //       if (content) {
// //         const images = content.querySelectorAll('img[src^="data:image/png;base64,IMAGE_PLACEHOLDER_"]');
// //         images.forEach(async (img: Element) => {
// //           const src = (img as HTMLImageElement).src;
// //           const imagePath = src.replace('data:image/png;base64,IMAGE_PLACEHOLDER_', '');
          
// //           try {
// //             const imageBlob = await bookZip.file(imagePath)?.async('blob');
// //             if (imageBlob) {
// //               const imageUrl = URL.createObjectURL(imageBlob);
// //               (img as HTMLImageElement).src = imageUrl;
// //             }
// //           } catch (error) {
// //             console.error(`Error loading image: ${imagePath}`, error);
// //           }
// //         });
        
// //         const links = content.querySelectorAll('link[href^="data:text/css;base64,CSS_PLACEHOLDER_"]');
// //         links.forEach(async (link: Element) => {
// //           const href = (link as HTMLLinkElement).href;
// //           const cssPath = href.replace('data:text/css;base64,CSS_PLACEHOLDER_', '');
          
// //           try {
// //             const cssContent = await bookZip.file(cssPath)?.async('text');
// //             if (cssContent) {
// //               // Create a new style element with the CSS content
// //               const style = document.createElement('style');
// //               style.textContent = cssContent;
// //               link.parentNode?.replaceChild(style, link);
// //             }
// //           } catch (error) {
// //             console.error(`Error loading CSS: ${cssPath}`, error);
// //           }
// //         });
// //       }
// //     }, 100);
    
// //   } catch (error) {
// //     console.error('Error loading page:', error);
// //     throw error;
// //   }
// // };

// // // Navigate to the next page
// // const nextPage = (): void => {
// //   if (currentPage < totalPages - 1) {
// //     loadPage(currentPage + 1);
// //   }
// // };

// // // Navigate to the previous page
// // const prevPage = (): void => {
// //   if (currentPage > 0) {
// //     loadPage(currentPage - 1);
// //   }
// // };

// // // Navigate to a specific TOC item
// // const navigateToTocItem = (item: TOCItem): void => {
// //   // Handle fragment-only hrefs
// //   if (item.href.startsWith('#')) {
// //     const fragment = item.href.substring(1);
// //     const element = document.getElementById(fragment);
// //     if (element) {
// //       element.scrollIntoView({ behavior: 'smooth' });
// //     }
// //     return;
// //   }
  
// //   // Split to get file path and optional fragment
// //   let [filePath, fragment] = item.href.split('#');
  
// //   // Remove any query parameters
// //   filePath = filePath.split('?')[0];
  
// //   // Normalize the path (handle ../ and ./)
// //   const opfDir = getDirectoryPath(opfPath);
  
// //   // Try multiple approaches to find the correct file
  
// //   // Approach 1: Direct match
// //   let fileIndex = htmlFiles.findIndex(file => file.endsWith(filePath));
  
// //   // Approach 2: Try with the OPF directory
// //   if (fileIndex === -1 && !filePath.startsWith('/')) {
// //     const fullPath = opfDir + filePath;
// //     fileIndex = htmlFiles.findIndex(file => file === fullPath);
// //   }
  
// //   // Approach 3: Try resolving relative paths
// //   if (fileIndex === -1) {
// //     const resolvedPath = resolveRelativePath(opfDir, filePath);
// //     fileIndex = htmlFiles.findIndex(file => file === resolvedPath);
// //   }
  
// //   // Approach 4: Just match the filename
// //   if (fileIndex === -1) {
// //     const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
// //     fileIndex = htmlFiles.findIndex(file => file.endsWith('/' + fileName));
// //   }
  
// //   if (fileIndex !== -1) {
// //     loadPage(fileIndex);
    
// //     // If there's a fragment, scroll to it after loading
// //     if (fragment) {
// //       setTimeout(() => {
// //         const element = document.getElementById(fragment);
// //         if (element) {
// //           element.scrollIntoView({ behavior: 'smooth' });
// //         }
// //       }, 300);
// //     }
// //   }
// // };

// // // Close the book and return to the library
// // const closeBook = (): void => {
// //   // Reset all book state
// //   setCurrentBook(null);
// //   setBookZip(null);
// //   setOpfPath('');
// //   setHtmlFiles([]);
// //   setToc([]);
// //   setCurrentContent('');
// //   setIsReading(false);
// //   setBookTitle('');
// //   setBookAuthor('');
// //   setIsPlayModeVisible(false);
// //   setCurrentPageText('');
// // };

// // // Toggle PlayMode visibility
// // const togglePlayMode = (): void => {
// //   setIsPlayModeVisible(!isPlayModeVisible);
// // };

// // const value: BookContextValue = {
// //   // Library state
// //   books,
// //   addBook,
// //   removeBook,
  
// //   // Current book state
// //   currentBook,
// //   isReading,
// //   isLoading,
// //   bookTitle,
// //   bookAuthor,
// //   currentPage,
// //   totalPages,
// //   currentContent,
// //   currentPageText,
// //   toc,
  
// //   // Book actions
// //   openBook,
// //   closeBook,
// //   nextPage,
// //   prevPage,
// //   navigateToTocItem,
  
// //   // Book details
// //   htmlFiles,
// //   opfPath,
  
// //   // Play mode
// //   isPlayModeVisible,
// //   togglePlayMode
// // };

// // return (
// //   <BookContext.Provider value={value}>
// //     {children}
// //   </BookContext.Provider>
// // );
// // };



// import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// import localforage from 'localforage';
// import JSZip from 'jszip';
// import { DOMParser } from 'xmldom';
// import { getDirectoryPath, resolveRelativePath } from '../utils/pathUtils';
// import { processHtmlContent, extractTextFromHtml } from '../utils/textExtraction';
// import { BookData, TOCItem } from '@/types/books';

// // Configure localforage for book storage
// localforage.config({
//   name: "EbookReaderApp",
//   storeName: "bookStorage"
// });

// interface BookContextValue {
//   // Library state
//   books: BookData[];
//   addBook: (file: File) => Promise<void>;
//   removeBook: (bookId: string) => Promise<void>;

//   // Current book state
//   currentBook: BookData | null;
//   isReading: boolean;
//   isLoading: boolean;
//   bookTitle: string;
//   bookAuthor: string;
//   currentPage: number;
//   totalPages: number;
//   currentContent: string;
//   currentPageText: string;
//   toc: TOCItem[];

//   // Book actions
//   openBook: (book: BookData) => Promise<void>;
//   closeBook: () => void;
//   nextPage: () => void;
//   prevPage: () => void;
//   navigateToTocItem: (item: TOCItem) => void;

//   // Book details
//   htmlFiles: string[];
//   opfPath: string;

//   // Play mode
//   isPlayModeVisible: boolean;
//   togglePlayMode: () => void;
// }

// const BookContext = createContext<BookContextValue | undefined>(undefined);

// export const useBook = (): BookContextValue => {
//   const context = useContext(BookContext);
//   if (context === undefined) {
//     throw new Error('useBook must be used within a BookProvider');
//   }
//   return context;
// };

// interface BookProviderProps {
//   children: ReactNode;
// }

// export const BookProvider: React.FC<BookProviderProps> = ({ children }) => {
//   // Library state
//   const [books, setBooks] = useState<BookData[]>([]);

//   // Current book state
//   const [currentBook, setCurrentBook] = useState<BookData | null>(null);
//   const [isReading, setIsReading] = useState<boolean>(false);
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [bookTitle, setBookTitle] = useState<string>('');
//   const [bookAuthor, setBookAuthor] = useState<string>('');
//   const [currentPage, setCurrentPage] = useState<number>(0);
//   const [totalPages, setTotalPages] = useState<number>(0);
//   const [currentContent, setCurrentContent] = useState<string>('');
//   const [currentPageText, setCurrentPageText] = useState<string>('');
//   const [toc, setToc] = useState<TOCItem[]>([]);
//   const [bookZip, setBookZip] = useState<JSZip | null>(null);
//   const [opfPath, setOpfPath] = useState<string>('');
//   const [htmlFiles, setHtmlFiles] = useState<string[]>([]);

//   // Play mode state
//   const [isPlayModeVisible, setIsPlayModeVisible] = useState<boolean>(false);

//   // Load books from localforage on initial render
//   useEffect(() => {
//     const loadBooks = async () => {
//       try {
//         // Retrieve all stored book metadata keys
//         const keys = await localforage.keys();
//         const bookMetadataKeys = keys.filter(key => key.startsWith('book_metadata_'));
        
//         // Load each book's metadata
//         const loadedBooks: BookData[] = [];
//         for (const key of bookMetadataKeys) {
//           const bookId = key.replace('book_metadata_', '');
          
//           // Retrieve metadata
//           const metadata = await localforage.getItem(key);
          
//           // Retrieve file
//           const fileKey = `book_file_${bookId}`;
//           const file = await localforage.getItem(fileKey);
          
//           if (metadata && file) {
//             loadedBooks.push({
//               ...(metadata as Omit<BookData, 'file'>),
//               file: file as File
//             });
//           }
//         }
        
//         // Set the books in state
//         setBooks(loadedBooks);
//       } catch (error) {
//         console.error("Error loading books from storage", error);
//       }
//     };

//     loadBooks();
//   }, []);

//   // Save books to localforage when they change
//   useEffect(() => {
//     const saveBooks = async () => {
//       try {
//         // Remove any existing keys first
//         const keys = await localforage.keys();
//         const bookMetadataKeys = keys.filter(key => 
//           key.startsWith('book_metadata_') || key.startsWith('book_file_')
//         );
        
//         for (const key of bookMetadataKeys) {
//           await localforage.removeItem(key);
//         }

//         // Save each book's metadata and file
//         for (const book of books) {
//           // Save metadata
//           await localforage.setItem(`book_metadata_${book.id}`, {
//             id: book.id,
//             title: book.title,
//             author: book.author,
//             coverUrl: book.coverUrl,
//             currentPage: book.currentPage,
//             lastRead: book.lastRead
//           });
          
//           // Save file
//           await localforage.setItem(`book_file_${book.id}`, book.file);
//         }
//       } catch (error) {
//         console.error("Error saving books to storage", error);
//       }
//     };

//     if (books.length > 0) {
//       saveBooks();
//     }
//   }, [books]);


//   // Add a new book to the library
//   const addBook = async (file: File): Promise<void> => {
//     if (file.name.split('.').pop()?.toLowerCase() !== 'epub') {
//       throw new Error('Please upload an EPUB file');
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
//       let coverBlob: Blob | null = null;
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
//             const potentialCoverBlob = await content.file(coverPath)?.async('blob');
            
//             // Only proceed if blob exists
//             if (potentialCoverBlob) {
//               // Convert blob to base64
//               coverUrl = await new Promise<string>((resolve) => {
//                 const reader = new FileReader();
//                 reader.onloadend = () => {
//                   resolve(reader.result as string);
//                 };
//                 reader.readAsDataURL(potentialCoverBlob);
//               });
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
//         coverUrl, // Now this is a base64 string or null
//         currentPage: 0,
//         totalPages: 0,
//         file,
//         lastRead: new Date().toISOString(),
//         lastChapter: undefined // Optional, can be omitted
//       };
      
//       // Add the book to our library
//       setBooks(prevBooks => [...prevBooks, newBook]);
      
//     } catch (error) {
//       console.error('Error processing EPUB file:', error);
//       throw error;
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Remove a book from the library
//   const removeBook = async (bookId: string): Promise<void> => {
//     // Find the book to remove its cover URL
//     const book = books.find(b => b.id === bookId);
//     if (book && book.coverUrl) {
//       URL.revokeObjectURL(book.coverUrl);
//     }
    
//     // Remove from localforage
//     try {
//       await localforage.removeItem(`book_metadata_${bookId}`);
//       await localforage.removeItem(`book_file_${bookId}`);
//     } catch (error) {
//       console.error('Error removing book from storage', error);
//     }
    
//     // Remove from state
//     setBooks(prevBooks => prevBooks.filter(b => b.id !== bookId));
//   };


//   // Open a book to read
//   const openBook = async (book: BookData): Promise<void> => {
//     setIsLoading(true);
//     setBookTitle(book.title);
//     setBookAuthor(book.author);
//     setCurrentPage(book.currentPage || 0);
//     setCurrentBook(book);
    
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
      
//       // Set the HTML files array
//       setHtmlFiles(fileOrder);
//       setTotalPages(fileOrder.length);
      
//       // Extract table of contents
//       const extractToc = async (): Promise<TOCItem[]> => {
//         // Existing TOC extraction code ...
//         // (keeping the implementation the same)
//         let tocPath = '';
//         let tocItems: TOCItem[] = [];
//         let tocFound = false;
        
//         // Method 1: Check for nav document (EPUB3)
//         for (let i = 0; i < items.length; i++) {
//           const item = items[i];
//           const properties = item.getAttribute('properties');
//           if (properties && properties.includes('nav')) {
//             const href = item.getAttribute('href') || '';
//             const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
//             tocPath = opfDir + href;
            
//             try {
//               const tocContent = await content.file(tocPath)?.async('text');
//               if (tocContent) {
//                 const tocDoc = parser.parseFromString(tocContent, 'text/html');
//                 const navs = tocDoc.getElementsByTagName('nav');
                
//                 for (let i = 0; i < navs.length; i++) {
//                   const nav = navs[i];
//                   const type = nav.getAttribute('epub:type');
//                   if (type === 'toc') {
//                     const ol = nav.getElementsByTagName('ol')[0];
//                     if (ol) {
//                       const parseTocItems = (ol: Element): TOCItem[] => {
//                         const items: TOCItem[] = [];
//                         const lis = ol.getElementsByTagName('li');
                        
//                         for (let j = 0; j < lis.length; j++) {
//                           const li = lis[j];
//                           const a = li.getElementsByTagName('a')[0];
//                           if (a) {
//                             const href = a.getAttribute('href') || '';
//                             const label = a.textContent || '';
//                             const id = `toc-${j}`;
                            
//                             const item: TOCItem = {
//                               id,
//                               href,
//                               label,
//                               children: []
//                             };
                            
//                             const nestedOl = li.getElementsByTagName('ol')[0];
//                             if (nestedOl) {
//                               item.children = parseTocItems(nestedOl);
//                             }
                            
//                             items.push(item);
//                           }
//                         }
                        
//                         return items;
//                       };
                      
//                       tocItems = parseTocItems(ol);
//                       tocFound = true;
//                       break;
//                     }
//                   }
//                 }
//               }
//             } catch (error) {
//               console.error("Error parsing EPUB3 nav document:", error);
//             }
            
//             break;
//           }
//         }
        
//         // Method 2: Check for NCX file (EPUB2)
//         if (!tocFound) {
//           const tocAttr = spine.getAttribute('toc');
//           if (tocAttr) {
//             for (let i = 0; i < items.length; i++) {
//               const item = items[i];
//               if (item.getAttribute('id') === tocAttr) {
//                 const href = item.getAttribute('href') || '';
//                 const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
//                 tocPath = opfDir + href;
//                 break;
//               }
//             }
//           } else {
//             // Try media-type approach
//             for (let i = 0; i < items.length; i++) {
//               const item = items[i];
//               if (item.getAttribute('media-type') === 'application/x-dtbncx+xml') {
//                 const href = item.getAttribute('href') || '';
//                 const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
//                 tocPath = opfDir + href;
//                 break;
//               }
//             }
//           }
          
//           if (tocPath) {
//             try {
//               const ncxContent = await content.file(tocPath)?.async('text');
//               if (ncxContent) {
//                 const ncxDoc = parser.parseFromString(ncxContent, 'application/xml');
//                 const navPoints = ncxDoc.getElementsByTagName('navPoint');
                
//                 if (navPoints.length > 0) {
//                   const processNavPoint = (navPoint: Element, index: number): TOCItem => {
//                     const navLabel = navPoint.getElementsByTagName('navLabel')[0];
//                     const text = navLabel?.getElementsByTagName('text')[0]?.textContent || '';
//                     const content = navPoint.getElementsByTagName('content')[0];
//                     const src = content?.getAttribute('src') || '';
                    
//                     return {
//                       id: `toc-${index}`,
//                       label: text,
//                       href: src,
//                       children: []
//                     };
//                   };
                  
//                   // Create all items
//                   const tempItems: TOCItem[] = [];
//                   const navPointMap = new Map<string, TOCItem>();
                  
//                   for (let i = 0; i < navPoints.length; i++) {
//                     const navPoint = navPoints[i];
//                     const id = navPoint.getAttribute('id') || '';
//                     const item = processNavPoint(navPoint, i);
//                     navPointMap.set(id, item);
//                     tempItems.push(item);
//                   }
                  
//                   // Build hierarchy
//                   for (let i = 0; i < navPoints.length; i++) {
//                     const navPoint = navPoints[i];
//                     const id = navPoint.getAttribute('id') || '';
//                     const parentNode = navPoint.parentNode as Element;
                    
//                     if (parentNode && parentNode.nodeName === 'navPoint') {
//                       const parentId = parentNode.getAttribute('id') || '';
//                       const parentItem = navPointMap.get(parentId);
//                       const childItem = navPointMap.get(id);
                      
//                       if (parentItem && childItem) {
//                         parentItem.children.push(childItem);
//                         // Remove from top level
//                         const index = tempItems.findIndex(item => item.id === childItem.id);
//                         if (index !== -1) {
//                           tempItems.splice(index, 1);
//                         }
//                       }
//                     }
//                   }
                  
//                   tocItems = tempItems;
//                   tocFound = true;
//                 }
//               }
//             } catch (error) {
//               console.error("Error parsing EPUB2 NCX file:", error);
//             }
//           }
//         }
        

//       // Method 3: Create from spine if no TOC found
//       if (!tocFound) {
//           for (let i = 0; i < fileOrder.length; i++) {
//             const filePath = fileOrder[i];
//             const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
//             const label = fileName.replace(/\.x?html?$/, '').replace(/[-_]/g, ' ');
            
//             tocItems.push({
//               id: `toc-${i}`,
//               label: label.charAt(0).toUpperCase() + label.slice(1), // Capitalize first letter
//               href: filePath.substring(opf.substring(0, opf.lastIndexOf('/') + 1).length),
//               children: []
//             });
//           }
//         }
        
//         return tocItems;
//       };
      
//       // Set the TOC
//       const tocItems = await extractToc();
//       setToc(tocItems);
      

//           // CHECK HERE: We need to check fileOrder directly, not htmlFiles
//       if (fileOrder.length > 0) {
//         // Determine the page to load
//         let pageToLoad = book.currentPage || 0;

//         // If there's a last chapter, find its corresponding page
//         if (book.lastChapter) {
//           const chapterIndex = tocItems.findIndex(item => 
//             item.id === book.lastChapter?.id
//           );

//           if (chapterIndex !== -1) {
//             // Find the first page that matches the chapter's file
//             const chapterFilePath = book.lastChapter?.href.split('#')[0];
//             const pageIndex = fileOrder.findIndex(file => 
//               file.endsWith(chapterFilePath || '')
//             );

//             if (pageIndex !== -1) {
//               pageToLoad = pageIndex;
//             }
//           }
//         }

//         // Load the appropriate page using fileOrder directly
//         await loadPage(pageToLoad, content, fileOrder);
//       } else {
//         throw new Error('No HTML files found in the EPUB');
//       }


//           // Update the last read date and last chapter for this book
//       setBooks(prevBooks => 
//         prevBooks.map(b => 
//           b.id === book.id 
//             ? { 
//                 ...b, 
//                 lastRead: new Date().toISOString(),
//                 lastChapter: tocItems.length > 0 ? findChapterForPage(book.currentPage || 0) : undefined
//               } as BookData
//             : b
//         )
//       );
      
//       // Switch to reading view
//       setIsReading(true);
//     } catch (error) {
//       console.error('Error opening EPUB file:', error);
//       throw error;
//     } finally {
//       setIsLoading(false);
//     }
//   };


//   // Helper function to find the chapter for a given page
//   const findChapterForPage = (pageIndex: number): TOCItem | null => {
//     // Find the TOC item that corresponds to this page
//     for (let i = 0; i < toc.length; i++) {
//       const tocItem = toc[i];
      
//       // Try to find the file path in the TOC item
//       const itemFilePath = tocItem.href.split('#')[0];
      
//       // Check if the current page's file matches the TOC item's file
//       if (htmlFiles[pageIndex].endsWith(itemFilePath)) {
//         return tocItem;
//       }
//     }
    
//     return null;
//   };

//   // Load a specific page
//   const loadPage = async (pageIndex: number, zipInstance: JSZip, files: string[]): Promise<void> => {


//     console.log('Loading page:', {
//       pageIndex,
//       bookZipExists: !!bookZip,
//       htmlFilesLength: htmlFiles.length
//     });
  
//     if (!bookZip || pageIndex < 0 || pageIndex >= htmlFiles.length) {
//       console.error('Invalid page load conditions', {
//         bookZipExists: !!bookZip,
//         pageIndex,
//         htmlFilesLength: htmlFiles.length
//       });
//       return;
//     }
    
//     try {
//       // Load the HTML content
//       const htmlContent = await bookZip.file(htmlFiles[pageIndex])?.async('text');
//       console.log('HTML Content:', {
//         contentLength: htmlContent?.length,
//         filePath: htmlFiles[pageIndex]
//       });

//       if (!htmlContent) {
//         throw new Error(`Could not load page ${pageIndex}`);
//       }
      
//       // Get the directory of the HTML file to resolve relative paths
//       const fileDir = getDirectoryPath(htmlFiles[pageIndex]);
      
//       // Process the HTML to fix relative paths
//       const processedHtml = processHtmlContent(htmlContent, fileDir);
      
//       console.log('Processed HTML:', {
//         length: processedHtml.length,
//         firstChars: processedHtml.slice(0, 200)
//       });

//       // Ensure content is not empty
//       if (!processedHtml.trim()) {
//         console.warn('Processed HTML is empty');
//       }
      
//       // Set the content
//       setCurrentContent(processedHtml);
//       setCurrentPage(pageIndex);
    
//       // Extract text for SimplePlayMode
//       const extractedText = extractTextFromHtml(processedHtml);
//       setCurrentPageText(extractedText);

//       console.log('Extracted Text:', {
//         length: extractedText.length,
//         firstChars: extractedText.slice(0, 200)
//       });

//       // Find the corresponding TOC item for this page
//       const currentChapter = findChapterForPage(pageIndex);

//       // Update the current page in the books array
//       if (currentBook) {
//         setBooks(prevBooks => 
//           prevBooks.map(b => 
//             b.id === currentBook.id 
//               ? { 
//                   ...b, 
//                   currentPage: pageIndex,
//                   lastChapter: currentChapter // Save the current chapter
//                 } 
//               : b
//           )
//         );
//       }
          
//       // After rendering the content, load any images
//       setTimeout(() => {
//         const content = document.querySelector('.epub-content');
//         console.log('Content Element:', !!content);

//         if (content) {
//           // Explicitly set innerHTML
//           content.innerHTML = processedHtml;

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
//       throw error;
//     }
//   };

//   // // Navigate to the next page
//   // const nextPage = (): void => {
//   //   if (currentPage < totalPages - 1) {
//   //     loadPage(currentPage + 1);
//   //   }
//   // };

//   const nextPage = (): void => {
//     if (currentPage < totalPages - 1 && bookZip && htmlFiles.length > 0) { // Add checks
//       loadPage(currentPage + 1, bookZip, htmlFiles); // Pass state variables
//     }
//   };

//   // // Navigate to the previous page
//   // const prevPage = (): void => {
//   //   if (currentPage > 0) {
//   //     loadPage(currentPage - 1);
//   //   }
//   // };

//   const prevPage = (): void => {
//     if (currentPage > 0 && bookZip && htmlFiles.length > 0) { // Add checks
//       loadPage(currentPage - 1, bookZip, htmlFiles); // Pass state variables
//     }
//   };

//   // Navigate to a specific TOC item
//   const navigateToTocItem = (item: TOCItem): void => {
//     // Handle fragment-only hrefs
//     if (item.href.startsWith('#')) {
//       const fragment = item.href.substring(1);
//       const element = document.getElementById(fragment);
//       if (element) {
//         element.scrollIntoView({ behavior: 'smooth' });
//       }
//       return;
//     }
    
//     // Split to get file path and optional fragment
//     let [filePath, fragment] = item.href.split('#');
    
//     // Remove any query parameters
//     filePath = filePath.split('?')[0];
    
//     // Normalize the path (handle ../ and ./)
//     const opfDir = getDirectoryPath(opfPath);
    
//     // Try multiple approaches to find the correct file
//     let fileIndex = htmlFiles.findIndex(file => file.endsWith(filePath));
    
//     // Try with the OPF directory
//     if (fileIndex === -1 && !filePath.startsWith('/')) {
//       const fullPath = opfDir + filePath;
//       fileIndex = htmlFiles.findIndex(file => file === fullPath);
//     }
    
//     // Try resolving relative paths
//     if (fileIndex === -1) {
//       const resolvedPath = resolveRelativePath(opfDir, filePath);
//       fileIndex = htmlFiles.findIndex(file => file === resolvedPath);
//     }
    
//     // Just match the filename
//     if (fileIndex === -1) {
//       const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
//       fileIndex = htmlFiles.findIndex(file => file.endsWith('/' + fileName));
//     }
    
//     if (fileIndex !== -1 && bookZip && htmlFiles.length > 0) {
//       loadPage(fileIndex,  bookZip, htmlFiles);
      
//       // If there's a fragment, scroll to it after loading
//       if (fragment) {
//         setTimeout(() => {
//           const element = document.getElementById(fragment);
//           if (element) {
//             element.scrollIntoView({ behavior: 'smooth' });
//           }
//         }, 300);
//       }
//     }
//   };

//   // Close the book and return to the library
//   const closeBook = (): void => {
//     // Reset all book state
//     setCurrentBook(null);
//     setBookZip(null);
//     setOpfPath('');
//     setHtmlFiles([]);
//     setToc([]);
//     setCurrentContent('');
//     setIsReading(false);
//     setBookTitle('');
//     setBookAuthor('');
//     setIsPlayModeVisible(false);
//     setCurrentPageText('');
//   };

//   // Toggle PlayMode visibility
//   const togglePlayMode = (): void => {
//     setIsPlayModeVisible(!isPlayModeVisible);
//   };

//   const value: BookContextValue = {
//     // Library state
//     books,
//     addBook,
//     removeBook,
    
//     // Current book state
//     currentBook,
//     isReading,
//     isLoading,
//     bookTitle,
//     bookAuthor,
//     currentPage,
//     totalPages,
//     currentContent,
//     currentPageText,
//     toc,
    
//     // Book actions
//     openBook,
//     closeBook,
//     nextPage,
//     prevPage,
//     navigateToTocItem,
    
//     // Book details
//     htmlFiles,
//     opfPath,
    
//     // Play mode
//     isPlayModeVisible,
//     togglePlayMode
//   };

//   return (
//     <BookContext.Provider value={value}>
//       {children}
//     </BookContext.Provider>
//   );
//   };



import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import localforage from 'localforage';
import JSZip from 'jszip';
import { DOMParser } from 'xmldom';
import { getDirectoryPath, resolveRelativePath } from '../utils/pathUtils';
import { processHtmlContent, extractTextFromHtml } from '../utils/textExtraction';
import { BookData, TOCItem } from '@/types/books';

localforage.config({
  name: "EbookReaderApp",
  storeName: "bookStorage"
});

interface BookContextValue {
  books: BookData[];
  addBook: (file: File) => Promise<void>;
  removeBook: (bookId: string) => Promise<void>;
  currentBook: BookData | null;
  isReading: boolean;
  isLoading: boolean;
  isPageLoading: boolean;
  bookTitle: string;
  bookAuthor: string;
  currentPageDisplay: number;
  totalPages: number;
  currentContent: string;
  currentPageText: string;
  toc: TOCItem[];
  openBook: (book: BookData) => Promise<void>;
  closeBook: () => void;
  nextPage: () => void;
  prevPage: () => void;
  navigateToTocItem: (item: TOCItem) => void;
  htmlFiles: string[]; // Kept for debugging or potential external use
  opfPath: string;   // Kept for debugging or potential external use
  isPlayModeVisible: boolean;
  togglePlayMode: () => void;
}

const BookContext = createContext<BookContextValue | undefined>(undefined);

export const useBook = (): BookContextValue => {
  const context = useContext(BookContext);
  if (context === undefined) throw new Error('useBook must be used within a BookProvider');
  return context;
};

interface BookProviderProps {
  children: ReactNode;
}

export const BookProvider: React.FC<BookProviderProps> = ({ children }) => {
  const [books, setBooks] = useState<BookData[]>([]);
  const [currentBook, setCurrentBook] = useState<BookData | null>(null);
  const [isReading, setIsReading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPageLoading, setIsPageLoading] = useState<boolean>(false);
  const [bookTitle, setBookTitle] = useState<string>('');
  const [bookAuthor, setBookAuthor] = useState<string>('');
  const [currentPageDisplay, setCurrentPageDisplay] = useState<number>(0);
  const [currentPageToLoad, setCurrentPageToLoad] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentContent, setCurrentContent] = useState<string>('');
  const [currentPageText, setCurrentPageText] = useState<string>('');
  const [toc, setToc] = useState<TOCItem[]>([]);
  const [bookZip, setBookZip] = useState<JSZip | null>(null);
  const [opfPath, setOpfPath] = useState<string>('');
  const [htmlFiles, setHtmlFiles] = useState<string[]>([]);
  const [isPlayModeVisible, setIsPlayModeVisible] = useState<boolean>(false);

  useEffect(() => { /* LocalForage load books logic (no changes) */
    const loadBooks = async () => {
      try {
        const keys = await localforage.keys();
        const bookMetadataKeys = keys.filter(key => key.startsWith('book_metadata_'));
        const loadedBooks: BookData[] = [];
        for (const key of bookMetadataKeys) {
          const bookId = key.replace('book_metadata_', '');
          const metadata = await localforage.getItem(key);
          const fileKey = `book_file_${bookId}`;
          const file = await localforage.getItem(fileKey);
          if (metadata && file) {
            loadedBooks.push({
              ...(metadata as Omit<BookData, 'file'>),
              file: file as File
            });
          }
        }
        setBooks(loadedBooks);
      } catch (error) {
        console.error("Error loading books from storage", error);
      }
    };
    loadBooks();
  }, []);

  useEffect(() => { /* LocalForage save books logic (no changes here, but check `BookData` for `lastChapter`) */
    if (!books.length && !localStorage.getItem('books_saved_once')) return;
    const saveBooks = async () => {
      try {
        const keys = await localforage.keys();
        const bookKeysToRemove = keys.filter(key => key.startsWith('book_metadata_') || key.startsWith('book_file_'));
        for (const key of bookKeysToRemove) {
          await localforage.removeItem(key);
        }
        for (const book of books) {
          await localforage.setItem(`book_metadata_${book.id}`, {
            id: book.id, title: book.title, author: book.author,
            coverUrl: book.coverUrl, currentPage: book.currentPage,
            lastRead: book.lastRead, lastChapter: book.lastChapter // Ensure lastChapter is saved
          });
          await localforage.setItem(`book_file_${book.id}`, book.file);
        }
        if (books.length > 0) localStorage.setItem('books_saved_once', 'true');
        else localStorage.removeItem('books_saved_once');
      } catch (error) {
        console.error("Error saving books to storage", error);
      }
    };
    saveBooks();
  }, [books]);

  const findChapterForPageCallback = useCallback((pageIndex: number, currentToc: TOCItem[], currentHtmlFiles: string[]): TOCItem | null => {
    if (!currentHtmlFiles || currentHtmlFiles.length === 0 || !currentToc || currentToc.length === 0 || pageIndex < 0 || pageIndex >= currentHtmlFiles.length) return null;
    const currentFile = currentHtmlFiles[pageIndex];
    if (!currentFile) return null;
    const searchInToc = (items: TOCItem[]): TOCItem | null => {
        for (const tocItem of items) {
            if (tocItem.href) {
                 const itemFilePath = tocItem.href.split('#')[0];
                 if (currentFile.endsWith(itemFilePath)) return tocItem;
            }
            if (tocItem.children?.length) { // Check if children exist and have length
                const foundInChildren = searchInToc(tocItem.children);
                if (foundInChildren) return foundInChildren;
            }
        }
        return null;
    };
    return searchInToc(currentToc);
  }, []);

  const loadPageCallback = useCallback(async (
    pageIdxToLoad: number,
    zipToUse: JSZip | null, // Explicitly allow null for the initial check
    filesInOrder: string[],
    currentBookRef: BookData | null,
    currentTocRef: TOCItem[]
  ) => {
    console.log(`[loadPageCallback ENTER] pageIdxToLoad: ${pageIdxToLoad}, zipExists: ${!!zipToUse}, filesLength: ${filesInOrder?.length ?? 0}`);

    if (!zipToUse || !filesInOrder || filesInOrder.length === 0 || pageIdxToLoad < 0 || pageIdxToLoad >= filesInOrder.length) {
      console.error(`[loadPageCallback ABORT] Invalid page load conditions. pageIdx: ${pageIdxToLoad}, zip: ${!!zipToUse}, filesOrderLength: ${filesInOrder?.length ?? 0}`);
      setCurrentContent('<div>Error: Could not determine page to load.</div>');
      setCurrentPageText('');
      setIsPageLoading(false); // Ensure loading is stopped
      return;
    }

    setIsPageLoading(true);
    try {
      const filePath = filesInOrder[pageIdxToLoad];
      console.log(`[loadPageCallback] Loading file: ${filePath}`);
      const htmlTextContent = await zipToUse.file(filePath)?.async('text');

      if (htmlTextContent == null) {
        throw new Error(`Could not load HTML content for page ${pageIdxToLoad} (${filePath})`);
      }

      console.log(`[loadPageCallback] HTML content fetched for ${filePath}, length: ${htmlTextContent.length}`);
      const fileDir = getDirectoryPath(filePath);
      // Pass zipToUse and filePath (as baseHtmlPath) to processHtmlContent
      const processedHtml = processHtmlContent(htmlTextContent, fileDir, zipToUse, filePath);
      console.log(`[loadPageCallback] HTML processed for ${filePath}`);

      setCurrentContent(processedHtml);
      setCurrentPageDisplay(pageIdxToLoad);
      const extractedText = extractTextFromHtml(processedHtml);
      setCurrentPageText(extractedText);

      if (currentBookRef) {
        const chapterForPage = findChapterForPageCallback(pageIdxToLoad, currentTocRef, filesInOrder);
        setBooks(prevBooks =>
          prevBooks.map(b =>
            b.id === currentBookRef.id ? { ...b, currentPage: pageIdxToLoad, lastChapter: chapterForPage } : b
          )
        );
      }

      setTimeout(() => {
        const contentElement = document.querySelector('.epub-content');
        if (contentElement) {
          // Image and CSS processing (ensure processHtmlContent prepares data-epub-src/href correctly)
          const images = contentElement.querySelectorAll('img');
          images.forEach(async (img: HTMLImageElement) => {
            const epubSrc = img.getAttribute('data-epub-src');
            if (epubSrc && !epubSrc.startsWith('blob:')) { // Check if not already loaded
              try {
                const imageBlob = await zipToUse.file(epubSrc)?.async('blob');
                if (imageBlob) img.src = URL.createObjectURL(imageBlob);
                else { console.warn(`Image not found in zip: ${epubSrc}`); img.alt = `Missing: ${epubSrc}`; }
              } catch (e) { console.error(`Error loading image ${epubSrc}:`, e); }
            }
          });
          const links = contentElement.querySelectorAll('link[data-epub-css-href]');
          links.forEach(async (link: Element) => {
            const cssPath = (link as HTMLLinkElement).getAttribute('data-epub-css-href');
            if(cssPath){
                try {
                    const cssFileContent = await zipToUse.file(cssPath)?.async('text');
                    if (cssFileContent) {
                        const style = document.createElement('style');
                        style.textContent = cssFileContent;
                        link.parentNode?.replaceChild(style, link);
                    } else { console.warn(`CSS not found: ${cssPath}`); link.remove(); }
                } catch (e) { console.error(`Error loading CSS ${cssPath}:`, e); }
            }
          });
        }
      }, 100);
    } catch (error) {
      console.error('[loadPageCallback ERROR]', error);
      setCurrentContent(`<div>Error loading page content: ${(error as Error).message}</div>`);
      setCurrentPageText('');
    } finally {
      setIsPageLoading(false);
      console.log(`[loadPageCallback EXIT] pageIdxToLoad: ${pageIdxToLoad}`);
    }
  }, [findChapterForPageCallback]); // Dependencies of loadPageCallback


  useEffect(() => {
    console.log('[useEffect PageLoad] Triggered. States:', {
      currentBookName: currentBook?.title, bookZipExists: !!bookZip, htmlFilesCount: htmlFiles.length,
      currentPageToLoad, tocCount: toc.length, isReading
    });

    if (isReading && currentBook && bookZip && htmlFiles && htmlFiles.length > 0 &&
        currentPageToLoad >= 0 && currentPageToLoad < htmlFiles.length) {
      console.log('[useEffect PageLoad] Conditions MET. Calling loadPageCallback with:', {
        pageToLoad: currentPageToLoad, zipReady: !!bookZip, filesCount: htmlFiles.length,
        bookName: currentBook.title, tocItems: toc.length
      });
      loadPageCallback(currentPageToLoad, bookZip, htmlFiles, currentBook, toc);
    } else {
      console.log('[useEffect PageLoad] Conditions NOT MET or book not in reading state.');
      if (!currentBook || !isReading) { // If book is closed or not in reading mode
        setCurrentContent('');
        setCurrentPageText('');
        setCurrentPageDisplay(0);
        console.log('[useEffect PageLoad] Cleaned up content for closed/non-reading book.');
      } else { // Book is open but other conditions failed
         console.log('[useEffect PageLoad] Conditions NOT MET - Details:', {
            isReading, currentBook: !!currentBook, bookZip: !!bookZip, htmlFilesOk: htmlFiles && htmlFiles.length > 0,
            pageToLoadOk: htmlFiles && currentPageToLoad >= 0 && currentPageToLoad < htmlFiles.length,
         });
      }
    }
  }, [currentBook, bookZip, htmlFiles, currentPageToLoad, loadPageCallback, toc, isReading]); // Added isReading and toc

  const addBook = async (file: File): Promise<void> => { /* Original addBook logic - unchanged */
    if (file.name.split('.').pop()?.toLowerCase() !== 'epub') {
      alert('Please upload an EPUB file.');
      return;
    }
    setIsLoading(true);
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
      if (!containerXml) throw new Error('Invalid EPUB: container.xml not found');

      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerXml, 'application/xml');
      const rootfiles = containerDoc.getElementsByTagName('rootfile');
      if (rootfiles.length === 0) throw new Error('Invalid EPUB: No rootfile found');

      const currentOpfPath = rootfiles[0].getAttribute('full-path') || '';
      const opfContent = await loadedZip.file(currentOpfPath)?.async('text');
      if (!opfContent) throw new Error('Invalid EPUB: OPF file not found');

      const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      const titleElements = opfDoc.getElementsByTagName('dc:title');
      const title = titleElements.length > 0 ? titleElements[0].textContent || 'Unknown Title' : 'Unknown Title';
      const creatorElements = opfDoc.getElementsByTagName('dc:creator');
      const author = creatorElements.length > 0 ? creatorElements[0].textContent || 'Unknown Author' : 'Unknown Author';
      const id = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`; // Sanitize file name for ID

      let coverUrl: string | null = null;
      const metaTags = opfDoc.getElementsByTagName('meta');
      let coverId = '';
      for (let i = 0; i < metaTags.length; i++) {
        if (metaTags[i].getAttribute('name') === 'cover') {
          coverId = metaTags[i].getAttribute('content') || '';
          break;
        }
      }

      if (coverId) {
        const items = opfDoc.getElementsByTagName('item');
        for (let i = 0; i < items.length; i++) {
          if (items[i].getAttribute('id') === coverId) {
            const href = items[i].getAttribute('href');
            if (href) {
              const coverPath = resolveRelativePath(getDirectoryPath(currentOpfPath), href);
              const coverBlob = await loadedZip.file(coverPath)?.async('blob');
              if (coverBlob) {
                coverUrl = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(coverBlob);
                });
              }
            }
            break;
          }
        }
      }
      const newBook: BookData = {
        id, title, author, coverUrl, currentPage: 0, totalPages: 0,
        file, lastRead: new Date().toISOString(),
      };
      setBooks(prevBooks => [...prevBooks, newBook]);
    } catch (error) {
      console.error('Error processing EPUB file:', error);
      alert(`Error processing EPUB: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };
  const removeBook = async (bookId: string): Promise<void> => { /* Original removeBook logic - unchanged */
    const bookToRemove = books.find(b => b.id === bookId);
    if (bookToRemove?.coverUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(bookToRemove.coverUrl);
    }
    setBooks(prevBooks => prevBooks.filter(b => b.id !== bookId));
  };

  const extractTocFromEntries = useCallback(async (
    zip: JSZip, manifestItems: HTMLCollectionOf<Element>, spineElement: Element | null,
    opfFileDirVal: string, xmlParser: DOMParser, fileOrderList: string[]
  ): Promise<TOCItem[]> => { /* Your updated extractTocFromEntries logic from previous message - unchanged */
    let tocPath = '';
    let tocItems: TOCItem[] = [];
    let tocFound = false;
    const opfFileDir = opfFileDirVal; // Use the passed value

    // Method 1: EPUB3 Nav document
    for (let i = 0; i < manifestItems.length; i++) {
        const item = manifestItems[i];
        const properties = item.getAttribute('properties');
        if (properties && properties.includes('nav')) {
            const href = item.getAttribute('href');
            if (href) {
                tocPath = resolveRelativePath(opfFileDir, href);
                try {
                    const navContent = await zip.file(tocPath)?.async('text');
                    if (navContent) {
                        const navDoc = xmlParser.parseFromString(navContent, 'application/xhtml+xml');
                        const navElements = navDoc.getElementsByTagName('nav');
                        for (let k = 0; k < navElements.length; k++) {
                            if (navElements[k].getAttribute('epub:type') === 'toc') {
                                const ol = navElements[k].getElementsByTagName('ol')[0];
                                if (ol) {
                                    const parseNavOl = (element: Element, currentNavDocPath: string): TOCItem[] => {
                                        const children: TOCItem[] = [];
                                        const listItems = Array.from(element.childNodes).filter(n => n.nodeName === 'li') as Element[];
                                        listItems.forEach((li, index) => {
                                            const anchor = li.getElementsByTagName('a')[0];
                                            if (anchor) {
                                                const tocHref = anchor.getAttribute('href') || '';
                                                // Resolve href relative to the NAV document's path
                                                const resolvedHref = resolveRelativePath(getDirectoryPath(currentNavDocPath), tocHref);
                                                const childItem: TOCItem = {
                                                    id: `toc-nav-${resolvedHref}-${index}`,
                                                    label: anchor.textContent?.trim() || 'Untitled',
                                                    href: resolvedHref,
                                                    children: [],
                                                };
                                                const nestedOl = li.getElementsByTagName('ol')[0];
                                                if (nestedOl) {
                                                    childItem.children = parseNavOl(nestedOl, currentNavDocPath);
                                                }
                                                children.push(childItem);
                                            }
                                        });
                                        return children;
                                    };
                                    tocItems = parseNavOl(ol, tocPath); // Pass tocPath (path of NAV doc)
                                    tocFound = true;
                                    break;
                                }
                            }
                        }
                    }
                } catch (e) { console.error("Error parsing EPUB3 nav document:", tocPath, e); }
                if (tocFound) break;
            }
        }
    }

    // Method 2: EPUB2 NCX
    if (!tocFound && spineElement) {
        const tocId = spineElement.getAttribute('toc');
        let ncxHref = '';
        if (tocId) {
            for (let i = 0; i < manifestItems.length; i++) {
                if (manifestItems[i].getAttribute('id') === tocId) {
                    ncxHref = manifestItems[i].getAttribute('href') || '';
                    break;
                }
            }
        } else {
             for (let i = 0; i < manifestItems.length; i++) {
                if (manifestItems[i].getAttribute('media-type') === 'application/x-dtbncx+xml') {
                    ncxHref = manifestItems[i].getAttribute('href') || '';
                    break;
                }
            }
        }
        if (ncxHref) {
            tocPath = resolveRelativePath(opfFileDir, ncxHref);
            try {
                const ncxContent = await zip.file(tocPath)?.async('text');
                if (ncxContent) {
                    const ncxDoc = xmlParser.parseFromString(ncxContent, 'application/xml');
                    const navMap = ncxDoc.getElementsByTagName('navMap')[0];
                    if (navMap) {
                        const parseNavPoints = (parentElement: Element, currentNcxDocPath: string): TOCItem[] => {
                            const children: TOCItem[] = [];
                             const navPoints = Array.from(parentElement.childNodes).filter(n => n.nodeName === 'navPoint') as Element[];
                            navPoints.forEach((navPoint) => {
                                const navLabel = navPoint.getElementsByTagName('navLabel')[0]?.getElementsByTagName('text')[0]?.textContent?.trim() || 'Untitled';
                                const contentSrc = navPoint.getElementsByTagName('content')[0]?.getAttribute('src') || '';
                                // Resolve src relative to the NCX document's path
                                const resolvedSrc = resolveRelativePath(getDirectoryPath(currentNcxDocPath), contentSrc);
                                const item: TOCItem = {
                                    id: navPoint.getAttribute('id') || `toc-ncx-${resolvedSrc}`,
                                    label: navLabel,
                                    href: resolvedSrc,
                                    children: parseNavPoints(navPoint, currentNcxDocPath),
                                };
                                children.push(item);
                            });
                            return children;
                        };
                        tocItems = parseNavPoints(navMap, tocPath); // Pass tocPath (path of NCX doc)
                        tocFound = true;
                    }
                }
            } catch (e) { console.error("Error parsing NCX document:", tocPath, e); }
        }
    }
    // Method 3: Fallback
    if (!tocFound || tocItems.length === 0) {
        tocItems = fileOrderList.map((filePath, index) => ({
            id: `spine-toc-${index}`,
            label: filePath.substring(filePath.lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "") || `Chapter ${index + 1}`,
            href: filePath, children: [],
        }));
    }
    return tocItems;
  }, []);


  const openBook = async (book: BookData): Promise<void> => {
    console.log(`[openBook] Opening: ${book.title}`);
    setIsLoading(true);
    closeBook(false); // Reset previous book state but keep global loading true

    setBookTitle(book.title);
    setBookAuthor(book.author);
    setCurrentBook(book); // Set currentBook early

    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(book.file);
      // setBookZip will be set AFTER essential parsing, to ensure htmlFiles and toc are ready with it

      const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
      if (!containerXml) throw new Error('EPUB Load Error: META-INF/container.xml not found');
      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerXml, 'application/xml');
      const rootfiles = containerDoc.getElementsByTagName('rootfile');
      if (rootfiles.length === 0) throw new Error('EPUB Load Error: No rootfile in container.xml');
      const currentOpfPath = rootfiles[0].getAttribute('full-path') || '';
      setOpfPath(currentOpfPath); // opfPath state is set

      const opfFileDir = getDirectoryPath(currentOpfPath);
      const opfContent = await loadedZip.file(currentOpfPath)?.async('text');
      if (!opfContent) throw new Error(`EPUB Load Error: OPF file not found at ${currentOpfPath}`);
      const opfDoc = parser.parseFromString(opfContent, 'application/xml');

      const manifestElement = opfDoc.getElementsByTagName('manifest')[0];
      const spineElement = opfDoc.getElementsByTagName('spine')[0];
      if (!manifestElement) throw new Error('EPUB Load Error: Manifest not found in OPF');
      if (!spineElement) throw new Error('EPUB Load Error: Spine not found in OPF');
      const manifestItems = manifestElement.getElementsByTagName('item');
      const spineItemRefs = spineElement.getElementsByTagName('itemref');
      const currentFileOrder: string[] = [];
      for (let i = 0; i < spineItemRefs.length; i++) {
        const idref = spineItemRefs[i].getAttribute('idref');
        for (let j = 0; j < manifestItems.length; j++) {
          if (manifestItems[j].getAttribute('id') === idref) {
            const href = manifestItems[j].getAttribute('href');
            if (href) currentFileOrder.push(resolveRelativePath(opfFileDir, href));
            else console.warn(`Manifest item ${idref} has no href.`);
            break;
          }
        }
      }

      if (currentFileOrder.length === 0) {
        console.error("[openBook] No files found in spine. Cannot open book content.");
        throw new Error("EPUB Load Error: No content files found in the book's spine.");
      }
      setHtmlFiles(currentFileOrder); // htmlFiles state is set
      setTotalPages(currentFileOrder.length);

      const extractedToc = await extractTocFromEntries(loadedZip, manifestItems, spineElement, opfFileDir, parser, currentFileOrder);
      setToc(extractedToc); // toc state is set

      // Now that all structural data is ready, set the zip and trigger reading state
      setBookZip(loadedZip); // bookZip state is set
      setIsReading(true); // isReading state is set - this is a key part of useEffect condition

      let pageIdxToLoadInitially = book.currentPage || 0;
      if (book.lastChapter?.href && extractedToc.length > 0) {
        const chapterPath = book.lastChapter.href.split('#')[0];
        const pageIndexFromChapter = currentFileOrder.findIndex(file => file === chapterPath || file.endsWith('/' + chapterPath));
        if (pageIndexFromChapter !== -1) pageIdxToLoadInitially = pageIndexFromChapter;
      }
      pageIdxToLoadInitially = Math.max(0, Math.min(pageIdxToLoadInitially, currentFileOrder.length - 1));
      setCurrentPageToLoad(pageIdxToLoadInitially); // This will trigger the useEffect
      setCurrentPageDisplay(pageIdxToLoadInitially); // Sync display

      console.log(`[openBook] Successfully prepared: ${book.title}. Page to load: ${pageIdxToLoadInitially}`);
      setBooks(prevBooks => prevBooks.map(b => b.id === book.id ? { ...b, lastRead: new Date().toISOString() } : b));

    } catch (error) {
      console.error('[openBook ERROR]', error);
      closeBook(true);
      alert(`Error opening book: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const closeBook = (resetGlobalLoading = true): void => {
    console.log("[closeBook] Closing book.");
    setIsReading(false); // Set isReading to false first
    setCurrentBook(null);
    setBookZip(null);
    setOpfPath('');
    setHtmlFiles([]);
    setToc([]);
    setCurrentContent('');
    setBookTitle('');
    setBookAuthor('');
    setIsPlayModeVisible(false);
    setCurrentPageText('');
    setCurrentPageToLoad(0); // Reset page to load
    setCurrentPageDisplay(0); // Reset display
    if (resetGlobalLoading) setIsLoading(false);
    setIsPageLoading(false);
  };

  const nextPage = (): void => {
    if (isReading && currentPageToLoad < totalPages - 1) { // Check isReading
      console.log(`[nextPage] current: ${currentPageToLoad}, total: ${totalPages}`);
      setCurrentPageToLoad(prev => prev + 1);
    }
  };

  const prevPage = (): void => {
    if (isReading && currentPageToLoad > 0) { // Check isReading
      console.log(`[prevPage] current: ${currentPageToLoad}`);
      setCurrentPageToLoad(prev => prev - 1);
    }
  };

  const navigateToTocItem = (item: TOCItem): void => {
    if (!isReading || !htmlFiles || htmlFiles.length === 0) { // Check isReading
        console.warn("[navigateToTocItem] Aborted: Not in reading state or no HTML files.");
        return;
    }
    const [pathPart, fragment] = item.href.split('#');
    console.log(`[navigateToTocItem] Attempting to navigate to href: ${item.href} (pathPart: ${pathPart})`);
    // item.href is assumed to be relative to EPUB root from extractTocFromEntries

    // Find index based on the resolved, root-relative path stored in item.href
    const fileIndex = htmlFiles.findIndex(file => file === pathPart);

    if (fileIndex !== -1) {
      console.log(`[navigateToTocItem] Found file at index: ${fileIndex}. Loading page.`);
      setCurrentPageToLoad(fileIndex);
      if (fragment) {
        setTimeout(() => {
          const element = document.getElementById(fragment);
          if (element) element.scrollIntoView({ behavior: 'smooth' });
          else console.warn(`[navigateToTocItem] Fragment not found after TOC navigation: #${fragment}`);
        }, 350); // Increased delay slightly
      }
    } else {
      console.warn(`[navigateToTocItem] Could not find file in htmlFiles for TOC item href: ${item.href} (resolved path: ${pathPart})`);
    }
  };

  const togglePlayMode = (): void => setIsPlayModeVisible(!isPlayModeVisible);

  const value: BookContextValue = {
    books, addBook, removeBook,
    currentBook, isReading, isLoading, isPageLoading, bookTitle, bookAuthor,
    currentPageDisplay, totalPages, currentContent, currentPageText, toc,
    openBook, closeBook, nextPage, prevPage, navigateToTocItem,
    htmlFiles, opfPath,
    isPlayModeVisible, togglePlayMode,
  };

  return <BookContext.Provider value={value}>{children}</BookContext.Provider>;
};