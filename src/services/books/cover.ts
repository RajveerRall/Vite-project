// import type { NextApiRequest, NextApiResponse } from 'next';
// import fs from 'fs';
// import path from 'path';

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   // For now, always return a placeholder cover image
//   const coverPath = path.join(process.cwd(), 'public', 'covers', 'placeholder.jpg');
//   try {
//     const coverBuffer = fs.readFileSync(coverPath);
//     res.setHeader('Content-Type', 'image/jpeg');
//     res.status(200).send(coverBuffer);
//   } catch (error) {
//     res.status(500).json({ error: 'Cover image not found' });
//   }
// }


import axios from 'axios';

export const bookCoverService = {
  async getBookCover(bookId?: string): Promise<string> {
    try {
      // In a Vite project, static assets are typically stored in the 'public' folder
      const response = await axios.get('/covers/placeholder.jpg', {
        responseType: 'blob'
      });
      
      // Convert the blob to a data URL
      return URL.createObjectURL(response.data);
    } catch (error) {
      console.error('Error fetching book cover:', error);
      // Fallback to a default cover or throw an error
      throw new Error('Cover image not found');
    }
  }
};

// Optional: Hook for easier component usage
export const useBookCover = () => {
  const getBookCover = async (bookId?: string) => {
    try {
      return await bookCoverService.getBookCover(bookId);
    } catch (error) {
      console.error('Book cover fetch error:', error);
      return null;
    }
  };

  return { getBookCover };
};