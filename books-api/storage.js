// books-api/storage.js
const fs = require('fs').promises;
const path = require('path');

class BookStorage {
  constructor() {
    this.dataDir = path.join(__dirname, 'data');
    this.ensureDataDirectory();
  }

  async ensureDataDirectory() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create data directory:', error);
    }
  }

  getUserDataPath(userId) {
    return path.join(this.dataDir, `${userId}.json`);
  }

  async getBooks(userId) {
    try {
      const userDataPath = this.getUserDataPath(userId);
      const data = await fs.readFile(userDataPath, 'utf8');
      const userData = JSON.parse(data);
      return userData.books || [];
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return empty array
        return [];
      }
      console.error(`Error reading books for user ${userId}:`, error);
      throw error;
    }
  }

  async saveUserData(userId, data) {
    try {
      const userDataPath = this.getUserDataPath(userId);
      await fs.writeFile(userDataPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error(`Error saving data for user ${userId}:`, error);
      throw error;
    }
  }

  async saveBook(userId, book) {
    try {
      const currentBooks = await this.getBooks(userId);
      
      // Check if book already exists
      const existingIndex = currentBooks.findIndex(b => b.id === book.id);
      
      if (existingIndex >= 0) {
        // Update existing book
        currentBooks[existingIndex] = { ...currentBooks[existingIndex], ...book };
      } else {
        // Add new book
        currentBooks.push(book);
      }

      await this.saveUserData(userId, { 
        books: currentBooks,
        lastUpdated: new Date().toISOString()
      });

      return book;
    } catch (error) {
      console.error(`Error saving book for user ${userId}:`, error);
      throw error;
    }
  }

  async updateBook(userId, bookId, updates) {
    try {
      const currentBooks = await this.getBooks(userId);
      const bookIndex = currentBooks.findIndex(b => b.id === bookId);
      
      if (bookIndex === -1) {
        throw new Error(`Book with ID ${bookId} not found for user ${userId}`);
      }

      // Update the book
      currentBooks[bookIndex] = { 
        ...currentBooks[bookIndex], 
        ...updates,
        lastRead: new Date().toISOString()
      };

      await this.saveUserData(userId, { 
        books: currentBooks,
        lastUpdated: new Date().toISOString()
      });

      return currentBooks[bookIndex];
    } catch (error) {
      console.error(`Error updating book ${bookId} for user ${userId}:`, error);
      throw error;
    }
  }

  async removeBook(userId, bookId) {
    try {
      const currentBooks = await this.getBooks(userId);
      const filteredBooks = currentBooks.filter(b => b.id !== bookId);
      
      if (filteredBooks.length === currentBooks.length) {
        // Book wasn't found, but that's okay
        console.log(`Book ${bookId} not found for user ${userId}, nothing to remove`);
        return;
      }

      await this.saveUserData(userId, { 
        books: filteredBooks,
        lastUpdated: new Date().toISOString()
      });

      console.log(`Successfully removed book ${bookId} for user ${userId}`);
    } catch (error) {
      console.error(`Error removing book ${bookId} for user ${userId}:`, error);
      throw error;
    }
  }

  // Get storage statistics
  async getStats() {
    try {
      const files = await fs.readdir(this.dataDir);
      const userFiles = files.filter(f => f.endsWith('.json'));
      
      let totalBooks = 0;
      for (const file of userFiles) {
        const userId = path.basename(file, '.json');
        const books = await this.getBooks(userId);
        totalBooks += books.length;
      }

      return {
        totalUsers: userFiles.length,
        totalBooks: totalBooks,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalUsers: 0,
        totalBooks: 0,
        error: error.message
      };
    }
  }
}

module.exports = BookStorage;
