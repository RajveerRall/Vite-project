# Build Scripts for Portable Desktop App

## Scripts

### `build-portable.bat`
Main build script that:
1. Builds the React frontend
2. Builds Full Cast TTS server executable
3. Builds Python video generator executable
4. Copies everything to `dist-portable/` directory

**Usage:**
```bash
scripts\build-portable.bat
```

### `package-portable.bat`
Packages the built portable app into a zip file for distribution.

**Usage:**
```bash
scripts\package-portable.bat
```

Creates: `packages/YoRead-Portable-v1.0.0.zip`

## Build Requirements

- **Node.js 18+** - For building Full Cast TTS server
- **Python 3.8+** - For building video generator server
- **npm/pip** - Package managers

## Build Process

1. **Frontend Build:**
   - Runs `npm run build`
   - Outputs to `dist/` directory

2. **Full Cast TTS Build:**
   - Uses `pkg` to create standalone Node.js executable
   - Outputs to `server/full-cast-tts/dist/full-cast-tts.exe`

3. **Video Generator Build:**
   - Uses `PyInstaller` to create standalone Python executable
   - Outputs to `youtube-video-generator/dist/video-generator.exe`

4. **Distribution Package:**
   - Copies all files to `dist-portable/`
   - Includes launcher scripts
   - Ready for distribution

## Troubleshooting

### Build fails for Full Cast TTS
- Ensure `pkg` is installed: `npm install -g pkg`
- Check that all dependencies are installed in `server/full-cast-tts/`

### Build fails for Video Generator
- Ensure `PyInstaller` is installed: `pip install pyinstaller`
- Check that all Python dependencies are installed
- FFmpeg must be available (either system-wide or bundled)

### Executables are large
- This is normal - they include all dependencies
- Full Cast TTS: ~50-100 MB
- Video Generator: ~200-300 MB


