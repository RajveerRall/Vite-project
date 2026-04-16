# Read Aloud Feature - Text-to-Speech Flow Diagram

## Complete TTS Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                READ ALOUD FEATURE FLOW                          │
└─────────────────────────────────────────────────────────────────────────────────┘

1. TEXT INPUT
   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
   │ currentPageText  │    │ currentContent  │    │ User Selection │
   │ (Plain Text)    │    │ (HTML Content)  │    │ (Highlighted)  │
   └─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
             │                      │                      │
             └──────────────────────┼──────────────────────┘
                                    │
                                    ▼
2. TEXT PROCESSING
   ┌─────────────────────────────────────────────────────────────────┐
   │                    useReaderTTS Hook                            │
   │  ┌─────────────────────────────────────────────────────────┐    │
   │  │ splitTextIntoChunks()                                  │    │
   │  │ • Split on sentence endings: (?<=[.!?])\s+            │    │
   │  │ • Filter empty chunks                                  │    │
   │  └─────────────────────────────────────────────────────────┘    │
   │                              │                                  │
   │                              ▼                                  │
   │  ┌─────────────────────────────────────────────────────────┐    │
   │  │ msedge.ts splitIntoChunks()                            │    │
   │  │ • Max length: 450 characters                           │    │
   │  │ • Split on: [^.!?\n\r]+[.!?\n\r]*\s*                   │    │
   │  │ • Break long sentences at word boundaries              │    │
   │  └─────────────────────────────────────────────────────────┘    │
   └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
3. API REQUEST PREPARATION
   ┌─────────────────────────────────────────────────────────────────┐
   │                    generateAudioBlob()                          │
   │  ┌─────────────────────────────────────────────────────────┐    │
   │  │ Request Format:                                         │    │
   │  │ • Method: POST                                          │    │
   │  │ • URL: /api/tts                                         │    │
   │  │ • Headers: Content-Type: application/json               │    │
   │  │ • Body: {                                               │    │
   │  │     text: "chunk text",                                │    │
   │  │     voice: "en-US-BrianMultilingualNeural",            │    │
   │  │     format: "audio-24khz-48kbitrate-mono-mp3",         │    │
   │  │     rate: 1.0,                                          │    │
   │  │     pitch: "medium"                                     │    │
   │  │   }                                                     │    │
   │  └─────────────────────────────────────────────────────────┘    │
   └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
4. SERVER-SIDE PROCESSING
   ┌─────────────────────────────────────────────────────────────────┐
   │                    Python Flask /api/tts                        │
   │  ┌─────────────────────────────────────────────────────────┐    │
   │  │ 1. Extract parameters from GET request:                │    │
   │  │    • text (required, URL decoded)                      │    │
   │  │    • voice (optional, defaults to Brian)              │    │
   │  │    • rate (optional, defaults to 0%)                  │    │
   │  │ 2. Validate voice against AVAILABLE_VOICES list        │    │
   │  │ 3. Clean text: replace \n,\r with spaces, strip()      │    │
   │  │ 4. Generate unique temp filename: /tmp/{uuid}.mp3     │    │
   │  │ 5. Build edge-tts command:                             │    │
   │  │    edge-tts --text "text" --voice "voice" --rate "rate" │    │
   │  │    --write-media /tmp/{uuid}.mp3                        │    │
   │  │ 6. Execute subprocess.run() with shell=True             │    │
   │  │ 7. Send file: send_file(temp_filename, mimetype='audio/mpeg') │
   │  │ 8. Cleanup: os.remove(temp_filename) in finally block  │    │
   │  └─────────────────────────────────────────────────────────┘    │
   └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
5. AUDIO RESPONSE
   ┌─────────────────────────────────────────────────────────────────┐
   │                    Client Audio Processing                      │
   │  ┌─────────────────────────────────────────────────────────┐    │
   │  │ Response Format:                                       │    │
   │  │ • Content-Type: audio/mpeg (or webm/wav/ogg)          │    │
   │  │ • Body: Binary audio stream                             │    │
   │  │ • Duration: Variable based on text length               │    │
   │  └─────────────────────────────────────────────────────────┘    │
   │                              │                                  │
   │                              ▼                                  │
   │  ┌─────────────────────────────────────────────────────────┐    │
   │  │ Client Processing:                                      │    │
   │  │ 1. response.blob() → Audio Blob                        │    │
   │  │ 2. URL.createObjectURL(blob) → Audio URL               │    │
   │  │ 3. new Audio(url) → Audio Element                       │    │
   │  │ 4. audio.play() → Start Playback                        │    │
   │  │ 5. Prefetch next 2 chunks                               │    │
   │  └─────────────────────────────────────────────────────────┘    │
   └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
6. PLAYBACK MANAGEMENT
   ┌─────────────────────────────────────────────────────────────────┐
   │                    Audio Playback Control                       │
   │  ┌─────────────────────────────────────────────────────────┐    │
   │  │ Features:                                               │    │
   │  │ • Sequential chunk playback                             │    │
   │  │ • Pause/Resume functionality                            │    │
   │  │ • Previous/Next sentence navigation                     │    │
   │  │ • Progress tracking and resume capability               │    │
   │  │ • Text highlighting during playback                    │    │
   │  │ • Error handling and retry logic                        │    │
   │  │ • Memory management (URL cleanup)                       │    │
   │  └─────────────────────────────────────────────────────────┘    │
   └─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ACTUAL SERVER IMPLEMENTATION                        │
└─────────────────────────────────────────────────────────────────────────────────┘

PYTHON FLASK SERVER (app.py):
• Framework: Flask running on port 8001
• TTS Engine: edge-tts command-line tool
• Available Voices:
  - en-US-AvaMultilingualNeural
  - en-US-EmmaMultilingualNeural  
  - en-US-BrianMultilingualNeural (default)
  - en-US-AndrewNeural

SERVER PROCESSING:
1. Extract GET parameters: text, voice, rate
2. Validate voice against AVAILABLE_VOICES list
3. Clean text: replace \n,\r with spaces, strip()
4. Generate UUID-based temp filename: /tmp/{uuid}.mp3
5. Build edge-tts command with shlex.quote() for safety
6. Execute subprocess.run() with shell=True
7. Send MP3 file via send_file() with audio/mpeg mimetype
8. Cleanup temp file in finally block

COMMAND EXECUTION:
edge-tts --text "cleaned_text" --voice "selected_voice" --rate "percentage" --write-media /tmp/{uuid}.mp3

ERROR HANDLING:
• Input validation: Required text, valid voice, proper rate format
• subprocess.CalledProcessError: TTS command failure
• FileNotFoundError: Temp file not created
• Generic Exception: Unexpected errors
• JSON error responses with appropriate HTTP status codes

ADDITIONAL ENDPOINTS:
• GET /api/voices: Returns available voices list
• GET /health: Health check endpoint

┌─────────────────────────────────────────────────────────────────────────────────┐

TEXT CHUNKING:
• Primary split: Sentence boundaries (?<=[.!?])\s+
• Secondary split: 450 character limit with word boundary fallback
• Minimum chunk size: 30% of max length to avoid tiny chunks
• Special handling for HTML content (stripped to plain text)

API REQUEST:
• Method: GET only (Python Flask server)
• URL: /api/tts?text=encoded_text&voice=voice_name&rate=percentage
• Text cleaning: Replace \n,\r with spaces, strip whitespace
• Voice: 4 available voices (Ava, Emma, Brian, Andrew)
• Rate: Percentage string (+10%, -20%, 0% default)
• Validation: Voice must be in AVAILABLE_VOICES list

AUDIO RESPONSE:
• File-based MP3 download (Python Flask server)
• Temporary file creation: /tmp/{uuid}.mp3
• Content-Type: audio/mpeg
• Automatic cleanup after file send
• edge-tts CLI tool generates MP3 files
• Chunked transfer encoding for large responses

PERFORMANCE OPTIMIZATIONS:
• Prefetching: Next 2 chunks buffered during playback
• Caching: In-memory blob storage during session
• Streaming: Real-time audio generation and playback
• Memory management: Automatic URL cleanup
• File-based: Temporary MP3 files with UUID naming
• Cleanup: Automatic file removal in finally block

ERROR HANDLING:
• Network errors: Retry logic with user feedback
• Audio errors: Graceful fallback and error messages
• Abort support: Cancellation via AbortController
• Server errors: JSON error responses with status codes
• File errors: subprocess.CalledProcessError handling
• Cleanup: Guaranteed temp file removal in finally block
