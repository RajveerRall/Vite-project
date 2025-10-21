import React, { useState, useCallback } from 'react';
import { Upload, Download, Play, Pause, Settings, FileText, Headphones, Zap, Clock, CheckCircle, ArrowLeft, RotateCcw, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/Common/SEO';
import { useAudiobookGeneration } from '../hooks/useAudiobookGeneration';

interface AudiobookSettings {
  voice: string;
  speed: number;
  includeChapters: boolean;
}

const EpubToAudiobook: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<AudiobookSettings>({
    voice: 'af_heart',
    speed: 1.0,
    includeChapters: true,
  });
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  // Format duration from seconds to readable format
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      if (remainingSeconds === 0) {
        return `${minutes}m`;
      } else {
        return `${minutes}m ${remainingSeconds}s`;
      }
    }
  };
  
  // Use the new audiobook generation hook
  const { 
    isInitializing, 
    isGenerating, 
    progress, 
    error, 
    chapters, 
    chapterAudios, 
    extractChapters, 
    generateSingleChapter, 
    regenerateChapter, 
    downloadChapter, 
    streamChapter, 
    reset 
  } = useAudiobookGeneration();

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/epub+zip') {
      setUploadedFile(file);
      reset(); // Reset any previous state
    } else {
      alert('Please upload a valid EPUB file.');
    }
  }, [reset]);

  const handleSettingsChange = useCallback((key: keyof AudiobookSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleExtractChapters = useCallback(async () => {
    if (!uploadedFile) return;

    try {
      await extractChapters(uploadedFile);
      console.log('[EpubToAudiobook] Chapters extracted successfully:', chapters.length);
    } catch (err) {
      console.error('[EpubToAudiobook] Chapter extraction failed:', err);
      // Error is handled by the hook
    }
  }, [uploadedFile, extractChapters, chapters.length]);

  const handleGenerateChapter = useCallback(async (chapterIndex: number) => {
    try {
      await generateSingleChapter(chapterIndex, settings);
      console.log(`[EpubToAudiobook] Generated audio for chapter ${chapterIndex}`);
    } catch (err) {
      console.error(`[EpubToAudiobook] Failed to generate chapter ${chapterIndex}:`, err);
      // Error is handled by the hook
    }
  }, [settings, generateSingleChapter]);

  const handleDownloadChapter = useCallback((chapterIndex: number) => {
    downloadChapter(chapterIndex);
  }, [downloadChapter]);

  const handleStreamChapter = useCallback(async (chapterIndex: number) => {
    try {
      await streamChapter(chapterIndex, settings);
      console.log(`[EpubToAudiobook] Started streaming for chapter ${chapterIndex}`);
    } catch (err) {
      console.error(`[EpubToAudiobook] Failed to stream chapter ${chapterIndex}:`, err);
    }
  }, [settings, streamChapter]);

  const handleRegenerateChapter = useCallback(async (chapterIndex: number) => {
    try {
      await regenerateChapter(chapterIndex, settings);
      console.log(`[EpubToAudiobook] Regenerated audio for chapter ${chapterIndex}`);
    } catch (err) {
      console.error(`[EpubToAudiobook] Failed to regenerate chapter ${chapterIndex}:`, err);
    }
  }, [settings, regenerateChapter]);

  const handleCreateVideo = useCallback(async (chapterIndex: number) => {
    const chapter = chapters.find(c => c.index === chapterIndex);
    const chapterAudio = chapterAudios.find(ca => ca.chapterIndex === chapterIndex);
    
    if (!chapter || !chapterAudio || !chapterAudio.isGenerated) {
      console.error('[EpubToAudiobook] Chapter or audio not available for video generation');
      return;
    }

    setIsGeneratingVideo(true);
    
    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('audio', chapterAudio.audioBlob, 'audio.mp3');
      formData.append('text', chapter.content);
      formData.append('book_title', uploadedFile?.name.replace('.epub', '') || 'Unknown Book');
      formData.append('chapter_title', chapter.title);
      formData.append('author', 'Unknown Author'); // You might want to extract this from EPUB metadata
      
      console.log('[EpubToAudiobook] Sending video generation request...');
      
      // Send to Python server
      const response = await fetch('http://localhost:8000/generate-video', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Video generation failed: ${response.statusText}`);
      }
      
      // Download video
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chapter.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('[EpubToAudiobook] Video generated and downloaded successfully');
    } catch (error) {
      console.error('[EpubToAudiobook] Video generation failed:', error);
      alert('Failed to generate video. Make sure the Python server is running on localhost:8000');
    } finally {
      setIsGeneratingVideo(false);
    }
  }, [chapters, chapterAudios, uploadedFile]);

  const voiceOptions = [
    { value: 'af_heart', label: 'Heart (Female, Warm)' },
    { value: 'af_bella', label: 'Bella (Female, Clear)' },
    { value: 'af_sky', label: 'Sky (Female, Soft)' },
    { value: 'af_nicole', label: 'Nicole (Female, Professional)' },
    { value: 'am_michael', label: 'Michael (Male, Deep)' },
    { value: 'bf_emma', label: 'Emma (Female, British)' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
             <SEO 
               title="EPUB to Audiobook Converter - YoRead (Free)"
               description="Convert your EPUB books to high-quality audiobooks with AI voices - completely free! Create professional audiobooks with chapter markers and custom settings."
               keywords={['epub to audiobook', 'ebook converter', 'audiobook generator', 'text to speech', 'AI voices', 'free audiobook converter']}
               url="https://yoread.com/epub-to-audiobook"
             />
      
      {/* Header matching your site's style */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-xl font-semibold text-gray-800 flex items-center">
                <ArrowLeft className="w-5 h-5 mr-2" />
                YoRead
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600">EPUB to Audiobook</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
               {/* Page Header */}
               <div className="text-center mb-8">
                 <div className="flex items-center justify-center mb-4">
                   <div className="bg-amber-100 p-3 rounded-full">
                     <Headphones className="w-8 h-8 text-amber-800" />
                   </div>
                 </div>
                 <div className="flex items-center justify-center mb-3">
                   <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mr-3">
                     EPUB to Audiobook Converter
                   </h1>
                   <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                     FREE
                   </span>
                 </div>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Transform your EPUB books into professional audiobooks with AI-powered voices, 
                chapter markers, and customizable settings. <span className="font-semibold text-green-700">Completely free to use!</span>
              </p>
               </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* File Upload Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-amber-800" />
                Upload Your EPUB
                <span className="ml-2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                  FREE
                </span>
              </h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <div className="space-y-3">
                  <div>
                    <label htmlFor="epub-upload" className="cursor-pointer">
                      <span className="text-base font-medium text-gray-700">
                        {uploadedFile ? uploadedFile.name : 'Choose EPUB file or drag & drop'}
                      </span>
                    </label>
                    <input
                      id="epub-upload"
                      type="file"
                      accept=".epub,application/epub+zip"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Supported formats: EPUB files up to 50MB
                  </p>
                </div>
              </div>

                     {uploadedFile && (
                       <div className="mt-4 space-y-3">
                         <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                           <div className="flex items-center">
                             <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                             <span className="text-green-800 font-medium text-sm">
                               {uploadedFile.name} uploaded successfully
                             </span>
                           </div>
                         </div>
                         
                         {chapters.length === 0 && (
                           <button
                             onClick={handleExtractChapters}
                             disabled={isInitializing}
                             className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                           >
                             {isInitializing ? (
                               <>
                                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                 Extracting Chapters...
                               </>
                             ) : (
                               <>
                                 <FileText className="w-4 h-4 mr-2" />
                                 Extract Chapters
                               </>
                             )}
                           </button>
                         )}
                       </div>
                     )}
            </div>

            {/* Processing Status */}
            {progress && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-amber-800" />
                  Generating Audiobook
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {progress.currentAction}
                    </span>
                    <span className="text-sm text-gray-500">
                      {progress.estimatedTime}
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-amber-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                  
                  <div className="text-center">
                    <span className="text-lg font-semibold text-gray-900">
                      {progress.progress}%
                    </span>
                  </div>
                  
                  {progress.totalChapters > 0 && (
                    <div className="text-center text-sm text-gray-600">
                      Chapter {progress.currentChapter} of {progress.totalChapters}
                    </div>
                  )}
                  
                  {progress.stage === 'initializing' && (
                    <div className="text-center text-xs text-blue-600 mt-2">
                      <div className="flex items-center justify-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        Loading Kokoro TTS model (using {typeof navigator !== 'undefined' && 'gpu' in navigator ? 'GPU' : 'CPU'})...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chapters List */}
            {chapters.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-amber-800" />
                  Chapters ({chapters.length})
                </h3>
                
                <div className="space-y-3">
                  {chapters.map((chapter, index) => {
                    const chapterAudio = chapterAudios.find(ca => ca.chapterIndex === chapter.index);
                    const isGenerated = chapterAudio?.isGenerated || false;
                    const isGenerating = chapterAudio?.isGenerating || false;
                    const hasError = chapterAudio?.error;
                    
                    return (
                      <div key={chapter.index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {chapter.title}
                          </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {chapter.content.length} characters • ~{formatDuration(chapter.estimatedDuration)} estimated
                        </p>
                          {hasError && (
                            <p className="text-xs text-red-600 mt-1">
                              Error: {hasError}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {isGenerated ? (
                            <>
                              <button
                                onClick={() => handleDownloadChapter(chapter.index)}
                                className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs"
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </button>
                              <button
                                onClick={() => handleStreamChapter(chapter.index)}
                                className="flex items-center px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-xs"
                                title="Stream audio to test voice quality"
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Stream
                              </button>
                              <button
                                onClick={() => handleRegenerateChapter(chapter.index)}
                                disabled={isGenerating}
                                className="flex items-center px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Regenerate audio for this chapter"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleCreateVideo(chapter.index)}
                                disabled={isGeneratingVideo}
                                className="flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Create YouTube video with scrolling text"
                              >
                                <Video className="w-3 h-3 mr-1" />
                                Video
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleGenerateChapter(chapter.index)}
                                disabled={isGenerating || isGenerating}
                                className="flex items-center px-3 py-1 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isGenerating ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3 h-3 mr-1" />
                                    Generate
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleStreamChapter(chapter.index)}
                                className="flex items-center px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-xs"
                                title="Stream audio to test voice quality (no file generation)"
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Stream
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-2 flex items-center">
                  <span className="text-red-600 mr-2">⚠️</span>
                  Generation Failed
                </h3>
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={reset}
                  className="mt-3 px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors text-sm"
                >
                  Try Again
                </button>
              </div>
            )}

          </div>

          {/* Settings Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-amber-800" />
                Audiobook Settings
              </h3>
              
              <div className="space-y-6">
                {/* Voice Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voice
                  </label>
                  <select
                    value={settings.voice}
                    onChange={(e) => handleSettingsChange('voice', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                  >
                    {voiceOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Speed */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Playback Speed: {settings.speed}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={settings.speed}
                    onChange={(e) => handleSettingsChange('speed', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Quality */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Processing Mode
                  </label>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-2">
                        <h3 className="text-xs font-medium text-blue-800">Auto-Optimized Processing</h3>
                        <div className="mt-1 text-xs text-blue-700">
                          <p>The system automatically detects your device capabilities and uses the best available processing method:</p>
                          <ul className="mt-1 space-y-0.5">
                            <li>• <strong>GPU detected:</strong> Uses WebGPU + fp32 (best quality)</li>
                            <li>• <strong>No GPU:</strong> Uses WASM + q8 (compatible)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Options */}
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.includeChapters}
                      onChange={(e) => handleSettingsChange('includeChapters', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Include chapter markers</span>
                  </label>
                </div>

                {/* Processing Note */}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="w-4 h-4 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-2">
                      <p className="text-xs text-yellow-800">
                        <strong>Note:</strong> Processing runs on your device. Keep it plugged in and avoid other intensive tasks for best results.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CPU/GPU Usage Warning */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-2">
                      <h3 className="text-xs font-medium text-blue-800">
                        Processing Information
                      </h3>
                      <div className="mt-1 text-xs text-blue-700">
                        <p>
                          Audio generation runs locally using your CPU or GPU. Files stay private and secure.
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          <li>• <strong>GPU:</strong> Faster processing (recommended)</li>
                          <li>• <strong>CPU:</strong> Slower but functional</li>
                          <li>• <strong>Battery:</strong> Keep device plugged in</li>
                          <li>• <strong>Heat:</strong> Device may get warm</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

                  {/* Generate All Chapters Button */}
                  {chapters.length > 0 && (
                    <button
                      onClick={() => {
                        // Generate all chapters that haven't been generated yet
                        chapters.forEach((chapter, index) => {
                          const chapterAudio = chapterAudios.find(ca => ca.chapterIndex === chapter.index);
                          if (!chapterAudio?.isGenerated && !chapterAudio?.isGenerating) {
                            handleGenerateChapter(chapter.index);
                          }
                        });
                      }}
                      disabled={isGenerating || chapterAudios.every(ca => ca.isGenerated)}
                      className="w-full bg-amber-800 hover:bg-amber-900 text-white py-3 px-4 rounded-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Generate All Chapters
                        </>
                      )}
                    </button>
                  )}

            {/* Features */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  AI-powered voices
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Chapter markers
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  High-quality audio
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Customizable settings
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Fast processing
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span className="font-semibold text-green-700">100% Free to use</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EpubToAudiobook;
