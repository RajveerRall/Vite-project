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
  isDownloading?: boolean; // NEW: indicates if book is currently downloading
  isProcessing?: boolean; // NEW: prevents multiple rapid clicks/actions
}

export interface TOCItem {
  id: string;
  href: string;
  label: string;
  children: TOCItem[];
}
