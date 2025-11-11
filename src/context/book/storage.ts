// src/context/book/storage.ts
// Storage-related helpers extracted from BookContext

import JSZip from 'jszip';
import { getDirectoryPath, resolveRelativePath } from '../../utils/pathUtils';
import { getDOMParser } from './domParser';

// Regenerate a cover URL from an EPUB file by locating the cover item via OPF metadata
export const regenerateCoverUrl = async (bookFile: File): Promise<string | null> => {
  try {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(bookFile);
    const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
    if (!containerXml) return null;

    const DOMParser = await getDOMParser();
    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXml, 'application/xml');
    const rootfiles = containerDoc.getElementsByTagName('rootfile');
    if (rootfiles.length === 0) return null;

    const opfPath = rootfiles[0].getAttribute('full-path') || '';
    const opfContent = await loadedZip.file(opfPath)?.async('text');
    if (!opfContent) return null;

    const opfDoc = parser.parseFromString(opfContent, 'application/xml');
    const metaCover = Array.from(opfDoc.getElementsByTagName('meta')).find(m => m.getAttribute('name') === 'cover');
    if (metaCover) {
      const coverId = metaCover.getAttribute('content');
      const coverItem = Array.from(opfDoc.getElementsByTagName('item')).find(item => item.getAttribute('id') === coverId);
      if (coverItem) {
        const href = coverItem.getAttribute('href');
        if (href) {
          const coverPath = resolveRelativePath(getDirectoryPath(opfPath), href);
          const coverBlob = await loadedZip.file(coverPath)?.async('blob');
          if (coverBlob) {
            return URL.createObjectURL(coverBlob);
          }
        }
      }
    }
    return null;
  } catch (error) {
    console.error('[regenerateCoverUrl] Error regenerating cover:', error);
    return null;
  }
};


