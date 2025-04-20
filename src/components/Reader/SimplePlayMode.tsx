// src/components/Reader/KokoroPlayMode.tsx
import React, { useState, useEffect, useRef } from 'react';
import { KokoroTTSService } from '../../services/KokoroTTSService';
import './SimplePlayMode.css';

interface KokoroPlayModeProps {
  currentPageContent: string;
  onClose: () => void;
}

// Interface for our text segments
interface TextSegment {
  id: string;
  text: string;
  isPlaying: boolean;
  isPlayed: boolean;
}

// Helper function to split text into sentences
const splitTextIntoSentences = (text: string): string[] => {
  // Basic sentence splitting - this can be improved for better accuracy
  const sentenceRegex = /[.!?]+\s+/g;
  const sentences = text.split(sentenceRegex);
  
  // Filter out empty sentences and trim whitespace
  return sentences
    .filter(sentence => sentence.trim().length > 0)
    .map(sentence => sentence.trim());
};

// Group sentences into chunks of specified size
const groupSentencesIntoChunks = (sentences: string[], chunkSize: number = 3): string[] => {
  if (chunkSize <= 0) return sentences;
  
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += chunkSize) {
    const chunk = sentences.slice(i, i + chunkSize).join('. ') + '.';
    chunks.push(chunk);
  }
  
  return chunks;
};

const KokoroPlayMode: React.FC<KokoroPlayModeProps> = ({
  currentPageContent,
  onClose
}) => {
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(10);
  const [windowSize, setWindowSize] = useState(3);

  
  
  // Text segment state
  const [segments, setSegments] = useState<TextSegment[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackFinished, setPlaybackFinished] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  
  // Voice selection state
  const [availableVoices, setAvailableVoices] = useState<string[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  
  // Refs
  const ttsServiceRef = useRef<KokoroTTSService | null>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<boolean>(true);
  const isStoppingRef = useRef<boolean>(false);
  
  // Initialize TTS service and prepare segments
  useEffect(() => {
    // Create TTS service
    const ttsService = new KokoroTTSService();
    ttsServiceRef.current = ttsService;
    
    // Initialize the TTS service
    // In KokoroPlayMode.tsx
    // Inside the useEffect where we initialize the TTS service

    // Initialize the TTS service
    const initTTS = async () => {
      try {
        setIsLoading(true);
        
        // Set callbacks
        ttsService.setCallbacks(
          // Text update callback
          (text: string) => {
            console.log("TTS text update:", text.substring(0, 30) + "...");
            
            // Update the UI based on the current segment
            if (segments.length > 0) {
              // Mark current segment as playing
              const updatedSegments = [...segments];
              
              // Reset any previous playing segment
              updatedSegments.forEach((seg, idx) => {
                if (seg.isPlaying && idx !== currentSegmentIndex) {
                  updatedSegments[idx] = {
                    ...seg,
                    isPlaying: false,
                    isPlayed: true
                  };
                }
              });
              
              // Set current segment as playing
              updatedSegments[currentSegmentIndex] = {
                ...updatedSegments[currentSegmentIndex],
                isPlaying: true
              };
              
              setSegments(updatedSegments);
            }
          },
          // Error callback
          (error: string) => {
            console.error("TTS error:", error);
            setErrorMessage(error);
            setIsPlaying(false);
          },
          // Completion callback - THIS IS KEY FOR CONTINUOUS PLAYBACK
          () => {
            console.log("TTS segment completed, current index:", currentSegmentIndex);
            
            // Mark current segment as played
            if (segments.length > 0) {
              const updatedSegments = [...segments];
              updatedSegments[currentSegmentIndex] = {
                ...updatedSegments[currentSegmentIndex],
                isPlaying: false,
                isPlayed: true
              };
              setSegments(updatedSegments);
              
              // Check if we should automatically advance to the next segment
              if (autoPlayRef.current && !isStoppingRef.current) {
                const nextIndex = currentSegmentIndex + 1;
                
                if (nextIndex < segments.length) {
                  console.log("Advancing to next segment:", nextIndex);
                  
                  // Use a direct function call to update state and play next segment
                  // This ensures that the state is updated before we attempt to play
                  playNextSegment(nextIndex);
                } else {
                  console.log("Reached end of content");
                  setPlaybackFinished(true);
                  setIsPlaying(false);
                }
              } else if (isStoppingRef.current) {
                console.log("Playback was manually stopped");
                isStoppingRef.current = false;
              } else {
                console.log("Auto-advance disabled, waiting for user input");
              }
            }
          }
        );
        
        // // Set voices loaded callback separately using the new method
        // ttsService.setVoicesLoadedCallback((voices: string[]) => {
        //   console.log("Voices loaded:", voices);
        //   setAvailableVoices(voices);
        //   if (voices.length > 0) {
        //     setSelectedVoice(voices[0]);
        //     ttsService.setVoice(voices[0]);
        //   }
        // });
        
        // Initialize the service with only the progress callback
        await ttsService.initialize(
          // Progress callback
          (progress: number) => {
            setLoadingProgress(progress);
            // Update estimated time
            const remainingTime = Math.ceil((100 - progress) / 10);
            setEstimatedTime(remainingTime);
          }
        );
        
    // Now that the model is loaded, get available voices
        // We do this after initialization to avoid type errors
        try {
          // Use type assertion to call the new method
          const voices = (ttsService as any).getVoices();
          console.log("Available voices:", voices);
          setAvailableVoices(voices);
          if (voices.length > 0) {
            setSelectedVoice(voices[0]);
          }
        } catch (error) {
          console.warn("Could not get voices:", error);
          // Fallback to default voices
          const fallbackVoices = ['af_heart', 'af_bella', 'af_sky', 'af_nicole', 'am_michael', 'bf_emma'];
          setAvailableVoices(fallbackVoices);
          setSelectedVoice(fallbackVoices[0]);
        }
        
        setIsLoading(false);
        setModelLoaded(true);
        
        // Prepare text segments after model is loaded
        prepareTextSegments();
      } catch (error) {
        console.error('Error initializing TTS service:', error);
        setErrorMessage('Failed to initialize TTS service');
        setIsLoading(false);
      }
    };
    
    initTTS();
    
    // Cleanup
    return () => {
      cleanupPlayback();
    };
  }, []);

  // Update autoPlayRef when autoPlay changes
  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);
  
  // Update segments if window size changes
  useEffect(() => {
    if (modelLoaded && !isPlaying) {
      prepareTextSegments();
    }
  }, [windowSize]);
  
  // Function to prepare text segments from the current page
  const prepareTextSegments = () => {
    // Split text into sentences
    const sentences = splitTextIntoSentences(currentPageContent);
    
    // Group into chunks based on window size
    const textChunks = groupSentencesIntoChunks(sentences, windowSize);
    
    // Create segment objects
    const newSegments = textChunks.map((text, index) => ({
      id: `segment-${index}`,
      text,
      isPlaying: false,
      isPlayed: false
    }));
    
    setSegments(newSegments);
    setCurrentSegmentIndex(0);
  };
  
  // Handle voice change
  // Add a handle voice change function
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVoice = e.target.value;
    setSelectedVoice(newVoice);
    console.log("Voice changed to:", newVoice);
  };
  
  // Direct function to advance to the next segment
  // This is called directly from the completion callback
  const playNextSegment = (nextIndex: number) => {
    setCurrentSegmentIndex(nextIndex);
    
    // Small delay to ensure state updates
    setTimeout(() => {
      if (ttsServiceRef.current && autoPlayRef.current && !isStoppingRef.current) {
        // Play the next segment
        const nextSegment = segments[nextIndex];
        if (nextSegment) {
          console.log("Playing next segment:", nextIndex, nextSegment.text.substring(0, 30) + "...");
          
          // Update UI
          const updatedSegments = [...segments];
          updatedSegments[nextIndex] = {
            ...nextSegment,
            isPlaying: true
          };
          setSegments(updatedSegments);
          
          // Scroll text container to top for new segment
          if (textContainerRef.current) {
            textContainerRef.current.scrollTop = 0;
          }
          
          // Play the text
          ttsServiceRef.current.setPlaybackRate(playbackRate);
          ttsServiceRef.current.playText(nextSegment.text).catch(error => {
            console.error("Error playing next segment:", error);
            setErrorMessage(`Failed to play segment ${nextIndex + 1}`);
            setIsPlaying(false);
          });
        }
      }
    }, 250);
  };
  
  // Function to play a specific segment
  const playSegment = async (segmentIndex: number) => {
    if (!ttsServiceRef.current || segmentIndex < 0 || segmentIndex >= segments.length) return;
    
    try {
      // Reset the stopping flag
      isStoppingRef.current = false;
      
      // Get the segment to play
      const segment = segments[segmentIndex];
      
      // Stop any current playback
      if (isPlaying && !isPaused) {
        ttsServiceRef.current.stop();
      }
      
      // Update state
      setCurrentSegmentIndex(segmentIndex);
      setIsPlaying(true);
      setIsPaused(false);
      setPlaybackFinished(false);
      
      // Update segment status
      const updatedSegments = [...segments];
      
      // Reset any currently playing segments
      updatedSegments.forEach((s, i) => {
        if (s.isPlaying) {
          updatedSegments[i] = {
            ...s,
            isPlaying: false
          };
        }
      });
      
      // Mark this segment as playing
      updatedSegments[segmentIndex] = {
        ...segment,
        isPlaying: true
      };
      
      setSegments(updatedSegments);
      
      // Scroll to top
      if (textContainerRef.current) {
        textContainerRef.current.scrollTop = 0;
      }
      
      // Set playback rate
      ttsServiceRef.current.setPlaybackRate(playbackRate);
      
      // // Make sure the voice is set
      // if (selectedVoice) {
      //   ttsServiceRef.current.setVoice(selectedVoice);
      // }
      
      // Play the segment text
      console.log(`Playing segment ${segmentIndex} with voice ${selectedVoice}:`, segment.text.substring(0, 30) + "...");
          // Use type assertion to call the modified method
      await (ttsServiceRef.current as any).playText(segment.text, selectedVoice);
    } catch (error) {
      console.error('Error playing segment:', error);
      setErrorMessage(`Failed to play segment ${segmentIndex + 1}`);
      setIsPlaying(false);
    }
  };
  
  // Function to start playback from a specific segment
  const startPlayback = (fromSegmentIndex: number = 0) => {
    // Reset playback state
    setPlaybackFinished(false);
    
    // Start playing from the specified segment
    playSegment(fromSegmentIndex);
  };
  
  // Function to pause playback
  const pausePlayback = () => {
    if (!ttsServiceRef.current) return;
    
    ttsServiceRef.current.pause();
    setIsPaused(true);
  };
  
  // Function to resume playback
  const resumePlayback = () => {
    if (!ttsServiceRef.current) return;
    
    ttsServiceRef.current.resume();
    setIsPaused(false);
  };
  
  // Function to stop playback
  const stopPlayback = () => {
    if (!ttsServiceRef.current) return;
    
    // Set flag to prevent auto-advance in completion callback
    isStoppingRef.current = true;
    
    ttsServiceRef.current.stop();
    setIsPlaying(false);
    setIsPaused(false);
    
    // Reset all segments playing status
    const updatedSegments = [...segments];
    updatedSegments.forEach((segment, index) => {
      if (segment.isPlaying) {
        updatedSegments[index] = {
          ...segment,
          isPlaying: false
        };
      }
    });
    
    setSegments(updatedSegments);
  };
  
  // Handle cleanup
  const cleanupPlayback = () => {
    console.log("Cleaning up playback");
    
    try {
      // Set stopping flag
      isStoppingRef.current = true;
      
      // Stop any active playback
      if (isPlaying) {
        stopPlayback();
      }
      
      // Dispose of TTS service
      if (ttsServiceRef.current) {
        try {
          ttsServiceRef.current.dispose();
        } catch (error) {
          console.warn("Error disposing TTS service:", error);
        }
        ttsServiceRef.current = null;
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  };
  
  // Handle close
  const handleClose = () => {
    console.log("PlayMode closing");
    
    try {
      cleanupPlayback();
    } catch (error) {
      console.error("Error during close:", error);
    } finally {
      // Always call parent's onClose
      onClose();
    }
  };
  
  // Update playback rate
  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) => {
    const newRate = parseFloat(e.target.value);
    setPlaybackRate(newRate);
    
    // Apply to current playback if active
    if (ttsServiceRef.current && isPlaying) {
      ttsServiceRef.current.setPlaybackRate(newRate);
    }
  };
  
  // Handle window size change
  const handleWindowSizeChange = (size: number) => {
    if (size !== windowSize) {
      setWindowSize(size);
    }
  };
  
  // Toggle auto play mode
  const toggleAutoPlay = () => {
    setAutoPlay(!autoPlay);
  };
  
  // Handlers for UI controls
  const handlePlay = () => {
    if (!isPlaying) {
      startPlayback(currentSegmentIndex);
    } else if (isPaused) {
      resumePlayback();
    } else {
      pausePlayback();
    }
  };
  
  const handlePrevious = () => {
    if (currentSegmentIndex > 0) {
      startPlayback(currentSegmentIndex - 1);
    }
  };
  
  const handleNext = () => {
    if (currentSegmentIndex < segments.length - 1) {
      startPlayback(currentSegmentIndex + 1);
    }
  };
  
  const handleStop = () => {
    stopPlayback();
    setCurrentSegmentIndex(0);
  };

  // Get the current segment text
  const getCurrentSegmentText = () => {
    if (segments.length === 0) return '';
    return segments[currentSegmentIndex]?.text || '';
  };
  
  // Calculate progress percentage
  const progressPercentage = segments.length > 0
    ? ((currentSegmentIndex + 1) / segments.length) * 100
    : 0;

  // Get a display name for voice
  const getVoiceName = (voiceId: string) => {
    // Convert voice ID to a friendly name
    // e.g., 'af_heart' -> 'Heart (Female)'
    
    const parts = voiceId.split('_');
    if (parts.length === 2) {
      let gender = parts[0] === 'af' ? 'Female' : parts[0] === 'am' ? 'Male' : '';
      let name = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
      
      return `${name} ${gender ? `(${gender})` : ''}`;
    }
    
    return voiceId;
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-50">
      <div
        className={`
          relative bg-white text-gray-900 rounded-lg shadow-lg transition-all duration-300 overflow-hidden 
          ${!isPlaying
            ? "w-[300px] h-[400px] sm:w-[650px] sm:max-h-[85%] sm:p-6"
            : "w-full h-full sm:max-w-[800px] sm:h-[85%]"}
        `}
      >
        {/* Always-visible Close Icon */}
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 z-50 focus:outline-none"
          onClick={handleClose}
          aria-label="Close"
        >
          ×
        </button>

        {playbackFinished && (
          <div className="flex items-center justify-center p-4 bg-yellow-100 text-yellow-800">
            Playback finished. Click "Stop" or "Close" to exit.
          </div>
        )}

        {errorMessage ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="mt-4 text-base sm:text-lg font-medium text-red-600">
              {errorMessage}
            </p>
            <button 
              onClick={handleClose}
              className="mt-4 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md"
            >
              Close
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 mb-4">
              <div className="bg-gray-700 h-2.5 rounded-full" style={{ width: `${loadingProgress}%` }}></div>
            </div>
            <p className="mt-4 text-base sm:text-lg font-medium">
              We are loading a Text-to-Speech model for you. This may take a few seconds.
            </p>
          </div>
        ) : !isPlaying ? (
          <div className="flex flex-col items-center justify-center gap-4 relative h-full">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Kokoro Audio Player</h2>
            <button
              onClick={() => startPlayback(0)}
              className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-md shadow-md transition-colors focus:outline-none"
              disabled={!modelLoaded}
            >
              {!modelLoaded ? 'Model Loading...' : 'Start Audiobook'}
            </button>
            
            {/* Voice selection */}
            {/* Voice selection */}
            {availableVoices.length > 0 && (
              <div className="mt-4 px-4 w-full max-w-md">
                <label htmlFor="voice-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Voice
                </label>
                <select
                  id="voice-select"
                  value={selectedVoice}
                  onChange={handleVoiceChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  {availableVoices.map(voice => (
                    <option key={voice} value={voice}>
                      {getVoiceName(voice)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Add this to the playback state UI, where the playback rate selector is */}
            {isPlaying && availableVoices.length > 0 && (
              <div className="absolute top-4 right-12 flex items-center gap-3">
                {/* Voice selector during playback */}
                <select
                  value={selectedVoice}
                  onChange={handleVoiceChange}
                  className="form-select rounded border-gray-300 text-sm"
                >
                  {availableVoices.map(voice => (
                    <option key={voice} value={voice}>
                      {getVoiceName(voice)}
                    </option>
                  ))}
                </select>
                
                {/* Your existing playback rate selector */}
                <select
                  value={playbackRate.toString()}
                  onChange={handleRateChange}
                  className="form-select rounded border-gray-300 text-sm"
                >
                  {/* options */}
                </select>
              </div>
            )}
            
            <div className="mt-4 px-4 w-full max-w-md">
              <label htmlFor="rate-slider" className="block text-sm font-medium text-gray-700 mb-1">
                Speed: {playbackRate.toFixed(1)}x
              </label>
              <input
                type="range"
                id="rate-slider"
                min="0.5"
                max="2"
                step="0.1"
                value={playbackRate}
                onChange={handleRateChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div className="mt-4 px-4 w-full max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sentences per segment: {windowSize}
              </label>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleWindowSizeChange(1)}
                  className={`px-2 py-1 rounded ${windowSize === 1 ? 'bg-gray-700 text-white' : 'bg-gray-200'}`}
                >
                  1
                </button>
                <button 
                  onClick={() => handleWindowSizeChange(3)}
                  className={`px-2 py-1 rounded ${windowSize === 3 ? 'bg-gray-700 text-white' : 'bg-gray-200'}`}
                >
                  3
                </button>
                <button 
                  onClick={() => handleWindowSizeChange(5)}
                  className={`px-2 py-1 rounded ${windowSize === 5 ? 'bg-gray-700 text-white' : 'bg-gray-200'}`}
                >
                  5
                </button>
              </div>
            </div>
            
            {/* Auto play toggle */}
            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="auto-play"
                checked={autoPlay}
                onChange={toggleAutoPlay}
                className="h-4 w-4 text-gray-700 focus:ring-gray-500 border-gray-300 rounded"
              />
              <label htmlFor="auto-play" className="text-sm font-medium text-gray-700">
                Auto-advance between segments
              </label>
            </div>
            
            <div className="mt-8 max-h-48 overflow-y-auto p-4 border border-gray-200 rounded bg-gray-50 w-full max-w-md">
              <p className="text-sm text-gray-700">
                {segments.length > 0 ? segments[0].text + '...' : 'Loading text...'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Progress bar */}
            <div className="w-full bg-gray-200 h-2">
              <div 
                className="bg-gray-700 h-2 transition-all duration-300" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            
            {/* Text display area */}
            <div
              className="relative flex-grow w-full bg-[#f8f5e6] p-4 sm:p-8 overflow-y-auto"
              ref={textContainerRef}
            >
              <p className="text-base sm:text-2xl leading-relaxed font-serif">
                <span className={segments[currentSegmentIndex]?.isPlaying ? 'current-segment' : ''}>
                  {getCurrentSegmentText()}
                </span>
                {isPlaying && !isPaused && <span className="inline-block animate-pulse">|</span>}
              </p>
            </div>
            
            {/* Auto-play and voice indicator */}
            <div className="py-2 bg-gray-100 text-center text-sm flex justify-between items-center px-4">
              <span className="text-gray-700">
                Segment {currentSegmentIndex + 1} of {segments.length}
              </span>
              <div className="flex items-center gap-4">
                {/* Voice indicator */}
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <span className="font-medium">Voice:</span> {getVoiceName(selectedVoice)}
                </span>
                
                {/* Auto-advance indicator */}
                <span className="flex items-center gap-1">
                  <span 
                    className={`inline-block w-2 h-2 rounded-full ${autoPlay ? 'bg-green-500' : 'bg-gray-400'}`}
                  ></span>
                  <span className="text-xs text-gray-600">
                    {autoPlay ? 'Auto' : 'Manual'}
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}

        {isPlaying && !errorMessage && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center flex-wrap gap-4">
            <button
              onClick={handlePrevious}
              className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none disabled:opacity-50"
              disabled={currentSegmentIndex <= 0}
            >
              ← Previous
            </button>
            
            <button
              onClick={handlePlay}
              className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
            >
              {isPaused ? '▶ Resume' : isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            
            <button
              onClick={handleNext}
              className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none disabled:opacity-50"
              disabled={currentSegmentIndex >= segments.length - 1}
            >
              Next →
            </button>
            
            <button
              onClick={handleStop}
              className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
            >
              ⏹ Stop
            </button>
            
            {/* Auto-play toggle */}
            <button
              onClick={toggleAutoPlay}
              className={`px-4 py-2 rounded-md shadow-md focus:outline-none flex items-center gap-2 ${
                autoPlay 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
              }`}
            >
              {autoPlay ? '🔄 Auto' : '⏭️ Manual'}
            </button>
          </div>
        )}
        
        {isPlaying && (
          <div className="absolute top-4 right-12 flex items-center gap-3">
            {/* Voice selector during playback */}
            {availableVoices.length > 0 && (
              <select
                value={selectedVoice}
                onChange={handleVoiceChange}
                className="form-select rounded border-gray-300 text-sm"
              >
                {availableVoices.map(voice => (
                  <option key={voice} value={voice}>
                    {getVoiceName(voice)}
                  </option>
                ))}
              </select>
            )}
            
            {/* Playback speed */}
            <select
              value={playbackRate.toString()}
              onChange={handleRateChange}
              className="form-select rounded border-gray-300 text-sm"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="1.75">1.75x</option>
              <option value="2">2x</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default KokoroPlayMode;