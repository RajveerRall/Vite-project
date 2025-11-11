// src/context/book/formats/registry.ts

import type { FormatAdapter } from './types';

const adapters: FormatAdapter[] = [];

export const registerAdapter = (adapter: FormatAdapter) => {
  adapters.push(adapter);
};

export const getAdapterForFile = async (file: File): Promise<FormatAdapter | null> => {
  for (const adapter of adapters) {
    try {
      const ok = await adapter.supports(file);
      if (ok) return adapter;
    } catch {}
  }
  return null;
};

export const listAdapters = (): string[] => adapters.map(a => a.id);


