import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { DOMParser } from 'xmldom';

const SAMPLE_BOOKS_DIR = './public/sample-books';
const COVERS_OUTPUT_DIR = './public/sample-book-covers';
const WEBP_COVERS_DIR = './public/sample-book-covers-webp';
const OUTPUT_FILE = './src/lib/preprocessedBooks.json';

// Utility functions from BookContext (pathUtils)
function getDirectoryPath(fullPath) {
  const pathParts = fullPath.split('/');
  return pathParts.slice(0, -1).join('/');
}

function resolveRelativePath(basePath, relativePath) {
  if (relativePath.startsWith('/')) return relativePath;
  const baseSegments = basePath.split('/').filter(Boolean);
  const relativeSegments = relativePath.split('/').filter(Boolean);
  
  for (const segment of relativeSegments) {
    if (segment === '..') {
      baseSegments.pop();
    } else if (segment !== '.') {
      baseSegments.push(segment);
    }
  }
  
  return baseSegments.join('/');
}

// Function to generate a text-based cover image as SVG (fallback)
function generateTextCover(title, author, filename) {
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
  
  const colorIndex = filename.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const color = colors[colorIndex];
  
  const maxTitleLength = 35;
  const displayTitle = title.length > maxTitleLength ? title.substring(0, maxTitleLength) + '...' : title;
  
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

// Enhanced cover extraction using BookContext logic
async function extractCoverFromEpub(loadedZip, opfPath, opfDoc, filename) {
  try {
    console.log(`    🔍 Extracting cover using BookContext method...`);
    
    // Method 1: Look for meta tag with name="cover" (from BookContext)
    const metaCover = Array.from(opfDoc.getElementsByTagName('meta')).find(m => m.getAttribute('name') === 'cover');
    
    if (metaCover) {
      console.log(`    📋 Found meta cover tag`);
      const coverId = metaCover.getAttribute('content');
      const coverItem = Array.from(opfDoc.getElementsByTagName('item')).find(item => item.getAttribute('id') === coverId);
      
      if (coverItem) {
        const href = coverItem.getAttribute('href');
        if (href) {
          console.log(`    📂 Cover href: ${href}`);
          const coverPath = resolveRelativePath(getDirectoryPath(opfPath), href);
          console.log(`    📍 Resolved cover path: ${coverPath}`);
          
          const coverFile = loadedZip.file(coverPath);
          if (coverFile) {
            const coverBlob = await coverFile.async('blob');
            if (coverBlob && coverBlob.size > 0) {
              // Determine file extension from media-type or href
              const mediaType = coverItem.getAttribute('media-type') || '';
              let ext = '.jpg';
              if (mediaType.includes('png')) ext = '.png';
              else if (mediaType.includes('gif')) ext = '.gif';
              else if (href.toLowerCase().includes('.png')) ext = '.png';
              else if (href.toLowerCase().includes('.gif')) ext = '.gif';
              
              // Save cover to public folder
              const coverFileName = `${path.basename(filename, '.epub')}${ext}`;
              const coverFilePath = path.join(COVERS_OUTPUT_DIR, coverFileName);
              
              const arrayBuffer = await coverBlob.arrayBuffer();
              fs.writeFileSync(coverFilePath, Buffer.from(arrayBuffer));
              
              console.log(`    ✅ Extracted cover: ${coverFileName} (${Math.round(coverBlob.size / 1024)}KB)`);
              return `/sample-book-covers/${coverFileName}`;
            }
          }
        }
      }
    }
    
    // Method 2: Look for items with properties="cover-image" (EPUB3)
    console.log(`    🔍 Trying method 2: properties="cover-image"`);
    const items = opfDoc.getElementsByTagName('item');
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.getAttribute('properties') === 'cover-image') {
        const href = item.getAttribute('href');
        if (href) {
          console.log(`    📂 Cover-image href: ${href}`);
          const coverPath = resolveRelativePath(getDirectoryPath(opfPath), href);
          const coverFile = loadedZip.file(coverPath);
          if (coverFile) {
            const coverBlob = await coverFile.async('blob');
            if (coverBlob && coverBlob.size > 0) {
              const mediaType = item.getAttribute('media-type') || '';
              let ext = '.jpg';
              if (mediaType.includes('png')) ext = '.png';
              else if (mediaType.includes('gif')) ext = '.gif';
              else if (href.toLowerCase().includes('.png')) ext = '.png';
              else if (href.toLowerCase().includes('.gif')) ext = '.gif';
              
              const coverFileName = `${path.basename(filename, '.epub')}${ext}`;
              const coverFilePath = path.join(COVERS_OUTPUT_DIR, coverFileName);
              
              const arrayBuffer = await coverBlob.arrayBuffer();
              fs.writeFileSync(coverFilePath, Buffer.from(arrayBuffer));
              
              console.log(`    ✅ Extracted cover via properties: ${coverFileName} (${Math.round(coverBlob.size / 1024)}KB)`);
              return `/sample-book-covers/${coverFileName}`;
            }
          }
        }
      }
    }
    
    // Method 3: Look for common cover file names
    console.log(`    🔍 Trying method 3: common cover names`);
    const coverNames = ['cover.jpg', 'cover.jpeg', 'cover.png', 'Cover.jpg', 'Cover.jpeg', 'Cover.png', 'titlepage.jpg', 'titlepage.png'];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const href = item.getAttribute('href');
      if (href && coverNames.some(name => href.includes(name))) {
        console.log(`    📂 Found common cover name: ${href}`);
        const coverPath = resolveRelativePath(getDirectoryPath(opfPath), href);
        const coverFile = loadedZip.file(coverPath);
        if (coverFile) {
          const coverBlob = await coverFile.async('blob');
          if (coverBlob && coverBlob.size > 0) {
            const mediaType = item.getAttribute('media-type') || '';
            let ext = '.jpg';
            if (mediaType.includes('png')) ext = '.png';
            else if (mediaType.includes('gif')) ext = '.gif';
            else if (href.toLowerCase().includes('.png')) ext = '.png';
            else if (href.toLowerCase().includes('.gif')) ext = '.gif';
            
            const coverFileName = `${path.basename(filename, '.epub')}${ext}`;
            const coverFilePath = path.join(COVERS_OUTPUT_DIR, coverFileName);
            
            const arrayBuffer = await coverBlob.arrayBuffer();
            fs.writeFileSync(coverFilePath, Buffer.from(arrayBuffer));
            
            console.log(`    ✅ Extracted cover via common name: ${coverFileName} (${Math.round(coverBlob.size / 1024)}KB)`);
            return `/sample-book-covers/${coverFileName}`;
          }
        }
      }
    }
    
    // Method 4: Search zip files directly for cover patterns
    console.log(`    🔍 Trying method 4: direct zip search`);
    const zipFiles = Object.keys(loadedZip.files);
    const coverPatterns = [/cover\.(jpg|jpeg|png|gif)$/i, /titlepage\.(jpg|jpeg|png|gif)$/i, /front\.(jpg|jpeg|png|gif)$/i];
    
    for (const pattern of coverPatterns) {
      const coverFile = zipFiles.find(file => pattern.test(file));
      if (coverFile) {
        console.log(`    📂 Found cover by pattern: ${coverFile}`);
        const zipFileObj = loadedZip.file(coverFile);
        if (zipFileObj) {
          const coverBlob = await zipFileObj.async('blob');
          if (coverBlob && coverBlob.size > 0) {
            const ext = '.' + (coverFile.split('.').pop() || 'jpg');
            const coverFileName = `${path.basename(filename, '.epub')}${ext}`;
            const coverFilePath = path.join(COVERS_OUTPUT_DIR, coverFileName);
            
            const arrayBuffer = await coverBlob.arrayBuffer();
            fs.writeFileSync(coverFilePath, Buffer.from(arrayBuffer));
            
            console.log(`    ✅ Extracted cover via pattern: ${coverFileName} (${Math.round(coverBlob.size / 1024)}KB)`);
            return `/sample-book-covers/${coverFileName}`;
          }
        }
      }
    }
    
    console.log(`    ⚠️  No embedded cover found, will generate text cover`);
    return null;
    
  } catch (error) {
    console.error(`    ❌ Error during cover extraction:`, error.message);
    return null;
  }
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
    
    // Use BookContext's robust cover extraction logic
    let coverPath = await extractCoverFromEpub(loadedZip, opfPath, opfDoc, path.basename(filePath));
    
    // Generate text cover if no image cover found
    if (!coverPath) {
      const svgCover = generateTextCover(title, author, path.basename(filePath));
      const coverFileName = `${path.basename(filePath, '.epub')}.svg`;
      const coverFilePath = path.join(COVERS_OUTPUT_DIR, coverFileName);
      
      fs.writeFileSync(coverFilePath, svgCover);
      // For SVG covers, we don't convert to WebP, so use original path
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
      // For SVG covers, we don't convert to WebP, so use original path
      coverPath: `/sample-book-covers/${coverFileName}`,
      fileSize: fs.statSync(filePath).size
    };
  }
}

// WebP conversion function with multiple sizes for responsive images
async function convertCoversToWebP() {
  console.log('\n🔄 Converting covers to WebP with multiple sizes for responsive loading...');
  
  try {
    // Create WebP covers directory
    if (!fs.existsSync(WEBP_COVERS_DIR)) {
      fs.mkdirSync(WEBP_COVERS_DIR, { recursive: true });
      console.log(`📁 Created WebP directory: ${WEBP_COVERS_DIR}`);
    }
    
    // Get all cover files
    const coverFiles = fs.readdirSync(COVERS_OUTPUT_DIR)
      .filter(file => ['.jpg', '.jpeg', '.png'].includes(path.extname(file).toLowerCase()));
    
    if (coverFiles.length === 0) {
      console.log('ℹ️  No JPG or PNG covers found to convert.');
      return;
    }
    
    // Define responsive image sizes (in pixels)
    const responsiveSizes = [200, 300, 400]; // Small, Medium, Large
    
    console.log(`📸 Converting ${coverFiles.length} covers to WebP with ${responsiveSizes.length} sizes...\n`);
    
    let totalOriginalSize = 0;
    let totalWebPSize = 0;
    let successCount = 0;
    
    // Import sharp for WebP conversion
    const sharp = await import('sharp');
    
    // Convert each cover to multiple sizes
    for (const file of coverFiles) {
      const inputPath = path.join(COVERS_OUTPUT_DIR, file);
      const baseName = path.parse(file).name;
      
      try {
        // Read the image file
        const inputBuffer = fs.readFileSync(inputPath);
        const inputStats = fs.statSync(inputPath);
        totalOriginalSize += inputStats.size;
        
        let fileSuccessCount = 0;
        let fileTotalWebPSize = 0;
        
        // Generate multiple sizes
        for (const size of responsiveSizes) {
          const outputFileName = `${baseName}-${size}w.webp`;
          const outputPath = path.join(WEBP_COVERS_DIR, outputFileName);
          
          try {
            // Resize and convert to WebP
            const outputBuffer = await sharp.default(inputBuffer)
              .resize(size, Math.round(size * 1.5)) // Maintain aspect ratio (2:3 for book covers)
              .webp({ 
                quality: 85, 
                effort: 6,
                nearLossless: false,
                smartSubsample: true
              })
              .toBuffer();
            
            // Write WebP file
            fs.writeFileSync(outputPath, outputBuffer);
            
            const outputStats = fs.statSync(outputPath);
            fileTotalWebPSize += outputStats.size;
            fileSuccessCount++;
            
            console.log(`   📏 ${size}w: ${(outputStats.size / 1024).toFixed(1)}KB`);
          } catch (error) {
            console.error(`   ❌ Failed to create ${size}w version:`, error.message);
          }
        }
        
        if (fileSuccessCount > 0) {
          const savings = ((inputStats.size - fileTotalWebPSize) / inputStats.size * 100).toFixed(1);
          console.log(`✅ ${path.basename(file)} → ${fileSuccessCount} sizes`);
          console.log(`   📊 Original: ${(inputStats.size / 1024).toFixed(1)}KB, Total WebP: ${(fileTotalWebPSize / 1024).toFixed(1)}KB (${savings}% smaller)`);
          totalWebPSize += fileTotalWebPSize;
          successCount++;
        }
        
      } catch (error) {
        console.error(`❌ Failed to convert ${path.basename(file)}:`, error.message);
      }
    }
    
    if (successCount > 0) {
      const totalSavings = ((totalOriginalSize - totalWebPSize) / totalOriginalSize * 100).toFixed(1);
      console.log(`\n📊 Responsive WebP Conversion Summary:`);
      console.log(`   ✅ Successfully converted: ${successCount}/${coverFiles.length} covers`);
      console.log(`   📁 WebP directory: ${WEBP_COVERS_DIR}`);
      console.log(`   📏 Generated sizes: ${responsiveSizes.join('w, ')}w`);
      console.log(`   💾 Total size reduction: ${(totalOriginalSize / 1024).toFixed(1)}KB → ${(totalWebPSize / 1024).toFixed(1)}KB (${totalSavings}% smaller)`);
      console.log(`   🚀 Estimated loading speed improvement: ${totalSavings}% faster`);
      
      console.log('\n💡 Responsive WebP benefits:');
      console.log('   • Multiple sizes for different screen densities');
      console.log('   • Faster loading on mobile devices');
      console.log('   • Better performance on high-DPI displays');
      console.log('   • Reduced bandwidth usage');
    }
    
  } catch (error) {
    console.error('❌ WebP conversion failed:', error.message);
  }
}

async function preprocessAllBooks() {
  console.log('🚀 Starting enhanced book preprocessing (using BookContext logic)...\n');
  
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
  
  // Convert covers to WebP for better performance FIRST
  await convertCoversToWebP();
  
  // Now update cover paths to use responsive WebP images when available
  console.log('\n🔄 Updating cover paths to use responsive WebP images...');
  for (const book of processedBooks) {
    if (book.coverPath && !book.coverPath.endsWith('.svg')) {
      // Extract the filename from the current path
      const currentFileName = book.coverPath.split('/').pop();
      if (currentFileName) {
        const baseName = path.parse(currentFileName).name;
        // Use medium size (300w) as default
        const responsiveWebpPath = `/sample-book-covers-webp/${baseName}-300w.webp`;
        const webpPath = path.join(WEBP_COVERS_DIR, `${baseName}-300w.webp`);
        if (fs.existsSync(webpPath)) {
          book.coverPath = responsiveWebpPath;
          console.log(`  ✅ Updated ${book.title}: ${currentFileName} → ${baseName}-300w.webp`);
        }
      }
    }
  }
  
  // Save to JSON file (AFTER WebP conversion and path updates)
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(processedBooks, null, 2));
  
  console.log(`\n✅ Successfully preprocessed ${processedBooks.length} books using BookContext logic!`);
  console.log(`📄 Output file: ${OUTPUT_FILE}`);
  console.log(`🖼️  Covers saved to: ${COVERS_OUTPUT_DIR}`);
  console.log(`🚀 WebP covers saved to: ${WEBP_COVERS_DIR}`);
  
  // Display summary
  console.log('\n📊 Summary:');
  processedBooks.forEach(book => {
    const sizeKB = Math.round(book.fileSize / 1024);
    const coverStatus = book.coverPath ? '✅' : '❌';
    const coverType = book.coverPath?.endsWith('.svg') ? '🎨' : 
                     book.coverPath?.includes('webp') ? '🚀' : '📷';
    console.log(`  ${coverStatus}${coverType} ${book.title} by ${book.author} (${sizeKB}KB)`);
  });
  
  console.log('\n🎯 Key improvements:');
  console.log('  • Used BookContext cover extraction logic');
  console.log('  • 4 different cover detection methods');
  console.log('  • Robust path resolution');
  console.log('  • Fallback text covers for missing images');
  console.log('  • WebP optimization for faster loading');
  
  console.log('\n🎉 Preprocessing complete! Your app is now optimized with:');
  console.log('  • Fast initial page load (lazy loading)');
  console.log('  • Optimized bundle splitting');
  console.log('  • WebP-ready cover images');
}

// Run the preprocessing
preprocessAllBooks().catch(error => {
  console.error('❌ Preprocessing failed:', error);
  process.exit(1);
}); 