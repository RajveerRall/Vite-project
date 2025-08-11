// scripts/generate-book-manifest.mjs
import fs from 'fs';
import path from 'path';

// The folder where your sample books are located
const booksDirectory = path.join(process.cwd(), 'public', 'sample-books');

// The location where we will save the generated JSON manifest
const manifestPath = path.join(process.cwd(), 'src', 'lib', 'sampleBookManifest.json');

try {
  // Read all filenames from the sample-books directory
  const bookFilenames = fs.readdirSync(booksDirectory)
    // Filter to ensure we only include .epub files
    .filter(file => file.endsWith('.epub'));

  // Write the array of filenames to a JSON file
  fs.writeFileSync(manifestPath, JSON.stringify(bookFilenames, null, 2));

  console.log(`✅ Successfully generated book manifest with ${bookFilenames.length} books.`);

} catch (error) {
  console.error('❌ Error generating book manifest:', error);
  // Create an empty manifest on error so the app doesn't break
  fs.writeFileSync(manifestPath, JSON.stringify([], null, 2));
}