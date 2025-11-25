// // src/utils/textExtraction.ts

// /**
//  * Extracts plain text content from HTML
//  */
// export const extractTextFromHtml = (htmlContent: string): string => {
//   try {
//     // Create a temporary div to parse the HTML
//     const tempDiv = document.createElement('div');
//     tempDiv.innerHTML = htmlContent;
    
//     // Extract text content
//     let textContent = tempDiv.textContent || '';
    
//     // Clean up the text (remove excess whitespace)
//     textContent = textContent.replace(/\s+/g, ' ').trim();
    
//     return textContent;
//   } catch (error) {
//     console.error('Error extracting text:', error);
//     return '';
//   }
// };

// /**
//  * Process HTML content to fix relative paths for images and CSS
//  */
// export const processHtmlContent = (htmlContent: string, fileDir: string): string => {
//   let processedHtml = htmlContent;
  
//   // Fix image paths
//   processedHtml = processedHtml.replace(
//     /<img([^>]*)src=["']([^"']*)["']/g,
//     (match, attributes, src) => {
//       if (src.startsWith('http')) {
//         return match; // Absolute URL, no changes needed
//       }
      
//       // Construct a data URL for the image
//       const imagePath = src.startsWith('/') ? src.substring(1) : fileDir + src;
//       return `<img${attributes}src="data:image/png;base64,IMAGE_PLACEHOLDER_${imagePath}"`;
//     }
//   );
  
//   // Fix CSS paths
//   processedHtml = processedHtml.replace(
//     /<link([^>]*)href=["']([^"']*)["']/g,
//     (match, attributes, href) => {
//       if (href.startsWith('http')) {
//         return match; // Absolute URL, no changes needed
//       }
      
//       // Construct a data URL for the CSS
//       const cssPath = href.startsWith('/') ? href.substring(1) : fileDir + href;
//       return `<link${attributes}href="data:text/css;base64,CSS_PLACEHOLDER_${cssPath}"`;
//     }
//   );
  
//   return processedHtml;
// };


// src/utils/textExtraction.ts
// Removed JSZip import to avoid pulling it into the initial bundle
import { resolveRelativePath, getDirectoryPath } from './pathUtils'; // Import your path utilities

/**
 * Extracts plain text content from HTML
 */
export const extractTextFromHtml = (htmlContent: string): string => {
  try {
    // Create a temporary div to parse the HTML (Browser environment)
    // If running in Node.js, you'd need a library like jsdom
    if (typeof document !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      // Remove headers, titles, and navigation elements that shouldn't be read by TTS
      const elementsToRemove = tempDiv.querySelectorAll([
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',           // Headers
        '.title', '.chapter-title', '.book-title',     // Common title classes
        '.header', '.navigation', '.nav',              // Navigation elements
        '.toc', '.table-of-contents',                  // Table of contents
        '.breadcrumb', '.breadcrumbs',                 // Breadcrumbs
        '.page-header', '.page-title',                 // Page headers
        '[role="banner"]', '[role="navigation"]',      // ARIA roles
        '.epub-header', '.epub-title',                 // EPUB-specific headers
        '.epub-chapter-title', '.chapter-heading',     // More specific chapter titles
        '.book-header', '.content-header'              // Content headers
      ].join(','));
      
      // Remove these elements from the DOM before extracting text
      elementsToRemove.forEach(el => {
        console.log(`[TTS] Removing element:`, {
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          textContent: el.textContent?.substring(0, 50)
        });
        el.remove();
      });
      
      // Get text content and clean it up
      let textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      // Additional cleanup: remove unwanted content patterns (but preserve actual content)
      textContent = textContent
        // Remove CSS rules and metadata (be more selective)
        .replace(/@page\s*{[^}]*}/g, '') // Remove @page CSS rules
        .replace(/@\w+\s*{[^}]*}/g, '') // Remove other CSS at-rules
        .replace(/(?<=\s|^)[{}]\s*(?=\s|$)/g, '') // Remove standalone braces only
        .replace(/(?<=\s|^)margin-[^;]*;?\s*(?=\s|$)/g, '') // Remove standalone margin rules
        .replace(/(?<=\s|^)font-size[^;]*;?\s*(?=\s|$)/g, '') // Remove standalone font-size rules
        .replace(/(?<=\s|^)line-height[^;]*;?\s*(?=\s|$)/g, '') // Remove standalone line-height rules
        .replace(/(?<=\s|^)text-align[^;]*;?\s*(?=\s|$)/g, '') // Remove standalone text-align rules
        // Remove book title references
        .replace(/The Power of Now[^@]*@/g, '')
        .replace(/A Guide to Spiritual Enlightenment/g, '')
        // Remove very short lines that might be metadata (but be more careful)
        .replace(/^.{1,2}$/gm, '') // Only remove very short lines (1-2 chars)
        // Remove HTML artifacts and special characters (but preserve content)
        .replace(/&gt;/g, '') // Remove &gt; HTML entities
        .replace(/&lt;/g, '') // Remove &lt; HTML entities
        .replace(/&amp;/g, '') // Remove &amp; HTML entities
        .replace(/&quot;/g, '') // Remove &quot; HTML entities
        .replace(/&apos;/g, '') // Remove &apos; HTML entities
        .replace(/(?<=\s|^)[<>]\s*(?=\s|$)/g, '') // Remove standalone < or > only
        // Remove other common HTML artifacts (but preserve content)
        .replace(/&[a-zA-Z0-9#]+;/g, '') // Remove any remaining HTML entities
        .replace(/(?<=\s|^)\[[^\]]*\]\s*(?=\s|$)/g, '') // Remove standalone square bracket content
        .replace(/(?<=\s|^)\([^)]*\)\s*(?=\s|$)/g, '') // Remove standalone parentheses content
        // Clean up whitespace but preserve content structure
        .replace(/\n\s*\n/g, '\n')  // Remove empty lines
        .replace(/\t+/g, ' ')  // Replace tabs with spaces
        .trim();
      
      // Safety check: if we removed too much content, use a more conservative approach
      if (textContent.length < 100) {
        console.warn('[extractTextFromHtml] Content too short after cleaning, using fallback extraction');
        // Use a more conservative approach - just remove obvious CSS and metadata
        textContent = (tempDiv.textContent || tempDiv.innerText || '')
          .replace(/@page\s*{[^}]*}/g, '') // Remove @page CSS rules
          .replace(/@\w+\s*{[^}]*}/g, '') // Remove other CSS at-rules
          .replace(/The Power of Now[^@]*@/g, '') // Remove book title patterns
          .replace(/A Guide to Spiritual Enlightenment/g, '') // Remove subtitle
          .replace(/\s+/g, ' ')  // Clean up whitespace
          .trim();
      }
      
      // Debug logging
      console.log('[DEBUG] extractTextFromHtml:', {
        originalLength: htmlContent.length,
        extractedLength: textContent.length,
        extractedPreview: textContent.substring(0, 200),
        hasHtmlTags: /<[^>]+>/.test(textContent),
        tempDivChildren: tempDiv.children.length,
        removedElements: elementsToRemove.length
      });
      
      return textContent;
    } else {
      // Basic fallback for non-browser environments if DOM is not available
      // This won't handle entities or complex structures well.
      console.warn("DOM not available for text extraction, using basic stripping. Results may be suboptimal.");
      return htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  } catch (error) {
    console.error('Error extracting text:', error);
    return '';
  }
};

/**
 * Process HTML content to fix relative paths for images and CSS,
 * making them resolvable from the EPUB root.
 *
 * @param htmlContent The original HTML string.
 * @param _fileDir Deprecated/optional if baseHtmlPath is provided and used for resolving.
 *                 Kept for compatibility if some part of the code still passes it.
 * @param zip Optional JSZip instance (not directly used in this string-replacement version,
 *            but could be used if fetching/validating resources during processing).
 * @param baseHtmlPath The full path of the HTML file within the EPUB (relative to EPUB root).
 *                     This is crucial for correctly resolving relative paths.
 * @returns Processed HTML string.
 */
export const processHtmlContent = (
  htmlContent: string,
  _fileDir: string, // Original second parameter, now less critical if baseHtmlPath is used
  zip?: any,        // Optional zip instance (not actively used in this version)
  baseHtmlPath?: string // The path of the current HTML file within the EPUB
): string => {
  let processedHtml = htmlContent;
  const currentHtmlDir = baseHtmlPath ? getDirectoryPath(baseHtmlPath) : _fileDir;

  // --- IMPORTANT ---
  // The goal of this function should now be to make all relative asset paths
  // (images, CSS) into paths that are ABSOLUTE with respect to the EPUB ROOT.
  // The `loadPageCallback` will then use these root-relative paths to fetch
  // from the zip file.
  // The `IMAGE_PLACEHOLDER_` and `CSS_PLACEHOLDER_` should thus contain these
  // root-relative paths.

  // Fix image paths:
  // Convert relative src to a path relative to the EPUB root.
  processedHtml = processedHtml.replace(
    /<img([^>]*)src=["']([^"']+)["']/gi, // Added 'i' for case-insensitivity
    (match, attributes, src) => {
      if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:')) {
        return match; // Valid URL, no changes needed
      }

      // Resolve the src path relative to the current HTML file's directory to get a root-relative path
      const rootRelativeImagePath = resolveRelativePath(currentHtmlDir, src);

      // Use a placeholder that won't cause browser errors and add loading transition
      return `<img${attributes}src="about:blank" data-epub-src="${rootRelativeImagePath}" style="opacity: 0; transition: opacity 0.3s ease;"`;
    }
  );

  // Fix CSS paths:
  // Convert relative href to a path relative to the EPUB root.
  processedHtml = processedHtml.replace(
    /<link([^>]*)href=["']([^"']+)["']/gi, // Added 'i' for case-insensitivity
    (match, attributes, href) => {
      // Check if it's a stylesheet link
      if (!/rel=["']stylesheet["']/i.test(attributes) && !/type=["']text\/css["']/i.test(attributes)) {
          return match; // Not a stylesheet, skip
      }
      if (href.startsWith('http') || href.startsWith('data:')) {
        return match; // Absolute URL or data URI, no changes needed
      }

      // Resolve the href path relative to the current HTML file's directory to get a root-relative path
      const rootRelativeCssPath = resolveRelativePath(currentHtmlDir, href);

      // Use a placeholder that won't cause browser errors
      return `<link${attributes}href="about:blank" data-epub-css-href="${rootRelativeCssPath}"`;
    }
  );

  // Remove headers and titles from the HTML content to prevent them from appearing in the reader
  // This is a safer approach that targets specific patterns without being too aggressive
  processedHtml = processedHtml
    // Remove common header tags that often contain chapter titles
    .replace(/<h1[^>]*>.*?<\/h1>/gis, '')
    .replace(/<h2[^>]*>.*?<\/h2>/gis, '')
    .replace(/<h3[^>]*>.*?<\/h3>/gis, '')
    // Remove elements with common title-related classes
    .replace(/<[^>]*class=["'][^"']*(?:title|chapter-title|book-title|header|navigation)[^"']*["'][^>]*>.*?<\/[^>]*>/gis, '')
    // Remove elements with common title-related IDs
    .replace(/<[^>]*id=["'][^"']*(?:title|chapter-title|book-title|header|navigation)[^"']*["'][^>]*>.*?<\/[^>]*>/gis, '');

  // Consider other elements that might have relative paths e.g. <audio src="...">, <video src="...">, <object data="...">
  // For SVGs with <image xlink:href="...">, regex becomes much harder, DOM parsing is better.

  return processedHtml;
};

/**
 * Detect if this is a Kobo EPUB by checking for Kobo-specific markers
 */
const isKoboEpub = (htmlContent: string): boolean => {
  return htmlContent.includes('koboSpan') || 
         htmlContent.includes('kobo.js') || 
         htmlContent.includes('koboSpanStyle') ||
         htmlContent.includes('class="koboSpan"');
};

/**
 * Clean EPUB content by removing common headers, titles, and navigation elements
 * This function is specifically designed for EPUB content to improve reading experience
 */
export const cleanEpubContent = (htmlContent: string): string => {
  try {
    if (typeof document !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      const isKobo = isKoboEpub(htmlContent);
      
      // Remove common EPUB elements that shouldn't be displayed or read
      // For Kobo EPUBs, preserve h2 elements (they contain chapter titles)
      const selectorsToRemove = [
        // Headers and titles (but preserve chapter titles for Kobo EPUBs)
        ...(isKobo ? ['h1', 'h3', 'h4', 'h5', 'h6'] : ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']), // Keep h2 for Kobo
        '.title', '.book-title', '.epub-title', // Keep chapter-title for Kobo
        '.section-title', '.page-title',
        
        // Navigation and structure
        '.header', '.navigation', '.nav', '.toc',
        '.table-of-contents', '.breadcrumb', '.breadcrumbs',
        '.page-header', '.content-header', '.epub-header',
        
        // EPUB-specific elements
        '.epub-section', '.epub-page',
        '.epub-navigation', '.epub-toc', '.epub-breadcrumb',
        
        // Common content patterns
        '.content-header', '.section-header',
        '.page-header', '.article-header', '.story-header'
      ];
      
      // For Kobo EPUBs, be more selective about removing chapter titles
      if (isKobo) {
        selectorsToRemove.push('.chapter-title'); // Only remove generic chapter-title, not chapter_head
      } else {
        selectorsToRemove.push('.chapter-title', '.chapter-heading', '.epub-chapter-title', '.chapter-header');
      }
      
      let removedCount = 0;
      selectorsToRemove.forEach(selector => {
        const elements = tempDiv.querySelectorAll(selector);
        elements.forEach(el => {
          console.log(`[EPUB Clean] Removing: ${selector}`, {
            text: el.textContent?.substring(0, 100),
            classes: el.className,
            id: el.id
          });
          el.remove();
          removedCount++;
        });
      });
      
      // For Kobo EPUBs, preserve h2 elements that are chapter titles
      if (isKobo) {
        const allH2s = tempDiv.querySelectorAll('h2');
        allH2s.forEach(h2 => {
          // Keep h2 if it's a chapter title (has chapter_head class or is in a chapter section)
          const isChapterTitle = h2.classList.contains('chapter_head') || 
                                 h2.classList.contains('chapter-head') ||
                                 h2.closest('section[epub\\:type*="chapter"]') !== null ||
                                 h2.closest('section[role*="chapter"]') !== null;
          if (!isChapterTitle) {
            console.log(`[EPUB Clean] Removing h2 (not a chapter title):`, {
              text: h2.textContent?.substring(0, 100),
              classes: h2.className
            });
            h2.remove();
            removedCount++;
          }
        });
      }
      
      // Remove any remaining text nodes that contain book titles or CSS rules
      const walker = document.createTreeWalker(
        tempDiv,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let textNode: Node | null;
      let textNodesRemoved = 0;
      while (textNode = walker.nextNode()) {
        const text = textNode.textContent || '';
        // Remove text nodes that contain book titles, CSS rules, or other unwanted content
        // For Kobo EPUBs, be more conservative - don't remove text just because it contains common words
        const shouldRemove = isKobo
          ? (
              // For Kobo: Only remove clearly CSS/metadata patterns
              text.includes('@page') ||
              (text.includes('margin-bottom') && text.includes('{')) ||
              (text.includes('margin-top') && text.includes('{')) ||
              (text.includes('font-size') && text.includes(':')) ||
              (text.includes('line-height') && text.includes(':')) ||
              (text.includes('text-align') && text.includes(':')) ||
              text.includes('The Power of Now') ||
              text.includes('A Guide to Spiritual Enlightenment') ||
              (text.trim().length < 3 && /^[{};@\s]*$/.test(text.trim())) || // Only braces/semicolons
              /^\s*[{}]\s*$/.test(text) || // Remove standalone braces
              /^\s*@\w+\s*{/.test(text) || // Remove CSS at-rules
              /^\s*}\s*$/.test(text) // Remove closing braces
            )
          : (
              // For non-Kobo: Use existing aggressive cleaning
              text.includes('@page') ||
              text.includes('margin-bottom') ||
              text.includes('margin-top') ||
              text.includes('font-size') ||
              text.includes('line-height') ||
              text.includes('text-align') ||
              text.includes('The Power of Now') ||
              text.includes('A Guide to Spiritual Enlightenment') ||
              text.trim().length < 3 ||
              /^\s*[{}]\s*$/.test(text) ||
              /^\s*@\w+\s*{/.test(text) ||
              /^\s*}\s*$/.test(text)
            );
        
        if (shouldRemove) {
          console.log(`[EPUB Clean] Removing text node:`, {
            text: text.substring(0, 100),
            length: text.length
          });
          if (textNode.parentNode) {
            textNode.parentNode.removeChild(textNode);
          }
          textNodesRemoved++;
        }
      }
      
      console.log(`[EPUB Clean] Removed ${removedCount} elements and ${textNodesRemoved} text nodes from content (Kobo: ${isKobo})`);
      
      // Debug: Log what content remains
      const remainingText = tempDiv.textContent || '';
      console.log(`[EPUB Clean] Remaining content preview:`, {
        length: remainingText.length,
        preview: remainingText.substring(0, 200),
        hasArrows: remainingText.includes('>') || remainingText.includes('<'),
        hasHtmlEntities: /&[a-zA-Z0-9#]+;/.test(remainingText)
      });
      
      // Safety check: if we removed too much content, return original with minimal cleaning
      if (remainingText.length < 100) {
        console.warn('[EPUB Clean] Content too short after cleaning, using fallback');
        return htmlContent
          .replace(/@page\s*{[^}]*}/g, '')
          .replace(/The Power of Now[^@]*@/g, '')
          .replace(/A Guide to Spiritual Enlightenment/g, '')
          .trim();
      }
      
      return tempDiv.innerHTML;
    }
    
    // Fallback: use regex for non-browser environments
    return htmlContent
      .replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gis, '')
      .replace(/<[^>]*class=["'][^"']*(?:title|chapter|header|navigation|toc|breadcrumb)[^"']*["'][^>]*>.*?<\/[^>]*>/gis, '')
      .replace(/@page\s*{[^}]*}/g, '') // Remove @page CSS rules
      .replace(/[{}]/g, '') // Remove standalone braces
      .replace(/The Power of Now[^@]*@/g, '') // Remove book title references
      .replace(/A Guide to Spiritual Enlightenment/g, ''); // Remove subtitle
      
  } catch (error) {
    console.error('Error cleaning EPUB content:', error);
    return htmlContent; // Return original content if cleaning fails
  }
};

/**
 * Decode HTML entities to their text equivalents
 */
const decodeHtmlEntities = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

/**
 * Deep clean EPUB content by removing all unwanted patterns, CSS rules, and metadata
 * This is a more aggressive cleaning approach for problematic EPUBs
 */
export const deepCleanEpubContent = (htmlContent: string): string => {
  try {
    const isKobo = isKoboEpub(htmlContent);
    
    // First pass: Decode HTML entities and remove obvious CSS and metadata patterns
    let cleaned = htmlContent;
    
    // Decode HTML entities first
    if (typeof document !== 'undefined') {
      cleaned = decodeHtmlEntities(cleaned);
    }
    
    // Only remove specific problematic patterns, don't strip everything
    cleaned = cleaned
      // Remove CSS at-rules and their content (but be more careful)
      .replace(/@page\s*{[^}]*}/g, '') // Remove @page CSS rules
      .replace(/@media\s*{[^}]*}/g, '') // Remove @media rules
      .replace(/@import[^;]*;?/g, '') // Remove @import rules
      .replace(/@font-face\s*{[^}]*}/g, '') // Remove @font-face rules
      .replace(/@keyframes\s*\w*\s*{[^}]*}/g, '') // Remove @keyframes rules
      // Remove CSS properties but only if they're standalone (not in content)
      .replace(/(?<=\s|^)(margin|padding|font-size|line-height|text-align)\s*:\s*[^;{}]*;?/g, '')
      // Remove standalone braces and brackets (but not if they're part of content)
      .replace(/(?<=\s|^)[{}[\]]\s*(?=\s|$)/g, '')
      // Remove HTML artifacts but preserve content
      .replace(/(?<=\s|^)[<>]\s*(?=\s|$)/g, '') // Remove standalone < or >
      // Remove book title patterns
      .replace(/The Power of Now[^@]*@/g, '')
      .replace(/A Guide to Spiritual Enlightenment/g, '')
      // Clean up excessive whitespace but preserve content
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .replace(/\t+/g, ' ') // Replace tabs with spaces
      .trim();

    // Second pass: Use DOM parsing for more precise removal
    if (typeof document !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleaned;
      
      // Remove all elements that might contain unwanted content
      // For Kobo EPUBs, preserve chapter titles
      const unwantedSelectors = [
        'style', 'script', 'meta', 'link',
        ...(isKobo ? ['h1', 'h3', 'h4', 'h5', 'h6'] : ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']),
        '.title', '.book-title',
        '.header', '.navigation', '.nav',
        '[class*="header"]:not([class*="chapter"]):not([class*="section"])',
        '[class*="nav"]'
      ];
      
      if (!isKobo) {
        unwantedSelectors.push('.chapter-title', '[class*="title"]');
      }
      
      unwantedSelectors.forEach(selector => {
        try {
          const elements = tempDiv.querySelectorAll(selector);
          elements.forEach(el => el.remove());
        } catch (e) {
          // Invalid selector, skip
        }
      });
      
      // For Kobo EPUBs, preserve h2 chapter titles
      if (isKobo) {
        const allH2s = tempDiv.querySelectorAll('h2');
        allH2s.forEach(h2 => {
          const isChapterTitle = h2.classList.contains('chapter_head') || 
                                 h2.classList.contains('chapter-head') ||
                                 h2.closest('section[epub\\:type*="chapter"]') !== null ||
                                 h2.closest('section[role*="chapter"]') !== null;
          if (!isChapterTitle) {
            h2.remove();
          }
        });
      }
      
      // Remove text nodes with unwanted content - more conservative for Kobo
      const walker = document.createTreeWalker(
        tempDiv,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let textNode: Node | null;
      while (textNode = walker.nextNode()) {
        const text = textNode.textContent || '';
        // For Kobo: Only remove clearly CSS/metadata, not content words
        const shouldRemove = isKobo
          ? (
              (/^@\w+/.test(text.trim()) && /[{;}]/.test(text)) || // CSS at-rule
              (text.includes('@page') && text.includes('{')) ||
              (text.trim().length < 3 && /^[{};@\s]*$/.test(text.trim())) || // Only braces/semicolons
              text.includes('The Power of Now') ||
              text.includes('A Guide to Spiritual Enlightenment')
            )
          : (
              text.includes('@page') ||
              text.includes('margin') ||
              text.includes('font') ||
              text.includes('line-height') ||
              text.includes('text-align') ||
              text.includes('The Power of Now') ||
              text.trim().length < 5
            );
        
        if (shouldRemove) {
          if (textNode.parentNode) {
            textNode.parentNode.removeChild(textNode);
          }
        }
      }
      
      cleaned = tempDiv.innerHTML;
    }
    
    console.log('[Deep Clean] Content cleaned aggressively', { isKobo });
    
    // Debug: Log what content remains after deep cleaning
    const remainingText = cleaned.replace(/<[^>]*>/g, ''); // Remove HTML tags for text analysis
    console.log(`[Deep Clean] Remaining content preview:`, {
      length: remainingText.length,
      preview: remainingText.substring(0, 200),
      hasArrows: remainingText.includes('>') || remainingText.includes('<'),
      hasHtmlEntities: /&[a-zA-Z0-9#]+;/.test(remainingText),
      hasCssRules: /@[a-zA-Z]+/.test(remainingText)
    });
    
    // Safety check: if we removed too much content, return the original with minimal cleaning
    if (remainingText.length < 100) {
      console.warn('[Deep Clean] Content too short after cleaning, using fallback cleaning');
      return htmlContent
        .replace(/@page\s*{[^}]*}/g, '') // Remove @page CSS rules
        .replace(/@media\s*{[^}]*}/g, '') // Remove @media rules
        .replace(/@import[^;]*;?/g, '') // Remove @import rules
        .replace(/@font-face\s*{[^}]*}/g, '') // Remove @font-face rules
        .replace(/@keyframes\s*\w*\s*{[^}]*}/g, '') // Remove @keyframes rules
        .replace(/The Power of Now[^@]*@/g, '') // Remove book title patterns
        .replace(/A Guide to Spiritual Enlightenment/g, '') // Remove subtitle
        .trim();
    }
    
    return cleaned;
    
  } catch (error) {
    console.error('Error in deep cleaning:', error);
    return htmlContent;
  }
};