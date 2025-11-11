import React, { useState, useEffect } from 'react';
import { X, Download, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface VideoGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateVideo: () => Promise<void>;
  isGenerating: boolean;
  progress: {
    stage: string;
    percentage: number;
    message: string;
  };
  error: string | null;
  videoUrl: string | null;
}

const VideoGenerationModal: React.FC<VideoGenerationModalProps> = ({
  isOpen,
  onClose,
  onGenerateVideo,
  isGenerating,
  progress,
  error,
  videoUrl
}) => {
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    console.log('[Video Generation Modal] useEffect triggered - isOpen:', isOpen, 'isStarted:', isStarted);
    if (isOpen && !isStarted) {
      console.log('[Video Generation Modal] Starting video generation...');
      setIsStarted(true);
      onGenerateVideo().catch((error) => {
        console.error('[Video Generation Modal] Error in onGenerateVideo:', error);
        // Error handling is done in parent component
      });
    }
  }, [isOpen, isStarted, onGenerateVideo]);

  useEffect(() => {
    if (!isOpen) {
      setIsStarted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (videoUrl) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = 'generated-video.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'parsing':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'audio':
        return <Loader2 className="w-5 h-5 animate-spin text-green-500" />;
      case 'video':
        return <Loader2 className="w-5 h-5 animate-spin text-purple-500" />;
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin text-gray-500" />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'parsing':
        return 'text-blue-600';
      case 'audio':
        return 'text-green-600';
      case 'video':
        return 'text-purple-600';
      case 'complete':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Generate Video</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isGenerating}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error ? (
            /* Error State */
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Generation Failed</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          ) : videoUrl ? (
            /* Success State */
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Video Generated!</h3>
              <p className="text-gray-600 mb-6">Your video has been created successfully.</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Video
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* Progress State */
            <div className="text-center">
              <div className="mb-6">
                {getStageIcon(progress.stage)}
              </div>
              
              <h3 className={`text-lg font-medium mb-2 ${getStageColor(progress.stage)}`}>
                {progress.message}
              </h3>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              
              <p className="text-sm text-gray-600 mb-6">
                {progress.percentage}% complete
              </p>

              {isGenerating && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  disabled
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoGenerationModal;
