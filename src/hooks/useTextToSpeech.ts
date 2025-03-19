// // // // // src/hooks/useTextToSpeech.ts
// // // // import { useState, useEffect, useCallback } from 'react';

// // // // interface TextToSpeechOptions {
// // // //   rate?: number;
// // // //   pitch?: number;
// // // //   voice?: SpeechSynthesisVoice | null;
// // // // }

// // // // export function useTextToSpeech() {
// // // //   const [isSpeaking, setIsSpeaking] = useState(false);
// // // //   const [isPaused, setIsPaused] = useState(false);
// // // //   const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);
// // // //   const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

// // // //   // Load available voices when component mounts
// // // //   useEffect(() => {
// // // //     if (!('speechSynthesis' in window)) {
// // // //       return;
// // // //     }

// // // //     // Function to get voices
// // // //     const getVoices = () => {
// // // //       const voiceList = window.speechSynthesis.getVoices();
// // // //       setVoices(voiceList);
// // // //     };

// // // //     // Get voices on initial load
// // // //     getVoices();

// // // //     // Chrome loads voices asynchronously
// // // //     window.speechSynthesis.onvoiceschanged = getVoices;

// // // //     return () => {
// // // //       window.speechSynthesis.onvoiceschanged = null;
// // // //     };
// // // //   }, []);

// // // //   // Cleanup on unmount
// // // //   useEffect(() => {
// // // //     return () => {
// // // //       if ('speechSynthesis' in window) {
// // // //         window.speechSynthesis.cancel();
// // // //       }
// // // //     };
// // // //   }, []);

// // // //   // Start speaking a text
// // // //   const speak = useCallback((text: string, options: TextToSpeechOptions = {}) => {
// // // //     if (!('speechSynthesis' in window)) {
// // // //       console.error('Speech synthesis not supported in this browser');
// // // //       return;
// // // //     }

// // // //     // Cancel any ongoing speech
// // // //     window.speechSynthesis.cancel();

// // // //     // Create a new utterance
// // // //     const newUtterance = new SpeechSynthesisUtterance(text);
    
// // // //     // Apply options
// // // //     if (options.rate) newUtterance.rate = options.rate;
// // // //     if (options.pitch) newUtterance.pitch = options.pitch;
// // // //     if (options.voice) newUtterance.voice = options.voice;

// // // //     // Set event handlers
// // // //     newUtterance.onstart = () => {
// // // //       setIsSpeaking(true);
// // // //       setIsPaused(false);
// // // //     };

// // // //     newUtterance.onend = () => {
// // // //       setIsSpeaking(false);
// // // //       setIsPaused(false);
// // // //       setUtterance(null);
// // // //     };

// // // //     newUtterance.onerror = (event) => {
// // // //       console.error('Speech synthesis error:', event);
// // // //       setIsSpeaking(false);
// // // //       setIsPaused(false);
// // // //       setUtterance(null);
// // // //     };

// // // //     // Store the utterance in state
// // // //     setUtterance(newUtterance);

// // // //     // Start speaking
// // // //     window.speechSynthesis.speak(newUtterance);
// // // //   }, []);

// // // //   // Pause the speech
// // // //   const pause = useCallback(() => {
// // // //     if (!('speechSynthesis' in window) || !isSpeaking || isPaused) {
// // // //       return;
// // // //     }

// // // //     window.speechSynthesis.pause();
// // // //     setIsPaused(true);
// // // //   }, [isSpeaking, isPaused]);

// // // //   // Resume the speech
// // // //   const resume = useCallback(() => {
// // // //     if (!('speechSynthesis' in window) || !isSpeaking || !isPaused) {
// // // //       return;
// // // //     }

// // // //     window.speechSynthesis.resume();
// // // //     setIsPaused(false);
// // // //   }, [isSpeaking, isPaused]);

// // // //   // Stop the speech
// // // //   const stop = useCallback(() => {
// // // //     if (!('speechSynthesis' in window)) {
// // // //       return;
// // // //     }

// // // //     window.speechSynthesis.cancel();
// // // //     setIsSpeaking(false);
// // // //     setIsPaused(false);
// // // //     setUtterance(null);
// // // //   }, []);

// // // //   return {
// // // //     speak,
// // // //     pause,
// // // //     resume,
// // // //     stop,
// // // //     isSpeaking,
// // // //     isPaused,
// // // //     voices,
// // // //     supported: 'speechSynthesis' in window
// // // //   };
// // // // }


// // // import { useState, useEffect, useCallback, useRef } from 'react';
// // // import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// // // // Custom types to maintain compatibility with existing interface
// // // interface Voice {
// // //   name: string;
// // //   lang: string;
// // //   voiceURI?: string;
// // // }

// // // interface TextToSpeechOptions {
// // //   rate?: number;
// // //   pitch?: number;
// // //   voice?: string; // Voice name for MsEdgeTTS
// // // }

// // // export function useTextToSpeech() {
// // //   const [isSpeaking, setIsSpeaking] = useState(false);
// // //   const [isPaused, setIsPaused] = useState(false);
// // //   const [voices, setVoices] = useState<Voice[]>([]);
  
// // //   // Refs to manage audio state
// // //   const audioRef = useRef<HTMLAudioElement | null>(null);
// // //   const ttsInstanceRef = useRef<MsEdgeTTS | null>(null);
// // //   const currentStreamRef = useRef<any>(null);

// // //   // Predefined list of voices (you may want to expand this)
// // //   const predefinedVoices: Voice[] = [
// // //     { name: 'en-US-BrianMultilingualNeural', lang: 'en-US' },
// // //     { name: 'en-US-AriaMultilingualNeural', lang: 'en-US' },
// // //     // Add more voices as needed
// // //   ];

// // //   // Load voices on component mount
// // //   useEffect(() => {
// // //     setVoices(predefinedVoices);

// // //     // Cleanup function
// // //     return () => {
// // //       // Stop any ongoing speech
// // //       stop();
// // //     };
// // //   }, []);

// // //   // Speak method
// // //   const speak = useCallback(async (text: string, options: TextToSpeechOptions = {}) => {
// // //     // Stop any existing speech
// // //     stop();

// // //     try {
// // //       // Create TTS instance
// // //       const tts = new MsEdgeTTS();
// // //       ttsInstanceRef.current = tts;

// // //       // Set voice (default to first if not specified)
// // //       const voiceName = options.voice || predefinedVoices[0].name;
      
// // //       // Set metadata with selected voice and output format
// // //       await tts.setMetadata(
// // //         voiceName, 
// // //         OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS
// // //       );

// // //       // Generate audio stream
// // //       const { audioStream } = tts.toStream(text);
// // //       currentStreamRef.current = audioStream;

// // //       // Create audio chunks
// // //       const audioChunks: Blob[] = [];

// // //       // Collect audio data
// // //       audioStream.on('data', (data: any) => {
// // //         audioChunks.push(data);
// // //       });

// // //       // Handle stream completion
// // //       audioStream.on('close', () => {
// // //         // Combine chunks and play audio
// // //         const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
// // //         const audioUrl = URL.createObjectURL(audioBlob);

// // //         // Create audio element
// // //         const audio = new Audio(audioUrl);
// // //         audioRef.current = audio;

// // //         // Set up event listeners
// // //         audio.onplay = () => {
// // //           setIsSpeaking(true);
// // //           setIsPaused(false);
// // //         };

// // //         audio.onended = () => {
// // //           setIsSpeaking(false);
// // //           setIsPaused(false);
          
// // //           // Clean up
// // //           URL.revokeObjectURL(audioUrl);
// // //           if (audioRef.current) {
// // //             audioRef.current = null;
// // //           }
// // //         };

// // //         audio.onerror = (error) => {
// // //           console.error('Audio playback error:', error);
// // //           setIsSpeaking(false);
// // //           setIsPaused(false);
// // //         };

// // //         // Play audio
// // //         audio.play();
// // //       });

// // //     } catch (error) {
// // //       console.error('TTS Error:', error);
// // //       setIsSpeaking(false);
// // //       setIsPaused(false);
// // //     }
// // //   }, []);

// // //   // Pause method
// // //   const pause = useCallback(() => {
// // //     if (audioRef.current && !isPaused) {
// // //       audioRef.current.pause();
// // //       setIsPaused(true);
// // //     }
// // //   }, [isPaused]);

// // //   // Resume method
// // //   const resume = useCallback(() => {
// // //     if (audioRef.current && isPaused) {
// // //       audioRef.current.play();
// // //       setIsPaused(false);
// // //     }
// // //   }, [isPaused]);

// // //   // Stop method
// // //   const stop = useCallback(() => {
// // //     // Stop audio playback
// // //     if (audioRef.current) {
// // //       audioRef.current.pause();
// // //       audioRef.current.currentTime = 0;
// // //       audioRef.current = null;
// // //     }

// // //     // Cancel TTS stream if exists
// // //     if (currentStreamRef.current) {
// // //       currentStreamRef.current.destroy();
// // //       currentStreamRef.current = null;
// // //     }

// // //     // Reset states
// // //     setIsSpeaking(false);
// // //     setIsPaused(false);
// // //   }, []);

// // //   return {
// // //     speak,
// // //     pause,
// // //     resume,
// // //     stop,
// // //     isSpeaking,
// // //     isPaused,
// // //     voices,
// // //     supported: true // MsEdgeTTS is supported in modern browsers
// // //   };
// // // }

// // import { useState, useEffect, useCallback, useRef } from 'react';
// // import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// // // Define a more generic Voice interface
// // interface Voice {
// //   name: string;
// //   lang: string;
// // }

// // // Options interface
// // interface TextToSpeechOptions {
// //   voice?: string;
// // }

// // export function useTextToSpeech() {
// //   const [isSpeaking, setIsSpeaking] = useState(false);
// //   const [isPaused, setIsPaused] = useState(false);
// //   const [voices, setVoices] = useState<Voice[]>([]);
  
// //   // Refs for audio and TTS management
// //   const audioRef = useRef<HTMLAudioElement | null>(null);
// //   const ttsInstanceRef = useRef<MsEdgeTTS | null>(null);

// //   // Predefined voices (adjust as needed)
// //   const predefinedVoices: Voice[] = [
// //     { name: 'en-US-BrianMultilingualNeural', lang: 'en-US' },
// //     { name: 'en-US-AriaMultilingualNeural', lang: 'en-US' },
// //   ];

// //   // Load voices on mount
// //   useEffect(() => {
// //     // Fetch available voices
// //     const fetchVoices = async () => {
// //       try {
// //         const tts = new MsEdgeTTS();
// //         const availableVoices = await tts.getVoices();
        
// //         // Transform voices to our interface
// //         const formattedVoices = availableVoices.map(voice => ({
// //           name: voice.ShortName,
// //           lang: voice.Locale
// //         }));

// //         setVoices(formattedVoices);
// //       } catch (error) {
// //         console.error('Failed to fetch voices:', error);
// //         // Fallback to predefined voices
// //         setVoices(predefinedVoices);
// //       }
// //     };

// //     fetchVoices();

// //     // Cleanup on unmount
// //     return () => {
// //       stop();
// //     };
// //   }, []);

// //   // Speak method
// //   const speak = useCallback(async (text: string, options: TextToSpeechOptions = {}) => {
// //     // Stop any existing speech
// //     stop();

// //     try {
// //       // Create TTS instance
// //       const tts = new MsEdgeTTS();
// //       ttsInstanceRef.current = tts;

// //       // Set voice (default to first if not specified)
// //       const voiceName = options.voice || predefinedVoices[0].name;
      
// //       // Prepare audio data manually
// //       const audioContext = new AudioContext();
      
// //       // Create a promise to handle the audio generation
// //       const audioBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
// //         // Collect audio chunks
// //         const chunks: Uint8Array[] = [];

// //         // Use a custom approach to collect audio data
// //         const wsHandler = async () => {
// //           try {
// //             // Set metadata for the voice
// //             await tts.setMetadata(
// //               voiceName, 
// //               OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS
// //             );

// //             // Attempt to use toStream - this might throw in browser
// //             const { audioStream } = tts.toStream(text);

// //             // Simulate stream handling
// //             audioStream.on('data', (chunk: Uint8Array) => {
// //               chunks.push(chunk);
// //             });

// //             audioStream.on('end', () => {
// //               // Combine chunks
// //               const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
// //               const combinedBuffer = new Uint8Array(totalLength);
// //               let offset = 0;
// //               chunks.forEach(chunk => {
// //                 combinedBuffer.set(chunk, offset);
// //                 offset += chunk.length;
// //               });

// //               resolve(combinedBuffer.buffer);
// //             });

// //             audioStream.on('error', (error: Error) => {
// //               reject(error);
// //             });
// //           } catch (error) {
// //             reject(error);
// //           }
// //         };

// //         // Call the handler
// //         wsHandler().catch(reject);
// //       });

// //       // Decode audio buffer
// //       const decodedAudio = await audioContext.decodeAudioData(audioBuffer);

// //       // Create audio source
// //       const audioSource = audioContext.createBufferSource();
// //       audioSource.buffer = decodedAudio;
// //       audioSource.connect(audioContext.destination);

// //       // Manage playback state
// //       audioSource.onended = () => {
// //         setIsSpeaking(false);
// //         setIsPaused(false);
// //       };

// //       // Start playback
// //       audioSource.start(0);
// //       setIsSpeaking(true);
// //       setIsPaused(false);

// //     } catch (error) {
// //       console.error('TTS Initialization Error:', error);
// //       setIsSpeaking(false);
// //       setIsPaused(false);
// //     }
// //   }, []);

// //   // Pause method (more complex with Web Audio API)
// //   const pause = useCallback(() => {
// //     // Placeholder - full pause implementation depends on audio context
// //     setIsPaused(true);
// //   }, []);

// //   // Resume method
// //   const resume = useCallback(() => {
// //     // Placeholder - full resume implementation depends on audio context
// //     setIsPaused(false);
// //   }, []);

// //   // Stop method
// //   const stop = useCallback(() => {
// //     // Reset states
// //     setIsSpeaking(false);
// //     setIsPaused(false);
// //   }, []);

// //   return {
// //     speak,
// //     pause,
// //     resume,
// //     stop,
// //     isSpeaking,
// //     isPaused,
// //     voices,
// //     supported: true
// //   };
// // }

// import { useState, useEffect, useCallback } from 'react';
// import { TTSService, TTSVoice } from '../services/msedge';

// export function useTextToSpeech() {
//   const [isSpeaking, setIsSpeaking] = useState(false);
//   const [isPaused, setIsPaused] = useState(false);
//   const [voices, setVoices] = useState<TTSVoice[]>([]);
//   const [currentAudioBuffer, setCurrentAudioBuffer] = useState<ArrayBuffer | null>(null);

//   const ttsService = TTSService.getInstance();

//   // Load voices on mount
//   useEffect(() => {
//     setVoices(ttsService.getVoices());
//   }, []);

//   // Speak method
//   const speak = useCallback(async (text: string, options: { voice?: string } = {}) => {
//     try {
//       // Stop if already speaking
//       if (isSpeaking) {
//         stop();
//       }

//       setIsSpeaking(true);
//       setIsPaused(false);

//       // Generate audio buffer
//       const audioBuffer = await ttsService.generateAudio(text, { voice: options.voice });
//       setCurrentAudioBuffer(audioBuffer);

//       // Play audio
//       await ttsService.playAudio(audioBuffer);
      
//       // Reset state when finished
//       setIsSpeaking(false);
//     } catch (error) {
//       console.error('TTS Error:', error);
//       setIsSpeaking(false);
//       setIsPaused(false);
//     }
//   }, [isSpeaking]);

//   // Pause method (Note: full pause implementation is complex with Web Audio API)
//   const pause = useCallback(() => {
//     setIsPaused(true);
//   }, []);

//   // Resume method
//   const resume = useCallback(() => {
//     setIsPaused(false);
//     // If we have a saved audio buffer, replay it
//     if (currentAudioBuffer) {
//       ttsService.playAudio(currentAudioBuffer).catch(console.error);
//     }
//   }, [currentAudioBuffer]);

//   // Stop method
//   const stop = useCallback(() => {
//     setIsSpeaking(false);
//     setIsPaused(false);
//     setCurrentAudioBuffer(null);
//   }, []);

//   return {
//     speak,
//     pause,
//     resume,
//     stop,
//     isSpeaking,
//     isPaused,
//     voices,
//     supported: true
//   };
// }