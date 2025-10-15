import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Download, Share2, Loader2 } from 'lucide-react';
import { VideoQuoteGenerator } from '../../services/VideoQuoteGenerator';
import { VideoQuoteOptions, VideoGenerationProgress, BackgroundTemplate } from '../../types/video';
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
      generatorRef.current = new VideoQuoteGenerator();
      const templates = generatorRef.current.getBackgroundTemplates();
      setSelectedBackground(templates[0]); // Default to first template
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (videoUrl) {
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
      const url = URL.createObjectURL(result.videoBlob);
      setVideoUrl(url);

      // Auto-play the generated video
      if (videoRef.current) {
        videoRef.current.src = url;
        videoRef.current.play();
      }

    } catch (err) {
      console.error('Video generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate video');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedVideo) return;

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
      } else {
        // Fallback to download
        handleDownload();
      }
    } catch (err) {
      console.error('Share failed:', err);
      // Fallback to download
      handleDownload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="video-quote-modal-overlay">
      <div className="video-quote-modal">
        <div className="modal-header">
          <h2>Create Video Quote</h2>
          <button onClick={onClose} className="close-button">
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
