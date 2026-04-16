// src/utils/chapterUtils.ts
// Utility functions for chapter detection and navigation

import { TOCItem } from '../types/books';

/**
 * Find all page indices that belong to a specific chapter
 */
export function findChapterPages(
  chapter: TOCItem,
  toc: TOCItem[],
  htmlFiles: string[]
): number[] {
  if (!chapter || !chapter.href || !htmlFiles || htmlFiles.length === 0) {
    return [];
  }

  const chapterFilePath = chapter.href.split('#')[0];
  const pages: number[] = [];

  // Find all pages that match this chapter's file path
  htmlFiles.forEach((file, index) => {
    if (file.endsWith(chapterFilePath) || file === chapterFilePath) {
      pages.push(index);
    }
  });

  return pages.sort((a, b) => a - b);
}

/**
 * Find the current chapter for a given page index
 */
export function findChapterForPage(
  pageIndex: number,
  toc: TOCItem[],
  htmlFiles: string[]
): TOCItem | null {
  if (!htmlFiles || htmlFiles.length === 0 || !toc || toc.length === 0 || pageIndex < 0 || pageIndex >= htmlFiles.length) {
    return null;
  }

  const currentFile = htmlFiles[pageIndex];
  if (!currentFile) return null;

  const searchInToc = (items: TOCItem[]): TOCItem | null => {
    for (const tocItem of items) {
      if (tocItem.href) {
        const itemFilePath = tocItem.href.split('#')[0];
        if (currentFile.endsWith(itemFilePath) || currentFile === itemFilePath) {
          return tocItem;
        }
      }
      if (tocItem.children?.length) {
        const foundInChildren = searchInToc(tocItem.children);
        if (foundInChildren) return foundInChildren;
      }
    }
    return null;
  };

  return searchInToc(toc);
}

/**
 * Flatten TOC to get all chapters in order
 */
export function flattenTOC(toc: TOCItem[]): TOCItem[] {
  const flattened: TOCItem[] = [];
  
  const traverse = (items: TOCItem[]) => {
    for (const item of items) {
      // Only include items with href (actual chapters/pages)
      if (item.href) {
        flattened.push(item);
      }
      if (item.children?.length) {
        traverse(item.children);
      }
    }
  };
  
  traverse(toc);
  return flattened;
}

/**
 * Find the next chapter after the current one
 */
export function findNextChapter(
  currentChapter: TOCItem | null,
  toc: TOCItem[]
): TOCItem | null {
  if (!currentChapter || !toc || toc.length === 0) {
    return null;
  }

  const flattened = flattenTOC(toc);
  const currentIndex = flattened.findIndex(ch => ch.id === currentChapter.id || ch.href === currentChapter.href);
  
  if (currentIndex === -1 || currentIndex >= flattened.length - 1) {
    return null;
  }

  return flattened[currentIndex + 1];
}

/**
 * Find the previous chapter before the current one
 */
export function findPrevChapter(
  currentChapter: TOCItem | null,
  toc: TOCItem[]
): TOCItem | null {
  if (!currentChapter || !toc || toc.length === 0) {
    return null;
  }

  const flattened = flattenTOC(toc);
  const currentIndex = flattened.findIndex(ch => ch.id === currentChapter.id || ch.href === currentChapter.href);
  
  if (currentIndex <= 0) {
    return null;
  }

  return flattened[currentIndex - 1];
}

/**
 * Check if a page is the last page of its chapter
 */
export function isLastPageOfChapter(
  pageIndex: number,
  chapter: TOCItem | null,
  toc: TOCItem[],
  htmlFiles: string[]
): boolean {
  if (!chapter || !htmlFiles || htmlFiles.length === 0) {
    return false;
  }

  const chapterPages = findChapterPages(chapter, toc, htmlFiles);
  if (chapterPages.length === 0) {
    return false;
  }

  const lastPageOfChapter = Math.max(...chapterPages);
  return pageIndex === lastPageOfChapter;
}

