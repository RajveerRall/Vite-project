@echo off
echo 🚀 Setting up YouTube Video Generator...

REM Check if Python is installed
py --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8+ first.
    pause
    exit /b 1
)

echo ✅ Python found
py --version

REM Create virtual environment
echo 📦 Creating virtual environment...
py -m venv venv

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt

REM Check if FFmpeg is installed
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  FFmpeg not found. Video generation may not work properly.
    echo    Please install FFmpeg from: https://ffmpeg.org/download.html
)

echo.
echo ✅ Setup complete!
echo.
echo 🚀 To start the server:
echo    venv\Scripts\activate.bat  # Activate virtual environment
echo    python server.py          # Start the server
echo.
echo 🧪 To test the server:
echo    python test_server.py     # Run tests
echo.
echo 📖 The server will be available at: http://localhost:8000
echo 📚 API documentation: http://localhost:8000/docs
pause
