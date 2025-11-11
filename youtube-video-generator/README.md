# YouTube Video Generator

A Python FastAPI server that generates YouTube videos from audiobook audio files and text.

## Features

- 🎬 Generate MP4 videos with scrolling text
- 🎵 Synchronized audio playback
- 📊 Progress bar with timestamps
- 🎨 Professional 1920x1080 YouTube format
- ⚡ Smooth easing animations
- 🔄 CORS enabled for frontend integration

## Quick Setup

### Windows
```bash
# Run the setup script
setup.bat
```

### macOS/Linux
```bash
# Make setup script executable and run
chmod +x setup.sh
./setup.sh
```

### Manual Setup
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start server
python server.py
```

## Prerequisites

- Python 3.8+
- FFmpeg (for video encoding)
- Your existing audiobook system running

## Usage

1. **Start the server:**
   ```bash
   python server.py
   ```
   Server runs on `http://localhost:8000`

2. **Generate audiobook** in your frontend app

3. **Click "Video" button** next to any generated chapter

4. **Video downloads automatically** as MP4 file

## API Endpoints

### Generate Video
**POST** `/generate-video`

**Form Data:**
- `audio`: Audio file (MP3/M4A)
- `text`: Chapter text to display
- `book_title`: Book name
- `chapter_title`: Chapter name
- `author`: Author name

**Response:** MP4 video file

### API Documentation
Visit `http://localhost:8000/docs` for interactive API documentation.

## Testing

Run the test suite:
```bash
python test_server.py
```

This will:
- Check if server is running
- Test video generation with sample data
- Create a test MP4 file

## Integration with Frontend

The frontend integration is already added to `src/pages/EpubToAudiobook.tsx`:

- ✅ "Video" button added to chapter list
- ✅ Handles audio blob and text data
- ✅ Downloads MP4 automatically
- ✅ Error handling and loading states

## Video Specifications

- **Resolution:** 1920x1080 (YouTube standard)
- **Format:** MP4 (H.264 codec)
- **Frame Rate:** 24 FPS
- **Audio:** AAC codec
- **Bitrate:** 8000kbps

## Troubleshooting

### Server won't start
- Check if port 8000 is available
- Ensure all dependencies are installed
- Check Python version (3.8+ required)

### Video generation fails
- Verify FFmpeg is installed and in PATH
- Check audio file format (MP3/M4A supported)
- Ensure sufficient disk space for temp files

### Frontend can't connect
- Verify server is running on localhost:8000
- Check CORS settings in server.py
- Ensure no firewall blocking the connection

## File Structure

```
youtube-video-generator/
├── server.py              # Main FastAPI application
├── requirements.txt       # Python dependencies
├── test_server.py         # Test suite
├── setup.sh              # macOS/Linux setup script
├── setup.bat              # Windows setup script
└── README.md              # This file
```

## Next Steps

After successful setup:

1. **Test with sample data** using `test_server.py`
2. **Generate an audiobook chapter** in your app
3. **Click the "Video" button** to create your first video
4. **Upload to YouTube** and enjoy your audiobook video!

## Support

If you encounter issues:
1. Check the server logs for error messages
2. Verify all prerequisites are installed
3. Test with the provided test script
4. Check the API documentation at `/docs`
