// src/types/book.ts
export interface BookData {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  currentPage: number;
  file: File;
  lastRead: string;
}

export interface TOCItem {
  id: string;
  href: string;
  label: string;
  children: TOCItem[];
}
