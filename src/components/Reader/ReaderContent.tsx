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
  highlightedContent,
  onPageClick,
  onChapterNavigation,
  showNavigationArrows,
  showPrevArrow = false,
  showNextArrow = false,
  fontSize = 16,
  contentRef,
}) => {
  const { currentBook } = useBook();
  const displayContent = highlightedContent || content;

  // Synchronously restore dimensions immediately after React renders
  // This prevents layout shift before the async useEffect runs
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
  }, [displayContent]); // Run immediately when content changes

  // Re-process images after content updates to restore blob URLs if they were lost
  useEffect(() => {
    if (!displayContent || !currentBook?.file) return;

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
        const needsProcessing = !src || src === 'about:blank' || !src.startsWith('blob:');
        
        // If it has a blob URL, check if it's still valid by checking if image has loaded
        if (!needsProcessing && imageElement.complete && imageElement.naturalWidth === 0) {
          // Image failed to load, needs reprocessing
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
  }, [displayContent, currentBook?.file]);

  return (
    <div className="reader-main" ref={contentRef}>
      <div
        className="epub-content"
        onClick={onPageClick}
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

