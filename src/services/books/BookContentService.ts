
import JSZip from 'jszip';
import {
    processHtmlContent,
    extractTextFromHtml,
    cleanEpubContent,
    deepCleanEpubContent
} from '../../utils/textExtraction';
import { getDirectoryPath } from '../../utils/pathUtils';
import { imageBlobUrlCache, imageDimensionsCache } from '../../utils/imageCache';

export interface PageContent {
    html: string;
    text: string;
    displayContent: string; // deeply cleaned for display/TTS
}

/**
 * Service for loading and processing book content from source files (EPUB Zip)
 * Decoupled from React Context to support Headless Global Player
 */
export class BookContentService {

    /**
     * Load a specific page from the book zip
     */
    static async loadPage(
        zip: JSZip,
        filePath: string
    ): Promise<PageContent> {
        try {
            // 1. Fetch raw HTML from Zip
            const htmlTextContent = await zip.file(filePath)?.async('text');
            if (htmlTextContent == null) {
                throw new Error(`Could not load HTML for ${filePath}`);
            }

            // 2. Process HTML (Resolve images/CSS paths)
            const fileDir = getDirectoryPath(filePath);
            const processedHtml = processHtmlContent(htmlTextContent, fileDir, zip, filePath);

            // 3. Clean HTML for display (remove headers/nav)
            const cleanedHtml = cleanEpubContent(processedHtml);

            // 4. Deep clean for TTS/Reader view (remove CSS rules/metadata)
            const deepCleanedHtml = deepCleanEpubContent(cleanedHtml);

            // 5. Extract plain text for TTS
            const text = extractTextFromHtml(deepCleanedHtml);

            // 6. Pre-cache images (optional optimization, largely handled by ReaderContent now but good for headless)
            // Note: We don't block on this, just let it happen or skip if in headless mode
            // Logic for pre-caching blobs is complex to move entirely here without DOM access (URL.createObjectURL)
            // So we leave heavy blob creation to the UI layer (ReaderContent) or a separate specific method if needed.

            return {
                html: processedHtml,
                displayContent: deepCleanedHtml,
                text: text
            };
        } catch (error) {
            console.error('[BookContentService] Error loading page:', error);
            throw error;
        }
    }

    /**
     * Process CSS links in the content (Helper for UI components)
     */
    static async loadCssResources(
        zip: JSZip,
        contentElement: HTMLElement
    ): Promise<void> {
        const links = contentElement.querySelectorAll('link[data-epub-css-href]');

        await Promise.all(Array.from(links).map(async (link) => {
            const cssPath = (link as HTMLLinkElement).getAttribute('data-epub-css-href');
            if (!cssPath) return;

            try {
                const cssFileContent = await zip.file(cssPath)?.async('text');
                if (cssFileContent) {
                    const style = document.createElement('style');
                    style.textContent = cssFileContent;
                    link.parentNode?.replaceChild(style, link);
                } else {
                    link.remove();
                }
            } catch (e) {
                console.error(`Error loading CSS ${cssPath}:`, e);
            }
        }));
    }

    /**
     * Process Images (blob URL creation)
     * Designed to be called by UI components that have DOM access
     */
    static async loadImages(
        zip: JSZip,
        contentElement: HTMLElement
    ): Promise<void> {
        const images = contentElement.querySelectorAll('img');

        await Promise.all(Array.from(images).map(async (img) => {
            const currentSrc = img.getAttribute('src') || img.src;
            const epubSrc = img.getAttribute('data-epub-src');

            // Skip if already has blob
            if (currentSrc && currentSrc.startsWith('blob:')) return;

            // Validate epubSrc
            if (!epubSrc || !epubSrc.trim() || epubSrc === 'about:blank') {
                if (!currentSrc || currentSrc === 'about:blank') {
                    img.style.opacity = '0.3';
                    img.removeAttribute('src');
                }
                return;
            }

            try {
                // Check cache first (though ReaderContent handles this too)
                if (imageBlobUrlCache.has(epubSrc)) {
                    img.src = imageBlobUrlCache.get(epubSrc)!;
                    img.style.opacity = '1';
                    return;
                }

                const imageBlob = await zip.file(epubSrc)?.async('blob');
                if (imageBlob) {
                    const blobUrl = URL.createObjectURL(imageBlob);
                    img.src = blobUrl;
                    imageBlobUrlCache.set(epubSrc, blobUrl);

                    img.onload = () => {
                        img.style.opacity = '1';
                        if (img.naturalWidth > 0) {
                            imageDimensionsCache.set(epubSrc, { width: img.naturalWidth, height: img.naturalHeight });
                        }
                    };
                } else {
                    img.style.opacity = '0.5';
                    img.alt = 'Image missing';
                }
            } catch (e) {
                console.error(`Error loading image ${epubSrc}:`, e);
                img.style.opacity = '0.3';
            }
        }));
    }
}
