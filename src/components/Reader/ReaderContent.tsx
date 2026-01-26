// src/components/Reader/ReaderContent.tsx
// Main reading content area component

import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBook } from '../../context/BookContext';
import { imageDimensionsCache, imageBlobUrlCache } from '../../utils/imageCache';

export interface ReaderContentProps {
  // Content
  content: string;
  highlightedContent?: string;
  activeChunk?: string | null;

  // Navigation
  onPageClick: () => void;
  onChapterNavigation: (direction: 'prev' | 'next') => void;

  // UI state
  showNavigationArrows: boolean;
  showPrevArrow?: boolean;
  showNextArrow?: boolean;

  // Settings
  fontSize?: number;

  // Refs
  contentRef: React.RefObject<HTMLDivElement>;
}

/**
 * Reader content component for displaying book content
 * Extracted from Reader component for better separation of concerns
 */
export const ReaderContent: React.FC<ReaderContentProps> = ({
  content,
  highlightedContent, // Keeping this for backward compatibility if needed, but not using for display
  activeChunk,
  onPageClick,
  onChapterNavigation,
  showNavigationArrows,
  showPrevArrow = false,
  showNextArrow = false,
  fontSize = 16,
  contentRef,
}) => {
  const { currentBook } = useBook();
  // Use plain content for display - highlights will be applied via DOM manipulation
  // Use highlightedContent if provided (for Picture Mode/Full Cast), otherwise use plain content
  const displayContent = highlightedContent || content;

  // DOM-based highlighting
  // Instead of re-rendering everything (which reloads images), we manipulate the DOM directly
  useEffect(() => {
    // Clean up previous highlights
    const contentElement = document.querySelector('.epub-content');
    if (!contentElement) return;

    // Remove existing highlights but keep text
    const highlights = contentElement.querySelectorAll('.tts-highlight');
    highlights.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        // Unwrap: replace span with its text content
        const text = el.textContent || '';
        const textNode = document.createTextNode(text);
        parent.replaceChild(textNode, el);
        // Normalize to merge adjacent text nodes
        parent.normalize();
      }
    });

    // Apply new highlight if we have an active chunk
    if (activeChunk && activeChunk.trim().length > 0) {
      const cleanChunk = activeChunk.trim();

      // Step 1: Collect all text nodes and build a virtual text buffer
      // This allows us to match text that spans multiple nodes (e.g. bold/italic)
      const walker = document.createTreeWalker(
        contentElement,
        NodeFilter.SHOW_TEXT,
        null
      );

      const nodeMap: { start: number; end: number; node: Text }[] = [];
      let virtualText = '';

      let currentNode = walker.nextNode();
      while (currentNode) {
        const node = currentNode as Text;
        const text = node.textContent || '';
        const start = virtualText.length;
        virtualText += text;
        const end = virtualText.length;

        nodeMap.push({ start, end, node });
        currentNode = walker.nextNode();
      }

      // Step 2: Use regex to find the match in the virtual text buffer
      // This handles whitespace differences and cross-node matching
      const escapedChunk = cleanChunk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Robust Pattern Generation:
      // 1. Replace whitespaces with \s+ to match newlines/tabs
      // 2. Replace quotes/apostrophes with flexible classes to match instances of smart quotes
      // 3. Replace ellipses with flexible matcher
      const whiteSpaceAgnosticPattern = escapedChunk
        .replace(/\s+/g, '\\s+')
        .replace(/['’‘]/g, "['’‘]") // Match any single quote style
        .replace(/["”“]/g, '["”“]') // Match any double quote style
        .replace(/[-–—]/g, '[-–—]') // Match any dash style
        .replace(/\\\./g, '\\.?'); // Allow optional dots (ONLY target literal \.)

      const regex = new RegExp(whiteSpaceAgnosticPattern, 'i');

      const match = virtualText.match(regex);

      if (match && match.index !== undefined) {
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;

        // Step 3: Map the match back to DOM nodes and create highlights
        nodeMap.forEach(({ start, end, node }) => {
          const overlapStart = Math.max(start, matchStart);
          const overlapEnd = Math.min(end, matchEnd);

          if (overlapStart < overlapEnd) {
            // This node contains part of the match
            const nodeRelativeStart = overlapStart - start;
            const nodeRelativeEnd = overlapEnd - start;

            const range = document.createRange();
            range.setStart(node, nodeRelativeStart);
            range.setEnd(node, nodeRelativeEnd);

            const span = document.createElement('span');
            span.className = 'tts-highlight';

            try {
              // Note: surroundContents is safe because we are wrapping 
              // purely WITHIN a single Text node here.
              range.surroundContents(span);
            } catch (e) {
              console.warn('[ReaderContent] Multi-node highlighting segment failed:', e);
            }
          }
        });
      } else {
        console.log('[ReaderContent] Multi-node Highlight match fail:', {
          chunk: cleanChunk.substring(0, 30) + (cleanChunk.length > 30 ? '...' : ''),
        });
      }
    }
  }, [activeChunk]); // Run when active chunk changes

  useEffect(() => {
    // Use requestAnimationFrame to run after React has rendered but before paint
    const rafId = requestAnimationFrame(() => {
      const contentElement = document.querySelector('.epub-content');
      if (!contentElement) return;

      const images = contentElement.querySelectorAll('img[data-epub-src]');
      images.forEach((img) => {
        const imageElement = img as HTMLImageElement;
        const epubSrc = imageElement.getAttribute('data-epub-src');
        if (!epubSrc) return;

        // Restore dimensions from cache immediately to prevent layout shift
        const cachedDimensions = imageDimensionsCache.get(epubSrc);
        if (cachedDimensions) {
          imageElement.style.width = `${cachedDimensions.width}px`;
          imageElement.style.height = `${cachedDimensions.height}px`;
          imageElement.style.aspectRatio = `${cachedDimensions.width} / ${cachedDimensions.height}`;
        }
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [content]); // Run only when base content changes

  // Re-process images after content updates to restore blob URLs if they were lost
  useEffect(() => {
    if (!content || !currentBook?.file) return;

    const processImages = async () => {
      const contentElement = document.querySelector('.epub-content');
      if (!contentElement) return;

      // Query images once
      const images = contentElement.querySelectorAll('img[data-epub-src]');
      if (images.length === 0) return;

      // First pass: Restore dimensions and blob URLs for images
      // This prevents layout shift when React re-renders
      images.forEach((img) => {
        const imageElement = img as HTMLImageElement;
        const epubSrc = imageElement.getAttribute('data-epub-src');
        if (!epubSrc) return;

        const src = imageElement.getAttribute('src') || imageElement.src;

        // Restore blob URL from cache if image has about:blank
        if (!src || src === 'about:blank' || !src.startsWith('blob:')) {
          const cachedBlobUrl = imageBlobUrlCache.get(epubSrc);
          if (cachedBlobUrl) {
            imageElement.src = cachedBlobUrl;
          }
        }

        // If image has a blob URL (either restored or already present), restore its dimensions
        const currentSrc = imageElement.getAttribute('src') || imageElement.src;
        if (currentSrc && currentSrc.startsWith('blob:')) {
          const cachedDimensions = imageDimensionsCache.get(epubSrc);
          if (cachedDimensions) {
            imageElement.style.width = `${cachedDimensions.width}px`;
            imageElement.style.height = `${cachedDimensions.height}px`;
            imageElement.style.aspectRatio = `${cachedDimensions.width} / ${cachedDimensions.height}`;
          } else if (imageElement.naturalWidth > 0 && imageElement.naturalHeight > 0) {
            // Image is loaded but not cached, cache it now
            imageDimensionsCache.set(epubSrc, {
              width: imageElement.naturalWidth,
              height: imageElement.naturalHeight
            });
            // Also cache blob URL if not already cached
            if (!imageBlobUrlCache.has(epubSrc)) {
              imageBlobUrlCache.set(epubSrc, currentSrc);
            }
            imageElement.style.width = `${imageElement.naturalWidth}px`;
            imageElement.style.height = `${imageElement.naturalHeight}px`;
            imageElement.style.aspectRatio = `${imageElement.naturalWidth} / ${imageElement.naturalHeight}`;
          }
        }
      });

      // Only process images that actually need processing:
      // - Don't have a src attribute
      // - Have src="about:blank"
      // - Don't start with blob:
      // - Have a blob URL but failed to load (check img.complete && img.naturalWidth === 0)
      const imagesToProcess = Array.from(images).filter((img) => {
        const imageElement = img as HTMLImageElement;
        // Re-check src after first pass (it might have been restored from cache)
        const src = imageElement.getAttribute('src') || imageElement.src;
        const epubSrc = imageElement.getAttribute('data-epub-src');

        // Must have epubSrc to process
        if (!epubSrc || epubSrc === 'about:blank') return false;

        // Check if image needs processing: no src, about:blank, or not a blob URL
        let needsProcessing = !src || src === 'about:blank' || !src.startsWith('blob:');

        // If it has a blob URL, but that URL is not in our current session cache, it's likely stale
        if (!needsProcessing && src && src.startsWith('blob:') && !Array.from(imageBlobUrlCache.values()).includes(src)) {
          needsProcessing = true;
        }

        // If it still doesn't need processing, check if it's broken
        if (!needsProcessing && imageElement.complete && imageElement.naturalWidth === 0) {
          return true;
        }

        return needsProcessing;
      });

      console.log('[ReaderContent] Image processing check:', {
        totalImages: images.length,
        imagesToProcess: imagesToProcess.length,
        sampleImageSrc: images[0] ? ((images[0] as HTMLImageElement).getAttribute('src') || (images[0] as HTMLImageElement).src) : 'none',
        sampleEpubSrc: images[0] ? images[0].getAttribute('data-epub-src') : 'none',
      });

      if (imagesToProcess.length === 0) {
        // All images already have valid blob URLs, no processing needed
        console.log('[ReaderContent] All images already have blob URLs, skipping processing');
        return;
      }

      // If HTML contains blob URLs but DOM images need processing, it means
      // React re-rendered and created new DOM elements (highlight change)
      // In this case, we still need to process to restore blob URLs

      // Load the EPUB zip file once
      try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(currentBook.file);

        // Process images in parallel
        await Promise.all(
          imagesToProcess.map(async (img) => {
            const imageElement = img as HTMLImageElement;
            const epubSrc = imageElement.getAttribute('data-epub-src');
            if (!epubSrc || epubSrc === 'about:blank') return;

            try {
              // Check if we have cached dimensions for this image
              const cachedDimensions = imageDimensionsCache.get(epubSrc);

              // If we have cached dimensions, apply them BEFORE changing src
              // This prevents layout shift when the image reloads
              if (cachedDimensions) {
                imageElement.style.width = `${cachedDimensions.width}px`;
                imageElement.style.height = `${cachedDimensions.height}px`;
                imageElement.style.aspectRatio = `${cachedDimensions.width} / ${cachedDimensions.height}`;
              } else {
                // If no cached dimensions, try to get them from the current image
                // This handles the case where image was already loaded but cache was cleared
                const currentWidth = imageElement.naturalWidth || imageElement.width || imageElement.offsetWidth;
                const currentHeight = imageElement.naturalHeight || imageElement.height || imageElement.offsetHeight;
                if (currentWidth > 0 && currentHeight > 0) {
                  imageElement.style.width = `${currentWidth}px`;
                  imageElement.style.height = `${currentHeight}px`;
                  imageElement.style.aspectRatio = `${currentWidth} / ${currentHeight}`;
                }
              }

              const imageBlob = await loadedZip.file(epubSrc)?.async('blob');
              if (imageBlob) {
                const blobUrl = URL.createObjectURL(imageBlob);

                // Set up load handler to cache dimensions and blob URL
                imageElement.onload = () => {
                  // Cache dimensions and blob URL for future use
                  if (imageElement.naturalWidth > 0 && imageElement.naturalHeight > 0) {
                    imageDimensionsCache.set(epubSrc, {
                      width: imageElement.naturalWidth,
                      height: imageElement.naturalHeight
                    });

                    // Cache the blob URL so it can be restored when HTML has about:blank
                    imageBlobUrlCache.set(epubSrc, blobUrl);

                    // Ensure dimensions are set (in case they weren't cached before)
                    imageElement.style.width = `${imageElement.naturalWidth}px`;
                    imageElement.style.height = `${imageElement.naturalHeight}px`;
                    imageElement.style.aspectRatio = `${imageElement.naturalWidth} / ${imageElement.naturalHeight}`;
                  }
                  imageElement.style.opacity = '1';
                };

                imageElement.onerror = () => {
                  console.warn(`Image failed to load: ${epubSrc}`);
                  imageElement.style.opacity = '0.5';
                };

                // Set src after dimensions are preserved
                imageElement.src = blobUrl;
                imageElement.style.opacity = cachedDimensions ? '1' : '0'; // Fade in if no cached dimensions
              }
            } catch (e) {
              console.error(`Error loading image ${epubSrc}:`, e);
            }
          })
        );
      } catch (error) {
        console.error('[ReaderContent] Error loading EPUB for image processing:', error);
      }
    };

    // Use requestAnimationFrame to process after React has rendered
    const rafId = requestAnimationFrame(() => {
      setTimeout(processImages, 50);
    });

    return () => cancelAnimationFrame(rafId);
  }, [content, currentBook?.file]);

  // Auto-scroll to highlight when it changes (for TTS and Picture Mode)
  useEffect(() => {
    // Determine if we should attempt to scroll
    const shouldScroll = (activeChunk && activeChunk.trim().length > 0) || highlightedContent;
    if (!shouldScroll) return;

    // Small delay to ensure React has finished updating the DOM with the new highlight span
    const timer = setTimeout(() => {
      const highlightElement = contentRef.current?.querySelector('.tts-highlight');
      if (highlightElement) {
        highlightElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [highlightedContent, activeChunk, contentRef]);

  return (
    <div
      className="reader-main"
      ref={contentRef}
      onClick={(e) => {
        console.log('[ReaderContent] reader-main clicked');
        onPageClick();
      }}
    >
      <div
        className={`epub-content ${(activeChunk && activeChunk.trim().length > 0) || (highlightedContent && highlightedContent !== content) ? 'tts-dimmed' : ''}`}
        onContextMenu={(e) => {
          // Prevent native context menu on text selection to avoid obstruction
          e.preventDefault();
        }}
        style={{
          whiteSpace: 'pre-wrap',
          fontSize: `${fontSize}px`
        }}
        dangerouslySetInnerHTML={{ __html: displayContent }}
      />

      {showNavigationArrows && (
        <>
          {showPrevArrow && (
            <button
              onClick={() => onChapterNavigation('prev')}
              className="chapter-nav-arrow chapter-nav-arrow-left"
              aria-label="Previous chapter"
              title="Previous chapter"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {showNextArrow && (
            <button
              onClick={() => onChapterNavigation('next')}
              className="chapter-nav-arrow chapter-nav-arrow-right"
              aria-label="Next chapter"
              title="Next chapter"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
        </>
      )}
    </div>
  );
};
