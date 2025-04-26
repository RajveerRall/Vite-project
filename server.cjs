// server.js - Modified for Fly.io deployment
const express = require('express');
const cors = require('cors');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const xmlEscape = require('xml-escape');
const path = require('path'); // Import path

const app = express();
// Fly.io sets the PORT environment variable. Default to 5100 locally if not set.
const PORT = process.env.PORT || 5100;

// CORS - Keep this, it might still be useful depending on how you make requests
app.use(cors({
  origin: '*', // Consider restricting this in production if possible
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


// --- Start Server ---
app.listen(PORT, () => {
  // Listen on 0.0.0.0 to be accessible within the container network
  // Note: Express listens on all available IPv4 interfaces by default,
  // but specifying '0.0.0.0' can sometimes be necessary in container environments.
  // Fly.io handles mapping external requests to this internal port.
  console.log(`Server running on port ${PORT}, serving frontend and API`);
});

// Optional: Explicitly listen on 0.0.0.0 if needed
// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`Server running on 0.0.0.0:${PORT}, serving frontend and API`);
// });