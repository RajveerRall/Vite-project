// src/context/book/formats/mobiAdapter.ts
// MOBI adapter using @lingo-reader/mobi-parser (browser compatible)

import type { FormatAdapter, OpenResult, ParsedBookMeta } from './types';
import type { TOCItem } from '../../../types/books';
import { initMobiFile } from '@lingo-reader/mobi-parser';

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
      // Prefer explicit TOC if provided by parser
      try {
        const nav: any[] | undefined = (mobi as any).getToc?.() || (mobi as any).getNavMap?.();
        if (Array.isArray(nav) && nav.length > 0) {
          // Best-effort mapping: keep order; label from nav entry, href aligned to page-N
          return nav.map((entry: any, i: number) => ({
            id: `mobi-${i + 1}`,
            label: (entry?.title || entry?.label || `Chapter ${i + 1}`).toString(),
            href: `page-${i + 1}`,
            children: Array.isArray(entry?.children) ? entry.children.map((c: any, j: number) => ({
              id: `mobi-${i + 1}-${j + 1}`,
              label: (c?.title || c?.label || `Section ${i + 1}.${j + 1}`).toString(),
              href: `page-${Math.min(totalPages, i + 1)}`,
              children: [],
            })) : [],
          }));
        }
      } catch {}

      // Otherwise, derive chapter titles from content headings
      const extractTitleFromHtml = (html: string, fallback: string) => {
        const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (h1 && h1[1]) return h1[1].replace(/<[^>]+>/g, '').trim();
        const h2 = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
        if (h2 && h2[1]) return h2[1].replace(/<[^>]+>/g, '').trim();
        const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleTag && titleTag[1]) return titleTag[1].replace(/<[^>]+>/g, '').trim();
        const firstLine = html.replace(/\s+/g, ' ').replace(/<[^>]+>/g, ' ').trim().split(/\s{2,}|\.\s|!\s|\?\s|;\s|\n/)[0];
        if (firstLine) return firstLine.slice(0, 120);
        return fallback;
      };

      const items = spine.length ? spine : Array.from({ length: totalPages }, (_, i) => ({ id: `p${i}`, title: `Chapter ${i + 1}` } as any));
      const toc: TOCItem[] = [];
      for (let i = 0; i < items.length; i++) {
        try {
          const entry = items[i];
          const chapter = await mobi.loadChapter(entry?.id ?? i);
          const html = (chapter?.html || '').toString();
          const label = extractTitleFromHtml(html, (entry?.title || `Chapter ${i + 1}`).toString());
          toc.push({ id: `mobi-${i + 1}`, label, href: `page-${i + 1}`, children: [] });
        } catch {
          toc.push({ id: `mobi-${i + 1}`, label: (items[i]?.title || `Chapter ${i + 1}`).toString(), href: `page-${i + 1}`, children: [] });
        }
      }
      return toc;
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


