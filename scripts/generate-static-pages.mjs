#!/usr/bin/env node

/**
 * Static Site Generation Script for Topics and Articles
 * 
 * This script fetches all content from Strapi and generates static HTML files
 * for better SEO performance.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
import { readFileSync } from 'fs';
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env');
try {
  const envFile = readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  console.warn('⚠️ Could not load .env file:', error.message);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const STRAPI_API_URL = process.env.VITE_STRAPI_API_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.VITE_STRAPI_API_TOKEN;
const OUTPUT_DIR = path.join(__dirname, '../dist');

// Debug: Show loaded environment variables
console.log('🔍 Environment variables loaded:');
console.log('VITE_STRAPI_API_URL:', STRAPI_API_URL);
console.log('VITE_STRAPI_API_TOKEN:', STRAPI_API_TOKEN ? `${STRAPI_API_TOKEN.substring(0, 20)}...` : 'NOT FOUND');

if (!STRAPI_API_TOKEN) {
  console.error('❌ VITE_STRAPI_API_TOKEN environment variable is required');
  console.error('💡 Make sure your .env file contains: VITE_STRAPI_API_TOKEN=your_token_here');
  process.exit(1);
}

// Fetch data from Strapi
async function fetchFromStrapi(query, variables = {}) {
  console.log('🔍 Making request to:', `${STRAPI_API_URL}/graphql`);
  console.log('🔍 Query:', query.substring(0, 100) + '...');
  
  const response = await fetch(`${STRAPI_API_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  console.log('🔍 Response status:', response.status);
  console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Strapi API error response:', errorText);
    throw new Error(`Strapi API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    console.error('❌ GraphQL errors:', data.errors);
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

// Generate HTML for a topic list page
function generateTopicListHTML(topics) {
  const topicsList = topics.map(topic => `
    <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
      <h2 class="text-xl font-semibold text-gray-900 mb-2">
        <a href="/topics/${topic.slug}" class="text-blue-600 hover:text-blue-800 transition-colors">
          ${topic.name}
        </a>
      </h2>
      ${topic.description ? `<p class="text-gray-600 mb-3">${topic.description}</p>` : ''}
      <p class="text-sm text-gray-500">Articles: ${topic.articles?.length || 0}</p>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Topics - Vite Reader | Explore Articles by Topic</title>
    <meta name="description" content="Discover articles organized by topics. Explore our collection of insights, stories, and knowledge across various subjects.">
    <meta name="keywords" content="topics, articles, blog, knowledge, insights, learning">
    <link rel="canonical" href="https://yoread.com/topics">
    <meta property="og:title" content="Topics - Vite Reader | Explore Articles by Topic">
    <meta property="og:description" content="Discover articles organized by topics. Explore our collection of insights, stories, and knowledge across various subjects.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://yoread.com/topics">
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 py-8 max-w-6xl">
        <header class="text-center mb-12">
            <h1 class="text-4xl font-bold text-gray-900 mb-4">Topics</h1>
            <p class="text-xl text-gray-600 max-w-2xl mx-auto">
                Explore our articles organized by topics. Find the content that matters most to you.
            </p>
        </header>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${topicsList}
        </div>
        
        <footer class="mt-16 text-center text-gray-500">
            <p>&copy; 2024 Vite Reader. All rights reserved.</p>
        </footer>
    </div>
</body>
</html>`;
}

// Generate HTML for a topic page
function generateTopicHTML(topic) {
  const articlesList = topic.articles?.map(article => `
    <article class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
      <h3 class="text-lg font-semibold text-gray-900 mb-2">
        <a href="/topics/${topic.slug}/${article.slug}" class="text-blue-600 hover:text-blue-800 transition-colors">
          ${article.title}
        </a>
      </h3>
      ${article.excerpt ? `<p class="text-gray-600 mb-3">${article.excerpt}</p>` : ''}
      <div class="flex items-center justify-between text-sm text-gray-500">
        <span>By: ${article.author?.username || article.author || 'Unknown Author'}</span>
        <span>${new Date(article.publishedAt).toLocaleDateString()}</span>
      </div>
    </article>
  `).join('') || '<p class="text-gray-500 text-center py-8">No articles in this topic yet.</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${topic.name} - Vite Reader | Articles and Insights</title>
    <meta name="description" content="${topic.description || `Explore articles about ${topic.name}. Discover insights, stories, and knowledge on this topic.`}">
    <meta name="keywords" content="${topic.name.toLowerCase()}, articles, blog, insights, knowledge">
    <link rel="canonical" href="https://yoread.com/topics/${topic.slug}">
    <meta property="og:title" content="${topic.name} - Vite Reader | Articles and Insights">
    <meta property="og:description" content="${topic.description || `Explore articles about ${topic.name}. Discover insights, stories, and knowledge on this topic.`}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://yoread.com/topics/${topic.slug}">
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
        <nav class="mb-8">
            <a href="/topics" class="text-blue-600 hover:text-blue-800 transition-colors">
                ← Back to Topics
            </a>
        </nav>
        
        <header class="text-center mb-12">
            <h1 class="text-4xl font-bold text-gray-900 mb-4">${topic.name}</h1>
            ${topic.description ? `<p class="text-xl text-gray-600 max-w-2xl mx-auto">${topic.description}</p>` : ''}
        </header>
        
        <div class="space-y-6">
            ${articlesList}
        </div>
        
        <footer class="mt-16 text-center text-gray-500">
            <p>&copy; 2024 Vite Reader. All rights reserved.</p>
        </footer>
    </div>
</body>
</html>`;
}

// Generate HTML for an individual article
function generateArticleHTML(article) {
  const readingTime = Math.ceil((article.content?.length || 0) / 200); // Rough estimate: 200 chars per minute
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title} - Vite Reader</title>
    <meta name="description" content="${article.excerpt || article.title}">
    <meta name="keywords" content="${article.title.toLowerCase()}, article, blog, insights">
    <link rel="canonical" href="https://yoread.com/topics/${article.topic?.slug}/${article.slug}">
    <meta property="og:title" content="${article.title} - Vite Reader">
    <meta property="og:description" content="${article.excerpt || article.title}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://yoread.com/topics/${article.topic?.slug}/${article.slug}">
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
        <nav class="mb-8 text-sm">
            <a href="/topics" class="text-blue-600 hover:text-blue-800 transition-colors">Topics</a>
            <span class="mx-2 text-gray-400">→</span>
            <a href="/topics/${article.topic?.slug}" class="text-blue-600 hover:text-blue-800 transition-colors">
                ${article.topic?.name || 'Unknown Topic'}
            </a>
            <span class="mx-2 text-gray-400">→</span>
            <span class="text-gray-600">${article.title}</span>
        </nav>
        
        <article class="bg-white rounded-lg shadow-md p-8">
            <header class="mb-8">
                <h1 class="text-4xl font-bold text-gray-900 mb-4">${article.title}</h1>
                <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>By: ${article.author?.username || article.author || 'Unknown Author'}</span>
                    <span>${new Date(article.publishedAt).toLocaleDateString()}</span>
                </div>
                <div class="flex items-center space-x-4 text-sm text-gray-500">
                    <span>📖 ${readingTime} min read</span>
                    <span>📝 ${article.content?.length || 0} characters</span>
                </div>
            </header>
            
            <div class="prose prose-lg max-w-none">
                ${article.content || '<p>Content not available.</p>'}
            </div>
        </article>
        
        <footer class="mt-16 text-center text-gray-500">
            <p>&copy; 2024 Vite Reader. All rights reserved.</p>
        </footer>
    </div>
</body>
</html>`;
}

// Generate sitemap
function generateSitemap(topics, articles) {
  const topicsUrls = topics.map(topic => `
    <url>
        <loc>https://yoread.com/topics/${topic.slug}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
  `).join('');

  const articlesUrls = articles.map(article => `
    <url>
        <loc>https://yoread.com/topics/${article.topic?.slug}/${article.slug}</loc>
        <lastmod>${new Date(article.publishedAt).toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.9</priority>
    </url>
  `).join('');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://yoread.com/topics</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    ${topicsUrls}
    ${articlesUrls}
</urlset>`;

  return sitemap;
}

// Main generation function
async function generateStaticPages() {
  try {
    console.log('🚀 Starting static page generation...');
    
    // Create output directories
    await fs.mkdir(path.join(OUTPUT_DIR, 'topics'), { recursive: true });
    
    // Fetch all data from Strapi
    console.log('📡 Fetching data from Strapi...');
    
    const topicsData = await fetchFromStrapi(`
      query GetTopics {
        topics {
          documentId
          name
          slug
          description
          articles {
            documentId
            title
            slug
            excerpt
            author {
              documentId
              username
              email
            }
            publishedAt
          }
        }
      }
    `);
    
    const articlesData = await fetchFromStrapi(`
      query GetAllArticles {
        articles {
          documentId
          title
          slug
          content
          excerpt
          author {
            documentId
            username
            email
          }
          publishedAt
          topic {
            documentId
            name
            slug
            description
          }
        }
      }
    `);
    
    const topics = topicsData.topics || [];
    const articles = articlesData.articles || [];
    
    console.log(`📚 Found ${topics.length} topics and ${articles.length} articles`);
    
    // Generate topics list page
    console.log('📝 Generating topics list page...');
    const topicsListHTML = generateTopicListHTML(topics);
    await fs.writeFile(path.join(OUTPUT_DIR, 'topics', 'index.html'), topicsListHTML);
    
    // Generate individual topic pages
    for (const topic of topics) {
      console.log(`📝 Generating topic page: ${topic.name}`);
      const topicHTML = generateTopicHTML(topic);
      await fs.mkdir(path.join(OUTPUT_DIR, 'topics', topic.slug), { recursive: true });
      await fs.writeFile(path.join(OUTPUT_DIR, 'topics', topic.slug, 'index.html'), topicHTML);
    }
    
    // Generate individual article pages
    for (const article of articles) {
      if (article.topic?.slug) {
        console.log(`📝 Generating article page: ${article.title}`);
        const articleHTML = generateArticleHTML(article);
        await fs.mkdir(path.join(OUTPUT_DIR, 'topics', article.topic.slug, article.slug), { recursive: true });
        await fs.writeFile(path.join(OUTPUT_DIR, 'topics', article.topic.slug, article.slug, 'index.html'), articleHTML);
      }
    }
    
    // Generate sitemap
    console.log('🗺️ Generating sitemap...');
    const sitemap = generateSitemap(topics, articles);
    await fs.writeFile(path.join(OUTPUT_DIR, 'sitemap-topics.xml'), sitemap);
    
    console.log('✅ Static page generation completed successfully!');
    console.log(`📁 Generated ${topics.length + 1} topic pages`);
    console.log(`📁 Generated ${articles.length} article pages`);
    console.log(`🗺️ Generated sitemap-topics.xml`);
    console.log(`📂 Output directory: ${OUTPUT_DIR}`);
    
  } catch (error) {
    console.error('❌ Error generating static pages:', error);
    process.exit(1);
  }
}

// Run the script
generateStaticPages();
