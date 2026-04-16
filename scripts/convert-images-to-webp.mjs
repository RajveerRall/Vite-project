import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Directory to convert images in
const SOURCE_DIR = join(__dirname, '..', 'public', 'sample-book-covers');

// Supported image formats
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

// WebP quality (0-100)
const WEBP_QUALITY = 85;

async function convertImagesToWebP() {
  console.log('🔄 Starting image conversion to WebP...');
  console.log(`📁 Source directory: ${SOURCE_DIR}\n`);

  try {
    // Read all files in the directory
    const files = await readdir(SOURCE_DIR);
    
    // Filter for image files
    const imageFiles = files.filter(file => 
      IMAGE_EXTENSIONS.includes(extname(file).toLowerCase())
    );

    if (imageFiles.length === 0) {
      console.log('⚠️  No JPG or PNG images found in the directory.');
      return;
    }

    console.log(`📸 Found ${imageFiles.length} images to convert:\n`);

    let successCount = 0;
    let errorCount = 0;

    // Convert each image
    for (const file of imageFiles) {
      const inputPath = join(SOURCE_DIR, file);
      const outputFilename = basename(file, extname(file)) + '.webp';
      const outputPath = join(SOURCE_DIR, outputFilename);

      try {
        await sharp(inputPath)
          .webp({ quality: WEBP_QUALITY })
          .toFile(outputPath);
        
        console.log(`✅ ${file} → ${outputFilename}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to convert ${file}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n✨ Conversion complete!`);
    console.log(`   Success: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount}`);
    }

  } catch (error) {
    console.error('❌ Error reading directory:', error.message);
    process.exit(1);
  }
}

// Run the conversion
convertImagesToWebP();

