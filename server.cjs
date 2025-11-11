// server.js - Modified for Fly.io deployment
const express = require('express');
const cors = require('cors');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const xmlEscape = require('xml-escape');
const path = require('path'); // Import path

const app = express();

const PORT = process.env.PORT || 8080;
// --------> ADD THIS DEBUG LINE <--------
console.log(`--->>> DEBUG: Value of process.env.PORT is: '${process.env.PORT}' (Type: ${typeof process.env.PORT})`);
// --------> END DEBUG LINE <--------

// const PORT = 8080;

console.log(`--->>> DEBUG: PORT constant determined as: ${PORT}`); // Add this too

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// --- API Route ---
const handleTTS = async (req, res) => {
  // ... (keep your existing handleTTS function exactly as it is) ...
  try {
    // Get parameters from either query or body based on request method
    const params = req.method === 'GET' ? req.query : req.body;

    let { text, voice, format, rate, pitch } = params;

    // For GET requests, text might be URL encoded
    if (req.method === 'GET' && text) {
      text = decodeURIComponent(text);
    }

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Sanitize input
    const sanitizedText = xmlEscape(text);

    // Initialize TTS
    const tts = new MsEdgeTTS();

    // Set metadata
    const outputFormat = format || OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3;
    const voiceName = voice || 'en-US-BrianMultilingualNeural';
    await tts.setMetadata(voiceName, outputFormat);

    // Set appropriate content type based on format
    let contentType = 'audio/webm';
    if (outputFormat.includes('mp3')) {
      contentType = 'audio/mpeg';
    } else if (outputFormat.includes('wav')) {
      contentType = 'audio/wav';
    } else if (outputFormat.includes('opus')) {
      contentType = 'audio/ogg';
    }

    // Set headers for streaming
    res.setHeader('Content-Type', contentType);
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Generate audio stream with options
    const options = {};
    if (rate !== undefined) options.rate = parseFloat(rate);
    if (pitch !== undefined) options.pitch = pitch;

    console.log('Generating TTS with:', {
      text: sanitizedText.substring(0, 50) + (sanitizedText.length > 50 ? '...' : ''),
      voice: voiceName,
      format: outputFormat,
      options
    });

    // Generate the stream and pipe it to response
    const { audioStream } = await tts.toStream(sanitizedText, options);
    audioStream.pipe(res);

    // Handle stream errors
    audioStream.on('error', (error) => {
      console.error('Audio stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Audio stream error' });
      } else {
        res.end();
      }
    });

  } catch (error) {
    console.error('TTS error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'TTS processing error' });
    } else {
      res.end();
    }
  }
};

app.get('/api/tts', handleTTS);
app.post('/api/tts', handleTTS);

// --- Simple User Books API (No backend auth needed) ---
// This stores books in memory per session - for demo purposes
// In production, you'd want a real database
const userBooksStorage = new Map();

const handleUserBooks = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, action, book, bookId, updates } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    console.log(`[User Books API] ${action} request for user ${userId}`);

    // Get current books for this user
    const currentBooks = userBooksStorage.get(userId) || [];

    switch (action) {
      case 'save':
        const existingIndex = currentBooks.findIndex(b => b.id === book.id);
        if (existingIndex >= 0) {
          currentBooks[existingIndex] = { ...currentBooks[existingIndex], ...book };
          console.log(`[User Books API] Updated existing book: ${book.title}`);
        } else {
          currentBooks.push(book);
          console.log(`[User Books API] Added new book: ${book.title}`);
        }
        
        userBooksStorage.set(userId, currentBooks);
        break;

      case 'update':
        const updateIndex = currentBooks.findIndex(b => b.id === bookId);
        if (updateIndex >= 0) {
          currentBooks[updateIndex] = { ...currentBooks[updateIndex], ...updates };
          console.log(`[User Books API] Updated progress for book: ${bookId}`);
          userBooksStorage.set(userId, currentBooks);
        }
        break;

      case 'remove':
        const filteredBooks = currentBooks.filter(b => b.id !== bookId);
        userBooksStorage.set(userId, filteredBooks);
        console.log(`[User Books API] Removed book: ${bookId}`);
        return res.status(200).json({ success: true });

      case 'get':
        console.log(`[User Books API] Retrieved ${currentBooks.length} books for user`);
        return res.status(200).json({ books: currentBooks });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('[User Books API] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

app.post('/api/user-books', handleUserBooks);

// --- Health Check ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// --- Serve Static Frontend Files ---
// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// --- Catch-all Route ---
// For any request that doesn't match API routes or static files,
// serve the index.html file (enables client-side routing).
// IMPORTANT: This MUST come AFTER your API routes and static file serving.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


// // --- Start Server ---
// app.listen(PORT, () => {
//   // Listen on 0.0.0.0 to be accessible within the container network
//   // Note: Express listens on all available IPv4 interfaces by default,
//   // but specifying '0.0.0.0' can sometimes be necessary in container environments.
//   // Fly.io handles mapping external requests to this internal port.
//   console.log(`Server running on port ${PORT}, serving frontend and API`);
// });

// Ensure only ONE app.listen call exists if you modified it
if (typeof PORT !== 'undefined') { // Check to prevent duplicate listen if PORT was also defined
  app.listen(PORT, '0.0.0.0', () => {
     console.log(`Server running on 0.0.0.0:${PORT}, serving frontend and API`);
  });
}

// //Optional: Explicitly listen on 0.0.0.0 if needed
// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`Server running on 0.0.0.0:${PORT}, serving frontend and API`);
// });