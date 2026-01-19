// src/utils/htmlHighlight.ts
// Utility to highlight text in HTML content while preserving images and other elements

import { imageBlobUrlCache } from './imageCache';

/**
 * Normalize whitespace in text for comparison
 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Find a chunk of text directly in an existing DOM element by matching text content
 * This approach is more robust than character-position-based matching because:
 * - It works even when HTML has images that don't exist in plain text
 * - It handles whitespace differences naturally
 * - It doesn't rely on character position alignment
 * 
 * @param domElement - The DOM element to search in (already created from HTML)
 * @param chunkText - The chunk text to find
 * @returns Array of text nodes and offsets that contain the chunk, or null if not found
 */
function findChunkInHtmlFromDom(
  domElement: HTMLElement,
  chunkText: string,
  startFromPosition?: number
): { nodes: { node: Text; startOffset: number; endOffset: number }[] } | null {
  if (!domElement || !chunkText) {
    return null;
  }

  // Get the actual text content from the DOM (same way extractTextFromHtml does it)
  // This ensures we match exactly what currentPageText contains
  const domTextContent = domElement.textContent || domElement.innerText || '';
  const normalizedDomText = normalizeWhitespace(domTextContent);
  
  // Normalize chunk text for matching
  const normalizedChunk = normalizeWhitespace(chunkText);
  if (!normalizedChunk) {
    return null;
  }
  
  // Find position in normalized DOM text (search entire text first)
  let chunkStartInNormalized = normalizedDomText.indexOf(normalizedChunk);
  
  if (chunkStartInNormalized === -1) {
    // Try with more flexible whitespace matching
    const normalizedDomTextNoSpaces = normalizedDomText.replace(/\s+/g, ' ').trim();
    const normalizedChunkNoSpaces = normalizedChunk.replace(/\s+/g, ' ').trim();
    const pos = normalizedDomTextNoSpaces.indexOf(normalizedChunkNoSpaces);
    if (pos === -1) {
      console.warn(`[htmlHighlight] Chunk not found in DOM text content: "${normalizedChunk.substring(0, 50)}..."`);
      return null;
    }
    // Approximate position in original normalized text
    const ratio = pos / normalizedDomTextNoSpaces.length;
    chunkStartInNormalized = Math.floor(normalizedDomText.length * ratio);
  }
  
  // If startFromPosition is provided and we found the chunk before it, try to find a later occurrence
  if (startFromPosition !== undefined && startFromPosition > 0 && chunkStartInNormalized < startFromPosition) {
    const laterOccurrence = normalizedDomText.indexOf(normalizedChunk, startFromPosition);
    if (laterOccurrence !== -1) {
      chunkStartInNormalized = laterOccurrence;
    } else {
      console.warn(`[htmlHighlight] Chunk found at position ${chunkStartInNormalized} but startFromPosition was ${startFromPosition}. Using first occurrence.`);
    }
  }
  
  const chunkEndInNormalized = chunkStartInNormalized + normalizedChunk.length;

  // Now we need to map this position back to actual text nodes for highlighting
  // Use TreeWalker to collect all text nodes
  const walker = document.createTreeWalker(
    domElement,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes: { node: Text; normalizedText: string; originalText: string }[] = [];
  let node: Text | null;
  
  while ((node = walker.nextNode() as Text | null)) {
    const originalText = node.textContent || '';
    if (originalText.trim()) {
      const normalizedText = normalizeWhitespace(originalText);
      textNodes.push({ node, normalizedText, originalText });
    }
  }

  // Build normalized HTML text by concatenating text nodes to map positions
  let normalizedHtmlText = '';
  const nodeBoundaries: { nodeIndex: number; startInNormalized: number; endInNormalized: number }[] = [];
  
  for (let i = 0; i < textNodes.length; i++) {
    const { normalizedText } = textNodes[i];
    const startPos = normalizedHtmlText.length;
    normalizedHtmlText += normalizedText;
    const endPos = normalizedHtmlText.length;
    
    nodeBoundaries.push({
      nodeIndex: i,
      startInNormalized: startPos,
      endInNormalized: endPos
    });
    
    // Add space separator between nodes (except for the last one)
    if (i < textNodes.length - 1) {
      normalizedHtmlText += ' ';
    }
  }
  
  // Normalize the reconstructed text
  normalizedHtmlText = normalizeWhitespace(normalizedHtmlText);
  
  // Map position from normalizedDomText to normalizedHtmlText
  // Since both should be similar but might have slight differences due to node concatenation,
  // we'll search for the chunk in normalizedHtmlText and use that position
  let chunkStartInNormalizedHtml = normalizedHtmlText.indexOf(normalizedChunk);
  
  if (chunkStartInNormalizedHtml === -1) {
    // If exact match fails, try to map using ratio
    if (normalizedDomText.length > 0) {
      const ratio = chunkStartInNormalized / normalizedDomText.length;
      chunkStartInNormalizedHtml = Math.floor(normalizedHtmlText.length * ratio);
    } else {
      return null;
    }
  }
  
  const chunkEndInNormalizedHtml = chunkStartInNormalizedHtml + normalizedChunk.length;

  // Map normalized positions back to actual text nodes
  const resultNodes: { node: Text; startOffset: number; endOffset: number }[] = [];
  
  for (const boundary of nodeBoundaries) {
    // Check if this node overlaps with the chunk
    if (boundary.endInNormalized > chunkStartInNormalizedHtml && boundary.startInNormalized < chunkEndInNormalizedHtml) {
      const { nodeIndex } = boundary;
      const textNode = textNodes[nodeIndex];
      
      // Calculate relative positions within this node
      const nodeRelativeStart = Math.max(0, chunkStartInNormalizedHtml - boundary.startInNormalized);
      const nodeRelativeEnd = Math.min(
        boundary.endInNormalized - boundary.startInNormalized,
        chunkEndInNormalizedHtml - boundary.startInNormalized
      );
      
      // Map normalized positions back to original text positions
      const originalText = textNode.originalText;
      const normalizedNodeText = textNode.normalizedText;
      
      if (normalizedNodeText.length > 0) {
        // Use proportion-based mapping
        const startRatio = nodeRelativeStart / normalizedNodeText.length;
        const endRatio = nodeRelativeEnd / normalizedNodeText.length;
        
        // Find positions in original text
        let highlightStart = 0;
        let highlightEnd = originalText.length;
        let normalizedCount = 0;
        let startFound = false;
        
        for (let i = 0; i < originalText.length; i++) {
          const char = originalText[i];
          const isWhitespace = /\s/.test(char);
          
          // Count non-whitespace or first whitespace in a sequence
          if (!isWhitespace || (i === 0 || !/\s/.test(originalText[i - 1]))) {
            normalizedCount++;
            
            if (!startFound && normalizedCount >= Math.ceil(normalizedNodeText.length * startRatio)) {
              highlightStart = i;
              startFound = true;
            }
            
            if (normalizedCount >= Math.ceil(normalizedNodeText.length * endRatio)) {
              highlightEnd = i + 1;
              break;
            }
          }
        }
        
        resultNodes.push({
          node: textNode.node,
          startOffset: Math.max(0, highlightStart),
          endOffset: Math.min(originalText.length, highlightEnd)
        });
      }
    }
  }

  if (resultNodes.length === 0) {
    return null;
  }

  return { nodes: resultNodes };
}

/**
 * Highlight text in HTML content while preserving images and other HTML elements
 * @param htmlContent - The original HTML content
 * @param textToHighlight - The plain text to highlight (from currentPageText)
 * @param startIndex - Start index in the plain text
 * @param endIndex - End index in the plain text
 * @param blobUrlMap - Optional map of epubSrc -> blob URL from actual DOM (highest priority)
 * @returns HTML with highlighted text
 */
export function highlightTextInHtml(
  htmlContent: string,
  textToHighlight: string,
  startIndex: number,
  endIndex: number,
  blobUrlMap?: Map<string, string>
): string {
  if (!htmlContent || !textToHighlight || startIndex < 0 || endIndex <= startIndex) {
    return htmlContent;
  }

  // Extract the text segment to highlight
  const textSegment = textToHighlight.substring(startIndex, endIndex);
  if (!textSegment.trim()) {
    return htmlContent;
  }

  // Create a temporary DOM element to work with
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  // Preserve blob URLs for images before manipulation
  // Store epubSrc -> blobUrl mapping
  const imageBlobUrls = new Map<string, string>();
  const images = tempDiv.querySelectorAll('img');
  images.forEach((img) => {
    const epubSrc = img.getAttribute('data-epub-src');
    const currentSrc = img.getAttribute('src') || img.src;
    
    // Priority 1: Use blob URL from actual DOM (passed in blobUrlMap)
    if (epubSrc && blobUrlMap?.has(epubSrc)) {
      const blobUrl = blobUrlMap.get(epubSrc)!;
      imageBlobUrls.set(epubSrc, blobUrl);
      // Also set it on temp DOM immediately
      img.src = blobUrl;
    }
    // Priority 2: Use blob URL from HTML string (if already present)
    else if (epubSrc && currentSrc && currentSrc.startsWith('blob:')) {
      imageBlobUrls.set(epubSrc, currentSrc);
    }
  });

  // Normalize the text to highlight for better matching
  const normalizedTextToHighlight = normalizeWhitespace(textToHighlight);
  const normalizedSegment = normalizeWhitespace(textSegment);
  const normalizedStartIndex = normalizeWhitespace(textToHighlight.substring(0, startIndex)).length;
  const normalizedEndIndex = normalizedStartIndex + normalizedSegment.length;

  // Use TreeWalker to find text nodes
  const walker = document.createTreeWalker(
    tempDiv,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentTextIndex = 0;
  const textNodes: { node: Text; start: number; end: number }[] = [];

  // Collect all text nodes with their positions (using normalized text)
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const text = node.textContent || '';
    if (text.trim()) {
      const normalizedText = normalizeWhitespace(text);
      const nodeStart = currentTextIndex;
      const nodeEnd = currentTextIndex + normalizedText.length;
      textNodes.push({ node, start: nodeStart, end: nodeEnd });
      currentTextIndex = nodeEnd + 1; // Add 1 for space between nodes
    }
  }

  // Find which text nodes contain the highlight range
  const nodesToHighlight: { node: Text; highlightStart: number; highlightEnd: number }[] = [];

  for (const textNode of textNodes) {
    // Check if this text node overlaps with the highlight range
    if (textNode.end >= normalizedStartIndex && textNode.start <= normalizedEndIndex) {
      // Calculate relative positions within this node
      const nodeRelativeStart = Math.max(0, normalizedStartIndex - textNode.start);
      const nodeRelativeEnd = Math.min(textNode.end - textNode.start, normalizedEndIndex - textNode.start);
      
      if (nodeRelativeEnd > nodeRelativeStart) {
        // Map back to original text positions
        const originalText = textNode.node.textContent || '';
        const normalizedNodeText = normalizeWhitespace(originalText);
        
        // If the normalized text matches the relative range exactly, use simple proportion
        if (normalizedNodeText.length > 0) {
          // Use character-by-character mapping for accuracy
          const startRatio = nodeRelativeStart / normalizedNodeText.length;
          const endRatio = nodeRelativeEnd / normalizedNodeText.length;
          
          let highlightStart = 0;
          let highlightEnd = originalText.length;
          let normalizedCount = 0;
          let startFound = false;
          
          for (let i = 0; i < originalText.length; i++) {
            const char = originalText[i];
            const isWhitespace = /\s/.test(char);
            
            // Count non-whitespace or first whitespace in a sequence
            if (!isWhitespace || (i === 0 || !/\s/.test(originalText[i - 1]))) {
              normalizedCount++;
              
              if (!startFound && normalizedCount >= Math.ceil(normalizedNodeText.length * startRatio)) {
                highlightStart = i;
                startFound = true;
              }
              
              if (normalizedCount >= Math.ceil(normalizedNodeText.length * endRatio)) {
                highlightEnd = i + 1;
                break;
              }
            }
          }
          
          nodesToHighlight.push({
            node: textNode.node,
            highlightStart: Math.max(0, highlightStart),
            highlightEnd: Math.min(originalText.length, highlightEnd)
          });
        }
      }
    }
  }

  // Apply highlights (process in reverse to maintain node references)
  for (let i = nodesToHighlight.length - 1; i >= 0; i--) {
    const { node, highlightStart, highlightEnd } = nodesToHighlight[i];
    const text = node.textContent || '';
    
    if (highlightStart === 0 && highlightEnd === text.length) {
      // Entire node should be highlighted
      const highlightSpan = document.createElement('span');
      highlightSpan.className = 'tts-highlight';
      highlightSpan.textContent = text;
      node.parentNode?.replaceChild(highlightSpan, node);
    } else {
      // Partial highlight - split the node
      const before = text.substring(0, highlightStart);
      const highlight = text.substring(highlightStart, highlightEnd);
      const after = text.substring(highlightEnd);

      const fragment = document.createDocumentFragment();
      
      if (before) {
        fragment.appendChild(document.createTextNode(before));
      }
      
      const highlightSpan = document.createElement('span');
      highlightSpan.className = 'tts-highlight';
      highlightSpan.textContent = highlight;
      fragment.appendChild(highlightSpan);
      
      if (after) {
        fragment.appendChild(document.createTextNode(after));
      }

      node.parentNode?.replaceChild(fragment, node);
    }
  }

  // Preserve blob URLs and dimensions BEFORE serializing to HTML
  // This ensures they're in the HTML string when React renders
  const tempImages = Array.from(tempDiv.querySelectorAll('img'));
  tempImages.forEach((tempImg) => {
    const epubSrc = tempImg.getAttribute('data-epub-src');
    if (!epubSrc) return;
    
    // Check both attribute (raw value) and property (resolved value) to catch about:blank
    const srcAttribute = tempImg.getAttribute('src');
    const srcProperty = tempImg.src;
    let blobUrl = srcProperty;
    
    // Priority order for restoring blob URLs:
    // 1. Already set from blobUrlMap (highest priority - from actual DOM)
    // 2. Preserved map (from HTML string)
    // 3. Global cache (fallback)
    // Check if we need to restore: about:blank in attribute, empty, or not a blob URL
    const needsRestore = !blobUrl || 
                        srcAttribute === 'about:blank' || 
                        blobUrl === 'about:blank' ||
                        blobUrl.includes('about:blank') ||
                        !blobUrl.startsWith('blob:');
    
    if (needsRestore) {
      if (blobUrlMap?.has(epubSrc)) {
        blobUrl = blobUrlMap.get(epubSrc)!;
        tempImg.src = blobUrl; // Set immediately
      } else {
        const preservedBlobUrl = imageBlobUrls.get(epubSrc);
        if (preservedBlobUrl) {
          blobUrl = preservedBlobUrl;
          tempImg.src = blobUrl; // Set immediately
        } else {
          // Fallback to global cache (from previously loaded images)
          const cachedBlobUrl = imageBlobUrlCache.get(epubSrc);
          if (cachedBlobUrl) {
            blobUrl = cachedBlobUrl;
            tempImg.src = blobUrl; // Set immediately
          } else {
            console.warn(`[htmlHighlight] No blob URL found for ${epubSrc}, srcAttribute: ${srcAttribute}, srcProperty: ${srcProperty}`);
          }
        }
      }
    }
      
    // If we have a blob URL, ensure it's set and preserve dimensions
    if (blobUrl && blobUrl.startsWith('blob:')) {
      tempImg.src = blobUrl;
      
      // Remove opacity: 0 that was set for about:blank images
      const currentStyle = tempImg.getAttribute('style') || '';
      if (currentStyle.includes('opacity: 0') || currentStyle.includes('opacity:0')) {
        // Remove opacity: 0 and transition: opacity from style, keep other styles
        const updatedStyle = currentStyle
          .replace(/opacity\s*:\s*0[^;]*;?/gi, '')
          .replace(/transition\s*:\s*opacity[^;]*;?/gi, '')
          .trim();
        if (updatedStyle) {
          tempImg.setAttribute('style', updatedStyle);
        } else {
          tempImg.removeAttribute('style');
        }
        // Set opacity to 1 explicitly
        tempImg.style.opacity = '1';
      }
      
      // Get and set dimensions to prevent layout shift
      const width = tempImg.naturalWidth || tempImg.width || tempImg.offsetWidth;
      const height = tempImg.naturalHeight || tempImg.height || tempImg.offsetHeight;
      if (width > 0 && height > 0) {
        tempImg.style.width = `${width}px`;
        tempImg.style.height = `${height}px`;
        tempImg.style.aspectRatio = `${width} / ${height}`;
        tempImg.style.minWidth = `${width}px`;
        tempImg.style.minHeight = `${height}px`;
      }
    }
  });

  // Now serialize - blob URLs and dimensions will be in the HTML string
  return tempDiv.innerHTML;
}

/**
 * Highlight a chunk of text in HTML content using content-based matching
 * This finds chunks directly in HTML by matching text content, making it robust to:
 * - Images and other non-text elements
 * - Whitespace differences
 * - HTML structure variations
 * 
 * @param htmlContent - The original HTML content
 * @param fullText - The full plain text (from currentPageText) - used for fallback only
 * @param chunkText - The chunk text to highlight
 * @param blobUrlMap - Optional map of epubSrc -> blob URL from actual DOM (highest priority)
 * @returns HTML with highlighted chunk
 */
export function highlightChunkInHtml(
  htmlContent: string,
  fullText: string,
  chunkText: string,
  blobUrlMap?: Map<string, string>,
  chunkIndex?: number,
  allChunks?: string[]
): string {
  if (!htmlContent || !chunkText) {
    return htmlContent;
  }

  // Create a temporary DOM element to work with (single instance for both finding and highlighting)
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  // Debug: Log images BEFORE any manipulation
  const imagesBefore = tempDiv.querySelectorAll('img');

  // Preserve blob URLs for images before manipulation
  const imageBlobUrls = new Map<string, string>();
  const images = tempDiv.querySelectorAll('img');
  images.forEach((img) => {
    const epubSrc = img.getAttribute('data-epub-src');
    const currentSrc = img.getAttribute('src') || img.src;
    
    // Priority 1: Use blob URL from actual DOM (passed in blobUrlMap)
    if (epubSrc && blobUrlMap?.has(epubSrc)) {
      const blobUrl = blobUrlMap.get(epubSrc)!;
      imageBlobUrls.set(epubSrc, blobUrl);
      // Also set it on temp DOM immediately
      img.src = blobUrl;
    }
    // Priority 2: Use blob URL from HTML string (if already present)
    else if (epubSrc && currentSrc && currentSrc.startsWith('blob:')) {
      imageBlobUrls.set(epubSrc, currentSrc);
    }
  });

  // Calculate approximate starting position based on chunk index to avoid matching earlier occurrences
  let startFromPosition = 0;
  if (chunkIndex !== undefined && chunkIndex > 0 && allChunks) {
    // Sum up lengths of previous chunks to get approximate position in normalized text
    // This helps avoid matching the first occurrence if the same text appears multiple times
    for (let i = 0; i < chunkIndex; i++) {
      const prevChunk = allChunks[i];
      if (prevChunk) {
        const normalizedPrevChunk = normalizeWhitespace(prevChunk);
        startFromPosition += normalizedPrevChunk.length + 1; // +1 for space between chunks
      }
    }
    // Use a slightly smaller position to account for potential whitespace differences
    startFromPosition = Math.max(0, startFromPosition - 10);
  }

  // Debug logging to help diagnose matching issues

  // Use content-based matching to find chunk directly in HTML
  // Pass the tempDiv so we can work with the same DOM instance
  const chunkMatch = findChunkInHtmlFromDom(tempDiv, chunkText, startFromPosition);
  
  if (chunkMatch && chunkMatch.nodes.length > 0) {
    // Debug: Check images before highlighting operations
    const imagesBeforeHighlight = tempDiv.querySelectorAll('img');
    
    // Apply highlights using the matched nodes
    // Process in reverse to maintain node references
    for (let i = chunkMatch.nodes.length - 1; i >= 0; i--) {
      const { node, startOffset, endOffset } = chunkMatch.nodes[i];
      const text = node.textContent || '';
      
      if (startOffset === 0 && endOffset === text.length) {
        // Entire node should be highlighted
        const highlightSpan = document.createElement('span');
        highlightSpan.className = 'tts-highlight';
        highlightSpan.textContent = text;
        node.parentNode?.replaceChild(highlightSpan, node);
      } else {
        // Partial highlight - split the node
        const before = text.substring(0, startOffset);
        const highlight = text.substring(startOffset, endOffset);
        const after = text.substring(endOffset);

        const fragment = document.createDocumentFragment();
        
        if (before) {
          fragment.appendChild(document.createTextNode(before));
        }
        
        const highlightSpan = document.createElement('span');
        highlightSpan.className = 'tts-highlight';
        highlightSpan.textContent = highlight;
        fragment.appendChild(highlightSpan);
        
        if (after) {
          fragment.appendChild(document.createTextNode(after));
        }

        node.parentNode?.replaceChild(fragment, node);
      }
    }
    
    // Debug: Check images after highlighting operations
    const imagesAfterHighlight = tempDiv.querySelectorAll('img');

    // Preserve blob URLs and dimensions BEFORE serializing to HTML
    // This ensures they're in the HTML string when React renders
    const tempImages = Array.from(tempDiv.querySelectorAll('img'));
    tempImages.forEach((tempImg) => {
      const epubSrc = tempImg.getAttribute('data-epub-src');
      if (!epubSrc) return;
      
      // Check both attribute (raw value) and property (resolved value) to catch about:blank
      const srcAttribute = tempImg.getAttribute('src');
      const srcProperty = tempImg.src;
      let blobUrl = srcProperty;
      
      // Priority order for restoring blob URLs:
      // 1. Already set from blobUrlMap (highest priority - from actual DOM)
      // 2. Preserved map (from HTML string)
      // 3. Global cache (fallback)
      // Check if we need to restore: about:blank in attribute, empty, or not a blob URL
      const needsRestore = !blobUrl || 
                          srcAttribute === 'about:blank' || 
                          blobUrl === 'about:blank' ||
                          blobUrl.includes('about:blank') ||
                          !blobUrl.startsWith('blob:');
      
      if (needsRestore) {
        if (blobUrlMap?.has(epubSrc)) {
          blobUrl = blobUrlMap.get(epubSrc)!;
          tempImg.src = blobUrl; // Set immediately
        } else {
          const preservedBlobUrl = imageBlobUrls.get(epubSrc);
          if (preservedBlobUrl) {
            blobUrl = preservedBlobUrl;
            tempImg.src = blobUrl; // Set immediately
          } else {
            // Fallback to global cache (from previously loaded images)
            const cachedBlobUrl = imageBlobUrlCache.get(epubSrc);
            if (cachedBlobUrl) {
              blobUrl = cachedBlobUrl;
              tempImg.src = blobUrl; // Set immediately
            } else {
              console.warn(`[htmlHighlight] No blob URL found for ${epubSrc}, srcAttribute: ${srcAttribute}, srcProperty: ${srcProperty}`);
            }
          }
        }
      }
      
      // If we have a blob URL, ensure it's set and preserve dimensions
      if (blobUrl && blobUrl.startsWith('blob:')) {
        tempImg.src = blobUrl;
        
        // Remove opacity: 0 that was set for about:blank images
        const currentStyle = tempImg.getAttribute('style') || '';
        if (currentStyle.includes('opacity: 0') || currentStyle.includes('opacity:0')) {
          // Remove opacity: 0 and transition: opacity from style, keep other styles
          const updatedStyle = currentStyle
            .replace(/opacity\s*:\s*0[^;]*;?/gi, '')
            .replace(/transition\s*:\s*opacity[^;]*;?/gi, '')
            .trim();
          if (updatedStyle) {
            tempImg.setAttribute('style', updatedStyle);
          } else {
            tempImg.removeAttribute('style');
          }
          // Set opacity to 1 explicitly
          tempImg.style.opacity = '1';
        }
        
        // Get and set dimensions to prevent layout shift
        const width = tempImg.naturalWidth || tempImg.width || tempImg.offsetWidth;
        const height = tempImg.naturalHeight || tempImg.height || tempImg.offsetHeight;
        if (width > 0 && height > 0) {
          tempImg.style.width = `${width}px`;
          tempImg.style.height = `${height}px`;
          tempImg.style.aspectRatio = `${width} / ${height}`;
          tempImg.style.minWidth = `${width}px`;
          tempImg.style.minHeight = `${height}px`;
        }
      }
    });

    // Debug: Check images in serialized HTML string BEFORE returning
    const serializedHtml = tempDiv.innerHTML;
    const serializedImgRegex = /<img[^>]*>/gi;
    const serializedImgMatches = serializedHtml.match(serializedImgRegex) || [];

    // Now serialize - blob URLs and dimensions will be in the HTML string
    return serializedHtml;
  }

  // Fallback: use the old character-position-based approach if content-based matching fails
  const normalizedFull = normalizeWhitespace(fullText);
  const normalizedChunk = normalizeWhitespace(chunkText);
  
  // Calculate starting position for fallback search based on chunk index
  let fallbackSearchStart = 0;
  if (chunkIndex !== undefined && chunkIndex > 0 && allChunks) {
    for (let i = 0; i < chunkIndex; i++) {
      const prevChunk = allChunks[i];
      if (prevChunk) {
        const normalizedPrevChunk = normalizeWhitespace(prevChunk);
        fallbackSearchStart += normalizedPrevChunk.length + 1;
      }
    }
    fallbackSearchStart = Math.max(0, fallbackSearchStart - 10);
  }
  
  const normalizedStartIndex = normalizedFull.indexOf(normalizedChunk, fallbackSearchStart);
  
  if (normalizedStartIndex === -1) {
    return htmlContent;
  }

  // Map back to original positions
  let startIndex = -1;
  let count = 0;
  let lastWasWhitespace = false;
  for (let i = 0; i < fullText.length; i++) {
    const isWhitespace = /\s/.test(fullText[i]);
    if (!isWhitespace || !lastWasWhitespace) {
      if (count === normalizedStartIndex) {
        startIndex = i;
        break;
      }
      count++;
    }
    lastWasWhitespace = isWhitespace;
  }
  
  const endIndex = startIndex !== -1 ? startIndex + chunkText.length : -1;

  if (startIndex === -1 || endIndex <= startIndex) {
    return htmlContent;
  }

  return highlightTextInHtml(htmlContent, fullText, startIndex, endIndex, blobUrlMap);
}

