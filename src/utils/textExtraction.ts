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
      let textContent = tempDiv.textContent || '';
      textContent = textContent.replace(/\s+/g, ' ').trim();
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
      if (src.startsWith('http') || src.startsWith('data:')) {
        return match; // Absolute URL or data URI, no changes needed
      }

      // Resolve the src path relative to the current HTML file's directory to get a root-relative path
      const rootRelativeImagePath = resolveRelativePath(currentHtmlDir, src);

      // Store the root-relative path in data-epub-src for loadPageCallback to use
      // And also update the src to the placeholder using this root-relative path
      return `<img${attributes}src="data:image/png;base64,IMAGE_PLACEHOLDER_${rootRelativeImagePath}" data-epub-src="${rootRelativeImagePath}"`;
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

      // Store the root-relative path in data-epub-css-href for loadPageCallback to use
      // And also update the href to the placeholder using this root-relative path
      // The actual <link> tag will be replaced by a <style> tag in loadPageCallback
      return `<link${attributes}href="data:text/css;base64,CSS_PLACEHOLDER_${rootRelativeCssPath}" data-epub-css-href="${rootRelativeCssPath}"`;
    }
  );

  // Consider other elements that might have relative paths e.g. <audio src="...">, <video src="...">, <object data="...">
  // For SVGs with <image xlink:href="...">, regex becomes much harder, DOM parsing is better.

  return processedHtml;
};