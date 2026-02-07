import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string[];
  author?: string;
  publishedAt?: string;
  updatedAt?: string;
  image?: string;
  url?: string;
  type?: 'article' | 'website' | 'blog';
  section?: string;
  tags?: string[];
  readingTime?: number;
  wordCount?: number;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords = [],
  author,
  publishedAt,
  updatedAt,
  image,
  url,
  type = 'website',
  section,
  tags = [],
  readingTime,
  wordCount,
}) => {
  // Clean and truncate description for meta tags
  const cleanDescription = description
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 160); // Truncate to 160 characters for meta description

  // Generate keywords string
  const keywordsString = keywords.length > 0 ? keywords.join(', ') : '';

  // Generate structured data for articles
  const generateStructuredData = () => {
    if (type === 'article') {
      return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description: cleanDescription,
        image: image,
        author: {
          '@type': 'Person',
          name: author,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Vite Reader',
          logo: {
            '@type': 'ImageObject',
            url: '/assets/yologo.png',
          },
        },
        datePublished: publishedAt,
        dateModified: updatedAt || publishedAt,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': url,
        },
        articleSection: section,
        keywords: keywordsString,
        ...(readingTime && { timeRequired: `PT${readingTime}M` }),
        ...(wordCount && { wordCount }),
      };
    }
    return null;
  };

  const structuredData = generateStructuredData();

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={cleanDescription} />
      <meta name="keywords" content={keywordsString} />
      <meta name="author" content={author} />
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />

      {/* Canonical URL */}
      {url && <link rel="canonical" href={url} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={cleanDescription} />
      <meta property="og:url" content={url} />
      {image && <meta property="og:image" content={image} />}
      {image && <meta property="og:image:width" content="1200" />}
      {image && <meta property="og:image:height" content="630" />}
      <meta property="og:site_name" content="Vite Reader" />
      {author && <meta property="og:author" content={author} />}
      {publishedAt && <meta property="article:published_time" content={publishedAt} />}
      {updatedAt && <meta property="article:modified_time" content={updatedAt} />}
      {section && <meta property="article:section" content={section} />}
      {tags.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={cleanDescription} />
      {image && <meta name="twitter:image" content={image} />}

      {/* Additional SEO Meta Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />

      {/* Article-specific meta tags */}
      {type === 'article' && (
        <>
          {publishedAt && <meta name="article:published_time" content={publishedAt} />}
          {updatedAt && <meta name="article:modified_time" content={updatedAt} />}
          {section && <meta name="article:section" content={section} />}
          {tags.map((tag, index) => (
            <meta key={index} name="article:tag" content={tag} />
          ))}
        </>
      )}

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}

      {/* Additional structured data for blog */}
      {type === 'article' && (
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: title,
            description: cleanDescription,
            author: {
              '@type': 'Person',
              name: author,
            },
            datePublished: publishedAt,
            dateModified: updatedAt || publishedAt,
            publisher: {
              '@type': 'Organization',
              name: 'Vite Reader',
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': url,
            },
            ...(readingTime && { timeRequired: `PT${readingTime}M` }),
            ...(wordCount && { wordCount }),
          })}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
