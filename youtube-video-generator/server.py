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
    srt_data: str = Form(...),  # Combined SRT timing data
    audio_duration: str = Form(...),  # Total audio duration in seconds
    book_title: str = Form(...),
    chapter_title: str = Form(...),
    author: str = Form(...),
    format: str = Form("youtube")  # "youtube" (1920x1080) or "mobile" (1080x1920)
):
    """
    Generate video from audio + text + SRT timing using FFmpeg
    
    Args:
        audio: Audio file (MP3/M4A) from Full-Cast TTS
        text: Chapter text to display
        srt_data: SRT timing data for text synchronization
        audio_duration: Total audio duration in seconds (from frontend)
        book_title: Book name
        chapter_title: Chapter name
        author: Author name
        format: Video format - "youtube" (1920x1080 horizontal) or "mobile" (1080x1920 vertical)
    
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
        
        # Use audio duration from frontend (more accurate)
        duration = float(audio_duration)
        print(f"Audio duration: {duration}s (from frontend metadata)")
        
        # Generate video
        video_path = create_video_with_srt(
            audio_path=audio_path,
            text=text,
            srt_data=srt_data,
            book_title=book_title,
            chapter_title=chapter_title,
            author=author,
            duration=duration,
            temp_dir=temp_dir,
            video_format=format
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
        # Try common Windows fonts
        font_paths = [
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/calibri.ttf", 
            "C:/Windows/Fonts/tahoma.ttf",
            "arial.ttf"
        ]
        
        header_font = None
        text_font = None
        time_font = None
        
        for font_path in font_paths:
            try:
                header_font = ImageFont.truetype(font_path, 32)
                text_font = ImageFont.truetype(font_path, 48)
                time_font = ImageFont.truetype(font_path, 20)
                print(f"Loaded font: {font_path}")
                break
            except:
                continue
        
        if not header_font:
            print("No system fonts found, using default")
            header_font = ImageFont.load_default()
            text_font = ImageFont.load_default()
            time_font = ImageFont.load_default()
            
    except Exception as e:
        print(f"Font loading error: {e}")
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
    temp_dir: str,
    width: int = 1920,
    height: int = 1080,
    fps: int = 30,
    crf: int = 20
) -> str:
    """Create video using FFmpeg"""
    
    # Use passed parameters
    WIDTH = width
    HEIGHT = height
    FPS = fps
    
    # Wrap text
    try:
        # Try common Windows fonts
        font_paths = [
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/calibri.ttf", 
            "C:/Windows/Fonts/tahoma.ttf",
            "arial.ttf"
        ]
        
        font = None
        for font_path in font_paths:
            try:
                font = ImageFont.truetype(font_path, 48)
                print(f"Loaded font for text wrapping: {font_path}")
                break
            except:
                continue
        
        if not font:
            print("No system fonts found for text wrapping, using default")
            font = ImageFont.load_default()
            
    except Exception as e:
        print(f"Font loading error for text wrapping: {e}")
        font = ImageFont.load_default()
    
    lines = wrap_text(text, font, WIDTH - 200)
    print(f"Wrapped into {len(lines)} lines")
    
    # Calculate total frames
    total_frames = int(duration * FPS)
    
    # Create frames directory
    frames_dir = os.path.join(temp_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)
    print(f"Frames directory created: {frames_dir}")
    
    # Check if directory exists
    if not os.path.exists(frames_dir):
        raise Exception(f"Failed to create frames directory: {frames_dir}")
    
    # Generate frames
    print(f"Generating {total_frames} frames at {FPS} FPS...")
    frames_generated = 0
    for i in range(total_frames):
        if i % 100 == 0:
            print(f"  Frame {i}/{total_frames} ({(i/total_frames)*100:.1f}%)")
        
        try:
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
            frames_generated += 1
        except Exception as e:
            print(f"Error generating frame {i}: {e}")
            continue
    
    print(f"Frames generated: {frames_generated}/{total_frames}")
    
    if frames_generated == 0:
        raise Exception("No frames were generated successfully")
    
    # Verify frames were actually saved
    frame_files = [f for f in os.listdir(frames_dir) if f.startswith('frame_') and f.endswith('.png')]
    print(f"Frame files found in directory: {len(frame_files)}")
    
    if len(frame_files) == 0:
        raise Exception("No frame files were saved to disk")
    
    print("Frames generated, encoding video with FFmpeg...")
    
    # Output video path
    output_path = os.path.join(temp_dir, "output.mp4")
    
    # Use FFmpeg to create video from frames and add audio
    ffmpeg = get_ffmpeg_path()
    ffmpeg_cmd = [
        ffmpeg,
        '-y',  # Overwrite output file
        '-framerate', str(fps),
        '-i', os.path.join(frames_dir, 'frame_%06d.png'),
        '-i', audio_path,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', str(crf),
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

def parse_srt(srt_content: str):
    """Parse SRT content into timing segments"""
    segments = []
    lines = srt_content.strip().split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Skip empty lines
        if not line:
            i += 1
            continue
            
        # Check if this is a sequence number
        try:
            seq_num = int(line)
            i += 1
            
            # Next line should be timing
            if i < len(lines):
                timing_line = lines[i].strip()
                if '-->' in timing_line:
                    start_time, end_time = timing_line.split(' --> ')
                    start_seconds = time_to_seconds(start_time.strip())
                    end_seconds = time_to_seconds(end_time.strip())
                    
                    i += 1
                    # Next lines should be text content
                    text_lines = []
                    while i < len(lines) and lines[i].strip():
                        text_lines.append(lines[i].strip())
                        i += 1
                    
                    if text_lines:
                        text = ' '.join(text_lines)
                        segments.append({
                            'index': seq_num,
                            'start': start_seconds,
                            'end': end_seconds,
                            'text': text
                        })
                else:
                    i += 1
            else:
                i += 1
        except ValueError:
            # Not a sequence number, skip
            i += 1
    
    return segments

def time_to_seconds(time_str: str) -> float:
    """Convert SRT time format (HH:MM:SS,mmm) to seconds"""
    try:
        # Remove milliseconds separator and split
        time_part, ms_part = time_str.split(',')
        hours, minutes, seconds = map(int, time_part.split(':'))
        milliseconds = int(ms_part)
        
        total_seconds = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000.0
        return total_seconds
    except (ValueError, IndexError):
        return 0.0

def wrap_text(text, font, max_width, draw):
    """Wrap text to fit within max_width"""
    words = text.split(' ')
    lines = []
    current_line = []
    
    for word in words:
        test_line = ' '.join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=font)
        text_width = bbox[2] - bbox[0]
        
        if text_width <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(' '.join(current_line))
                current_line = [word]
            else:
                # Single word is too long, add it anyway
                lines.append(word)
    
    if current_line:
        lines.append(' '.join(current_line))
    
    return lines

def group_sentences_into_pages(sentences, max_chars=400):
    """Group sentences into pages based on character count"""
    pages = []
    current_page = []
    current_chars = 0
    
    for sentence in sentences:
        sentence_len = len(sentence['text'])
        if current_chars + sentence_len > max_chars and current_page:
            pages.append(current_page)
            current_page = [sentence]
            current_chars = sentence_len
        else:
            current_page.append(sentence)
            current_chars += sentence_len
    
    if current_page:
        pages.append(current_page)
    
    return pages

def generate_frame_with_highlight(page_sentences, current_time, width=1080, height=1920):
    """Generate frame with sentence-level highlighting"""
    img = Image.new('RGB', (width, height), color=(20, 20, 30))
    draw = ImageDraw.Draw(img)
    
    # Format-specific settings
    is_youtube = (width > height)  # Horizontal = YouTube
    if is_youtube:
        font_size = 64
        max_text_width = int(width * 0.80)  # 80% of screen width
        y_start = height // 4  # Start higher for better centering
        line_spacing = 100
    else:
        font_size = 48
        max_text_width = int(width * 0.85)
        y_start = height // 3
        line_spacing = 80
    
    # Load font with format-specific size
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("C:\\Windows\\Fonts\\arial.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
            except:
                font = ImageFont.load_default()
    
    y_offset = y_start
    
    for sentence in page_sentences:
        # Determine if this sentence should be highlighted
        is_active = sentence['start'] <= current_time < sentence['end']
        color = (255, 223, 0) if is_active else (200, 200, 200)
        
        # Wrap text to fit screen width
        wrapped_lines = wrap_text(sentence['text'], font, max_text_width, draw)
        
        # Draw each wrapped line
        for line in wrapped_lines:
            bbox = draw.textbbox((0, 0), line, font=font)
            text_width = bbox[2] - bbox[0]
            x = (width - text_width) // 2  # Center horizontally
            
            draw.text((x, y_offset), line, fill=color, font=font)
            y_offset += line_spacing
        
        # Add extra spacing between sentences (half a line)
        y_offset += line_spacing // 2
    
    return img

def create_video_with_srt(
    audio_path: str,
    text: str,
    srt_data: str,
    book_title: str,
    chapter_title: str,
    author: str,
    duration: float,
    temp_dir: str,
    video_format: str = "youtube"
) -> str:
    """Create video with SRT-based timing and sentence highlighting"""
    
    # Video specifications based on format
    if video_format == "mobile":
        width, height = 1080, 1920  # Vertical format for mobile/social media
        fps = 30
        crf = 23  # Standard quality for mobile
        print(f"Using mobile format: {width}x{height} (vertical)")
    else:  # youtube format (default)
        width, height = 1920, 1080  # Horizontal format for YouTube
        fps = 10  # Reduced from 30 to 10 for faster generation
        crf = 20  # Higher quality for YouTube
        print(f"Using YouTube format: {width}x{height} (horizontal)")
    
    print(f"Parsing SRT data...")
    segments = parse_srt(srt_data)
    print(f"Parsed {len(segments)} SRT segments")
    
    if not segments:
        print("No SRT segments found, falling back to basic video generation")
        return create_video_with_ffmpeg(audio_path, text, book_title, chapter_title, author, duration, temp_dir, width, height, fps, crf)
    
    print(f"Grouping sentences into pages...")
    pages = group_sentences_into_pages(segments)
    print(f"Created {len(pages)} pages")
    
    # Debug: Print first few pages with their timing
    for i, page in enumerate(pages[:3]):
        page_start = page[0]['start']
        page_end = page[-1]['end']
        print(f"  Page {i+1}: {page_start:.2f}s - {page_end:.2f}s ({len(page)} sentences)")
    
    # Calculate total frames needed
    total_frames = int(duration * fps)
    print(f"Generating {total_frames} frames at {fps} FPS...")
    
    frames_dir = os.path.join(temp_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)
    
    # Generate frames
    for frame_num in range(total_frames):
        current_time = frame_num / fps
        
        # Find current page based on which page contains the current time
        current_page = None
        current_page_index = 0
        
        for page_idx, page in enumerate(pages):
            page_start = page[0]['start']
            page_end = page[-1]['end']
            
            if page_start <= current_time <= page_end:
                current_page = page
                current_page_index = page_idx
                break
        
        # If no page found, find the closest page
        if not current_page:
            # Find the page whose start is closest to current_time
            closest_page_idx = 0
            min_distance = abs(pages[0][0]['start'] - current_time)
            
            for page_idx, page in enumerate(pages):
                distance = abs(page[0]['start'] - current_time)
                if distance < min_distance:
                    min_distance = distance
                    closest_page_idx = page_idx
            
            current_page = pages[closest_page_idx]
            current_page_index = closest_page_idx
        
        # Generate frame
        frame = generate_frame_with_highlight(current_page, current_time, width, height)
        frame_path = os.path.join(frames_dir, f"frame_{frame_num:06d}.png")
        frame.save(frame_path)
        
        if frame_num % 100 == 0:
            print(f"Frame {frame_num}/{total_frames} ({frame_num/total_frames*100:.1f}%) - Page {current_page_index + 1}/{len(pages)} - Time: {current_time:.2f}s")
    
    print("Frames generated, encoding video with FFmpeg...")
    
    # Encode video with FFmpeg
    output_path = os.path.join(temp_dir, "output.mp4")
    ffmpeg_path = get_ffmpeg_path()
    
    cmd = [
        ffmpeg_path,
        '-y',  # Overwrite output file
        '-framerate', str(fps),
        '-i', os.path.join(frames_dir, 'frame_%06d.png'),
        '-i', audio_path,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-pix_fmt', 'yuv420p',
        '-shortest',  # End when shortest input ends
        output_path
    ]
    
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e}")
        print(f"FFmpeg stderr: {e.stderr.decode()}")
        raise
    
    print(f"Video created successfully: {output_path}")
    return output_path

if __name__ == "__main__":
    import uvicorn
    print("Starting YouTube Video Generator with FFmpeg...")
    print("API docs available at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
