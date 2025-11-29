"""
STT-based SRT generation using OpenAI Whisper.
Generates accurate SRT files by transcribing audio and matching with original text.
"""
import whisper
import tempfile
import os
import difflib
import re
from typing import List, Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

# Global Whisper model (loaded once, reused)
_whisper_model = None

def load_whisper_model(model_size: str = "base"):
    """
    Load Whisper model (cached globally for performance).
    
    Model sizes: tiny, base, small, medium, large
    - tiny: ~1GB, fastest, lower accuracy
    - base: ~1GB, good balance (recommended)
    - small: ~2GB, better accuracy
    - medium: ~5GB, high accuracy
    - large: ~10GB, best accuracy, slowest
    """
    global _whisper_model
    if _whisper_model is None:
        logger.info(f"Loading Whisper model: {model_size}")
        _whisper_model = whisper.load_model(model_size)
        logger.info("Whisper model loaded successfully")
    return _whisper_model

def transcribe_audio_with_whisper(audio_path: str, model_size: str = "base", language: str = None) -> Dict:
    """
    Transcribe audio using Whisper and return segments with timings.
    
    Args:
        audio_path: Path to audio file
        model_size: Whisper model size (tiny, base, small, medium, large)
        language: Language code (e.g., 'en') or None for auto-detect
    
    Returns:
        dict with keys:
            - 'text': Full transcript
            - 'segments': List of dicts with 'start', 'end', 'text', 'words' (if available)
            - 'language': Detected language
    """
    model = load_whisper_model(model_size)
    
    logger.info(f"Transcribing audio: {audio_path}")
    result = model.transcribe(
        audio_path,
        language=language,
        word_timestamps=True,  # Get word-level timings
        verbose=False
    )
    
    logger.info(f"Transcription complete: {len(result['segments'])} segments, language: {result['language']}")
    return result

def normalize_text_for_matching(text: str) -> str:
    """
    Normalize text for fuzzy matching (same as existing function in server_optimized.py).
    """
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

def split_text_into_sentences(text: str) -> List[str]:
    """
    Split text into sentences for matching.
    """
    # Split on sentence endings
    sentences = re.split(r'[.!?]+\s+', text)
    # Filter out empty sentences
    sentences = [s.strip() for s in sentences if s.strip()]
    return sentences

def match_stt_to_text(whisper_result: Dict, original_text: str) -> List[Dict]:
    """
    Match Whisper transcript segments to original text sentences.
    
    Args:
        whisper_result: Result from transcribe_audio_with_whisper
        original_text: Original chapter text
    
    Returns:
        List of matched segments with:
            - 'original_text': Original sentence from text
            - 'stt_text': STT transcript segment
            - 'start_time': Start time in seconds
            - 'end_time': End time in seconds
            - 'confidence': Match confidence (0-1)
            - 'sentence_index': Index in original sentences (-1 if unmatched)
    """
    stt_segments = whisper_result['segments']
    original_sentences = split_text_into_sentences(original_text)
    
    matched_segments = []
    text_index = 0  # Current position in original text
    unmatched_count = 0
    low_confidence_count = 0
    
    logger.info(f"Matching {len(stt_segments)} STT segments to {len(original_sentences)} sentences")
    
    for segment_idx, segment in enumerate(stt_segments):
        stt_text = segment['text'].strip()
        stt_norm = normalize_text_for_matching(stt_text)
        
        if not stt_norm or len(stt_norm) < 3:
            logger.debug(f"Segment {segment_idx}: Skipping empty/short text: '{stt_text[:50]}...'")
            continue
        
        # Search for best match in remaining sentences
        best_match_idx = -1
        best_match_score = 0.0
        search_window = min(20, len(original_sentences) - text_index)  # Increased from 10 to 20
        
        for i in range(text_index, min(text_index + search_window, len(original_sentences))):
            orig_sentence = original_sentences[i]
            orig_norm = normalize_text_for_matching(orig_sentence)
            
            # Calculate similarity
            similarity = difflib.SequenceMatcher(None, stt_norm, orig_norm).ratio()
            
            if similarity > best_match_score:
                best_match_score = similarity
                best_match_idx = i
        
        # Adaptive threshold matching with improved fallback logic
        if best_match_idx >= 0:
            if best_match_score > 0.4:  # Primary threshold (lowered from 0.5)
                # High confidence match
                matched_segments.append({
                    'original_text': original_sentences[best_match_idx],
                    'stt_text': stt_text,
                    'start_time': segment['start'],
                    'end_time': segment['end'],
                    'confidence': best_match_score,
                    'sentence_index': best_match_idx
                })
                text_index = best_match_idx + 1  # Advance past matched sentence
                logger.debug(f"Segment {segment_idx}: Matched (score={best_match_score:.3f}) -> sentence {best_match_idx}")
            elif best_match_score > 0.3:  # Fallback threshold for lower confidence
                # Lower confidence match - still use it but mark as lower confidence
                matched_segments.append({
                    'original_text': original_sentences[best_match_idx],
                    'stt_text': stt_text,
                    'start_time': segment['start'],
                    'end_time': segment['end'],
                    'confidence': best_match_score,
                    'sentence_index': best_match_idx
                })
                text_index = best_match_idx + 1
                low_confidence_count += 1
                logger.debug(f"Segment {segment_idx}: Matched with low confidence (score={best_match_score:.3f}) -> sentence {best_match_idx}")
            else:
                # Very low similarity - use STT text as fallback
                matched_segments.append({
                    'original_text': stt_text,  # Fallback to STT text
                    'stt_text': stt_text,
                    'start_time': segment['start'],
                    'end_time': segment['end'],
                    'confidence': best_match_score,
                    'sentence_index': -1  # Unmatched
                })
                unmatched_count += 1
                logger.debug(f"Segment {segment_idx}: No match (best_score={best_match_score:.3f}), using STT text: '{stt_text[:50]}...'")
                # Don't advance text_index on failure to prevent cascade failures
        else:
            # No match found at all
            matched_segments.append({
                'original_text': stt_text,  # Fallback to STT text
                'stt_text': stt_text,
                'start_time': segment['start'],
                'end_time': segment['end'],
                'confidence': 0.0,
                'sentence_index': -1  # Unmatched
            })
            unmatched_count += 1
            logger.debug(f"Segment {segment_idx}: No match found, using STT text: '{stt_text[:50]}...'")
    
    matched_count = len([s for s in matched_segments if s['sentence_index'] >= 0])
    logger.info(f"STT Matching Results: {matched_count}/{len(matched_segments)} segments matched ({matched_count/len(matched_segments)*100:.1f}%)")
    logger.info(f"  - High confidence (>0.4): {matched_count - low_confidence_count}")
    logger.info(f"  - Low confidence (0.3-0.4): {low_confidence_count}")
    logger.info(f"  - Unmatched: {unmatched_count}")
    return matched_segments

def generate_srt_from_matches(matched_segments: List[Dict]) -> str:
    """
    Generate SRT file from matched segments.
    
    Args:
        matched_segments: List of matched segments from match_stt_to_text
    
    Returns:
        SRT file content as string
    """
    def format_srt_time(seconds: float) -> str:
        """Format seconds to SRT time format (HH:MM:SS,mmm)"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
    
    srt_lines = []
    entry_index = 1
    
    for segment in matched_segments:
        start_time = format_srt_time(segment['start_time'])
        end_time = format_srt_time(segment['end_time'])
        text = segment['original_text']
        
        srt_lines.append(f"{entry_index}")
        srt_lines.append(f"{start_time} --> {end_time}")
        srt_lines.append(text)
        srt_lines.append("")  # Empty line between entries
        
        entry_index += 1
    
    return "\n".join(srt_lines)

def generate_srt_with_whisper(audio_path: str, original_text: str, model_size: str = "base", language: str = None) -> str:
    """
    Complete workflow: Transcribe audio with Whisper, match to text, generate SRT.
    
    Args:
        audio_path: Path to audio file
        original_text: Original chapter text
        model_size: Whisper model size (default: "base")
        language: Language code or None for auto-detect
    
    Returns:
        SRT file content as string
    """
    logger.info(f"Starting STT-based SRT generation for audio: {audio_path}")
    
    # Step 1: Transcribe audio
    whisper_result = transcribe_audio_with_whisper(audio_path, model_size, language)
    
    # Step 2: Match STT segments to original text
    matched_segments = match_stt_to_text(whisper_result, original_text)
    
    # Step 3: Generate SRT
    srt_content = generate_srt_from_matches(matched_segments)
    
    logger.info(f"Generated SRT with {len(matched_segments)} entries")
    return srt_content

