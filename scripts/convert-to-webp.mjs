#!/usr/bin/env node

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const COVERS_DIR = path.join(__dirname, '../public/sample-book-covers');
const OUTPUT_DIR = path.join(__dirname, '../public/sample-book-covers-webp');

// WebP conversion options
const WEBP_OPTIONS = {
  quality: 85, // Good balance between quality and file size
  effort: 6,   // Higher effort = better compression but slower
  nearLossless: false, // Keep lossy for smaller files
  smartSubsample: true // Better quality for sharp edges
};

async function ensureDirectoryExists(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
}

async function convertImageToWebP(inputPath, outputPath) {
  try {
    const inputBuffer = await fs.readFile(inputPath);
    const outputBuffer = await sharp(inputBuffer)
      .webp(WEBP_OPTIONS)
      .toBuffer();
    
    await fs.writeFile(outputPath, outputBuffer);
    
    const inputStats = await fs.stat(inputPath);
    const outputStats = await fs.stat(outputPath);
    const savings = ((inputStats.size - outputStats.size) / inputStats.size * 100).toFixed(1);
    
    console.log(`✅ ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
    console.log(`   📊 Size: ${(inputStats.size / 1024).toFixed(1)}KB → ${(outputStats.size / 1024).toFixed(1)}KB (${savings}% smaller)`);
    
    return { success: true, savings };
  } catch (error) {
    console.error(`❌ Failed to convert ${path.basename(inputPath)}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔄 Starting WebP conversion...\n');
  
  try {
    // Ensure output directory exists
    await ensureDirectoryExists(OUTPUT_DIR);
    
    // Get all files in covers directory
    const files = await fs.readdir(COVERS_DIR);
    
    // Filter for image files (JPG, PNG)
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png'].includes(ext);
    });
    
    if (imageFiles.length === 0) {
      console.log('ℹ️  No JPG or PNG files found to convert.');
      return;
    }
    
    console.log(`📸 Found ${imageFiles.length} images to convert:\n`);
    
    let totalOriginalSize = 0;
    let totalWebPSize = 0;
    let successCount = 0;
    
    // Convert each image
    for (const file of imageFiles) {
      const inputPath = path.join(COVERS_DIR, file);
      const outputPath = path.join(OUTPUT_DIR, `${path.parse(file).name}.webp`);
      
      const result = await convertImageToWebP(inputPath, outputPath);
      
      if (result.success) {
        successCount++;
        const inputStats = await fs.stat(inputPath);
        const outputStats = await fs.stat(outputPath);
        totalOriginalSize += inputStats.size;
        totalWebPSize += outputStats.size;
      }
      
      console.log(''); // Empty line for readability
    }
    
    // Summary
    console.log('📊 Conversion Summary:');
    console.log(`   ✅ Successfully converted: ${successCount}/${imageFiles.length} images`);
    console.log(`   📁 Output directory: ${OUTPUT_DIR}`);
    
    if (successCount > 0) {
      const totalSavings = ((totalOriginalSize - totalWebPSize) / totalOriginalSize * 100).toFixed(1);
      console.log(`   💾 Total size reduction: ${(totalOriginalSize / 1024).toFixed(1)}KB → ${(totalWebPSize / 1024).toFixed(1)}KB (${totalSavings}% smaller)`);
      console.log(`   🚀 Estimated loading speed improvement: ${totalSavings}% faster`);
    }
    
    console.log('\n🎉 WebP conversion complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update your book manifest to use .webp files');
    console.log('   2. Test the new WebP covers in your app');
    console.log('   3. Consider adding WebP support to your build process');
    
  } catch (error) {
    console.error('❌ Conversion failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 