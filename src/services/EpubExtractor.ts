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
      
      // Extract TOC - try multiple locations
      const tocMap = new Map<string, string>(); // file path -> title mapping
      let tocFound = false;
      
      // Try common TOC locations
      const tocPaths = ['OEBPS/toc.ncx', 'toc.ncx', 'OEBPS/content.opf.ncx'];
      
      for (const tocPath of tocPaths) {
        const tocContent = await loadedZip.file(tocPath)?.async('text');
        if (tocContent) {
          try {
            const tocDoc = parser.parseFromString(tocContent, 'application/xml');
            const navPoints = tocDoc.getElementsByTagName('navPoint');
            const tocDir = getDirectoryPath(tocPath);
            
            for (let i = 0; i < navPoints.length; i++) {
              const navPoint = navPoints[i];
              const navLabel = navPoint.getElementsByTagName('navLabel')[0];
              const content = navPoint.getElementsByTagName('content')[0];
              
              if (navLabel && content) {
                const title = navLabel.getElementsByTagName('text')[0]?.textContent?.trim();
                const src = content.getAttribute('src');
                
                if (title && src) {
                  // Resolve path relative to TOC file location (same as BookContext)
                  const resolvedPath = resolveRelativePath(tocDir, src);
                  // Strip fragment identifiers (#anchor)
                  const cleanPath = resolvedPath.split('#')[0];
                  tocMap.set(cleanPath, title);
                  
                  console.log(`[EpubExtractor] TOC entry: "${title}" -> "${cleanPath}"`);
                }
              }
            }
            
            tocFound = true;
            console.log(`[EpubExtractor] Loaded ${tocMap.size} chapter titles from TOC at ${tocPath}`);
            break;
          } catch (error) {
            console.warn(`[EpubExtractor] Could not parse TOC file at ${tocPath}:`, error);
          }
        }
      }
      
      if (!tocFound) {
        console.warn('[EpubExtractor] No TOC file found, will use generic chapter names');
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
          
          // Skip empty chapters (but be more lenient - 10 chars is very short)
          if (!textContent || textContent.trim().length < 10) {
            console.log(`[EpubExtractor] Skipping empty file: ${filePath} (length: ${textContent?.trim().length || 0})`);
            continue;
          }
          
          // Get chapter title from TOC, fallback to generic name
          // Try exact match first, then try without fragment
          let title = tocMap.get(filePath);
          
          if (!title) {
            // Try matching without fragment identifier
            const filePathNoFragment = filePath.split('#')[0];
            title = tocMap.get(filePathNoFragment);
          }
          
          if (!title) {
            // Fallback: use the actual chapter index (chapters.length + 1) not file index
            title = `Chapter ${chapters.length + 1}`;
            console.log(`[EpubExtractor] No TOC title found for ${filePath}, using fallback: "${title}"`);
          }
          
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
