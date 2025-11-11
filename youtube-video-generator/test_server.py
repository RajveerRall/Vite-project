#!/usr/bin/env python3
"""
Test script for the YouTube Video Generator
This script tests the video generation endpoint with sample data
"""

import requests
import os
import tempfile
from moviepy.editor import AudioFileClip

def create_test_audio():
    """Create a simple test audio file"""
    # Create a simple 5-second audio clip
    audio = AudioFileClip("test.mp3") if os.path.exists("test.mp3") else None
    
    if not audio:
        print("❌ No test.mp3 found. Please create a test audio file first.")
        return None
    
    # Trim to 5 seconds for testing
    audio = audio.subclip(0, min(5, audio.duration))
    
    # Save to temp file
    temp_audio = tempfile.NamedTemporaryFile(suffix='.mp3', delete=False)
    audio.write_audiofile(temp_audio.name, verbose=False, logger=None)
    temp_audio.close()
    
    return temp_audio.name

def test_video_generation():
    """Test the video generation endpoint"""
    print("🧪 Testing YouTube Video Generator...")
    
    # Create test audio
    audio_path = create_test_audio()
    if not audio_path:
        return False
    
    try:
        # Prepare test data
        test_data = {
            'text': 'This is a test chapter from a sample book. The text should scroll smoothly as the audio plays. This demonstrates the video generation feature.',
            'book_title': 'Test Book',
            'chapter_title': 'Chapter 1 - Introduction',
            'author': 'Test Author'
        }
        
        # Prepare files
        files = {
            'audio': ('test.mp3', open(audio_path, 'rb'), 'audio/mpeg')
        }
        
        print("📤 Sending request to video generator...")
        
        # Send request
        response = requests.post(
            'http://localhost:8000/generate-video',
            data=test_data,
            files=files
        )
        
        if response.status_code == 200:
            # Save video
            video_path = 'test_output.mp4'
            with open(video_path, 'wb') as f:
                f.write(response.content)
            
            print(f"✅ Video generated successfully: {video_path}")
            print(f"📊 Video size: {len(response.content) / 1024 / 1024:.2f} MB")
            return True
        else:
            print(f"❌ Request failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure it's running on localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False
    finally:
        # Cleanup
        if audio_path and os.path.exists(audio_path):
            os.unlink(audio_path)
        if 'files' in locals():
            files['audio'][1].close()

def test_server_health():
    """Test if server is running"""
    try:
        response = requests.get('http://localhost:8000/docs')
        if response.status_code == 200:
            print("✅ Server is running and accessible")
            return True
        else:
            print(f"❌ Server responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running. Start it with: python server.py")
        return False

if __name__ == "__main__":
    print("🚀 YouTube Video Generator Test Suite")
    print("=" * 50)
    
    # Test 1: Server health
    if not test_server_health():
        print("\n💡 To start the server:")
        print("   cd youtube-video-generator")
        print("   python server.py")
        exit(1)
    
    print()
    
    # Test 2: Video generation
    if test_video_generation():
        print("\n🎉 All tests passed!")
        print("\n📝 Next steps:")
        print("   1. Test the frontend integration")
        print("   2. Generate an audiobook chapter")
        print("   3. Click the 'Video' button")
        print("   4. Verify MP4 downloads correctly")
    else:
        print("\n❌ Tests failed. Check the server logs for errors.")
