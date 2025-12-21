// src/types/book.ts
export interface BookData {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  currentPage: number;
  lastChapter?: TOCItem | null;
  file: File;
  lastRead: string;
  totalPages: number;
  progress?: number; // NEW: reading progress percentage (0-100)
  isDownloading?: boolean; // NEW: indicates if book is currently downloading
  isProcessing?: boolean; // NEW: prevents multiple rapid clicks/actions
  downloadFailed?: boolean; // NEW: indicates if book download failed
}

export interface TOCItem {
  id: string;
  href: string;
  label: string;
  children: TOCItem[];
}
