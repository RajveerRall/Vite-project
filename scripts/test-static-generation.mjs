#!/usr/bin/env node

/**
 * Test script for static page generation
 * This script helps verify that the static generation is working correctly
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testStaticGeneration() {
  try {
    console.log('🧪 Testing static page generation...');
    
    // Check if dist directory exists
    const distPath = path.join(__dirname, '../dist');
    try {
      await fs.access(distPath);
      console.log('✅ Dist directory exists');
    } catch {
      console.log('❌ Dist directory does not exist. Run build first.');
      return;
    }
    
    // Check for topics directory
    const topicsPath = path.join(distPath, 'topics');
    try {
      await fs.access(topicsPath);
      console.log('✅ Topics directory exists');
      
      // List generated files
      const topicsFiles = await fs.readdir(topicsPath);
      console.log(`📁 Found ${topicsFiles.length} items in topics directory:`);
      
      for (const item of topicsFiles) {
        const itemPath = path.join(topicsPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          const subItems = await fs.readdir(itemPath);
          console.log(`  📂 ${item}/ (${subItems.length} items)`);
          
          // Check for index.html in topic directories
          if (subItems.includes('index.html')) {
            console.log(`    ✅ ${item}/index.html exists`);
          }
          
          // Check for article subdirectories
          for (const subItem of subItems) {
            if (subItem !== 'index.html') {
              const subItemPath = path.join(itemPath, subItem);
              const subStats = await fs.stat(subItemPath);
              
              if (subStats.isDirectory()) {
                const articleFiles = await fs.readdir(subItemPath);
                if (articleFiles.includes('index.html')) {
                  console.log(`    ✅ ${item}/${subItem}/index.html exists`);
                }
              }
            }
          }
        } else if (item === 'index.html') {
          console.log(`  📄 ${item} (topics list page)`);
        }
      }
      
    } catch (error) {
      console.log('❌ Topics directory not found. Static generation may have failed.');
      console.error('Error:', error.message);
    }
    
    // Check for sitemap
    const sitemapPath = path.join(distPath, 'sitemap-topics.xml');
    try {
      await fs.access(sitemapPath);
      console.log('✅ Sitemap exists');
      
      // Check sitemap content
      const sitemapContent = await fs.readFile(sitemapPath, 'utf-8');
      const urlCount = (sitemapContent.match(/<url>/g) || []).length;
      console.log(`🗺️ Sitemap contains ${urlCount} URLs`);
      
    } catch {
      console.log('❌ Sitemap not found');
    }
    
    console.log('\n🎯 Static generation test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testStaticGeneration();
