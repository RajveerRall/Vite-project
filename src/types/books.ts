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
}

export interface TOCItem {
  id: string;
  href: string;
  label: string;
  children: TOCItem[];
}
