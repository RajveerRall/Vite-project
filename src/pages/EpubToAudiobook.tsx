import React, { useState, useCallback } from 'react';
import { Upload, Download, Play, Pause, Settings, FileText, Headphones, Zap, Clock, CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/Common/SEO';
import { useAudiobookGeneration } from '../hooks/useAudiobookGeneration';

interface AudiobookSettings {
  voice: string;
  speed: number;
  quality: 'standard' | 'premium';
  includeChapters: boolean;
  backgroundMusic: boolean;
}

const EpubToAudiobook: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<AudiobookSettings>({
    voice: 'alloy',
    speed: 1.0,
    quality: 'standard',
    includeChapters: true,
    backgroundMusic: false,
  });
  
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
    downloadChapter, 
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

  const voiceOptions = [
    { value: 'alloy', label: 'Alloy (Neutral)' },
    { value: 'echo', label: 'Echo (Male)' },
    { value: 'fable', label: 'Fable (British)' },
    { value: 'onyx', label: 'Onyx (Deep)' },
    { value: 'nova', label: 'Nova (Female)' },
    { value: 'shimmer', label: 'Shimmer (Soft)' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO 
        title="EPUB to Audiobook Converter - YoRead"
        description="Convert your EPUB books to high-quality audiobooks with AI voices. Create professional audiobooks with chapter markers and custom settings."
        keywords={['epub to audiobook', 'ebook converter', 'audiobook generator', 'text to speech', 'AI voices']}
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
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3">
            EPUB to Audiobook Converter
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform your EPUB books into professional audiobooks with AI-powered voices, 
            chapter markers, and customizable settings.
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
                            {chapter.content.length} characters • ~{chapter.estimatedDuration.toFixed(1)}s estimated
                          </p>
                          {hasError && (
                            <p className="text-xs text-red-600 mt-1">
                              Error: {hasError}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {isGenerated ? (
                            <button
                              onClick={() => handleDownloadChapter(chapter.index)}
                              className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </button>
                          ) : (
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
                    Quality
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="standard"
                        checked={settings.quality === 'standard'}
                        onChange={(e) => handleSettingsChange('quality', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Standard (Faster)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="premium"
                        checked={settings.quality === 'premium'}
                        onChange={(e) => handleSettingsChange('quality', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Premium (Higher Quality)</span>
                    </label>
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
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.backgroundMusic}
                      onChange={(e) => handleSettingsChange('backgroundMusic', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Add background music</span>
                  </label>
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
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EpubToAudiobook;
