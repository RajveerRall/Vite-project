import JSZip from 'jszip';

interface EpubOptions {
  title: string;
  author?: string;
  language?: string;
  chapterBreaks?: number[]; // Page indices where chapters should start
}

interface AppendOptions {
  existingEpub: Blob | File;
  newContent: string;
  chapterTitle?: string;
  appendMode?: 'new_chapter' | 'last_chapter'; // Whether to create a new chapter or append to the last chapter
}

/**
 * Generates an EPUB file from scanned text content
 * By default, all pages are grouped into a single chapter
 */
export async function generateEpubFromScannedText(
  textContent: string,
  options: EpubOptions
): Promise<Blob> {
  const {
    title,
    author = 'Scanned by YoRead',
    language = 'en',
    chapterBreaks = []
  } = options;

  // Create a new ZIP file
  const zip = new JSZip();

  // Add mimetype file (must be first and uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // Add META-INF directory with container.xml
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles>
        <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
      </rootfiles>
    </container>`
  );

  // Add CSS files
  zip.file(
    'stylesheet.css',
    `body {
      font-family: serif;
      margin: 5%;
      text-align: justify;
    }
    h1, h2, h3, h4 {
      text-align: center;
      font-weight: normal;
      page-break-before: always;
    }
    .chapter {
      margin-top: 2em;
      page-break-before: always;
    }
    .page {
      margin-bottom: 1em;
    }
    .page-break {
      page-break-after: always;
    }`
  );

  // Split text by pages (assuming double newline separates pages)
  const pages = textContent.split('\n\n');

  // Determine how to organize pages into chapters
  let chapters: { title: string; content: string[] }[] = [];

  if (chapterBreaks.length === 0) {
    // Default: all pages in one chapter
    chapters = [{ 
      title: 'Chapter 1', 
      content: pages 
    }];
  } else {
    // Create chapters based on break points
    chapterBreaks.sort((a, b) => a - b);
    
    let currentChapterStart = 0;
    for (let i = 0; i < chapterBreaks.length; i++) {
      const breakPoint = chapterBreaks[i];
      if (breakPoint > currentChapterStart && breakPoint < pages.length) {
        chapters.push({
          title: `Chapter ${chapters.length + 1}`,
          content: pages.slice(currentChapterStart, breakPoint)
        });
        currentChapterStart = breakPoint;
      }
    }
    
    // Add the last chapter
    if (currentChapterStart < pages.length) {
      chapters.push({
        title: `Chapter ${chapters.length + 1}`,
        content: pages.slice(currentChapterStart)
      });
    }
  }

  // If no valid chapters were created, default to all pages in one chapter
  if (chapters.length === 0) {
    chapters = [{ 
      title: 'Chapter 1', 
      content: pages 
    }];
  }

  // Create HTML files for each chapter
  const htmlFiles: { id: string; href: string; title: string }[] = [];

  chapters.forEach((chapter, index) => {
    const chapterId = `chapter${index + 1}`;
    const chapterFile = `text/${chapterId}.html`;
    
    const chapterContent = chapter.content.map((page, pageIndex) => 
      `<div class="page" id="page-${index + 1}-${pageIndex + 1}">${page}</div>`
    ).join('\n');

    const chapterHtml = `<?xml version="1.0" encoding="UTF-8"?>
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>${chapter.title}</title>
        <link href="../stylesheet.css" rel="stylesheet" type="text/css"/>
      </head>
      <body>
        <h1>${chapter.title}</h1>
        ${chapterContent}
      </body>
    </html>`;

    zip.file(chapterFile, chapterHtml);
    
    htmlFiles.push({
      id: chapterId,
      href: chapterFile,
      title: chapter.title
    });
  });

  // Create title page
  const titlePageHtml = `<?xml version="1.0" encoding="UTF-8"?>
  <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <title>${title}</title>
      <link href="stylesheet.css" rel="stylesheet" type="text/css"/>
    </head>
    <body>
      <h1>${title}</h1>
      <p>${author}</p>
    </body>
  </html>`;
  
  zip.file('titlepage.xhtml', titlePageHtml);
  htmlFiles.unshift({
    id: 'titlepage',
    href: 'titlepage.xhtml',
    title: 'Title Page'
  });

  // Create OPF file (content.opf)
  const opfContent = `<?xml version="1.0" encoding="UTF-8"?>
  <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
      <dc:title>${title}</dc:title>
      <dc:creator opf:role="aut">${author}</dc:creator>
      <dc:language>${language}</dc:language>
      <dc:identifier id="BookID">urn:uuid:${generateUUID()}</dc:identifier>
    </metadata>
    <manifest>
      <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
      <item id="css" href="stylesheet.css" media-type="text/css"/>
      ${htmlFiles.map(file => 
        `<item id="${file.id}" href="${file.href}" media-type="application/xhtml+xml"/>`
      ).join('\n      ')}
    </manifest>
    <spine toc="ncx">
      ${htmlFiles.map(file => 
        `<itemref idref="${file.id}"/>`
      ).join('\n      ')}
    </spine>
  </package>`;
  
  zip.file('content.opf', opfContent);

  // Create NCX file (toc.ncx)
  const ncxContent = `<?xml version="1.0" encoding="UTF-8"?>
  <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
      <meta name="dtb:uid" content="urn:uuid:${generateUUID()}"/>
      <meta name="dtb:depth" content="1"/>
      <meta name="dtb:totalPageCount" content="0"/>
      <meta name="dtb:maxPageNumber" content="0"/>
    </head>
    <docTitle>
      <text>${title}</text>
    </docTitle>
    <navMap>
      ${htmlFiles.map((file, index) => 
        `<navPoint id="navPoint-${index + 1}" playOrder="${index + 1}">
          <navLabel>
            <text>${file.title}</text>
          </navLabel>
          <content src="${file.href}"/>
        </navPoint>`
      ).join('\n      ')}
    </navMap>
  </ncx>`;
  
  zip.file('toc.ncx', ncxContent);

  // Generate the EPUB file
  return await zip.generateAsync({ 
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });
}

/**
 * Appends new scanned content to an existing EPUB file
 */
export async function appendToExistingEpub(options: AppendOptions): Promise<Blob> {
  const { 
    existingEpub, 
    newContent, 
    chapterTitle = 'New Chapter',
    appendMode = 'new_chapter' 
  } = options;

  console.log('Starting appendToExistingEpub with:', {
    epubSize: existingEpub.size,
    contentLength: newContent.length,
    chapterTitle,
    appendMode
  });

  if (!newContent || newContent.trim() === '') {
    throw new Error('No content to append');
  }

  try {
    // Load the existing EPUB
    const zip = new JSZip();
    console.log('Loading EPUB into JSZip...');
    const loadedZip = await zip.loadAsync(existingEpub);
    console.log('EPUB loaded successfully');

    // List all files in the EPUB for debugging
    const files = Object.keys(loadedZip.files);
    console.log(`EPUB contains ${files.length} files:`, files.slice(0, 5));

    // Parse the container.xml to find the OPF file
    const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
    if (!containerXml) {
      throw new Error('Invalid EPUB: container.xml not found');
    }
    console.log('container.xml found and loaded');

  // Parse the container XML to get the OPF path
  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, 'application/xml');
  const rootfiles = containerDoc.getElementsByTagName('rootfile');
  if (rootfiles.length === 0) {
    throw new Error('Invalid EPUB: No rootfile found in container.xml');
  }

  const opfPath = rootfiles[0].getAttribute('full-path') || '';
  if (!opfPath) {
    throw new Error('Invalid EPUB: No OPF path found in container.xml');
  }

  // Get the OPF content
  const opfContent = await loadedZip.file(opfPath)?.async('text');
  if (!opfContent) {
    throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}`);
  }

  // Parse the OPF file
  const opfDoc = parser.parseFromString(opfContent, 'application/xml');
  
  // Get the spine and manifest
  const spine = opfDoc.getElementsByTagName('spine')[0];
  const manifest = opfDoc.getElementsByTagName('manifest')[0];
  
  if (!spine || !manifest) {
    throw new Error('Invalid EPUB: spine or manifest not found in OPF');
  }

  if (appendMode === 'last_chapter') {
    // Find the last chapter in the spine
    const itemrefs = spine.getElementsByTagName('itemref');
    if (itemrefs.length === 0) {
      throw new Error('No chapters found in the EPUB');
    }
    
    const lastItemref = itemrefs[itemrefs.length - 1];
    const lastChapterId = lastItemref.getAttribute('idref');
    
    if (!lastChapterId) {
      throw new Error('Could not determine last chapter ID');
    }
    
    // Find the corresponding item in the manifest
    const items = manifest.getElementsByTagName('item');
    const lastChapterItem = Array.from(items).find(item => item.getAttribute('id') === lastChapterId);
    
    if (!lastChapterItem) {
      throw new Error(`Could not find item for chapter ID: ${lastChapterId}`);
    }
    
    const lastChapterPath = lastChapterItem.getAttribute('href');
    if (!lastChapterPath) {
      throw new Error('Could not determine last chapter path');
    }
    
    console.log(`Appending to last chapter: ${lastChapterPath}`);
    
    // Get the content of the last chapter
    const lastChapterContent = await loadedZip.file(lastChapterPath)?.async('text');
    if (!lastChapterContent) {
      throw new Error(`Could not read last chapter: ${lastChapterPath}`);
    }
    
    // Parse the HTML to find where to append content
    const parser = new DOMParser();
    const lastChapterDoc = parser.parseFromString(lastChapterContent, 'application/xhtml+xml');
    
    // Find the body element or the last div in the document
    const body = lastChapterDoc.getElementsByTagName('body')[0];
    if (!body) {
      throw new Error('Could not find body element in last chapter');
    }
    
    // Create a div for the new content
    const newContentDiv = lastChapterDoc.createElement('div');
    newContentDiv.setAttribute('class', 'appended-content');
    
    // Add a separator
    const separator = lastChapterDoc.createElement('hr');
    newContentDiv.appendChild(separator);
    
    // Add the new content
    newContent.split('\n\n').forEach(page => {
      const pageDiv = lastChapterDoc.createElement('div');
      pageDiv.setAttribute('class', 'page');
      pageDiv.textContent = page;
      newContentDiv.appendChild(pageDiv);
    });
    
    // Append to the body
    body.appendChild(newContentDiv);
    
    // Update the chapter file in the zip
    const updatedChapterContent = new XMLSerializer().serializeToString(lastChapterDoc);
    loadedZip.file(lastChapterPath, updatedChapterContent);
    
    console.log('Content appended to last chapter');
  } else {
    // Create a new chapter (original behavior)
    // Generate a unique ID for the new chapter
    const newChapterId = `chapter_${Date.now()}`;
    const newChapterFilename = `text/${newChapterId}.html`;
    
    // Create HTML content for the new chapter
    const newChapterHtml = `<?xml version="1.0" encoding="UTF-8"?>
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>${chapterTitle}</title>
        <link href="../stylesheet.css" rel="stylesheet" type="text/css"/>
      </head>
      <body>
        <h1>${chapterTitle}</h1>
        <div class="chapter-content">
          ${newContent.split('\n\n').map(page => 
            `<div class="page">${page}</div>`
          ).join('\n')}
        </div>
      </body>
    </html>`;
    
    // Add the new chapter file to the zip
    loadedZip.file(newChapterFilename, newChapterHtml);
    
    // Add the new item to the manifest
    const newItem = opfDoc.createElement('item');
    newItem.setAttribute('id', newChapterId);
    newItem.setAttribute('href', newChapterFilename);
    newItem.setAttribute('media-type', 'application/xhtml+xml');
    manifest.appendChild(newItem);
    
    // Add the new itemref to the spine
    const newItemref = opfDoc.createElement('itemref');
    newItemref.setAttribute('idref', newChapterId);
    spine.appendChild(newItemref);
    
    console.log('New chapter created');
  }
  
  // Update the NCX file (toc.ncx) if it exists and we're creating a new chapter
  if (appendMode === 'new_chapter') {
    const ncxId = spine.getAttribute('toc') || 'ncx';
    const ncxItem = Array.from(manifest.getElementsByTagName('item')).find(
      item => item.getAttribute('id') === ncxId
    );
    
    if (ncxItem) {
      const ncxPath = ncxItem.getAttribute('href') || 'toc.ncx';
      const ncxContent = await loadedZip.file(ncxPath)?.async('text');
      
      if (ncxContent) {
        const ncxDoc = parser.parseFromString(ncxContent, 'application/xml');
        const navMap = ncxDoc.getElementsByTagName('navMap')[0];
        
        if (navMap) {
          // Get the last playOrder number
          const navPoints = ncxDoc.getElementsByTagName('navPoint');
          let lastPlayOrder = 0;
          
          if (navPoints.length > 0) {
            const lastNavPoint = navPoints[navPoints.length - 1];
            lastPlayOrder = parseInt(lastNavPoint.getAttribute('playOrder') || '0', 10);
          }
          
          // Create a new navPoint for the added chapter
          const newNavPoint = ncxDoc.createElement('navPoint');
          newNavPoint.setAttribute('id', `navPoint-${newChapterId}`);
          newNavPoint.setAttribute('playOrder', (lastPlayOrder + 1).toString());
          
          const navLabel = ncxDoc.createElement('navLabel');
          const text = ncxDoc.createElement('text');
          text.textContent = chapterTitle;
          navLabel.appendChild(text);
          
          const content = ncxDoc.createElement('content');
          content.setAttribute('src', newChapterFilename);
          
          newNavPoint.appendChild(navLabel);
          newNavPoint.appendChild(content);
          navMap.appendChild(newNavPoint);
          
          // Update the NCX file in the zip
          loadedZip.file(ncxPath, new XMLSerializer().serializeToString(ncxDoc));
          console.log('Updated TOC in NCX file');
        }
      }
    }
  }
  
  // Update the OPF file in the zip
  loadedZip.file(opfPath, new XMLSerializer().serializeToString(opfDoc));
  console.log('Updated OPF file in the zip');
  
  // Generate the updated EPUB
  console.log('Generating final EPUB...');
  const result = await loadedZip.generateAsync({ 
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });
  
  console.log('EPUB generated successfully', {
    size: result.size,
    type: result.type
  });
  
  return result;
  } catch (error) {
    console.error('Error in appendToExistingEpub:', error);
    throw error;
  }
}

// Helper function to generate UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
