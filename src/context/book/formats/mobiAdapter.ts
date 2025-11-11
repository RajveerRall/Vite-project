// src/context/book/formats/mobiAdapter.ts
// MOBI adapter using @lingo-reader/mobi-parser (browser compatible)

import type { FormatAdapter, OpenResult, ParsedBookMeta } from './types';
import type { TOCItem } from '../../../types/books';
import { initMobiFile } from '@lingo-reader/mobi-parser';
import { getDOMParser } from '../domParser';

const isMobi = (name: string, type: string) => name.toLowerCase().endsWith('.mobi') || /mobipocket|application\/x-mobipocket-ebook/i.test(type);

export const mobiAdapter: FormatAdapter = {
  id: 'mobi',
  supports: (file: File) => isMobi(file.name, file.type),
  open: async (file: File): Promise<OpenResult> => {
    const mobi = await initMobiFile(file);
    const metaInfo = mobi.getMetadata?.() || {} as any;
    const title = (metaInfo.title || file.name.replace(/\.mobi$/i, '')).toString();
    const author = Array.isArray(metaInfo.author) ? metaInfo.author.join(', ') : (metaInfo.author || 'Unknown Author');

    const spine = mobi.getSpine?.() || [];
    const totalPages = Math.max(1, spine.length || 0);

    // Attempt cover
    let coverUrl: string | null = null;
    try {
      const cover = mobi.getCover?.();
      if (cover && cover.blob) {
        coverUrl = URL.createObjectURL(cover.blob);
      }
    } catch {}

    const meta: ParsedBookMeta = {
      id: `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
      title,
      author,
      coverUrl,
      totalPages,
    };

    const getToc = async (): Promise<TOCItem[]> => {
      // Always generate TOC from spine sections to ensure navigation works
      const spine = mobi.getSpine();
      console.log(`[mobiAdapter] Generating TOC from ${spine.length} spine sections`);
      
      const generatedToc: TOCItem[] = [];
      
      for (let index = 0; index < spine.length; index++) {
        const item = spine[index];
        let label = `Section ${index + 1}`;
        
        try {
          const chapter = await mobi.loadChapter(item.id);
          const html = chapter.html || '';
          
          // Try to extract meaningful title from HTML content
          const DOMParser = await getDOMParser();
          const doc = new DOMParser().parseFromString(html, 'text/html');
          
          // Look for headings in order of preference
          const headingSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
          let foundHeading = false;
          
          for (const selector of headingSelectors) {
            const heading = doc.querySelector(selector);
            if (heading && heading.textContent && heading.textContent.trim()) {
              const headingText = heading.textContent.trim();
              // Skip if it's just the book title or very short
              if (headingText.length > 3 && headingText !== title) {
                label = headingText;
                foundHeading = true;
                break;
              }
            }
          }
          
          // If no good heading found, try to extract from first paragraph or text
          if (!foundHeading) {
            const firstParagraph = doc.querySelector('p');
            if (firstParagraph && firstParagraph.textContent) {
              const text = firstParagraph.textContent.trim();
              if (text.length > 10 && text.length < 200) {
                label = text.substring(0, 100) + (text.length > 100 ? '...' : '');
              }
            }
          }
          
          // Final fallback: extract first meaningful text line
          if (label === `Section ${index + 1}`) {
            const bodyText = doc.body.textContent;
            if (bodyText) {
              const lines = bodyText.split('\n').map(s => s.trim()).filter(Boolean);
              for (const line of lines) {
                if (line.length > 10 && line.length < 200 && line !== title) {
                  label = line.substring(0, 100) + (line.length > 100 ? '...' : '');
                  break;
                }
              }
            }
          }
          
        } catch (e) {
          console.warn(`[mobiAdapter] Could not extract title for section ${index + 1}:`, e);
        }
        
        generatedToc.push({
          id: `mobi-page-${index + 1}`,
          label: label,
          href: `page-${index + 1}`,
          children: [],
        });
      }
      
      console.log(`[mobiAdapter] Generated TOC with ${generatedToc.length} items:`, generatedToc.map(item => item.label));
      return generatedToc;
    };

    const loadPage = async (index: number): Promise<{ html: string; text: string }> => {
      const pageNumber = index + 1;
      if (pageNumber < 1 || pageNumber > totalPages) throw new Error('Page index out of bounds');
      const entry = spine[index];
      const chapter = await mobi.loadChapter(entry?.id ?? index);
      const html = (chapter?.html || '').toString();
      const text = (chapter?.text || '').toString();
      return { html, text };
    };

    const dispose = () => {
      try { mobi.destroy?.(); } catch {}
    };

    return { meta, loadPage, getToc, dispose } as OpenResult;
  },
};


