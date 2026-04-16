#!/usr/bin/env node

/**
 * Quick Test Script for FAQ System
 * 
 * This script tests the FAQ generation functions without needing
 * to connect to Strapi or build the full project.
 */

// Test data
const testArticle = {
  title: "Test Article with FAQs",
  excerpt: "This is a test article to demonstrate the FAQ system",
  author: { username: "Test Author" },
  publishedAt: "2024-01-01T00:00:00.000Z",
  topic: { name: "Technology", slug: "technology" },
  content: "This is the main content of the article...",
  faqs: [
    {
      question: "What is this article about?",
      answer: "This article demonstrates the FAQ system implementation."
    },
    {
      question: "How do I add FAQs to my blog posts?",
      answer: "You can add FAQs in Strapi using the JSON field we created."
    },
    {
      question: "What are the SEO benefits?",
      answer: "FAQs help with structured data, rich snippets, and better search visibility."
    }
  ]
};

// Test the FAQ generation function
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
    <link rel="canonical" href="https://yoread.com/topics/${article.topic.slug}/${article.slug}">
    
    ${faqSchema}
    
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
      .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      nav { margin-bottom: 20px; }
      nav a { color: #007bff; text-decoration: none; }
      nav a:hover { text-decoration: underline; }
      h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
      .content { line-height: 1.6; margin: 20px 0; }
      .faq-section {
        margin-top: 3rem;
        padding: 2rem;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e9ecef;
      }
      .faq-section h2 {
        color: #333;
        margin-bottom: 1.5rem;
        font-size: 1.5rem;
        text-align: center;
      }
      .faq-item {
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: white;
        border-radius: 6px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        border-left: 4px solid #007bff;
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
      .test-info {
        background: #e7f3ff;
        border: 1px solid #b3d9ff;
        border-radius: 6px;
        padding: 15px;
        margin-bottom: 20px;
      }
      .test-info h3 {
        margin-top: 0;
        color: #0056b3;
      }
    </style>
</head>
<body>
    <div class="container">
        <div class="test-info">
            <h3>🧪 FAQ System Test Page</h3>
            <p>This is a test page to demonstrate the FAQ system. The content below shows how FAQs will appear in your generated static pages.</p>
        </div>
        
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
                ${article.content}
            </div>
            
            ${faqSection}
        </article>
    </div>
</body>
</html>`;
}

// Generate and save test HTML
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  try {
    console.log('🧪 Testing FAQ System...');
    
    // Create test output directory
    const testDir = path.join(__dirname, '../test-output');
    await fs.mkdir(testDir, { recursive: true });
    
    // Generate test HTML
    const testHTML = generateArticleHTML(testArticle);
    
    // Save test file
    const outputPath = path.join(testDir, 'faq-test.html');
    await fs.writeFile(outputPath, testHTML);
    
    console.log('✅ FAQ test completed successfully!');
    console.log(`📁 Test file saved to: ${outputPath}`);
    console.log(`🌐 Open this file in your browser to see the FAQ system in action`);
    console.log(`📱 The page is responsive and includes Schema.org markup for SEO`);
    
    // Also save the Schema.org data for inspection
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": testArticle.faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
    
    const schemaPath = path.join(testDir, 'faq-schema.json');
    await fs.writeFile(schemaPath, JSON.stringify(schemaData, null, 2));
    console.log(`📊 Schema.org data saved to: ${schemaPath}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTest();
