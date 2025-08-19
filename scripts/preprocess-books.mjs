import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { DOMParser } from 'xmldom';

const SAMPLE_BOOKS_DIR = './public/sample-books';
const COVERS_OUTPUT_DIR = './public/sample-book-covers';
const OUTPUT_FILE = './src/lib/preprocessedBooks.json';

// Function to generate a text-based cover image as SVG
function generateTextCover(title, author, filename) {
  // Color palette for different books
  const colors = [
    { bg: '#2D3748', text: '#F7FAFC', accent: '#4299E1' }, // Blue
    { bg: '#2F855A', text: '#F7FAFC', accent: '#68D391' }, // Green
    { bg: '#9F7AEA', text: '#F7FAFC', accent: '#E9D8FD' }, // Purple
    { bg: '#ED8936', text: '#F7FAFC', accent: '#FBD38D' }, // Orange
    { bg: '#E53E3E', text: '#F7FAFC', accent: '#FEB2B2' }, // Red
    { bg: '#3182CE', text: '#F7FAFC', accent: '#90CDF4' }, // Light Blue
    { bg: '#805AD5', text: '#F7FAFC', accent: '#D6BCFA' }, // Violet
    { bg: '#D69E2E', text: '#F7FAFC', accent: '#F6E05E' }, // Yellow
  ];
  
  // Use filename hash to consistently pick a color
  const colorIndex = filename.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const color = colors[colorIndex];
  
  // Truncate title if too long
  const maxTitleLength = 35;
  const displayTitle = title.length > maxTitleLength ? title.substring(0, maxTitleLength) + '...' : title;
  
  // Truncate author if too long
  const maxAuthorLength = 25;
  const displayAuthor = author.length > maxAuthorLength ? author.substring(0, maxAuthorLength) + '...' : author;
  
  const svg = `<svg width="300" height="450" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color.bg};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${color.bg}dd;stop-opacity:1" />
      </linearGradient>
    </defs>
    
    <!-- Background -->
    <rect width="300" height="450" fill="url(#bgGradient)"/>
    
    <!-- Decorative elements -->
    <circle cx="250" cy="50" r="30" fill="${color.accent}" opacity="0.3"/>
    <circle cx="50" cy="400" r="40" fill="${color.accent}" opacity="0.2"/>
    
    <!-- Title -->
    <text x="150" y="180" text-anchor="middle" fill="${color.text}" font-family="Arial, sans-serif" font-size="24" font-weight="bold">
      <tspan x="150" dy="0">${displayTitle.split(' ').slice(0, 3).join(' ')}</tspan>
      ${displayTitle.split(' ').length > 3 ? `<tspan x="150" dy="30">${displayTitle.split(' ').slice(3).join(' ')}</tspan>` : ''}
    </text>
    
    <!-- Separator line -->
    <line x1="50" y1="250" x2="250" y2="250" stroke="${color.accent}" stroke-width="2"/>
    
    <!-- Author -->
    <text x="150" y="290" text-anchor="middle" fill="${color.text}" font-family="Arial, sans-serif" font-size="16" opacity="0.9">
      by ${displayAuthor}
    </text>
    
    <!-- Book icon -->
    <rect x="130" y="320" width="40" height="50" fill="none" stroke="${color.accent}" stroke-width="2" rx="3"/>
    <line x1="135" y1="330" x2="165" y2="330" stroke="${color.accent}" stroke-width="1"/>
    <line x1="135" y1="340" x2="165" y2="340" stroke="${color.accent}" stroke-width="1"/>
    <line x1="135" y1="350" x2="165" y2="350" stroke="${color.accent}" stroke-width="1"/>
  </svg>`;
  
  return svg;
}

async function extractBookMetadata(filePath) {
  try {
    console.log(`  📖 Processing: ${path.basename(filePath)}`);
    
    const bookData = fs.readFileSync(filePath);
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(bookData);
    
    // Extract metadata using same logic as BookContext
    const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
    if (!containerXml) {
      throw new Error('No container.xml found');
    }
    
    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXml, 'application/xml');
    const rootfiles = containerDoc.getElementsByTagName('rootfile');
    const opfPath = rootfiles[0]?.getAttribute('full-path') || '';
    
    if (!opfPath) {
      throw new Error('No OPF path found');
    }
    
    const opfContent = await loadedZip.file(opfPath)?.async('text');
    if (!opfContent) {
      throw new Error('No OPF content found');
    }
    
    const opfDoc = parser.parseFromString(opfContent, 'application/xml');
    
    // Extract title and author
    const title = opfDoc.getElementsByTagName('dc:title')[0]?.textContent?.trim() || 'Unknown Title';
    const author = opfDoc.getElementsByTagName('dc:creator')[0]?.textContent?.trim() || 'Unknown Author';
    
    // Extract cover image
    let coverPath = null;
    
    // Method 1: Look for meta tag with name="cover"
    const metaTags = opfDoc.getElementsByTagName('meta');
    let coverItem = null;
    
    for (let i = 0; i < metaTags.length; i++) {
      const meta = metaTags[i];
      if (meta.getAttribute('name') === 'cover') {
        const coverId = meta.getAttribute('content');
        const items = opfDoc.getElementsByTagName('item');
        
        for (let j = 0; j < items.length; j++) {
          const item = items[j];
          if (item.getAttribute('id') === coverId) {
            coverItem = item;
            break;
          }
        }
        break;
      }
    }
    
    // Method 2: Look for item with properties="cover-image"
    if (!coverItem) {
      const items = opfDoc.getElementsByTagName('item');
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.getAttribute('properties') === 'cover-image') {
          coverItem = item;
          break;
        }
      }
    }
    
    // Method 3: Look for common cover file names
    if (!coverItem) {
      const items = opfDoc.getElementsByTagName('item');
      const coverNames = ['cover.jpg', 'cover.jpeg', 'cover.png', 'Cover.jpg', 'Cover.jpeg', 'Cover.png'];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const href = item.getAttribute('href');
        if (href && coverNames.some(name => href.includes(name))) {
          coverItem = item;
          break;
        }
      }
    }
    
    if (coverItem) {
      const href = coverItem.getAttribute('href');
      if (href) {
        const coverFile = loadedZip.file(href);
        if (coverFile) {
          const coverBlob = await coverFile.async('blob');
          if (coverBlob && coverBlob.size > 0) {
            // Determine file extension
            const mediaType = coverItem.getAttribute('media-type') || '';
            let ext = '.jpg';
            if (mediaType.includes('png')) ext = '.png';
            else if (mediaType.includes('gif')) ext = '.gif';
            else if (href.toLowerCase().includes('.png')) ext = '.png';
            else if (href.toLowerCase().includes('.gif')) ext = '.gif';
            
            // Save cover to public folder
            const coverFileName = `${path.basename(filePath, '.epub')}${ext}`;
            const coverFilePath = path.join(COVERS_OUTPUT_DIR, coverFileName);
            
            const arrayBuffer = await coverBlob.arrayBuffer();
            fs.writeFileSync(coverFilePath, Buffer.from(arrayBuffer));
            
            coverPath = `/sample-book-covers/${coverFileName}`;
            console.log(`    ✅ Cover extracted: ${coverFileName}`);
          }
        }
      }
    }
    
    // Generate text cover if no image cover found
    if (!coverPath) {
      const svgCover = generateTextCover(title, author, path.basename(filePath));
      const coverFileName = `${path.basename(filePath, '.epub')}.svg`;
      const coverFilePath = path.join(COVERS_OUTPUT_DIR, coverFileName);
      
      fs.writeFileSync(coverFilePath, svgCover);
      coverPath = `/sample-book-covers/${coverFileName}`;
      console.log(`    🎨 Generated text cover: ${coverFileName}`);
    }
    
    return { 
      title, 
      author, 
      coverPath,
      fileSize: fs.statSync(filePath).size
    };
    
  } catch (error) {
    console.error(`    ❌ Error processing ${path.basename(filePath)}:`, error.message);
    
    // Generate fallback cover even for failed books
    const title = path.basename(filePath, '.epub');
    const author = 'Unknown Author';
    const svgCover = generateTextCover(title, author, path.basename(filePath));
    const coverFileName = `${path.basename(filePath, '.epub')}.svg`;
    const coverFilePath = path.join(COVERS_OUTPUT_DIR, coverFileName);
    
    fs.writeFileSync(coverFilePath, svgCover);
    
    return {
      title,
      author,
      coverPath: `/sample-book-covers/${coverFileName}`,
      fileSize: fs.statSync(filePath).size
    };
  }
}

async function preprocessAllBooks() {
  console.log('🚀 Starting book preprocessing...\n');
  
  // Create covers directory
  if (!fs.existsSync(COVERS_OUTPUT_DIR)) {
    fs.mkdirSync(COVERS_OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created directory: ${COVERS_OUTPUT_DIR}`);
  }
  
  // Get all EPUB files
  if (!fs.existsSync(SAMPLE_BOOKS_DIR)) {
    console.error(`❌ Sample books directory not found: ${SAMPLE_BOOKS_DIR}`);
    process.exit(1);
  }
  
  const bookFiles = fs.readdirSync(SAMPLE_BOOKS_DIR)
    .filter(f => f.endsWith('.epub'))
    .sort(); // Sort alphabetically
  
  console.log(`📚 Found ${bookFiles.length} EPUB files\n`);
  
  const processedBooks = [];
  
  for (const bookFile of bookFiles) {
    const filePath = path.join(SAMPLE_BOOKS_DIR, bookFile);
    const metadata = await extractBookMetadata(filePath);
    
    processedBooks.push({
      filename: bookFile,
      title: metadata.title,
      author: metadata.author,
      coverPath: metadata.coverPath,
      fileSize: metadata.fileSize
    });
  }
  
  // Save to JSON file
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(processedBooks, null, 2));
  
  console.log(`\n✅ Successfully preprocessed ${processedBooks.length} books!`);
  console.log(`📄 Output file: ${OUTPUT_FILE}`);
  console.log(`🖼️  Covers saved to: ${COVERS_OUTPUT_DIR}`);
  
  // Display summary
  console.log('\n📊 Summary:');
  processedBooks.forEach(book => {
    const sizeKB = Math.round(book.fileSize / 1024);
    const coverStatus = book.coverPath ? '✅' : '❌';
    const coverType = book.coverPath?.endsWith('.svg') ? '🎨' : '📷';
    console.log(`  ${coverStatus}${coverType} ${book.title} by ${book.author} (${sizeKB}KB)`);
  });
}

// Run the preprocessing
preprocessAllBooks().catch(error => {
  console.error('❌ Preprocessing failed:', error);
  process.exit(1);
}); 