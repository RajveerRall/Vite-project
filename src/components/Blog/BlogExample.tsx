import React from 'react';
import BlogLayout from './BlogLayout';

const BlogExample: React.FC = () => {
  // Sample blog content with headings for TOC
  const sampleContent = `
    <h2>What is Static Site Generation?</h2>
    <p>Static Site Generation (SSG) is revolutionizing how we build and deploy websites. In this comprehensive guide, we'll explore everything you need to know about SSG.</p>
    
    <h2>Benefits of SSG</h2>
    <p>There are several key advantages to using Static Site Generation:</p>
    <ul>
      <li>Faster page loads</li>
      <li>Better SEO performance</li>
      <li>Improved security</li>
      <li>Lower hosting costs</li>
    </ul>
    
    <h2>How to Implement SSG</h2>
    <p>Implementing Static Site Generation involves several steps:</p>
    
    <h3>Step 1: Choose Your Framework</h3>
    <p>Popular SSG frameworks include Next.js, Gatsby, and Nuxt.js. Each has its own strengths and use cases.</p>
    
    <h3>Step 2: Set Up Your Build Process</h3>
    <p>Configure your build process to generate static files during the build phase.</p>
    
    <h3>Step 3: Deploy to CDN</h3>
    <p>Deploy your generated static files to a Content Delivery Network for optimal performance.</p>
    
    <h2>Best Practices</h2>
    <p>Follow these best practices to get the most out of your SSG implementation:</p>
    
    <h3>Optimize Images</h3>
    <p>Use modern image formats like WebP and implement lazy loading for better performance.</p>
    
    <h3>Implement Caching</h3>
    <p>Set up proper caching headers to improve user experience and reduce server load.</p>
    
    <h3>Monitor Performance</h3>
    <p>Use tools like Lighthouse and WebPageTest to monitor and improve your site's performance.</p>
    
    <h2>Conclusion</h2>
    <p>Static Site Generation offers significant benefits for many types of websites. By following the practices outlined in this guide, you can create fast, secure, and SEO-friendly websites.</p>
  `;

  return (
            <BlogLayout
          content={`<h1>Getting Started with Static Site Generation</h1>${sampleContent}`}
          ctaVariant="ebook"
          ctaTitle="Turn Your Ebooks Into Audiobooks"
          ctaDescription="Listen to your favorite books anywhere, anytime. Transform any ebook into an immersive audio experience with our advanced text-to-speech technology."
          ctaButtonText="Start Listening Now"
          ctaButtonLink="/"
        >
          {/* Hidden H1 for TOC */}
          <h1 className="sr-only">Getting Started with Static Site Generation</h1>
                    <div dangerouslySetInnerHTML={{ __html: sampleContent }} />
    </BlogLayout>
  );
};

export default BlogExample;
