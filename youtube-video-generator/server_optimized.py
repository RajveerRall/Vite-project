from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageDraw, ImageFont
import subprocess
import uuid
import os
import tempfile
import shutil
import json
import re
import difflib
from typing import List

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
    return {"message": "Optimized YouTube Video Generator with Smart Frame Generation is running!"}

@app.post("/generate-video")
async def generate_video(
    audio_chunks: List[UploadFile] = File(...),  # Multiple audio files
    audio_metadata: str = Form(...),  # JSON metadata
    text: str = Form(...),
    srt_data: str = Form(...),
    total_duration: str = Form(...),
    book_title: str = Form(...),
    chapter_title: str = Form(...),
    author: str = Form(...),
    format: str = Form("youtube"),  # "youtube" (1920x1080) or "mobile" (1080x1920)
    style: str = Form("ereader"),  # "ereader", "subtitle", or "minimal"
    highlight_mode: str = Form("sentence")  # Changed from enable_highlight
):
    """
    Generate video with smart frame generation using multiple audio chunks
    
    Args:
        audio_chunks: Multiple audio files from different TTS providers
        audio_metadata: JSON metadata about each audio chunk
        text: Chapter text to display
        srt_data: SRT timing data for text synchronization
        total_duration: Total audio duration in seconds
        book_title: Book name
        chapter_title: Chapter name
        author: Author name
        format: Video format - "youtube" (1920x1080 horizontal) or "mobile" (1080x1920 vertical)
        style: Video style - "ereader" (book-like), "subtitle" (modern), or "minimal" (clean)
        highlight_mode: Highlighting mode - "none", "sentence", or "word"
    
    Returns:
        Video file with smooth scrolling text
    """
    print(f"Generating smart scroll video for: {chapter_title}")
    print(f"Received {len(audio_chunks)} audio chunks")
    
    # Validate inputs
    try:
        duration_float = float(total_duration)
        if duration_float <= 0:
            raise ValueError("Invalid audio duration")
    except ValueError as e:
        return {"error": f"Invalid audio duration: {total_duration}"}
    
    if not srt_data or srt_data.strip() == "":
        return {"error": "No SRT data provided"}
    
    # Parse metadata
    try:
        metadata = json.loads(audio_metadata)
        print(f"Audio metadata: {len(metadata)} entries")
    except json.JSONDecodeError as e:
        return {"error": f"Invalid audio metadata JSON: {e}"}
    
    # Create temporary directory
    temp_dir = tempfile.mkdtemp()
    try:
        # Save all audio chunks
        audio_files = []
        for i, chunk in enumerate(audio_chunks):
            audio_path = os.path.join(temp_dir, f"audio_{i}.mp3")
            with open(audio_path, "wb") as f:
                content = await chunk.read()
                f.write(content)
            
            # Validate audio file
            if os.path.getsize(audio_path) == 0:
                print(f"WARNING: Audio chunk {i} is empty")
            else:
                print(f"Saved audio chunk {i}: {os.path.getsize(audio_path)} bytes")
            
            audio_files.append(audio_path)
        
        # Combine audio files using FFmpeg
        combined_audio_path = combine_audio_files(audio_files, temp_dir)
        
        # Get actual duration from combined audio file
        combined_info = validate_audio_file(combined_audio_path)
        if combined_info:
            actual_duration = float(combined_info.get('format', {}).get('duration', duration_float))
            print(f"Using actual combined audio duration: {actual_duration}s (frontend reported: {duration_float}s)")
        else:
            actual_duration = duration_float
            print(f"Warning: Could not get actual duration, using frontend duration: {duration_float}s")
        
        # Parse highlighting mode
        highlight_mode_value = highlight_mode.lower()  # 'none', 'sentence', or 'word'
        
        # Generate video with smart frame generation using actual audio duration
        video_path = create_video_with_srt_optimized(
            combined_audio_path, text, book_title, chapter_title,
            author, actual_duration, srt_data, temp_dir, format, style,
            highlight_mode_value  # Pass mode instead of boolean
        )
        
        # Read the video file content before cleanup
        with open(video_path, 'rb') as video_file:
            video_content = video_file.read()
        
        # Return the video content directly
        from fastapi.responses import Response
        return Response(
            content=video_content,
            media_type="video/mp4",
            headers={
                "Content-Disposition": f"attachment; filename={chapter_title.replace(' ', '_')}_video.mp4"
            }
        )
        
    except Exception as e:
        print(f"Error generating video: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
    finally:
        # Clean up temporary directory
        shutil.rmtree(temp_dir, ignore_errors=True)

def get_ffmpeg_path():
    """Get FFmpeg executable path"""
    # Try common locations
    possible_paths = [
        "ffmpeg",
        "C:\\ffmpeg\\bin\\ffmpeg.exe",
        "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
        "/usr/bin/ffmpeg",
        "/usr/local/bin/ffmpeg"
    ]
    
    for path in possible_paths:
        try:
            subprocess.run([path, "-version"], capture_output=True, check=True)
            return path
        except (subprocess.CalledProcessError, FileNotFoundError):
            continue
    
    raise Exception("FFmpeg not found. Please install FFmpeg and add it to your PATH.")

def get_ffprobe_path():
    """Get FFprobe executable path"""
    # Try common locations
    possible_paths = [
        "ffprobe",
        "C:\\ffmpeg\\bin\\ffprobe.exe",
        "C:\\Program Files\\ffmpeg\\bin\\ffprobe.exe",
        "/usr/bin/ffprobe",
        "/usr/local/bin/ffprobe"
    ]
    
    for path in possible_paths:
        try:
            subprocess.run([path, "-version"], capture_output=True, check=True)
            return path
        except (subprocess.CalledProcessError, FileNotFoundError):
            continue
    
    raise Exception("FFprobe not found. Please install FFmpeg and add it to your PATH.")

def detect_gpu_encoder():
    """
    Detect available hardware encoder.
    Returns: 'nvenc' (NVIDIA), 'qsv' (Intel), or 'cpu' (fallback)
    """
    ffmpeg = get_ffmpeg_path()
    
    # Check for NVIDIA NVENC
    try:
        result = subprocess.run(
            [ffmpeg, '-hide_banner', '-encoders'],
            capture_output=True, text=True, timeout=5
        )
        encoders = result.stdout
        
        if 'h264_nvenc' in encoders:
            # Verify NVENC actually works
            test = subprocess.run(
                [ffmpeg, '-f', 'lavfi', '-i', 'nullsrc=s=256x256:d=1',
                 '-c:v', 'h264_nvenc', '-f', 'null', '-'],
                capture_output=True, timeout=10
            )
            if test.returncode == 0:
                print("✓ NVIDIA NVENC hardware encoder detected")
                return 'nvenc'
        
        if 'h264_qsv' in encoders:
            # Verify QuickSync works
            test = subprocess.run(
                [ffmpeg, '-f', 'lavfi', '-i', 'nullsrc=s=256x256:d=1',
                 '-c:v', 'h264_qsv', '-f', 'null', '-'],
                capture_output=True, timeout=10
            )
            if test.returncode == 0:
                print("✓ Intel QuickSync hardware encoder detected")
                return 'qsv'
    except Exception as e:
        print(f"GPU detection failed: {e}")
    
    print("⚠ No hardware encoder detected, using CPU (slower)")
    return 'cpu'

# Cache the result
GPU_ENCODER = detect_gpu_encoder()

def create_video_with_ffmpeg_direct(frames_dir, audio_path, width, height, fps, num_frames, total_duration, crf):
    """
    Create video with hardware acceleration if available.
    """
    output_path = os.path.join(tempfile.gettempdir(), f"output_{uuid.uuid4().hex}.mp4")
    
    print(f"Encoding video with FFmpeg ({GPU_ENCODER} encoder):")
    print(f"  Input: {num_frames} frames at {fps} fps")
    print(f"  Duration: {total_duration:.2f}s")
    
    # Build FFmpeg command based on available encoder
    cmd = [
        get_ffmpeg_path(),
        '-y',
        '-framerate', str(fps),
        '-i', os.path.join(frames_dir, 'frame_%06d.png'),
        '-i', audio_path,
    ]
    
    # Add encoder-specific options
    if GPU_ENCODER == 'nvenc':
        cmd.extend([
            '-c:v', 'h264_nvenc',
            '-preset', 'p4',  # NVENC preset (p1=fastest, p7=slowest)
            '-cq', str(crf),  # Constant quality (similar to CRF)
            '-b:v', '0',      # Use CQ mode
        ])
    elif GPU_ENCODER == 'qsv':
        cmd.extend([
            '-c:v', 'h264_qsv',
            '-preset', 'fast',
            '-global_quality', str(crf),
        ])
    else:  # CPU fallback
        cmd.extend([
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', str(crf),
        ])
    
    # Common options
    cmd.extend([
        '-c:a', 'aac',
        '-pix_fmt', 'yuv420p',
        '-t', str(total_duration),
        output_path
    ])
    
    print(f"Running FFmpeg: {' '.join(cmd[:10])}...")
    
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=300)
        print(f"✓ Video encoded successfully with {GPU_ENCODER}")
        return output_path
    except subprocess.CalledProcessError as e:
        # If hardware encoding fails, fallback to CPU
        if GPU_ENCODER != 'cpu':
            print(f"⚠ Hardware encoding failed, falling back to CPU")
            return create_video_with_ffmpeg_direct_cpu_fallback(
                frames_dir, audio_path, width, height, fps, num_frames, total_duration, crf
            )
        raise Exception(f"FFmpeg encoding failed: {e.stderr.decode()}")
    except subprocess.TimeoutExpired:
        raise Exception("FFmpeg encoding timed out after 5 minutes")

def create_video_with_ffmpeg_direct_cpu_fallback(frames_dir, audio_path, width, height, fps, num_frames, total_duration, crf):
    """
    CPU fallback for video encoding when hardware acceleration fails.
    """
    output_path = os.path.join(tempfile.gettempdir(), f"output_{uuid.uuid4().hex}.mp4")
    
    print(f"Encoding video with FFmpeg (CPU fallback):")
    print(f"  Input: {num_frames} frames at {fps} fps")
    print(f"  Duration: {total_duration:.2f}s")
    
    cmd = [
        get_ffmpeg_path(),
        '-y',
        '-framerate', str(fps),
        '-i', os.path.join(frames_dir, 'frame_%06d.png'),
        '-i', audio_path,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-pix_fmt', 'yuv420p',
        '-crf', str(crf),
        '-preset', 'fast',
        '-t', str(total_duration),
        output_path
    ]
    
    print(f"Running FFmpeg (CPU): {' '.join(cmd[:10])}...")
    
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=300)
        print("✓ Video encoded successfully with CPU")
        return output_path
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e.stderr.decode()}")
        raise Exception(f"FFmpeg encoding failed: {e.stderr.decode()}")
    except subprocess.TimeoutExpired:
        raise Exception("FFmpeg encoding timed out after 5 minutes")

def create_video_with_ffmpeg_interpolated(frames_dir, audio_path, width, height, target_fps, num_keyframes, total_duration, crf):
    """
    Create video from key frames using simple FFmpeg frame rate conversion.
    Used when frames are sparse and need interpolation.
    """
    output_path = os.path.join(tempfile.gettempdir(), f"output_{uuid.uuid4().hex}.mp4")
    
    # Calculate input framerate (keyframes per second)
    input_fps = num_keyframes / total_duration
    
    print(f"Encoding video with FFmpeg (with interpolation):")
    print(f"  Input: {num_keyframes} key frames at {input_fps:.2f} fps")
    print(f"  Output: {target_fps} fps (simple interpolation)")
    
    cmd = [
        get_ffmpeg_path(),
        '-y',
        '-framerate', str(input_fps),  # Input framerate (key frames)
        '-i', os.path.join(frames_dir, 'frame_%06d.png'),
        '-i', audio_path,
        # Simple frame rate conversion (much faster than minterpolate)
        '-vf', f'fps={target_fps}',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-pix_fmt', 'yuv420p',
        '-crf', str(crf),
        '-preset', 'fast',  # Faster encoding
        '-t', str(total_duration),  # Set explicit duration to match audio
        output_path
    ]
    
    print(f"Running FFmpeg: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(f"FFmpeg completed successfully")
        print(f"Video created: {output_path}")
        
        shutil.rmtree(frames_dir)
        print(f"Cleaned up frames directory")
        
        return output_path
        
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg failed: {e.returncode}")
        print(f"Error: {e.stderr}")
        raise Exception(f"Video encoding failed: {e.stderr}")

def create_video_with_ffmpeg(frames_dir, audio_path, width, height, fps, crf):
    """
    Create video from frames directory using FFmpeg
    """
    output_path = os.path.join(tempfile.gettempdir(), f"output_{uuid.uuid4().hex}.mp4")
    
    # FFmpeg command to combine frames and audio
    cmd = [
        get_ffmpeg_path(),
        '-y',  # Overwrite output file
        '-framerate', str(fps),
        '-i', os.path.join(frames_dir, 'frame_%06d.png'),  # Input frames
        '-i', audio_path,  # Input audio
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-pix_fmt', 'yuv420p',
        '-crf', str(crf),
        '-shortest',  # End when shortest input ends
        output_path
    ]
    
    print(f"Running FFmpeg command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(f"FFmpeg completed successfully")
        print(f"Video created: {output_path}")
        
        # Clean up frames directory
        shutil.rmtree(frames_dir)
        print(f"Cleaned up frames directory: {frames_dir}")
        
        return output_path
        
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg failed with return code {e.returncode}")
        print(f"Error output: {e.stderr}")
        raise Exception(f"Video encoding failed: {e.stderr}")

def create_video_with_ffmpeg_old(audio_path, text, book_title, chapter_title, author, duration, temp_dir, width, height, fps, crf):
    """Fallback video generation without SRT data"""
    print("Creating basic video without SRT timing...")
    
    # Create frames directory
    frames_dir = os.path.join(temp_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)
    
    # Generate basic frames
    total_frames = int(duration * fps)
    print(f"Generating {total_frames} basic frames at {fps} FPS...")
    
    for frame_num in range(total_frames):
        frame = create_frame(text, book_title, chapter_title, author, width, height)
        frame_path = os.path.join(frames_dir, f"frame_{frame_num:06d}.png")
        frame.save(frame_path)
        
        if frame_num % 100 == 0:
            print(f"Frame {frame_num}/{total_frames} ({frame_num/total_frames*100:.1f}%)")
    
    # Encode video with FFmpeg
    output_path = os.path.join(temp_dir, "output.mp4")
    ffmpeg_path = get_ffmpeg_path()
    
    ffmpeg_cmd = [
        ffmpeg_path,
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
                    
                    # Collect text lines until empty line
                    text_lines = []
                    while i < len(lines) and lines[i].strip():
                        text_lines.append(lines[i].strip())
                        i += 1
                    
                    if text_lines:
                        text = ' '.join(text_lines)
                        segments.append({
                            'start': start_seconds,
                            'end': end_seconds,
                            'text': text
                        })
                else:
                    i += 1
            else:
                i += 1
                
        except ValueError:
            i += 1
    
    return segments

def parse_srt_timing_data(srt_content):
    """Parse SRT content to extract timing information only (no text)"""
    if not srt_content or not srt_content.strip():
        print("Warning: No SRT content provided")
        return []
    
    timing_data = []
    lines = srt_content.strip().split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Skip empty lines
        if not line:
            i += 1
            continue
        
        # Check if this is a segment number
        if line.isdigit():
            segment_num = int(line)
            i += 1
            
            # Next line should be timing (HH:MM:SS,mmm --> HH:MM:SS,mmm)
            if i < len(lines) and '-->' in lines[i]:
                timing_line = lines[i].strip()
                try:
                    start_str, end_str = timing_line.split('-->')
                    start_time = time_to_seconds(start_str.strip())
                    end_time = time_to_seconds(end_str.strip())
                    
                    timing_data.append({
                        'segment': segment_num,
                        'start': start_time,
                        'end': end_time
                    })
                except Exception as e:
                    print(f"Warning: Failed to parse timing line: {timing_line}, error: {e}")
                
                # Skip the text content lines (we don't need them)
                i += 1
                while i < len(lines) and lines[i].strip() and not lines[i].strip().isdigit():
                    i += 1
            else:
                i += 1
        else:
            i += 1
    
    print(f"Parsed {len(timing_data)} timing entries from SRT")
    return timing_data

def estimate_missing_timings(timing_data, total_duration):
    """
    Estimate timing for gaps in SRT data based on adjacent entries
    This handles cases where some audio chunks don't have SRT data
    """
    if not timing_data or len(timing_data) == 0:
        print("Warning: No timing data available, cannot estimate")
        return []
    
    # Sort by start time
    timing_data = sorted(timing_data, key=lambda x: x['start'])
    
    # Check for gaps and estimate
    estimated_data = []
    for i, entry in enumerate(timing_data):
        estimated_data.append(entry)
        
        # Check if there's a gap before next entry
        if i < len(timing_data) - 1:
            next_entry = timing_data[i + 1]
            gap_start = entry['end']
            gap_end = next_entry['start']
            gap_duration = gap_end - gap_start
            
            # If there's a significant gap (>0.1s), it means audio chunk has no SRT
            if gap_duration > 0.1:
                print(f"Found gap from {gap_start:.2f}s to {gap_end:.2f}s ({gap_duration:.2f}s)")
                # Create estimated entry for the gap
                estimated_data.append({
                    'segment': f"{entry['segment']}_estimated",
                    'start': gap_start,
                    'end': gap_end,
                    'estimated': True
                })
    
    print(f"Timing data: {len(timing_data)} original, {len(estimated_data)} with estimates")
    return estimated_data

def split_text_into_sentences(text):
    """Split text into sentences, preserving original structure"""
    import re
    
    # First, normalize whitespace (convert multiple spaces/newlines to single space)
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Split on sentence boundaries - more lenient pattern
    # Matches: period/exclamation/question mark followed by space or end of string
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    # Clean up and filter empty sentences and very short fragments
    sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 5]
    
    print(f"Split text into {len(sentences)} sentences")
    return sentences

def match_sentences_to_timings(sentences, timing_data, total_duration):
    """
    Match original text sentences to SRT timing windows
    Uses time-based matching rather than text comparison
    """
    if not timing_data:
        # No timing data - estimate equal distribution
        print("No timing data, using equal distribution")
        duration_per_sentence = total_duration / len(sentences)
        return [
            {
                'text': sent,
                'start': i * duration_per_sentence,
                'end': (i + 1) * duration_per_sentence,
                'estimated': True
            }
            for i, sent in enumerate(sentences)
        ]
    
    # Calculate total text length and timing range
    total_text_len = sum(len(s) for s in sentences)
    timing_range = timing_data[-1]['end'] - timing_data[0]['start']
    
    matched = []
    current_time = 0
    
    for i, sentence in enumerate(sentences):
        # Estimate duration based on sentence length proportion
        sentence_proportion = len(sentence) / total_text_len
        estimated_duration = timing_range * sentence_proportion
        
        # Find overlapping timing windows
        start_time = current_time
        end_time = current_time + estimated_duration
        
        matched.append({
            'text': sentence,
            'start': start_time,
            'end': end_time,
            'estimated': False
        })
        
        current_time = end_time
    
    print(f"Matched {len(matched)} sentences to timing windows")
    return matched

def time_to_seconds(time_str):
    """Convert SRT time format (HH:MM:SS,mmm) to seconds"""
    time_str = time_str.replace(',', '.')
    parts = time_str.split(':')
    
    if len(parts) != 3:
        return 0.0
    
    hours = int(parts[0])
    minutes = int(parts[1])
    seconds = float(parts[2])
    
    return hours * 3600 + minutes * 60 + seconds

def wrap_text(text, font, max_width):
    """Wrap text to fit within max_width"""
    words = text.split()
    lines = []
    current_line = []
    
    for word in words:
        test_line = ' '.join(current_line + [word])
        bbox = font.getbbox(test_line)
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
        y_start = height // 6
        line_spacing = 80
    
    # Try to load a font
    try:
        if os.name == 'nt':  # Windows
            font_paths = [
                "C:\\Windows\\Fonts\\arial.ttf",
                "C:\\Windows\\Fonts\\calibri.ttf",
                "C:\\Windows\\Fonts\\segoeui.ttf"
            ]
        else:  # Linux/Mac
            font_paths = [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/System/Library/Fonts/Arial.ttf",
                "/usr/share/fonts/TTF/arial.ttf"
            ]
        
        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    font = ImageFont.truetype(font_path, font_size)
                    break
                except:
                    continue
        
        if font is None:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    # Collect all text with highlighting
    all_text_lines = []
    for sentence in page_sentences:
        wrapped_lines = wrap_text(sentence['text'], font, max_text_width)
        for line in wrapped_lines:
            all_text_lines.append({
                'text': line,
                'is_highlighted': sentence['start'] <= current_time <= sentence['end']
            })
    
    # Draw text lines
    current_y = y_start
    for line_info in all_text_lines:
        text = line_info['text']
        is_highlighted = line_info['is_highlighted']
        
        # Get text dimensions
        bbox = font.getbbox(text)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Center horizontally
        x = (width - text_width) // 2
        
        # Draw highlight background if needed
        if is_highlighted:
            padding = 10
            highlight_rect = [
                x - padding,
                current_y - padding,
                x + text_width + padding,
                current_y + text_height + padding
            ]
            draw.rectangle(highlight_rect, fill=(255, 255, 0, 100))  # Yellow highlight
        
        # Draw text
        text_color = (255, 255, 255) if not is_highlighted else (0, 0, 0)
        draw.text((x, current_y), text, font=font, fill=text_color)
        
        current_y += text_height + line_spacing
        
        # Stop if we run out of space
        if current_y > height - 100:
            break
    
    return img

def create_frame(text, book_title, chapter_title, author, width, height):
    """Create a basic frame without highlighting"""
    img = Image.new('RGB', (width, height), color=(20, 20, 30))
    draw = ImageDraw.Draw(img)
    
    # Try to load a font
    try:
        if os.name == 'nt':  # Windows
            font_paths = [
                "C:\\Windows\\Fonts\\arial.ttf",
                "C:\\Windows\\Fonts\\calibri.ttf",
                "C:\\Windows\\Fonts\\segoeui.ttf"
            ]
        else:  # Linux/Mac
            font_paths = [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/System/Library/Fonts/Arial.ttf",
                "/usr/share/fonts/TTF/arial.ttf"
            ]
        
        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    font = ImageFont.truetype(font_path, 48)
                    break
                except:
                    continue
        
        if font is None:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    # Draw title
    title_text = f"{book_title} - {chapter_title}"
    bbox = font.getbbox(title_text)
    text_width = bbox[2] - bbox[0]
    x = (width - text_width) // 2
    draw.text((x, 50), title_text, font=font, fill=(255, 255, 255))
    
    # Draw author
    author_text = f"by {author}"
    bbox = font.getbbox(author_text)
    text_width = bbox[2] - bbox[0]
    x = (width - text_width) // 2
    draw.text((x, 100), author_text, font=font, fill=(200, 200, 200))
    
    # Draw text (wrapped)
    max_text_width = int(width * 0.8)
    wrapped_lines = wrap_text(text, font, max_text_width)
    
    current_y = 200
    for line in wrapped_lines:
        bbox = font.getbbox(line)
        text_width = bbox[2] - bbox[0]
        x = (width - text_width) // 2
        draw.text((x, current_y), line, font=font, fill=(255, 255, 255))
        current_y += 60
        
        if current_y > height - 100:
            break
    
    return img

def generate_key_frames_only(pages, duration, width, height, fps, temp_dir):
    """
    Generate frames only at key transition points:
    - Page start
    - Page end  
    - Sentence highlight changes
    
    Instead of 13,652 frames, generate ~100-200 key frames
    """
    key_moments = []
    
    # Collect all key transition times
    for page_idx, page in enumerate(pages):
        page_start = page[0]['start']
        page_end = page[-1]['end']
        
        # Add page start
        key_moments.append({
            'time': page_start,
            'page': page,
            'page_idx': page_idx,
            'type': 'page_start'
        })
        
        # Add each sentence start/end within the page
        for sentence in page:
            key_moments.append({
                'time': sentence['start'],
                'page': page,
                'page_idx': page_idx,
                'type': 'sentence_start',
                'sentence': sentence
            })
            key_moments.append({
                'time': sentence['end'],
                'page': page,
                'page_idx': page_idx,
                'type': 'sentence_end',
                'sentence': sentence
            })
        
        # Add page end
        key_moments.append({
            'time': page_end,
            'page': page,
            'page_idx': page_idx,
            'type': 'page_end'
        })
    
    # Remove duplicates and sort by time
    key_moments = sorted(key_moments, key=lambda x: x['time'])
    
    # Remove exact duplicates
    unique_moments = []
    prev_time = -1
    for moment in key_moments:
        if abs(moment['time'] - prev_time) > 0.01:  # 10ms threshold
            unique_moments.append(moment)
            prev_time = moment['time']
    
    print(f"Generating {len(unique_moments)} key frames (instead of {int(duration * fps)} frames)")
    
    frames_dir = os.path.join(temp_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)
    
    # Generate key frames
    for i, moment in enumerate(unique_moments):
        frame = generate_frame_with_highlight(moment['page'], moment['time'], width, height)
        frame_path = os.path.join(frames_dir, f"frame_{i:06d}.png")
        frame.save(frame_path)
        
        if i % 20 == 0:
            print(f"Key frame {i}/{len(unique_moments)} ({i/len(unique_moments)*100:.1f}%) - Time: {moment['time']:.2f}s")
    
    return frames_dir, len(unique_moments), unique_moments

def create_frame_duration_file(key_moments, temp_dir):
    """
    Create a text file mapping each key frame to its duration.
    FFmpeg will use this for variable-frame-rate video.
    """
    duration_file = os.path.join(temp_dir, "frame_durations.txt")
    
    with open(duration_file, 'w') as f:
        for i in range(len(key_moments) - 1):
            duration = key_moments[i + 1]['time'] - key_moments[i]['time']
            f.write(f"file 'frames/frame_{i:06d}.png'\n")
            f.write(f"duration {duration}\n")
        
        # Last frame
        f.write(f"file 'frames/frame_{len(key_moments) - 1:06d}.png'\n")
    
    return duration_file

def encode_video_with_key_frames(frames_dir, audio_path, duration_file, temp_dir, width, height, crf=20):
    """Encode video using key frames with variable duration."""
    
    # Validate audio before encoding
    audio_info = validate_audio_file(audio_path)
    if not audio_info:
        raise Exception("Invalid audio file for video encoding")
    
    output_path = os.path.join(temp_dir, "output.mp4")
    ffmpeg_path = get_ffmpeg_path()
    
    cmd = [
        ffmpeg_path,
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', duration_file,
        '-i', audio_path,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', str(crf),
        '-pix_fmt', 'yuv420p',
        '-vf', f'scale={width}:{height},fps=10',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        '-threads', '0',
        output_path
    ]
    
    print(f"Encoding video with FFmpeg...")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        # Print FFmpeg output for debugging
        if result.stdout:
            print(f"FFmpeg stdout: {result.stdout}")
        if result.stderr:
            print(f"FFmpeg stderr: {result.stderr}")
        
        if result.returncode != 0:
            raise Exception(f"FFmpeg failed with code {result.returncode}: {result.stderr}")
        
        # Verify output
        if not os.path.exists(output_path):
            raise Exception("Output video file was not created")
        
        output_size = os.path.getsize(output_path)
        if output_size < 1000:  # Less than 1KB
            raise Exception(f"Output video too small: {output_size} bytes")
        
        print(f"Video created successfully: {output_path} ({output_size} bytes)")
        return output_path
        
    except subprocess.TimeoutExpired:
        raise Exception("FFmpeg encoding timed out after 5 minutes")

def validate_audio_file(audio_path):
    """Validate audio file using FFprobe"""
    ffprobe_path = get_ffprobe_path()
    
    cmd = [
        ffprobe_path,
        '-v', 'error',
        '-show_entries', 'format=duration,size',
        '-show_entries', 'stream=codec_name,sample_rate,channels',
        '-of', 'json',
        audio_path
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            info = json.loads(result.stdout)
            print(f"Audio info: {info}")
            return info
        else:
            print(f"FFprobe error: {result.stderr}")
            return None
    except Exception as e:
        print(f"Audio validation error: {e}")
        return None

def normalize_audio_chunk(chunk_index, input_path, output_path):
    """Normalize a single audio chunk (for parallel processing)."""
    cmd = [
        get_ffmpeg_path(), '-y',
        '-i', input_path,
        '-acodec', 'pcm_s16le',
        '-ar', '44100',
        '-ac', '1',
        '-af', 'volume=0.8',
        output_path
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=30)
    if result.returncode != 0:
        raise Exception(f"Normalization failed for chunk {chunk_index}")
    return chunk_index, output_path

def combine_audio_files(audio_files, temp_dir):
    """
    Combine multiple audio files with proper smoothing and normalization.
    Fixes static noise by normalizing formats and adding crossfade smoothing.
    Uses parallel processing for faster normalization.
    """
    if not audio_files:
        raise Exception("No audio files to combine")
    
    if len(audio_files) == 1:
        print("Only one audio file, no combination needed")
        return audio_files[0]
    
    print(f"Combining {len(audio_files)} audio files with smoothing...")
    
    # Validate each audio file first
    for i, audio_file in enumerate(audio_files):
        info = validate_audio_file(audio_file)
        if info:
            duration = info.get('format', {}).get('duration', 'unknown')
            size = info.get('format', {}).get('size', 'unknown')
            print(f"Audio chunk {i}: duration={duration}s, size={size} bytes")
        else:
            print(f"WARNING: Audio chunk {i} may be invalid")
    
    # Step 1: Normalize all audio files to consistent format (PARALLEL)
    print("Step 1: Normalizing audio files in parallel...")
    normalized_files = []
    
    # Use 4 worker threads for parallel processing
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {}
        for i, audio_file in enumerate(audio_files):
            normalized_path = os.path.join(temp_dir, f"normalized_{i}.wav")
            future = executor.submit(normalize_audio_chunk, i, audio_file, normalized_path)
            futures[future] = i
        
        # Collect results as they complete
        results = [None] * len(audio_files)
        for future in as_completed(futures):
            try:
                idx, path = future.result()
                results[idx] = path
                print(f"✓ Chunk {idx} normalized successfully")
            except Exception as e:
                idx = futures[future]
                print(f"⚠ Warning: Failed to normalize audio chunk {idx}: {e}")
                results[idx] = audio_files[idx]  # Use original as fallback
    
    normalized_files = results
    
    # Step 2: Create concat list with normalized files
    print("Step 2: Creating concat list...")
    concat_file = os.path.join(temp_dir, "audio_concat_list.txt")
    with open(concat_file, 'w') as f:
        for audio_file in normalized_files:
            abs_path = os.path.abspath(audio_file).replace('\\', '/')
            f.write(f"file '{abs_path}'\n")
    
    # Step 3: Combine with audio smoothing
    print("Step 3: Combining with audio smoothing...")
    output_path = os.path.join(temp_dir, "combined_audio.mp3")
    
    # Use FFmpeg with audio filters for smooth combination
    combine_cmd = [
        ffmpeg_path,
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concat_file,
        '-c:a', 'libmp3lame',
        '-b:a', '192k',
        '-ar', '44100',
        '-ac', '2',  # Convert back to stereo
        output_path
    ]
    
    print(f"Combining command: {' '.join(combine_cmd)}")
    
    try:
        result = subprocess.run(combine_cmd, capture_output=True, text=True, timeout=120)
        
        # Print FFmpeg output for debugging
        if result.stdout:
            print(f"FFmpeg stdout: {result.stdout}")
        if result.stderr:
            print(f"FFmpeg stderr: {result.stderr}")
        
        if result.returncode != 0:
            raise Exception(f"FFmpeg audio combination failed: {result.stderr}")
        
        # Verify output file exists and has content
        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise Exception("Combined audio file is empty or doesn't exist")
        
        print(f"✓ Audio combined successfully: {os.path.getsize(output_path)} bytes")
        
        # Validate combined audio
        combined_info = validate_audio_file(output_path)
        if combined_info:
            duration = combined_info.get('format', {}).get('duration', 'unknown')
            print(f"✓ Combined audio duration: {duration}s")
        
        return output_path
        
    except subprocess.TimeoutExpired:
        raise Exception("FFmpeg audio combination timed out after 2 minutes")

def generate_ereader_frame(page_sentences, current_time, chapter_title, page_number, width, height, highlight_mode="sentence"):
    """
    Generate an e-reader style frame with book-like appearance.
    
    Args:
        page_sentences: List of sentences for this page
        current_time: Current time in video (for highlighting)
        chapter_title: Chapter name to display at top
        page_number: Current page number
        width, height: Frame dimensions
    """
    # Create image with cream background
    background_color = (245, 243, 232)  # Cream/aged paper
    img = Image.new('RGB', (width, height), color=background_color)
    draw = ImageDraw.Draw(img)
    
    # Load serif fonts
    fonts = load_ereader_fonts(width, height)
    
    # IMPROVED: Define spacing variables for consistency
    font_size = int(38 * (width / 1920))  # Match the reduced font size
    line_height = int(font_size * 1.3)   # Tighter spacing: 1.3x instead of 1.5x
    paragraph_spacing = int(font_size * 0.3)  # Reduced paragraph spacing: 0.3x instead of 0.5x
    
    # IMPROVED: Use more width (85% instead of 80%)
    content_width = int(width * 0.85)
    margin_x = int((width - content_width) // 2)
    margin_y = int(height * 0.08)  # Keep vertical margin for borders
    
    # Draw top border
    border_color = (212, 197, 161)  # Subtle gold/tan
    draw.line([(margin_x, margin_y), (width - margin_x, margin_y)], 
              fill=border_color, width=2)
    
    # Draw chapter title
    title_color = (74, 63, 47)  # Darker brown
    draw_centered_text(draw, chapter_title, fonts['title'], 
                      margin_x, margin_y + 30, content_width, title_color)
    
    # Draw decorative line under title
    title_line_y = margin_y + 100
    line_center = width // 2
    line_width = int(content_width * 0.4)
    draw.line([(line_center - line_width//2, title_line_y),
               (line_center + line_width//2, title_line_y)],
              fill=border_color, width=1)
    
    # Draw main text content with IMPROVED spacing
    text_start_y = margin_y + 140
    current_y = text_start_y
    
    text_color = (44, 36, 22)  # Dark brown/ink
    highlight_color = (255, 230, 165)  # Soft yellow
    
    sentences_rendered = 0
    sentences_visible = 0
    max_visible_y = height - margin_y - 120
    
    for sentence in page_sentences:
        is_current = sentence['start'] <= current_time <= sentence['end']
        
        wrapped_lines = wrap_text_ereader(
            sentence['text'], 
            fonts['body'], 
            content_width - (margin_x * 2)
        )
        
        for line in wrapped_lines:
            # Check if this line is within visible bounds
            if current_y <= max_visible_y:
                sentences_visible += 1
                
                # Draw highlight box if highlighting enabled and current sentence
                if highlight_mode == 'sentence' and is_current:
                    bbox = fonts['body'].getbbox(line)
                    text_width = bbox[2] - bbox[0]
                    text_height = bbox[3] - bbox[1]
                    
                    padding = 6  # Reduced padding for tighter layout
                    highlight_box = [
                        margin_x - padding,
                        current_y - padding,
                        margin_x + text_width + padding,
                        current_y + text_height + padding
                    ]
                    draw.rectangle(highlight_box, fill=highlight_color, outline=None)
                elif highlight_mode == 'word':
                    # TODO: Implement word-level highlighting
                    pass
                
                # Always draw text (regardless of highlight setting)
                draw.text((margin_x, current_y), line, 
                         font=fonts['body'], fill=text_color)
            
            current_y += line_height  # Use improved line height
            sentences_rendered += 1
        
        # Add IMPROVED paragraph spacing after sentence
        current_y += paragraph_spacing
        
        # IMPORTANT: Break if we're running out of space
        if current_y > max_visible_y:
            break
    
    # Log overflow warning with IMPROVED detection
    if sentences_rendered < len(page_sentences):
        overflow_count = len(page_sentences) - sentences_visible
        print(f"⚠️  Page {page_number}: {overflow_count} sentences overflow (not visible on screen)")
        print(f"    Visible: {sentences_visible}/{len(page_sentences)} sentences")
    
    # Draw bottom border
    bottom_y = height - margin_y - 60
    draw.line([(margin_x, bottom_y), (width - margin_x, bottom_y)],
              fill=border_color, width=1)
    
    # Draw page number (bottom right)
    page_num_color = (139, 126, 102)  # Muted brown
    page_text = f"[{page_number}]"
    page_bbox = fonts['page_num'].getbbox(page_text)
    page_text_width = page_bbox[2] - page_bbox[0]
    draw.text((width - margin_x - page_text_width, bottom_y + 20),
              page_text, font=fonts['page_num'], fill=page_num_color)
    
    return img

def split_into_sentences(text):
    """Split text into sentences."""
    # Normalize whitespace
    normalized = re.sub(r'\s+', ' ', text).strip()
    # Split on sentence boundaries
    sentences = re.split(r'(?<=[.!?])\s+', normalized)
    # Filter short fragments
    return [s.strip() for s in sentences if len(s.strip()) > 5]

def wrap_text_pillow(text, font, max_width):
    """Wrap text using Pillow's font metrics."""
    words = text.split(' ')
    lines = []
    current_line = ''
    
    for word in words:
        test_line = f"{current_line} {word}".strip()
        bbox = font.getbbox(test_line)
        width = bbox[2] - bbox[0]
        
        if width <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    
    if current_line:
        lines.append(current_line)
    
    return lines

def precompute_text_layout(text, width, height):
    """
    Pre-compute all text positions for smooth scrolling.
    Returns a list of lines with their Y positions.
    """
    fonts = load_ereader_fonts(width, height)
    padding = 160  # Balanced padding for optimal layout
    max_width = width - (2 * padding)
    
    # Split into sentences
    sentences = split_into_sentences(text)
    
    # Wrap each sentence and track Y positions
    wrapped_lines = []
    current_y = 0
    line_height = int(fonts['body_size'] * 1.6)
    
    for sentence in sentences:
        lines = wrap_text_pillow(sentence, fonts['body'], max_width)
        for line in lines:
            wrapped_lines.append({
                'text': line,
                'y': current_y,
                'sentence': sentence
            })
            current_y += line_height
    
    total_height = current_y
    
    return {
        'lines': wrapped_lines,
        'total_height': total_height,
        'fonts': fonts,
        'padding': padding,
        'line_height': line_height
    }

def calculate_static_page_scroll(current_time, srt_entries, layout, viewport_height, previous_scroll=None):
    """
    Calculate scroll position based on which sentence is currently being spoken.
    Page stays static until highlighted sentence approaches bottom, then smoothly scrolls.
    """
    if not srt_entries:
        return 0
    
    # Find the currently active SRT entry
    current_entry = None
    for entry in srt_entries:
        if entry['start'] <= current_time < entry['end']:
            current_entry = entry
            break
    
    if not current_entry:
        return previous_scroll if previous_scroll is not None else 0
    
    # Find the line that matches this SRT entry
    current_line_y = None
    for line_data in layout['lines']:
        srt_text_norm = normalize_text_for_matching(current_entry['text'])
        sentence_norm = normalize_text_for_matching(line_data['sentence'])
        
        if len(srt_text_norm) >= 3 and (srt_text_norm in sentence_norm or sentence_norm in srt_text_norm):
            current_line_y = line_data['y']
            break
    
    if current_line_y is None:
        return previous_scroll if previous_scroll is not None else 0
    
    # Calculate scroll to keep current line in comfortable reading position
    # Keep line in the upper-middle portion of screen (30% from top)
    # This leaves room for text below while keeping it visible
    target_position = viewport_height * 0.3
    target_scroll = max(0, current_line_y - target_position)
    
    # Ensure we don't scroll past the end
    max_scroll = max(0, layout['total_height'] - viewport_height + 240)  # +240 for header/footer
    target_scroll = min(target_scroll, max_scroll)
    
    # Apply smooth transition if we have a previous scroll position
    if previous_scroll is not None:
        # Only scroll if the difference is significant (more than 50px)
        scroll_diff = abs(target_scroll - previous_scroll)
        if scroll_diff < 50:
            return previous_scroll  # Keep page static
        
        # Smooth transition: ease towards target
        # This creates a gradual scroll effect
        ease_factor = 0.15  # 15% movement per frame
        scroll_y = previous_scroll + (target_scroll - previous_scroll) * ease_factor
    else:
        scroll_y = target_scroll
    
    return scroll_y

def calculate_scroll_position(current_time, total_duration, total_content_height, viewport_height):
    """
    Calculate smooth scroll position based on time.
    Linear interpolation through content.
    (Legacy function - kept for compatibility)
    """
    # Progress through video (0.0 to 1.0)
    progress = min(current_time / total_duration, 1.0)
    
    # Maximum scroll distance
    max_scroll = max(total_content_height - viewport_height + 240, 0)  # +240 for header/footer
    
    # Linear scroll
    scroll_y = progress * max_scroll
    
    return scroll_y

def parse_srt_entries(srt_data):
    """Parse SRT data into structured entries."""
    entries = []
    
    # Normalize line endings (handle both \r\n and \n)
    srt_data_normalized = srt_data.replace('\r\n', '\n').replace('\r', '\n')
    blocks = srt_data_normalized.strip().split('\n\n')
    
    print(f"DEBUG: Parsing SRT data with {len(blocks)} blocks")
    
    for i, block in enumerate(blocks):
        lines = block.strip().split('\n')
        
        if len(lines) >= 3:
            # Find the time line (contains -->)
            time_line = None
            text_lines = []
            
            for line in lines:
                if '-->' in line:
                    time_line = line
                else:
                    # Skip line numbers and empty lines
                    if line.strip() and not line.strip().isdigit():
                        text_lines.append(line)
            
            if time_line and text_lines:
                text = ' '.join(text_lines)
                
                try:
                    start_str, end_str = time_line.split('-->')
                    start_time = parse_time_to_seconds(start_str.strip())
                    end_time = parse_time_to_seconds(end_str.strip())
                    
                    entry = {
                        'start': start_time,
                        'end': end_time,
                        'text': text.strip()
                    }
                    entries.append(entry)
                    print(f"DEBUG: SRT Entry {i+1}: {start_time:.2f}s-{end_time:.2f}s '{text.strip()}'")
                except Exception as e:
                    print(f"DEBUG: Failed to parse block {i+1}: {e}")
    
    print(f"DEBUG: Parsed {len(entries)} SRT entries total")
    return entries

def parse_time_to_seconds(time_str):
    """Parse SRT time format to seconds."""
    parts = time_str.split(':')
    hours = int(parts[0])
    minutes = int(parts[1])
    sec_parts = parts[2].split(',')
    seconds = int(sec_parts[0])
    milliseconds = int(sec_parts[1])
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000

def normalize_text_for_matching(text):
    """
    Aggressively normalize text for matching TTS-generated SRTs against EPUB text.
    """
    import re
    
    # Convert to lowercase
    text = text.lower()
    
    # Remove all common punctuation characters
    text = re.sub(r'[.,!?;:()\'"''""`]', '', text)
    
    # Normalize different types of hyphens or dashes to a space
    text = re.sub(r'[\-—]', ' ', text)
    
    # Normalize multiple spaces to a single space
    text = re.sub(r'\s+', ' ', text)
    
    # Strip leading/trailing whitespace
    return text.strip()

def create_srt_to_sentence_map(srt_entries, all_lines_data):
    """
    Creates a mapping from SRT entry index to the best matching sentence index.
    Uses difflib SequenceMatcher with a lookahead concatenation strategy to handle
    fragmented SRT entries from a TTS server.
    
    Args:
        srt_entries: List of parsed SRT entries.
        all_lines_data: List of pre-computed line data from text layout.
        
    Returns:
        dict: Maps SRT entry index -> line index in layout.
    """
    if not srt_entries or not all_lines_data:
        return {}
    
    mapping = {}
    # Keep track of SRTs that have already been part of a successful combined match
    mapped_srts = set()
    
    for srt_index, srt_entry in enumerate(srt_entries):
        # Skip if this SRT has already been mapped as part of a lookahead
        if srt_index in mapped_srts:
            continue
            
        best_match_score = 0.0
        best_line_index = -1
        best_concatenation_count = 0  # How many SRTs we combined for the best match
        
        # Look ahead up to 3 SRT entries (current + next 2) to form a phrase
        concatenated_text = ""
        for i in range(3):
            lookahead_index = srt_index + i
            if lookahead_index >= len(srt_entries):
                break  # Reached the end of SRTs
            
            # Add the next SRT piece to our test string
            next_text = srt_entries[lookahead_index]['text']
            concatenated_text = (concatenated_text + " " + next_text).strip()
            
            normalized_concatenated_text = normalize_text_for_matching(concatenated_text)
            if len(normalized_concatenated_text) < 3:
                continue
            
            # Now, compare this combined text against all lines
            for line_index, line_data in enumerate(all_lines_data):
                line_text_norm = normalize_text_for_matching(line_data['text'])
                sentence_norm = normalize_text_for_matching(line_data['sentence'])
                
                # Use the higher similarity score between the line and the full sentence
                similarity = max(
                    difflib.SequenceMatcher(None, normalized_concatenated_text, line_text_norm).ratio(),
                    difflib.SequenceMatcher(None, normalized_concatenated_text, sentence_norm).ratio()
                )
                
                if similarity > best_match_score:
                    best_match_score = similarity
                    best_line_index = line_index
                    best_concatenation_count = i + 1  # Record how many SRTs we used (1, 2, or 3)

        # If we found a good match (above the threshold)
        if best_match_score > 0.6:
            # Map all the SRTs that were part of our successful concatenation
            for i in range(best_concatenation_count):
                mapped_srt_index = srt_index + i
                mapping[mapped_srt_index] = best_line_index
                mapped_srts.add(mapped_srt_index)
            
            # Improved logging to show what was matched
            final_matched_text = " ".join([srt_entries[srt_index + i]['text'] for i in range(best_concatenation_count)])
            print(f"  SRT {srt_index}..{srt_index + best_concatenation_count - 1} ('{final_matched_text[:50]}...') -> Line {best_line_index} (score: {best_match_score:.2f})")

    print(f"DEBUG: Similarity mapping created: {len(mapping)} of {len(srt_entries)} SRT entries mapped (threshold: 0.6)")
    return mapping

def check_if_current_sentence_fallback(line_data, current_time, srt_entries):
    """
    Fallback method for checking if line should be highlighted.
    Uses substring matching (original logic).
    """
    if not srt_entries:
        return current_time < 2.0  # Highlight first 2 seconds as fallback
    
    # Find the most recent SRT entry that started before or at current_time
    # and is still active (hasn't ended yet) - this prevents duplicates
    current_entry = None
    latest_start = -1
    
    for entry in srt_entries:
        # Check if this entry is active at current_time
        if entry['start'] <= current_time < entry['end']:
            # If this entry started more recently than our current match, use it
            if entry['start'] > latest_start:
                current_entry = entry
                latest_start = entry['start']
    
    # No active entry found
    if not current_entry:
        return False
    
    # Use ORIGINAL matching logic (simple substring matching)
    srt_text_norm = normalize_text_for_matching(current_entry['text'])
    line_text_norm = normalize_text_for_matching(line_data['text'])
    sentence_norm = normalize_text_for_matching(line_data['sentence'])
    
    # Skip empty or very short SRT entries (like single punctuation)
    if len(srt_text_norm) < 3:
        return False
    
    # ORIGINAL MATCHING: Simple substring matching
    # Check if SRT text is contained in the sentence or vice versa
    if (srt_text_norm in sentence_norm or 
        sentence_norm in srt_text_norm or
        srt_text_norm in line_text_norm or
        line_text_norm in srt_text_norm):
        return True
    
    return False

def check_if_current_sentence_with_mapping(line_index, current_time, srt_entries, srt_map):
    """
    Check if this line should be highlighted using pre-computed similarity mapping.
    This is extremely fast since it's just a lookup.
    
    Args:
        line_index: Index of the current line in layout
        current_time: Current video timestamp
        srt_entries: List of all SRT entries
        srt_map: Pre-computed mapping of SRT index -> line index
    
    Returns:
        bool: True if this line should be highlighted now
    """
    if not srt_entries or not srt_map:
        return False
    
    # Find the currently active SRT entry
    active_srt_index = -1
    for i, entry in enumerate(srt_entries):
        if entry['start'] <= current_time < entry['end']:
            active_srt_index = i
            break  # Use first match (should only be one active at a time)
    
    # No active SRT entry
    if active_srt_index == -1:
        return False
    
    # Look up the corresponding line index from pre-computed map
    line_index_to_highlight = srt_map.get(active_srt_index)
    
    # Check if this line matches the mapped line
    return line_index == line_index_to_highlight

def check_if_current_sentence_sequential(line_data, line_idx, current_time, srt_entries, srt_to_sentence_map):
    """
    Check if this line should be highlighted using sequential mapping.
    Only ONE sentence can be highlighted at any given time.
    
    Args:
        line_data: The line/sentence data
        line_idx: Index of this line in the layout
        current_time: Current video timestamp
        srt_entries: List of all SRT entries
        srt_to_sentence_map: Pre-computed mapping of SRT index -> sentence index
    
    Returns:
        bool: True if this line should be highlighted now
    """
    if not srt_entries or not srt_to_sentence_map:
        return current_time < 2.0  # Fallback: highlight first 2 seconds
    
    # Find the currently active SRT entry (most recent one that's still playing)
    active_srt_idx = None
    latest_start = -1
    
    for srt_idx, entry in enumerate(srt_entries):
        # Check if this SRT entry is active at current_time
        if entry['start'] <= current_time < entry['end']:
            # Use the most recently started one
            if entry['start'] > latest_start:
                active_srt_idx = srt_idx
                latest_start = entry['start']
    
    # No active SRT entry
    if active_srt_idx is None:
        return False
    
    # Check if this line is mapped to the active SRT entry
    mapped_sentence_idx = srt_to_sentence_map.get(active_srt_idx)
    
    if mapped_sentence_idx is not None and mapped_sentence_idx == line_idx:
        return True
    
    return False

def draw_highlight_box(draw, text, font, x, y):
    """Draw highlight box behind text."""
    bbox = font.getbbox(text)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    padding = 6
    highlight_box = [
        x - padding,
        y - padding,
        x + text_width + padding,
        y + text_height + padding
    ]
    draw.rectangle(highlight_box, fill='#FFE066', outline=None)

def draw_chapter_info(draw, fonts, book_title, chapter_title, author, width, height, padding):
    """Draw chapter information with centered chapter title."""
    # Draw chapter title centered at top of frame
    chapter_bbox = fonts['title'].getbbox(chapter_title)
    chapter_width = chapter_bbox[2] - chapter_bbox[0]
    chapter_height = chapter_bbox[3] - chapter_bbox[1]
    chapter_x = (width - chapter_width) // 2  # Center horizontally
    chapter_y = 50  # Fixed position at top of frame (50px from top)
    draw.text(
        (chapter_x, chapter_y),
        chapter_title,
        font=fonts['title'],
        fill='#333'
    )
    
    # REMOVED: Book title and author footer text (per user request)
    # No longer displaying book title and author in the video

def create_scroll_frame(
    layout, scroll_y, current_time, srt_entries,
    book_title, chapter_title, author,
    width, height, highlight_mode,  # Changed from enable_highlight
    srt_to_sentence_map=None  # Sequential mapping to prevent duplicate highlights
):
    """
    Create a single frame with scrolled text.
    """
    # Create image with background from file
    background_path = r"C:\Users\Rajveer\Vite-reader\youtube-video-generator\image.png"
    try:
        # Load and resize background image to fill entire video
        bg_img = Image.open(background_path)
        # Resize to fill the video dimensions (stretch to fit)
        img = bg_img.resize((width, height), Image.Resampling.LANCZOS)
        # Convert to RGB if needed (in case it has alpha channel)
        if img.mode != 'RGB':
            img = img.convert('RGB')
    except Exception as e:
        print(f"Warning: Could not load background image: {e}")
        # Fallback to solid color
        img = Image.new('RGB', (width, height), color='#f8f9fa')
    
    draw = ImageDraw.Draw(img)
    
    # Calculate header offset
    header_height = int(layout['fonts']['title_size'] * 0.8) + 20
    text_start_y = layout['padding'] + header_height
    
    # Add semi-transparent mask behind text area (#FAF3E0 at 65% opacity with rounded corners)
    # Calculate text area dimensions with inner padding for breathing room
    inner_padding = 60  # Extra padding inside the mask for text to breathe
    text_area_left = layout['padding'] - inner_padding
    text_area_top = layout['padding'] + header_height - inner_padding
    text_area_right = width - layout['padding'] + inner_padding
    text_area_bottom = height - layout['padding'] + inner_padding

    # Ensure mask doesn't go outside video bounds
    text_area_left = max(0, text_area_left)
    text_area_top = max(layout['padding'] + header_height - 20, text_area_top)  # Keep below chapter title
    text_area_right = min(width, text_area_right)
    text_area_bottom = min(height, text_area_bottom)

    # Create a transparent overlay for the rounded rectangle
    mask_overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))  # Fully transparent
    mask_draw = ImageDraw.Draw(mask_overlay)

    # Draw rounded rectangle behind text area
    corner_radius = 30  # Rounded corner radius
    mask_draw.rounded_rectangle(
        [(text_area_left, text_area_top), (text_area_right, text_area_bottom)],
        radius=corner_radius,
        fill=(250, 243, 224, 166)  # #FAF3E0 with 65% opacity (166/255)
    )

    # Paste the mask onto the main image
    img.paste(mask_overlay, (0, 0), mask_overlay)
    
    # Draw visible text lines
    for line_idx, line_data in enumerate(layout['lines']):
        line_y = line_data['y'] - scroll_y + text_start_y
        
        # Only draw lines in viewport
        if -50 < line_y < height + 50:
            # Draw highlight based on mode
            if highlight_mode == 'sentence':
                # Use pre-computed mapping if available, otherwise fallback
                if srt_to_sentence_map is not None:
                    is_current = check_if_current_sentence_with_mapping(
                        line_idx, current_time, srt_entries, srt_to_sentence_map
                    )
                else:
                    is_current = check_if_current_sentence_fallback(line_data, current_time, srt_entries)
                
                if is_current:
                    draw_highlight_box(draw, line_data['text'], 
                                     layout['fonts']['body'], 
                                     layout['padding'], line_y)
            elif highlight_mode == 'word':
                # TODO: Implement word-level highlighting
                pass
            
            # Draw text
            draw.text(
                (layout['padding'], line_y),
                line_data['text'],
                font=layout['fonts']['body'],
                fill='#1a1a1a'
            )
    
    # Draw chapter title LAST (after mask and text) to ensure it's always visible on top
    draw_chapter_info(draw, layout['fonts'], book_title, chapter_title, 
                     author, width, height, layout['padding'])
    
    return img

def generate_smart_scroll_frames(
    layout, srt_entries, total_duration,
    book_title, chapter_title, author,
    width, height, highlight_mode, fps=30,
    srt_to_sentence_map=None  # Sequential mapping to prevent duplicate highlights
):
    """
    Generate key frames at SRT boundaries + regular intervals for accurate highlighting.
    """
    frames_dir = tempfile.mkdtemp()
    
    # Generate key frames at SRT boundaries + regular intervals
    key_frame_times = set([0.0, total_duration])
    
    if srt_entries and highlight_mode != 'none':
        # Add key frames at each SRT entry boundary for accurate highlighting
        for entry in srt_entries:
            key_frame_times.add(entry['start'])
            key_frame_times.add(entry['end'])
        
        # Add frames every 0.1s for smoother scrolling (10 fps intervals)
        interval = 0.1
        current_time = 0.0
        while current_time <= total_duration:
            key_frame_times.add(current_time)
            current_time += interval
        
        print(f"Generating {len(key_frame_times)} key frames (SRT boundaries + 0.1s intervals) for {total_duration:.2f}s video")
    else:
        # Fallback to fixed intervals if no SRT or highlighting disabled
        interval_seconds = 2.5
        current_time = 0.0
        while current_time <= total_duration:
            key_frame_times.add(current_time)
            current_time += interval_seconds
        print(f"Generating {len(key_frame_times)} key frames (every {interval_seconds}s) for {total_duration:.2f}s video")
    
    # Convert to sorted list
    key_frame_times = sorted(key_frame_times)
    
    # Track previous scroll position for smooth transitions
    previous_scroll = 0
    
    for idx, current_time in enumerate(key_frame_times):
        # Calculate scroll position based on current sentence (static page with smart scroll)
        if srt_entries and highlight_mode != 'none':
            scroll_y = calculate_static_page_scroll(
                current_time, srt_entries, layout, height, previous_scroll
            )
            previous_scroll = scroll_y  # Update for next frame
        else:
            # Fallback to continuous scroll if no SRT or highlighting disabled
            scroll_y = calculate_scroll_position(
                current_time, total_duration,
                layout['total_height'], height
            )
        
        # Generate frame with highlighting check at this exact time
        frame = create_scroll_frame(
            layout, scroll_y, current_time, srt_entries,
            book_title, chapter_title, author,
            width, height, highlight_mode,
            srt_to_sentence_map  # Pass the mapping
        )
        
        # Save frame with sequential numbering
        frame_path = os.path.join(frames_dir, f"frame_{idx:06d}.png")
        frame.save(frame_path, 'PNG', optimize=False)
        
        # Progress reporting every 50 frames
        if idx % 50 == 0 or idx == len(key_frame_times) - 1:
            progress = (idx + 1) / len(key_frame_times) * 100
            print(f"Frame {idx + 1}/{len(key_frame_times)} ({progress:.1f}%) at {current_time:.2f}s")
    
    return frames_dir, len(key_frame_times)

def load_ereader_fonts(width, height):
    """Load serif fonts appropriate for e-reader style"""
    # Scale font sizes based on video resolution
    base_scale = width / 1920  # Normalize to 1080p
    
    fonts = {}
    
    # Font paths for different systems
    if os.name == 'nt':  # Windows
        font_paths = {
            'serif': [
                "C:\\Windows\\Fonts\\georgia.ttf",
                "C:\\Windows\\Fonts\\times.ttf",
                "C:\\Windows\\Fonts\\timesnewroman.ttf"
            ],
            'serif_bold': [
                "C:\\Windows\\Fonts\\georgiab.ttf",
                "C:\\Windows\\Fonts\\timesbd.ttf"
            ],
            'serif_italic': [
                "C:\\Windows\\Fonts\\georgiai.ttf",
                "C:\\Windows\\Fonts\\timesi.ttf"
            ]
        }
    else:  # Linux/Mac
        font_paths = {
            'serif': [
                "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
                "/System/Library/Fonts/Times New Roman.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
            ],
            'serif_bold': [
                "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
                "/System/Library/Fonts/Times New Roman Bold.ttf"
            ],
            'serif_italic': [
                "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf",
                "/System/Library/Fonts/Times New Roman Italic.ttf"
            ]
        }
    
    # IMPROVED: Smaller font sizes for more content
    # Load body font (38pt - reduced from 52pt)
    body_size = int(38 * base_scale)
    fonts['body'] = load_font_fallback(font_paths['serif'], body_size)
    fonts['body_size'] = body_size
    
    # Load title font (48pt - reduced from 68pt)
    title_size = int(48 * base_scale)
    fonts['title'] = load_font_fallback(font_paths['serif_bold'], title_size)
    fonts['title_size'] = title_size
    
    # Load page number font (24pt - reduced from 36pt)
    page_num_size = int(24 * base_scale)
    fonts['page_num'] = load_font_fallback(font_paths['serif_italic'], page_num_size)
    fonts['page_num_size'] = page_num_size
    
    print(f"Loaded IMPROVED e-reader fonts: body={body_size}pt, title={title_size}pt, page={page_num_size}pt")
    
    return fonts

def load_font_fallback(font_paths, size):
    """Try loading fonts with fallback to default"""
    for font_path in font_paths:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size)
            except:
                continue
    
    # Fallback to default font
    print(f"Warning: Could not load serif font, using default")
    return ImageFont.load_default()

def wrap_text_ereader(text, font, max_width):
    """
    IMPROVED text wrapping for e-reader style with smart punctuation handling.
    Prevents orphaned punctuation and improves readability.
    """
    words = text.split()
    lines = []
    current_line = []
    
    for word in words:
        # Test if adding this word would exceed width
        test_line = ' '.join(current_line + [word])
        bbox = font.getbbox(test_line)
        line_width = bbox[2] - bbox[0]
        
        if line_width <= max_width:
            current_line.append(word)
        else:
            # Current line is full, start new line
            if current_line:
                lines.append(' '.join(current_line))
                current_line = [word]
            else:
                # Single word is too long, force it
                lines.append(word)
    
    # Add remaining words
    if current_line:
        lines.append(' '.join(current_line))
    
    # IMPROVED: Post-process to fix orphaned punctuation
    improved_lines = []
    for i, line in enumerate(lines):
        # Check for orphaned punctuation at start of line
        if i > 0 and line and line[0] in '.,!?;:':
            # Move punctuation to end of previous line
            prev_line = improved_lines[-1]
            improved_lines[-1] = prev_line + line[0]
            line = line[1:] if len(line) > 1 else ""
        
        # Check for orphaned punctuation at end of line (single char)
        if i < len(lines) - 1 and len(line) == 1 and line in '.,!?;:':
            # Move punctuation to start of next line
            if i + 1 < len(lines):
                lines[i + 1] = line + lines[i + 1]
                continue
        
        if line:  # Only add non-empty lines
            improved_lines.append(line)
    
    return improved_lines

def draw_centered_text(draw, text, font, x, y, max_width, color):
    """Draw centered text within given width"""
    bbox = font.getbbox(text)
    text_width = bbox[2] - bbox[0]
    centered_x = x + (max_width - text_width) // 2
    draw.text((centered_x, y), text, font=font, fill=color)

def group_sentences_into_ereader_pages(original_text, timing_data, total_duration, width, height):
    """
    Group original text into pages with timing information
    Uses original text for display, timing_data only for highlighting
    """
    # Split original text into sentences
    sentences = split_text_into_sentences(original_text)
    
    # Match sentences to timing windows
    timed_sentences = match_sentences_to_timings(sentences, timing_data, total_duration)
    
    # Load fonts for layout calculation
    fonts = load_ereader_fonts(width, height)
    body_font = fonts['body']
    font_size = fonts['body_size']
    line_height = font_size * 1.4
    paragraph_spacing = font_size * 0.5
    
    # Calculate available space
    margin_y = height * 0.1
    available_height = height - (margin_y * 2)
    content_width = width * 0.85
    
    # Group sentences into pages based on actual height
    pages = []
    current_page = []
    current_height = 0
    
    for timed_sent in timed_sentences:
        sentence = timed_sent['text']
        
        # Calculate height needed for this sentence
        wrapped_lines = wrap_text_ereader(sentence, body_font, content_width)
        sentence_height = len(wrapped_lines) * line_height + paragraph_spacing
        
        # Check if sentence fits on current page
        if current_height + sentence_height > available_height and current_page:
            # Save current page and start new one
            pages.append(current_page[:])
            current_page = [timed_sent]
            current_height = sentence_height
        else:
            current_page.append(timed_sent)
            current_height += sentence_height
    
    # Add final page
    if current_page:
        pages.append(current_page)
    
    print(f"Grouped {len(timed_sentences)} sentences into {len(pages)} pages")
    return pages

def generate_ereader_key_frames(pages, duration, width, height, fps, temp_dir, chapter_title, highlight_mode="sentence"):
    """
    Generate key frames for e-reader style video with PROPER page tracking.
    Only create frames at actual page transitions and sentence highlights.
    """
    key_moments = []
    
    page_number = 1
    
    for page_idx, page in enumerate(pages):
        page_start = page[0]['start']
        page_end = page[-1]['end']
        
        # Create frame at PAGE START (page transition)
        key_moments.append({
            'time': page_start,
            'page': page,
            'page_idx': page_idx,
            'page_number': page_number,
            'type': 'page_start'
        })
        
        # Create frames for each sentence WITHIN the page (for highlighting)
        for sentence in page:
            # Frame at sentence start (highlight on)
            key_moments.append({
                'time': sentence['start'],
                'page': page,
                'page_idx': page_idx,
                'page_number': page_number,
                'type': 'sentence_highlight_start',
                'sentence': sentence
            })
            
            # Frame at sentence end (highlight off)
            key_moments.append({
                'time': sentence['end'],
                'page': page,
                'page_idx': page_idx,
                'page_number': page_number,
                'type': 'sentence_highlight_end',
                'sentence': sentence
            })
        
        page_number += 1
    
    # Sort by time
    key_moments = sorted(key_moments, key=lambda x: x['time'])
    
    # Remove duplicates (keep only unique times)
    unique_moments = []
    prev_time = -1
    for moment in key_moments:
        if abs(moment['time'] - prev_time) > 0.01:  # 10ms threshold
            unique_moments.append(moment)
            prev_time = moment['time']
    
    print(f"Generating {len(unique_moments)} e-reader key frames for {len(pages)} pages")
    
    # Generate frames
    frames_dir = os.path.join(temp_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)
    
    for i, moment in enumerate(unique_moments):
        frame = generate_ereader_frame(
            moment['page'],
            moment['time'],
            chapter_title,
            moment['page_number'],
            width,
            height,
            highlight_mode  # NEW parameter - pass to frame generation
        )
        frame_path = os.path.join(frames_dir, f"frame_{i:06d}.png")
        frame.save(frame_path)
        
        if i % 20 == 0:
            page_info = f"Page {moment['page_number']}" if moment['type'] == 'page_start' else f"Page {moment['page_number']} (highlight)"
            print(f"E-reader frame {i}/{len(unique_moments)} ({i/len(unique_moments)*100:.1f}%) - {page_info}")
    
    return frames_dir, len(unique_moments), unique_moments

def create_video_with_srt_optimized(audio_path, text, book_title, chapter_title, author, duration, srt_data, temp_dir, video_format="youtube", style="ereader", highlight_mode="sentence"):
    """
    Create video with smooth scrolling instead of page transitions
    """
    print(f"Creating smooth scroll video: {chapter_title}")
    print(f"Text length: {len(text)} characters")
    print(f"Audio duration: {duration}s")
    print(f"Format: {video_format}, Style: {style}, Highlight Mode: {highlight_mode}")
    
    # Set video dimensions based on format
    if video_format == "mobile":
        width, height = 1080, 1920
        fps = 30
    else:  # youtube
        width, height = 1920, 1080
        fps = 30
    
    # NEW: Pre-compute text layout (all lines with Y positions)
    print("Pre-computing text layout...")
    layout = precompute_text_layout(text, width, height)
    print(f"Pre-computed {len(layout['lines'])} wrapped lines, total height: {layout['total_height']}px")
    
    # Parse SRT only if highlighting is enabled
    srt_entries = []
    if highlight_mode != 'none' and srt_data:
        print(f"Parsing SRT data for {highlight_mode}-level highlighting...")
        srt_entries = parse_srt_entries(srt_data)
        print(f"Parsed {len(srt_entries)} SRT entries")
    
    # Create similarity-based SRT-to-sentence mapping for accurate highlighting
    srt_to_sentence_map = None
    if highlight_mode == 'sentence' and srt_entries and layout['lines']:
        print("Creating similarity-based SRT-to-sentence mapping (difflib)...")
        srt_to_sentence_map = create_srt_to_sentence_map(srt_entries, layout['lines'])
    
    # Generate frames with pre-computed mapping
    frames_dir, num_keyframes = generate_smart_scroll_frames(
        layout, srt_entries, duration,
        book_title, chapter_title, author,
        width, height, highlight_mode,  # Pass mode
        fps,  # Pass fps
        srt_to_sentence_map  # Pass the mapping
    )
    
    # Encode with FFmpeg interpolation
    print("Encoding video with FFmpeg interpolation...")
    return create_video_with_ffmpeg_interpolated(
        frames_dir, audio_path, width, height, fps, num_keyframes, duration, 23
    )

if __name__ == "__main__":
    import uvicorn
    print("Starting Optimized YouTube Video Generator with Smart Frame Generation...")
    print("API docs available at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
