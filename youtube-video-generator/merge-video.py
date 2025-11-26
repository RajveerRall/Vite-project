#!/usr/bin/env python3
"""
Merge multiple chapter videos into a single video file.
Identifies videos by numeric prefix (001_, 002_, etc.) and merges them in sequence.
"""

import os
import sys
import subprocess
import tempfile
import shutil
import re
from pathlib import Path
from typing import List, Tuple

def get_ffmpeg_path():
    """Get FFmpeg executable path"""
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

def find_video_files(directory: str) -> List[Tuple[Tuple[int, int], str]]:
    """
    Find all video files in directory and extract their sequence numbers.
    Returns list of ((priority, sequence_number), file_path) tuples, sorted by priority then sequence.
    Handles multiple naming patterns:
    - 001_filename.mp4
    - Chapter 1.mp4, Chapter 2.mp4 (comes after Letters)
    - Letter 1.mp4, Letter 2.mp4 (comes first)
    - Any filename with a number in it
    """
    video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.m4v'}
    video_files = []
    
    directory_path = Path(directory)
    if not directory_path.exists():
        raise FileNotFoundError(f"Directory not found: {directory}")
    
    print(f"Scanning directory: {directory}")
    
    for file_path in directory_path.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in video_extensions:
            filename = file_path.name
            sequence = None
            priority = 1000  # Default priority (higher = later in sort)
            type_name = "File"
            
            # Pattern 1: 001_filename.mp4, 002_filename.mp4, etc.
            match = re.match(r'^(\d+)_', filename)
            if match:
                sequence = int(match.group(1))
                priority = 500  # Middle priority for numbered files
                type_name = "Numbered"
            else:
                # Pattern 2: Letter 1.mp4, Letter 2.mp4, etc. (HIGHEST PRIORITY - comes first)
                match = re.search(r'^Letter\s+(\d+)', filename, re.IGNORECASE)
                if match:
                    sequence = int(match.group(1))
                    priority = 0  # Lowest priority number = comes first
                    type_name = "Letter"
                else:
                    # Pattern 3: Chapter 1.mp4, Chapter 2.mp4, etc. (comes after Letters)
                    match = re.search(r'^Chapter\s+(\d+)', filename, re.IGNORECASE)
                    if match:
                        sequence = int(match.group(1))
                        priority = 100  # Higher than Letters, lower than others
                        type_name = "Chapter"
                    else:
                        # Pattern 4: Part, Section, etc.
                        match = re.search(r'^(?:Part|Section)\s+(\d+)', filename, re.IGNORECASE)
                        if match:
                            sequence = int(match.group(1))
                            priority = 200
                            type_name = "Part/Section"
                        else:
                            # Pattern 5: Any number in the filename (prefer numbers after common words)
                            match = re.search(r'\w+\s+(\d+)', filename, re.IGNORECASE)
                            if match:
                                sequence = int(match.group(1))
                                priority = 300
                            else:
                                # Pattern 6: Any leading digits
                                match = re.search(r'^(\d+)', filename)
                                if match:
                                    sequence = int(match.group(1))
                                    priority = 400
                                else:
                                    # Pattern 7: Any standalone number in filename
                                    match = re.search(r'\b(\d+)\b', filename)
                                    if match:
                                        sequence = int(match.group(1))
                                        priority = 500
            
            if sequence is not None:
                # Use tuple of (priority, sequence) for sorting
                # Lower priority number = earlier in sort
                sort_key = (priority, sequence)
                video_files.append((sort_key, str(file_path)))
                print(f"  Found: {filename} (type: {type_name}, sequence: {sequence:03d}, priority: {priority})")
            else:
                print(f"  Warning: {filename} has no sequence number, skipping")
    
    # Sort by priority first, then by sequence number
    video_files.sort(key=lambda x: x[0])
    
    if not video_files:
        raise ValueError("No video files with sequence numbers found in directory")
    
    print(f"\n✓ Found {len(video_files)} video files")
    print("\nMerge order:")
    for i, ((priority, seq), file_path) in enumerate(video_files, 1):
        filename = os.path.basename(file_path)
        type_name = "Letter" if priority == 0 else "Chapter" if priority == 100 else "File"
        print(f"  {i:2d}. {type_name} {seq} - {filename}")
    
    return video_files

def create_concat_list(video_files: List[Tuple[Tuple[int, int], str]], temp_dir: str) -> str:
    """Create FFmpeg concat list file"""
    concat_list_path = os.path.join(temp_dir, "concat_list.txt")
    
    with open(concat_list_path, "w", encoding="utf-8") as f:
        for (priority, sequence), video_path in video_files:
            # Use absolute path with forward slashes (FFmpeg prefers this)
            abs_path = os.path.abspath(video_path).replace("\\", "/")
            f.write(f"file '{abs_path}'\n")
    
    return concat_list_path

def merge_videos(video_files: List[Tuple[Tuple[int, int], str]], output_path: str) -> bool:
    """Merge videos using FFmpeg concat"""
    ffmpeg_path = get_ffmpeg_path()
    temp_dir = tempfile.mkdtemp()
    
    try:
        print(f"\nCreating concat list...")
        concat_list_path = create_concat_list(video_files, temp_dir)
        
        print(f"\nMerging {len(video_files)} videos into: {output_path}")
        print("This may take a while depending on video sizes...")
        
        # FFmpeg concat command
        cmd = [
            ffmpeg_path,
            '-y',  # Overwrite output file
            '-f', 'concat',
            '-safe', '0',
            '-i', concat_list_path,
            '-c', 'copy',  # No re-encoding, just concatenate (fast)
            output_path
        ]
        
        print(f"\nRunning: {' '.join(cmd[:6])}... (concat)")
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        if not os.path.exists(output_path):
            raise Exception("Merged video file was not created")
        
        file_size = os.path.getsize(output_path)
        file_size_mb = file_size / (1024 * 1024)
        print(f"\n✓ Success! Merged video created: {output_path}")
        print(f"  File size: {file_size_mb:.2f} MB")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"\n✗ FFmpeg error:")
        print(f"  Return code: {e.returncode}")
        if e.stderr:
            print(f"  Error: {e.stderr[:500]}")
        return False
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False
        
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python merge_chapters.py <directory> [output_file]")
        print("\nExample:")
        print("  python merge_chapters.py C:\\Videos\\A_Christmas_Carol")
        print("  python merge_chapters.py C:\\Videos\\A_Christmas_Carol output.mp4")
        sys.exit(1)
    
    directory = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    try:
        # Find all video files
        video_files = find_video_files(directory)
        
        # Determine output filename
        if output_file:
            output_path = output_file
        else:
            # Use directory name + "_Complete.mp4"
            dir_name = os.path.basename(os.path.abspath(directory))
            output_path = os.path.join(directory, f"{dir_name}_Complete.mp4")
        
        # Make sure output path is absolute
        output_path = os.path.abspath(output_path)
        
        print(f"\nOutput will be saved to: {output_path}")
        
        # Confirm before proceeding
        response = input(f"\nProceed with merge? (y/n): ").strip().lower()
        if response != 'y':
            print("Cancelled.")
            sys.exit(0)
        
        # Merge videos
        success = merge_videos(video_files, output_path)
        
        if success:
            print(f"\n🎉 All done! Your merged video is ready: {output_path}")
            sys.exit(0)
        else:
            print(f"\n❌ Merge failed. Please check the errors above.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\nCancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()