// // src/components/Reader/SimplePlayMode.tsx
// import React, { useState, useEffect } from 'react';
// import { useTextToSpeech } from '../../hooks/useTextToSpeech';
// import './SimplePlayMode.css';

// interface SimplePlayModeProps {
//   currentPageContent: string;
//   onClose: () => void;
// }

// const SimplePlayMode: React.FC<SimplePlayModeProps> = ({
//   currentPageContent,
//   onClose
// }) => {
//   // Use our TTS hook
//   const { speak, stop, isSpeaking, voices } = useTextToSpeech();
//   const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
//   const [rate, setRate] = useState<number>(1);
  
//   // Find a default voice on component mount
//   useEffect(() => {
//     if (voices.length > 0 && !selectedVoice) {
//       // Try to find a female English voice first
//       const femaleVoice = voices.find(
//         voice => voice.lang.startsWith('en') && voice.name.includes('Female')
//       );
      
//       // Then try any English voice
//       const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
      
//       // Set the selected voice
//       setSelectedVoice(femaleVoice || englishVoice || voices[0]);
//     }
//   }, [voices, selectedVoice]);
  
//   // Start speech with the current settings
//   const startSpeech = () => {
//     speak(currentPageContent, { 
//       voice: selectedVoice,
//       rate 
//     });
//   };
  
//   // Handle voice selection
//   const handleVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
//     const voiceURI = event.target.value;
//     const voice = voices.find(v => v.voiceURI === voiceURI) || null;
//     setSelectedVoice(voice);
//   };
  
//   // Handle rate change
//   const handleRateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     setRate(parseFloat(event.target.value));
//   };
  
//   // Clear speech synthesis when component unmounts
//   useEffect(() => {
//     return () => {
//       stop();
//     };
//   }, [stop]);

//   return (
//     <div className="simple-play-mode">
//       <div className="play-mode-content">
//         <div className="play-mode-header">
//           <h2>Audio Player</h2>
//           <button onClick={onClose} className="close-button">×</button>
//         </div>
        
//         <div className="play-mode-controls">
//           <div className="control-group">
//             <label htmlFor="voice-select">Voice:</label>
//             <select 
//               id="voice-select" 
//               value={selectedVoice?.voiceURI || ''}
//               onChange={handleVoiceChange}
//             >
//               {voices.map(voice => (
//                 <option key={voice.voiceURI} value={voice.voiceURI}>
//                   {voice.name} ({voice.lang})
//                 </option>
//               ))}
//             </select>
//           </div>
          
//           <div className="control-group">
//             <label htmlFor="rate-slider">Speed: {rate.toFixed(1)}x</label>
//             <input
//               type="range"
//               id="rate-slider"
//               min="0.5"
//               max="2"
//               step="0.1"
//               value={rate}
//               onChange={handleRateChange}
//             />
//           </div>
          
//           <div className="button-group">
//             {!isSpeaking ? (
//               <button onClick={startSpeech} className="play-button">Play</button>
//             ) : (
//               <button onClick={stop} className="stop-button">Stop</button>
//             )}
//           </div>
//         </div>
        
//         <div className="play-mode-text">
//           <p className="content-preview">{currentPageContent.slice(0, 300)}...</p>
//           <p className="instruction-text">
//             {isSpeaking 
//               ? "Reading text aloud..." 
//               : "Click Play to start reading text aloud"}
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default SimplePlayMode;


// src/components/Reader/KokoroPlayMode.tsx// src/components/Reader/KokoroPlayMode.tsx
import React, { useState, useEffect, useRef } from 'react';
import { KokoroTTS, TextSplitterStream } from 'kokoro-js';
import './SimplePlayMode.css';

// Define interface for progress info
interface ProgressInfo {
  progress: number;
  loaded: number;
  total: number;
}

interface KokoroPlayModeProps {
  currentPageContent: string;
  onClose: () => void;
}

const KokoroPlayMode: React.FC<KokoroPlayModeProps> = ({
  currentPageContent,
  onClose
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Refs
  const ttsRef = useRef<any>(null);
  const splitterRef = useRef<TextSplitterStream | null>(null);
  const streamRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Initialize Kokoro TTS
  useEffect(() => {
    const initTTS = async () => {
      try {
        setIsLoading(true);
        setLoadingProgress(10);
        console.log("Initializing Kokoro TTS...");
        
        // Initialize the AudioContext
        audioContextRef.current = new AudioContext();
        
        // Initialize Kokoro TTS
        const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
        setLoadingProgress(30);
        
        // Use the correct dtype based on device capability
        const supportsWebGPU = 'gpu' in navigator;
        console.log("WebGPU supported:", supportsWebGPU);
        
        const tts = await KokoroTTS.from_pretrained(model_id, {
          dtype: "fp32", // Options: "fp32", "fp16", "q8", "q4", "q4f16"
          device: supportsWebGPU ? "webgpu" : "wasm", // Use WebGPU if available
          progress_callback: (progressInfo: ProgressInfo) => {
            console.log("Loading progress:", progressInfo);
            // Ensure we're using a number for calculations
            const progressValue = typeof progressInfo === 'number' 
              ? progressInfo 
              : (progressInfo.progress || 0);
              
            setLoadingProgress(30 + Math.round(progressValue * 70));
          }
        });
        
        console.log("Kokoro TTS model loaded successfully");
        ttsRef.current = tts;
        setLoadingProgress(100);
        setIsLoading(false);
        setModelLoaded(true);
      } catch (error: unknown) {
        console.error('Error initializing Kokoro TTS:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setErrorMessage(`Failed to initialize TTS: ${errorMsg}`);
        setIsLoading(false);
      }
    };
    
    initTTS();
    
    // Cleanup
    return () => {
      cleanupAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  // Function to clean up audio playback
  const cleanupAudio = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.stop();
      currentAudioSourceRef.current.disconnect();
      currentAudioSourceRef.current = null;
    }
    
    if (splitterRef.current) {
      splitterRef.current.close();
      splitterRef.current = null;
    }
    
    streamRef.current = null;
    audioQueueRef.current = [];
  };
  
  // Start TTS playback
  const startPlayback = async () => {
    if (!ttsRef.current || isPlaying) return;
    
    try {
      setIsPlaying(true);
      setIsPaused(false);
      cleanupAudio();
      setErrorMessage('');
      
      console.log("Starting Kokoro TTS playback");
      
      // Create a new abort controller
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      // Create a new splitter and stream
      const splitter = new TextSplitterStream();
      splitterRef.current = splitter;
      
      // Set up the stream
      const stream = ttsRef.current.stream(splitter);
      streamRef.current = stream;
      
      // Process the stream
      (async () => {
        try {
          let fullText = '';
          
          for await (const chunk of stream) {
            // Check if we've been aborted
            if (signal.aborted) break;
            
            // Extract text and audio from the chunk
            const { text, audio } = chunk as { text: string; audio: any };
            console.log("Received chunk:", { text, hasAudio: !!audio });
            
            fullText += text;
            setCurrentText(fullText);
            
            if (!audio) {
              console.warn("No audio in chunk");
              continue;
            }
            
            // Check what methods are available on the audio object
            console.log("Audio object methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(audio)));
            
            try {
              // Handle Kokoro's audio format
              if (audio.toBlob && typeof audio.toBlob === 'function') {
                console.log("Using toBlob method");
                const blob = await audio.toBlob();
                const audioData = await blob.arrayBuffer();
                playAudioFromArrayBuffer(audioData);
              }
              else if (audio.toWav && typeof audio.toWav === 'function') {
                console.log("Using toWav method");
                const wavData = audio.toWav();
                const blob = new Blob([wavData], { type: 'audio/wav' });
                const audioData = await blob.arrayBuffer();
                playAudioFromArrayBuffer(audioData);
              }
              else if (audio.audio && audio.sampling_rate) {
                console.log("Using raw audio data");
                playRawAudioData(audio.audio, audio.sampling_rate);
              }
              else {
                console.error("Unrecognized audio format:", audio);
              }
            } catch (audioError) {
              console.error("Error processing audio chunk:", audioError);
            }
          }
        } catch (error: unknown) {
          if (!signal.aborted) {
            console.error('Error processing TTS stream:', error);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            setErrorMessage(`Error playing audio: ${errorMsg}`);
            setIsPlaying(false);
          }
        }
      })();
      
      // Feed the text to the stream
      const cleanText = preprocessText(currentPageContent);
      const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
      
      console.log(`Splitting text into ${sentences.length} sentences`);
      
      for (const sentence of sentences) {
        if (signal.aborted) break;
        splitter.push(sentence);
        console.log("Pushed sentence to stream:", sentence);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Close the stream
      console.log("Closing text splitter stream");
      splitter.close();
      
    } catch (error: unknown) {
      console.error('Error starting TTS playback:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(`Failed to start audio: ${errorMsg}`);
      setIsPlaying(false);
    }
  };
  
  // Play audio from ArrayBuffer
  const playAudioFromArrayBuffer = async (audioData: ArrayBuffer) => {
    if (!audioContextRef.current) return;
    
    try {
      console.log("Decoding audio data");
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData);
      
      audioQueueRef.current.push(audioBuffer);
      
      // If this is the first audio chunk, start playing
      if (audioQueueRef.current.length === 1 && !currentAudioSourceRef.current) {
        playNextAudio();
      }
    } catch (error) {
      console.error("Error decoding audio data:", error);
    }
  };
  
  // Play raw audio data (Float32Array with sampling rate)
  const playRawAudioData = (audioData: Float32Array, sampleRate: number) => {
    if (!audioContextRef.current) return;
    
    try {
      console.log("Creating audio buffer from raw data");
      
      // Create an audio buffer
      const audioBuffer = audioContextRef.current.createBuffer(
        1, // mono
        audioData.length,
        sampleRate
      );
      
      // Copy the data to the audio buffer
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < audioData.length; i++) {
        channelData[i] = audioData[i];
      }
      
      audioQueueRef.current.push(audioBuffer);
      
      // If this is the first audio chunk, start playing
      if (audioQueueRef.current.length === 1 && !currentAudioSourceRef.current) {
        playNextAudio();
      }
    } catch (error) {
      console.error("Error creating audio buffer:", error);
    }
  };
  
  // Preprocess text to improve TTS quality
  const preprocessText = (text: string): string => {
    // Remove excess whitespace
    let cleaned = text.replace(/\s+/g, ' ').trim();
    
    // Replace common abbreviations
    cleaned = cleaned.replace(/(\w)\.(\w)/g, '$1. $2'); // e.g., "Mr.Smith" -> "Mr. Smith"
    
    // Add periods to make sure we have complete sentences
    if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
      cleaned += '.';
    }
    
    return cleaned;
  };
  
  // Play the next audio chunk in the queue
  const playNextAudio = () => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0 || isPaused) return;
    
    console.log("Playing next audio chunk");
    
    // Create a new audio source
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioQueueRef.current[0];
    source.playbackRate.value = playbackRate;
    source.connect(audioContextRef.current.destination);
    
    // Store the source so we can stop it if needed
    currentAudioSourceRef.current = source;
    
    // Remove this buffer from the queue
    audioQueueRef.current.shift();
    
    // When this audio chunk ends, play the next one
    source.onended = () => {
      console.log("Audio chunk ended");
      currentAudioSourceRef.current = null;
      
      if (audioQueueRef.current.length > 0) {
        playNextAudio();
      } else if (!splitterRef.current) {
        // If we're done and the splitter is closed, we're finished
        console.log("Playback complete");
        setIsPlaying(false);
      }
    };
    
    // Start playback
    source.start();
    console.log("Started audio source");
  };
  
  // Pause playback
  const pausePlayback = () => {
    setIsPaused(true);
    
    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.stop();
      currentAudioSourceRef.current = null;
    }
  };
  
  // Resume playback
  const resumePlayback = () => {
    setIsPaused(false);
    playNextAudio();
  };
  
  // Stop playback
  const stopPlayback = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentText('');
    cleanupAudio();
  };
  
  // Update playback rate
  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRate = parseFloat(e.target.value);
    setPlaybackRate(newRate);
    
    // Update the rate of the current audio source if one is playing
    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.playbackRate.value = newRate;
    }
  };
  
  // Handle component unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  return (
    <div className="simple-play-mode">
      <div className="play-mode-content">
        <div className="play-mode-header">
          <h2>Kokoro Audio Player</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-progress">
              <div 
                className="progress-bar" 
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <p>Loading Kokoro TTS ({loadingProgress}%)...</p>
            <p className="loading-info">This may take a moment as the AI model is being loaded</p>
          </div>
        ) : errorMessage ? (
          <div className="error-container">
            <p className="error-message">{errorMessage}</p>
            <button onClick={onClose} className="error-close-button">Close</button>
          </div>
        ) : (
          <>
            <div className="control-group">
              <label htmlFor="rate-slider">Speed: {playbackRate.toFixed(1)}x</label>
              <input
                type="range"
                id="rate-slider"
                min="0.5"
                max="2"
                step="0.1"
                value={playbackRate}
                onChange={handleRateChange}
              />
            </div>
            
            <div className="button-group">
              {!isPlaying ? (
                <button 
                  onClick={startPlayback} 
                  className="play-button"
                  disabled={!modelLoaded}
                >
                  {modelLoaded ? 'Start Reading' : 'Model Loading...'}
                </button>
              ) : isPaused ? (
                <button onClick={resumePlayback} className="play-button">Resume</button>
              ) : (
                <div className="playing-controls">
                  <button onClick={pausePlayback} className="pause-button">Pause</button>
                  <button onClick={stopPlayback} className="stop-button">Stop</button>
                </div>
              )}
            </div>
            
            <div className="play-mode-text">
              {isPlaying ? (
                <p className="current-text">{currentText}</p>
              ) : (
                <p className="content-preview">{currentPageContent.slice(0, 300)}...</p>
              )}
              <p className="instruction-text">
                {isPlaying 
                  ? "Reading text using Kokoro TTS..." 
                  : modelLoaded 
                    ? "Click Start Reading to use Kokoro's AI voice" 
                    : "Please wait for the model to load..."}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default KokoroPlayMode;