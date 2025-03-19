// // server.js - A simple Express server to proxy TTS requests
// const express = require('express');
// const cors = require('cors');
// const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
// const { Readable } = require('stream');
// const xmlEscape = require('xml-escape');

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Enable CORS
// app.use(cors());
// app.use(express.json());

// // TTS endpoint
// app.post('/api/tts', async (req, res) => {
//   try {
//     const { text, voice, format, rate, pitch } = req.body;
    
//     if (!text) {
//       return res.status(400).json({ error: 'Text is required' });
//     }
    
//     // Sanitize input
//     const sanitizedText = xmlEscape(text);
    
//     // Initialize TTS
//     const tts = new MsEdgeTTS();
    
//     // Set metadata
//     const outputFormat = format || OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS;
//     const voiceName = voice || 'en-US-BrianMultilingualNeural';
//     await tts.setMetadata(voiceName, outputFormat);
    
//     // Set appropriate content type based on format
//     let contentType = 'audio/webm';
//     if (outputFormat.includes('mp3')) {
//       contentType = 'audio/mpeg';
//     } else if (outputFormat.includes('wav')) {
//       contentType = 'audio/wav';
//     } else if (outputFormat.includes('opus')) {
//       contentType = 'audio/ogg';
//     }
    
//     res.setHeader('Content-Type', contentType);
    
//     // Generate audio stream
//     const options = {};
//     if (rate !== undefined) options.rate = parseFloat(rate);
//     if (pitch !== undefined) options.pitch = pitch;
    
//     const { audioStream } = await tts.toStream(sanitizedText, options);
    
//     // Pipe the audio stream to the response
//     audioStream.pipe(res);
    
//     // Handle errors
//     audioStream.on('error', (error) => {
//       console.error('Audio stream error:', error);
//       if (!res.headersSent) {
//         res.status(500).json({ error: 'Audio stream error' });
//       }
//     });
    
//   } catch (error) {
//     console.error('TTS error:', error);
//     if (!res.headersSent) {
//       res.status(500).json({ error: 'TTS processing error' });
//     }
//   }
// });

// // Start the server
// app.listen(PORT, () => {
//   console.log(`TTS proxy server running on port ${PORT}`);
// });


// server.js - Simplified streaming TTS server with GET and POST support
const express = require('express');
const cors = require('cors');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const xmlEscape = require('xml-escape');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with more permissive settings
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// A function to handle TTS for both GET and POST requests
const handleTTS = async (req, res) => {
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

// Support both GET and POST methods
app.get('/api/tts', handleTTS);
app.post('/api/tts', handleTTS);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`TTS proxy server running on port ${PORT}`);
});