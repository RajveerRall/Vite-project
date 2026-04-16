// Sitemap generator utility for blog SEO

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

interface BlogPost {
  slug: string;
  publishedAt: string;
  updatedAt?: string;
}

/**
 * Generate XML sitemap for blog posts
 * @param baseUrl - Base URL of your website
 * @param blogPosts - Array of blog posts
 * @returns XML sitemap string
 */
export const generateBlogSitemap = (baseUrl: string, blogPosts: BlogPost[]): string => {
  const urls: SitemapUrl[] = [
    // Static pages
    {
      loc: `${baseUrl}/`,
      changefreq: 'daily',
      priority: 1.0,
    },
    {
      loc: `${baseUrl}/blog`,
      changefreq: 'daily',
      priority: 0.9,
    },
  ];

  // Add blog post URLs
  blogPosts.forEach((post) => {
    urls.push({
      loc: `${baseUrl}/blog/${post.slug}`,
      lastmod: post.updatedAt || post.publishedAt,
      changefreq: 'weekly',
      priority: 0.8,
    });
  });

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `    <lastmod>${url.lastmod}</lastmod>` : ''}
    ${url.changefreq ? `    <changefreq>${url.changefreq}</changefreq>` : ''}
    ${url.priority ? `    <priority>${url.priority}</priority>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>`;

  return xml;
};

/**
 * Generate RSS feed for blog posts
 * @param baseUrl - Base URL of your website
 * @param blogPosts - Array of blog posts with full content
 * @param siteTitle - Site title
 * @param siteDescription - Site description
 * @returns RSS feed string
 */
export const generateRSSFeed = (
  baseUrl: string,
  blogPosts: Array<BlogPost & { title: string; excerpt: string; author: string }>,
  siteTitle: string = 'Vite Reader',
  siteDescription: string = 'Thoughts, insights, and stories worth sharing'
): string => {
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteTitle}</title>
    <link>${baseUrl}</link>
    <description>${siteDescription}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
${blogPosts
  .map(
    (post) => `    <item>
      <title>${post.title}</title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid>${baseUrl}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <description><![CDATA[${post.excerpt}]]></description>
      <author>${post.author}</author>
    </item>`
  )
  .join('\n')}
  </channel>
</rss>`;

  return rss;
};

/**
 * Generate JSON-LD structured data for blog listing
 * @param baseUrl - Base URL of your website
 * @param blogPosts - Array of blog posts
 * @returns JSON-LD string
 */
export const generateBlogListStructuredData = (
  baseUrl: string,
  blogPosts: Array<BlogPost & { title: string; excerpt: string; author: string }>
): string => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Vite Reader Blog',
    description: 'Thoughts, insights, and stories worth sharing',
    url: `${baseUrl}/blog`,
    blogPost: blogPosts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      author: {
        '@type': 'Person',
        name: post.author,
      },
      datePublished: post.publishedAt,
      dateModified: post.updatedAt || post.publishedAt,
      url: `${baseUrl}/blog/${post.slug}`,
    })),
  };

  return JSON.stringify(structuredData);
};
