// import { useState, useEffect, useCallback } from 'react';
// import { KokoroTTS } from 'kokoro-js';

// export function useTextToSpeech() {
//   const [tts, setTTS] = useState<any>(null);
//   const [voices, setVoices] = useState<string[]>([]);
//   const [selectedVoice, setSelectedVoice] = useState<string>('');
//   const [isSpeaking, setIsSpeaking] = useState(false);
//   const [audioUrl, setAudioUrl] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   // Load the Kokoro TTS model
//   useEffect(() => {
//     async function loadModel() {
//       try {
//         const model = await KokoroTTS.from_pretrained(
//           "onnx-community/Kokoro-82M-ONNX",
//           { dtype: "q8" }
//         );
        
//         setTTS(model);
        
//         // Get available voices
//         try {
//           // Explicitly type the result and provide a fallback
//           const availableVoices = model.list_voices() as string[] | undefined;
          
//           const voiceList = availableVoices && availableVoices.length > 0 
//             ? availableVoices 
//             : ['af_heart', 'af_bella', 'af_sky', 'af_nicole', 'am_michael', 'bf_emma'];
          
//           setVoices(voiceList);
//           setSelectedVoice(voiceList[0]);
//         } catch (voiceError) {
//           console.warn("Could not get voices:", voiceError);
//           const fallbackVoices = ['af_heart', 'af_bella', 'af_sky', 'af_nicole', 'am_michael', 'bf_emma'];
//           setVoices(fallbackVoices);
//           setSelectedVoice(fallbackVoices[0]);
//         }
//       } catch (err) {
//         console.error("Error loading Kokoro TTS model:", err);
//         setError(`Error loading model: ${err instanceof Error ? err.message : String(err)}`);
//       } finally {
//         setIsLoading(false);
//       }
//     }
    
//     loadModel();

//     // Cleanup function
//     return () => {
//       if (audioUrl) {
//         URL.revokeObjectURL(audioUrl);
//       }
//     };
//   }, []);

//   // Speak text
//   const speak = useCallback(async (text: string, options: { voice?: string } = {}) => {
//     if (!tts || !text.trim() || isSpeaking) return;

//     try {
//       setIsSpeaking(true);
      
//       // Use provided voice or fallback to selected voice
//       const voiceToUse = options.voice || selectedVoice;
      
//       // Generate speech
//       const audio = await tts.generate(text, { voice: voiceToUse });
      
//       // Convert to playable audio
//       const blob = audio.toBlob();
//       const url = URL.createObjectURL(blob);
      
//       setAudioUrl(url);

//       // Create and play audio
//       const audioElement = new Audio(url);
//       audioElement.onended = () => {
//         setIsSpeaking(false);
//         URL.revokeObjectURL(url);
//         setAudioUrl(null);
//       };
//       audioElement.play();
//     } catch (err) {
//       console.error("Error generating speech:", err);
//       setIsSpeaking(false);
//       setError(`Error generating speech: ${err instanceof Error ? err.message : String(err)}`);
//     }
//   }, [tts, selectedVoice, isSpeaking]);

//   // Stop speaking
//   const stop = useCallback(() => {
//     if (audioUrl) {
//       const audio = new Audio(audioUrl);
//       audio.pause();
//       audio.currentTime = 0;
//       URL.revokeObjectURL(audioUrl);
//       setAudioUrl(null);
//     }
//     setIsSpeaking(false);
//   }, [audioUrl]);

//   return {
//     speak,
//     stop,
//     voices,
//     isSpeaking,
//     isLoading,
//     error,
//     selectedVoice,
//     setSelectedVoice,
//     supported: !!tts
//   };
// }

import { useState, useEffect, useCallback, useRef } from 'react';
import { KokoroTTS, TextSplitterStream } from 'kokoro-js';

interface StreamingAudioResult {
  text: string;
  audioUrl: string;
}

export function useTextToSpeech() {
  const [tts, setTTS] = useState<any>(null);
  const [voices, setVoices] = useState<string[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioResults, setAudioResults] = useState<StreamingAudioResult[]>([]);
  
  // Refs to manage streaming
  const splitterRef = useRef<TextSplitterStream | null>(null);
  const streamRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const cancelTokenRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const isMountedRef = useRef(true);

  // Load the Kokoro TTS model
  useEffect(() => {
    let cancelled = false;

    const loadModel = async () => {
      try {
        // Use a timeout to prevent hanging
        const modelLoadTimeout = setTimeout(() => {
          if (!cancelled && isMountedRef.current) {
            setError('Model loading timed out');
            setIsLoading(false);
          }
        }, 10000); // 10 seconds timeout

        const model = await Promise.race([
          KokoroTTS.from_pretrained(
            "onnx-community/Kokoro-82M-ONNX",
            { 
              dtype: "q8",
              device: "wasm" 
            }
          ),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Model load timeout')), 10000)
          )
        ]);

        clearTimeout(modelLoadTimeout);

        if (cancelled || !isMountedRef.current) return;

        // Get available voices
        const availableVoices = ['af_heart', 'af_bella', 'af_sky', 'af_nicole', 'am_michael', 'bf_emma'];
        
        if (isMountedRef.current) {
          setTTS(model);
          setVoices(availableVoices);
          setSelectedVoice(availableVoices[0]);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMountedRef.current) {
          console.error("Error loading Kokoro TTS model:", err);
          setError(`Error loading model: ${err instanceof Error ? err.message : String(err)}`);
          setIsLoading(false);
        }
      }
    };

    loadModel();

    // Cleanup function
    return () => {
      cancelled = true;
      isMountedRef.current = false;
      // Stop any ongoing speech and clear resources
      stop();
    };
  }, []); // Empty dependency array

  // Speak text using streaming with chunked processing
  const speak = useCallback(async (text: string, options: { voice?: string } = {}) => {
    if (!tts || !text.trim() || isSpeaking) return;

    try {
      setIsSpeaking(true);
      setAudioResults([]); // Clear previous audio results

      // Use provided voice or fallback to selected voice
      const voiceToUse = options.voice || selectedVoice;

      // Process text in chunks of ~200 characters
      const processTextInChunks = async (fullText: string) => {
        const chunkSize = 200;
        const chunks: string[] = [];

        // Split text into chunks
        for (let i = 0; i < fullText.length; i += chunkSize) {
          chunks.push(fullText.slice(i, i + chunkSize));
        }

        // Process chunks sequentially
        for (const chunk of chunks) {
          if (cancelTokenRef.current.cancelled) break;

          // Set up the text splitter stream
          const splitter = new TextSplitterStream();
          splitterRef.current = splitter;

          // Set up the stream
          const stream = tts.stream(splitter, { voice: voiceToUse });
          streamRef.current = stream;

          // Prepare to collect audio results
          const audioResultsTemp: StreamingAudioResult[] = [];

          // Process the stream
          const streamPromise = new Promise<void>(async (resolve) => {
            let i = 0;
            for await (const { text, audio } of stream) {
              if (cancelTokenRef.current.cancelled) break;

              // Convert audio to blob and create URL
              const blob = audio.toBlob();
              const audioUrl = URL.createObjectURL(blob);
              
              audioResultsTemp.push({ text, audioUrl });
              
              // Safely update state only if component is mounted
              if (isMountedRef.current) {
                setAudioResults(prev => [...prev, ...audioResultsTemp]);
              }

              // Play audio automatically
              if (!audioElementRef.current) {
                audioElementRef.current = new Audio(audioUrl);
                audioElementRef.current.onended = () => {
                  // When last audio ends, prepare for next chunk
                  audioElementRef.current = null;
                  resolve();
                };
                audioElementRef.current.play();
              }

              i++;
            }
          });

          // Split and push text tokens
          const tokens = chunk.match(/\s*\S+/g) || [];
          for (const token of tokens) {
            if (cancelTokenRef.current.cancelled) break;
            splitter.push(token);
            await new Promise((resolve) => setTimeout(resolve, 10));
          }

          // Close the stream
          splitter.close();

          // Wait for this chunk to finish processing
          await streamPromise;
        }

        // All chunks processed
        stop();
      };

      // Start processing text in chunks
      processTextInChunks(text);
    } catch (err) {
      console.error("Error generating speech:", err);
      if (isMountedRef.current) {
        setError(`Error generating speech: ${err instanceof Error ? err.message : String(err)}`);
        stop();
      }
    }
  }, [tts, selectedVoice, isSpeaking]);

  // Stop speaking
  const stop = useCallback(() => {
    // Set cancellation token
    cancelTokenRef.current.cancelled = true;

    // Stop audio playback
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }

    // Close stream if active
    if (splitterRef.current) {
      splitterRef.current.close();
      splitterRef.current = null;
    }

    // Clear any existing audio results
    audioResults.forEach(result => {
      URL.revokeObjectURL(result.audioUrl);
    });
    
    if (isMountedRef.current) {
      setAudioResults([]);
      setIsSpeaking(false);
    }
  }, [audioResults]);

  return {
    speak,
    stop,
    voices,
    isSpeaking,
    isLoading,
    error,
    selectedVoice,
    setSelectedVoice,
    audioResults,
    supported: !!tts
  };
}