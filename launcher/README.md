# Portable Desktop App Launcher

This directory contains launcher scripts for the portable desktop application.

## Quick Start

1. **Build the executables first:**
   ```bash
   # Build Full Cast TTS server
   cd server\full-cast-tts
   build-executable.bat
   
   # Build Python video generator
   cd ..\..\youtube-video-generator
   build-executable.bat
   ```

2. **Start the application:**
   ```bash
   # From the launcher directory
   start-app.bat
   ```

   Or start servers only:
   ```bash
   start-servers.bat
   ```

3. **Stop servers:**
   ```bash
   shutdown-servers.bat
   ```

## Files

- **start-app.bat** - Main launcher (starts servers + opens frontend)
- **start-servers.bat** - Starts both backend servers
- **shutdown-servers.bat** - Stops all servers

## Server Ports

- Full Cast TTS: `http://localhost:4001`
- Video Generator: `http://localhost:8000`

## Troubleshooting

### Servers won't start
- Make sure executables are built (see Quick Start)
- Check if ports 4001 and 8000 are already in use
- Check firewall settings

### Frontend can't connect
- Verify servers are running (`start-servers.bat`)
- Check browser console for errors
- Ensure frontend is configured to use `http://localhost:4001` and `http://localhost:8000`

### Build errors
- Ensure Node.js 18+ is installed for Full Cast TTS build
- Ensure Python 3.8+ is installed for Video Generator build
- Install build dependencies: `pip install pyinstaller` and `npm install -g pkg`


