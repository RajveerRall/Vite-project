// Utility functions for blog SEO optimization

/**
 * Calculate reading time for a blog post
 * @param content - The blog post content
 * @param wordsPerMinute - Average reading speed (default: 200)
 * @returns Reading time in minutes
 */
export const calculateReadingTime = (content: string, wordsPerMinute: number = 200): number => {
  if (!content) return 0;
  
  // Remove HTML tags and count words
  const cleanContent = content.replace(/<[^>]*>/g, '');
  const wordCount = cleanContent.trim().split(/\s+/).length;
  
  return Math.ceil(wordCount / wordsPerMinute);
};

/**
 * Count words in blog post content
 * @param content - The blog post content
 * @returns Word count
 */
export const calculateWordCount = (content: string): number => {
  if (!content) return 0;
  
  const cleanContent = content.replace(/<[^>]*>/g, '');
  return cleanContent.trim().split(/\s+/).length;
};

/**
 * Extract keywords from blog post content
 * @param content - The blog post content
 * @param maxKeywords - Maximum number of keywords to extract (default: 10)
 * @returns Array of keywords
 */
export const extractKeywords = (content: string, maxKeywords: number = 10): string[] => {
  if (!content) return [];
  
  // Remove HTML tags and convert to lowercase
  const cleanContent = content.replace(/<[^>]*>/g, '').toLowerCase();
  
  // Common stop words to exclude
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
    'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs', 'am', 'is', 'are', 'was',
    'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'shall', 'ought', 'need', 'dare', 'used'
  ]);
  
  // Extract words and filter out stop words and short words
  const words = cleanContent
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  // Count word frequency
  const wordFrequency: { [key: string]: number } = {};
  words.forEach(word => {
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  });
  
  // Sort by frequency and return top keywords
  return Object.entries(wordFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxKeywords)
    .map(([word]) => word);
};

/**
 * Generate a meta description from blog post content
 * @param content - The blog post content
 * @param maxLength - Maximum length of description (default: 160)
 * @returns Meta description
 */
export const generateMetaDescription = (content: string, maxLength: number = 160): string => {
  if (!content) return '';
  
  // Remove HTML tags and get first paragraph
  const cleanContent = content.replace(/<[^>]*>/g, '');
  const firstParagraph = cleanContent.split('\n\n')[0] || cleanContent;
  
  // Truncate to max length and add ellipsis if needed
  if (firstParagraph.length <= maxLength) {
    return firstParagraph.trim();
  }
  
  // Find the last complete word within the limit
  const truncated = firstParagraph.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  if (lastSpaceIndex > 0) {
    return truncated.substring(0, lastSpaceIndex).trim() + '...';
  }
  
  return truncated.trim() + '...';
};

/**
 * Generate Open Graph image URL for social sharing
 * @param title - Blog post title
 * @param author - Blog post author
 * @returns Open Graph image URL
 */
export const generateOGImageUrl = (title: string, author: string): string => {
  // You can use a service like Cloudinary, or create a custom OG image generator
  // For now, return a placeholder or your default blog image
  return '/blog-og-image.jpg'; // Update with your actual OG image URL
};

/**
 * Generate canonical URL for blog post
 * @param slug - Blog post slug
 * @param baseUrl - Base URL of your site
 * @returns Canonical URL
 */
export const generateCanonicalUrl = (slug: string, baseUrl: string = 'https://yoread.com'): string => {
  return `${baseUrl}/blog/${slug}`;
};

/**
 * Extract tags from blog post content or metadata
 * @param content - Blog post content
 * @param existingTags - Existing tags from metadata
 * @returns Array of tags
 */
export const extractTags = (content: string, existingTags: string[] = []): string[] => {
  const contentTags = extractKeywords(content, 5);
  const allTags = [...new Set([...existingTags, ...contentTags])];
  
  return allTags.slice(0, 8); // Limit to 8 tags max
};
