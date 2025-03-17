// // // // // // // // // // src/components/Reader/SimplePlayMode.tsx
// // // // // // // // // import React, { useState, useEffect } from 'react';
// // // // // // // // // import { useTextToSpeech } from '../../hooks/useTextToSpeech';
// // // // // // // // // import './SimplePlayMode.css';

// // // // // // // // // interface SimplePlayModeProps {
// // // // // // // // //   currentPageContent: string;
// // // // // // // // //   onClose: () => void;
// // // // // // // // // }

// // // // // // // // // const SimplePlayMode: React.FC<SimplePlayModeProps> = ({
// // // // // // // // //   currentPageContent,
// // // // // // // // //   onClose
// // // // // // // // // }) => {
// // // // // // // // //   // Use our TTS hook
// // // // // // // // //   const { speak, stop, isSpeaking, voices } = useTextToSpeech();
// // // // // // // // //   const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
// // // // // // // // //   const [rate, setRate] = useState<number>(1);
  
// // // // // // // // //   // Find a default voice on component mount
// // // // // // // // //   useEffect(() => {
// // // // // // // // //     if (voices.length > 0 && !selectedVoice) {
// // // // // // // // //       // Try to find a female English voice first
// // // // // // // // //       const femaleVoice = voices.find(
// // // // // // // // //         voice => voice.lang.startsWith('en') && voice.name.includes('Female')
// // // // // // // // //       );
      
// // // // // // // // //       // Then try any English voice
// // // // // // // // //       const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
      
// // // // // // // // //       // Set the selected voice
// // // // // // // // //       setSelectedVoice(femaleVoice || englishVoice || voices[0]);
// // // // // // // // //     }
// // // // // // // // //   }, [voices, selectedVoice]);
  
// // // // // // // // //   // Start speech with the current settings
// // // // // // // // //   const startSpeech = () => {
// // // // // // // // //     speak(currentPageContent, { 
// // // // // // // // //       voice: selectedVoice,
// // // // // // // // //       rate 
// // // // // // // // //     });
// // // // // // // // //   };
  
// // // // // // // // //   // Handle voice selection
// // // // // // // // //   const handleVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
// // // // // // // // //     const voiceURI = event.target.value;
// // // // // // // // //     const voice = voices.find(v => v.voiceURI === voiceURI) || null;
// // // // // // // // //     setSelectedVoice(voice);
// // // // // // // // //   };
  
// // // // // // // // //   // Handle rate change
// // // // // // // // //   const handleRateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
// // // // // // // // //     setRate(parseFloat(event.target.value));
// // // // // // // // //   };
  
// // // // // // // // //   // Clear speech synthesis when component unmounts
// // // // // // // // //   useEffect(() => {
// // // // // // // // //     return () => {
// // // // // // // // //       stop();
// // // // // // // // //     };
// // // // // // // // //   }, [stop]);

// // // // // // // // //   return (
// // // // // // // // //     <div className="simple-play-mode">
// // // // // // // // //       <div className="play-mode-content">
// // // // // // // // //         <div className="play-mode-header">
// // // // // // // // //           <h2>Audio Player</h2>
// // // // // // // // //           <button onClick={onClose} className="close-button">×</button>
// // // // // // // // //         </div>
        
// // // // // // // // //         <div className="play-mode-controls">
// // // // // // // // //           <div className="control-group">
// // // // // // // // //             <label htmlFor="voice-select">Voice:</label>
// // // // // // // // //             <select 
// // // // // // // // //               id="voice-select" 
// // // // // // // // //               value={selectedVoice?.voiceURI || ''}
// // // // // // // // //               onChange={handleVoiceChange}
// // // // // // // // //             >
// // // // // // // // //               {voices.map(voice => (
// // // // // // // // //                 <option key={voice.voiceURI} value={voice.voiceURI}>
// // // // // // // // //                   {voice.name} ({voice.lang})
// // // // // // // // //                 </option>
// // // // // // // // //               ))}
// // // // // // // // //             </select>
// // // // // // // // //           </div>
          
// // // // // // // // //           <div className="control-group">
// // // // // // // // //             <label htmlFor="rate-slider">Speed: {rate.toFixed(1)}x</label>
// // // // // // // // //             <input
// // // // // // // // //               type="range"
// // // // // // // // //               id="rate-slider"
// // // // // // // // //               min="0.5"
// // // // // // // // //               max="2"
// // // // // // // // //               step="0.1"
// // // // // // // // //               value={rate}
// // // // // // // // //               onChange={handleRateChange}
// // // // // // // // //             />
// // // // // // // // //           </div>
          
// // // // // // // // //           <div className="button-group">
// // // // // // // // //             {!isSpeaking ? (
// // // // // // // // //               <button onClick={startSpeech} className="play-button">Play</button>
// // // // // // // // //             ) : (
// // // // // // // // //               <button onClick={stop} className="stop-button">Stop</button>
// // // // // // // // //             )}
// // // // // // // // //           </div>
// // // // // // // // //         </div>
        
// // // // // // // // //         <div className="play-mode-text">
// // // // // // // // //           <p className="content-preview">{currentPageContent.slice(0, 300)}...</p>
// // // // // // // // //           <p className="instruction-text">
// // // // // // // // //             {isSpeaking 
// // // // // // // // //               ? "Reading text aloud..." 
// // // // // // // // //               : "Click Play to start reading text aloud"}
// // // // // // // // //           </p>
// // // // // // // // //         </div>
// // // // // // // // //       </div>
// // // // // // // // //     </div>
// // // // // // // // //   );
// // // // // // // // // };

// // // // // // // // // export default SimplePlayMode;


// // // // // // // // // src/components/Reader/KokoroPlayMode.tsx// src/components/Reader/KokoroPlayMode.tsx
// // // // // // // // import React, { useState, useEffect, useRef } from 'react';
// // // // // // // // import { KokoroTTS, TextSplitterStream } from 'kokoro-js';
// // // // // // // // import './SimplePlayMode.css';

// // // // // // // // // Define interface for progress info
// // // // // // // // interface ProgressInfo {
// // // // // // // //   progress: number;
// // // // // // // //   loaded: number;
// // // // // // // //   total: number;
// // // // // // // // }

// // // // // // // // interface KokoroPlayModeProps {
// // // // // // // //   currentPageContent: string;
// // // // // // // //   onClose: () => void;
// // // // // // // // }

// // // // // // // // const KokoroPlayMode: React.FC<KokoroPlayModeProps> = ({
// // // // // // // //   currentPageContent,
// // // // // // // //   onClose
// // // // // // // // }) => {
// // // // // // // //   const [isPlaying, setIsPlaying] = useState(false);
// // // // // // // //   const [isPaused, setIsPaused] = useState(false);
// // // // // // // //   const [isLoading, setIsLoading] = useState(false);
// // // // // // // //   const [loadingProgress, setLoadingProgress] = useState(0);
// // // // // // // //   const [currentText, setCurrentText] = useState('');
// // // // // // // //   const [playbackRate, setPlaybackRate] = useState(1.0);
// // // // // // // //   const [modelLoaded, setModelLoaded] = useState(false);
// // // // // // // //   const [errorMessage, setErrorMessage] = useState('');
  
// // // // // // // //   // Refs
// // // // // // // //   const ttsRef = useRef<any>(null);
// // // // // // // //   const splitterRef = useRef<TextSplitterStream | null>(null);
// // // // // // // //   const streamRef = useRef<any>(null);
// // // // // // // //   const audioContextRef = useRef<AudioContext | null>(null);
// // // // // // // //   const audioQueueRef = useRef<AudioBuffer[]>([]);
// // // // // // // //   const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
// // // // // // // //   const abortControllerRef = useRef<AbortController | null>(null);
  
// // // // // // // //   // Initialize Kokoro TTS
// // // // // // // //   useEffect(() => {
// // // // // // // //     const initTTS = async () => {
// // // // // // // //       try {
// // // // // // // //         setIsLoading(true);
// // // // // // // //         setLoadingProgress(10);
// // // // // // // //         console.log("Initializing Kokoro TTS...");
        
// // // // // // // //         // Initialize the AudioContext
// // // // // // // //         audioContextRef.current = new AudioContext();
        
// // // // // // // //         // Initialize Kokoro TTS
// // // // // // // //         const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
// // // // // // // //         setLoadingProgress(30);
        
// // // // // // // //         // Use the correct dtype based on device capability
// // // // // // // //         const supportsWebGPU = 'gpu' in navigator;
// // // // // // // //         console.log("WebGPU supported:", supportsWebGPU);
        
// // // // // // // //         const tts = await KokoroTTS.from_pretrained(model_id, {
// // // // // // // //           dtype: "fp32", // Options: "fp32", "fp16", "q8", "q4", "q4f16"
// // // // // // // //           device: supportsWebGPU ? "webgpu" : "wasm", // Use WebGPU if available
// // // // // // // //           progress_callback: (progressInfo: ProgressInfo) => {
// // // // // // // //             console.log("Loading progress:", progressInfo);
// // // // // // // //             // Ensure we're using a number for calculations
// // // // // // // //             const progressValue = typeof progressInfo === 'number' 
// // // // // // // //               ? progressInfo 
// // // // // // // //               : (progressInfo.progress || 0);
              
// // // // // // // //             setLoadingProgress(30 + Math.round(progressValue * 70));
// // // // // // // //           }
// // // // // // // //         });
        
// // // // // // // //         console.log("Kokoro TTS model loaded successfully");
// // // // // // // //         ttsRef.current = tts;
// // // // // // // //         setLoadingProgress(100);
// // // // // // // //         setIsLoading(false);
// // // // // // // //         setModelLoaded(true);
// // // // // // // //       } catch (error: unknown) {
// // // // // // // //         console.error('Error initializing Kokoro TTS:', error);
// // // // // // // //         const errorMsg = error instanceof Error ? error.message : 'Unknown error';
// // // // // // // //         setErrorMessage(`Failed to initialize TTS: ${errorMsg}`);
// // // // // // // //         setIsLoading(false);
// // // // // // // //       }
// // // // // // // //     };
    
// // // // // // // //     initTTS();
    
// // // // // // // //     // Cleanup
// // // // // // // //     return () => {
// // // // // // // //       cleanupAudio();
// // // // // // // //       if (audioContextRef.current) {
// // // // // // // //         audioContextRef.current.close();
// // // // // // // //       }
// // // // // // // //     };
// // // // // // // //   }, []);
  
// // // // // // // //   // Function to clean up audio playback
// // // // // // // //   const cleanupAudio = () => {
// // // // // // // //     if (abortControllerRef.current) {
// // // // // // // //       abortControllerRef.current.abort();
// // // // // // // //       abortControllerRef.current = null;
// // // // // // // //     }
    
// // // // // // // //     if (currentAudioSourceRef.current) {
// // // // // // // //       currentAudioSourceRef.current.stop();
// // // // // // // //       currentAudioSourceRef.current.disconnect();
// // // // // // // //       currentAudioSourceRef.current = null;
// // // // // // // //     }
    
// // // // // // // //     if (splitterRef.current) {
// // // // // // // //       splitterRef.current.close();
// // // // // // // //       splitterRef.current = null;
// // // // // // // //     }
    
// // // // // // // //     streamRef.current = null;
// // // // // // // //     audioQueueRef.current = [];
// // // // // // // //   };
  
// // // // // // // //   // Start TTS playback
// // // // // // // //   const startPlayback = async () => {
// // // // // // // //     if (!ttsRef.current || isPlaying) return;
    
// // // // // // // //     try {
// // // // // // // //       setIsPlaying(true);
// // // // // // // //       setIsPaused(false);
// // // // // // // //       cleanupAudio();
// // // // // // // //       setErrorMessage('');
      
// // // // // // // //       console.log("Starting Kokoro TTS playback");
      
// // // // // // // //       // Create a new abort controller
// // // // // // // //       abortControllerRef.current = new AbortController();
// // // // // // // //       const signal = abortControllerRef.current.signal;
      
// // // // // // // //       // Create a new splitter and stream
// // // // // // // //       const splitter = new TextSplitterStream();
// // // // // // // //       splitterRef.current = splitter;
      
// // // // // // // //       // Set up the stream
// // // // // // // //       const stream = ttsRef.current.stream(splitter);
// // // // // // // //       streamRef.current = stream;
      
// // // // // // // //       // Process the stream
// // // // // // // //       (async () => {
// // // // // // // //         try {
// // // // // // // //           let fullText = '';
          
// // // // // // // //           for await (const chunk of stream) {
// // // // // // // //             // Check if we've been aborted
// // // // // // // //             if (signal.aborted) break;
            
// // // // // // // //             // Extract text and audio from the chunk
// // // // // // // //             const { text, audio } = chunk as { text: string; audio: any };
// // // // // // // //             console.log("Received chunk:", { text, hasAudio: !!audio });
            
// // // // // // // //             fullText += text;
// // // // // // // //             setCurrentText(fullText);
            
// // // // // // // //             if (!audio) {
// // // // // // // //               console.warn("No audio in chunk");
// // // // // // // //               continue;
// // // // // // // //             }
            
// // // // // // // //             // Check what methods are available on the audio object
// // // // // // // //             console.log("Audio object methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(audio)));
            
// // // // // // // //             try {
// // // // // // // //               // Handle Kokoro's audio format
// // // // // // // //               if (audio.toBlob && typeof audio.toBlob === 'function') {
// // // // // // // //                 console.log("Using toBlob method");
// // // // // // // //                 const blob = await audio.toBlob();
// // // // // // // //                 const audioData = await blob.arrayBuffer();
// // // // // // // //                 playAudioFromArrayBuffer(audioData);
// // // // // // // //               }
// // // // // // // //               else if (audio.toWav && typeof audio.toWav === 'function') {
// // // // // // // //                 console.log("Using toWav method");
// // // // // // // //                 const wavData = audio.toWav();
// // // // // // // //                 const blob = new Blob([wavData], { type: 'audio/wav' });
// // // // // // // //                 const audioData = await blob.arrayBuffer();
// // // // // // // //                 playAudioFromArrayBuffer(audioData);
// // // // // // // //               }
// // // // // // // //               else if (audio.audio && audio.sampling_rate) {
// // // // // // // //                 console.log("Using raw audio data");
// // // // // // // //                 playRawAudioData(audio.audio, audio.sampling_rate);
// // // // // // // //               }
// // // // // // // //               else {
// // // // // // // //                 console.error("Unrecognized audio format:", audio);
// // // // // // // //               }
// // // // // // // //             } catch (audioError) {
// // // // // // // //               console.error("Error processing audio chunk:", audioError);
// // // // // // // //             }
// // // // // // // //           }
// // // // // // // //         } catch (error: unknown) {
// // // // // // // //           if (!signal.aborted) {
// // // // // // // //             console.error('Error processing TTS stream:', error);
// // // // // // // //             const errorMsg = error instanceof Error ? error.message : 'Unknown error';
// // // // // // // //             setErrorMessage(`Error playing audio: ${errorMsg}`);
// // // // // // // //             setIsPlaying(false);
// // // // // // // //           }
// // // // // // // //         }
// // // // // // // //       })();
      
// // // // // // // //       // Feed the text to the stream
// // // // // // // //       const cleanText = preprocessText(currentPageContent);
// // // // // // // //       const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
      
// // // // // // // //       console.log(`Splitting text into ${sentences.length} sentences`);
      
// // // // // // // //       for (const sentence of sentences) {
// // // // // // // //         if (signal.aborted) break;
// // // // // // // //         splitter.push(sentence);
// // // // // // // //         console.log("Pushed sentence to stream:", sentence);
// // // // // // // //         await new Promise(resolve => setTimeout(resolve, 10));
// // // // // // // //       }
      
// // // // // // // //       // Close the stream
// // // // // // // //       console.log("Closing text splitter stream");
// // // // // // // //       splitter.close();
      
// // // // // // // //     } catch (error: unknown) {
// // // // // // // //       console.error('Error starting TTS playback:', error);
// // // // // // // //       const errorMsg = error instanceof Error ? error.message : 'Unknown error';
// // // // // // // //       setErrorMessage(`Failed to start audio: ${errorMsg}`);
// // // // // // // //       setIsPlaying(false);
// // // // // // // //     }
// // // // // // // //   };
  
// // // // // // // //   // Play audio from ArrayBuffer
// // // // // // // //   const playAudioFromArrayBuffer = async (audioData: ArrayBuffer) => {
// // // // // // // //     if (!audioContextRef.current) return;
    
// // // // // // // //     try {
// // // // // // // //       console.log("Decoding audio data");
// // // // // // // //       const audioBuffer = await audioContextRef.current.decodeAudioData(audioData);
      
// // // // // // // //       audioQueueRef.current.push(audioBuffer);
      
// // // // // // // //       // If this is the first audio chunk, start playing
// // // // // // // //       if (audioQueueRef.current.length === 1 && !currentAudioSourceRef.current) {
// // // // // // // //         playNextAudio();
// // // // // // // //       }
// // // // // // // //     } catch (error) {
// // // // // // // //       console.error("Error decoding audio data:", error);
// // // // // // // //     }
// // // // // // // //   };
  
// // // // // // // //   // Play raw audio data (Float32Array with sampling rate)
// // // // // // // //   const playRawAudioData = (audioData: Float32Array, sampleRate: number) => {
// // // // // // // //     if (!audioContextRef.current) return;
    
// // // // // // // //     try {
// // // // // // // //       console.log("Creating audio buffer from raw data");
      
// // // // // // // //       // Create an audio buffer
// // // // // // // //       const audioBuffer = audioContextRef.current.createBuffer(
// // // // // // // //         1, // mono
// // // // // // // //         audioData.length,
// // // // // // // //         sampleRate
// // // // // // // //       );
      
// // // // // // // //       // Copy the data to the audio buffer
// // // // // // // //       const channelData = audioBuffer.getChannelData(0);
// // // // // // // //       for (let i = 0; i < audioData.length; i++) {
// // // // // // // //         channelData[i] = audioData[i];
// // // // // // // //       }
      
// // // // // // // //       audioQueueRef.current.push(audioBuffer);
      
// // // // // // // //       // If this is the first audio chunk, start playing
// // // // // // // //       if (audioQueueRef.current.length === 1 && !currentAudioSourceRef.current) {
// // // // // // // //         playNextAudio();
// // // // // // // //       }
// // // // // // // //     } catch (error) {
// // // // // // // //       console.error("Error creating audio buffer:", error);
// // // // // // // //     }
// // // // // // // //   };
  
// // // // // // // //   // Preprocess text to improve TTS quality
// // // // // // // //   const preprocessText = (text: string): string => {
// // // // // // // //     // Remove excess whitespace
// // // // // // // //     let cleaned = text.replace(/\s+/g, ' ').trim();
    
// // // // // // // //     // Replace common abbreviations
// // // // // // // //     cleaned = cleaned.replace(/(\w)\.(\w)/g, '$1. $2'); // e.g., "Mr.Smith" -> "Mr. Smith"
    
// // // // // // // //     // Add periods to make sure we have complete sentences
// // // // // // // //     if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
// // // // // // // //       cleaned += '.';
// // // // // // // //     }
    
// // // // // // // //     return cleaned;
// // // // // // // //   };
  
// // // // // // // //   // Play the next audio chunk in the queue
// // // // // // // //   const playNextAudio = () => {
// // // // // // // //     if (!audioContextRef.current || audioQueueRef.current.length === 0 || isPaused) return;
    
// // // // // // // //     console.log("Playing next audio chunk");
    
// // // // // // // //     // Create a new audio source
// // // // // // // //     const source = audioContextRef.current.createBufferSource();
// // // // // // // //     source.buffer = audioQueueRef.current[0];
// // // // // // // //     source.playbackRate.value = playbackRate;
// // // // // // // //     source.connect(audioContextRef.current.destination);
    
// // // // // // // //     // Store the source so we can stop it if needed
// // // // // // // //     currentAudioSourceRef.current = source;
    
// // // // // // // //     // Remove this buffer from the queue
// // // // // // // //     audioQueueRef.current.shift();
    
// // // // // // // //     // When this audio chunk ends, play the next one
// // // // // // // //     source.onended = () => {
// // // // // // // //       console.log("Audio chunk ended");
// // // // // // // //       currentAudioSourceRef.current = null;
      
// // // // // // // //       if (audioQueueRef.current.length > 0) {
// // // // // // // //         playNextAudio();
// // // // // // // //       } else if (!splitterRef.current) {
// // // // // // // //         // If we're done and the splitter is closed, we're finished
// // // // // // // //         console.log("Playback complete");
// // // // // // // //         setIsPlaying(false);
// // // // // // // //       }
// // // // // // // //     };
    
// // // // // // // //     // Start playback
// // // // // // // //     source.start();
// // // // // // // //     console.log("Started audio source");
// // // // // // // //   };
  
// // // // // // // //   // Pause playback
// // // // // // // //   const pausePlayback = () => {
// // // // // // // //     setIsPaused(true);
    
// // // // // // // //     if (currentAudioSourceRef.current) {
// // // // // // // //       currentAudioSourceRef.current.stop();
// // // // // // // //       currentAudioSourceRef.current = null;
// // // // // // // //     }
// // // // // // // //   };
  
// // // // // // // //   // Resume playback
// // // // // // // //   const resumePlayback = () => {
// // // // // // // //     setIsPaused(false);
// // // // // // // //     playNextAudio();
// // // // // // // //   };
  
// // // // // // // //   // Stop playback
// // // // // // // //   const stopPlayback = () => {
// // // // // // // //     setIsPlaying(false);
// // // // // // // //     setIsPaused(false);
// // // // // // // //     setCurrentText('');
// // // // // // // //     cleanupAudio();
// // // // // // // //   };
  
// // // // // // // //   // Update playback rate
// // // // // // // //   const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
// // // // // // // //     const newRate = parseFloat(e.target.value);
// // // // // // // //     setPlaybackRate(newRate);
    
// // // // // // // //     // Update the rate of the current audio source if one is playing
// // // // // // // //     if (currentAudioSourceRef.current) {
// // // // // // // //       currentAudioSourceRef.current.playbackRate.value = newRate;
// // // // // // // //     }
// // // // // // // //   };
  
// // // // // // // //   // Handle component unmount
// // // // // // // //   useEffect(() => {
// // // // // // // //     return () => {
// // // // // // // //       cleanupAudio();
// // // // // // // //     };
// // // // // // // //   }, []);

// // // // // // // //   return (
// // // // // // // //     <div className="simple-play-mode">
// // // // // // // //       <div className="play-mode-content">
// // // // // // // //         <div className="play-mode-header">
// // // // // // // //           <h2>Kokoro Audio Player</h2>
// // // // // // // //           <button onClick={onClose} className="close-button">×</button>
// // // // // // // //         </div>
        
// // // // // // // //         {isLoading ? (
// // // // // // // //           <div className="loading-container">
// // // // // // // //             <div className="loading-progress">
// // // // // // // //               <div 
// // // // // // // //                 className="progress-bar" 
// // // // // // // //                 style={{ width: `${loadingProgress}%` }}
// // // // // // // //               ></div>
// // // // // // // //             </div>
// // // // // // // //             <p>Loading Kokoro TTS ({loadingProgress}%)...</p>
// // // // // // // //             <p className="loading-info">This may take a moment as the AI model is being loaded</p>
// // // // // // // //           </div>
// // // // // // // //         ) : errorMessage ? (
// // // // // // // //           <div className="error-container">
// // // // // // // //             <p className="error-message">{errorMessage}</p>
// // // // // // // //             <button onClick={onClose} className="error-close-button">Close</button>
// // // // // // // //           </div>
// // // // // // // //         ) : (
// // // // // // // //           <>
// // // // // // // //             <div className="control-group">
// // // // // // // //               <label htmlFor="rate-slider">Speed: {playbackRate.toFixed(1)}x</label>
// // // // // // // //               <input
// // // // // // // //                 type="range"
// // // // // // // //                 id="rate-slider"
// // // // // // // //                 min="0.5"
// // // // // // // //                 max="2"
// // // // // // // //                 step="0.1"
// // // // // // // //                 value={playbackRate}
// // // // // // // //                 onChange={handleRateChange}
// // // // // // // //               />
// // // // // // // //             </div>
            
// // // // // // // //             <div className="button-group">
// // // // // // // //               {!isPlaying ? (
// // // // // // // //                 <button 
// // // // // // // //                   onClick={startPlayback} 
// // // // // // // //                   className="play-button"
// // // // // // // //                   disabled={!modelLoaded}
// // // // // // // //                 >
// // // // // // // //                   {modelLoaded ? 'Start Reading' : 'Model Loading...'}
// // // // // // // //                 </button>
// // // // // // // //               ) : isPaused ? (
// // // // // // // //                 <button onClick={resumePlayback} className="play-button">Resume</button>
// // // // // // // //               ) : (
// // // // // // // //                 <div className="playing-controls">
// // // // // // // //                   <button onClick={pausePlayback} className="pause-button">Pause</button>
// // // // // // // //                   <button onClick={stopPlayback} className="stop-button">Stop</button>
// // // // // // // //                 </div>
// // // // // // // //               )}
// // // // // // // //             </div>
            
// // // // // // // //             <div className="play-mode-text">
// // // // // // // //               {isPlaying ? (
// // // // // // // //                 <p className="current-text">{currentText}</p>
// // // // // // // //               ) : (
// // // // // // // //                 <p className="content-preview">{currentPageContent.slice(0, 300)}...</p>
// // // // // // // //               )}
// // // // // // // //               <p className="instruction-text">
// // // // // // // //                 {isPlaying 
// // // // // // // //                   ? "Reading text using Kokoro TTS..." 
// // // // // // // //                   : modelLoaded 
// // // // // // // //                     ? "Click Start Reading to use Kokoro's AI voice" 
// // // // // // // //                     : "Please wait for the model to load..."}
// // // // // // // //               </p>
// // // // // // // //             </div>
// // // // // // // //           </>
// // // // // // // //         )}
// // // // // // // //       </div>
// // // // // // // //     </div>
// // // // // // // //   );
// // // // // // // // };

// // // // // // // // export default KokoroPlayMode;




// // // // // // // // src/components/Reader/KokoroPlayMode.tsx
// // // // // // // import React, { useState, useEffect, useRef } from 'react';
// // // // // // // import { KokoroTTS, TextSplitterStream } from 'kokoro-js';
// // // // // // // import './SimplePlayMode.css';

// // // // // // // interface KokoroPlayModeProps {
// // // // // // //   currentPageContent: string;
// // // // // // //   onClose: () => void;
// // // // // // // }

// // // // // // // const KokoroPlayMode: React.FC<KokoroPlayModeProps> = ({
// // // // // // //   currentPageContent,
// // // // // // //   onClose
// // // // // // // }) => {
// // // // // // //   const [isPlaying, setIsPlaying] = useState(false);
// // // // // // //   const [isPaused, setIsPaused] = useState(false);
// // // // // // //   const [isLoading, setIsLoading] = useState(false);
// // // // // // //   const [loadingProgress, setLoadingProgress] = useState(0);
// // // // // // //   const [currentText, setCurrentText] = useState('');
// // // // // // //   const [playbackRate, setPlaybackRate] = useState(1.0);
// // // // // // //   const [modelLoaded, setModelLoaded] = useState(false);
// // // // // // //   const [errorMessage, setErrorMessage] = useState('');
  
// // // // // // //   // Refs
// // // // // // //   const ttsRef = useRef<any>(null);
// // // // // // //   const splitterRef = useRef<TextSplitterStream | null>(null);
// // // // // // //   const streamRef = useRef<any>(null);
// // // // // // //   const audioContextRef = useRef<AudioContext | null>(null);
// // // // // // //   const audioQueueRef = useRef<AudioBuffer[]>([]);
// // // // // // //   const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
// // // // // // //   const abortControllerRef = useRef<AbortController | null>(null);
  
// // // // // // //   // Initialize Kokoro TTS
// // // // // // //   useEffect(() => {
// // // // // // //     const initTTS = async () => {
// // // // // // //       try {
// // // // // // //         setIsLoading(true);
// // // // // // //         setLoadingProgress(10);
// // // // // // //         console.log("Initializing Kokoro TTS...");
        
// // // // // // //         // Initialize the AudioContext
// // // // // // //         if (!audioContextRef.current) {
// // // // // // //           audioContextRef.current = new AudioContext();
// // // // // // //         }
        
// // // // // // //         // Initialize Kokoro TTS
// // // // // // //         const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
// // // // // // //         setLoadingProgress(30);
        
// // // // // // //         // Use the correct dtype based on device capability
// // // // // // //         const supportsWebGPU = 'gpu' in navigator;
// // // // // // //         console.log("WebGPU supported:", supportsWebGPU);
        
// // // // // // //         const tts = await KokoroTTS.from_pretrained(model_id, {
// // // // // // //           dtype: "q8", // Options: "fp32", "fp16", "q8", "q4", "q4f16"
// // // // // // //           device: supportsWebGPU ? "webgpu" : "wasm", // Use WebGPU if available
// // // // // // //           progress_callback: (progressInfo) => {
// // // // // // //             console.log("Loading progress:", progressInfo);
            
// // // // // // //             // Handle different progress info formats
// // // // // // //             let progressValue = 0;
// // // // // // //             if (typeof progressInfo === 'number') {
// // // // // // //               progressValue = progressInfo;
// // // // // // //             } else if (progressInfo && typeof progressInfo === 'object') {
// // // // // // //               if ('progress' in progressInfo) {
// // // // // // //                 progressValue = (progressInfo as any).progress;
// // // // // // //               } else if ('status' in progressInfo && (progressInfo as any).status === 'complete') {
// // // // // // //                 progressValue = 1;
// // // // // // //               } else if ('loaded' in progressInfo && 'total' in progressInfo) {
// // // // // // //                 progressValue = (progressInfo as any).loaded / (progressInfo as any).total;
// // // // // // //               }
// // // // // // //             }
              
// // // // // // //             setLoadingProgress(30 + Math.round(progressValue * 70));
// // // // // // //           }
// // // // // // //         });
        
// // // // // // //         console.log("Kokoro TTS model loaded successfully");
// // // // // // //         ttsRef.current = tts;
// // // // // // //         setLoadingProgress(100);
// // // // // // //         setIsLoading(false);
// // // // // // //         setModelLoaded(true);
// // // // // // //       } catch (error: unknown) {
// // // // // // //         console.error('Error initializing Kokoro TTS:', error);
// // // // // // //         const errorMsg = error instanceof Error ? error.message : 'Unknown error';
// // // // // // //         setErrorMessage(`Failed to initialize TTS: ${errorMsg}`);
// // // // // // //         setIsLoading(false);
// // // // // // //       }
// // // // // // //     };
    
// // // // // // //     initTTS();
    
// // // // // // //     // Cleanup
// // // // // // //     return () => {
// // // // // // //       cleanupAudio();
// // // // // // //       if (audioContextRef.current) {
// // // // // // //         audioContextRef.current.close().catch(err => console.error("Error closing audio context:", err));
// // // // // // //         audioContextRef.current = null;
// // // // // // //       }
// // // // // // //     };
// // // // // // //   }, []);
  
// // // // // // //   // Function to clean up audio playback
// // // // // // //   const cleanupAudio = () => {
// // // // // // //     console.log("Cleaning up audio");
    
// // // // // // //     // Stop the audio context - this should stop all audio immediately
// // // // // // //     if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
// // // // // // //       try {
// // // // // // //         // Suspend the audio context (stops audio processing)
// // // // // // //         audioContextRef.current.suspend().catch(err => 
// // // // // // //           console.error("Error suspending audio context:", err)
// // // // // // //         );
// // // // // // //       } catch (error) {
// // // // // // //         console.error("Error with audio context during cleanup:", error);
// // // // // // //       }
// // // // // // //     }
    
// // // // // // //     // Abort the stream processing
// // // // // // //     if (abortControllerRef.current) {
// // // // // // //       abortControllerRef.current.abort();
// // // // // // //       abortControllerRef.current = null;
// // // // // // //     }
    
// // // // // // //     // Stop and disconnect any current audio source
// // // // // // //     if (currentAudioSourceRef.current) {
// // // // // // //       try {
// // // // // // //         currentAudioSourceRef.current.stop();
// // // // // // //         currentAudioSourceRef.current.disconnect();
// // // // // // //       } catch (error) {
// // // // // // //         console.error("Error stopping audio source:", error);
// // // // // // //       }
// // // // // // //       currentAudioSourceRef.current = null;
// // // // // // //     }
    
// // // // // // //     // Close the text splitter
// // // // // // //     if (splitterRef.current) {
// // // // // // //       splitterRef.current.close();
// // // // // // //       splitterRef.current = null;
// // // // // // //     }
    
// // // // // // //     // Reset other refs and state
// // // // // // //     streamRef.current = null;
// // // // // // //     audioQueueRef.current = [];
    
// // // // // // //     console.log("Audio cleanup complete");
// // // // // // //   };
  
// // // // // // //   // Start TTS playback
// // // // // // //   const startPlayback = async () => {
// // // // // // //     if (!ttsRef.current || isPlaying) return;
    
// // // // // // //     try {
// // // // // // //       // If audio context was suspended, resume it
// // // // // // //       if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
// // // // // // //         await audioContextRef.current.resume();
// // // // // // //       }
      
// // // // // // //       setIsPlaying(true);
// // // // // // //       setIsPaused(false);
// // // // // // //       cleanupAudio();
// // // // // // //       setErrorMessage('');
      
// // // // // // //       console.log("Starting Kokoro TTS playback");
      
// // // // // // //       // Create a new abort controller
// // // // // // //       abortControllerRef.current = new AbortController();
// // // // // // //       const signal = abortControllerRef.current.signal;
      
// // // // // // //       // Create a new splitter and stream
// // // // // // //       const splitter = new TextSplitterStream();
// // // // // // //       splitterRef.current = splitter;
      
// // // // // // //       // Set up the stream
// // // // // // //       const stream = ttsRef.current.stream(splitter);
// // // // // // //       streamRef.current = stream;
      
// // // // // // //       // Process the stream
// // // // // // //       (async () => {
// // // // // // //         try {
// // // // // // //           let fullText = '';
          
// // // // // // //           for await (const chunk of stream) {
// // // // // // //             // Check if we've been aborted
// // // // // // //             if (signal.aborted) {
// // // // // // //               console.log("Stream processing aborted");
// // // // // // //               break;
// // // // // // //             }
            
// // // // // // //             // Extract text and audio from the chunk
// // // // // // //             const { text, audio } = chunk as { text: string; audio: any };
// // // // // // //             console.log("Received chunk:", { text, hasAudio: !!audio });
            
// // // // // // //             fullText += text;
// // // // // // //             setCurrentText(fullText);
            
// // // // // // //             if (!audio) {
// // // // // // //               console.warn("No audio in chunk");
// // // // // // //               continue;
// // // // // // //             }
            
// // // // // // //             // Check what methods are available on the audio object
// // // // // // //             console.log("Audio object methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(audio)));
            
// // // // // // //             try {
// // // // // // //               // Handle Kokoro's audio format
// // // // // // //               if (audio.toBlob && typeof audio.toBlob === 'function') {
// // // // // // //                 console.log("Using toBlob method");
// // // // // // //                 const blob = await audio.toBlob();
// // // // // // //                 const audioData = await blob.arrayBuffer();
// // // // // // //                 await playAudioFromArrayBuffer(audioData);
// // // // // // //               }
// // // // // // //               else if (audio.toWav && typeof audio.toWav === 'function') {
// // // // // // //                 console.log("Using toWav method");
// // // // // // //                 const wavData = audio.toWav();
// // // // // // //                 const blob = new Blob([wavData], { type: 'audio/wav' });
// // // // // // //                 const audioData = await blob.arrayBuffer();
// // // // // // //                 await playAudioFromArrayBuffer(audioData);
// // // // // // //               }
// // // // // // //               else if (audio.audio && audio.sampling_rate) {
// // // // // // //                 console.log("Using raw audio data");
// // // // // // //                 playRawAudioData(audio.audio, audio.sampling_rate);
// // // // // // //               }
// // // // // // //               else {
// // // // // // //                 console.error("Unrecognized audio format:", audio);
// // // // // // //               }
// // // // // // //             } catch (audioError) {
// // // // // // //               console.error("Error processing audio chunk:", audioError);
// // // // // // //             }
// // // // // // //           }
// // // // // // //         } catch (error: unknown) {
// // // // // // //           if (!signal.aborted) {
// // // // // // //             console.error('Error processing TTS stream:', error);
// // // // // // //             const errorMsg = error instanceof Error ? error.message : 'Unknown error';
// // // // // // //             setErrorMessage(`Error playing audio: ${errorMsg}`);
// // // // // // //             setIsPlaying(false);
// // // // // // //           }
// // // // // // //         }
// // // // // // //       })();
      
// // // // // // //       // Feed the text to the stream
// // // // // // //       const cleanText = preprocessText(currentPageContent);
// // // // // // //       const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
      
// // // // // // //       console.log(`Splitting text into ${sentences.length} sentences`);
      
// // // // // // //       for (const sentence of sentences) {
// // // // // // //         if (signal.aborted) break;
// // // // // // //         splitter.push(sentence);
// // // // // // //         console.log("Pushed sentence to stream:", sentence);
// // // // // // //         await new Promise(resolve => setTimeout(resolve, 10));
// // // // // // //       }
      
// // // // // // //       // Close the stream
// // // // // // //       console.log("Closing text splitter stream");
// // // // // // //       splitter.close();
      
// // // // // // //     } catch (error: unknown) {
// // // // // // //       console.error('Error starting TTS playback:', error);
// // // // // // //       const errorMsg = error instanceof Error ? error.message : 'Unknown error';
// // // // // // //       setErrorMessage(`Failed to start audio: ${errorMsg}`);
// // // // // // //       setIsPlaying(false);
// // // // // // //     }
// // // // // // //   };
  
// // // // // // //   // Play audio from ArrayBuffer
// // // // // // //   const playAudioFromArrayBuffer = async (audioData: ArrayBuffer) => {
// // // // // // //     if (!audioContextRef.current) return;
    
// // // // // // //     try {
// // // // // // //       console.log("Decoding audio data");
// // // // // // //       const audioBuffer = await audioContextRef.current.decodeAudioData(audioData);
      
// // // // // // //       audioQueueRef.current.push(audioBuffer);
      
// // // // // // //       // If this is the first audio chunk, start playing
// // // // // // //       if (audioQueueRef.current.length === 1 && !currentAudioSourceRef.current && !isPaused) {
// // // // // // //         playNextAudio();
// // // // // // //       }
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Error decoding audio data:", error);
// // // // // // //     }
// // // // // // //   };
  
// // // // // // //   // Play raw audio data (Float32Array with sampling rate)
// // // // // // //   const playRawAudioData = (audioData: Float32Array, sampleRate: number) => {
// // // // // // //     if (!audioContextRef.current) return;
    
// // // // // // //     try {
// // // // // // //       console.log("Creating audio buffer from raw data");
      
// // // // // // //       // Create an audio buffer
// // // // // // //       const audioBuffer = audioContextRef.current.createBuffer(
// // // // // // //         1, // mono
// // // // // // //         audioData.length,
// // // // // // //         sampleRate
// // // // // // //       );
      
// // // // // // //       // Copy the data to the audio buffer
// // // // // // //       const channelData = audioBuffer.getChannelData(0);
// // // // // // //       for (let i = 0; i < audioData.length; i++) {
// // // // // // //         channelData[i] = audioData[i];
// // // // // // //       }
      
// // // // // // //       audioQueueRef.current.push(audioBuffer);
      
// // // // // // //       // If this is the first audio chunk, start playing
// // // // // // //       if (audioQueueRef.current.length === 1 && !currentAudioSourceRef.current && !isPaused) {
// // // // // // //         playNextAudio();
// // // // // // //       }
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Error creating audio buffer:", error);
// // // // // // //     }
// // // // // // //   };
  
// // // // // // //   // Preprocess text to improve TTS quality
// // // // // // //   const preprocessText = (text: string): string => {
// // // // // // //     // Remove excess whitespace
// // // // // // //     let cleaned = text.replace(/\s+/g, ' ').trim();
    
// // // // // // //     // Replace common abbreviations
// // // // // // //     cleaned = cleaned.replace(/(\w)\.(\w)/g, '$1. $2'); // e.g., "Mr.Smith" -> "Mr. Smith"
    
// // // // // // //     // Add periods to make sure we have complete sentences
// // // // // // //     if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
// // // // // // //       cleaned += '.';
// // // // // // //     }
    
// // // // // // //     return cleaned;
// // // // // // //   };
  
// // // // // // //   // Play the next audio chunk in the queue
// // // // // // //   const playNextAudio = () => {
// // // // // // //     if (!audioContextRef.current || audioQueueRef.current.length === 0 || isPaused) return;
    
// // // // // // //     console.log("Playing next audio chunk");
    
// // // // // // //     // Create a new audio source
// // // // // // //     const source = audioContextRef.current.createBufferSource();
// // // // // // //     source.buffer = audioQueueRef.current[0];
// // // // // // //     source.playbackRate.value = playbackRate;
// // // // // // //     source.connect(audioContextRef.current.destination);
    
// // // // // // //     // Store the source so we can stop it if needed
// // // // // // //     currentAudioSourceRef.current = source;
    
// // // // // // //     // Remove this buffer from the queue
// // // // // // //     audioQueueRef.current.shift();
    
// // // // // // //     // When this audio chunk ends, play the next one
// // // // // // //     source.onended = () => {
// // // // // // //       console.log("Audio chunk ended");
// // // // // // //       currentAudioSourceRef.current = null;
      
// // // // // // //       if (audioQueueRef.current.length > 0 && !isPaused) {
// // // // // // //         playNextAudio();
// // // // // // //       } else if (!splitterRef.current) {
// // // // // // //         // If we're done and the splitter is closed, we're finished
// // // // // // //         console.log("Playback complete");
// // // // // // //         setIsPlaying(false);
// // // // // // //       }
// // // // // // //     };
    
// // // // // // //     // Start playback
// // // // // // //     source.start();
// // // // // // //     console.log("Started audio source");
// // // // // // //   };
  
// // // // // // //   // Pause playback
// // // // // // //   const pausePlayback = () => {
// // // // // // //     console.log("Pause requested");
// // // // // // //     setIsPaused(true);
    
// // // // // // //     // Immediately stop any playing audio
// // // // // // //     if (audioContextRef.current) {
// // // // // // //       console.log("Suspending audio context to pause");
// // // // // // //       audioContextRef.current.suspend().catch(err => 
// // // // // // //         console.error("Error suspending audio context:", err)
// // // // // // //       );
// // // // // // //     }
    
// // // // // // //     if (currentAudioSourceRef.current) {
// // // // // // //       try {
// // // // // // //         console.log("Stopping current audio source");
// // // // // // //         currentAudioSourceRef.current.stop();
// // // // // // //         currentAudioSourceRef.current.disconnect();
// // // // // // //         currentAudioSourceRef.current = null;
// // // // // // //       } catch (error) {
// // // // // // //         console.error("Error stopping audio source:", error);
// // // // // // //       }
// // // // // // //     }
// // // // // // //   };
  
// // // // // // //   // Resume playback
// // // // // // //   const resumePlayback = () => {
// // // // // // //     console.log("Resume requested");
// // // // // // //     setIsPaused(false);
    
// // // // // // //     // Resume audio context
// // // // // // //     if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
// // // // // // //       console.log("Resuming audio context");
// // // // // // //       audioContextRef.current.resume().then(() => {
// // // // // // //         // Start playing the next audio in the queue
// // // // // // //         if (audioQueueRef.current.length > 0) {
// // // // // // //           playNextAudio();
// // // // // // //         }
// // // // // // //       }).catch(err => console.error("Error resuming audio context:", err));
// // // // // // //     } else {
// // // // // // //       // Start playing the next audio in the queue
// // // // // // //       if (audioQueueRef.current.length > 0) {
// // // // // // //         playNextAudio();
// // // // // // //       }
// // // // // // //     }
// // // // // // //   };
  
// // // // // // //   // Stop playback
// // // // // // //   const stopPlayback = () => {
// // // // // // //     console.log("Stop requested");
// // // // // // //     setIsPlaying(false);
// // // // // // //     setIsPaused(false);
// // // // // // //     setCurrentText('');
    
// // // // // // //     // More aggressive audio cleanup
// // // // // // //     if (audioContextRef.current) {
// // // // // // //       console.log("Suspending audio context to stop");
// // // // // // //       audioContextRef.current.suspend().catch(err => 
// // // // // // //         console.error("Error suspending audio context:", err)
// // // // // // //       );
// // // // // // //     }
    
// // // // // // //     cleanupAudio();
// // // // // // //   };
  
// // // // // // //   // Update playback rate
// // // // // // //   const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
// // // // // // //     const newRate = parseFloat(e.target.value);
// // // // // // //     setPlaybackRate(newRate);
    
// // // // // // //     // Update the rate of the current audio source if one is playing
// // // // // // //     if (currentAudioSourceRef.current) {
// // // // // // //       currentAudioSourceRef.current.playbackRate.value = newRate;
// // // // // // //     }
// // // // // // //   };
  
// // // // // // //   // Handle proper cleanup when closed
// // // // // // //   const handleClose = () => {
// // // // // // //     console.log("PlayMode closing");
    
// // // // // // //     // First stop all audio
// // // // // // //     stopPlayback();
    
// // // // // // //     // Ensure audio context is closed properly
// // // // // // //     if (audioContextRef.current) {
// // // // // // //       if (audioContextRef.current.state !== 'closed') {
// // // // // // //         audioContextRef.current.close().catch(err => 
// // // // // // //           console.error("Error closing audio context:", err)
// // // // // // //         );
// // // // // // //       }
// // // // // // //       audioContextRef.current = null;
// // // // // // //     }
    
// // // // // // //     // Now call the parent's onClose
// // // // // // //     onClose();
// // // // // // //   };
  
// // // // // // //   // Handle component unmount
// // // // // // //   useEffect(() => {
// // // // // // //     return () => {
// // // // // // //       console.log("Component unmounting");
// // // // // // //       stopPlayback();
      
// // // // // // //       if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
// // // // // // //         audioContextRef.current.close().catch(err => 
// // // // // // //           console.error("Error closing audio context:", err)
// // // // // // //         );
// // // // // // //         audioContextRef.current = null;
// // // // // // //       }
// // // // // // //     };
// // // // // // //   }, []);

// // // // // // //   return (
// // // // // // //     <div className="simple-play-mode">
// // // // // // //       <div className="play-mode-content">
// // // // // // //         <div className="play-mode-header">
// // // // // // //           <h2>Kokoro Audio Player</h2>
// // // // // // //           <button onClick={handleClose} className="close-button">×</button>
// // // // // // //         </div>
        
// // // // // // //         {isLoading ? (
// // // // // // //           <div className="loading-container">
// // // // // // //             <div className="loading-progress">
// // // // // // //               <div 
// // // // // // //                 className="progress-bar" 
// // // // // // //                 style={{ width: `${loadingProgress}%` }}
// // // // // // //               ></div>
// // // // // // //             </div>
// // // // // // //             <p>Loading Kokoro TTS ({loadingProgress}%)...</p>
// // // // // // //             <p className="loading-info">This may take a moment as the AI model is being loaded</p>
// // // // // // //           </div>
// // // // // // //         ) : errorMessage ? (
// // // // // // //           <div className="error-container">
// // // // // // //             <p className="error-message">{errorMessage}</p>
// // // // // // //             <button onClick={handleClose} className="error-close-button">Close</button>
// // // // // // //           </div>
// // // // // // //         ) : (
// // // // // // //           <>
// // // // // // //             <div className="control-group">
// // // // // // //               <label htmlFor="rate-slider">Speed: {playbackRate.toFixed(1)}x</label>
// // // // // // //               <input
// // // // // // //                 type="range"
// // // // // // //                 id="rate-slider"
// // // // // // //                 min="0.5"
// // // // // // //                 max="2"
// // // // // // //                 step="0.1"
// // // // // // //                 value={playbackRate}
// // // // // // //                 onChange={handleRateChange}
// // // // // // //               />
// // // // // // //             </div>
            
// // // // // // //             <div className="button-group">
// // // // // // //               {!isPlaying ? (
// // // // // // //                 <button 
// // // // // // //                   onClick={startPlayback} 
// // // // // // //                   className="play-button"
// // // // // // //                   disabled={!modelLoaded}
// // // // // // //                 >
// // // // // // //                   {modelLoaded ? 'Start Reading' : 'Model Loading...'}
// // // // // // //                 </button>
// // // // // // //               ) : isPaused ? (
// // // // // // //                 <button onClick={resumePlayback} className="play-button">Resume</button>
// // // // // // //               ) : (
// // // // // // //                 <div className="playing-controls">
// // // // // // //                   <button onClick={pausePlayback} className="pause-button">Pause</button>
// // // // // // //                   <button onClick={stopPlayback} className="stop-button">Stop</button>
// // // // // // //                 </div>
// // // // // // //               )}
// // // // // // //             </div>
            
// // // // // // //             <div className="play-mode-text">
// // // // // // //               {isPlaying ? (
// // // // // // //                 <p className="current-text">{currentText}</p>
// // // // // // //               ) : (
// // // // // // //                 <p className="content-preview">{currentPageContent.slice(0, 300)}...</p>
// // // // // // //               )}
// // // // // // //               <p className="instruction-text">
// // // // // // //                 {isPlaying 
// // // // // // //                   ? "Reading text using Kokoro TTS..." 
// // // // // // //                   : modelLoaded 
// // // // // // //                     ? "Click Start Reading to use Kokoro's AI voice" 
// // // // // // //                     : "Please wait for the model to load..."}
// // // // // // //               </p>
// // // // // // //             </div>
// // // // // // //           </>
// // // // // // //         )}
// // // // // // //       </div>
// // // // // // //     </div>
// // // // // // //   );
// // // // // // // };

// // // // // // // export default KokoroPlayMode;


// // // // // import React, { useState, useEffect, useRef } from 'react';
// // // // // import { KokoroTTSService } from '../../services/KokoroTTSService';
// // // // // import './SimplePlayMode.css';

// // // // // interface KokoroPlayModeProps {
// // // // //   currentPageContent: string;
// // // // //   onClose: () => void;
// // // // // }

// // // // // const KokoroPlayMode: React.FC<KokoroPlayModeProps> = ({
// // // // //   currentPageContent,
// // // // //   onClose
// // // // // }) => {
// // // // //   // State
// // // // //   const [isPlaying, setIsPlaying] = useState(false);
// // // // //   const [isPaused, setIsPaused] = useState(false);
// // // // //   const [isLoading, setIsLoading] = useState(false);
// // // // //   const [loadingProgress, setLoadingProgress] = useState(0);
// // // // //   const [currentText, setCurrentText] = useState('');
// // // // //   const [playbackRate, setPlaybackRate] = useState(1.0);
// // // // //   const [modelLoaded, setModelLoaded] = useState(false);
// // // // //   const [errorMessage, setErrorMessage] = useState('');
// // // // //   const [showPlayMode, setShowPlayMode] = useState(false);
// // // // //   const audioContextRef = useRef<AudioContext | null>(null);
  
// // // // //   // TTS Service ref
// // // // //   const ttsServiceRef = useRef<KokoroTTSService | null>(null);
  
// // // // //   // Initialize TTS service
// // // // //   useEffect(() => {
// // // // //     // Create TTS service instance
// // // // //     const ttsService = new KokoroTTSService();
// // // // //     ttsServiceRef.current = ttsService;
    
// // // // //     // Initialize the service
// // // // //     const initTTS = async () => {
// // // // //       try {
// // // // //         setIsLoading(true);
        
// // // // //         // Set callbacks
// // // // //         ttsService.setCallbacks(
// // // // //           // Text update callback
// // // // //           (text: string) => setCurrentText(text),
// // // // //           // Error callback
// // // // //           (error: string) => {
// // // // //             setErrorMessage(error);
// // // // //             setIsPlaying(false);
// // // // //           },
// // // // //           // Completion callback
// // // // //           () => setIsPlaying(false)
// // // // //         );
        
// // // // //         // Initialize the service
// // // // //         await ttsService.initialize(
// // // // //           // Progress callback
// // // // //           (progress: number) => setLoadingProgress(progress)
// // // // //         );


// // // // //         // // Store the audio context if exposed by your TTS service
// // // // //         // if (ttsService.audioContext) {
// // // // //         //   audioContextRef.current = ttsService.audioContext;
// // // // //         // }
        
// // // // //         setIsLoading(false);
// // // // //         setModelLoaded(true);
// // // // //       } catch (error) {
// // // // //         console.error('Error initializing TTS service:', error);
// // // // //         setErrorMessage('Failed to initialize TTS service');
// // // // //         setIsLoading(false);
// // // // //       }
// // // // //     };
    
// // // // //     initTTS();
    
// // // // //     // Cleanup
// // // // //     // Cleanup
// // // // //     return () => {
// // // // //         // This cleanup now happens in handleClose, but as a fallback:
// // // // //         if (ttsServiceRef.current) {
// // // // //           ttsServiceRef.current.dispose();
// // // // //           ttsServiceRef.current = null;
// // // // //         }
        
// // // // //         if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
// // // // //           audioContextRef.current.close().catch(err => 
// // // // //             console.error("Error closing audio context:", err)
// // // // //           );
// // // // //           audioContextRef.current = null;
// // // // //         }
// // // // //       };
// // // // //     }, []);
  
// // // // //   // Start TTS playback
// // // // //   const startPlayback = async () => {
// // // // //     if (!ttsServiceRef.current || isPlaying) return;
    
// // // // //     try {
// // // // //       setIsPlaying(true);
// // // // //       setIsPaused(false);
// // // // //       setErrorMessage('');
      
// // // // //       // Start playback
// // // // //       await ttsServiceRef.current.playText(currentPageContent);
// // // // //     } catch (error) {
// // // // //       console.error('Error starting playback:', error);
// // // // //       setIsPlaying(false);
// // // // //       setErrorMessage('Failed to start playback');
// // // // //     }
// // // // //   };
  
// // // // //   // Pause playback
// // // // //   const pausePlayback = () => {
// // // // //     if (!ttsServiceRef.current) return;
    
// // // // //     setIsPaused(true);
// // // // //     ttsServiceRef.current.pause();
// // // // //   };

// // // // //     // Handle proper cleanup when closed
// // // // //     // Modify your handleClose function
// // // // //     // Handle proper cleanup when closed
// // // // //   // const handleClose = () => {
// // // // //   //     console.log("PlayMode closing");
      
// // // // //   //     // First stop all audio
// // // // //   //     stopPlayback();
      
// // // // //   //     // Ensure TTS service is properly disposed
// // // // //   //     if (ttsServiceRef.current) {
// // // // //   //       ttsServiceRef.current.dispose();
// // // // //   //       ttsServiceRef.current = null;
// // // // //   //     }
      
// // // // //   //     // Now call the parent's onClose
// // // // //   //     onClose();
// // // // //   // };
  

// // // // //   // Handle proper cleanup when closed
// // // // //   const handleClose = () => {
// // // // //     console.log("PlayMode closing");
    
// // // // //     try {
// // // // //       // First stop all audio
// // // // //       if (ttsServiceRef.current) {
// // // // //         // Stop playback if playing
// // // // //         if (isPlaying) {
// // // // //           stopPlayback();
// // // // //         }
        
// // // // //         // Ensure TTS service is properly disposed
// // // // //         ttsServiceRef.current.dispose();
// // // // //         ttsServiceRef.current = null;
// // // // //       }
// // // // //     } catch (error) {
// // // // //       console.error("Error during cleanup:", error);
// // // // //     } finally {
// // // // //       // Always call the parent's onClose, even if there's an error
// // // // //       console.log("Calling parent onClose function");
// // // // //       onClose();
// // // // //     }
// // // // //   };

// // // // //   // Handle component unmount
// // // // //   useEffect(() => {
// // // // //     return () => {
// // // // //       console.log("Component unmounting");
      
// // // // //       // Same cleanup as handleClose
// // // // //       stopPlayback();
      
// // // // //       if (ttsServiceRef.current) {
// // // // //         ttsServiceRef.current.dispose();
// // // // //         ttsServiceRef.current = null;
// // // // //       }
// // // // //     };
// // // // //   }, []);


// // // // //   // Resume playback
// // // // //   const resumePlayback = () => {
// // // // //     if (!ttsServiceRef.current) return;
    
// // // // //     setIsPaused(false);
// // // // //     ttsServiceRef.current.resume();
// // // // //   };
  
// // // // //   // Stop playback
// // // // //   const stopPlayback = () => {
// // // // //     if (!ttsServiceRef.current) return;
    
// // // // //     setIsPlaying(false);
// // // // //     setIsPaused(false);
// // // // //     setCurrentText('');
// // // // //     ttsServiceRef.current.stop();
// // // // //   };
  
// // // // //   // Update playback rate
// // // // //   const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
// // // // //     if (!ttsServiceRef.current) return;
    
// // // // //     const newRate = parseFloat(e.target.value);
// // // // //     setPlaybackRate(newRate);
// // // // //     ttsServiceRef.current.setPlaybackRate(newRate);
// // // // //   };

// // // // //   return (
// // // // //     <div className="simple-play-mode">
// // // // //       <div className="play-mode-content">
// // // // //         <div className="play-mode-header">
// // // // //           <h2>Kokoro Audio Player</h2>
// // // // //           <button onClick={handleClose} className="close-button">×</button>
// // // // //         </div>
        
// // // // //         {isLoading ? (
// // // // //           <div className="loading-container">
// // // // //             <div className="loading-progress">
// // // // //               <div 
// // // // //                 className="progress-bar" 
// // // // //                 style={{ width: `${loadingProgress}%` }}
// // // // //               ></div>
// // // // //             </div>
// // // // //             <p>Loading Kokoro TTS ({loadingProgress}%)...</p>
// // // // //             <p className="loading-info">This may take a moment as the AI model is being loaded</p>
// // // // //           </div>
// // // // //         ) : errorMessage ? (
// // // // //           <div className="error-container">
// // // // //             <p className="error-message">{errorMessage}</p>
// // // // //             <button onClick={handleClose} className="error-close-button">Close</button>
// // // // //           </div>
// // // // //         ) : (
// // // // //           <>
// // // // //             <div className="control-group">
// // // // //               <label htmlFor="rate-slider">Speed: {playbackRate.toFixed(1)}x</label>
// // // // //               <input
// // // // //                 type="range"
// // // // //                 id="rate-slider"
// // // // //                 min="0.5"
// // // // //                 max="2"
// // // // //                 step="0.1"
// // // // //                 value={playbackRate}
// // // // //                 onChange={handleRateChange}
// // // // //               />
// // // // //             </div>
            
// // // // //             <div className="button-group">
// // // // //               {!isPlaying ? (
// // // // //                 <button 
// // // // //                   onClick={startPlayback} 
// // // // //                   className="play-button"
// // // // //                   disabled={!modelLoaded}
// // // // //                 >
// // // // //                   {modelLoaded ? 'Start Reading' : 'Model Loading...'}
// // // // //                 </button>
// // // // //               ) : isPaused ? (
// // // // //                 <button onClick={resumePlayback} className="play-button">Resume</button>
// // // // //               ) : (
// // // // //                 <div className="playing-controls">
// // // // //                   <button onClick={pausePlayback} className="pause-button">Pause</button>
// // // // //                   <button onClick={stopPlayback} className="stop-button">Stop</button>
// // // // //                 </div>
// // // // //               )}
// // // // //             </div>

            
// // // // //             <div className="play-mode-text">
// // // // //               {isPlaying ? (
// // // // //                 <p className="current-text">{currentText}</p>
// // // // //               ) : (
// // // // //                 <p className="content-preview">{currentPageContent.slice(0, 300)}...</p>
// // // // //               )}
// // // // //               <p className="instruction-text">
// // // // //                 {isPlaying 
// // // // //                   ? "Reading text using Kokoro TTS..." 
// // // // //                   : modelLoaded 
// // // // //                     ? "Click Start Reading to use Kokoro's AI voice" 
// // // // //                     : "Please wait for the model to load..."}
// // // // //               </p>
// // // // //             </div>
// // // // //           </>
// // // // //         )}
// // // // //       </div>
// // // // //     </div>
// // // // //   );
// // // // // };

// // // // // export default KokoroPlayMode;



// // // // import React, { useState, useEffect, useRef } from 'react';
// // // // import { KokoroTTSService } from '../../services/KokoroTTSService';
// // // // import './SimplePlayMode.css';

// // // // interface KokoroPlayModeProps {
// // // //   currentPageContent: string;
// // // //   onClose: () => void;
// // // // }

// // // // const KokoroPlayMode: React.FC<KokoroPlayModeProps> = ({
// // // //   currentPageContent,
// // // //   onClose
// // // // }) => {
// // // //   // State
// // // //   const [isPlaying, setIsPlaying] = useState(false);
// // // //   const [isPaused, setIsPaused] = useState(false);
// // // //   const [isLoading, setIsLoading] = useState(false);
// // // //   const [loadingProgress, setLoadingProgress] = useState(0);
// // // //   const [currentText, setCurrentText] = useState('');
// // // //   const [playbackRate, setPlaybackRate] = useState(1.0);
// // // //   const [modelLoaded, setModelLoaded] = useState(false);
// // // //   const [errorMessage, setErrorMessage] = useState('');
// // // //   const [estimatedTime, setEstimatedTime] = useState(10);
// // // //   const [playbackFinished, setPlaybackFinished] = useState(false);
// // // //   const [segments, setSegments] = useState<string[]>([]);
// // // //   const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
// // // //   const [allChunksProcessed, setAllChunksProcessed] = useState(false);
  
// // // //   // Refs
// // // //   const ttsServiceRef = useRef<KokoroTTSService | null>(null);
// // // //   const textContainerRef = useRef<HTMLDivElement>(null);
  
// // // //   // Split text into segments on initialization
// // // //   useEffect(() => {
// // // //     // Simple sentence splitting (you can make this more sophisticated)
// // // //     const splitText = currentPageContent.match(/[^.!?]+[.!?]+/g) || [currentPageContent];
// // // //     setSegments(splitText);
// // // //   }, [currentPageContent]);
  
// // // //   // Initialize TTS service
// // // //   useEffect(() => {
// // // //     // Create TTS service instance
// // // //     const ttsService = new KokoroTTSService();
// // // //     ttsServiceRef.current = ttsService;
    
// // // //     // Initialize the service
// // // //     const initTTS = async () => {
// // // //       try {
// // // //         setIsLoading(true);
        
// // // //         // Set callbacks
// // // //         ttsService.setCallbacks(
// // // //           // Text update callback
// // // //           (text: string) => {
// // // //             setCurrentText(text);
// // // //             // Scroll text container to show current text
// // // //             if (textContainerRef.current) {
// // // //               textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
// // // //             }
// // // //           },
// // // //           // Error callback
// // // //           (error: string) => {
// // // //             setErrorMessage(error);
// // // //             setIsPlaying(false);
// // // //           },
// // // //           // Completion callback
// // // //           () => {
// // // //             setIsPlaying(false);
// // // //             setPlaybackFinished(true);
// // // //           }
// // // //         );
        
// // // //         // Initialize the service
// // // //         await ttsService.initialize(
// // // //           // Progress callback
// // // //           (progress: number) => {
// // // //             setLoadingProgress(progress);
// // // //             // Update estimated time based on progress
// // // //             const remainingTime = Math.ceil((100 - progress) / 10); // Simple estimate
// // // //             setEstimatedTime(remainingTime);
// // // //           }
// // // //         );
        
// // // //         setIsLoading(false);
// // // //         setModelLoaded(true);
// // // //       } catch (error) {
// // // //         console.error('Error initializing TTS service:', error);
// // // //         setErrorMessage('Failed to initialize TTS service');
// // // //         setIsLoading(false);
// // // //       }
// // // //     };
    
// // // //     initTTS();
    
// // // //     // Cleanup
// // // //     return () => {
// // // //       cleanupPlayback();
// // // //     };
// // // //   }, []);
  
// // // //   // Handle proper cleanup
// // // //   const cleanupPlayback = () => {
// // // //     console.log("Cleaning up playback");
    
// // // //     try {
// // // //       // Stop playback if active
// // // //       if (isPlaying) {
// // // //         stopPlayback();
// // // //       }
      
// // // //       // Dispose of TTS service
// // // //       if (ttsServiceRef.current) {
// // // //         ttsServiceRef.current.dispose();
// // // //         ttsServiceRef.current = null;
// // // //       }
// // // //     } catch (error) {
// // // //       console.error("Error during cleanup:", error);
// // // //     }
// // // //   };
  
// // // //   // Handle close
// // // //   const handleClose = () => {
// // // //     console.log("PlayMode closing");
    
// // // //     try {
// // // //       cleanupPlayback();
// // // //     } catch (error) {
// // // //       console.error("Error during close:", error);
// // // //     } finally {
// // // //       // Always call parent's onClose
// // // //       onClose();
// // // //     }
// // // //   };
  
// // // //   // Start TTS playback
// // // //   const startPlayback = async (fromSegment = 0) => {
// // // //     if (!ttsServiceRef.current || (isPlaying && !isPaused)) return;
    
// // // //     try {
// // // //       setIsPlaying(true);
// // // //       setIsPaused(false);
// // // //       setErrorMessage('');
// // // //       setPlaybackFinished(false);
// // // //       setCurrentSegmentIndex(fromSegment);
      
// // // //       // Get text starting from the specified segment
// // // //       const textToPlay = segments.slice(fromSegment).join(' ');
      
// // // //       // Start playback
// // // //       await ttsServiceRef.current.playText(textToPlay);
// // // //       setAllChunksProcessed(true);
// // // //     } catch (error) {
// // // //       console.error('Error starting playback:', error);
// // // //       setIsPlaying(false);
// // // //       setErrorMessage('Failed to start playback');
// // // //     }
// // // //   };
  
// // // //   // Pause playback
// // // //   const pausePlayback = () => {
// // // //     if (!ttsServiceRef.current) return;
    
// // // //     setIsPaused(true);
// // // //     ttsServiceRef.current.pause();
// // // //   };
  
// // // //   // Resume playback
// // // //   const resumePlayback = () => {
// // // //     if (!ttsServiceRef.current) return;
    
// // // //     setIsPaused(false);
// // // //     ttsServiceRef.current.resume();
// // // //   };
  
// // // //   // Stop playback
// // // //   const stopPlayback = () => {
// // // //     if (!ttsServiceRef.current) return;
    
// // // //     try {
// // // //       setIsPlaying(false);
// // // //       setIsPaused(false);
// // // //       setCurrentText('');
// // // //       ttsServiceRef.current.stop();
// // // //     } catch (error) {
// // // //       console.error("Error stopping playback:", error);
// // // //     }
// // // //   };
  
// // // //   // Navigate forward
// // // //   const handleForward = () => {
// // // //     if (currentSegmentIndex < segments.length - 1) {
// // // //       stopPlayback();
// // // //       startPlayback(currentSegmentIndex + 1);
// // // //     }
// // // //   };
  
// // // //   // Navigate backward
// // // //   const handleBackward = () => {
// // // //     if (currentSegmentIndex > 0) {
// // // //       stopPlayback();
// // // //       startPlayback(currentSegmentIndex - 1);
// // // //     }
// // // //   };
  
// // // //   // Update playback rate
// // // //   const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
// // // //     if (!ttsServiceRef.current) return;
    
// // // //     const newRate = parseFloat(e.target.value);
// // // //     setPlaybackRate(newRate);
// // // //     ttsServiceRef.current.setPlaybackRate(newRate);
// // // //   };
  
// // // //   // Handlers for UI controls
// // // //   const handlePlay = () => {
// // // //     if (isPaused) {
// // // //       resumePlayback();
// // // //     } else {
// // // //       startPlayback(currentSegmentIndex);
// // // //     }
// // // //   };
  
// // // //   const handlePause = () => {
// // // //     pausePlayback();
// // // //   };
  
// // // //   const handleStop = () => {
// // // //     stopPlayback();
// // // //     setCurrentSegmentIndex(0);
// // // //   };
  
// // // //   // Text to display in the reader
// // // //   const textToDisplay = isPlaying ? currentText || segments[currentSegmentIndex] || '' : 
// // // //                                    currentPageContent.slice(0, 300) + '...';

// // // //   return (
// // // //     <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-50">
// // // //       <div
// // // //         className={`
// // // //           relative bg-white text-gray-900 rounded-lg shadow-lg transition-all duration-300 overflow-hidden 
// // // //           ${!isPlaying
// // // //             ? "w-[300px] h-[400px] sm:w-[650px] sm:max-h-[85%] sm:p-6"
// // // //             : "w-full h-full sm:max-w-[800px] sm:h-[85%]"}
// // // //         `}
// // // //       >
// // // //         {/* Always-visible Close Icon */}
// // // //         <button
// // // //           className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 z-50 focus:outline-none"
// // // //           onClick={handleClose}
// // // //           aria-label="Close"
// // // //         >
// // // //           ×
// // // //         </button>

// // // //         {playbackFinished && (
// // // //           <div className="flex items-center justify-center p-4 bg-yellow-100 text-yellow-800">
// // // //             Playback finished. Click "Stop" or "Close" to exit.
// // // //           </div>
// // // //         )}

// // // //         {errorMessage ? (
// // // //           <div className="flex flex-col items-center justify-center h-full">
// // // //             <p className="mt-4 text-base sm:text-lg font-medium text-red-600">
// // // //               {errorMessage}
// // // //             </p>
// // // //             <button 
// // // //               onClick={handleClose}
// // // //               className="mt-4 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md"
// // // //             >
// // // //               Close
// // // //             </button>
// // // //           </div>
// // // //         ) : isLoading ? (
// // // //           <div className="flex flex-col items-center justify-center h-full">
// // // //             <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 mb-4">
// // // //               <div className="bg-gray-700 h-2.5 rounded-full" style={{ width: `${loadingProgress}%` }}></div>
// // // //             </div>
// // // //             <p className="mt-4 text-base sm:text-lg font-medium">
// // // //               Your audio will start in approximately {estimatedTime} seconds...
// // // //             </p>
// // // //           </div>
// // // //         ) : !isPlaying ? (
// // // //           <div className="flex flex-col items-center justify-center gap-4 relative h-full">
// // // //             <h2 className="text-xl sm:text-2xl font-bold mb-4">Kokoro Audio Player</h2>
// // // //             <button
// // // //               onClick={handlePlay}
// // // //               className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // //               disabled={!modelLoaded}
// // // //             >
// // // //               {modelLoaded ? 'Start Audiobook' : 'Model Loading...'}
// // // //             </button>
            
// // // //             <div className="mt-8 px-4">
// // // //               <label htmlFor="rate-slider" className="block text-sm font-medium text-gray-700 mb-1">
// // // //                 Speed: {playbackRate.toFixed(1)}x
// // // //               </label>
// // // //               <input
// // // //                 type="range"
// // // //                 id="rate-slider"
// // // //                 min="0.5"
// // // //                 max="2"
// // // //                 step="0.1"
// // // //                 value={playbackRate}
// // // //                 onChange={handleRateChange}
// // // //                 className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
// // // //               />
// // // //             </div>
            
// // // //             <div className="mt-8 max-h-48 overflow-y-auto p-4 border border-gray-200 rounded bg-gray-50 w-full max-w-md">
// // // //               <p className="text-sm text-gray-700">
// // // //                 {currentPageContent.slice(0, 300)}...
// // // //               </p>
// // // //             </div>
// // // //           </div>
// // // //         ) : (
// // // //           <div
// // // //             className="relative w-full h-full bg-[#f8f5e6] p-4 sm:p-8 overflow-y-auto"
// // // //             ref={textContainerRef}
// // // //           >
// // // //             <p className="text-base sm:text-2xl leading-relaxed font-serif">
// // // //               {textToDisplay}
// // // //             </p>
// // // //           </div>
// // // //         )}

// // // //         {isPlaying && !errorMessage && (
// // // //           <div className="absolute bottom-4 left-0 right-0 flex justify-center flex-wrap gap-4">
// // // //             <button
// // // //               onClick={handleBackward}
// // // //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // //               disabled={currentSegmentIndex <= 0}
// // // //             >
// // // //               ← Back
// // // //             </button>
            
// // // //             {isPaused ? (
// // // //               <button
// // // //                 onClick={handlePlay}
// // // //                 className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // //               >
// // // //                 ▶ Resume
// // // //               </button>
// // // //             ) : (
// // // //               <button
// // // //                 onClick={handlePause}
// // // //                 className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // //               >
// // // //                 ⏸ Pause
// // // //               </button>
// // // //             )}
            
// // // //             <button
// // // //               onClick={handleForward}
// // // //               disabled={!allChunksProcessed && currentSegmentIndex >= segments.length - 1}
// // // //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // //             >
// // // //               Forward →
// // // //             </button>
            
// // // //             <button
// // // //               onClick={handleStop}
// // // //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // //             >
// // // //               ⏹ Stop
// // // //             </button>
// // // //           </div>
// // // //         )}
        
// // // //         {isPlaying && (
// // // //           <div className="absolute top-4 right-12">
// // // //             <div className="flex items-center">
// // // //               <label htmlFor="playback-rate" className="mr-2 text-sm font-medium text-gray-700">
// // // //                 Speed:
// // // //               </label>
// // // //               <select
// // // //                 id="playback-rate"
// // // //                 value={playbackRate}
// // // //                 onChange={(e) => {
// // // //                   const newRate = parseFloat(e.target.value);
// // // //                   setPlaybackRate(newRate);
// // // //                   if (ttsServiceRef.current) {
// // // //                     ttsServiceRef.current.setPlaybackRate(newRate);
// // // //                   }
// // // //                 }}
// // // //                 className="form-select rounded border-gray-300 text-sm"
// // // //               >
// // // //                 <option value="0.5">0.5x</option>
// // // //                 <option value="0.75">0.75x</option>
// // // //                 <option value="1">1x</option>
// // // //                 <option value="1.25">1.25x</option>
// // // //                 <option value="1.5">1.5x</option>
// // // //                 <option value="1.75">1.75x</option>
// // // //                 <option value="2">2x</option>
// // // //               </select>
// // // //             </div>
// // // //           </div>
// // // //         )}
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // };

// // // // export default KokoroPlayMode;



// // // import React, { useState, useEffect, useRef } from 'react';
// // // import { KokoroTTSService } from '../../services/KokoroTTSService';
// // // import './SimplePlayMode.css';

// // // interface KokoroPlayModeProps {
// // //   currentPageContent: string;
// // //   onClose: () => void;
// // // }

// // // // Interface for text chunks
// // // interface TextChunk {
// // //   id: number;
// // //   text: string;
// // //   isProcessed: boolean;
// // //   isPlaying: boolean;
// // // }

// // // const KokoroPlayMode: React.FC<KokoroPlayModeProps> = ({
// // //   currentPageContent,
// // //   onClose
// // // }) => {
// // //   // State
// // //   const [isPlaying, setIsPlaying] = useState(false);
// // //   const [isPaused, setIsPaused] = useState(false);
// // //   const [isLoading, setIsLoading] = useState(false);
// // //   const [loadingProgress, setLoadingProgress] = useState(0);
// // //   const [currentText, setCurrentText] = useState('');
// // //   const [playbackRate, setPlaybackRate] = useState(1.0);
// // //   const [modelLoaded, setModelLoaded] = useState(false);
// // //   const [errorMessage, setErrorMessage] = useState('');
// // //   const [estimatedTime, setEstimatedTime] = useState(10);
// // //   const [playbackFinished, setPlaybackFinished] = useState(false);
  
// // //   // Text chunk management
// // //   const [textChunks, setTextChunks] = useState<TextChunk[]>([]);
// // //   const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
// // //   const [displayedText, setDisplayedText] = useState('');
  
// // //   // Refs
// // //   const ttsServiceRef = useRef<KokoroTTSService | null>(null);
// // //   const textContainerRef = useRef<HTMLDivElement>(null);
  
// // //   // Split text into chunks on initialization
// // //   useEffect(() => {
// // //     // Split text into roughly 200 character chunks
// // //     const chunkSize = 200;
// // //     const words = currentPageContent.split(' ');
// // //     const chunks: TextChunk[] = [];
    
// // //     let currentChunk = '';
// // //     let chunkId = 0;
    
// // //     for (const word of words) {
// // //       if ((currentChunk + ' ' + word).length <= chunkSize) {
// // //         currentChunk += (currentChunk ? ' ' : '') + word;
// // //       } else {
// // //         chunks.push({
// // //           id: chunkId++,
// // //           text: currentChunk,
// // //           isProcessed: false,
// // //           isPlaying: false
// // //         });
// // //         currentChunk = word;
// // //       }
// // //     }
    
// // //     // Add the last chunk if it's not empty
// // //     if (currentChunk) {
// // //       chunks.push({
// // //         id: chunkId,
// // //         text: currentChunk,
// // //         isProcessed: false,
// // //         isPlaying: false
// // //       });
// // //     }
    
// // //     setTextChunks(chunks);
// // //   }, [currentPageContent]);
  
// // //   // Update displayed text when chunks or current chunk changes
// // //   useEffect(() => {
// // //     if (textChunks.length === 0) return;
    
// // //     // Combine all processed chunks and the current one
// // //     const processedChunks = textChunks
// // //       .filter((chunk, index) => index < currentChunkIndex || (index === currentChunkIndex && isPlaying))
// // //       .map(chunk => chunk.text);
    
// // //     setDisplayedText(processedChunks.join(' '));
    
// // //     // Auto-scroll to bottom of text container
// // //     if (textContainerRef.current && isPlaying) {
// // //       textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
// // //     }
// // //   }, [textChunks, currentChunkIndex, isPlaying]);
  
// // //   // Initialize TTS service
// // //   useEffect(() => {
// // //     // Create TTS service instance
// // //     const ttsService = new KokoroTTSService();
// // //     ttsServiceRef.current = ttsService;
    
// // //     // Initialize the service
// // //     const initTTS = async () => {
// // //       try {
// // //         setIsLoading(true);
        
// // //         // Set callbacks
// // //         ttsService.setCallbacks(
// // //           // Text update callback - update current text as TTS processes it
// // //           (text: string) => {
// // //             setCurrentText(text);
            
// // //             // Find which chunk this text belongs to
// // //             const chunkIndex = findChunkForText(text);
// // //             if (chunkIndex !== -1 && chunkIndex !== currentChunkIndex) {
// // //               // Mark previous chunks as processed
// // //               updateChunkStatus(chunkIndex);
// // //               setCurrentChunkIndex(chunkIndex);
// // //             }
// // //           },
// // //           // Error callback
// // //           (error: string) => {
// // //             setErrorMessage(error);
// // //             setIsPlaying(false);
// // //           },
// // //           // Completion callback
// // //           () => {
// // //             setIsPlaying(false);
// // //             setPlaybackFinished(true);
// // //             // Mark all chunks as processed
// // //             const updatedChunks = textChunks.map(chunk => ({
// // //               ...chunk,
// // //               isProcessed: true,
// // //               isPlaying: false
// // //             }));
// // //             setTextChunks(updatedChunks);
// // //           }
// // //         );
        
// // //         // Initialize the service
// // //         await ttsService.initialize(
// // //           // Progress callback
// // //           (progress: number) => {
// // //             setLoadingProgress(progress);
// // //             // Update estimated time based on progress
// // //             const remainingTime = Math.ceil((100 - progress) / 10);
// // //             setEstimatedTime(remainingTime);
// // //           }
// // //         );
        
// // //         setIsLoading(false);
// // //         setModelLoaded(true);
// // //       } catch (error) {
// // //         console.error('Error initializing TTS service:', error);
// // //         setErrorMessage('Failed to initialize TTS service');
// // //         setIsLoading(false);
// // //       }
// // //     };
    
// // //     initTTS();
    
// // //     // Cleanup
// // //     return () => {
// // //       cleanupPlayback();
// // //     };
// // //   }, []);
  
// // //   // Find which chunk contains the given text
// // //   const findChunkForText = (text: string): number => {
// // //     // This is a simplistic approach - in a real implementation, you might need
// // //     // more sophisticated text matching
// // //     for (let i = 0; i < textChunks.length; i++) {
// // //       if (textChunks[i].text.includes(text.substring(0, 20))) {
// // //         return i;
// // //       }
// // //     }
// // //     return -1;
// // //   };
  
// // //   // Update the status of chunks up to the given index
// // //   const updateChunkStatus = (currentIndex: number) => {
// // //     const updatedChunks = textChunks.map((chunk, index) => ({
// // //       ...chunk,
// // //       isProcessed: index < currentIndex,
// // //       isPlaying: index === currentIndex
// // //     }));
// // //     setTextChunks(updatedChunks);
// // //   };
  
// // //   // Handle proper cleanup
// // //   const cleanupPlayback = () => {
// // //     console.log("Cleaning up playback");
    
// // //     try {
// // //       // Stop playback if active
// // //       if (isPlaying) {
// // //         stopPlayback();
// // //       }
      
// // //       // Dispose of TTS service
// // //       if (ttsServiceRef.current) {
// // //         try {
// // //           ttsServiceRef.current.dispose();
// // //         } catch (error) {
// // //           console.warn("Error disposing TTS service:", error);
// // //         }
// // //         ttsServiceRef.current = null;
// // //       }
// // //     } catch (error) {
// // //       console.error("Error during cleanup:", error);
// // //     }
// // //   };
  
// // //   // Handle close
// // //   const handleClose = () => {
// // //     console.log("PlayMode closing");
    
// // //     try {
// // //       cleanupPlayback();
// // //     } catch (error) {
// // //       console.error("Error during close:", error);
// // //     } finally {
// // //       // Always call parent's onClose
// // //       onClose();
// // //     }
// // //   };
  
// // //   // Start TTS playback
// // //   const startPlayback = async (fromChunkIndex = 0) => {
// // //     if (!ttsServiceRef.current || (isPlaying && !isPaused)) return;
    
// // //     try {
// // //       setIsPlaying(true);
// // //       setIsPaused(false);
// // //       setErrorMessage('');
// // //       setPlaybackFinished(false);
// // //       setCurrentChunkIndex(fromChunkIndex);
      
// // //       // Get text from the specified chunk onward
// // //       const textToPlay = textChunks
// // //         .slice(fromChunkIndex)
// // //         .map(chunk => chunk.text)
// // //         .join(' ');
      
// // //       // Reset chunk status
// // //       const updatedChunks = textChunks.map((chunk, index) => ({
// // //         ...chunk,
// // //         isProcessed: index < fromChunkIndex,
// // //         isPlaying: index === fromChunkIndex
// // //       }));
// // //       setTextChunks(updatedChunks);
      
// // //       // Start playback
// // //       await ttsServiceRef.current.playText(textToPlay);
// // //     } catch (error) {
// // //       console.error('Error starting playback:', error);
// // //       setIsPlaying(false);
// // //       setErrorMessage('Failed to start playback');
// // //     }
// // //   };
  
// // //   // Pause playback
// // //   const pausePlayback = () => {
// // //     if (!ttsServiceRef.current) return;
    
// // //     setIsPaused(true);
    
// // //     // Update the current chunk to not be playing
// // //     const updatedChunks = [...textChunks];
// // //     if (currentChunkIndex < updatedChunks.length) {
// // //       updatedChunks[currentChunkIndex] = {
// // //         ...updatedChunks[currentChunkIndex],
// // //         isPlaying: false
// // //       };
// // //       setTextChunks(updatedChunks);
// // //     }
    
// // //     ttsServiceRef.current.pause();
// // //   };
  
// // //   // Resume playback
// // //   const resumePlayback = () => {
// // //     if (!ttsServiceRef.current) return;
    
// // //     setIsPaused(false);
    
// // //     // Update the current chunk to be playing
// // //     const updatedChunks = [...textChunks];
// // //     if (currentChunkIndex < updatedChunks.length) {
// // //       updatedChunks[currentChunkIndex] = {
// // //         ...updatedChunks[currentChunkIndex],
// // //         isPlaying: true
// // //       };
// // //       setTextChunks(updatedChunks);
// // //     }
    
// // //     ttsServiceRef.current.resume();
// // //   };
  
// // //   // Stop playback
// // //   const stopPlayback = () => {
// // //     if (!ttsServiceRef.current) return;
    
// // //     try {
// // //       setIsPlaying(false);
// // //       setIsPaused(false);
// // //       setCurrentText('');
// // //       setCurrentChunkIndex(0);
      
// // //       // Reset all chunks
// // //       const updatedChunks = textChunks.map(chunk => ({
// // //         ...chunk,
// // //         isProcessed: false,
// // //         isPlaying: false
// // //       }));
// // //       setTextChunks(updatedChunks);
// // //       setDisplayedText('');
      
// // //       ttsServiceRef.current.stop();
// // //     } catch (error) {
// // //       console.error("Error stopping playback:", error);
// // //     }
// // //   };
  
// // //   // Navigate forward
// // //   const handleForward = () => {
// // //     if (currentChunkIndex < textChunks.length - 1) {
// // //       stopPlayback();
// // //       startPlayback(currentChunkIndex + 1);
// // //     }
// // //   };
  
// // //   // Navigate backward
// // //   const handleBackward = () => {
// // //     if (currentChunkIndex > 0) {
// // //       stopPlayback();
// // //       startPlayback(currentChunkIndex - 1);
// // //     }
// // //   };
  
// // //   // Update playback rate
// // //   const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
// // //     if (!ttsServiceRef.current) return;
    
// // //     const newRate = parseFloat(e.target.value);
// // //     setPlaybackRate(newRate);
// // //     ttsServiceRef.current.setPlaybackRate(newRate);
// // //   };
  
// // //   // Handlers for UI controls
// // //   const handlePlay = () => {
// // //     if (isPaused) {
// // //       resumePlayback();
// // //     } else {
// // //       startPlayback(currentChunkIndex);
// // //     }
// // //   };
  
// // //   const handlePause = () => {
// // //     pausePlayback();
// // //   };
  
// // //   const handleStop = () => {
// // //     stopPlayback();
// // //   };

// // //   return (
// // //     <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-50">
// // //       <div
// // //         className={`
// // //           relative bg-white text-gray-900 rounded-lg shadow-lg transition-all duration-300 overflow-hidden 
// // //           ${!isPlaying
// // //             ? "w-[300px] h-[400px] sm:w-[650px] sm:max-h-[85%] sm:p-6"
// // //             : "w-full h-full sm:max-w-[800px] sm:h-[85%]"}
// // //         `}
// // //       >
// // //         {/* Always-visible Close Icon */}
// // //         <button
// // //           className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 z-50 focus:outline-none"
// // //           onClick={handleClose}
// // //           aria-label="Close"
// // //         >
// // //           ×
// // //         </button>

// // //         {playbackFinished && (
// // //           <div className="flex items-center justify-center p-4 bg-yellow-100 text-yellow-800">
// // //             Playback finished. Click "Stop" or "Close" to exit.
// // //           </div>
// // //         )}

// // //         {errorMessage ? (
// // //           <div className="flex flex-col items-center justify-center h-full">
// // //             <p className="mt-4 text-base sm:text-lg font-medium text-red-600">
// // //               {errorMessage}
// // //             </p>
// // //             <button 
// // //               onClick={handleClose}
// // //               className="mt-4 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md"
// // //             >
// // //               Close
// // //             </button>
// // //           </div>
// // //         ) : isLoading ? (
// // //           <div className="flex flex-col items-center justify-center h-full">
// // //             <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 mb-4">
// // //               <div className="bg-gray-700 h-2.5 rounded-full" style={{ width: `${loadingProgress}%` }}></div>
// // //             </div>
// // //             <p className="mt-4 text-base sm:text-lg font-medium">
// // //               Your audio will start in approximately {estimatedTime} seconds...
// // //             </p>
// // //           </div>
// // //         ) : !isPlaying ? (
// // //           <div className="flex flex-col items-center justify-center gap-4 relative h-full">
// // //             <h2 className="text-xl sm:text-2xl font-bold mb-4">Kokoro Audio Player</h2>
// // //             <button
// // //               onClick={handlePlay}
// // //               className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // //               disabled={!modelLoaded}
// // //             >
// // //               {modelLoaded ? 'Start Audiobook' : 'Model Loading...'}
// // //             </button>
            
// // //             <div className="mt-8 px-4">
// // //               <label htmlFor="rate-slider" className="block text-sm font-medium text-gray-700 mb-1">
// // //                 Speed: {playbackRate.toFixed(1)}x
// // //               </label>
// // //               <input
// // //                 type="range"
// // //                 id="rate-slider"
// // //                 min="0.5"
// // //                 max="2"
// // //                 step="0.1"
// // //                 value={playbackRate}
// // //                 onChange={handleRateChange}
// // //                 className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
// // //               />
// // //             </div>
            
// // //             <div className="mt-8 max-h-48 overflow-y-auto p-4 border border-gray-200 rounded bg-gray-50 w-full max-w-md">
// // //               <p className="text-sm text-gray-700">
// // //                 {textChunks.length > 0 ? textChunks[0].text + '...' : 'Loading text...'}
// // //               </p>
// // //             </div>
// // //           </div>
// // //         ) : (
// // //           <div
// // //             className="relative w-full h-full bg-[#f8f5e6] p-4 sm:p-8 overflow-y-auto"
// // //             ref={textContainerRef}
// // //           >
// // //             <p className="text-base sm:text-2xl leading-relaxed font-serif">
// // //               {displayedText}
// // //               {isPaused ? '' : 
// // //                 <span className="inline-block animate-pulse">|</span>
// // //               }
// // //             </p>
// // //           </div>
// // //         )}

// // //         {isPlaying && !errorMessage && (
// // //           <div className="absolute bottom-4 left-0 right-0 flex justify-center flex-wrap gap-4">
// // //             <button
// // //               onClick={handleBackward}
// // //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none disabled:opacity-50"
// // //               disabled={currentChunkIndex <= 0}
// // //             >
// // //               ← Back
// // //             </button>
            
// // //             {isPaused ? (
// // //               <button
// // //                 onClick={handlePlay}
// // //                 className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // //               >
// // //                 ▶ Resume
// // //               </button>
// // //             ) : (
// // //               <button
// // //                 onClick={handlePause}
// // //                 className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // //               >
// // //                 ⏸ Pause
// // //               </button>
// // //             )}
            
// // //             <button
// // //               onClick={handleForward}
// // //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none disabled:opacity-50"
// // //               disabled={currentChunkIndex >= textChunks.length - 1}
// // //             >
// // //               Forward →
// // //             </button>
            
// // //             <button
// // //               onClick={handleStop}
// // //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // //             >
// // //               ⏹ Stop
// // //             </button>
// // //           </div>
// // //         )}
        
// // //         {isPlaying && (
// // //           <div className="absolute top-4 right-12">
// // //             <div className="flex items-center">
// // //               <span className="mr-2 text-sm font-medium text-gray-700">
// // //                 Chunk: {currentChunkIndex + 1}/{textChunks.length}
// // //               </span>
// // //               <select
// // //                 value={playbackRate}
// // //                 onChange={(e) => {
// // //                   const newRate = parseFloat(e.target.value);
// // //                   setPlaybackRate(newRate);
// // //                   if (ttsServiceRef.current) {
// // //                     ttsServiceRef.current.setPlaybackRate(newRate);
// // //                   }
// // //                 }}
// // //                 className="form-select rounded border-gray-300 text-sm"
// // //               >
// // //                 <option value="0.5">0.5x</option>
// // //                 <option value="0.75">0.75x</option>
// // //                 <option value="1">1x</option>
// // //                 <option value="1.25">1.25x</option>
// // //                 <option value="1.5">1.5x</option>
// // //                 <option value="1.75">1.75x</option>
// // //                 <option value="2">2x</option>
// // //               </select>
// // //             </div>
// // //           </div>
// // //         )}
// // //       </div>
// // //     </div>
// // //   );
// // // };

// // // export default KokoroPlayMode;



// // // KokoroPlayMode.tsx
// // import React, { useState, useEffect, useRef } from 'react';
// // import { KokoroTTSService } from '../../services/KokoroTTSService';
// // import { TextProcessingService } from '../../services/TextProcessingService';
// // import { TextChunk } from '../../types/TextProcessingTypes';
// // import './SimplePlayMode.css';

// // interface KokoroPlayModeProps {
// //   currentPageContent: string;
// //   onClose: () => void;
// // }

// // const KokoroPlayMode: React.FC<KokoroPlayModeProps> = ({
// //   currentPageContent,
// //   onClose
// // }) => {
// //   // State
// //   const [isPlaying, setIsPlaying] = useState(false);
// //   const [isPaused, setIsPaused] = useState(false);
// //   const [isLoading, setIsLoading] = useState(false);
// //   const [loadingProgress, setLoadingProgress] = useState(0);
// //   const [playbackRate, setPlaybackRate] = useState(1.0);
// //   const [modelLoaded, setModelLoaded] = useState(false);
// //   const [errorMessage, setErrorMessage] = useState('');
// //   const [estimatedTime, setEstimatedTime] = useState(10);
// //   const [playbackFinished, setPlaybackFinished] = useState(false);
  
// //   // Text chunk management
// //   const [textChunks, setTextChunks] = useState<TextChunk[]>([]);
// //   const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
// //   const [displayedText, setDisplayedText] = useState('');
  
// //   // Refs
// //   const ttsServiceRef = useRef<KokoroTTSService | null>(null);
// //   const textProcessingRef = useRef<TextProcessingService | null>(null);
// //   const textContainerRef = useRef<HTMLDivElement>(null);
  
// //   // Initialize services
// //   useEffect(() => {
// //     // Create text processing service
// //     const textProcessingService = new TextProcessingService();
// //     textProcessingRef.current = textProcessingService;
    
// //     // Process the initial text
// //     const initialChunks = textProcessingService.processText(currentPageContent);
// //     setTextChunks(initialChunks);
    
// //     // Create TTS service
// //     const ttsService = new KokoroTTSService();
// //     ttsServiceRef.current = ttsService;
    
// //     // Initialize the TTS service
// //     const initTTS = async () => {
// //       try {
// //         setIsLoading(true);
        
// //         // Set TTS callbacks
// //         // TTS callback in initTTS
// //         ttsService.setCallbacks(
// //           // Text update callback - directly use the text that comes with the audio
// //           (text: string) => {
// //             console.log("TTS text update:", text.substring(0, 30) + "...");
// //             console.log("Current text length:", textProcessingRef.current?.getProcessedText().length || 0);
            
// //             if (textProcessingRef.current) {
// //               // Handle the new text chunk
// //               textProcessingRef.current.handleTTSChunk(text);
              
// //               // Get the updated chunk index
// //               const currentIndex = textProcessingRef.current.getCurrentChunkIndex();
// //               setCurrentChunkIndex(currentIndex);
              
// //               // Update chunks state
// //               const updatedChunks = textProcessingRef.current.updateChunkStatus(currentIndex, true);
// //               setTextChunks(updatedChunks);
              
// //               // Only update displayed text if not paused
// //               if (!isPaused) {
// //                 const newText = textProcessingRef.current.getProcessedText();
// //                 console.log("Setting displayed text, length:", newText.length);
// //                 setDisplayedText(newText);
                
// //                 // Auto-scroll
// //                 if (textContainerRef.current) {
// //                   textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
// //                 }
// //               }
// //             }
// //           },
// //   // ... rest of callbacks remain the same
// //           // Error callback
// //           (error: string) => {
// //             setErrorMessage(error);
// //             setIsPlaying(false);
// //           },
// //           // Completion callback
// //           () => {
// //             setIsPlaying(false);
// //             setPlaybackFinished(true);
            
// //             // Mark all chunks as processed
// //             if (textProcessingRef.current) {
// //               const updatedChunks = textProcessingRef.current.markAllChunksAsProcessed();
// //               setTextChunks(updatedChunks);
              
// //               // Update displayed text with complete text
// //               setDisplayedText(textProcessingRef.current.getProcessedText());
// //             }
// //           }
// //         );
        
// //         // Initialize the service
// //         await ttsService.initialize(
// //           // Progress callback
// //           (progress: number) => {
// //             setLoadingProgress(progress);
// //             // Update estimated time
// //             const remainingTime = Math.ceil((100 - progress) / 10);
// //             setEstimatedTime(remainingTime);
// //           }
// //         );
        
// //         setIsLoading(false);
// //         setModelLoaded(true);
// //       } catch (error) {
// //         console.error('Error initializing TTS service:', error);
// //         setErrorMessage('Failed to initialize TTS service');
// //         setIsLoading(false);
// //       }
// //     };
    
// //     initTTS();
    
// //     // Cleanup
// //     return () => {
// //       cleanupPlayback();
// //     };
// //   }, [currentPageContent]);
  
// //   // Update displayed text when pause state changes
// //   // Update displayed text when pause state changes
// //   useEffect(() => {
// //     if (textProcessingRef.current && isPlaying) {
// //       // When paused, we keep the current text
// //       // When unpaused, we update with the latest processed text
// //       if (!isPaused) {
// //         setDisplayedText(textProcessingRef.current.getProcessedText());
        
// //         // Auto-scroll when text updates
// //         if (textContainerRef.current) {
// //           textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
// //         }
// //       }
// //     }
// //   }, [isPaused, isPlaying]);
  
// //   // Handle proper cleanup
// //   const cleanupPlayback = () => {
// //     console.log("Cleaning up playback");
    
// //     try {
// //       // Stop playback if active
// //       if (isPlaying) {
// //         stopPlayback();
// //       }
      
// //       // Dispose of TTS service
// //       if (ttsServiceRef.current) {
// //         try {
// //           ttsServiceRef.current.dispose();
// //         } catch (error) {
// //           console.warn("Error disposing TTS service:", error);
// //         }
// //         ttsServiceRef.current = null;
// //       }
// //     } catch (error) {
// //       console.error("Error during cleanup:", error);
// //     }
// //   };
  
// //   // Handle close
// //   const handleClose = () => {
// //     console.log("PlayMode closing");
    
// //     try {
// //       cleanupPlayback();
// //     } catch (error) {
// //       console.error("Error during close:", error);
// //     } finally {
// //       // Always call parent's onClose
// //       onClose();
// //     }
// //   };
  
// //   // Start TTS playback
// //   // Start TTS playback
// //   const startPlayback = async (fromChunkIndex = 0) => {
// //     if (!ttsServiceRef.current || !textProcessingRef.current || (isPlaying && !isPaused)) return;
    
// //     try {
// //       setIsPlaying(true);
// //       setIsPaused(false);
// //       setErrorMessage('');
// //       setPlaybackFinished(false);
// //       setCurrentChunkIndex(fromChunkIndex);
      
// //       // Reset chunk status
// //       const updatedChunks = textProcessingRef.current.updateChunkStatus(fromChunkIndex, true);
// //       setTextChunks(updatedChunks);
      
// //       // Reset processed text up to the starting chunk
// //       textProcessingRef.current.resetProcessedText(fromChunkIndex);
      
// //       // Get text starting from the specified chunk
// //       const textToPlay = textProcessingRef.current.getTextFromChunk(fromChunkIndex);
      
// //       // Update displayed text to initial state
// //       setDisplayedText(textProcessingRef.current.getProcessedText());
      
// //       // Start playback
// //       await ttsServiceRef.current.playText(textToPlay);
// //     } catch (error) {
// //       console.error('Error starting playback:', error);
// //       setIsPlaying(false);
// //       setErrorMessage('Failed to start playback');
// //     }
// //   };
  
// //   // Pause playback
// //   const pausePlayback = () => {
// //     if (!ttsServiceRef.current || !textProcessingRef.current) return;
    
// //     setIsPaused(true);
    
// //     // Update the current chunk to not be playing
// //     const updatedChunks = textProcessingRef.current.updateChunkStatus(currentChunkIndex, false);
// //     setTextChunks(updatedChunks);
    
// //     // Keep the text as is when paused
// //     // We don't need to update displayed text
    
// //     ttsServiceRef.current.pause();
// //   };

// //   // Resume playback
// //   const resumePlayback = () => {
// //     if (!ttsServiceRef.current || !textProcessingRef.current) return;
    
// //     setIsPaused(false);
    
// //     // Update the current chunk to be playing
// //     const updatedChunks = textProcessingRef.current.updateChunkStatus(currentChunkIndex, true);
// //     setTextChunks(updatedChunks);
    
// //     // Text will continue updating as new chunks come in
    
// //     ttsServiceRef.current.resume();
// //   };
  
// //   // Stop playback
// //   const stopPlayback = () => {
// //     if (!ttsServiceRef.current || !textProcessingRef.current) return;
    
// //     try {
// //       setIsPlaying(false);
// //       setIsPaused(false);
// //       setCurrentChunkIndex(0);
      
// //       // Reset all chunks
// //       const updatedChunks = textProcessingRef.current.resetChunks();
// //       setTextChunks(updatedChunks);
// //       setDisplayedText('');
      
// //       ttsServiceRef.current.stop();
// //     } catch (error) {
// //       console.error("Error stopping playback:", error);
// //     }
// //   };
  
// //   // Navigate forward
// //   const handleForward = () => {
// //     if (textProcessingRef.current && currentChunkIndex < textProcessingRef.current.getChunkCount() - 1) {
// //       stopPlayback();
// //       startPlayback(currentChunkIndex + 1);
// //     }
// //   };
  
// //   // Navigate backward
// //   const handleBackward = () => {
// //     if (currentChunkIndex > 0) {
// //       stopPlayback();
// //       startPlayback(currentChunkIndex - 1);
// //     }
// //   };
  
// //   // Update playback rate
// //   const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
// //     if (!ttsServiceRef.current) return;
    
// //     const newRate = parseFloat(e.target.value);
// //     setPlaybackRate(newRate);
// //     ttsServiceRef.current.setPlaybackRate(newRate);
// //   };
  
// //   // Handlers for UI controls
// //   const handlePlay = () => {
// //     if (isPaused) {
// //       resumePlayback();
// //     } else {
// //       startPlayback(currentChunkIndex);
// //     }
// //   };
  
// //   const handlePause = () => {
// //     pausePlayback();
// //   };
  
// //   const handleStop = () => {
// //     stopPlayback();
// //   };

// //   return (
// //     <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-50">
// //       <div
// //         className={`
// //           relative bg-white text-gray-900 rounded-lg shadow-lg transition-all duration-300 overflow-hidden 
// //           ${!isPlaying
// //             ? "w-[300px] h-[400px] sm:w-[650px] sm:max-h-[85%] sm:p-6"
// //             : "w-full h-full sm:max-w-[800px] sm:h-[85%]"}
// //         `}
// //       >
// //         {/* Always-visible Close Icon */}
// //         <button
// //           className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 z-50 focus:outline-none"
// //           onClick={handleClose}
// //           aria-label="Close"
// //         >
// //           ×
// //         </button>

// //         {playbackFinished && (
// //           <div className="flex items-center justify-center p-4 bg-yellow-100 text-yellow-800">
// //             Playback finished. Click "Stop" or "Close" to exit.
// //           </div>
// //         )}

// //         {errorMessage ? (
// //           <div className="flex flex-col items-center justify-center h-full">
// //             <p className="mt-4 text-base sm:text-lg font-medium text-red-600">
// //               {errorMessage}
// //             </p>
// //             <button 
// //               onClick={handleClose}
// //               className="mt-4 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md"
// //             >
// //               Close
// //             </button>
// //           </div>
// //         ) : isLoading ? (
// //           <div className="flex flex-col items-center justify-center h-full">
// //             <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 mb-4">
// //               <div className="bg-gray-700 h-2.5 rounded-full" style={{ width: `${loadingProgress}%` }}></div>
// //             </div>
// //             <p className="mt-4 text-base sm:text-lg font-medium">
// //               Your audio will start in approximately {estimatedTime} seconds...
// //             </p>
// //           </div>
// //         ) : !isPlaying ? (
// //           <div className="flex flex-col items-center justify-center gap-4 relative h-full">
// //             <h2 className="text-xl sm:text-2xl font-bold mb-4">Kokoro Audio Player</h2>
// //             <button
// //               onClick={handlePlay}
// //               className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// //               disabled={!modelLoaded}
// //             >
// //               {modelLoaded ? 'Start Audiobook' : 'Model Loading...'}
// //             </button>
            
// //             <div className="mt-8 px-4">
// //               <label htmlFor="rate-slider" className="block text-sm font-medium text-gray-700 mb-1">
// //                 Speed: {playbackRate.toFixed(1)}x
// //               </label>
// //               <input
// //                 type="range"
// //                 id="rate-slider"
// //                 min="0.5"
// //                 max="2"
// //                 step="0.1"
// //                 value={playbackRate}
// //                 onChange={handleRateChange}
// //                 className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
// //               />
// //             </div>
            
// //             <div className="mt-8 max-h-48 overflow-y-auto p-4 border border-gray-200 rounded bg-gray-50 w-full max-w-md">
// //               <p className="text-sm text-gray-700">
// //                 {textChunks.length > 0 ? textChunks[0].text + '...' : 'Loading text...'}
// //               </p>
// //             </div>
// //           </div>
// //         ) : (
// //           <div
// //             className="relative w-full h-full bg-[#f8f5e6] p-4 sm:p-8 overflow-y-auto"
// //             ref={textContainerRef}
// //           >
// //             <p className="text-base sm:text-2xl leading-relaxed font-serif">
// //               {displayedText}
// //               {isPaused ? '' : 
// //                 <span className="inline-block animate-pulse">|</span>
// //               }
// //             </p>
// //           </div>
// //         )}

// //         {isPlaying && !errorMessage && (
// //           <div className="absolute bottom-4 left-0 right-0 flex justify-center flex-wrap gap-4">
// //             <button
// //               onClick={handleBackward}
// //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none disabled:opacity-50"
// //               disabled={currentChunkIndex <= 0}
// //             >
// //               ← Back
// //             </button>
            
// //             {isPaused ? (
// //               <button
// //                 onClick={handlePlay}
// //                 className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// //               >
// //                 ▶ Resume
// //               </button>
// //             ) : (
// //               <button
// //                 onClick={handlePause}
// //                 className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// //               >
// //                 ⏸ Pause
// //               </button>
// //             )}
            
// //             <button
// //               onClick={handleForward}
// //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none disabled:opacity-50"
// //               disabled={textProcessingRef.current ? 
// //                 currentChunkIndex >= textProcessingRef.current.getChunkCount() - 1 : true}
// //             >
// //               Forward →
// //             </button>
            
// //             <button
// //               onClick={handleStop}
// //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// //             >
// //               ⏹ Stop
// //             </button>
// //           </div>
// //         )}
        
// //         {isPlaying && (
// //           <div className="absolute top-4 right-12">
// //             <div className="flex items-center">
// //               <span className="mr-2 text-sm font-medium text-gray-700">
// //                 Chunk: {currentChunkIndex + 1}/{textProcessingRef.current?.getChunkCount() || 0}
// //               </span>
// //               <select
// //               value={playbackRate.toString()}
// //               onChange={(e) => {
// //                 const newRate = parseFloat(e.target.value);
// //                 setPlaybackRate(newRate);
// //                 if (ttsServiceRef.current) {
// //                   ttsServiceRef.current.setPlaybackRate(newRate);
// //                 }
// //               }}
// //               className="form-select rounded border-gray-300 text-sm"
// //             >
// //                 <option value="0.5">0.5x</option>
// //                 <option value="0.75">0.75x</option>
// //                 <option value="1">1x</option>
// //                 <option value="1.25">1.25x</option>
// //                 <option value="1.5">1.5x</option>
// //                 <option value="1.75">1.75x</option>
// //                 <option value="2">2x</option>
// //               </select>
// //             </div>
// //           </div>
// //         )}
// //       </div>
// //     </div>
// //   );
// // };

// // export default KokoroPlayMode;




// // src/components/Reader/KokoroPlayMode.tsx
// import React, { useState, useEffect, useRef } from 'react';
// import { KokoroTTSService } from '../../services/KokoroTTSService';
// import { TextProcessingService } from '../../services/TextProcessingService';
// import { TextChunk } from '../../types/TextProcessingTypes';
// import './SimplePlayMode.css';

// interface KokoroPlayModeProps {
//   currentPageContent: string;
//   onClose: () => void;
// }

// // Helper function to get windowed text view
// const getWindowedText = (chunks: TextChunk[], currentIndex: number, windowSize: number = 3) => {
//   // Calculate window boundaries
//   const startIndex = Math.max(0, currentIndex - Math.floor(windowSize / 2));
//   const endIndex = Math.min(chunks.length - 1, startIndex + windowSize - 1);
  
//   // Get chunks in the window
//   const visibleChunks = chunks.slice(startIndex, endIndex + 1);
  
//   // Join chunk text
//   return {
//     text: visibleChunks.map(chunk => chunk.text).join(' '),
//     windowStartIndex: startIndex,
//     windowEndIndex: endIndex
//   };
// };

// const KokoroPlayMode: React.FC<KokoroPlayModeProps> = ({
//   currentPageContent,
//   onClose
// }) => {
//   // State
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [isPaused, setIsPaused] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [loadingProgress, setLoadingProgress] = useState(0);
//   const [playbackRate, setPlaybackRate] = useState(1.0);
//   const [modelLoaded, setModelLoaded] = useState(false);
//   const [errorMessage, setErrorMessage] = useState('');
//   const [estimatedTime, setEstimatedTime] = useState(10);
//   const [playbackFinished, setPlaybackFinished] = useState(false);
  
//   // Text chunk management
//   const [textChunks, setTextChunks] = useState<TextChunk[]>([]);
//   const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
//   const [displayedText, setDisplayedText] = useState('');
  
//   // Window size for text display
//   const [windowSize, setWindowSize] = useState(3);
//   const [showFullText, setShowFullText] = useState(false);
  
//   // Refs
//   const ttsServiceRef = useRef<KokoroTTSService | null>(null);
//   const textProcessingRef = useRef<TextProcessingService | null>(null);
//   const textContainerRef = useRef<HTMLDivElement>(null);
  
//   // Initialize services
//   useEffect(() => {
//     // Create text processing service
//     const textProcessingService = new TextProcessingService();
//     textProcessingRef.current = textProcessingService;
    
//     // Process the initial text
//     const initialChunks = textProcessingService.processText(currentPageContent);
//     setTextChunks(initialChunks);
    
//     // Create TTS service
//     const ttsService = new KokoroTTSService();
//     ttsServiceRef.current = ttsService;
    
//     // Initialize the TTS service
//     const initTTS = async () => {
//       try {
//         setIsLoading(true);
        
//         // Set TTS callbacks
//         ttsService.setCallbacks(
//           // Text update callback - directly use the text that comes with the audio
//           (text: string) => {
//             console.log("TTS text update:", text.substring(0, 30) + "...");
//             console.log("Current text length:", textProcessingRef.current?.getProcessedText().length || 0);
            
//             if (textProcessingRef.current) {
//               // Handle the new text chunk
//               textProcessingRef.current.handleTTSChunk(text);
              
//               // Get the updated chunk index
//               const currentIndex = textProcessingRef.current.getCurrentChunkIndex();
//               setCurrentChunkIndex(currentIndex);
              
//               // Update chunks state
//               const updatedChunks = textProcessingRef.current.updateChunkStatus(currentIndex, true);
//               setTextChunks(updatedChunks);
              
//               // Only update displayed text if not paused
//               if (!isPaused) {
//                 if (showFullText) {
//                   // Show all text if fullText mode is enabled
//                   const newText = textProcessingRef.current.getProcessedText();
//                   setDisplayedText(newText);
//                 } else {
//                   // Show windowed text view
//                   const { text: windowedText } = getWindowedText(updatedChunks, currentIndex, windowSize);
//                   setDisplayedText(windowedText);
//                 }
                
//                 // Auto-scroll
//                 if (textContainerRef.current) {
//                   textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
//                 }
//               }
//             }
//           },
//           // Error callback
//           (error: string) => {
//             setErrorMessage(error);
//             setIsPlaying(false);
//           },
//           // Completion callback
//           () => {
//             setIsPlaying(false);
//             setPlaybackFinished(true);
            
//             // Mark all chunks as processed
//             if (textProcessingRef.current) {
//               const updatedChunks = textProcessingRef.current.markAllChunksAsProcessed();
//               setTextChunks(updatedChunks);
              
//               // Update displayed text based on mode
//               if (showFullText) {
//                 setDisplayedText(textProcessingRef.current.getProcessedText());
//               } else {
//                 // Show the last few chunks
//                 const lastIndex = updatedChunks.length - 1;
//                 const { text: windowedText } = getWindowedText(updatedChunks, lastIndex, windowSize);
//                 setDisplayedText(windowedText);
//               }
//             }
//           }
//         );
        
//         // Initialize the service
//         await ttsService.initialize(
//           // Progress callback
//           (progress: number) => {
//             setLoadingProgress(progress);
//             // Update estimated time
//             const remainingTime = Math.ceil((100 - progress) / 10);
//             setEstimatedTime(remainingTime);
//           }
//         );
        
//         setIsLoading(false);
//         setModelLoaded(true);
//       } catch (error) {
//         console.error('Error initializing TTS service:', error);
//         setErrorMessage('Failed to initialize TTS service');
//         setIsLoading(false);
//       }
//     };
    
//     initTTS();
    
//     // Cleanup
//     return () => {
//       cleanupPlayback();
//     };
//   }, [currentPageContent, windowSize, showFullText]);
  
//   // Update displayed text when pause state changes
//   useEffect(() => {
//     if (textProcessingRef.current && isPlaying) {
//       // When paused, we keep the current text
//       // When unpaused, we update with the latest processed text
//       if (!isPaused) {
//         if (showFullText) {
//           setDisplayedText(textProcessingRef.current.getProcessedText());
//         } else {
//           const { text: windowedText } = getWindowedText(textChunks, currentChunkIndex, windowSize);
//           setDisplayedText(windowedText);
//         }
        
//         // Auto-scroll when text updates
//         if (textContainerRef.current) {
//           textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
//         }
//       }
//     }
//   }, [isPaused, isPlaying, showFullText, windowSize, textChunks, currentChunkIndex]);
  
//   // Handle proper cleanup
//   const cleanupPlayback = () => {
//     console.log("Cleaning up playback");
    
//     try {
//       // Stop playback if active
//       if (isPlaying) {
//         stopPlayback();
//       }
      
//       // Dispose of TTS service
//       if (ttsServiceRef.current) {
//         try {
//           ttsServiceRef.current.dispose();
//         } catch (error) {
//           console.warn("Error disposing TTS service:", error);
//         }
//         ttsServiceRef.current = null;
//       }
//     } catch (error) {
//       console.error("Error during cleanup:", error);
//     }
//   };
  
//   // Handle close
//   const handleClose = () => {
//     console.log("PlayMode closing");
    
//     try {
//       cleanupPlayback();
//     } catch (error) {
//       console.error("Error during close:", error);
//     } finally {
//       // Always call parent's onClose
//       onClose();
//     }
//   };
  
//   // Start TTS playback
//   const startPlayback = async (fromChunkIndex = 0) => {
//     if (!ttsServiceRef.current || !textProcessingRef.current || (isPlaying && !isPaused)) return;
    
//     try {
//       setIsPlaying(true);
//       setIsPaused(false);
//       setErrorMessage('');
//       setPlaybackFinished(false);
//       setCurrentChunkIndex(fromChunkIndex);
      
//       // Reset chunk status
//       const updatedChunks = textProcessingRef.current.updateChunkStatus(fromChunkIndex, true);
//       setTextChunks(updatedChunks);
      
//       // Reset processed text up to the starting chunk
//       textProcessingRef.current.resetProcessedText(fromChunkIndex);
      
//       // Get text starting from the specified chunk
//       const textToPlay = textProcessingRef.current.getTextFromChunk(fromChunkIndex);
      
//       // Update displayed text to initial state
//       if (showFullText) {
//         setDisplayedText(textProcessingRef.current.getProcessedText());
//       } else {
//         const { text: windowedText } = getWindowedText(updatedChunks, fromChunkIndex, windowSize);
//         setDisplayedText(windowedText);
//       }
      
//       // Start playback
//       await ttsServiceRef.current.playText(textToPlay);
//     } catch (error) {
//       console.error('Error starting playback:', error);
//       setIsPlaying(false);
//       setErrorMessage('Failed to start playback');
//     }
//   };
  
//   // Pause playback
//   const pausePlayback = () => {
//     if (!ttsServiceRef.current || !textProcessingRef.current) return;
    
//     setIsPaused(true);
    
//     // Update the current chunk to not be playing
//     const updatedChunks = textProcessingRef.current.updateChunkStatus(currentChunkIndex, false);
//     setTextChunks(updatedChunks);
    
//     // Keep the text as is when paused
//     // We don't need to update displayed text
    
//     ttsServiceRef.current.pause();
//   };

//   // Resume playback
//   const resumePlayback = () => {
//     if (!ttsServiceRef.current || !textProcessingRef.current) return;
    
//     setIsPaused(false);
    
//     // Update the current chunk to be playing
//     const updatedChunks = textProcessingRef.current.updateChunkStatus(currentChunkIndex, true);
//     setTextChunks(updatedChunks);
    
//     // Text will continue updating as new chunks come in
    
//     ttsServiceRef.current.resume();
//   };
  
//   // Stop playback
//   const stopPlayback = () => {
//     if (!ttsServiceRef.current || !textProcessingRef.current) return;
    
//     try {
//       setIsPlaying(false);
//       setIsPaused(false);
//       setCurrentChunkIndex(0);
      
//       // Reset all chunks
//       const updatedChunks = textProcessingRef.current.resetChunks();
//       setTextChunks(updatedChunks);
//       setDisplayedText('');
      
//       ttsServiceRef.current.stop();
//     } catch (error) {
//       console.error("Error stopping playback:", error);
//     }
//   };
  
//   // Navigate forward
//   const handleForward = () => {
//     if (textProcessingRef.current && currentChunkIndex < textProcessingRef.current.getChunkCount() - 1) {
//       stopPlayback();
//       startPlayback(currentChunkIndex + 1);
//     }
//   };
  
//   // Navigate backward
//   const handleBackward = () => {
//     if (currentChunkIndex > 0) {
//       stopPlayback();
//       startPlayback(currentChunkIndex - 1);
//     }
//   };
  
//   // Update playback rate
//   const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (!ttsServiceRef.current) return;
    
//     const newRate = parseFloat(e.target.value);
//     setPlaybackRate(newRate);
//     ttsServiceRef.current.setPlaybackRate(newRate);
//   };
  
//   // Handlers for UI controls
//   const handlePlay = () => {
//     if (isPaused) {
//       resumePlayback();
//     } else {
//       startPlayback(currentChunkIndex);
//     }
//   };
  
//   const handlePause = () => {
//     pausePlayback();
//   };
  
//   const handleStop = () => {
//     stopPlayback();
//   };
  
//   // Toggle between windowed and full text view
//   const toggleTextView = () => {
//     setShowFullText(!showFullText);
    
//     if (textProcessingRef.current) {
//       if (!showFullText) {
//         // Switching to full text view
//         setDisplayedText(textProcessingRef.current.getProcessedText());
//       } else {
//         // Switching to windowed view
//         const { text: windowedText } = getWindowedText(textChunks, currentChunkIndex, windowSize);
//         setDisplayedText(windowedText);
//       }
//     }
//   };
  
//   // Handle window size change
//   const handleWindowSizeChange = (size: number) => {
//     setWindowSize(size);
    
//     if (!showFullText && textProcessingRef.current) {
//       const { text: windowedText } = getWindowedText(textChunks, currentChunkIndex, size);
//       setDisplayedText(windowedText);
//     }
//   };

//   // Calculate total progress percentage
//   const progressPercentage = textProcessingRef.current && textProcessingRef.current.getChunkCount() > 0
//     ? ((currentChunkIndex + 1) / textProcessingRef.current.getChunkCount()) * 100
//     : 0;

//   return (
//     <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-50">
//       <div
//         className={`
//           relative bg-white text-gray-900 rounded-lg shadow-lg transition-all duration-300 overflow-hidden 
//           ${!isPlaying
//             ? "w-[300px] h-[400px] sm:w-[650px] sm:max-h-[85%] sm:p-6"
//             : "w-full h-full sm:max-w-[800px] sm:h-[85%]"}
//         `}
//       >
//         {/* Always-visible Close Icon */}
//         <button
//           className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 z-50 focus:outline-none"
//           onClick={handleClose}
//           aria-label="Close"
//         >
//           ×
//         </button>

//         {playbackFinished && (
//           <div className="flex items-center justify-center p-4 bg-yellow-100 text-yellow-800">
//             Playback finished. Click "Stop" or "Close" to exit.
//           </div>
//         )}

//         {errorMessage ? (
//           <div className="flex flex-col items-center justify-center h-full">
//             <p className="mt-4 text-base sm:text-lg font-medium text-red-600">
//               {errorMessage}
//             </p>
//             <button 
//               onClick={handleClose}
//               className="mt-4 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md"
//             >
//               Close
//             </button>
//           </div>
//         ) : isLoading ? (
//           <div className="flex flex-col items-center justify-center h-full">
//             <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 mb-4">
//               <div className="bg-gray-700 h-2.5 rounded-full" style={{ width: `${loadingProgress}%` }}></div>
//             </div>
//             <p className="mt-4 text-base sm:text-lg font-medium">
//               Your audio will start in approximately {estimatedTime} seconds...
//             </p>
//           </div>
//         ) : !isPlaying ? (
//           <div className="flex flex-col items-center justify-center gap-4 relative h-full">
//             <h2 className="text-xl sm:text-2xl font-bold mb-4">Kokoro Audio Player</h2>
//             <button
//               onClick={handlePlay}
//               className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-md shadow-md transition-colors focus:outline-none"
//               disabled={!modelLoaded}
//             >
//               {modelLoaded ? 'Start Audiobook' : 'Model Loading...'}
//             </button>
            
//             <div className="mt-8 px-4">
//               <label htmlFor="rate-slider" className="block text-sm font-medium text-gray-700 mb-1">
//                 Speed: {playbackRate.toFixed(1)}x
//               </label>
//               <input
//                 type="range"
//                 id="rate-slider"
//                 min="0.5"
//                 max="2"
//                 step="0.1"
//                 value={playbackRate}
//                 onChange={handleRateChange}
//                 className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
//               />
//             </div>
            
//             <div className="mt-4 px-4">
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Sentences per view: {windowSize}
//               </label>
//               <div className="flex gap-2">
//                 <button 
//                   onClick={() => handleWindowSizeChange(1)}
//                   className={`px-2 py-1 rounded ${windowSize === 1 ? 'bg-gray-700 text-white' : 'bg-gray-200'}`}
//                 >
//                   1
//                 </button>
//                 <button 
//                   onClick={() => handleWindowSizeChange(3)}
//                   className={`px-2 py-1 rounded ${windowSize === 3 ? 'bg-gray-700 text-white' : 'bg-gray-200'}`}
//                 >
//                   3
//                 </button>
//                 <button 
//                   onClick={() => handleWindowSizeChange(5)}
//                   className={`px-2 py-1 rounded ${windowSize === 5 ? 'bg-gray-700 text-white' : 'bg-gray-200'}`}
//                 >
//                   5
//                 </button>
//               </div>
//             </div>
            
//             <div className="mt-8 max-h-48 overflow-y-auto p-4 border border-gray-200 rounded bg-gray-50 w-full max-w-md">
//               <p className="text-sm text-gray-700">
//                 {textChunks.length > 0 ? textChunks[0].text + '...' : 'Loading text...'}
//               </p>
//             </div>
//           </div>
//         ) : (
//           <div className="flex flex-col h-full">
//             {/* Progress bar */}
//             <div className="w-full bg-gray-200 h-2">
//               <div 
//                 className="bg-gray-700 h-2 transition-all duration-300" 
//                 style={{ width: `${progressPercentage}%` }}
//               ></div>
//             </div>
            
//             {/* Text display area */}
//             <div
//               className="relative flex-grow w-full bg-[#f8f5e6] p-4 sm:p-8 overflow-y-auto"
//               ref={textContainerRef}
//             >
//               <p className="text-base sm:text-2xl leading-relaxed font-serif">
//                 {displayedText}
//                 {isPaused ? '' : 
//                   <span className="inline-block animate-pulse">|</span>
//                 }
//               </p>
//             </div>
            
//             {/* View toggle */}
//             <div className="flex justify-center py-2 bg-gray-100">
//               <button
//                 onClick={toggleTextView}
//                 className="text-sm text-gray-700 hover:text-gray-900 underline"
//               >
//                 {showFullText ? 'Show only current sentences' : 'Show all text'}
//               </button>
              
//               {!showFullText && (
//                 <div className="ml-4 flex items-center gap-2">
//                   <span className="text-sm text-gray-700">Sentences:</span>
//                   <div className="flex gap-1">
//                     <button 
//                       onClick={() => handleWindowSizeChange(1)}
//                       className={`px-2 py-0 text-xs rounded ${windowSize === 1 ? 'bg-gray-700 text-white' : 'bg-gray-200'}`}
//                     >
//                       1
//                     </button>
//                     <button 
//                       onClick={() => handleWindowSizeChange(3)}
//                       className={`px-2 py-0 text-xs rounded ${windowSize === 3 ? 'bg-gray-700 text-white' : 'bg-gray-200'}`}
//                     >
//                       3
//                     </button>
//                     <button 
//                       onClick={() => handleWindowSizeChange(5)}
//                       className={`px-2 py-0 text-xs rounded ${windowSize === 5 ? 'bg-gray-700 text-white' : 'bg-gray-200'}`}
//                     >
//                       5
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}

//         {isPlaying && !errorMessage && (
//           <div className="absolute bottom-4 left-0 right-0 flex justify-center flex-wrap gap-4">
//             <button
//               onClick={handleBackward}
//               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none disabled:opacity-50"
//               disabled={currentChunkIndex <= 0}
//             >
//               ← Back
//             </button>
            
//             {isPaused ? (
//               <button
//                 onClick={handlePlay}
//                 className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
//               >
//                 ▶ Resume
//               </button>
//             ) : (
//               <button
//                 onClick={handlePause}
//                 className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
//               >
//                 ⏸ Pause
//               </button>
//             )}
            
//             <button
//               onClick={handleForward}
//               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none disabled:opacity-50"
//               disabled={textProcessingRef.current ? 
//                 currentChunkIndex >= textProcessingRef.current.getChunkCount() - 1 : true}
//             >
//               Forward →
//             </button>
            
//             <button
//               onClick={handleStop}
//               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
//             >
//               ⏹ Stop
//             </button>
//           </div>
//         )}
        
//         {isPlaying && (
//           <div className="absolute top-4 right-12">
//             <div className="flex items-center">
//               <span className="mr-2 text-sm font-medium text-gray-700">
//                 Chunk: {currentChunkIndex + 1}/{textProcessingRef.current?.getChunkCount() || 0}
//               </span>
//               <select
//                 value={playbackRate.toString()}
//                 onChange={(e) => {
//                   const newRate = parseFloat(e.target.value);
//                   setPlaybackRate(newRate);
//                   if (ttsServiceRef.current) {
//                     ttsServiceRef.current.setPlaybackRate(newRate);
//                   }
//                 }}
//                 className="form-select rounded border-gray-300 text-sm"
//               >
//                 <option value="0.5">0.5x</option>
//                 <option value="0.75">0.75x</option>
//                 <option value="1">1x</option>
//                 <option value="1.25">1.25x</option>
//                 <option value="1.5">1.5x</option>
//                 <option value="1.75">1.75x</option>
//                 <option value="2">2x</option>
//               </select>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default KokoroPlayMode;



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
  
  // Refs
  const ttsServiceRef = useRef<KokoroTTSService | null>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  
  // Initialize TTS service and prepare segments
  useEffect(() => {
    // Create TTS service
    const ttsService = new KokoroTTSService();
    ttsServiceRef.current = ttsService;
    
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
            setErrorMessage(error);
            setIsPlaying(false);
          },
          // Completion callback
          () => {
            console.log("TTS service completion callback");
            // Mark current segment as played
            if (segments.length > 0) {
              const updatedSegments = [...segments];
              updatedSegments[currentSegmentIndex] = {
                ...updatedSegments[currentSegmentIndex],
                isPlaying: false,
                isPlayed: true
              };
              setSegments(updatedSegments);
              
              // Move to next segment if available
              if (currentSegmentIndex < segments.length - 1) {
                setCurrentSegmentIndex(prev => prev + 1);
                playSegment(currentSegmentIndex + 1);
              } else {
                // All segments played
                setIsPlaying(false);
                setPlaybackFinished(true);
              }
            }
          }
        );
        
        // Initialize the service
        await ttsService.initialize(
          // Progress callback
          (progress: number) => {
            setLoadingProgress(progress);
            // Update estimated time
            const remainingTime = Math.ceil((100 - progress) / 10);
            setEstimatedTime(remainingTime);
          }
        );
        
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
  
  // Function to play a specific segment
  const playSegment = async (segmentIndex: number) => {
    if (!ttsServiceRef.current || segmentIndex < 0 || segmentIndex >= segments.length) return;
    
    try {
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
      
      // Set playback rate
      ttsServiceRef.current.setPlaybackRate(playbackRate);
      
      // Play the segment text
      await ttsServiceRef.current.playText(segment.text);
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
              Your audio will start in approximately {estimatedTime} seconds...
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
            
            <div className="mt-8 px-4">
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
            
            <div className="mt-4 px-4">
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
            
            {/* Segment indicator */}
            <div className="py-2 bg-gray-100 text-center text-sm text-gray-700">
              Segment {currentSegmentIndex + 1} of {segments.length}
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
          </div>
        )}
        
        {isPlaying && (
          <div className="absolute top-4 right-12">
            <div className="flex items-center">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default KokoroPlayMode;