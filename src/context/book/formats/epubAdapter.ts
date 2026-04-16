// src/context/book/formats/epubAdapter.ts
// Thin adapter that reuses the existing EPUB logic from BookContext utilities

import JSZip from 'jszip';
import { getDirectoryPath, resolveRelativePath } from '../../../utils/pathUtils';
import { getDOMParser } from '../domParser';
import type { FormatAdapter, OpenResult, ParsedBookMeta } from './types';
import type { TOCItem } from '../../../types/books';
import { processHtmlContent, extractTextFromHtml, cleanEpubContent, deepCleanEpubContent } from '../../../utils/textExtraction';

const isEpub = (name: string) => name.toLowerCase().endsWith('.epub') || /epub\+zip/i.test(name);

export const epubAdapter: FormatAdapter = {
  id: 'epub',
  supports: (file: File) => isEpub(file.name) || file.type === 'application/epub+zip',
  open: async (file: File): Promise<OpenResult> => {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);
    const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
    if (!containerXml) throw new Error('Invalid EPUB: container.xml not found');

    const DOMParser = await getDOMParser();
    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXml, 'application/xml');
    const rootfiles = containerDoc.getElementsByTagName('rootfile');
    if (rootfiles.length === 0) throw new Error('Invalid EPUB: No rootfile found');
    const opfPath = rootfiles[0].getAttribute('full-path') || '';
    const opfContent = await loadedZip.file(opfPath)?.async('text');
    if (!opfContent) throw new Error('Invalid EPUB: OPF file not found');

    const opfDoc = parser.parseFromString(opfContent, 'application/xml');
    const title = opfDoc.getElementsByTagName('dc:title')[0]?.textContent?.trim() || 'Unknown Title';
    const author = opfDoc.getElementsByTagName('dc:creator')[0]?.textContent?.trim() || 'Unknown Author';

    let coverUrl: string | null = null;
    const metaCover = Array.from(opfDoc.getElementsByTagName('meta')).find(m => m.getAttribute('name') === 'cover');
    let coverItem;
    
    if (metaCover) {
      const coverId = metaCover.getAttribute('content');
      coverItem = Array.from(opfDoc.getElementsByTagName('item')).find(item => item.getAttribute('id') === coverId);
    }
    
    // Fallback: look for common cover IDs or properties
    if (!coverItem) {
      const items = Array.from(opfDoc.getElementsByTagName('item'));
      coverItem = items.find(item => 
        item.getAttribute('properties') === 'cover-image' || 
        item.getAttribute('id')?.toLowerCase() === 'cover' || 
        item.getAttribute('id')?.toLowerCase() === 'cover-image'
      );
    }

    if (coverItem) {
      const href = coverItem.getAttribute('href');
      if (href) {
        const coverPath = resolveRelativePath(getDirectoryPath(opfPath), href);
        const coverBlob = await loadedZip.file(coverPath)?.async('blob');
        if (coverBlob) coverUrl = URL.createObjectURL(coverBlob);
      }
    }

    const manifest = opfDoc.getElementsByTagName('manifest')[0];
    const spine = opfDoc.getElementsByTagName('spine')[0];
    if (!manifest || !spine) throw new Error('Invalid EPUB: Missing manifest or spine');
    const manifestItems = manifest.getElementsByTagName('item');
    const spineItemRefs = spine.getElementsByTagName('itemref');
    const opfDir = getDirectoryPath(opfPath);
    const fileOrder: string[] = [];
    for (let i = 0; i < spineItemRefs.length; i++) {
      const idref = spineItemRefs[i].getAttribute('idref');
      for (let j = 0; j < manifestItems.length; j++) {
        if (manifestItems[j].getAttribute('id') === idref) {
          const href = manifestItems[j].getAttribute('href');
          if (href) fileOrder.push(resolveRelativePath(opfDir, href));
          break;
        }
      }
    }

    const meta: ParsedBookMeta = {
      id: `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
      title,
      author,
      coverUrl,
      totalPages: fileOrder.length,
    };

    const getToc = async (): Promise<TOCItem[]> => {
      // Minimal TOC: fall back to spine labels here; complex TOC can reuse existing extraction if needed later
      return fileOrder.map((filePath, index) => ({
        id: `spine-toc-${index}`,
        label: filePath.substring(filePath.lastIndexOf('/') + 1).replace(/\.[^/.]+$/, '') || `Chapter ${index + 1}`,
        href: filePath,
        children: [],
      }));
    };

    const loadPage = async (index: number): Promise<{ html: string; text: string }> => {
      if (index < 0 || index >= fileOrder.length) throw new Error('Page index out of bounds');
      const filePath = fileOrder[index];
      const htmlTextContent = await loadedZip.file(filePath)?.async('text');
      if (htmlTextContent == null) throw new Error(`Could not load HTML for ${filePath}`);
      const fileDir = getDirectoryPath(filePath);
      const processedHtml = processHtmlContent(htmlTextContent, fileDir, loadedZip, filePath);
      const cleanedHtml = cleanEpubContent(processedHtml);
      const deepCleanedHtml = deepCleanEpubContent(cleanedHtml);
      const extractedText = extractTextFromHtml(deepCleanedHtml);
      return { html: deepCleanedHtml, text: extractedText };
    };

    return { meta, loadPage, getToc } as OpenResult;
  },
};


