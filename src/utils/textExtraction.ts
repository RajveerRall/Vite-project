// src/utils/textExtraction.ts

/**
 * Extracts plain text content from HTML
 */
export const extractTextFromHtml = (htmlContent: string): string => {
  try {
    // Create a temporary div to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Extract text content
    let textContent = tempDiv.textContent || '';
    
    // Clean up the text (remove excess whitespace)
    textContent = textContent.replace(/\s+/g, ' ').trim();
    
    return textContent;
  } catch (error) {
    console.error('Error extracting text:', error);
    return '';
  }
};

/**
 * Process HTML content to fix relative paths for images and CSS
 */
export const processHtmlContent = (htmlContent: string, fileDir: string): string => {
  let processedHtml = htmlContent;
  
  // Fix image paths
  processedHtml = processedHtml.replace(
    /<img([^>]*)src=["']([^"']*)["']/g,
    (match, attributes, src) => {
      if (src.startsWith('http')) {
        return match; // Absolute URL, no changes needed
      }
      
      // Construct a data URL for the image
      const imagePath = src.startsWith('/') ? src.substring(1) : fileDir + src;
      return `<img${attributes}src="data:image/png;base64,IMAGE_PLACEHOLDER_${imagePath}"`;
    }
  );
  
  // Fix CSS paths
  processedHtml = processedHtml.replace(
    /<link([^>]*)href=["']([^"']*)["']/g,
    (match, attributes, href) => {
      if (href.startsWith('http')) {
        return match; // Absolute URL, no changes needed
      }
      
      // Construct a data URL for the CSS
      const cssPath = href.startsWith('/') ? href.substring(1) : fileDir + href;
      return `<link${attributes}href="data:text/css;base64,CSS_PLACEHOLDER_${cssPath}"`;
    }
  );
  
  return processedHtml;
};
