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
    srt_data: str = Form(""),  # Make SRT optional - empty string if not provided
    total_duration: str = Form(...),
    book_title: str = Form(...),
    chapter_title: str = Form(...),
    author: str = Form(...),
    format: str = Form("youtube"),  # "youtube" (1920x1080) or "mobile" (1080x1920)
    style: str = Form("ereader"),  # "ereader", "subtitle", or "minimal"
    highlight_mode: str = Form("sentence"),  # Changed from enable_highlight
    scene_images_metadata: str = Form("[]"),  # NEW: JSON array of scene prompts
    scene_image_files: List[UploadFile] = File([])  # NEW: Actual image files from frontend
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
    
    # Parse scene images metadata
    scene_images = []
    if scene_images_metadata and scene_images_metadata != "[]":
        try:
            scene_images = json.loads(scene_images_metadata)
            print(f"[Video Generation] Received {len(scene_images)} scene image metadata entries")
        except json.JSONDecodeError as e:
            print(f"Warning: Invalid scene_images_metadata JSON: {e}")
    
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
        
        # Save scene image files
        scene_image_paths = {}
        for i, img_file in enumerate(scene_image_files):
            if img_file.filename:
                img_path = os.path.join(temp_dir, f"scene_{i}_{img_file.filename}")
                with open(img_path, "wb") as f:
                    content = await img_file.read()
                    f.write(content)
                scene_image_paths[img_file.filename] = img_path
                print(f"Saved scene image: {img_file.filename} ({os.path.getsize(img_path)} bytes)")
        
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
            highlight_mode_value,  # Pass mode instead of boolean
            scene_images,  # NEW: Scene image metadata
            scene_image_paths  # NEW: Scene image file paths
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
    # Reduced threshold from >5 to >2 to preserve short sentences like "Good.", "No!", "I."
    sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 2]
    
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
    
    # Get FFmpeg path once for this function
    ffmpeg_path_local = get_ffmpeg_path()

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
    
    # Use 4 worker threads for parallel processing
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {}
        for i, audio_file in enumerate(audio_files):
            normalized_path = os.path.join(temp_dir, f"normalized_{i}.wav")
            # IMPORTANT: We need to make sure normalize_audio_chunk also has access to ffmpeg
            # It currently calls get_ffmpeg_path() internally, which is good.
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
        ffmpeg_path_local,  # Use the local variable we defined at the start of the function
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
        result = subprocess.run(combine_cmd, capture_output=True, text=True, timeout=300)  # Increased timeout for large files
        
        # Print FFmpeg output for debugging if it fails
        if result.returncode != 0:
            print(f"FFmpeg stdout: {result.stdout}")
            print(f"FFmpeg stderr: {result.stderr}")
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
        raise Exception("FFmpeg audio combination timed out after 5 minutes")

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
    # Filter short fragments - reduced from >5 to >2 to preserve short sentences
    return [s.strip() for s in sentences if len(s.strip()) > 2]

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
    padding = 120
    max_width = width - (2 * padding)
    
    # Split into sentences
    sentences = split_into_sentences(text)
    
    # Wrap each sentence and track Y positions
    wrapped_lines = []
    current_y = 0
    line_height = int(fonts['body_size'] * 1.6)
    
    for sentence_idx, sentence in enumerate(sentences):  # Track sentence index
        lines = wrap_text_pillow(sentence, fonts['body'], max_width)
        for line in lines:
            wrapped_lines.append({
                'text': line,
                'y': current_y,
                'sentence': sentence,
                'sentence_id': sentence_idx  # NEW: Track which sentence this line belongs to
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

def calculate_static_page_scroll(current_time, srt_entries, srt_map, layout, viewport_height, previous_scroll=None):
    """
    Calculate scroll position based on which sentence is currently being spoken,
    using the highly accurate pre-computed SRT-to-sentence map.
    """
    if not srt_entries or not srt_map:
        return previous_scroll if previous_scroll is not None else 0

    # 1. Find the currently active SRT entry index
    active_srt_index = -1
    for i, entry in enumerate(srt_entries):
        if entry['start'] <= current_time < entry['end']:
            active_srt_index = i
            break
    
    if active_srt_index == -1:
        return previous_scroll if previous_scroll is not None else 0

    # 2. Use the accurate map to find the line index to scroll to
    line_indices_to_focus = srt_map.get(active_srt_index)
    
    if line_indices_to_focus is None:
        return previous_scroll if previous_scroll is not None else 0
    
    # NEW: Handle list-based mapping (multi-sentence SRTs)
    if isinstance(line_indices_to_focus, list):
        # Focus on the first line of the group for scrolling
        line_index_to_focus = line_indices_to_focus[0] if line_indices_to_focus else None
        if line_index_to_focus is None:
            return previous_scroll if previous_scroll is not None else 0
    else:
        # Backwards compatibility
        line_index_to_focus = line_indices_to_focus
        
    # 3. Get the Y position of the target line from the pre-computed layout
    # Safety check to ensure the index is valid
    if line_index_to_focus >= len(layout['lines']):
        return previous_scroll if previous_scroll is not None else 0
        
    current_line_y = layout['lines'][line_index_to_focus]['y']
    
    # 4. Calculate scroll position to keep the current line comfortably in view
    # Target position: 30% from the top of the screen
    target_position_on_screen = viewport_height * 0.3
    target_scroll = max(0, current_line_y - target_position_on_screen)
    
    # 5. Ensure we don't scroll past the end of the content
    # Add padding for header/footer visibility
    max_scroll = max(0, layout['total_height'] - viewport_height + layout['padding'] * 2)
    target_scroll = min(target_scroll, max_scroll)
    
    # 6. Apply smoothing to the scroll transition
    if previous_scroll is not None:
        # Ease towards the target scroll position for a smooth effect
        ease_factor = 0.1  # Slower, smoother ease
        scroll_y = previous_scroll + (target_scroll - previous_scroll) * ease_factor
    else:
        scroll_y = target_scroll  # No smoothing for the very first frame
    
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

def split_srt_into_sentences(srt_text):
    """
    Split an SRT text entry into individual sentences.
    Uses the same sentence boundary logic as the main text splitting.
    
    Args:
        srt_text: The text content from an SRT entry
        
    Returns:
        list: Individual sentences from the SRT entry
    """
    import re
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', srt_text).strip()
    
    # Split on sentence boundaries
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    # Filter and clean
    sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 2]
    
    return sentences if sentences else [srt_text]  # Return original if splitting fails

def find_anchor_text_in_srt(anchor_text: str, srt_entries: list, threshold: float = 0.65) -> dict:
    """
    Find best SRT match for anchor_text using the same fuzzy matching as sentence highlighting.
    Reuses normalize_text_for_matching() for consistency.
    
    Args:
        anchor_text: Text snippet from scene analysis (20-100 words)
        srt_entries: Parsed SRT entries from parse_srt_entries()
        threshold: Minimum similarity ratio (default 0.65, lower than 0.7 for longer anchor texts)
    
    Returns:
        dict: {'start_time': float, 'end_time': float, 'match_ratio': float, 'srt_index': int}
              Returns {'start_time': 0, 'end_time': 0, 'match_ratio': 0, 'srt_index': -1} if no match
    """
    best_match = {'start_time': 0, 'end_time': 0, 'match_ratio': 0.0, 'srt_index': -1}
    
    # Normalize anchor text using existing function
    anchor_norm = normalize_text_for_matching(anchor_text)
    
    if len(anchor_norm) < 5:
        return best_match  # Too short to match reliably
    
    # Strategy 1: Try matching against individual SRT entries
    for i, entry in enumerate(srt_entries):
        entry_norm = normalize_text_for_matching(entry['text'])
        ratio = difflib.SequenceMatcher(None, anchor_norm, entry_norm).ratio()
        
        if ratio > best_match['match_ratio']:
            best_match = {
                'start_time': entry['start'],
                'end_time': entry['end'],
                'match_ratio': ratio,
                'srt_index': i
            }
    
    # Strategy 2: Try concatenating 2-5 consecutive SRT entries (anchor_text is 20-100 words)
    if best_match['match_ratio'] < threshold:
        for window_size in [2, 3, 4, 5]:
            for i in range(len(srt_entries) - window_size + 1):
                combined_text = ' '.join([srt_entries[j]['text'] for j in range(i, i + window_size)])
                combined_norm = normalize_text_for_matching(combined_text)
                ratio = difflib.SequenceMatcher(None, anchor_norm, combined_norm).ratio()
                
                if ratio > best_match['match_ratio']:
                    best_match = {
                        'start_time': srt_entries[i]['start'],
                        'end_time': srt_entries[i + window_size - 1]['end'],
                        'match_ratio': ratio,
                        'srt_index': i
                    }
    
    return best_match

def calculate_scene_timings(scene_images: list, srt_entries: list, 
                           scene_image_paths: dict, total_duration: float) -> list:
    """
    Map scene images to video timestamps using anchor_text fuzzy matching.
    Images display from their start time until the next scene starts (or video ends).
    
    Args:
        scene_images: List of scene metadata from frontend (sceneIndex, anchor_text, filename)
        srt_entries: Parsed SRT entries from parse_srt_entries()
        scene_image_paths: Dict mapping filename -> local file path
        total_duration: Total video duration in seconds
    
    Returns:
        List of dicts: {'scene_index', 'start_time', 'end_time', 'image_path', 'match_ratio'}
    """
    scene_timings = []
    
    for scene in scene_images:
        anchor_text = scene.get('anchor_text', '')
        filename = scene.get('filename', '')
        scene_index = scene.get('sceneIndex', -1)
        
        if not anchor_text or not filename:
            print(f"⚠️  Scene {scene_index}: Missing anchor_text or filename, skipping")
            continue
        
        # Check if image file exists
        image_path = scene_image_paths.get(filename)
        if not image_path or not os.path.exists(image_path):
            print(f"⚠️  Scene {scene_index}: Image file not found ({filename}), skipping")
            continue
        
        # Find matching timestamp in SRT using fuzzy matching
        match = find_anchor_text_in_srt(anchor_text, srt_entries)
        
        if match['match_ratio'] < 0.5:
            print(f"⚠️  Scene {scene_index}: Low match ratio ({match['match_ratio']:.2f}), skipping")
            print(f"    Anchor text: {anchor_text[:50]}...")
            continue
        
        scene_timings.append({
            'scene_index': scene_index,
            'start_time': match['start_time'],
            'end_time': None,  # Will be calculated below
            'image_path': image_path,
            'match_ratio': match['match_ratio'],
            'anchor_text_preview': anchor_text[:50]
        })
        
        print(f"✓ Scene {scene_index}: Matched at {match['start_time']:.2f}s (ratio: {match['match_ratio']:.2f})")
    
    # Sort by start_time
    scene_timings.sort(key=lambda x: x['start_time'])
    
    # Calculate end_time (display until next scene starts, or video ends)
    for i, scene_timing in enumerate(scene_timings):
        if i < len(scene_timings) - 1:
            scene_timing['end_time'] = scene_timings[i + 1]['start_time']
        else:
            scene_timing['end_time'] = total_duration
        
        duration = scene_timing['end_time'] - scene_timing['start_time']
        print(f"  Scene {scene_timing['scene_index']}: {scene_timing['start_time']:.1f}s - {scene_timing['end_time']:.1f}s (duration: {duration:.1f}s)")
    
    return scene_timings

def create_frame_with_scene_background(scene_image_path: str, text_frame: Image.Image, 
                                      opacity: float = 0.35) -> Image.Image:
    """
    Create a composite frame with scene image as full background and text overlay.
    Darkens/blurs the background slightly to maintain text readability.
    
    Args:
        scene_image_path: Path to scene image file
        text_frame: Generated text frame (from existing frame generation)
        opacity: Text overlay opacity (0-1), default 0.35 for readability
    
    Returns:
        PIL Image with scene background and text overlay
    """
    try:
        # Load scene image
        scene_img = Image.open(scene_image_path).convert('RGB')
        frame_width, frame_height = text_frame.size
        
        # Resize scene image to match frame dimensions (stretch to fill)
        scene_resized = scene_img.resize((frame_width, frame_height), Image.Resampling.LANCZOS)
        
        # Apply subtle darkening (multiply by 0.7 to darken)
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Brightness(scene_resized)
        scene_darkened = enhancer.enhance(0.7)
        
        # Optional: Apply slight blur for depth-of-field effect
        from PIL import ImageFilter
        scene_blurred = scene_darkened.filter(ImageFilter.GaussianBlur(radius=2))
        
        # Create semi-transparent text overlay
        # Convert text frame to RGBA to apply opacity
        text_rgba = text_frame.convert('RGBA')
        
        # Create an alpha mask for the text frame
        alpha = Image.new('L', text_rgba.size, int(255 * opacity))
        text_rgba.putalpha(alpha)
        
        # Composite: scene background + semi-transparent text
        result = scene_blurred.copy()
        result.paste(text_rgba, (0, 0), text_rgba)
        
        return result.convert('RGB')
        
    except Exception as e:
        print(f"Error creating scene background frame: {e}")
        return text_frame  # Fallback to text-only frame

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
    # REMOVED: mapped_srts - no longer needed with strict sequential mapping
    # REMOVED: mapped_lines - no longer blocking duplicate mapping to allow repeated text highlighting
    last_mapped_line = -1  # Track last mapped line for sequential enforcement
    
    for srt_index, srt_entry in enumerate(srt_entries):
        # No need to check if already mapped - strict sequential means each SRT processed once
        
        # NEW: Strict sequential matching with small sliding window
        # Removes lookahead concatenation and multi-sentence splitting to prevent skipping
        
        best_match_score = 0.0
        best_line_index = -1
        
        # Define search window: next 5 lines only (prevents skipping)
        window_size = 5
        start_line = max(0, last_mapped_line)
        end_line = min(start_line + window_size, len(all_lines_data))
        
        # Normalize SRT text
        srt_text_norm = normalize_text_for_matching(srt_entry['text'])
        
        if len(srt_text_norm) < 3:
            continue  # Skip very short SRT entries
        
        # Search within the window
        for line_index in range(start_line, end_line):
            line_data = all_lines_data[line_index]
            line_text_norm = normalize_text_for_matching(line_data['text'])
            sentence_norm = normalize_text_for_matching(line_data['sentence'])
            
            # Calculate similarity
            similarity = max(
                difflib.SequenceMatcher(None, srt_text_norm, line_text_norm).ratio(),
                difflib.SequenceMatcher(None, srt_text_norm, sentence_norm).ratio()
            )
            
            if similarity > best_match_score:
                best_match_score = similarity
                best_line_index = line_index
        
        # Map if we found a good match
        if best_match_score > 0.6 and best_line_index >= last_mapped_line:
            mapping[srt_index] = [best_line_index]
            last_mapped_line = best_line_index
            
            print(f"  SRT {srt_index} -> Line {best_line_index} (score: {best_match_score:.2f})")
        else:
            # No good match within window - might be extra narration, sound effect, etc.
            # Don't map it, just continue
            print(f"  SRT {srt_index} -> No match (best score: {best_match_score:.2f})")

    print(f"DEBUG: Sequential mapping created: {len(mapping)} of {len(srt_entries)} SRT entries mapped")
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

def check_if_current_sentence_with_mapping(line_index, current_time, srt_entries, srt_map, all_lines_data=None, fallback_sentence_id=None):
    """
    Check if this line should be highlighted using pre-computed similarity mapping.
    Returns (is_highlighted, active_sentence_id) where:
    - is_highlighted: True if this line should be highlighted
    - active_sentence_id: The currently active sentence ID (or None)
    
    If no active SRT, uses fallback_sentence_id to persist last highlight.
    
    Args:
        line_index: Index of the current line in layout
        current_time: Current video timestamp
        srt_entries: List of all SRT entries
        srt_map: Pre-computed mapping of SRT index -> line index
        all_lines_data: Optional list of all line data with sentence_id
        fallback_sentence_id: Sentence ID to use when no SRT is active (persistence)
    
    Returns:
        tuple: (is_highlighted: bool, active_sentence_id: int or None)
    """
    if not srt_entries or not srt_map:
        return False, None
    
    # Find the currently active SRT entry
    active_srt_index = -1
    for i, entry in enumerate(srt_entries):
        if entry['start'] <= current_time < entry['end']:
            active_srt_index = i
            break  # Use first match (should only be one active at a time)
    
    # NEW: If no active SRT, use fallback (persist previous highlight)
    if active_srt_index == -1:
        if fallback_sentence_id is not None and all_lines_data and line_index < len(all_lines_data):
            current_line_data = all_lines_data[line_index]
            current_sentence_id = current_line_data.get('sentence_id')
            return current_sentence_id == fallback_sentence_id, fallback_sentence_id
        return False, None
    
    # Look up the corresponding line index from pre-computed map
    mapped_line_indices = srt_map.get(active_srt_index)
    
    if mapped_line_indices is None:
        # No mapping, persist fallback if available
        if fallback_sentence_id is not None and all_lines_data and line_index < len(all_lines_data):
            current_line_data = all_lines_data[line_index]
            current_sentence_id = current_line_data.get('sentence_id')
            return current_sentence_id == fallback_sentence_id, fallback_sentence_id
        return False, None
    
    # NEW: Handle both single line (list with one element) and multiple lines (list)
    if not isinstance(mapped_line_indices, list):
        # Backwards compatibility: convert to list
        mapped_line_indices = [mapped_line_indices]
    
    # Check if current line matches ANY of the mapped lines
    for mapped_line_index in mapped_line_indices:
        if not all_lines_data:
            # Fallback: Check if this line matches the mapped line
            if line_index == mapped_line_index:
                return True, None
            continue
        
        if mapped_line_index >= len(all_lines_data):
            continue
        
        mapped_line_data = all_lines_data[mapped_line_index]
        active_sentence_id = mapped_line_data.get('sentence_id')
        
        if active_sentence_id is None:
            # Fallback: just check if line indices match
            if line_index == mapped_line_index:
                return True, None
            continue
        
        # Check if current line belongs to the same sentence
        if line_index >= len(all_lines_data):
            continue
        
        current_line_data = all_lines_data[line_index]
        current_sentence_id = current_line_data.get('sentence_id')
        
        # Highlight if both lines belong to the same sentence
        if current_sentence_id == active_sentence_id:
            return True, active_sentence_id
    
    return False, None  # No match found

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
    """Draw chapter information with chapter title on right side."""
    # Draw chapter title on the right side (top)
    chapter_bbox = fonts['title'].getbbox(chapter_title)
    chapter_width = chapter_bbox[2] - chapter_bbox[0]
    chapter_x = width - padding - chapter_width
    draw.text(
        (chapter_x, padding),
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
    srt_to_sentence_map=None,  # Sequential mapping to prevent duplicate highlights
    last_highlighted_sentence_id=None,  # NEW: Track previous highlight to prevent flickering
    scene_timings=None  # NEW: Scene image timings for overlay
):
    """
    Create a single frame with scrolled text.
    Returns: (frame: Image, current_highlighted_sentence_id: int or None)
    """
    # Create image
    img = Image.new('RGB', (width, height), color='#f8f9fa')
    draw = ImageDraw.Draw(img)
    
    # Draw gradient background (optional)
    gradient = Image.new('RGB', (width, height), '#f8f9fa')
    img.paste(gradient)
    
    # Calculate header offset
    header_height = int(layout['fonts']['title_size'] * 0.8) + 20
    text_start_y = layout['padding'] + header_height
    
    # NEW: Track which sentence is highlighted in this frame
    current_highlighted_sentence_id = last_highlighted_sentence_id
    
    # Draw visible text lines
    for line_idx, line_data in enumerate(layout['lines']):
        line_y = line_data['y'] - scroll_y + text_start_y
        
        # Only draw lines in viewport
        if -50 < line_y < height + 50:
            # Draw highlight based on mode
            if highlight_mode == 'sentence':
                # Use pre-computed mapping if available, otherwise fallback
                if srt_to_sentence_map is not None:
                    # NEW: Pass fallback_sentence_id and get active sentence back
                    is_current, active_sentence_id = check_if_current_sentence_with_mapping(
                        line_idx, current_time, srt_entries, srt_to_sentence_map,
                        layout['lines'],  # Pass all_lines_data for sentence_id matching
                        last_highlighted_sentence_id  # NEW: Fallback to persist highlight
                    )
                    
                    # NEW: Update tracking once if we found a new active sentence (not per line)
                    if active_sentence_id is not None and active_sentence_id != current_highlighted_sentence_id:
                        current_highlighted_sentence_id = active_sentence_id
                else:
                    is_current = check_if_current_sentence_fallback(line_data, current_time, srt_entries)
                    # Note: fallback doesn't provide sentence_id, so we can't update tracking
                
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
    
    # Draw chapter info (header/footer)
    draw_chapter_info(draw, layout['fonts'], book_title, chapter_title, 
                     author, width, height, layout['padding'])
    
    # NEW: Check if any scene should be displayed at current_time
    if scene_timings:
        for scene in scene_timings:
            if scene['start_time'] <= current_time < scene['end_time']:
                # Apply scene background
                img = create_frame_with_scene_background(scene['image_path'], img)
                break  # Only one scene at a time
    
    # NEW: Return both frame and current highlight state
    return img, current_highlighted_sentence_id

def generate_smart_scroll_frames(
    layout, srt_entries, total_duration,
    book_title, chapter_title, author,
    width, height, highlight_mode, fps=30,
    srt_to_sentence_map=None,  # Sequential mapping to prevent duplicate highlights
    scene_timings=None  # NEW: Scene image timings for overlay
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
    
    # NEW: Track last highlighted sentence to prevent flickering
    last_highlighted_sentence_id = None
    
    for idx, current_time in enumerate(key_frame_times):
        # Calculate scroll position based on current sentence (static page with smart scroll)
        if srt_entries and highlight_mode != 'none':
            scroll_y = calculate_static_page_scroll(
                current_time, srt_entries, srt_to_sentence_map, layout, height, previous_scroll
            )
            previous_scroll = scroll_y  # Update for next frame
        else:
            # Fallback to continuous scroll if no SRT or highlighting disabled
            scroll_y = calculate_scroll_position(
                current_time, total_duration,
                layout['total_height'], height
            )
        
        # Generate frame with highlighting check at this exact time
        frame, last_highlighted_sentence_id = create_scroll_frame(
            layout, scroll_y, current_time, srt_entries,
            book_title, chapter_title, author,
            width, height, highlight_mode,
            srt_to_sentence_map,  # Pass the mapping
            last_highlighted_sentence_id,  # NEW: Pass previous highlight
            scene_timings  # NEW: Pass scene timings
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

def create_video_with_srt_optimized(audio_path, text, book_title, chapter_title, author, duration, srt_data, temp_dir, video_format="youtube", style="ereader", highlight_mode="sentence", scene_images=None, scene_image_paths=None):
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
    
    # Calculate scene timings (NEW)
    scene_timings = []
    if scene_images and srt_entries:
        print("Calculating scene image timings using anchor_text matching...")
        scene_timings = calculate_scene_timings(
            scene_images, srt_entries, scene_image_paths or {}, duration
        )
        print(f"✓ Prepared {len(scene_timings)} scene images for video overlay")
    
    # Generate frames with pre-computed mapping
    frames_dir, num_keyframes = generate_smart_scroll_frames(
        layout, srt_entries, duration,
        book_title, chapter_title, author,
        width, height, highlight_mode,  # Pass mode
        fps,  # Pass fps
        srt_to_sentence_map,  # Pass the mapping
        scene_timings  # NEW: Pass scene timings
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
