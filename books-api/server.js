// books-api/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

// Import our storage module
const BookStorage = require('./storage');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: [
        'http://localhost:5173', 
        'http://localhost:3000',
        'http://161.35.186.252:5173', // Your droplet frontend
        'https://161.35.186.252:5173', // If using HTTPS
        'http://161.35.186.252:3000',  // Your main app server
        'https://161.35.186.252:3000',  // If using HTTPS
        'http://161.35.186.252:3001',  // Your main app server
        'https://161.35.186.252:3001'
      ], // Allow your React app
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' })); // Allow large book files
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize storage
const storage = new BookStorage();

// --- API Routes ---

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'Books API',
    timestamp: new Date().toISOString()
  });
});

// Books API endpoints
app.post('/api/books', async (req, res) => {
  try {
    const { userId, action, book, bookId, updates } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    console.log(`[Books API] ${action} request for user: ${userId}`);

    switch (action) {
      case 'save':
        if (!book) {
          return res.status(400).json({ error: 'Book data is required for save action' });
        }
        await storage.saveBook(userId, book);
        console.log(`[Books API] Saved book: ${book.title} for user: ${userId}`);
        break;

      case 'update':
        if (!bookId || !updates) {
          return res.status(400).json({ error: 'Book ID and updates are required for update action' });
        }
        await storage.updateBook(userId, bookId, updates);
        console.log(`[Books API] Updated book: ${bookId} for user: ${userId}`);
        break;

      case 'remove':
        if (!bookId) {
          return res.status(400).json({ error: 'Book ID is required for remove action' });
        }
        await storage.removeBook(userId, bookId);
        console.log(`[Books API] Removed book: ${bookId} for user: ${userId}`);
        break;

      case 'get':
        const books = await storage.getBooks(userId);
        console.log(`[Books API] Retrieved ${books.length} books for user: ${userId}`);
        return res.status(200).json({ books });

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('[Books API] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Catch-all for unknown routes
app.all('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found` 
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('[Books API] Unhandled Error:', error);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: error.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`📚 Books API Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 Books API: http://localhost:${PORT}/api/books`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📚 Books API Server shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📚 Books API Server shutting down gracefully...');
  process.exit(0);
});
