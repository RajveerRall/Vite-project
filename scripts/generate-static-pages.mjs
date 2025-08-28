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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const STRAPI_API_URL = process.env.VITE_STRAPI_API_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.VITE_STRAPI_API_TOKEN;
const OUTPUT_DIR = path.join(__dirname, '../dist/static-pages');

if (!STRAPI_API_TOKEN) {
  console.error('❌ VITE_STRAPI_API_TOKEN environment variable is required');
  process.exit(1);
}

// Fetch data from Strapi
async function fetchFromStrapi(query, variables = {}) {
  const response = await fetch(`${STRAPI_API_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Strapi API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

// Generate HTML for a topic list page
function generateTopicListHTML(topics) {
  const topicsList = topics.map(topic => `
    <div class="topic-card">
      <h2><a href="/topics/${topic.slug}">${topic.name}</a></h2>
      ${topic.description ? `<p>${topic.description}</p>` : ''}
      <p>Articles: ${topic.articles?.length || 0}</p>
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
</head>
<body>
    <div class="container">
        <h1>Topics</h1>
        <p>Explore our articles organized by topics. Find the content that matters most to you.</p>
        
        <div class="topics-grid">
            ${topicsList}
        </div>
    </div>
</body>
</html>`;
}

// Generate HTML for a topic page
function generateTopicHTML(topic) {
  const articlesList = topic.articles?.map(article => `
    <article class="article-card">
      <h3><a href="/topics/${topic.slug}/${article.slug}">${article.title}</a></h3>
      ${article.excerpt ? `<p>${article.excerpt}</p>` : ''}
      <p>By: ${article.author?.username || article.author || 'Unknown Author'}</p>
      <p>Published: ${new Date(article.publishedAt).toLocaleDateString()}</p>
    </article>
  `).join('') || '<p>No articles in this topic yet.</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${topic.name} - Vite Reader Topics</title>
    <meta name="description" content="${topic.description || `Explore articles about ${topic.name}. Discover insights, stories, and knowledge on this topic.`}">
    <meta name="keywords" content="${topic.name.toLowerCase()}, articles, blog, knowledge, insights">
    <link rel="canonical" href="https://yoread.com/topics/${topic.slug}">
    <meta property="og:title" content="${topic.name} - Vite Reader Topics">
    <meta property="og:description" content="${topic.description || `Explore articles about ${topic.name}. Discover insights, stories, and knowledge on this topic.`}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://yoread.com/topics/${topic.slug}">
</head>
<body>
    <div class="container">
        <nav>
            <a href="/topics">← Back to Topics</a>
        </nav>
        
        <h1>${topic.name}</h1>
        ${topic.description ? `<p>${topic.description}</p>` : ''}
        <p>Articles: ${topic.articles?.length || 0}</p>
        
        <div class="articles-grid">
            ${articlesList}
        </div>
    </div>
</body>
</html>`;
}

// Generate HTML for an article page
function generateArticleHTML(article) {
  // Generate FAQ section if available
  let faqSection = '';
  let faqSchema = '';
  
  if (article.faqs && Array.isArray(article.faqs) && article.faqs.length > 0) {
    const faqItems = article.faqs.map(faq => `
      <div class="faq-item">
        <h3 class="faq-question">${faq.question}</h3>
        <div class="faq-answer">${faq.answer}</div>
      </div>
    `).join('');
    
    // Generate Schema.org FAQ markup
    const faqSchemaData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": article.faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
    
    faqSchema = `<script type="application/ld+json">${JSON.stringify(faqSchemaData)}</script>`;
    
    faqSection = `
      <section class="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div class="faq-container">
          ${faqItems}
        </div>
      </section>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title} - ${article.topic.name} | Vite Reader</title>
    <meta name="description" content="${article.excerpt || 'Read this article on Vite Reader'}">
    <meta name="keywords" content="${article.topic.name.toLowerCase()}, article, blog, ${article.title.toLowerCase()}">
    <link rel="canonical" href="https://yoread.com/topics/${article.topic.slug}/${article.slug}">
    <meta property="og:title" content="${article.title} - ${article.topic.name} | Vite Reader">
    <meta property="og:description" content="${article.excerpt || 'Read this article on Vite Reader'}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://yoread.com/topics/${article.topic.slug}/${article.slug}">
    <meta property="article:section" content="${article.topic.name}">
    <meta property="article:published_time" content="${article.publishedAt}">
    <meta property="article:author" content="${article.author?.username || article.author || 'Unknown Author'}">
    
    ${faqSchema}
    
    <style>
      .faq-section {
        margin-top: 3rem;
        padding: 2rem;
        background: #f8f9fa;
        border-radius: 8px;
      }
      .faq-section h2 {
        color: #333;
        margin-bottom: 1.5rem;
        font-size: 1.5rem;
      }
      .faq-item {
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: white;
        border-radius: 6px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .faq-question {
        color: #2c3e50;
        margin-bottom: 0.5rem;
        font-size: 1.1rem;
        font-weight: 600;
      }
      .faq-answer {
        color: #555;
        line-height: 1.6;
      }
    </style>
</head>
<body>
    <div class="container">
        <nav>
            <a href="/topics">Topics</a> / 
            <a href="/topics/${article.topic.slug}">${article.topic.name}</a>
        </nav>
        
        <article>
            <header>
                <h1>${article.title}</h1>
                <p>By: ${article.author?.username || article.author || 'Unknown Author'}</p>
                <p>Published: ${new Date(article.publishedAt).toLocaleDateString()}</p>
                <p>Topic: <a href="/topics/${article.topic.slug}">${article.topic.name}</a></p>
            </header>
            
            <div class="content">
                ${article.content || article.excerpt || 'Content not available'}
            </div>
            
            ${faqSection}
        </article>
    </div>
</body>
</html>`;
}

// Generate sitemap
function generateSitemap(topics, articles) {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://yoread.com/topics</loc>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>
    
    ${topics.map(topic => `
    <url>
        <loc>https://yoread.com/topics/${topic.slug}</loc>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>
    `).join('')}
    
    ${articles.map(article => `
    <url>
        <loc>https://yoread.com/topics/${article.topic.slug}/${article.slug}</loc>
        <lastmod>${new Date(article.publishedAt).toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
    </url>
    `).join('')}
</urlset>`;

  return sitemap;
}

// Main generation function
async function generateStaticPages() {
  try {
    console.log('🚀 Starting static page generation...');
    
    // Create output directory
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
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
            topic {
              documentId
              name
              slug
              description
            }
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
          faqs
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
      
      // Generate article pages for this topic
      if (topic.articles) {
        for (const article of topic.articles) {
          console.log(`📄 Generating article page: ${article.title}`);
          const articleHTML = generateArticleHTML(article);
          await fs.mkdir(path.join(OUTPUT_DIR, 'topics', topic.slug, article.slug), { recursive: true });
          await fs.writeFile(path.join(OUTPUT_DIR, 'topics', topic.slug, article.slug, 'index.html'), articleHTML);
        }
      }
    }
    
    // Generate sitemap
    console.log('🗺️ Generating sitemap...');
    const sitemap = generateSitemap(topics, articles);
    await fs.writeFile(path.join(OUTPUT_DIR, 'sitemap-topics.xml'), sitemap);
    
    console.log('✅ Static page generation completed successfully!');
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
    console.log(`📝 Generated ${topics.length + 1} topic pages`);
    console.log(`📄 Generated ${articles.length} article pages`);
    console.log(`🗺️ Generated sitemap: sitemap-topics.xml`);
    
  } catch (error) {
    console.error('❌ Error generating static pages:', error);
    process.exit(1);
  }
}

// Run the generation
generateStaticPages();
