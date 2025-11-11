#!/usr/bin/env node

/**
 * Strapi Topics Setup Script
 * 
 * This script provides guidance for setting up the Strapi backend
 * with the required content types for the topic-based blog structure.
 * 
 * Run this script to get step-by-step instructions.
 */

import chalk from 'chalk';
import { execSync } from 'child_process';

console.log(chalk.blue.bold('\n🚀 Strapi Topics Setup Guide\n'));

console.log(chalk.yellow('This script will guide you through setting up your Strapi backend for the topic-based blog structure.\n'));

// Check if we're in a Strapi project
try {
  const packageJson = JSON.parse(execSync('cat package.json', { encoding: 'utf8' }));
  const isStrapiProject = packageJson.dependencies && packageJson.dependencies['@strapi/strapi'];
  
  if (!isStrapiProject) {
    console.log(chalk.red('❌ This doesn\'t appear to be a Strapi project.'));
    console.log(chalk.yellow('Please run this script from your Strapi backend directory.\n'));
    process.exit(1);
  }
} catch (error) {
  console.log(chalk.red('❌ Could not read package.json. Make sure you\'re in the correct directory.\n'));
  process.exit(1);
}

console.log(chalk.green('✅ Strapi project detected!\n'));

console.log(chalk.blue.bold('📋 Step-by-Step Setup Instructions:\n'));

console.log(chalk.cyan('1. Create Topic Content Type:'));
console.log('   - Go to Content-Type Builder in Strapi Admin');
console.log('   - Click "Create new collection type"');
console.log('   - Name: "Topic"');
console.log('   - Add fields:');
console.log('     • name (Text, required)');
console.log('     • slug (UID, attached to name)');
console.log('     • description (Text, optional)');
console.log('   - Save and publish\n');

console.log(chalk.cyan('2. Create Article Content Type:'));
console.log('   - Click "Create new collection type"');
console.log('   - Name: "Article"');
console.log('   - Add fields:');
console.log('     • title (Text, required)');
console.log('     • slug (UID, attached to title)');
console.log('     • content (Rich Text, required)');
console.log('     • excerpt (Text, optional)');
console.log('     • author (Text, required)');
console.log('     • publishedAt (DateTime, required)');
console.log('     • topic (Relation, many-to-one with Topic)');
console.log('   - Save and publish\n');

console.log(chalk.cyan('3. Set up Relationships:'));
console.log('   - In Article content type, click on the topic relation field');
console.log('   - Set relation type: "Article belongs to one Topic"');
console.log('   - Save\n');

console.log(chalk.cyan('4. Generate Custom API:'));
console.log(chalk.yellow('   Run this command in your terminal:'));
console.log(chalk.green('   yarn strapi generate:api custom-article'));
console.log(chalk.green('   # or npm run strapi generate:api custom-article\n'));

console.log(chalk.cyan('5. Configure Custom Route:'));
console.log('   - Edit: src/api/custom-article/routes/custom-article.js');
console.log('   - Replace content with the route configuration from STRAPI_INTEGRATION.md\n');

console.log(chalk.cyan('6. Configure Custom Controller:'));
console.log('   - Edit: src/api/custom-article/controllers/custom-article.js');
console.log('   - Replace content with the controller implementation from STRAPI_INTEGRATION.md\n');

console.log(chalk.cyan('7. Set Permissions:'));
console.log('   - Go to Settings → Roles → Public');
console.log('   - Find "Custom-article"');
console.log('   - Check "findOne" permission');
console.log('   - Save\n');

console.log(chalk.cyan('8. Create Sample Content:'));
console.log('   - Create a few topics (e.g., "Technology", "Reading Tips")');
console.log('   - Create articles and assign them to topics');
console.log('   - Test the GraphQL queries in the GraphQL playground\n');

console.log(chalk.blue.bold('\n🔧 Quick Setup Commands:\n'));

console.log(chalk.yellow('Generate the custom API:'));
console.log(chalk.green('yarn strapi generate:api custom-article\n'));

console.log(chalk.yellow('Start Strapi in development mode:'));
console.log(chalk.green('yarn develop\n'));

console.log(chalk.yellow('Build for production:'));
console.log(chalk.green('yarn build\n'));

console.log(chalk.blue.bold('\n📚 Additional Resources:\n'));
console.log('• STRAPI_INTEGRATION.md - Complete implementation guide');
console.log('• Strapi Documentation: https://docs.strapi.io/');
console.log('• GraphQL Playground: http://localhost:1337/graphql (when running)\n');

console.log(chalk.green.bold('🎉 Setup complete! Your Strapi backend is now ready for topic-based blogging.\n'));

console.log(chalk.yellow('Next steps:'));
console.log('1. Test the GraphQL queries in your frontend');
console.log('2. Create some sample topics and articles');
console.log('3. Verify the new URL structure works correctly');
console.log('4. Check that SEO metadata is properly generated\n');

console.log(chalk.blue('For troubleshooting, refer to STRAPI_INTEGRATION.md\n'));
