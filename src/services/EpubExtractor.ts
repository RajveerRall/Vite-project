import { extractTextFromHtml, processHtmlContent, cleanEpubContent } from '../utils/textExtraction';
import { getDirectoryPath, resolveRelativePath } from '../utils/pathUtils';

export interface Chapter {
  index: number;
  title: string;
  content: string;
  estimatedDuration: number;
}

export class EpubExtractor {
  async extractChapters(epubFile: File): Promise<Chapter[]> {
    try {
      console.log('[EpubExtractor] Starting EPUB parsing...');
      
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(epubFile);
      
      console.log('[EpubExtractor] EPUB ZIP loaded successfully');
    
      // Parse container.xml
      const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
      if (!containerXml) throw new Error('Invalid EPUB: container.xml not found');
      
      console.log('[EpubExtractor] Parsing container.xml...');
      const { getDOMParser } = await import('../context/book/domParser');
      const DOMParser = await getDOMParser();
      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerXml, 'application/xml');
      const rootfiles = containerDoc.getElementsByTagName('rootfile');
      if (rootfiles.length === 0) throw new Error('Invalid EPUB: No rootfile found');
      
      const opfPath = rootfiles[0].getAttribute('full-path') || '';
      const opfContent = await loadedZip.file(opfPath)?.async('text');
      if (!opfContent) throw new Error('Invalid EPUB: OPF file not found');
      
      const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      const manifestElement = opfDoc.getElementsByTagName('manifest')[0];
      const spineElement = opfDoc.getElementsByTagName('spine')[0];
      if (!manifestElement || !spineElement) throw new Error('Invalid EPUB: Missing manifest or spine');
      
      // Extract spine order
      const manifestItems = manifestElement.getElementsByTagName('item');
      const spineItemRefs = spineElement.getElementsByTagName('itemref');
      const opfDir = getDirectoryPath(opfPath);
      
      const fileOrder: string[] = [];
      for (let i = 0; i < spineItemRefs.length; i++) {
        const idref = spineItemRefs[i].getAttribute('idref');
        for (let j = 0; j < manifestItems.length; j++) {
          if (manifestItems[j].getAttribute('id') === idref) {
            const href = manifestItems[j].getAttribute('href');
            if (href) fileOrder.push(resolveRelativePath(opfDir, href));
            break;
          }
        }
      }
      
      // Extract TOC from toc.ncx file
      const tocContent = await loadedZip.file('OEBPS/toc.ncx')?.async('text');
      const tocMap = new Map<string, string>(); // file path -> title mapping
      
      if (tocContent) {
        try {
          const tocDoc = parser.parseFromString(tocContent, 'application/xml');
          const navPoints = tocDoc.getElementsByTagName('navPoint');
          
          for (let i = 0; i < navPoints.length; i++) {
            const navPoint = navPoints[i];
            const navLabel = navPoint.getElementsByTagName('navLabel')[0];
            const content = navPoint.getElementsByTagName('content')[0];
            
            if (navLabel && content) {
              const title = navLabel.getElementsByTagName('text')[0]?.textContent?.trim();
              const src = content.getAttribute('src');
              
              if (title && src) {
                // Convert src path to match our file paths
                const filePath = src.startsWith('html/') ? `OEBPS/${src}` : `OEBPS/html/${src}`;
                tocMap.set(filePath, title);
              }
            }
          }
          
          console.log(`[EpubExtractor] Loaded ${tocMap.size} chapter titles from TOC`);
        } catch (error) {
          console.warn('[EpubExtractor] Could not parse TOC file:', error);
        }
      }
      
      // Extract chapters
      const chapters: Chapter[] = [];
      
      for (let i = 0; i < fileOrder.length; i++) {
        const filePath = fileOrder[i];
        const htmlContent = await loadedZip.file(filePath)?.async('text');
        
        if (htmlContent) {
          // Clean HTML content using existing utilities
          const processedHtml = processHtmlContent(htmlContent, getDirectoryPath(filePath), loadedZip, filePath);
          const cleanedHtml = cleanEpubContent(processedHtml);
          const textContent = extractTextFromHtml(cleanedHtml);
          
          // Skip empty chapters
          if (!textContent || textContent.trim().length < 10) continue;
          
          // Get chapter title from TOC, fallback to generic name
          let title = tocMap.get(filePath) || `Chapter ${i + 1}`;
          
          // Clean up the title (remove extra whitespace, etc.)
          title = title.replace(/\s+/g, ' ').trim();
          
          // Estimate duration (assuming 150 words per minute)
          const wordCount = textContent.split(/\s+/).length;
          const estimatedDuration = (wordCount / 150) * 60; // seconds
          
          chapters.push({
            index: chapters.length, // Use actual chapter count, not file index
            title,
            content: textContent,
            estimatedDuration
          });
          
          console.log(`[EpubExtractor] Extracted chapter ${chapters.length}: "${title}" (${wordCount} words, ~${estimatedDuration.toFixed(1)}s)`);
        }
      }
      
      console.log(`[EpubExtractor] Successfully extracted ${chapters.length} chapters`);
      return chapters;
      
    } catch (error) {
      console.error('[EpubExtractor] Error extracting chapters from EPUB:', error);
      throw new Error(`Failed to parse EPUB: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
