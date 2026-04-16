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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`
          relative bg-white rounded-xl shadow-xl transition-all duration-300 ease-out overflow-hidden
          ${!isPlaying
            ? "w-[90%] max-w-md mx-4 max-h-[85vh]"
            : "w-[95%] max-w-4xl mx-4 h-[90%]"}
        `}
      >
        {/* Modern Close Button */}
        <button
          className="absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          onClick={handleClose}
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {playbackFinished && (
          <div className="flex items-center justify-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Playback completed successfully!</span>
            </div>
          </div>
        )}

        {errorMessage ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              {errorMessage}
            </p>
            <button 
              onClick={handleClose}
              className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors duration-200"
            >
              Close
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="w-16 h-16 bg-amber-600 rounded-xl flex items-center justify-center mb-6 animate-pulse">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading AI Voice Model</h3>
            <p className="text-gray-600 text-center mb-6 max-w-sm text-sm">
              Downloading and initializing the Kokoro TTS model. This may take a few moments on first use.
            </p>
            <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-amber-600 h-2 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500">{loadingProgress}% complete</p>
          </div>
        ) : !isPlaying ? (
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            {/* Compact Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-amber-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Offline Audiobook</h2>
              <p className="text-sm text-gray-600">AI-powered text-to-speech</p>
            </div>

            {/* Main Action Button */}
            <div className="text-center mb-6">
              <button
                onClick={() => startPlayback(0)}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!modelLoaded}
              >
                <span className="flex items-center gap-2">
                  {!modelLoaded ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Loading Model...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Start Audiobook
                    </>
                  )}
                </span>
              </button>
            </div>

            {/* Compact Settings Grid */}
            <div className="grid grid-cols-1 gap-4 mb-6">
              {/* Voice Selection */}
              {availableVoices.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <label htmlFor="voice-select" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Voice
                  </label>
                  <select
                    id="voice-select"
                    value={selectedVoice}
                    onChange={handleVoiceChange}
                    className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-sm"
                  >
                    {availableVoices.map(voice => (
                      <option key={voice} value={voice}>
                        {getVoiceName(voice)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Playback Speed */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label htmlFor="rate-slider" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Speed: {playbackRate.toFixed(1)}x
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">0.5x</span>
                  <input
                    type="range"
                    id="rate-slider"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={playbackRate}
                    onChange={handleRateChange}
                    className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-xs text-gray-500">2.0x</span>
                </div>
              </div>

              {/* Segment Size & Auto-advance in one row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Segment
                  </label>
                  <div className="flex gap-1">
                    {[1, 3, 5].map(size => (
                      <button 
                        key={size}
                        onClick={() => handleWindowSizeChange(size)}
                        className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all duration-200 ${
                          windowSize === size 
                            ? 'bg-amber-600 text-white' 
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Auto
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="auto-play"
                      checked={autoPlay}
                      onChange={toggleAutoPlay}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Compact Content Preview */}
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Preview
              </h4>
              <div className="max-h-20 overflow-y-auto">
                <p className="text-xs text-gray-700 leading-relaxed">
                  {segments.length > 0 ? segments[0].text.substring(0, 150) + '...' : 'Loading content...'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Compact Header with progress */}
            <div className="bg-amber-600 text-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Audiobook Player</h3>
                    <p className="text-amber-100 text-sm">Segment {currentSegmentIndex + 1} of {segments.length}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Voice indicator */}
                  <div className="flex items-center gap-2 bg-white/20 rounded-md px-2 py-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-xs font-medium">{getVoiceName(selectedVoice)}</span>
                  </div>
                  
                  {/* Auto-advance indicator */}
                  <div className="flex items-center gap-2 bg-white/20 rounded-md px-2 py-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${autoPlay ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    <span className="text-xs font-medium">{autoPlay ? 'Auto' : 'Manual'}</span>
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-white/20 rounded-full h-1.5 mb-1">
                <div 
                  className="bg-white h-1.5 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-amber-100">
                <span>{Math.round(progressPercentage)}% complete</span>
                <span>{segments.length - currentSegmentIndex - 1} remaining</span>
              </div>
            </div>
            
            {/* Text display area */}
            <div
              className="relative flex-grow w-full bg-amber-50 p-6 overflow-y-auto"
              ref={textContainerRef}
            >
              <div className="max-w-3xl mx-auto">
                <div className="bg-white/90 rounded-xl p-6 shadow-sm border border-amber-200">
                  <p className="text-base sm:text-lg leading-relaxed font-serif text-gray-800">
                    <span className={segments[currentSegmentIndex]?.isPlaying ? 'text-amber-700 font-medium' : 'text-gray-700'}>
                      {getCurrentSegmentText()}
                    </span>
                    {isPlaying && !isPaused && (
                      <span className="inline-block w-0.5 h-5 bg-amber-600 ml-1 animate-pulse"></span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Compact Control Bar */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center justify-between">
                {/* Playback Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevious}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={currentSegmentIndex <= 0}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={handlePlay}
                    className="w-12 h-12 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {isPaused ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6l4-3-4-3z" />
                      </svg>
                    )}
                  </button>
                  
                  <button
                    onClick={handleNext}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={currentSegmentIndex >= segments.length - 1}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={handleStop}
                    className="w-10 h-10 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg flex items-center justify-center transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                    </svg>
                  </button>
                </div>
                
                {/* Settings Controls */}
                <div className="flex items-center gap-3">
                  {/* Voice selector */}
                  {availableVoices.length > 0 && (
                    <select
                      value={selectedVoice}
                      onChange={handleVoiceChange}
                      className="px-2 py-1 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
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
                    className="px-2 py-1 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="0.75">0.75x</option>
                    <option value="1">1x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="1.75">1.75x</option>
                    <option value="2">2x</option>
                  </select>
                  
                  {/* Auto-play toggle */}
                  <button
                    onClick={toggleAutoPlay}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                      autoPlay 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${autoPlay ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    {autoPlay ? 'Auto' : 'Manual'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KokoroPlayMode;