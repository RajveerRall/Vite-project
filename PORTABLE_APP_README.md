# YoRead Portable Desktop Application

This document describes how to build and use the portable desktop version of YoRead.

## Overview

The portable desktop app bundles:
- **React Frontend** - The main application UI
- **Full Cast TTS Server** - Node.js server for AI voice generation
- **Video Generator Server** - Python server for video creation

All components are packaged as standalone executables that can run on Windows without requiring Node.js or Python to be installed.

## Quick Start

### For End Users

1. **Extract the portable package** to any directory
2. **Run `launcher\start-app.bat`**
3. **Wait for servers to start** (you'll see confirmation messages)
4. **Open your browser** to the frontend URL (usually provided in the launcher output)

### For Developers

1. **Build the executables:**
   ```bash
   scripts\build-portable.bat
   ```

2. **Test the build:**
   ```bash
   dist-portable\launcher\start-app.bat
   ```

3. **Package for distribution:**
   ```bash
   scripts\package-portable.bat
   ```

## Building Executables

### Prerequisites

- **Node.js 18+** (for building Full Cast TTS)
- **Python 3.8+** (for building video generator)
- **FFmpeg** (for video generation - can be system-wide or bundled)

### Build Steps

#### 1. Build Full Cast TTS Server

```bash
cd server\full-cast-tts
build-executable.bat
```

Output: `dist/full-cast-tts.exe`

#### 2. Build Video Generator Server

```bash
cd youtube-video-generator
build-executable.bat
```

Output: `dist/video-generator.exe`

#### 3. Build Frontend

```bash
npm run build
```

Output: `dist/` directory

#### 4. Package Everything

```bash
scripts\build-portable.bat
```

Output: `dist-portable/` directory with all components

## Server Configuration

### Default Ports

- **Full Cast TTS:** Port 4001
- **Video Generator:** Port 8000

### Changing Ports

Edit `launcher/start-servers.bat` and modify:
```batch
set "FULL_CAST_PORT=4001"
set "VIDEO_GEN_PORT=8000"
```

Or pass arguments directly:
```batch
full-cast-tts.exe --port 4002
video-generator.exe --port 8001
```

## Troubleshooting

### Servers Won't Start

1. **Check ports are available:**
   ```bash
   netstat -ano | findstr ":4001"
   netstat -ano | findstr ":8000"
   ```

2. **Check firewall settings** - ensure ports 4001 and 8000 are allowed

3. **Check executable permissions** - ensure executables aren't blocked by Windows Defender

### Frontend Can't Connect

1. **Verify servers are running:**
   - Check for console windows or process list
   - Test health endpoints:
     - `http://localhost:4001/health`
     - `http://localhost:8000/health`

2. **Check browser console** for CORS or connection errors

3. **Verify frontend is using correct URLs:**
   - Check `src/config/portable.ts`
   - Should default to `http://localhost:4001` and `http://localhost:8000`

### FFmpeg Not Found

The video generator requires FFmpeg. Options:

1. **Install system-wide FFmpeg:**
   - Download from https://ffmpeg.org
   - Add to PATH

2. **Bundle FFmpeg** (future enhancement):
   - Include FFmpeg executable with distribution
   - Modify Python server to detect bundled FFmpeg

## Distribution

### Creating Distribution Package

```bash
scripts\package-portable.bat
```

Creates: `packages/YoRead-Portable-v1.0.0.zip`

### Package Contents

```
YoRead-Portable-v1.0.0/
├── launcher/
│   ├── start-app.bat      # Main launcher
│   ├── start-servers.bat  # Start servers only
│   ├── shutdown-servers.bat # Stop servers
│   └── README.md
├── servers/
│   ├── full-cast-tts.exe   # Full Cast TTS server
│   └── video-generator.exe # Video generator server
├── frontend/               # Built React app
│   ├── index.html
│   └── ...
└── README.md
```

### Distribution Requirements

- Windows 10 or later
- ~500 MB free disk space
- Internet connection (for API calls: OpenAI, Gemini, Cartesia)
- FFmpeg (for video generation)

## Architecture

### Portable Mode Detection

The frontend automatically detects portable mode via:
1. Environment variable `VITE_PORTABLE_MODE=true`
2. localStorage flag (set by launcher)
3. Electron user agent (if wrapped in Electron)

See `src/config/portable.ts` for implementation.

### Server Communication

- Frontend uses `src/config/portable.ts` to get server URLs
- Defaults to `localhost:4001` and `localhost:8000` in portable mode
- Falls back to environment variables in development mode

## Future Enhancements

- [ ] Bundle FFmpeg with video generator
- [ ] Electron wrapper for better UX
- [ ] Auto-update mechanism
- [ ] Installer creation (NSIS/Inno Setup)
- [ ] macOS/Linux support

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review server logs (console output)
3. Check browser console for frontend errors


