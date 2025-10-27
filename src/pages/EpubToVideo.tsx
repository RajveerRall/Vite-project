import React, { useState, useCallback } from 'react';
import { Upload, Settings, FileText, Video, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/Common/SEO';
import { useEpubExtraction } from '../hooks/useEpubExtraction';
import { requestFullCast, ttsForLine } from '../services/fullCastTTS';

interface VideoSettings {
  format: 'youtube' | 'mobile';
  style: 'ereader' | 'subtitle' | 'minimal';
  highlightMode: 'none' | 'sentence' | 'word';  // Changed from enableHighlight boolean
  enableSceneImages: boolean;  // NEW: Toggle for AI-generated scene images
}

interface VideoProgress {
  stage: 'idle' | 'parsing' | 'audio' | 'video' | 'complete';
  percentage: number;
  message: string;
}

const EpubToVideo: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<VideoSettings>({
    format: 'youtube',
    style: 'ereader',
    highlightMode: 'sentence',  // Default to sentence-level
    enableSceneImages: false  // NEW: Scene images disabled by default
  });
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState<VideoProgress>({
    stage: 'idle',
    percentage: 0,
    message: ''
  });
  const [videoError, setVideoError] = useState<string | null>(null);

  // Use the EPUB extraction hook (no TTS initialization)
  const { 
    isInitializing, 
    chapters, 
    extractChapters, 
    reset 
  } = useEpubExtraction();

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

  // Helper functions for video generation
  const parseTimeToSeconds = (timeStr: string): number => {
    const match = timeStr.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!match) return 0;
    const [, hours, minutes, seconds, ms] = match;
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(ms) / 1000;
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const adjustSrtTimestamps = (srtContent: string, offsetSeconds: number, startIndex: number): string => {
    console.log(`[adjustSrtTimestamps] Called with offset=${offsetSeconds.toFixed(3)}s, startIndex=${startIndex}`);
    
    const lines = srtContent.split('\n');
    let adjustedLines = [];
    let currentIndex = startIndex;
    let timestampCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (/^\d+$/.test(line)) {
        adjustedLines.push(currentIndex.toString());
        currentIndex++;
      } else if (line.includes('-->')) {
        timestampCount++;
        const [startTime, endTime] = line.split('-->').map(t => t.trim());
        const originalStartSeconds = parseTimeToSeconds(startTime);
        const originalEndSeconds = parseTimeToSeconds(endTime);
        const newStartSeconds = originalStartSeconds + offsetSeconds;
        const newEndSeconds = originalEndSeconds + offsetSeconds;
        
        if (timestampCount === 1) {
          // Log first timestamp for debugging
          console.log(`[adjustSrtTimestamps] First entry: ${startTime} -> ${formatTime(newStartSeconds)} (offset: ${offsetSeconds.toFixed(3)}s)`);
        }
        
        adjustedLines.push(`${formatTime(newStartSeconds)} --> ${formatTime(newEndSeconds)}`);
      } else {
        adjustedLines.push(line);
      }
    }
    
    console.log(`[adjustSrtTimestamps] Adjusted ${timestampCount} timestamp entries`);
    return adjustedLines.join('\n');
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/epub+zip') {
      setUploadedFile(file);
      reset(); // Reset any previous state
    } else {
      alert('Please upload a valid EPUB file.');
    }
  }, [reset]);

  const handleSettingsChange = useCallback((key: keyof VideoSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleExtractChapters = useCallback(async () => {
    if (!uploadedFile) return;

    try {
      await extractChapters(uploadedFile);
      console.log('[EpubToVideo] Chapters extracted successfully:', chapters.length);
    } catch (err) {
      console.error('[EpubToVideo] Chapter extraction failed:', err);
    }
  }, [uploadedFile, extractChapters, chapters.length]);

  const handleGenerateVideo = useCallback(async (chapterIndex: number) => {
    console.log(`[Video Generation] Button clicked for chapter index: ${chapterIndex}`);
    
    const chapter = chapters.find(c => c.index === chapterIndex);
    
    if (!chapter || !chapter.content) {
      console.error('[Video Generation] Chapter not found or no content:', { chapterIndex, chapter });
      alert('Chapter content not available');
      return;
    }

    console.log(`[Video Generation] Starting video generation for chapter: ${chapter.title}`);
    console.log(`[Video Generation] Chapter content length: ${chapter.content.length}`);

    setIsGeneratingVideo(true);
    setVideoError(null);
    setVideoProgress({ stage: 'idle', percentage: 0, message: '' });
    
    try {
      // Step 1: Generate script with Full Cast TTS
      setVideoProgress({
        stage: 'parsing',
        percentage: 20,
        message: 'Analyzing text with Full Cast...'
      });

      console.log(`[Video Generation] Sending full chapter text to Full Cast (${chapter.content.length} characters)`);
      console.log(`[Video Generation] About to call requestFullCast...`);
      console.log(`[Video Generation] Full Cast URL: ${import.meta.env.VITE_FULL_CAST_TTS_URL || 'http://localhost:4001'}`);

      let script;
      try {
        const result = await requestFullCast(chapter.content, { 
          llm: 'gemini-2.0-flash', 
          parser: 'chatThread', 
          useVoiceCasting: true 
        });
        script = result.script;
        console.log(`[Video Generation] requestFullCast completed successfully`);
      } catch (error) {
        console.error(`[Video Generation] requestFullCast failed:`, error);
        throw new Error(`Full Cast API call failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      if (!script || script.length === 0) {
        throw new Error('No script generated');
      }

      console.log(`[Video Generation] Received ${script.length} script lines from Full Cast`);

      // Step 1.5: Start scene analysis in parallel (if enabled)
      const FULL_CAST_TTS_URL = import.meta.env.VITE_FULL_CAST_TTS_URL || 'http://localhost:4001';
      let sceneAnalysisPromise: Promise<any> | null = null;

      console.log('[Video Generation] Checking scene images setting:', {
        enableSceneImages: settings.enableSceneImages,
        fullSettings: settings
      });

      if (settings.enableSceneImages) {
        console.log('[Video Generation] Starting parallel scene analysis...');
        sceneAnalysisPromise = fetch(`${FULL_CAST_TTS_URL}/api/analyze-scenes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: chapter.content,
            bookTitle: uploadedFile?.name || 'Unknown',
            chapter: chapter.title,
            maxScenes: Math.min(10, Math.ceil(chapter.content.length / 2000)),
            bookTheme: 'atmospheric narrative',
            colorPalette: 'muted tones with dramatic contrasts',
            videoFormat: settings.format
          })
        })
          .then(res => res.json())
          .catch(err => {
            console.warn('[Video Generation] Scene analysis failed:', err);
            return { scenes: [] };
          });
      }

      // Step 2: Generate audio for each script line with SRT
      setVideoProgress({
        stage: 'audio',
        percentage: 50,
        message: 'Generating audio...'
      });

      // Collect audio blobs and metadata
      const audioBlobs: Blob[] = [];
      const durations: number[] = [];
      let combinedSrt = '';
      let cumulativeDuration = 0;

      for (let i = 0; i < script.length; i++) {
        const line = script[i];
        const audioProgress = 50 + (i / script.length) * 30;
        
        setVideoProgress({
          stage: 'audio',
          percentage: Math.round(audioProgress),
          message: `Generating audio ${i + 1}/${script.length}...`
        });

        console.log(`[Video Generation] Processing line ${i + 1}/${script.length}: "${line.dialogue.substring(0, 50)}..."`);
        
        try {
          const { blob, srtContent, duration, wordTimings } = await ttsForLine(
            line.dialogue, 
            line.provider, 
            line.voiceId, 
            { includeSrt: true, includeTiming: true }
          );

          console.log(`[Video Generation] Line ${i + 1} Full Cast response:`);
          console.log(`  - Audio blob size: ${blob.size} bytes`);
          console.log(`  - Duration from header: ${duration || 'undefined'} seconds`);
          console.log(`  - SRT content length: ${srtContent ? srtContent.length : 'undefined'} characters`);
          
          // Parse and log the first SRT entry to verify it starts at 0.0
          if (srtContent) {
            const firstTimestamp = srtContent.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
            if (firstTimestamp) {
              console.log(`  - First SRT timestamp: ${firstTimestamp[1]} --> ${firstTimestamp[2]}`);
              console.log(`  - First SRT start (seconds): ${parseTimeToSeconds(firstTimestamp[1])}s`);
            }
          }
          console.log(`  - SRT preview: ${srtContent ? srtContent.substring(0, 100) + '...' : 'none'}`);

          if (!blob || blob.size === 0) {
            console.error(`[Video Generation] Line ${i + 1} returned empty blob!`);
            throw new Error(`Audio generation failed for line ${i + 1}`);
          }

          audioBlobs.push(blob);
          durations.push(duration || 0);

          if (srtContent && duration) {
            console.log(`[Video Generation] BEFORE ADJUSTMENT - Line ${i + 1}:`);
            console.log(`  - Current cumulative duration: ${cumulativeDuration.toFixed(3)}s`);
            console.log(`  - This chunk's duration: ${duration.toFixed(3)}s`);
            console.log(`  - Raw SRT preview: ${srtContent.substring(0, 200)}`);
            
            const adjustedSrt = adjustSrtTimestamps(srtContent, cumulativeDuration, i + 1);
            
            console.log(`[Video Generation] AFTER ADJUSTMENT - Line ${i + 1}:`);
            console.log(`  - Adjusted SRT preview: ${adjustedSrt.substring(0, 200)}`);
            console.log(`  - Next cumulative will be: ${(cumulativeDuration + duration).toFixed(3)}s`);
            
            combinedSrt += adjustedSrt + '\n\n';
            cumulativeDuration += duration;
            console.log(`[Video Generation] Line ${i + 1} added to cumulative: duration=${duration}s, total=${cumulativeDuration.toFixed(2)}s`);
          } else if (duration) {
            // Still add to cumulative duration even if SRT is missing
            cumulativeDuration += duration;
            console.log(`[Video Generation] Line ${i + 1} added to cumulative (no SRT): duration=${duration}s, total=${cumulativeDuration.toFixed(2)}s`);
          } else {
            console.warn(`[Video Generation] Line ${i + 1} missing both data: duration=${duration}, srtContent=${!!srtContent}`);
          }
        } catch (error) {
          console.error(`[Video Generation] Failed to generate audio for line ${i + 1}:`, error);
          throw error; // Don't continue with incomplete audio
        }
      }

      console.log('[Video Generation] Audio collection complete:');
      console.log(`  - Total chunks: ${audioBlobs.length}`);
      console.log(`  - Individual sizes:`, audioBlobs.map(b => b.size));
      console.log(`  - Total duration: ${cumulativeDuration}s`);

      // Validation before sending to Python server
      if (cumulativeDuration === 0) {
        throw new Error('No audio duration calculated - audio generation may have failed');
      }

      if (!combinedSrt || combinedSrt.trim().length === 0) {
        console.warn('No SRT data generated - video will use basic timing');
      }

      // Step 2.5: Generate scene images (if enabled)
      let sceneImages: any[] = [];
      let sceneImageFiles: File[] = [];

      if (settings.enableSceneImages && sceneAnalysisPromise) {
        setVideoProgress({
          stage: 'audio',
          percentage: 75,
          message: 'Generating scene images...'
        });

        try {
          const { scenes } = await sceneAnalysisPromise;
          console.log('[Video Generation] Scene analysis complete:', scenes.length, 'scenes');

          if (scenes.length > 0) {
            // Generate images for scenes
            const imageResponse = await fetch(`${FULL_CAST_TTS_URL}/api/generate-scene-images`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                scenes,
                videoFormat: settings.format
              })
            });

            if (imageResponse.ok) {
              const imageResult = await imageResponse.json();
              sceneImages = imageResult.images || [];
              console.log('[Video Generation] Generated images:', sceneImages.length);

              // Download images from Full Cast TTS server
              for (const img of sceneImages) {
                try {
                  const imgUrl = `${FULL_CAST_TTS_URL}/${img.filename}`;
                  const imgResponse = await fetch(imgUrl);
                  if (imgResponse.ok) {
                    const blob = await imgResponse.blob();
                    const file = new File([blob], img.filename, { type: img.mimeType || 'image/png' });
                    sceneImageFiles.push(file);
                  }
                } catch (err) {
                  console.warn(`Failed to download image ${img.filename}:`, err);
                }
              }
            }
          }
        } catch (error) {
          console.warn('[Video Generation] Image generation error:', error);
          // Continue without images
        }
      }

      console.log(`[Video Generation] Sending to Python server:`);
      console.log(`  - Audio chunks: ${audioBlobs.length}`);
      console.log(`  - Total duration: ${cumulativeDuration.toFixed(2)}s`);
      console.log(`  - SRT data length: ${combinedSrt.length} characters`);
      console.log(`  - SRT segments: ${combinedSrt.split('\n\n').length}`);
      console.log(`  - Scene images: ${sceneImages.length}`);

      // Step 3: Send to Python server for video generation
      setVideoProgress({
        stage: 'video',
        percentage: 80,
        message: 'Generating video...'
      });

      console.log(`[Video Generation] Sending to Python server`);
      console.log(`[Video Generation] Audio duration: ${cumulativeDuration}s`);
      console.log(`[Video Generation] SRT segments: ${combinedSrt.split('\n\n').length}`);

      console.log(`[Video Generation] Sending ${audioBlobs.length} individual audio chunks`);

      const formData = new FormData();
      
      // Send individual audio chunks instead of combining them
      audioBlobs.forEach((blob, index) => {
        formData.append('audio_chunks', blob, `audio_${index}.mp3`);
      });
      
      // Send metadata about each chunk
      const audioMetadata = audioBlobs.map((blob, index) => ({
        index,
        size: blob.size,
        duration: durations[index] || 0
      }));
      formData.append('audio_metadata', JSON.stringify(audioMetadata));
      
      formData.append('text', chapter.content);
      formData.append('srt_data', combinedSrt);
      formData.append('total_duration', cumulativeDuration.toString());
      formData.append('book_title', uploadedFile?.name || 'Unknown');
      formData.append('chapter_title', chapter.title);
      formData.append('author', 'Unknown Author');
      formData.append('format', settings.format);
      formData.append('highlight_mode', settings.highlightMode);

      // Add scene images if available
      if (sceneImages.length > 0) {
        // Add metadata
        formData.append('scene_images_metadata', JSON.stringify(sceneImages.map(img => ({
          sceneIndex: img.sceneIndex,
          filename: img.filename,
          mimeType: img.mimeType,
          anchor_text: img.anchor_text
        }))));

        // Add image files
        sceneImageFiles.forEach(file => {
          formData.append('scene_image_files', file);
        });

        console.log(`[Video Generation] Added ${sceneImages.length} scene images to FormData`);
      }

      const response = await fetch('http://localhost:8000/generate-video', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Video generation failed: ${response.statusText}`);
      }

      // Step 4: Download the generated video
      setVideoProgress({
        stage: 'complete',
        percentage: 100,
        message: 'Video generated successfully!'
      });

      const videoBlob = await response.blob();
      const videoUrl = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `${chapter.title}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(videoUrl);

      console.log('[Video Generation] Video generated and downloaded successfully');
    } catch (error) {
      console.error('[Video Generation] Failed:', error);
      setVideoError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsGeneratingVideo(false);
    }
  }, [chapters, uploadedFile, settings]);

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO 
        title="EPUB to Video Generator - YoRead (Free)"
        description="Transform your EPUB books into engaging videos with AI voices and synchronized text highlighting - completely free!"
        keywords={['epub to video', 'ebook video', 'video generator', 'AI voices', 'text to video', 'free video converter']}
        url="https://yoread.com/epub-to-video"
      />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-xl font-semibold text-gray-800 flex items-center">
                <ArrowLeft className="w-5 h-5 mr-2" />
                YoRead
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600">EPUB to Video</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-red-100 p-3 rounded-full">
              <Video className="w-8 h-8 text-red-800" />
            </div>
          </div>
          <div className="flex items-center justify-center mb-3">
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mr-3">
              EPUB to Video Generator
            </h1>
            <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
              FREE
            </span>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform your EPUB books into engaging videos with AI voices, synchronized text highlighting, 
            and professional quality. <span className="font-semibold text-green-700">Completely free to use!</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* File Upload Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-red-800" />
                Upload Your EPUB
                <span className="ml-2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                  FREE
                </span>
              </h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-400 transition-colors">
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
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
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

            {/* Chapters List */}
            {chapters.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-red-800" />
                  Chapters ({chapters.length})
                </h3>
                
                <div className="space-y-3">
                  {chapters.map((chapter) => {
                    return (
                      <div key={chapter.index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {chapter.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {chapter.content.length} characters • ~{formatDuration(chapter.estimatedDuration)} estimated
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {chapter.content.substring(0, 100)}...
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              console.log('[Video Generation] Button onClick triggered');
                              console.log('[Video Generation] Current state:', { isGeneratingVideo, chapterIndex: chapter.index });
                              handleGenerateVideo(chapter.index);
                            }}
                            disabled={isGeneratingVideo}
                            className="flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate video from chapter"
                          >
                            {isGeneratingVideo ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                {videoProgress.message || 'Generating...'}
                              </>
                            ) : (
                              <>
                                <Video className="w-3 h-3 mr-1" />
                                Generate Video
                              </>
                            )}
                          </button>
                        </div>
                        
                        {/* Video Generation Progress */}
                        {isGeneratingVideo && videoProgress.percentage > 0 && (
                          <div className="mt-3 w-full">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-red-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${videoProgress.percentage}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {videoProgress.message}
                            </p>
                          </div>
                        )}

                        {/* Video Generation Error */}
                        {videoError && (
                          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            {videoError}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Settings Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-red-800" />
                Video Settings
              </h3>
              
              <div className="space-y-6">
                {/* Video Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video Format
                  </label>
                  <select
                    value={settings.format}
                    onChange={(e) => handleSettingsChange('format', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  >
                    <option value="youtube">YouTube (1920x1080)</option>
                    <option value="mobile">Mobile (1080x1920)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {settings.format === 'youtube' 
                      ? 'Horizontal format for YouTube, TikTok, etc.' 
                      : 'Vertical format for Instagram Stories, TikTok, etc.'
                    }
                  </p>
                </div>

                {/* Video Style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video Style
                  </label>
                  <select
                    value={settings.style}
                    onChange={(e) => handleSettingsChange('style', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  >
                    <option value="ereader">E-Reader (Book Style)</option>
                    <option value="subtitle">Subtitle Style</option>
                    <option value="minimal">Minimal</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {settings.style === 'ereader' 
                      ? 'Elegant book-like appearance with serif fonts and page margins' 
                      : settings.style === 'subtitle'
                      ? 'Modern subtitle style with bold text and highlighting'
                      : 'Clean minimal design with focus on readability'
                    }
                  </p>
                </div>

                {/* Highlighting Mode Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text Highlighting
                  </label>
                  <select
                    value={settings.highlightMode}
                    onChange={(e) => handleSettingsChange('highlightMode', e.target.value as 'none' | 'sentence' | 'word')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">No Highlighting</option>
                    <option value="sentence">Sentence-Level (Current sentence only)</option>
                    <option value="word">Word-Level (Each word as spoken)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {settings.highlightMode === 'sentence' && 'Highlights the current sentence being spoken'}
                    {settings.highlightMode === 'word' && 'Highlights each word as it is spoken'}
                    {settings.highlightMode === 'none' && 'No text highlighting'}
                  </p>
                </div>

                {/* Scene Images Toggle */}
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.enableSceneImages}
                      onChange={(e) => {
                        console.log('[Settings] enableSceneImages checkbox changed to:', e.target.checked);
                        setSettings(prev => ({
                          ...prev,
                          enableSceneImages: e.target.checked
                        }));
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      Add AI-generated scene images
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Automatically adds atmospheric background images to your video
                  </p>
                </div>
              </div>
            </div>

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
                  Synchronized text highlighting
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Multiple voice characters
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  YouTube & Mobile formats
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  High-quality video output
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

export default EpubToVideo;
