import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Directories
const SOURCE_DIR = join(__dirname, '..', 'public', 'sample-book-covers');
const OUTPUT_DIR = join(__dirname, '..', 'public', 'assets');
const OUTPUT_FILE = join(OUTPUT_DIR, 'book-collage-sprite.webp');

// Grid configuration
const COLS = 6;
const ROWS = 3;
const COVER_WIDTH = 200;  // Width of each book cover in the sprite
const COVER_HEIGHT = 300; // Height (aspect ratio 2:3)
const GAP = 8; // Gap between images

// Calculate total dimensions
const SPRITE_WIDTH = (COLS * COVER_WIDTH) + ((COLS - 1) * GAP);
const SPRITE_HEIGHT = (ROWS * COVER_HEIGHT) + ((ROWS - 1) * GAP);

async function createBookCollageSprite() {
  console.log('🎨 Creating book collage sprite sheet...');
  console.log(`📁 Source: ${SOURCE_DIR}`);
  console.log(`💾 Output: ${OUTPUT_FILE}\n`);

  try {
    // Read all WebP files
    const files = await readdir(SOURCE_DIR);
    const webpFiles = files.filter(file => file.endsWith('.webp')).sort();

    if (webpFiles.length === 0) {
      console.error('❌ No WebP images found in sample-book-covers!');
      process.exit(1);
    }

    console.log(`📚 Found ${webpFiles.length} book covers`);

    // Limit to 18 books (6x3 grid)
    const booksToUse = webpFiles.slice(0, 18);

    // Create base canvas
    const canvas = sharp({
      create: {
        width: SPRITE_WIDTH,
        height: SPRITE_HEIGHT,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      }
    });

    // Prepare composite operations
    const compositeOps = [];

    for (let i = 0; i < booksToUse.length; i++) {
      const row = Math.floor(i / COLS);
      const col = i % COLS;
      const x = col * (COVER_WIDTH + GAP);
      const y = row * (COVER_HEIGHT + GAP);

      const inputPath = join(SOURCE_DIR, booksToUse[i]);

      // Resize and add to composite
      const resizedBuffer = await sharp(inputPath)
        .resize(COVER_WIDTH, COVER_HEIGHT, {
          fit: 'cover',
          position: 'center'
        })
        .toBuffer();

      compositeOps.push({
        input: resizedBuffer,
        top: y,
        left: x
      });

      console.log(`  ✓ ${booksToUse[i]} → Position (${col}, ${row})`);
    }

    // Composite all images and save
    await canvas
      .composite(compositeOps)
      .webp({ quality: 85, effort: 6 })
      .toFile(OUTPUT_FILE);

    console.log(`\n✨ Sprite sheet created successfully!`);
    console.log(`   Dimensions: ${SPRITE_WIDTH}x${SPRITE_HEIGHT}px`);
    console.log(`   Grid: ${COLS}x${ROWS}`);
    console.log(`   File: ${OUTPUT_FILE}`);

  } catch (error) {
    console.error('❌ Error creating sprite sheet:', error.message);
    process.exit(1);
  }
}

// Run the generator
createBookCollageSprite();

