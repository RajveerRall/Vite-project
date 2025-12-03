// src/context/book/formats/pdfAdapter.ts
// PDF adapter using pdfjs-dist (ESM) with Vite worker URL

import type { FormatAdapter, OpenResult, ParsedBookMeta } from './types';
import type { TOCItem } from '../../../types/books';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Use local worker instead of CDN to avoid compatibility issues
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const isPdf = (name: string, type: string) => name.toLowerCase().endsWith('.pdf') || type === 'application/pdf';

/**
 * Safely await a PDF.js render task promise
 * Handles cases where the promise property may not be a valid Promise
 */
async function safeAwaitRenderTask(renderTask: any): Promise<void> {
  if (!renderTask) {
    throw new Error('Render task is null or undefined');
  }

  if (!renderTask.promise) {
    throw new Error('Render task does not have a promise property');
  }

  // Check if it's a Promise-like object (has then method)
  if (typeof renderTask.promise.then === 'function') {
    await renderTask.promise;
    return;
  }

  // If it's already a Promise instance
  if (renderTask.promise instanceof Promise) {
    await renderTask.promise;
    return;
  }

  // Fallback: wrap in Promise.resolve if it's a value
  await Promise.resolve(renderTask.promise);
}

export const pdfAdapter: FormatAdapter = {
  id: 'pdf',
  supports: (file: File) => isPdf(file.name, file.type),
  open: async (file: File): Promise<OpenResult> => {
    const data = await file.arrayBuffer();
    const loadingTask = getDocument({ data });
    const pdf = await loadingTask.promise;

    let title = file.name.replace(/\.pdf$/i, '');
    let author = 'Unknown Author';
    try {
      const meta = await pdf.getMetadata();
      if (meta?.info) {
        const info = meta.info as any; // Type assertion for PDF metadata
        if (info.Title) title = info.Title;
        if (info.Author) author = info.Author;
      }
    } catch (error) {
      console.warn('[PDF Adapter] Error extracting metadata, using filename as title:', error);
    }

    // Render first page to a cover data URL
    let coverUrl: string | null = null;
    try {
      const page1 = await pdf.getPage(1);
      const viewport = page1.getViewport({ scale: 1.2 });
      const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
      const ctx = canvas ? canvas.getContext('2d') : null;
      if (canvas && ctx) {
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const renderTask = page1.render({ canvasContext: ctx as any, viewport });
        await safeAwaitRenderTask(renderTask);
        coverUrl = canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch (error) {
      console.warn('[PDF Adapter] Error rendering cover image, continuing without cover:', error);
      // Continue without cover - book can still be added successfully
    }

    const totalPages = pdf.numPages || 0;
    const meta: ParsedBookMeta = {
      id: `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
      title,
      author,
      coverUrl,
      totalPages,
    };

    const getToc = async (): Promise<TOCItem[]> => {
      return Array.from({ length: Math.max(1, totalPages) }, (_, i) => ({
        id: `pdf-page-${i + 1}`,
        label: `Page ${i + 1}`,
        href: `page-${i + 1}`,
        children: [],
      }));
    };

    const loadPage = async (index: number): Promise<{ html: string; text: string }> => {
      const pageNumber = index + 1;
      if (pageNumber < 1 || pageNumber > totalPages) throw new Error('Page index out of bounds');
      const page = await pdf.getPage(pageNumber);

      // Extract text content
      let extractedText = '';
      try {
        const textContent = await page.getTextContent();
        extractedText = (textContent.items || []).map((i: any) => (i?.str || '').trim()).filter(Boolean).join(' ');
      } catch (error) {
        console.warn(`[PDF Adapter] Error extracting text from page ${pageNumber}, continuing without text:`, error);
        // Continue without extracted text - page can still be rendered as image
      }

      // Simple HTML: render page to canvas -> embed as image, plus text for accessibility/search
      let html = '';
      try {
        const viewport = page.getViewport({ scale: 1.25 });
        const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
        const ctx = canvas ? canvas.getContext('2d') : null;
        if (canvas && ctx) {
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const renderTask = page.render({ canvasContext: ctx as any, viewport });
          await safeAwaitRenderTask(renderTask);
          const dataUrl = canvas.toDataURL('image/png');
          html = `<div class="pdf-page" style="display:flex;justify-content:center;">
  <img alt="PDF page ${pageNumber}" src="${dataUrl}" style="max-width:100%;height:auto;" />
  <div class="sr-only" aria-hidden="false">${(extractedText || '').replace(/</g, '&lt;')}</div>
</div>`;
        }
      } catch (error) {
        console.warn(`[PDF Adapter] Error rendering page ${pageNumber} to canvas, falling back to text-only:`, error);
        // Fallback to text-only if render fails
        html = `<div class="pdf-page"><p>${(extractedText || '').replace(/</g, '&lt;')}</p></div>`;
      }

      return { html, text: extractedText };
    };

    const dispose = () => {
      try {
        pdf.destroy();
      } catch (error) {
        console.warn('[PDF Adapter] Error disposing PDF document:', error);
      }
    };

    return { meta, loadPage, getToc, dispose } as OpenResult;
  },
};


