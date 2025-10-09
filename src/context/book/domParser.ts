// src/context/book/domParser.ts
// Thin wrapper to dynamically import DOMParser without blocking initial load

export const getDOMParser = async (): Promise<typeof import('xmldom').DOMParser> => {
  const { DOMParser } = await import('xmldom');
  return DOMParser;
};


