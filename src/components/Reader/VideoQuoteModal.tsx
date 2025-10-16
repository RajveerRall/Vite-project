import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Download, Share2, Loader2 } from 'lucide-react';
import { VideoQuoteGenerator } from '../../services/VideoQuoteGenerator';
import { VideoQuoteOptions, VideoGenerationProgress, BackgroundTemplate } from '../../types/video';
import { trackEvent } from '../../lib/analytics';
import './VideoQuoteModal.css';

interface VideoQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  bookTitle: string;
  author: string;
  coverUrl?: string | null;
}

const VideoQuoteModal: React.FC<VideoQuoteModalProps> = ({
  isOpen,
  onClose,
  selectedText,
  bookTitle,
  author,
  coverUrl
}) => {
  const [selectedVoice, setSelectedVoice] = useState('en-US-BrianMultilingualNeural');
  const [selectedBackground, setSelectedBackground] = useState<BackgroundTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<VideoGenerationProgress | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Analytics tracking state
  const [modalOpenTime, setModalOpenTime] = useState<number>(0);
  const [videoGenerationStartTime, setVideoGenerationStartTime] = useState<number>(0);
  const [videoWasGenerated, setVideoWasGenerated] = useState(false);
  const [videoWasDownloaded, setVideoWasDownloaded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const generatorRef = useRef<VideoQuoteGenerator | null>(null);

  // Available voices (matching existing TTS options from useReaderTTS)
  const availableVoices = [
    { value: 'en-US-BrianMultilingualNeural', label: 'Brian (US)' },
    { value: 'en-US-AriaMultilingualNeural', label: 'Aria (US)' },
    { value: 'en-US-JennyMultilingualNeural', label: 'Jenny (US)' },
    { value: 'en-GB-SoniaNeural', label: 'Sonia (UK)' },
    { value: 'en-AU-KenNeural', label: 'Ken (AU)' },
    { value: 'en-CA-ClaraNeural', label: 'Clara (CA)' }
  ];

  useEffect(() => {
    if (isOpen) {
      const openTime = Date.now();
      setModalOpenTime(openTime);
      setVideoWasGenerated(false);
      setVideoWasDownloaded(false);
      
      trackEvent('video_quote_modal_opened', {
        selected_text_length: selectedText.length,
        book_title: bookTitle,
        has_cover: !!coverUrl
      });
      
      generatorRef.current = new VideoQuoteGenerator();
      const templates = generatorRef.current.getBackgroundTemplates();
      setSelectedBackground(templates[0]); // Default to first template
    }
  }, [isOpen, selectedText, bookTitle, coverUrl]);

  useEffect(() => {
    // Data URLs don't need revocation, only blob URLs do
    return () => {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const handleGenerateVideo = async () => {
    if (!generatorRef.current || !selectedBackground) return;

    setIsGenerating(true);
    setError(null);
    setProgress(null);
    setGeneratedVideo(null);
    setVideoUrl(null);

    const startTime = Date.now();
    setVideoGenerationStartTime(startTime);
    
    trackEvent('video_quote_generation_started', {
      text_length: selectedText.length,
      voice_selected: selectedVoice,
      background_template: selectedBackground?.id,
      book_title: bookTitle
    });

    try {
      const options: VideoQuoteOptions = {
        text: selectedText,
        bookTitle,
        author,
        voice: selectedVoice,
        backgroundTemplate: selectedBackground,
        coverUrl: coverUrl
      };

      const result = await generatorRef.current.generateVideoQuote(
        options,
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );

      setGeneratedVideo(result.videoBlob);

      // Track success
      const generationTime = Date.now() - startTime;
      setVideoWasGenerated(true);
      
      trackEvent('video_quote_generation_completed', {
        text_length: selectedText.length,
        voice_used: selectedVoice,
        background_used: selectedBackground?.id,
        generation_time_ms: generationTime,
        book_title: bookTitle
      });

      // Convert blob to data URL for persistence across tab switches
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setVideoUrl(dataUrl);
        
        // Auto-play the generated video
        if (videoRef.current) {
          videoRef.current.src = dataUrl;
          videoRef.current.play();
        }
      };
      reader.readAsDataURL(result.videoBlob);

    } catch (err) {
      console.error('Video generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate video');
      
      // Track failure
      trackEvent('video_quote_generation_failed', {
        error_message: err instanceof Error ? err.message : 'Unknown error',
        text_length: selectedText.length,
        voice_attempted: selectedVoice,
        background_attempted: selectedBackground?.id
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedVideo) return;

    setVideoWasDownloaded(true);
    
    trackEvent('video_quote_downloaded', {
      text_length: selectedText.length,
      voice_used: selectedVoice,
      background_used: selectedBackground?.id,
      book_title: bookTitle
    });

    const url = URL.createObjectURL(generatedVideo);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quote-${bookTitle.replace(/[^a-zA-Z0-9]/g, '-')}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!generatedVideo) return;

    try {
      if (navigator.share && navigator.canShare({ files: [new File([generatedVideo], 'quote.mp4', { type: 'video/mp4' })] })) {
        await navigator.share({
          title: `Quote from ${bookTitle}`,
          text: selectedText,
          files: [new File([generatedVideo], 'quote.mp4', { type: 'video/mp4' })]
        });
        
        trackEvent('video_quote_shared', {
          text_length: selectedText.length,
          voice_used: selectedVoice,
          background_used: selectedBackground?.id,
          book_title: bookTitle,
          share_method: 'web_share_api'
        });
      } else {
        // Fallback to download
        trackEvent('video_quote_shared', {
          text_length: selectedText.length,
          voice_used: selectedVoice,
          background_used: selectedBackground?.id,
          book_title: bookTitle,
          share_method: 'fallback_download'
        });
        handleDownload();
      }
    } catch (err) {
      console.error('Share failed:', err);
      // Fallback to download
      handleDownload();
    }
  };

  const handleClose = () => {
    if (modalOpenTime > 0) {
      const timeInModal = Date.now() - modalOpenTime;
      
      trackEvent('video_quote_modal_closed', {
        video_generated: videoWasGenerated,
        video_downloaded: videoWasDownloaded,
        time_in_modal_ms: timeInModal
      });
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="video-quote-modal-overlay">
      <div className="video-quote-modal">
        <div className="modal-header">
          <h2>Create Video Quote</h2>
          <button onClick={handleClose} className="close-button">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-content">
          {/* Preview Section */}
          <div className="preview-section">
            <h3>Quote Preview</h3>
            <div className="quote-preview">
              <p>"{selectedText}"</p>
              <p className="attribution">— {bookTitle} by {author}</p>
            </div>
          </div>

          {/* Customization Options */}
          <div className="customization-section">
            <div className="option-group">
              <label htmlFor="voice-select">Voice</label>
              <select
                id="voice-select"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                disabled={isGenerating}
              >
                {availableVoices.map(voice => (
                  <option key={voice.value} value={voice.value}>
                    {voice.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="option-group">
              <label>Background</label>
              <div className="background-templates">
                {generatorRef.current?.getBackgroundTemplates().map(template => (
                  <button
                    key={template.id}
                    className={`background-template ${selectedBackground?.id === template.id ? 'selected' : ''}`}
                    onClick={() => setSelectedBackground(template)}
                    disabled={isGenerating}
                    style={template.type === 'torn-cover' ? {} : { background: template.preview }}
                    title={template.name}
                  >
                    {template.type === 'torn-cover' ? (
                      <div className="torn-cover-preview">
                        <div className="cover-section">Book Cover</div>
                        <div className="paper-section">Paper Text Area</div>
                        <div className="cover-section">Book Cover</div>
                      </div>
                    ) : (
                      <span className="template-name">{template.name}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="generate-section">
            <button
              onClick={handleGenerateVideo}
              disabled={isGenerating || !selectedBackground}
              className="generate-button"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Generate Video
                </>
              )}
            </button>
          </div>

          {/* Progress */}
          {progress && (
            <div className="progress-section">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <p className="progress-text">
                {progress.message} ({Math.round(progress.progress)}%)
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="error-section">
              <p className="error-text">{error}</p>
            </div>
          )}

          {/* Generated Video */}
          {videoUrl && (
            <div className="video-section">
              <h3>Generated Video</h3>
              <video
                ref={videoRef}
                controls
                className="generated-video"
                poster=""
              >
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              
              <div className="video-actions">
                <button onClick={handleDownload} className="action-button download">
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button onClick={handleShare} className="action-button share">
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoQuoteModal;
