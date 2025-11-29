"""
Forced alignment-based SRT generation using Montreal Forced Aligner (MFA).
Generates accurate SRT files by aligning known text to audio with word-level precision.
"""
import tempfile
import os
import subprocess
import re
import shutil
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

# Try to import MFA and TextGrid libraries
try:
    from montreal_forced_alignment import align_corpus
    from montreal_forced_alignment.models import AcousticModel, DictionaryModel
    MFA_AVAILABLE = True
except ImportError:
    MFA_AVAILABLE = False
    logger.warning("montreal-forced-alignment package not available, will use CLI")

try:
    from textgrid import TextGrid
    TEXTGRID_AVAILABLE = True
except ImportError:
    TEXTGRID_AVAILABLE = False
    logger.warning("textgrid package not available, will use manual parsing")

# Global MFA model status cache
_mfa_models_checked = {}
_mfa_models_available = {}


def setup_mfa_models(language: str = "english") -> bool:
    """
    Check if MFA models are downloaded and available.
    Download models if missing.
    
    Args:
        language: Language code (default: "english")
    
    Returns:
        True if models are available, False otherwise
    """
    global _mfa_models_checked, _mfa_models_available
    
    if language in _mfa_models_checked:
        return _mfa_models_available.get(language, False)
    
    logger.info(f"Checking MFA models for language: {language}")
    
    try:
        # Try to use MFA CLI to check/download models
        # MFA stores models in a specific directory
        # Check if models exist or download them
        
        # Try to download models if not available
        acoustic_model = f"{language}_us_arpa" if language == "english" else f"{language}_arpa"
        dictionary_model = f"{language}_us_arpa" if language == "english" else f"{language}_arpa"
        
        # Check if models are available by trying to list them
        try:
            result = subprocess.run(
                ["mfa", "model", "list", "acoustic"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if acoustic_model in result.stdout or "english" in result.stdout.lower():
                _mfa_models_available[language] = True
                _mfa_models_checked[language] = True
                logger.info(f"MFA acoustic model available for {language}")
            else:
                # Try to download
                logger.info(f"Downloading MFA acoustic model: {acoustic_model}")
                download_result = subprocess.run(
                    ["mfa", "model", "download", "acoustic", acoustic_model],
                    capture_output=True,
                    text=True,
                    timeout=300
                )
                if download_result.returncode == 0:
                    _mfa_models_available[language] = True
                    logger.info(f"MFA acoustic model downloaded successfully")
                else:
                    logger.warning(f"Failed to download acoustic model: {download_result.stderr}")
                    _mfa_models_available[language] = False
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            logger.warning(f"MFA CLI not available or timeout: {e}")
            _mfa_models_available[language] = False
        
        # Check dictionary
        try:
            result = subprocess.run(
                ["mfa", "model", "list", "dictionary"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if dictionary_model in result.stdout or "english" in result.stdout.lower():
                logger.info(f"MFA dictionary model available for {language}")
            else:
                logger.info(f"Downloading MFA dictionary: {dictionary_model}")
                download_result = subprocess.run(
                    ["mfa", "model", "download", "dictionary", dictionary_model],
                    capture_output=True,
                    text=True,
                    timeout=300
                )
                if download_result.returncode != 0:
                    logger.warning(f"Failed to download dictionary: {download_result.stderr}")
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            logger.warning(f"MFA CLI dictionary check failed: {e}")
        
        _mfa_models_checked[language] = True
        return _mfa_models_available.get(language, False)
        
    except Exception as e:
        logger.error(f"Error setting up MFA models: {e}")
        _mfa_models_checked[language] = True
        _mfa_models_available[language] = False
        return False


def preprocess_text_for_mfa(text: str) -> str:
    """
    Preprocess text for MFA input.
    Normalizes text, handles punctuation, and formats for MFA.
    
    Args:
        text: Original text
    
    Returns:
        Preprocessed text ready for MFA (one sentence per line)
    """
    # Normalize smart quotes and punctuation
    text = text.replace('"', '"').replace('"', '"')
    text = text.replace(''', "'").replace(''', "'")
    text = text.replace('—', '-').replace('–', '-')
    text = text.replace('…', '...')
    
    # Remove control characters
    text = re.sub(r'[\x00-\x1F\x7F]', ' ', text)
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Split into sentences (similar to split_into_sentences)
    sentences = re.split(r'(?<=[.!?])\s+', text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 2]
    
    # Join sentences with newlines (one per line for MFA)
    return '\n'.join(sentences)


def align_text_to_audio(audio_path: str, text_path: str, output_dir: str, language: str = "english") -> Optional[str]:
    """
    Run MFA alignment to align text to audio.
    
    Args:
        audio_path: Path to audio file (WAV format preferred)
        text_path: Path to text file (one sentence per line)
        output_dir: Directory for MFA output
        language: Language code (default: "english")
    
    Returns:
        Path to generated TextGrid file, or None if alignment fails
    """
    try:
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        # MFA requires audio in WAV format - convert if needed
        audio_wav_path = audio_path
        if not audio_path.lower().endswith('.wav'):
            # Convert to WAV using FFmpeg
            audio_wav_path = os.path.join(output_dir, "audio_for_mfa.wav")
            try:
                ffmpeg_cmd = [
                    "ffmpeg", "-y", "-i", audio_path,
                    "-ar", "16000",  # 16kHz sample rate (MFA requirement)
                    "-ac", "1",  # Mono
                    "-f", "wav",
                    audio_wav_path
                ]
                result = subprocess.run(
                    ffmpeg_cmd,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                if result.returncode != 0:
                    logger.error(f"FFmpeg conversion failed: {result.stderr}")
                    return None
            except Exception as e:
                logger.error(f"Error converting audio to WAV: {e}")
                return None
        
        # Determine model names
        acoustic_model = "english_us_arpa" if language == "english" else f"{language}_arpa"
        dictionary_model = "english_us_arpa" if language == "english" else f"{language}_arpa"
        
        # Run MFA alignment using CLI
        # MFA align command: mfa align <corpus_dir> <dictionary> <acoustic_model> <output_dir>
        # For single file, we need to create a corpus structure
        corpus_dir = os.path.join(output_dir, "corpus")
        os.makedirs(corpus_dir, exist_ok=True)
        
        # Copy audio and text to corpus directory with matching names
        audio_basename = os.path.splitext(os.path.basename(audio_wav_path))[0]
        corpus_audio = os.path.join(corpus_dir, f"{audio_basename}.wav")
        corpus_text = os.path.join(corpus_dir, f"{audio_basename}.lab")
        
        shutil.copy2(audio_wav_path, corpus_audio)
        shutil.copy2(text_path, corpus_text)
        
        # Run MFA align
        mfa_cmd = [
            "mfa", "align",
            corpus_dir,
            dictionary_model,
            acoustic_model,
            output_dir,
            "--clean",
            "--overwrite"
        ]
        
        logger.info(f"Running MFA alignment: {' '.join(mfa_cmd)}")
        
        # Calculate timeout based on audio length (estimate: 10x audio duration, min 60s, max 600s)
        try:
            import subprocess as sp
            # Try to get audio duration
            duration_cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", 
                           "-of", "default=noprint_wrappers=1:nokey=1", audio_wav_path]
            duration_result = sp.run(duration_cmd, capture_output=True, text=True, timeout=10)
            if duration_result.returncode == 0:
                duration = float(duration_result.stdout.strip())
                timeout = max(60, min(int(duration * 10), 600))
            else:
                timeout = 300  # Default 5 minutes
        except:
            timeout = 300
        
        result = subprocess.run(
            mfa_cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        
        if result.returncode != 0:
            logger.error(f"MFA alignment failed: {result.stderr}")
            logger.debug(f"MFA stdout: {result.stdout}")
            return None
        
        # Find the generated TextGrid file
        textgrid_path = os.path.join(output_dir, f"{audio_basename}.TextGrid")
        if os.path.exists(textgrid_path):
            logger.info(f"MFA alignment successful: {textgrid_path}")
            return textgrid_path
        else:
            # Try alternative location or naming
            for file in os.listdir(output_dir):
                if file.endswith('.TextGrid'):
                    textgrid_path = os.path.join(output_dir, file)
                    logger.info(f"Found TextGrid file: {textgrid_path}")
                    return textgrid_path
            
            logger.error(f"TextGrid file not found in {output_dir}")
            return None
            
    except subprocess.TimeoutExpired:
        logger.error("MFA alignment timed out")
        return None
    except Exception as e:
        logger.error(f"Error running MFA alignment: {e}")
        import traceback
        traceback.print_exc()
        return None


def textgrid_to_srt(textgrid_path: str, original_text: str) -> str:
    """
    Parse TextGrid file and convert to SRT format.
    Groups words into sentences based on original text structure.
    
    Args:
        textgrid_path: Path to TextGrid file
        original_text: Original text for sentence grouping
    
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
    
    try:
        # Parse TextGrid file
        words = []
        if TEXTGRID_AVAILABLE:
            try:
                tg = TextGrid.fromFile(textgrid_path)
                # Find words tier
                words_tier = None
                if hasattr(tg, 'tiers'):
                    for tier in tg.tiers:
                        if tier.name.lower() in ['words', 'word', 'orthography']:
                            words_tier = tier
                            break
                
                if words_tier:
                    for interval in words_tier:
                        if interval.mark and interval.mark.strip():
                            words.append({
                                'text': interval.mark.strip(),
                                'start': interval.minTime,
                                'end': interval.maxTime
                            })
            except Exception as e:
                logger.warning(f"Error using textgrid library, falling back to manual parsing: {e}")
                words = parse_textgrid_manual(textgrid_path)
        else:
            # Manual parsing if textgrid library not available
            words = parse_textgrid_manual(textgrid_path)
        
        if not words:
            logger.warning("No words found in TextGrid file")
            return ""
        
        logger.info(f"Extracted {len(words)} words from TextGrid")
        
        # Group words into sentences based on original text
        # Split original text into sentences
        sentences = re.split(r'(?<=[.!?])\s+', original_text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 2]
        
        logger.info(f"Grouping {len(words)} words into {len(sentences)} sentences")
        
        # Match words to sentences
        srt_entries = []
        word_idx = 0
        
        for sentence in sentences:
            if word_idx >= len(words):
                break
            
            # Find words that belong to this sentence
            sentence_words = []
            sentence_start = words[word_idx]['start']
            sentence_end = words[word_idx]['end']
            
            # Collect words until we have enough to match the sentence
            sentence_text_normalized = re.sub(r'[^\w\s]', '', sentence.lower())
            collected_text = ""
            
            while word_idx < len(words):
                word = words[word_idx]
                word_text_normalized = re.sub(r'[^\w\s]', '', word['text'].lower())
                collected_text += " " + word_text_normalized
                sentence_words.append(word)
                sentence_end = word['end']
                
                # Check if we have enough words to match the sentence
                if len(sentence_words) >= len(sentence.split()) * 0.8:  # 80% of words
                    # Check if collected text matches sentence
                    if sentence_text_normalized in collected_text or collected_text in sentence_text_normalized:
                        break
                
                word_idx += 1
                
                # Safety: don't collect more than 2x sentence length
                if len(sentence_words) > len(sentence.split()) * 2:
                    break
            
            if sentence_words:
                srt_entries.append({
                    'text': sentence,
                    'start': sentence_start,
                    'end': sentence_end
                })
        
        # Generate SRT content
        srt_lines = []
        for idx, entry in enumerate(srt_entries, 1):
            srt_lines.append(str(idx))
            srt_lines.append(f"{format_srt_time(entry['start'])} --> {format_srt_time(entry['end'])}")
            srt_lines.append(entry['text'])
            srt_lines.append("")  # Empty line between entries
        
        return "\n".join(srt_lines)
        
    except Exception as e:
        logger.error(f"Error parsing TextGrid: {e}")
        import traceback
        traceback.print_exc()
        return ""


def parse_textgrid_manual(textgrid_path: str) -> List[Dict]:
    """
    Manually parse TextGrid file if textgrid library is not available.
    
    Args:
        textgrid_path: Path to TextGrid file
    
    Returns:
        List of word dictionaries with 'text', 'start', 'end'
    """
    words = []
    try:
        with open(textgrid_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Simple TextGrid parser
        # Look for intervals with text
        import re
        # Find intervals in TextGrid format
        interval_pattern = r'intervals \[(\d+)\]:\s*xmin = ([\d.]+)\s*xmax = ([\d.]+)\s*text = "([^"]*)"'
        matches = re.findall(interval_pattern, content, re.MULTILINE)
        
        for match in matches:
            idx, xmin, xmax, text = match
            if text.strip() and text.strip() != '""':
                words.append({
                    'text': text.strip().strip('"'),
                    'start': float(xmin),
                    'end': float(xmax)
                })
    except Exception as e:
        logger.error(f"Error manually parsing TextGrid: {e}")
    
    return words


def generate_srt_with_mfa(audio_path: str, original_text: str, language: str = "english") -> str:
    """
    Complete workflow: Align text to audio using MFA and generate SRT.
    
    Args:
        audio_path: Path to audio file
        original_text: Original chapter text
        language: Language code (default: "english")
    
    Returns:
        SRT file content as string
    """
    temp_dir = tempfile.mkdtemp()
    
    try:
        logger.info(f"Starting MFA-based SRT generation for audio: {audio_path}")
        
        # Step 1: Setup MFA models
        if not setup_mfa_models(language):
            logger.warning("MFA models not available, cannot perform forced alignment")
            return ""
        
        # Step 2: Preprocess text
        preprocessed_text = preprocess_text_for_mfa(original_text)
        
        # Step 3: Save text to temporary file
        text_path = os.path.join(temp_dir, "text_for_mfa.txt")
        with open(text_path, 'w', encoding='utf-8') as f:
            f.write(preprocessed_text)
        
        # Step 4: Run MFA alignment
        output_dir = os.path.join(temp_dir, "mfa_output")
        textgrid_path = align_text_to_audio(audio_path, text_path, output_dir, language)
        
        if not textgrid_path or not os.path.exists(textgrid_path):
            logger.error("MFA alignment failed or TextGrid not generated")
            return ""
        
        # Step 5: Parse TextGrid to SRT
        srt_content = textgrid_to_srt(textgrid_path, original_text)
        
        if not srt_content:
            logger.warning("Failed to generate SRT from TextGrid")
            return ""
        
        # Count SRT entries (each entry is separated by double newline)
        srt_entry_count = len([e for e in srt_content.split('\n\n') if e.strip()]) if srt_content else 0
        logger.info(f"Generated SRT with MFA: {srt_entry_count} entries")
        return srt_content
        
    except Exception as e:
        logger.error(f"Error in MFA SRT generation: {e}")
        import traceback
        traceback.print_exc()
        return ""
    finally:
        # Clean up temporary directory
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except:
            pass

