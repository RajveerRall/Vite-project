// Centralized SEO configuration for optimal blog ranking

export const SEO_CONFIG = {
  // Site information
  site: {
    name: 'Vite Reader',
    title: 'Vite Reader - Digital Reading & Blog Platform',
    description: 'Discover a world of digital reading and insightful blog content. Explore books, articles, and stories in a modern, reader-friendly platform.',
    url: 'https://yoread.com', // Updated with actual domain
    logo: '/assets/yologo.webp', // Updated with actual logo path
    favicon: '/assets/yologo.webp',
    language: 'en-US',
    author: 'Vite Reader Team',
  },

  // Blog-specific SEO settings
  blog: {
    title: 'Blog - Vite Reader',
    description: 'Thoughts, insights, and stories worth sharing. Dive into our collection of articles and discover something new.',
    keywords: [
      'blog',
      'articles',
      'insights',
      'stories',
      'reading',
      'literature',
      'technology',
      'digital reading',
      'ebooks',
      'content'
    ],
    section: 'Blog',
    defaultImage: '/blog-og-image.jpg', // Update with your default blog image
  },

  // Social media settings
  social: {
    twitter: {
      handle: '@vitereader', // Update with your Twitter handle
      cardType: 'summary_large_image',
    },
    facebook: {
      appId: '', // Add your Facebook app ID if you have one
    },
    linkedin: {
      company: 'vite-reader', // Update with your LinkedIn company page
    },
  },

  // SEO optimization settings
  optimization: {
    // Meta description length (Google recommends 150-160 characters)
    maxDescriptionLength: 160,
    
    // Title length (Google displays 50-60 characters)
    maxTitleLength: 60,
    
    // Keywords limit
    maxKeywords: 10,
    
    // Tags limit
    maxTags: 8,
    
    // Reading time calculation
    wordsPerMinute: 200,
    
    // Image optimization
    ogImageWidth: 1200,
    ogImageHeight: 630,
    
    // Canonical URL settings
    canonicalBaseUrl: 'https://yoread.com', // Updated with actual domain
  },

  // Content optimization
  content: {
    // Minimum content length for good SEO
    minWordCount: 300,
    
    // Optimal content length for blog posts
    optimalWordCount: 1500,
    
    // Reading time thresholds
    shortRead: 3, // minutes
    mediumRead: 7, // minutes
    longRead: 15, // minutes
    
    // Content structure recommendations
    recommendedHeadings: ['h1', 'h2', 'h3', 'h4'],
    recommendedParagraphs: 3, // minimum paragraphs per section
  },

  // Technical SEO
  technical: {
    // Robots.txt settings
    robots: {
      allowAll: true,
      crawlDelay: 1,
      sitemapUrl: '/sitemap.xml',
    },
    
    // Sitemap settings
    sitemap: {
      changefreq: {
        homepage: 'daily',
        blog: 'daily',
        blogPosts: 'weekly',
        static: 'monthly',
      },
      priority: {
        homepage: 1.0,
        blog: 0.9,
        blogPosts: 0.8,
        static: 0.6,
      },
    },
    
    // Schema.org markup
    schema: {
      organization: {
        name: 'Vite Reader',
        url: 'https://yoread.com',
        logo: 'https://yoread.com/assets/yologo.webp',
        sameAs: [
          'https://twitter.com/vitereader',
          'https://linkedin.com/company/vite-reader',
        ],
      },
      website: {
        name: 'Vite Reader',
        url: 'https://yoread.com',
        description: 'Digital reading and blog platform',
      },
    },
  },

  // Performance optimization
  performance: {
    // Image optimization
    images: {
      formats: ['webp', 'jpg', 'png'],
      sizes: [200, 400, 800, 1200],
      quality: 85,
    },
    
    // Caching
    cache: {
      static: '1 year',
      blog: '1 day',
      api: '1 hour',
    },
  },
};

// Helper functions for SEO
export const getSEOTitle = (pageTitle: string, includeSiteName: boolean = true): string => {
  const title = includeSiteName ? `${pageTitle} - ${SEO_CONFIG.site.name}` : pageTitle;
  return title.length > SEO_CONFIG.optimization.maxTitleLength
    ? title.substring(0, SEO_CONFIG.optimization.maxTitleLength - 3) + '...'
    : title;
};

export const getSEODescription = (description: string): string => {
  return description.length > SEO_CONFIG.optimization.maxDescriptionLength
    ? description.substring(0, SEO_CONFIG.optimization.maxDescriptionLength - 3) + '...'
    : description;
};

export const getCanonicalUrl = (path: string): string => {
  return `${SEO_CONFIG.optimization.canonicalBaseUrl}${path}`;
};

export const getOGImageUrl = (imagePath?: string): string => {
  if (imagePath) {
    return imagePath.startsWith('http') ? imagePath : `${SEO_CONFIG.optimization.canonicalBaseUrl}${imagePath}`;
  }
  return `${SEO_CONFIG.optimization.canonicalBaseUrl}${SEO_CONFIG.blog.defaultImage}`;
};
