#!/usr/bin/env bash
# Setup script for YouTube Video Generator

echo "🚀 Setting up YouTube Video Generator..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

echo "✅ Python found: $(python3 --version)"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  FFmpeg not found. Video generation may not work properly."
    echo "   Please install FFmpeg:"
    echo "   - Windows: Download from https://ffmpeg.org/download.html"
    echo "   - macOS: brew install ffmpeg"
    echo "   - Ubuntu: sudo apt install ffmpeg"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the server:"
echo "   source venv/bin/activate  # Activate virtual environment"
echo "   python server.py          # Start the server"
echo ""
echo "🧪 To test the server:"
echo "   python test_server.py     # Run tests"
echo ""
echo "📖 The server will be available at: http://localhost:8000"
echo "📚 API documentation: http://localhost:8000/docs"
