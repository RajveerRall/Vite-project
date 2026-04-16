#!/usr/bin/env node

/**
 * Strapi Webhook Handler for Static Site Generation
 * 
 * This script is called by Strapi webhooks when content changes
 * to trigger static page regeneration.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function handleWebhook() {
  try {
    console.log('🔄 Strapi webhook triggered - regenerating static pages...');
    
    // Regenerate static pages
    await execAsync('npm run generate-static');
    
    // Optionally rebuild the main app
    // await execAsync('npm run build');
    
    console.log('✅ Static pages regenerated successfully!');
  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    process.exit(1);
  }
}

// Handle command line arguments
const action = process.argv[2];

if (action === 'regenerate') {
  handleWebhook();
} else {
  console.log('Usage: node scripts/strapi-webhook.mjs regenerate');
  process.exit(1);
}
