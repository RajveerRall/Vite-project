import { TOCItem } from '@/types/books';
import { extractTextFromHtml } from '../../utils/textExtraction';

/**
 * Service to detect the first substantial content page in a book.
 * Skips covers, title pages, and tables of contents.
 */
export class ContentDetectionService {
    private static readonly MAX_SCAN_PAGES = 15;
    private static readonly TEXT_THRESHOLD = 300; // Characters
    private static readonly BLACKLIST_KEYWORDS = [
        'table of contents', 'contents', 'copyright', 'dedication',
        'acknowledgments', 'preface', 'foreword', 'title page', 'cover'
    ];

    /**
     * Finds the index of the first page that contains substantial text content.
     */
    static async findFirstSubstantialPage(
        spine: string[],
        loadContent: (path: string) => Promise<string>,
        toc: TOCItem[]
    ): Promise<number> {
        console.log('[ContentDetection] Starting search for first substantial page...');

        // 1. Check TOC for "Chapter 1" hints
        const tocIndex = this.findChapterOneFromToc(toc, spine);
        if (tocIndex !== -1) {
            console.log(`[ContentDetection] Found Chapter 1 in TOC at spine index: ${tocIndex}`);
            return tocIndex;
        }

        // 2. Scan spine files in order
        const pagesToScan = Math.min(spine.length, this.MAX_SCAN_PAGES);
        for (let i = 0; i < pagesToScan; i++) {
            try {
                const filePath = spine[i];
                const html = await loadContent(filePath);
                const text = extractTextFromHtml(html);
                const textLower = text.toLowerCase();

                // Check text length
                if (text.length < this.TEXT_THRESHOLD) {
                    console.log(`[ContentDetection] Page ${i} skipped: too short (${text.length} chars)`);
                    continue;
                }

                // Check for blacklist keywords in the first 1000 characters
                const preview = textLower.substring(0, 1000);
                const hasBlacklistKeyword = this.BLACKLIST_KEYWORDS.some(keyword => {
                    // Check if keyword exists and isn't just a part of another word
                    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
                    return regex.test(preview);
                });

                if (hasBlacklistKeyword) {
                    // If it has "contents" but also a lot of text, it might be a weirdly formatted TOC or a page mentioning contents.
                    // For TOC pages, they usually have very high link density or specific strings.
                    if (preview.includes('table of contents') || preview.includes('contents')) {
                        console.log(`[ContentDetection] Page ${i} skipped: contained TOC keyword`);
                        continue;
                    }
                    // For copyright/dedication, we definitely want to skip if they appear early.
                    console.log(`[ContentDetection] Page ${i} skipped: contained blacklist keyword`);
                    continue;
                }

                // If it passed all checks, it's our first substantial page
                console.log(`[ContentDetection] Substantial page found at index ${i} (${text.length} chars)`);
                return i;
            } catch (error) {
                console.warn(`[ContentDetection] Error scanning page ${i}:`, error);
            }
        }

        console.log('[ContentDetection] No substantial page found, defaulting to 0');
        return 0;
    }

    /**
     * Searches the TOC for hints of "Chapter 1".
     */
    private static findChapterOneFromToc(toc: TOCItem[], spine: string[]): number {
        const chapterOneRegex = /^(chapter\s*1|chapter\s*one|^1\.|^part\s*1|^part\s*one)/i;

        const searchToc = (items: TOCItem[]): number => {
            for (const item of items) {
                if (chapterOneRegex.test(item.label.trim())) {
                    const pathPart = item.href.split('#')[0];
                    const index = spine.findIndex(s => s === pathPart || s.endsWith('/' + pathPart));
                    if (index !== -1) return index;
                }
                if (item.children && item.children.length > 0) {
                    const childResult = searchToc(item.children);
                    if (childResult !== -1) return childResult;
                }
            }
            return -1;
        };

        return searchToc(toc);
    }
}
