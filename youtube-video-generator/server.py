from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageDraw, ImageFont
import subprocess
import uuid
import os
import tempfile
import shutil

app = FastAPI()

# CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "YouTube Video Generator is running!"}

@app.post("/generate-video")
async def generate_video(
    audio: UploadFile = File(...),
    text: str = Form(...),
    book_title: str = Form(...),
    chapter_title: str = Form(...),
    author: str = Form(...)
):
    """
    Generate YouTube video from audio + text using FFmpeg
    
    Args:
        audio: Audio file (MP3/M4A) from Full-Cast TTS
        text: Chapter text to display
        book_title: Book name
        chapter_title: Chapter name
        author: Author name
    
    Returns:
        MP4 video file
    """
    
    print(f"Generating video for: {chapter_title}")
    print(f"Text length: {len(text)} characters")
    
    # Create temp directory for this video
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Save uploaded audio
        audio_path = os.path.join(temp_dir, "audio.mp3")
        with open(audio_path, "wb") as f:
            f.write(await audio.read())
        
        # Get audio duration using ffprobe
        duration = get_audio_duration(audio_path)
        print(f"Audio duration: {duration}s")
        
        # Generate video
        video_path = create_video_with_ffmpeg(
            audio_path=audio_path,
            text=text,
            book_title=book_title,
            chapter_title=chapter_title,
            author=author,
            duration=duration,
            temp_dir=temp_dir
        )
        
        # Return video file
        filename = f"{book_title.replace(' ', '_')}_{chapter_title.replace(' ', '_')}.mp4"
        
        # Return the video file
        response = FileResponse(
            video_path,
            media_type="video/mp4",
            filename=filename
        )
        
        # Note: Cleanup will happen automatically when temp directory is garbage collected
        # Or we can keep temp files for debugging
        return response
        
    except Exception as e:
        print(f"Error generating video: {e}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise

def get_ffmpeg_path():
    """Get FFmpeg executable path"""
    import os
    # Try common installation locations
    possible_paths = [
        r"C:\Users\Rajveer\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0-full_build\bin\ffmpeg.exe",
        r"C:\ffmpeg\bin\ffmpeg.exe",
        "ffmpeg"  # Try system PATH as fallback
    ]
    for path in possible_paths:
        if os.path.exists(path) or path == "ffmpeg":
            return path
    return "ffmpeg"  # Fallback to system PATH

def get_ffprobe_path():
    """Get FFprobe executable path"""
    import os
    # Try common installation locations
    possible_paths = [
        r"C:\Users\Rajveer\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0-full_build\bin\ffprobe.exe",
        r"C:\ffmpeg\bin\ffprobe.exe",
        "ffprobe"  # Try system PATH as fallback
    ]
    for path in possible_paths:
        if os.path.exists(path) or path == "ffprobe":
            return path
    return "ffprobe"  # Fallback to system PATH

def get_audio_duration(audio_path: str) -> float:
    """Get audio duration using ffprobe"""
    try:
        ffprobe = get_ffprobe_path()
        result = subprocess.run(
            [ffprobe, '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=noprint_wrappers=1:nokey=1', audio_path],
            capture_output=True,
            text=True,
            check=True
        )
        return float(result.stdout.strip())
    except Exception as e:
        print(f"Error getting audio duration: {e}")
        return 10.0  # Default fallback

def wrap_text(text: str, font, max_width: int) -> list:
    """Wrap text to fit width"""
    words = text.split()
    lines = []
    current_line = []
    
    dummy_img = Image.new('RGB', (1, 1))
    draw = ImageDraw.Draw(dummy_img)
    
    for word in words:
        test_line = ' '.join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=font)
        width = bbox[2] - bbox[0]
        
        if width > max_width and current_line:
            lines.append(' '.join(current_line))
            current_line = [word]
        else:
            current_line.append(word)
    
    if current_line:
        lines.append(' '.join(current_line))
    
    return lines

def ease_in_out_cubic(t: float) -> float:
    """Smooth easing function"""
    return 4 * t * t * t if t < 0.5 else 1 - pow(-2 * t + 2, 3) / 2

def create_frame(
    frame_number: int,
    total_frames: int,
    lines: list,
    book_title: str,
    chapter_title: str,
    duration: float,
    width: int = 1920,
    height: int = 1080
) -> Image.Image:
    """Create a single video frame"""
    
    # Create canvas
    img = Image.new('RGB', (width, height), color='#1a1a2e')
    draw = ImageDraw.Draw(img)
    
    # Try to load a better font, fallback to default
    try:
        header_font = ImageFont.truetype("arial.ttf", 32)
        text_font = ImageFont.truetype("arial.ttf", 48)
        time_font = ImageFont.truetype("arial.ttf", 20)
    except:
        header_font = ImageFont.load_default()
        text_font = ImageFont.load_default()
        time_font = ImageFont.load_default()
    
    # Draw header
    draw.text((30, 20), book_title, font=header_font, fill='#ffffff')
    
    # Center chapter title
    chapter_bbox = draw.textbbox((0, 0), chapter_title, font=header_font)
    chapter_width = chapter_bbox[2] - chapter_bbox[0]
    draw.text(((width - chapter_width) // 2, 60), chapter_title, font=header_font, fill='#cccccc')
    
    # Calculate current time
    current_time = (frame_number / total_frames) * duration
    
    # Draw scrolling text
    line_height = 70
    total_height = len(lines) * line_height
    visible_height = height - 200
    
    # Calculate scroll with easing
    progress = frame_number / total_frames
    eased_progress = ease_in_out_cubic(progress)
    
    if total_height > visible_height:
        # Scrolling needed
        max_scroll = total_height - visible_height
        scroll_offset = 150 - (eased_progress * max_scroll)
    else:
        # Center text
        scroll_offset = (height - total_height) // 2
    
    # Draw visible lines
    for i, line in enumerate(lines):
        y = int(scroll_offset + (i * line_height))
        
        # Only draw if visible
        if -line_height < y < height:
            # Center horizontally
            bbox = draw.textbbox((0, 0), line, font=text_font)
            text_width = bbox[2] - bbox[0]
            x = (width - text_width) // 2
            
            draw.text((x, y), line, font=text_font, fill='#e8e8e8')
    
    # Draw progress bar
    bar_y = height - 50
    bar_width = width - 200
    
    # Background
    draw.rectangle([(100, bar_y), (width - 100, bar_y + 4)], fill='#444444')
    
    # Progress
    filled_width = int(bar_width * progress)
    draw.rectangle([(100, bar_y), (100 + filled_width, bar_y + 4)], fill='#ffd700')
    
    # Timestamp
    time_text = f"{format_time(current_time)} / {format_time(duration)}"
    draw.text((width - 120, height - 30), time_text, font=time_font, fill='#cccccc')
    
    return img

def format_time(seconds: float) -> str:
    """Format seconds as MM:SS"""
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"

def create_video_with_ffmpeg(
    audio_path: str,
    text: str,
    book_title: str,
    chapter_title: str,
    author: str,
    duration: float,
    temp_dir: str
) -> str:
    """Create video using FFmpeg"""
    
    # Settings
    WIDTH = 1920
    HEIGHT = 1080
    FPS = 24
    
    # Wrap text
    try:
        font = ImageFont.truetype("arial.ttf", 48)
    except:
        font = ImageFont.load_default()
    
    lines = wrap_text(text, font, WIDTH - 200)
    print(f"Wrapped into {len(lines)} lines")
    
    # Calculate total frames
    total_frames = int(duration * FPS)
    
    # Create frames directory
    frames_dir = os.path.join(temp_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)
    
    # Generate frames
    print(f"Generating {total_frames} frames at {FPS} FPS...")
    for i in range(total_frames):
        if i % 100 == 0:
            print(f"  Frame {i}/{total_frames} ({(i/total_frames)*100:.1f}%)")
        
        frame = create_frame(
            frame_number=i,
            total_frames=total_frames,
            lines=lines,
            book_title=book_title,
            chapter_title=chapter_title,
            duration=duration,
            width=WIDTH,
            height=HEIGHT
        )
        
        frame_path = os.path.join(frames_dir, f"frame_{i:06d}.png")
        frame.save(frame_path, 'PNG')
    
    print("Frames generated, encoding video with FFmpeg...")
    
    # Output video path
    output_path = os.path.join(temp_dir, "output.mp4")
    
    # Use FFmpeg to create video from frames and add audio
    ffmpeg = get_ffmpeg_path()
    ffmpeg_cmd = [
        ffmpeg,
        '-y',  # Overwrite output file
        '-framerate', str(FPS),
        '-i', os.path.join(frames_dir, 'frame_%06d.png'),
        '-i', audio_path,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        output_path
    ]
    
    result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"FFmpeg error: {result.stderr}")
        raise Exception(f"FFmpeg failed: {result.stderr}")
    
    print(f"Video created successfully: {output_path}")
    return output_path

if __name__ == "__main__":
    import uvicorn
    print("Starting YouTube Video Generator with FFmpeg...")
    print("API docs available at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
