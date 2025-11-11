// src/context/book/formats/types.ts

import type { TOCItem } from '../../../types/books';

export interface ParsedBookMeta {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  totalPages: number; // number of logical pages/sections
}

export interface OpenResult {
  meta: ParsedBookMeta;
  loadPage: (index: number) => Promise<{ html: string; text: string }>; // cleaned HTML + extracted text
  getToc: () => Promise<TOCItem[]>;
  dispose?: () => void; // free resources, revoke blob URLs
}

export interface FormatAdapter {
  id: string; // 'epub' | 'pdf' | 'mobi' | ...
  supports: (file: File) => Promise<boolean> | boolean; // by extension or signature sniffing
  open: (file: File) => Promise<OpenResult>; // parse and return handlers
}


