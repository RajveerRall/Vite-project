// // // // // // app/api/books/route.ts
// // // // // import { NextResponse } from "next/server";
// // // // // import fs from "fs/promises";
// // // // // import path from "path";
// // // // // import Epub from "epub"; // Make sure to install an EPUB parsing library


// // // // // declare module "epub" {
// // // // //     interface Metadata {
// // // // //       cover?: string;
// // // // //     }
// // // // //   }


// // // // // // Helper function to extract metadata from an EPUB file wrapped in a promise
// // // // // function getEpubMetadata(filePath: string): Promise<any> {
// // // // //   return new Promise((resolve, reject) => {
// // // // //     const epub = new Epub(filePath);
// // // // //     epub.on("error", (err) => reject(err));
// // // // //     epub.on("end", () => {
// // // // //       // Extract title and cover image (if available)
// // // // //       const metadata = {
// // // // //         title: epub.metadata.title || "Unknown Title",
// // // // //         // The cover image is provided as an id in metadata.cover,
// // // // //         // you’d need to call epub.getImage() to retrieve it.
// // // // //         // For simplicity, assume we return a placeholder if not available.
// // // // //         cover: epub.metadata.cover ? `/api/books/cover?file=${encodeURIComponent(filePath)}` : "/covers/placeholder.jpg",
// // // // //         // You can also extract other metadata as needed.
// // // // //       };
// // // // //       resolve(metadata);
// // // // //     });
// // // // //     epub.parse();
// // // // //   });
// // // // // }

// // // // // export async function GET() {
// // // // //   const booksDirectory = path.join(process.cwd(), "books"); // Your EPUB files location
// // // // //   const files = await fs.readdir(booksDirectory);
// // // // //   const epubFiles = files.filter((file) => file.endsWith(".epub"));

// // // // //   // Process each EPUB file to extract metadata
// // // // //   const booksMetadata = await Promise.all(
// // // // //     epubFiles.map(async (fileName, index) => {
// // // // //       const filePath = path.join(booksDirectory, fileName);
// // // // //       const metadata = await getEpubMetadata(filePath);
// // // // //       return {
// // // // //         id: String(index + 1),
// // // // //         title: metadata.title,
// // // // //         cover: metadata.cover,
// // // // //         description: "Description can be added here.",
// // // // //       };
// // // // //     })
// // // // //   );

// // // // //   return NextResponse.json(booksMetadata);
// // // // // }
// // // // // pages/api/books/index.ts
// // // // import type { NextApiRequest, NextApiResponse } from "next";
// // // // import fs from "fs/promises";
// // // // import path from "path";
// // // // import Epub from "epub";

// // // // // Extend the Epub Metadata type to include a cover property.
// // // // declare module "epub" {
// // // //   interface Metadata {
// // // //     cover?: string;
// // // //   }
// // // // }

// // // // // Helper function to extract metadata from an EPUB file.
// // // // function getEpubMetadata(filePath: string): Promise<any> {
// // // //   return new Promise((resolve, reject) => {
// // // //     const epub = new Epub(filePath);
// // // //     epub.on("error", (err) => reject(err));
// // // //     epub.on("end", () => {
// // // //       const metadata = {
// // // //         title: epub.metadata.title || "Unknown Title",
// // // //         cover: epub.metadata.cover
// // // //           ? `/api/books/cover?file=${encodeURIComponent(filePath)}`
// // // //           : "/covers/placeholder.jpg",
// // // //       };
// // // //       resolve(metadata);
// // // //     });
// // // //     epub.parse();
// // // //   });
// // // // }

// // // // // Default export the API handler function.
// // // // export default async function handler(
// // // //   req: NextApiRequest,
// // // //   res: NextApiResponse
// // // // ) {
// // // //   if (req.method !== "GET") {
// // // //     res.setHeader("Allow", ["GET"]);
// // // //     return res.status(405).json({ error: "Method not allowed" });
// // // //   }

// // // //   try {
// // // //     // Assuming your books folder is at the root of your project.
// // // //     const booksDirectory = path.join(process.cwd(), "books");
// // // //     const files = await fs.readdir(booksDirectory);
// // // //     const epubFiles = files.filter((file) => file.endsWith(".epub"));

// // // //     const booksMetadata = await Promise.all(
// // // //       epubFiles.map(async (fileName, index) => {
// // // //         const filePath = path.join(booksDirectory, fileName);
// // // //         const metadata = await getEpubMetadata(filePath);
// // // //         return {
// // // //           id: String(index + 1),
// // // //           title: metadata.title,
// // // //           cover: metadata.cover,
// // // //           description: "Description can be added here.",
// // // //         };
// // // //       })
// // // //     );

// // // //     return res.status(200).json(booksMetadata);
// // // //   } catch (error) {
// // // //     console.error("Error reading books:", error);
// // // //     return res.status(500).json({ error: "Internal server error" });
// // // //   }
// // // // }

// // // import type { NextApiRequest, NextApiResponse } from "next";
// // // import fs from "fs/promises";
// // // import path from "path";
// // // import Epub from "epub";

// // // // Extend the Epub Metadata type to include a cover property.
// // // declare module "epub" {
// // //   interface Metadata {
// // //     cover?: string;
// // //   }
// // // }

// // // // Helper function to extract metadata from an EPUB file.
// // // function getEpubMetadata(filePath: string): Promise<any> {
// // //   return new Promise((resolve, reject) => {
// // //     const epub = new Epub(filePath);
// // //     epub.on("error", (err) => reject(err));
// // //     epub.on("end", () => {
// // //       const metadata = {
// // //         title: epub.metadata.title || "Unknown Title",
// // //         cover: epub.metadata.cover
// // //           ? `/api/books/cover?file=${encodeURIComponent(filePath)}`
// // //           : "/covers/placeholder.jpg",
// // //       };
// // //       resolve(metadata);
// // //     });
// // //     epub.parse();
// // //   });
// // // }

// // // export default async function handler(
// // //   req: NextApiRequest,
// // //   res: NextApiResponse
// // // ) {
// // //   if (req.method !== "GET") {
// // //     res.setHeader("Allow", ["GET"]);
// // //     return res.status(405).json({ error: "Method not allowed" });
// // //   }

// // //   try {
// // //     // Read the "books" folder at the project root.
// // //     const booksDirectory = path.join(process.cwd(), "books");
// // //     const files = await fs.readdir(booksDirectory);
// // //     const epubFiles = files.filter((file) => file.endsWith(".epub"));

// // //     // For simplicity, assign numeric IDs (as strings)
// // //     const booksMetadata = await Promise.all(
// // //       epubFiles.map(async (fileName, index) => {
// // //         const filePath = path.join(booksDirectory, fileName);
// // //         const metadata = await getEpubMetadata(filePath);
// // //         return {
// // //           id: String(index + 1),
// // //           title: metadata.title,
// // //           cover: metadata.cover,
// // //           description: "Description can be added here.",
// // //         };
// // //       })
// // //     );

// // //     res.status(200).json(booksMetadata);
// // //   } catch (error) {
// // //     console.error("Error reading books:", error);
// // //     res.status(500).json({ error: "Internal server error" });
// // //   }
// // // }



// // import type { NextApiRequest, NextApiResponse } from 'next';
// // import fs from 'fs/promises';
// // import path from 'path';

// // interface BookMeta {
// //   id: string;
// //   title: string;
// //   description: string;
// // }

// // export default async function handler(
// //   req: NextApiRequest,
// //   res: NextApiResponse<BookMeta[] | { error: string }>
// // ) {
// //   try {
// //     const booksDirectory = path.join(process.cwd(), 'books');
// //     const files = await fs.readdir(booksDirectory);
// //     const epubFiles = files.filter((file) => file.endsWith('.epub'));

// //     // For each EPUB file, we use the file name (without extension) as its id/title.
// //     const books: BookMeta[] = epubFiles.map((file) => {
// //       const { name } = path.parse(file);
// //       // Optionally, replace underscores with spaces if your file names use them.
// //       const title = name.replace(/_/g, ' ');
// //       return {
// //         id: name,
// //         title,
// //         description: "", // No description info available; can be updated later.
// //       };
// //     });

// //     res.status(200).json(books);
// //   } catch (error: any) {
// //     console.error("Error reading books folder:", error);
// //     res.status(500).json({ error: "Internal server error" });
// //   }
// // }



// import type { NextApiRequest, NextApiResponse } from 'next';
// import fs from 'fs/promises';
// import path from 'path';

// interface BookMeta {
//   id: string;
//   title: string;
//   description: string;
// }

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<BookMeta[] | { error: string }>
// ) {
//   try {
//     const booksDirectory = path.join(process.cwd(), 'books');
//     const files = await fs.readdir(booksDirectory);
//     const epubFiles = files.filter((file) => file.endsWith('.epub'));

//     // Use file names (without extension) as the id and title
//     const books: BookMeta[] = epubFiles.map((file) => {
//       const { name } = path.parse(file);
//       const title = name.replace(/_/g, ' ');
//       return {
//         id: name, // id is the file name without extension
//         title,
//         description: "", // or any description you wish to add
//       };
//     });

//     res.status(200).json(books);
//   } catch (error: any) {
//     console.error("Error reading books folder:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }


import axios from 'axios';

export interface BookMeta {
  id: string;
  title: string;
  description: string;
}

export const booksService = {
  async getBooksList(): Promise<BookMeta[]> {
    try {
      // In a Vite project, you might want to use a backend API or simulate the file reading
      const response = await axios.get('/api/books');
      return response.data;
    } catch (error) {
      console.error("Error fetching books:", error);
      
      // Fallback method: use local files or predefined list
      const localBooks: BookMeta[] = this.getLocalBooksList();
      return localBooks;
    }
  },

  // Fallback method to generate book list from filenames
  getLocalBooksList(): BookMeta[] {
    // This would typically be replaced with actual file reading on the backend
    // For now, we'll use a predefined list or mock data
    return [
      {
        id: 'sample_book_1',
        title: 'Sample Book 1',
        description: 'A sample book description'
      },
      {
        id: 'sample_book_2',
        title: 'Sample Book 2',
        description: 'Another sample book description'
      }
    ];
  }
};

// Hook for easier component usage
export const useBooksList = () => {
  const getBooksList = async () => {
    try {
      return await booksService.getBooksList();
    } catch (error) {
      console.error('Books list fetch error:', error);
      return [];
    }
  };

  return { getBooksList };
};