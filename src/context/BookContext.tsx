// src/context/BookContext.tsx
import { trackEvent } from '../lib/analytics';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import localforage from 'localforage';
import JSZip from 'jszip'; // Make sure this is the JSZip you intend, not AdmZip
import { DOMParser } from 'xmldom';
import { getDirectoryPath, resolveRelativePath } from '../utils/pathUtils';
import { processHtmlContent, extractTextFromHtml } from '../utils/textExtraction';
import { BookData, TOCItem } from '@/types/books'; // Ensure BookData includes all necessary fields like lastChapter


localforage.config({
  name: "EbookReaderApp",  // Database name
  storeName: "bookStorage" // Object store for BookContext's data
});

// ... (BookContextValue interface - should be the same as the last full version I provided)
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
  closeBook: (resetGlobalLoading?: boolean) => void; // Added optional param
  nextPage: () => void;
  prevPage: () => void;
  navigateToTocItem: (item: TOCItem) => void;
  htmlFiles: string[];
  opfPath: string;
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
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState<boolean>(false); // New state
  // ... (all other state declarations from the previous full version remain the same)
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
  // *** NEW: Add a ref to ensure the default book is only loaded once per session ***
  const defaultBookLoadAttempted = useRef(false);
    // 2. Add a ref to track when a book reading session starts
  const readingStartTimestamp = useRef<number | null>(null);


  // 1. Load books from LocalForage on initial mount
  useEffect(() => {
    const loadBooksFromStorage = async () => {
      console.log("[LocalForage Load] Attempting to load books.");
      setIsLoading(true);
      try {
        const keys = await localforage.keys();
        const bookMetadataKeys = keys.filter(key => key.startsWith('book_metadata_'));
        let loadedBooks: BookData[] = [];

        // *** NEW: If no books are in storage, load the default book ***
        if (bookMetadataKeys.length === 0 && !defaultBookLoadAttempted.current) {
          console.log("[Default Book] Library is empty. Attempting to load default book.");
          defaultBookLoadAttempted.current = true; // Prevent re-loading

          // AWAIT the result of loading the default book.
          const defaultBook = await loadDefaultBook();
          if (defaultBook) {
            // Add it directly to the array we will use to set the state.
            loadedBooks.push(defaultBook);
          }
        } else {
            // If storage is NOT empty, load from it as before.
            for (const key of bookMetadataKeys) {
                const bookId = key.replace('book_metadata_', '');
                const metadata = await localforage.getItem(key) as BookData;
                const fileKey = `book_file_${bookId}`;
                const file = await localforage.getItem(fileKey) as File;

                if (metadata && file) {
                    loadedBooks.push({ ...metadata, file: file });
                }
            }
        }

        // Set the state ONCE with the final list of books.
        setBooks(loadedBooks);
        console.log("[LocalForage Load] Finished loading books. Final Count:", loadedBooks.length);

      } catch (error) {
        console.error("[LocalForage Load] Error loading books from storage", error);
        setBooks([]); // Fallback to empty library on error
      } finally {
        setIsLoading(false);
        setIsInitialLoadComplete(true);
      }
    };

    loadBooksFromStorage();
  }, []); // Empty dependency array: runs once on mount


  // *** NEW: Function to load the default sample book ***
  const loadDefaultBook = async (): Promise<BookData | null> => {
    // Note: I saw `/1984.epub` in your logs. I'll use that.
    // Make sure '1984.epub' is in your `public/` folder (or `public/books/` and adjust path)
    const defaultBookPath = '/dracula.epub';
    console.log(`[Default Book] Fetching from: ${defaultBookPath}`);
    setIsLoading(true); // Show loading indicator
    try {
      const response = await fetch(defaultBookPath);
      if (!response.ok) {
        throw new Error(`Network response was not ok. Status: ${response.status}`);
      }
      const bookBlob = await response.blob();
      // NOTE: You named the file "Moby Dick.epub" in the `File` constructor, but the metadata
      // inside the epub seems to be for "1984". This is fine, just pointing it out.
      const bookFile = new File([bookBlob], "1984.epub", { type: 'application/epub+zip' });

      // ---- This is the same logic copied from the start of your `addBook` function ----
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(bookFile);
      const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
      if (!containerXml) throw new Error('Invalid EPUB: container.xml not found');
      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerXml, 'application/xml');
      const rootfiles = containerDoc.getElementsByTagName('rootfile');
      const opfPath = rootfiles[0]?.getAttribute('full-path') || '';
      const opfContent = await loadedZip.file(opfPath)?.async('text');
      if (!opfContent) throw new Error('Invalid EPUB: OPF file not found');
      const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      const title = opfDoc.getElementsByTagName('dc:title')[0]?.textContent?.trim() || 'Unknown Title';
      const author = opfDoc.getElementsByTagName('dc:creator')[0]?.textContent?.trim() || 'Unknown Author';
      const id = `${Date.now()}-${bookFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      // This part for cover is complex, can be simplified or kept if needed
      let coverUrl: string | null = null;
       const metaCover = Array.from(opfDoc.getElementsByTagName('meta')).find(m => m.getAttribute('name') === 'cover');
        if (metaCover) {
            const coverId = metaCover.getAttribute('content');
            const coverItem = Array.from(opfDoc.getElementsByTagName('item')).find(item => item.getAttribute('id') === coverId);
            if (coverItem) {
                const href = coverItem.getAttribute('href');
                if (href) {
                    const coverPath = resolveRelativePath(getDirectoryPath(opfPath), href);
                    const coverBlob = await loadedZip.file(coverPath)?.async('blob');
                    if(coverBlob) coverUrl = URL.createObjectURL(coverBlob);
                }
            }
        }
      
      const newBook: BookData = {
        id, title, author, coverUrl,
        currentPage: 0, totalPages: 0,
        file: bookFile, lastRead: new Date().toISOString(),
      };
      
      console.log(`[Default Book] Successfully processed: ${newBook.title}`);
      // Instead of calling setBooks, RETURN the created book object
      return newBook;

    } catch (error) {
      console.error("[Default Book] Failed to load the default book:", error);
      return null; // Return null on failure
    } finally {
        setIsLoading(false);
    }
  };

  const addBook = async (file: File): Promise<void> => {
    // This function is now only used for USER uploads, not the default book.
    console.log(`[addBook] Attempting to add book: ${file.name}`);
    if (file.name.split('.').pop()?.toLowerCase() !== 'epub') {
      alert('Please upload an EPUB file.');
      return;
    }
    setIsLoading(true); // Global loading for adding a book
    try {
      const zip = new JSZip(); // Using JSZip from BookContext
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
      const title = titleElements.length > 0 ? titleElements[0].textContent?.trim() || 'Unknown Title' : 'Unknown Title';
      const creatorElements = opfDoc.getElementsByTagName('dc:creator');
      const author = creatorElements.length > 0 ? creatorElements[0].textContent?.trim() || 'Unknown Author' : 'Unknown Author';
      // Simple ID generation, ensure it's unique enough for your needs
      const id = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

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
        id,
        title,
        author,
        coverUrl,
        currentPage: 0,
        totalPages: 0, // This will be calculated when the book is opened
        file, // The actual File object
        lastRead: new Date().toISOString(),
        // lastChapter: undefined, // Initialized as undefined
      };
      console.log(`[addBook] New book created: ${newBook.title}, ID: ${newBook.id}`);
      setBooks(prevBooks => {
        // Check if book with same ID already exists to prevent duplicates
        if (prevBooks.find(b => b.id === newBook.id)) {
            console.warn(`[addBook] Book with ID ${newBook.id} already exists. Not adding duplicate.`);
            alert(`Book "${newBook.title}" is already in your library.`);
            return prevBooks;
        }
        console.log(`[addBook] Adding book to state. Previous count: ${prevBooks.length}`);
        return [...prevBooks, newBook];
      });

      // 3. TRACK THE EVENT!
      trackEvent('add_book', {
      // You can add more details, e.g., distinguish between upload and drag-drop if you want
        method: 'upload', 
      });
    } catch (error) {
      console.error('[addBook] Error processing EPUB file:', error);
      alert(`Error adding book: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- All other functions (findChapterForPageCallback, loadPageCallback, useEffect for page loading, openBook, closeBook, nextPage, prevPage, navigateToTocItem, removeBook, extractTocFromEntries, togglePlayMode)
  // --- should be taken from the last full version of BookContext.tsx I provided, as their internal logic was mostly okay.
  // --- The primary fix here is for the load/save effects.
  // --- Remember to include the `isPageLoading` state and its management.

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
            if (tocItem.children?.length) {
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
    zipToUse: JSZip | null,
    filesInOrder: string[],
    currentBookRef: BookData | null,
    currentTocRef: TOCItem[]
  ) => {
    console.log(`[loadPageCallback ENTER] pageIdxToLoad: ${pageIdxToLoad}, zipExists: ${!!zipToUse}, filesLength: ${filesInOrder?.length ?? 0}`);
    if (!zipToUse || !filesInOrder || filesInOrder.length === 0 || pageIdxToLoad < 0 || pageIdxToLoad >= filesInOrder.length) {
      console.error(`[loadPageCallback ABORT] Invalid conditions. pageIdx: ${pageIdxToLoad}, zip: ${!!zipToUse}, filesLen: ${filesInOrder?.length ?? 0}`);
      setCurrentContent('<div>Error: Could not load page.</div>');
      setCurrentPageText('');
      setIsPageLoading(false);
      return;
    }
    setIsPageLoading(true);
    try {
      const filePath = filesInOrder[pageIdxToLoad];
      console.log(`[loadPageCallback] Loading file: ${filePath}`);
      const htmlTextContent = await zipToUse.file(filePath)?.async('text');
      if (htmlTextContent == null) throw new Error(`Could not load HTML for ${filePath}`);
      console.log(`[loadPageCallback] HTML fetched for ${filePath}, length: ${htmlTextContent.length}`);
      const fileDir = getDirectoryPath(filePath);
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
      setTimeout(() => { /* Image/CSS processing logic - unchanged */
        const contentElement = document.querySelector('.epub-content');
        if (contentElement) {
          const images = contentElement.querySelectorAll('img');
          images.forEach(async (img: HTMLImageElement) => {
            const epubSrc = img.getAttribute('data-epub-src');
            if (epubSrc && !epubSrc.startsWith('blob:')) {
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
      setCurrentContent(`<div>Error loading page: ${(error as Error).message}</div>`);
      setCurrentPageText('');
    } finally {
      setIsPageLoading(false);
      console.log(`[loadPageCallback EXIT] pageIdxToLoad: ${pageIdxToLoad}`);
    }
  }, [findChapterForPageCallback]);

  useEffect(() => { /* useEffect for Page Loading - unchanged */
    console.log('[useEffect PageLoad] Triggered. States:', {
      currentBookName: currentBook?.title, bookZipExists: !!bookZip, htmlFilesCount: htmlFiles.length,
      currentPageToLoad, tocCount: toc.length, isReading
    });
    if (isReading && currentBook && bookZip && htmlFiles && htmlFiles.length > 0 &&
        currentPageToLoad >= 0 && currentPageToLoad < htmlFiles.length) {
      console.log('[useEffect PageLoad] Conditions MET. Calling loadPageCallback.');
      loadPageCallback(currentPageToLoad, bookZip, htmlFiles, currentBook, toc);
    } else {
      console.log('[useEffect PageLoad] Conditions NOT MET or book not in reading state.');
      if (!currentBook || !isReading) {
        setCurrentContent(''); setCurrentPageText(''); setCurrentPageDisplay(0);
        console.log('[useEffect PageLoad] Cleaned up content for closed/non-reading book.');
      } else {
         console.log('[useEffect PageLoad] Book open but other conditions failed.');
      }
    }
  }, [currentBook, bookZip, htmlFiles, currentPageToLoad, loadPageCallback, toc, isReading]);

  const removeBook = async (bookId: string): Promise<void> => { /* Unchanged */
    const bookToRemove = books.find(b => b.id === bookId);
    if (bookToRemove?.coverUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(bookToRemove.coverUrl);
    }
    trackEvent('remove_book');
    console.log(`[removeBook] Removing book ID: ${bookId}`);
    setBooks(prevBooks => prevBooks.filter(b => b.id !== bookId));
    // Save will be triggered by useEffect watching `books`
  };

  const extractTocFromEntries = useCallback(async ( /* Unchanged */
    zip: JSZip, manifestItems: HTMLCollectionOf<Element>, spineElement: Element | null,
    opfFileDirVal: string, xmlParser: DOMParser, fileOrderList: string[]
  ): Promise<TOCItem[]> => {
    let tocPath = ''; let tocItems: TOCItem[] = []; let tocFound = false;
    const opfFileDir = opfFileDirVal;
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
                                                const resolvedHref = resolveRelativePath(getDirectoryPath(currentNavDocPath), tocHref);
                                                const childItem: TOCItem = {
                                                    id: `toc-nav-${resolvedHref}-${index}`,
                                                    label: anchor.textContent?.trim() || 'Untitled',
                                                    href: resolvedHref, children: [],
                                                };
                                                const nestedOl = li.getElementsByTagName('ol')[0];
                                                if (nestedOl) childItem.children = parseNavOl(nestedOl, currentNavDocPath);
                                                children.push(childItem);
                                            }
                                        }); return children;
                                    };
                                    tocItems = parseNavOl(ol, tocPath); tocFound = true; break;
                                } } } }
                } catch (e) { console.error("Error parsing EPUB3 nav:", tocPath, e); }
                if (tocFound) break;
            } } }
    if (!tocFound && spineElement) { /* NCX parsing - unchanged */
        const tocId = spineElement.getAttribute('toc'); let ncxHref = '';
        if (tocId) {
            for (let i = 0; i < manifestItems.length; i++) {
                if (manifestItems[i].getAttribute('id') === tocId) { ncxHref = manifestItems[i].getAttribute('href') || ''; break; } }
        } else {
             for (let i = 0; i < manifestItems.length; i++) {
                if (manifestItems[i].getAttribute('media-type') === 'application/x-dtbncx+xml') { ncxHref = manifestItems[i].getAttribute('href') || ''; break; } } }
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
                                const resolvedSrc = resolveRelativePath(getDirectoryPath(currentNcxDocPath), contentSrc);
                                const item: TOCItem = {
                                    id: navPoint.getAttribute('id') || `toc-ncx-${resolvedSrc}`,
                                    label: navLabel, href: resolvedSrc,
                                    children: parseNavPoints(navPoint, currentNcxDocPath),
                                }; children.push(item);
                            }); return children;
                        };
                        tocItems = parseNavPoints(navMap, tocPath); tocFound = true;
                    } }
            } catch (e) { console.error("Error parsing NCX:", tocPath, e); }
        } }
    if (!tocFound || tocItems.length === 0) { /* Fallback to spine - unchanged */
        tocItems = fileOrderList.map((filePath, index) => ({
            id: `spine-toc-${index}`,
            label: filePath.substring(filePath.lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "") || `Chapter ${index + 1}`,
            href: filePath, children: [],
        })); }
    return tocItems;
  }, []);

  const openBook = async (book: BookData): Promise<void> => { /* Unchanged from previous full version */
    console.log(`[openBook] Opening: ${book.title}`); setIsLoading(true); closeBook(false);
    setBookTitle(book.title); setBookAuthor(book.author); setCurrentBook(book);
    try {
      const zip = new JSZip(); const loadedZip = await zip.loadAsync(book.file);
      const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
      if (!containerXml) throw new Error('EPUB Load Error: META-INF/container.xml not found');
      const parser = new DOMParser(); const containerDoc = parser.parseFromString(containerXml, 'application/xml');
      const rootfiles = containerDoc.getElementsByTagName('rootfile');
      if (rootfiles.length === 0) throw new Error('EPUB Load Error: No rootfile in container.xml');
      const currentOpfPath = rootfiles[0].getAttribute('full-path') || ''; setOpfPath(currentOpfPath);
      const opfFileDir = getDirectoryPath(currentOpfPath);
      const opfContent = await loadedZip.file(currentOpfPath)?.async('text');
      if (!opfContent) throw new Error(`EPUB Load Error: OPF file not found at ${currentOpfPath}`);
      const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      const manifestElement = opfDoc.getElementsByTagName('manifest')[0];
      const spineElement = opfDoc.getElementsByTagName('spine')[0];
      if (!manifestElement || !spineElement) throw new Error('EPUB Load Error: Missing manifest or spine.');
      const manifestItems = manifestElement.getElementsByTagName('item'); const spineItemRefs = spineElement.getElementsByTagName('itemref');
      const currentFileOrder: string[] = [];
      for (let i = 0; i < spineItemRefs.length; i++) {
        const idref = spineItemRefs[i].getAttribute('idref');
        for (let j = 0; j < manifestItems.length; j++) {
          if (manifestItems[j].getAttribute('id') === idref) {
            const href = manifestItems[j].getAttribute('href');
            if (href) currentFileOrder.push(resolveRelativePath(opfFileDir, href));
            else console.warn(`Manifest item ${idref} has no href.`);
            break;
          } } }
      if (currentFileOrder.length === 0) throw new Error("EPUB Load Error: No content files in spine.");
      setHtmlFiles(currentFileOrder); setTotalPages(currentFileOrder.length);
      const extractedToc = await extractTocFromEntries(loadedZip, manifestItems, spineElement, opfFileDir, parser, currentFileOrder);
      setToc(extractedToc);
      setBookZip(loadedZip); setIsReading(true);
      let pageIdxToLoadInitially = book.currentPage || 0;
      if (book.lastChapter?.href && extractedToc.length > 0) { /* lastChapter logic - unchanged */
        const chapterPath = book.lastChapter.href.split('#')[0];
        const pageIndexFromChapter = currentFileOrder.findIndex(file => file === chapterPath || file.endsWith('/' + chapterPath));
        if (pageIndexFromChapter !== -1) pageIdxToLoadInitially = pageIndexFromChapter;
      }
      pageIdxToLoadInitially = Math.max(0, Math.min(pageIdxToLoadInitially, currentFileOrder.length - 1));
      setCurrentPageToLoad(pageIdxToLoadInitially); setCurrentPageDisplay(pageIdxToLoadInitially);
      console.log(`[openBook] Successfully prepared: ${book.title}. Page to load: ${pageIdxToLoadInitially}`);
      setBooks(prevBooks => prevBooks.map(b => b.id === book.id ? { ...b, lastRead: new Date().toISOString() } : b));
      // 4. TRACK THE EVENT AND START THE TIMER
      trackEvent('open_book', {
        book_title: book.title, // Add context about the book
      });
      readingStartTimestamp.current = Date.now(); // Start the timer
    } catch (error) {
      console.error('[openBook ERROR]', error); closeBook(true); alert(`Error opening book: ${(error as Error).message}`);
    } finally { setIsLoading(false); }
  };

  const closeBook = (resetGlobalLoading = true): void => { /* Unchanged */
        // 5. TRACK THE EVENT AND CALCULATE DURATION
    if (readingStartTimestamp.current && currentBook) {
      const endTime = Date.now();
      const durationInSeconds = Math.round((endTime - readingStartTimestamp.current) / 1000);
      
      trackEvent('close_book', {
        book_title: currentBook.title,
        reading_duration_seconds: durationInSeconds,
      });

      readingStartTimestamp.current = null; // Reset the timer
    }
    console.log("[closeBook] Closing book."); setIsReading(false); setCurrentBook(null); setBookZip(null);
    setOpfPath(''); setHtmlFiles([]); setToc([]); setCurrentContent(''); setBookTitle('');
    setBookAuthor(''); setIsPlayModeVisible(false); setCurrentPageText('');
    setCurrentPageToLoad(0); setCurrentPageDisplay(0);
    if (resetGlobalLoading) setIsLoading(false);
    setIsPageLoading(false);
  };

  const nextPage = (): void => { /* Unchanged */
    if (isReading && currentPageToLoad < totalPages - 1) {
      // 6. TRACK PAGE TURNS
      trackEvent('turn_page', {
        direction: 'next',
        page_number: currentPageToLoad + 1,
      });
      console.log(`[nextPage] current: ${currentPageToLoad}, total: ${totalPages}`);
      setCurrentPageToLoad(prev => prev + 1);
    }
  };
  const prevPage = (): void => { /* Unchanged */
    if (isReading && currentPageToLoad > 0) {

      // 6. TRACK PAGE TURNS
      trackEvent('turn_page', {
        direction: 'previous',
        page_number: currentPageToLoad - 1,
      });
      console.log(`[prevPage] current: ${currentPageToLoad}`);
      setCurrentPageToLoad(prev => prev - 1);
    }
  };
  const navigateToTocItem = (item: TOCItem): void => { /* Unchanged */
    if (!isReading || !htmlFiles || htmlFiles.length === 0) {
    
    console.warn("[navigateToTocItem] Aborted: Not reading or no HTML files."); return; }
    const [pathPart, fragment] = item.href.split('#');
    console.log(`[navigateToTocItem] To href: ${item.href} (pathPart: ${pathPart})`);
    const fileIndex = htmlFiles.findIndex(file => file === pathPart);
    if (fileIndex !== -1) {
          // THIS is the point of success. Track the event here.
      trackEvent('use_feature', {
        feature_name: 'table_of_contents',
        chapter_title: item.label,
      });
      console.log(`[navigateToTocItem] Found file at index: ${fileIndex}. Loading.`);
      setCurrentPageToLoad(fileIndex);
      if (fragment) { setTimeout(() => { /* fragment scrolling - unchanged */
          const element = document.getElementById(fragment);
          if (element) element.scrollIntoView({ behavior: 'smooth' });
          else console.warn(`[navigateToTocItem] Fragment not found: #${fragment}`);
        }, 350); }
    } else { console.warn(`[navigateToTocItem] Could not find file for TOC item: ${item.href}`); }
  };

  // const togglePlayMode = (): void => setIsPlayModeVisible(!isPlayModeVisible); /* Unchanged */

  const togglePlayMode = (): void => {
    // 8. TRACK TEXT-TO-SPEECH USAGE
    if (!isPlayModeVisible) { // Only track when the user STARTS it
        trackEvent('use_feature', {
            feature_name: 'text_to_speech'
        });
    }
    setIsPlayModeVisible(!isPlayModeVisible);
  };


  const value: BookContextValue = {
    books, addBook, removeBook,
    currentBook, isReading, isLoading, isPageLoading, bookTitle, bookAuthor,
    currentPageDisplay, totalPages, currentContent, currentPageText, toc,
    openBook, closeBook, nextPage, prevPage, navigateToTocItem,
    htmlFiles, opfPath,
    isPlayModeVisible, togglePlayMode,
  };

  return (
    <BookContext.Provider value={value}>
      {children}
    </BookContext.Provider>
  );
};