#!/usr/bin/env python3
"""
Streamlit UI for merging multiple chapter videos into a single video file.
Allows manual arrangement and shows timestamps for each video.
"""

import os
import sys
import subprocess
import tempfile
import shutil
import re
from pathlib import Path
from typing import List, Dict, Optional, Callable
import streamlit as st
try:
    from streamlit_sortables import sort_items
except ImportError:
    sort_items = None

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

def get_ffprobe_path():
    """Get FFprobe executable path"""
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
    
    # Fallback: try replacing 'ffmpeg' with 'ffprobe' in ffmpeg path
    try:
        ffmpeg_path = get_ffmpeg_path()
        if 'ffmpeg' in ffmpeg_path:
            probe_path = ffmpeg_path.replace('ffmpeg', 'ffprobe')
            subprocess.run([probe_path, "-version"], capture_output=True, check=True)
            return probe_path
    except:
        pass
    
    raise Exception("FFprobe not found. Please install FFmpeg and add it to your PATH.")

def get_video_duration(video_path: str) -> float:
    """Get video duration in seconds using ffprobe"""
    try:
        ffprobe_path = get_ffprobe_path()
        cmd = [
            ffprobe_path,
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=30)
        duration = float(result.stdout.strip())
        return duration
    except Exception as e:
        if 'st' in sys.modules:
            st.warning(f"Could not get duration for {os.path.basename(video_path)}: {e}")
        return 0.0

def format_timestamp(seconds: float) -> str:
    """Format seconds as HH:MM:SS"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"

def find_video_files(directory: str) -> List[Dict]:
    """
    Find all video files in directory and extract their sequence numbers if available.
    Returns list of dictionaries with video info.
    Includes ALL video files, even if they don't have sequence numbers.
    Handles multiple naming patterns:
    - 001_filename.mp4
    - Chapter 1.mp4, Chapter 2.mp4 (comes after Letters)
    - Letter 1.mp4, Letter 2.mp4 (comes first)
    - Any filename with a number in it
    - Files without numbers (sorted alphabetically)
    """
    video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.m4v'}
    video_files = []
    
    directory_path = Path(directory)
    if not directory_path.exists():
        raise FileNotFoundError(f"Directory not found: {directory}")
    
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
            
            # Include ALL videos, even if they don't have sequence numbers
            # For videos without sequence, use filename for sorting (alphabetical)
            if sequence is None:
                # Use a large sequence number and sort by filename
                sequence = 999999  # Large number to sort after numbered videos
                type_name = "Unnumbered"
            
            video_files.append({
                'filename': filename,
                'path': str(file_path),
                'priority': priority,
                'sequence': sequence,
                'type': type_name,
                'duration': 0.0,  # Will be filled later
                'start_time': 0.0  # Will be calculated after ordering
            })
    
    # Sort by priority first, then by sequence number, then by filename (for unnumbered files)
    video_files.sort(key=lambda x: (x['priority'], x['sequence'], x['filename']))
    
    if not video_files:
        raise ValueError("No video files found in directory")
    
    return video_files

def create_concat_list(video_files: List[Dict], temp_dir: str) -> str:
    """Create FFmpeg concat list file"""
    concat_list_path = os.path.join(temp_dir, "concat_list.txt")
    
    with open(concat_list_path, "w", encoding="utf-8") as f:
        for video in video_files:
            # Use absolute path with forward slashes (FFmpeg prefers this)
            abs_path = os.path.abspath(video['path']).replace("\\", "/")
            f.write(f"file '{abs_path}'\n")
    
    return concat_list_path

def merge_videos(video_files: List[Dict], output_path: str, progress_callback: Optional[Callable[[str], None]] = None) -> bool:
    """Merge videos using FFmpeg concat"""
    ffmpeg_path = get_ffmpeg_path()
    temp_dir = tempfile.mkdtemp()
    
    try:
        if progress_callback:
            progress_callback("Creating concat list...")
        
        concat_list_path = create_concat_list(video_files, temp_dir)
        
        if progress_callback:
            progress_callback(f"Merging {len(video_files)} videos...")
        
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
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        if not os.path.exists(output_path):
            raise Exception("Merged video file was not created")
        
        return True
        
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr[:500] if e.stderr else str(e)
        if progress_callback:
            progress_callback(f"Error: {error_msg}")
        return False
    except Exception as e:
        if progress_callback:
            progress_callback(f"Error: {str(e)}")
        return False
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def main():
    """Streamlit main function"""
    st.set_page_config(
        page_title="Video Merger",
        page_icon="🎬",
        layout="wide"
    )
    
    st.title("🎬 Video Chapter Merger")
    st.markdown("Select a folder and arrange videos in your desired order. Timestamps will be shown for each video.")
    
    # Initialize session state
    if 'video_files' not in st.session_state:
        st.session_state.video_files = []
    if 'selected_folder' not in st.session_state:
        st.session_state.selected_folder = None
    if 'durations_loaded' not in st.session_state:
        st.session_state.durations_loaded = False
    
    # Folder selection
    st.markdown("---")
    st.subheader("📁 Folder Selection")
    
    col1, col2 = st.columns([3, 1])
    
    with col1:
        folder_path = st.text_input(
            "Folder Path",
            value=st.session_state.selected_folder or "",
            placeholder="C:\\Users\\Rajveer\\Downloads\\Frankienstien",
            label_visibility="collapsed"
        )
    
    with col2:
        st.write("")  # Spacing
        if st.button("🔍 Scan Folder", type="primary", use_container_width=True):
            if folder_path and os.path.isdir(folder_path):
                with st.spinner("Scanning folder..."):
                    try:
                        videos = find_video_files(folder_path)
                        st.session_state.video_files = videos
                        st.session_state.selected_folder = folder_path
                        st.session_state.durations_loaded = False  # Reset flag when scanning new folder
                        st.success(f"Found {len(videos)} videos!")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Error: {e}")
            else:
                st.error("Please enter a valid folder path")
    
    # Display and reorder videos
    if st.session_state.video_files:
        st.markdown("---")
        st.subheader("📋 Video Order & Timestamps")
        
        # Check if durations need to be loaded (only if not already attempted)
        needs_duration_check = not st.session_state.durations_loaded and any(v.get('duration', 0) == 0 for v in st.session_state.video_files)
        
        if needs_duration_check:
            with st.spinner("Getting video durations... This may take a moment."):
                progress_bar = st.progress(0)
                status_text = st.empty()
                
                for i, video in enumerate(st.session_state.video_files):
                    if video.get('duration', 0) == 0:
                        status_text.text(f"Analyzing {video['filename']}... ({i+1}/{len(st.session_state.video_files)})")
                        try:
                            duration = get_video_duration(video['path'])
                            video['duration'] = duration if duration > 0 else 0.0
                        except Exception as e:
                            st.warning(f"Could not get duration for {video['filename']}: {e}")
                            video['duration'] = 0.0
                    progress_bar.progress((i + 1) / len(st.session_state.video_files))
                
                # Mark as loaded to prevent infinite loop
                st.session_state.durations_loaded = True
                
                # Recalculate timestamps after getting durations
                cumulative_time = 0.0
                for video in st.session_state.video_files:
                    video['start_time'] = cumulative_time
                    cumulative_time += video['duration']
                
                st.rerun()
        
        # Calculate cumulative timestamps (always do this, even if durations are 0)
        cumulative_time = 0.0
        for video in st.session_state.video_files:
            video['start_time'] = cumulative_time
            cumulative_time += video['duration']
        
        # Reordering section
        st.markdown("**Reorder videos using up/down buttons" + (" or drag-and-drop" if sort_items else "") + ":**")
        
        # Try drag-and-drop if available
        if sort_items:
            try:
                # Create items for sortable list - simple list of strings when multi_containers=False
                # Use filename as unique identifier (prefixed with index for display)
                video_items = []
                for i, video in enumerate(st.session_state.video_files):
                    # Store index in the item so we can track original position
                    video_items.append(f"[{i}] #{i+1} - {video['filename']} | {video['type']} {video['sequence']} | {format_timestamp(video['duration'])}")
                
                # When multi_containers=False, pass the list directly (not wrapped in dict)
                sorted_items = sort_items(video_items, multi_containers=False)
                
                if sorted_items and len(sorted_items) == len(st.session_state.video_files):
                    # Extract new order from sorted items
                    # Each item is like "[0] #1 - filename.mp4 | ...", extract the number in brackets
                    new_order = []
                    for sorted_item in sorted_items:
                        # Extract the index from brackets (e.g., "[0]" -> 0)
                        match = re.search(r'\[(\d+)\]', sorted_item)
                        if match:
                            original_index = int(match.group(1))
                            new_order.append(original_index)
                    
                    # Check if order changed
                    current_order = list(range(len(st.session_state.video_files)))
                    
                    if new_order != current_order and len(new_order) == len(st.session_state.video_files):
                        # Reorder videos based on new order
                        reordered_videos = [st.session_state.video_files[i] for i in new_order]
                        st.session_state.video_files = reordered_videos
                        st.rerun()
            except Exception as e:
                # If drag-drop fails, fall back to buttons only
                st.warning(f"Drag-and-drop unavailable: {str(e)}. Use up/down buttons instead.")
        
        # Display video list with up/down buttons
        for i, video in enumerate(st.session_state.video_files):
            with st.container():
                col1, col2, col3, col4, col5, col6, col7 = st.columns([0.5, 3, 1.5, 1.5, 1.5, 0.5, 0.5])
                
                with col1:
                    st.markdown(f"**#{i+1}**")
                
                with col2:
                    st.markdown(f"**{video['filename']}**")
                    st.caption(f"Type: {video['type']} | Sequence: {video['sequence']}")
                
                with col3:
                    duration_str = format_timestamp(video['duration'])
                    st.metric("Duration", duration_str)
                
                with col4:
                    start_str = format_timestamp(video['start_time'])
                    st.metric("Starts At", start_str)
                
                with col5:
                    end_time = video['start_time'] + video['duration']
                    end_str = format_timestamp(end_time)
                    st.metric("Ends At", end_str)
                
                with col6:
                    if i > 0 and st.button("⬆️", key=f"up_{i}", use_container_width=True):
                        st.session_state.video_files[i], st.session_state.video_files[i-1] = \
                            st.session_state.video_files[i-1], st.session_state.video_files[i]
                        st.rerun()
                
                with col7:
                    if i < len(st.session_state.video_files) - 1 and st.button("⬇️", key=f"down_{i}", use_container_width=True):
                        st.session_state.video_files[i], st.session_state.video_files[i+1] = \
                            st.session_state.video_files[i+1], st.session_state.video_files[i]
                        st.rerun()
                
                st.markdown("---")
        
        # Summary
        total_duration = sum(v['duration'] for v in st.session_state.video_files)
        st.info(f"📊 **Total Duration:** {format_timestamp(total_duration)} | **Total Videos:** {len(st.session_state.video_files)}")
        
        # Export timestamps
        st.markdown("---")
        st.subheader("📝 Export Timestamps")
        
        timestamp_text = "Video Timestamps:\n\n"
        for i, video in enumerate(st.session_state.video_files):
            end_time = video['start_time'] + video['duration']
            timestamp_text += f"{i+1}. {video['filename']}\n"
            timestamp_text += f"   Start: {format_timestamp(video['start_time'])}\n"
            timestamp_text += f"   End: {format_timestamp(end_time)}\n"
            timestamp_text += f"   Duration: {format_timestamp(video['duration'])}\n\n"
        
        st.text_area("Timestamps", timestamp_text, height=300, key="timestamp_display")
        
        # Download timestamps
        st.download_button(
            label="💾 Download Timestamps (TXT)",
            data=timestamp_text,
            file_name="video_timestamps.txt",
            mime="text/plain"
        )
        
        # Merge section
        st.markdown("---")
        st.subheader("🔀 Merge Videos")
        
        col1, col2 = st.columns([3, 1])
        
        with col1:
            output_filename = st.text_input(
                "Output Filename",
                value="Complete_Video.mp4",
                placeholder="Complete_Video.mp4"
            )
        
        with col2:
            st.write("")  # Spacing
            merge_button = st.button("🚀 Merge Videos", type="primary", use_container_width=True)
        
        if merge_button:
            if not output_filename:
                st.error("Please enter an output filename")
            else:
                output_path = os.path.join(st.session_state.selected_folder, output_filename)
                
                with st.spinner("Merging videos... This may take a while..."):
                    progress_bar = st.progress(0)
                    status_text = st.empty()
                    
                    def progress_callback(message):
                        status_text.text(message)
                        progress_bar.progress(0.5)
                    
                    success = merge_videos(st.session_state.video_files, output_path, progress_callback)
                    progress_bar.progress(1.0)
                    
                    if success:
                        file_size = os.path.getsize(output_path)
                        file_size_mb = file_size / (1024 * 1024)
                        st.success(f"✅ Success! Merged video created: {output_path}")
                        st.info(f"📦 File size: {file_size_mb:.2f} MB")
                        
                        # Show download button
                        try:
                            with open(output_path, 'rb') as f:
                                video_data = f.read()
                            st.download_button(
                                label="📥 Download Merged Video",
                                data=video_data,
                                file_name=output_filename,
                                mime="video/mp4"
                            )
                        except Exception as e:
                            st.warning(f"Could not prepare download: {e}")
                    else:
                        st.error("❌ Merge failed. Please check the errors above.")

if __name__ == "__main__":
    main()
