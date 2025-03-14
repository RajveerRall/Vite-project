// src/services/book-service.ts
import axios from 'axios';

export const bookService = {
  async getBookFile(id: string): Promise<Blob | null> {
    try {
      // Use axios to fetch the book file as a blob
      const response = await axios.get(`/api/books/${id}`, {
        responseType: 'blob'
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching book with id ${id}:`, error);
      return null;
    }
  },

  // Optional method to download the book
  downloadBook(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.epub`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

// Hook for easier component usage
export const useBookFile = () => {
  const fetchBookFile = async (id: string) => {
    try {
      return await bookService.getBookFile(id);
    } catch (error) {
      console.error('Book file fetch error:', error);
      return null;
    }
  };

  const downloadBook = (blob: Blob, filename: string) => {
    bookService.downloadBook(blob, filename);
  };

  return { fetchBookFile, downloadBook };
};


// // import type { NextApiRequest, NextApiResponse } from "next";
// // import fs from "fs";
// // import path from "path";

// // export default function handler(req: NextApiRequest, res: NextApiResponse) {
// //   const { id } = req.query;

// //   // Ensure ID is valid
// //   if (typeof id !== "string") {
// //     return res.status(400).json({ error: "Invalid book ID" });
// //   }

// //   // Construct file path
// //   const booksDirectory = path.join(process.cwd(), "books");
// //   const filePath = path.join(booksDirectory, `${id}.epub`);

// //   if (!fs.existsSync(filePath)) {
// //     return res.status(404).json({ error: "Book not found" });
// //   }

// //   // Read the file and serve as a stream
// //   res.setHeader("Content-Type", "application/epub+zip");
// //   res.setHeader("Content-Disposition", `inline; filename="${id}.epub"`);

// //   const fileStream = fs.createReadStream(filePath);
// //   fileStream.pipe(res);
// // }

