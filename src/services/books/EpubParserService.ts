
import JSZip from 'jszip';
import { getDirectoryPath, resolveRelativePath } from '../../utils/pathUtils';
import { TOCItem } from '@/types/books';
import { getDOMParser } from '../../context/book/domParser';

export interface EpubStructure {
    zip: JSZip;
    opfPath: string;
    spine: string[]; // List of file paths in order
    toc: TOCItem[];
    metadata: {
        title: string;
        author: string;
    };
}

/**
 * Service to parse EPUB files (Zip) and extract structure (Spine, TOC)
 */
export class EpubParserService {

    /**
     * Load and Parse EPUB file
     */
    static async parseEpub(file: Blob | File): Promise<EpubStructure> {
        console.log('[EpubParser] Loading ZIP...');
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(file);

        // 1. Locate OPF via container.xml
        const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
        if (!containerXml) throw new Error('EPUB Load Error: META-INF/container.xml not found');

        const DOMParser = await getDOMParser();
        const parser = new DOMParser();
        const containerDoc = parser.parseFromString(containerXml, 'application/xml');
        const rootfiles = containerDoc.getElementsByTagName('rootfile');
        if (rootfiles.length === 0) throw new Error('EPUB Load Error: No rootfile in container.xml');

        const opfPath = rootfiles[0].getAttribute('full-path') || '';
        if (!opfPath) throw new Error('EPUB Load Error: Empty full-path in container.xml');

        // 2. Parse OPF
        const opfFileDir = getDirectoryPath(opfPath);
        const opfContent = await loadedZip.file(opfPath)?.async('text');
        if (!opfContent) throw new Error(`EPUB Load Error: OPF file not found at ${opfPath}`);

        const opfDoc = parser.parseFromString(opfContent, 'application/xml');
        const manifestElement = opfDoc.getElementsByTagName('manifest')[0];
        const spineElement = opfDoc.getElementsByTagName('spine')[0];
        const metadataElement = opfDoc.getElementsByTagName('metadata')[0];

        if (!manifestElement || !spineElement) throw new Error('EPUB Load Error: Missing manifest or spine.');

        // 3. Extract Metadata
        const title = metadataElement?.getElementsByTagName('dc:title')[0]?.textContent || 'Unknown Title';
        const author = metadataElement?.getElementsByTagName('dc:creator')[0]?.textContent || 'Unknown Author';

        // 4. Build Spine (File Order)
        const manifestItems = manifestElement.getElementsByTagName('item');
        const spineItemRefs = spineElement.getElementsByTagName('itemref');
        const spine: string[] = [];

        // Map id -> href
        const idToHref = new Map<string, string>();
        for (let i = 0; i < manifestItems.length; i++) {
            const item = manifestItems[i];
            const id = item.getAttribute('id');
            const href = item.getAttribute('href');
            if (id && href) {
                idToHref.set(id, resolveRelativePath(opfFileDir, href));
            }
        }

        for (let i = 0; i < spineItemRefs.length; i++) {
            const idref = spineItemRefs[i].getAttribute('idref');
            if (idref && idToHref.has(idref)) {
                spine.push(idToHref.get(idref)!);
            } else {
                console.warn(`[EpubParser] Spine item ${idref} missing from manifest`);
            }
        }

        if (spine.length === 0) throw new Error("EPUB Load Error: No content files in spine.");

        // 5. Extract TOC
        const toc = await this.extractToc(loadedZip, manifestItems, spineElement, opfFileDir, parser, spine);

        return {
            zip: loadedZip,
            opfPath,
            spine,
            toc,
            metadata: { title, author }
        };
    }

    /**
     * Helper to extract TOC (NCX or NAV)
     */
    private static async extractToc(
        zip: JSZip,
        manifestItems: HTMLCollectionOf<Element>,
        spineElement: Element | null,
        opfFileDir: string,
        parser: DOMParser,
        spine: string[]
    ): Promise<TOCItem[]> {
        // Re-implementing extractTocFromEntries logic here
        let tocPath = '';
        let tocItems: TOCItem[] = [];
        let tocFound = false;

        // Try EPUB3 Nav first
        for (let i = 0; i < manifestItems.length; i++) {
            const item = manifestItems[i];
            const properties = item.getAttribute('properties');
            if (properties && properties.includes('nav')) {
                const href = item.getAttribute('href');
                if (href) {
                    tocPath = resolveRelativePath(opfFileDir, href);
                    try {
                        const navContent = await zip.file(tocPath)?.async('text');
                        if (navContent) {
                            // NAV parsing logic...
                            const navDoc = parser.parseFromString(navContent, 'application/xhtml+xml');
                            const navElements = navDoc.getElementsByTagName('nav');
                            for (let k = 0; k < navElements.length; k++) {
                                if (navElements[k].getAttribute('epub:type') === 'toc') {
                                    const ol = navElements[k].getElementsByTagName('ol')[0];
                                    if (ol) {
                                        tocItems = this.parseNavOl(ol, tocPath);
                                        tocFound = true;
                                        break;
                                    }
                                }
                            }
                        }
                    } catch (e) { console.error("Error parsing EPUB3 nav:", tocPath, e); }
                    if (tocFound) break;
                }
            }
        }

        // Try NCX (EPUB2)
        if (!tocFound && spineElement) {
            let ncxHref = '';
            const tocId = spineElement.getAttribute('toc');

            if (tocId) {
                const item = Array.from(manifestItems).find(item => item.getAttribute('id') === tocId);
                if (item) ncxHref = item.getAttribute('href') || '';
            } else {
                // Fallback: look for ncx media type
                const item = Array.from(manifestItems).find(item => item.getAttribute('media-type') === 'application/x-dtbncx+xml');
                if (item) ncxHref = item.getAttribute('href') || '';
            }

            if (ncxHref) {
                tocPath = resolveRelativePath(opfFileDir, ncxHref);
                try {
                    const ncxContent = await zip.file(tocPath)?.async('text');
                    if (ncxContent) {
                        const ncxDoc = parser.parseFromString(ncxContent, 'application/xml');
                        const navMap = ncxDoc.getElementsByTagName('navMap')[0];
                        if (navMap) {
                            tocItems = this.parseNcxNavPoints(navMap, tocPath);
                            tocFound = true;
                        }
                    }
                } catch (e) { console.error("Error parsing NCX:", tocPath, e); }
            }
        }

        // Fallback to Spine
        if (!tocFound || tocItems.length === 0) {
            tocItems = spine.map((filePath, index) => ({
                id: `spine-toc-${index}`,
                label: `Chapter ${index + 1}`,
                href: filePath,
                children: []
            }));
        }

        return tocItems;
    }

    // Recursive NCX parser
    private static parseNcxNavPoints(parentElement: Element, currentNcxDocPath: string): TOCItem[] {
        const children: TOCItem[] = [];
        const navPoints = Array.from(parentElement.childNodes).filter(n => n.nodeName === 'navPoint') as Element[];

        navPoints.forEach((navPoint) => {
            const navLabel = navPoint.getElementsByTagName('navLabel')[0]?.getElementsByTagName('text')[0]?.textContent?.trim() || 'Untitled';
            const contentSrc = navPoint.getElementsByTagName('content')[0]?.getAttribute('src') || '';
            const resolvedSrc = resolveRelativePath(getDirectoryPath(currentNcxDocPath), contentSrc);

            const item: TOCItem = {
                id: navPoint.getAttribute('id') || `toc-ncx-${resolvedSrc}`,
                label: navLabel,
                href: resolvedSrc,
                children: this.parseNcxNavPoints(navPoint, currentNcxDocPath),
            };
            children.push(item);
        });
        return children;
    }

    // Recursive NAV parser
    private static parseNavOl(element: Element, currentNavDocPath: string): TOCItem[] {
        const children: TOCItem[] = [];
        const listItems = Array.from(element.childNodes).filter(n => n.nodeName === 'li') as Element[];

        listItems.forEach((li, index) => {
            const anchor = li.getElementsByTagName('a')[0];
            if (anchor) {
                const tocHref = anchor.getAttribute('href') || '';
                const resolvedHref = resolveRelativePath(getDirectoryPath(currentNavDocPath), tocHref);

                const childItem: TOCItem = {
                    id: `toc-nav-${resolvedHref}-${index}`,
                    label: anchor.textContent?.trim() || 'Untitled',
                    href: resolvedHref,
                    children: [],
                };

                const nestedOl = li.getElementsByTagName('ol')[0];
                if (nestedOl) childItem.children = this.parseNavOl(nestedOl, currentNavDocPath);

                children.push(childItem);
            }
        });
        return children;
    }
}
