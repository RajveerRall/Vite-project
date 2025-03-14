// // import type { NextApiRequest, NextApiResponse } from "next";
// // import fs from "fs";
// // import path from "path";
// // import AdmZip from "adm-zip"; // npm install adm-zip
// // import { XMLParser } from "fast-xml-parser"; // npm install fast-xml-parser

// // declare module 'adm-zip';

// // interface BookMetadata {
// //   id: string;
// //   title: string;
// //   author?: string;
// //   description?: string;
// // }

// // export default async function handler(
// //   req: NextApiRequest,
// //   res: NextApiResponse<BookMetadata[] | { error: string }>
// // ) {
// //   try {
// //     const booksDirectory = path.join(process.cwd(), "books");
// //     const files = await fs.promises.readdir(booksDirectory);
// //     const epubFiles = files.filter((file) => file.endsWith(".epub"));

// //     const parser = new XMLParser({
// //       ignoreAttributes: false,
// //     });

// //     // For simplicity, extract metadata from each EPUB file
// //     const booksMetadata: BookMetadata[] = await Promise.all(
// //       epubFiles.map(async (file) => {
// //         const id = path.parse(file).name;
// //         const filePath = path.join(booksDirectory, file);

// //         // Open the EPUB as a zip file.
// //         const zip = new AdmZip(filePath);
// //         // Read the container.xml file from META-INF directory.
// //         const containerEntry = zip.getEntry("META-INF/container.xml");
// //         if (!containerEntry) {
// //           throw new Error("container.xml not found in " + file);
// //         }
// //         const containerXml = containerEntry.getData().toString("utf8");
// //         const containerJson = parser.parse(containerXml);
// //         // Get the OPF file path from the container.xml.
// //         const opfPath =
// //           containerJson.container?.rootfiles?.rootfile?.["@_full-path"];
// //         if (!opfPath) {
// //           throw new Error("OPF path not found in container.xml for " + file);
// //         }
// //         // Read the OPF file.
// //         const opfEntry = zip.getEntry(opfPath);
// //         if (!opfEntry) {
// //           throw new Error("OPF file not found at " + opfPath);
// //         }
// //         const opfXml = opfEntry.getData().toString("utf8");
// //         const opfJson = parser.parse(opfXml);
// //         // Extract metadata (this structure may vary between EPUB files)
// //         const metadata = opfJson.package?.metadata;
// //         const title =
// //           metadata?.["dc:title"] ||
// //           metadata?.["title"] ||
// //           "Unknown Title";
// //         const author =
// //           metadata?.["dc:creator"] || metadata?.["creator"] || "Unknown Author";
// //         const description =
// //           metadata?.["dc:description"] ||
// //           metadata?.["description"] ||
// //           "";

// //         return {
// //           id,
// //           title: Array.isArray(title) ? title[0] : title,
// //           author: Array.isArray(author) ? author[0] : author,
// //           description: Array.isArray(description) ? description[0] : description,
// //         };
// //       })
// //     );

// //     res.status(200).json(booksMetadata);
// //   } catch (error: any) {
// //     console.error("Error extracting metadata:", error);
// //     res.status(500).json({ error: "Internal server error" });
// //   }
// // }



// import type { NextApiRequest, NextApiResponse } from "next";
// import fs from "fs";
// import path from "path";
// import AdmZip from "adm-zip"; // npm install adm-zip
// import { XMLParser } from "fast-xml-parser"; // npm install fast-xml-parser

// // Define the shape of the metadata your API returns
// interface BookMetadata {
//   id: string;        // e.g. "mybook" for "mybook.epub"
//   title: string;     // from <dc:title>
//   author?: string;   // from <dc:creator>, optional if not present
//   description?: string; // from <dc:description>, optional
// }

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<BookMetadata[] | { error: string }>
// ) {
//   try {
//     const booksDirectory = path.join(process.cwd(), "books");
//     const files = await fs.promises.readdir(booksDirectory);
//     const epubFiles = files.filter((file) => file.endsWith(".epub"));

//     const parser = new XMLParser({ ignoreAttributes: false });

//     const booksMetadata: BookMetadata[] = [];

//     for (const file of epubFiles) {
//       const id = path.parse(file).name; // "mybook.epub" => id: "mybook"
//       const filePath = path.join(booksDirectory, file);

//       // Read the EPUB as a zip file
//       const zip = new AdmZip(filePath);

//       // container.xml
//       const containerEntry = zip.getEntry("META-INF/container.xml");
//       if (!containerEntry) {
//         console.warn(`No container.xml in ${file}`);
//         continue;
//       }
//       const containerXml = containerEntry.getData().toString("utf8");
//       const containerJson = parser.parse(containerXml);

//       // OPF path
//       const opfPath = containerJson.container?.rootfiles?.rootfile?.["@_full-path"];
//       if (!opfPath) {
//         console.warn(`No OPF path found in container.xml for ${file}`);
//         continue;
//       }

//       // Read OPF
//       const opfEntry = zip.getEntry(opfPath);
//       if (!opfEntry) {
//         console.warn(`OPF file not found at ${opfPath} in ${file}`);
//         continue;
//       }
//       const opfXml = opfEntry.getData().toString("utf8");
//       const opfJson = parser.parse(opfXml);

//       const metadata = opfJson.package?.metadata;

//       // Extract <dc:title>, <dc:creator>, <dc:description>
//       let rawTitle = metadata?.["dc:title"] || "Unknown Title";
//       let rawAuthor = metadata?.["dc:creator"] || "Unknown Author";
//       let rawDescription = metadata?.["dc:description"] || "";

//       // If they come back as arrays or objects, pick the first or the #text
//       const title = Array.isArray(rawTitle) ? rawTitle[0] : rawTitle;
//       const author = Array.isArray(rawAuthor) ? rawAuthor[0] : rawAuthor;
//       const description = Array.isArray(rawDescription) ? rawDescription[0] : rawDescription;

//       booksMetadata.push({
//         id,
//         title: typeof title === "object" && title["#text"] ? title["#text"] : title,
//         author:
//           typeof author === "object" && author["#text"] ? author["#text"] : author,
//         description:
//           typeof description === "object" && description["#text"]
//             ? description["#text"]
//             : description,
//       });
//     }

//     res.status(200).json(booksMetadata);
//   } catch (error: any) {
//     console.error("Error extracting metadata:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }


import axios from 'axios';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

// Define the shape of the book metadata
export interface BookMetadata {
  id: string;        // e.g. "mybook" for "mybook.epub"
  title: string;     // from <dc:title>
  author?: string;   // from <dc:creator>, optional if not present
  description?: string; // from <dc:description>, optional
}

export const bookMetadataService = {
  async getBookMetadata(): Promise<BookMetadata[]> {
    try {
      // In a Vite project, you might want to use a backend API or simulate the metadata extraction
      const response = await axios.get('/api/books/metadata');
      return response.data;
    } catch (error) {
      console.error("Error fetching book metadata:", error);
      
      // Fallback method: use predefined or mock metadata
      return this.getMockBookMetadata();
    }
  },

  // Fallback method to generate book metadata
  getMockBookMetadata(): BookMetadata[] {
    return [
      {
        id: 'sample_book',
        title: 'Sample Book',
        author: 'John Doe',
        description: 'A sample book description'
      }
    ];
  },

  // For client-side EPUB metadata extraction (if needed)
  async extractEPUBMetadata(file: File): Promise<BookMetadata | null> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
  
      const parser = new XMLParser({ ignoreAttributes: false });
      const zip = new AdmZip(buffer);

      // container.xml
      const containerEntry = zip.getEntry("META-INF/container.xml");
      if (!containerEntry) {
        console.warn(`No container.xml in ${file.name}`);
        return null;
      }
      const containerXml = containerEntry.getData().toString("utf8");
      const containerJson = parser.parse(containerXml);

      // OPF path
      const opfPath = containerJson.container?.rootfiles?.rootfile?.["@_full-path"];
      if (!opfPath) {
        console.warn(`No OPF path found in container.xml for ${file.name}`);
        return null;
      }

      // Read OPF
      const opfEntry = zip.getEntry(opfPath);
      if (!opfEntry) {
        console.warn(`OPF file not found at ${opfPath} in ${file.name}`);
        return null;
      }
      const opfXml = opfEntry.getData().toString("utf8");
      const opfJson = parser.parse(opfXml);

      const metadata = opfJson.package?.metadata;

      // Extract <dc:title>, <dc:creator>, <dc:description>
      let rawTitle = metadata?.["dc:title"] || "Unknown Title";
      let rawAuthor = metadata?.["dc:creator"] || "Unknown Author";
      let rawDescription = metadata?.["dc:description"] || "";

      // If they come back as arrays or objects, pick the first or the #text
      const title = Array.isArray(rawTitle) ? rawTitle[0] : rawTitle;
      const author = Array.isArray(rawAuthor) ? rawAuthor[0] : rawAuthor;
      const description = Array.isArray(rawDescription) ? rawDescription[0] : rawDescription;

      return {
        id: file.name.replace('.epub', ''),
        title: typeof title === "object" && title["#text"] ? title["#text"] : title,
        author: typeof author === "object" && author["#text"] ? author["#text"] : author,
        description: typeof description === "object" && description["#text"] ? description["#text"] : description,
      };
    } catch (error) {
      console.error("Error extracting EPUB metadata:", error);
      return null;
    }
  }
};

// Hook for easier component usage
export const useBookMetadata = () => {
  const getBookMetadata = async () => {
    try {
      return await bookMetadataService.getBookMetadata();
    } catch (error) {
      console.error('Book metadata fetch error:', error);
      return [];
    }
  };

  const extractEPUBMetadata = async (file: File) => {
    try {
      return await bookMetadataService.extractEPUBMetadata(file);
    } catch (error) {
      console.error('EPUB metadata extraction error:', error);
      return null;
    }
  };

  return { getBookMetadata, extractEPUBMetadata };
};