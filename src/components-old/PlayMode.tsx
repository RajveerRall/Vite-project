// // // // // // // // // import React, { useState, useEffect, useRef } from "react";
// // // // // // // // // import { Button } from "@/components/ui/button";
// // // // // // // // // import { X, Play, Pause } from "lucide-react";
// // // // // // // // // import axios from "axios";
// // // // // // // // // import { getVoiceForSpeaker } from "@/pages/api/getVoices";

// // // // // // // // // interface Segment {
// // // // // // // // //   speaker: string;
// // // // // // // // //   text: string;
// // // // // // // // //   voice?: string; // Optional: holds the TTS voice assignment.
// // // // // // // // //   gender?: "MALE" | "FEMALE" | "UNKNOWN"; // Optional gender field.
// // // // // // // // // }


// // // // // // // // // interface VoiceMappings {
// // // // // // // // //   [key: string]: string;
// // // // // // // // // }

// // // // // // // // // // Constants for initial TTS batch size.
// // // // // // // // // const INITIAL_TTS_BATCH = 5;

// // // // // // // // // // The PlayMode component.
// // // // // // // // // const PlayMode: React.FC<{ 
// // // // // // // // //   currentPageContent: string;  
// // // // // // // // //   onClose: () => void; 
// // // // // // // // //   extractText: () => void; 
// // // // // // // // // }> = ({ currentPageContent, onClose, extractText }) => {
  
// // // // // // // // //   const [isPlaying, setIsPlaying] = useState(false);
// // // // // // // // //   const [isPaused, setIsPaused] = useState(false);
// // // // // // // // //   const [isLoading, setIsLoading] = useState(false); 
// // // // // // // // //   const [segments, setSegments] = useState<Segment[]>([]);
// // // // // // // // //   const [voiceMappings, setVoiceMappings] = useState<VoiceMappings>({});
// // // // // // // // //   const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
// // // // // // // // //   const [displayedText, setDisplayedText] = useState("");
// // // // // // // // //   const [audioQueue, setAudioQueue] = useState<string[]>([]);
// // // // // // // // //   const [audioBuffer, setAudioBuffer] = useState<string[]>([]);
  
// // // // // // // // //   const audioRef = useRef<HTMLAudioElement | null>(null);
// // // // // // // // //   const textContainerRef = useRef<HTMLDivElement | null>(null);
// // // // // // // // //   const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
// // // // // // // // //   const ttsCache = useRef<{ [key: string]: string }>({});

// // // // // // // // //   // Restore auto-scroll when displayedText updates.
// // // // // // // // //   useEffect(() => {
// // // // // // // // //     if (textContainerRef.current) {
// // // // // // // // //       textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
// // // // // // // // //     }
// // // // // // // // //   }, [displayedText]);

// // // // // // // // //   // Preload background image.
// // // // // // // // //   useEffect(() => {
// // // // // // // // //     const preloadImage = new Image();
// // // // // // // // //     preloadImage.src = "/images/olderpaper.jpg";
// // // // // // // // //   }, []);

// // // // // // // // //   // Fetch text automatically when PlayMode opens.
// // // // // // // // //   useEffect(() => {
// // // // // // // // //     extractText();
// // // // // // // // //   }, []);




// // // // // // // // //   // // -------------------------
// // // // // // // // //   // // Sequential Chunk Processing
// // // // // // // // //   // // -------------------------

// // // // // // // // //   // // This function processes the chunks one by one.
// // // // // // // // //   // const processChunksSequentially = async (chunks: string[]) => {
// // // // // // // // //   //   let combinedSegments: Segment[] = [];

// // // // // // // // //   //   for (let i = 0; i < chunks.length; i++) {
// // // // // // // // //   //     try {
// // // // // // // // //   //       console.log(`Processing chunk ${i + 1} of ${chunks.length}`);

// // // // // // // // //   //       // Call the parse_text endpoint with the current chunk.
// // // // // // // // //   //       const parseResponse = await axios.post("/.netlify/functions/parse_text", {
// // // // // // // // //   //         text: chunks[i],
// // // // // // // // //   //       });
// // // // // // // // //   //       const { segments: chunkSegments } = parseResponse.data;
// // // // // // // // //   //       console.log(`Parsed segments for chunk ${i + 1}:`, chunkSegments);

// // // // // // // // //   //       // Perform client-side voice assignment.
// // // // // // // // //   //       // This ensures that each segment gets a consistent voice based on its speaker and gender.
// // // // // // // // //   //       const processedSegments: Segment[] = chunkSegments.map((seg: Segment) => {
// // // // // // // // //   //         // Use getVoiceForSpeaker to assign a voice.
// // // // // // // // //   //         const voiceAssignment = getVoiceForSpeaker(seg.speaker, seg.gender || "UNKNOWN");
// // // // // // // // //   //         return { ...seg, voice: voiceAssignment.voice };
// // // // // // // // //   //       });

// // // // // // // // //   //       // Append the processed segments to the overall list.
// // // // // // // // //   //       combinedSegments = combinedSegments.concat(processedSegments);
// // // // // // // // //   //       setSegments(combinedSegments);

// // // // // // // // //   //       // Fetch TTS for this chunk's segments.
// // // // // // // // //   //       const ttsResults = await fetchTTS(processedSegments);
// // // // // // // // //   //       console.log(`TTS results for chunk ${i + 1}:`, ttsResults);
// // // // // // // // //   //       setAudioQueue((prev) => [...prev, ...ttsResults]);

// // // // // // // // //   //       // For the very first chunk, initialize playback immediately.
// // // // // // // // //   //       if (i === 0) {
// // // // // // // // //   //         setIsPlaying(true);
// // // // // // // // //   //         setIsPaused(false);
// // // // // // // // //   //         setCurrentSegmentIndex(0);
// // // // // // // // //   //         setDisplayedText("");
// // // // // // // // //   //       }
// // // // // // // // //   //     } catch (error: any) {
// // // // // // // // //   //       console.error(
// // // // // // // // //   //         `Error processing chunk ${i + 1}:`,
// // // // // // // // //   //         error.response?.data?.error || error.message || error
// // // // // // // // //   //       );
// // // // // // // // //   //       // Optionally, you can break the loop or alert the user if a critical error occurs.
// // // // // // // // //   //     }
// // // // // // // // //   //   }
// // // // // // // // //   //   console.log("All chunks processed.");
// // // // // // // // //   // };

// // // // // // // // //   // // Handle Start: split text into chunks and process them sequentially.
// // // // // // // // //   // const handleStart = async () => {
// // // // // // // // //   //   if (!currentPageContent.trim()) {
// // // // // // // // //   //     alert("No text found on this page. Try navigating to another page.");
// // // // // // // // //   //     return;
// // // // // // // // //   //   }
// // // // // // // // //   //   setIsLoading(true);
// // // // // // // // //   //   try {
// // // // // // // // //   //     // Split text into chunks (adjust MAX_CHUNK_LENGTH as needed).
// // // // // // // // //   //     const MAX_CHUNK_LENGTH = 1250;
// // // // // // // // //   //     const chunks =
// // // // // // // // //   //       currentPageContent.length > MAX_CHUNK_LENGTH
// // // // // // // // //   //         ? splitTextIntoChunks(currentPageContent, MAX_CHUNK_LENGTH)
// // // // // // // // //   //         : [currentPageContent];
// // // // // // // // //   //     console.log(`Splitting text into ${chunks.length} chunk(s)`);

// // // // // // // // //   //     // Process chunks sequentially.
// // // // // // // // //   //     await processChunksSequentially(chunks);
// // // // // // // // //   //   } catch (error: any) {
// // // // // // // // //   //     console.error(
// // // // // // // // //   //       "Error processing text:",
// // // // // // // // //   //       error.response?.data?.error || error.message || error
// // // // // // // // //   //     );
// // // // // // // // //   //     alert("Failed to process the text. Please try again.");
// // // // // // // // //   //   } finally {
// // // // // // // // //   //     setIsLoading(false);
// // // // // // // // //   //   }
// // // // // // // // //   // };




  
// // // // // // // // //   // Process chunks sequentially, but resolve after the first chunk to allow immediate UI updates.
// // // // // // // // // const processChunksSequentially = async (chunks: string[]) => {
// // // // // // // // //   let combinedSegments: Segment[] = [];

// // // // // // // // //   // Process first chunk separately.
// // // // // // // // //   try {
// // // // // // // // //     console.log(`Processing first chunk of ${chunks.length}`);
// // // // // // // // //     const parseResponse = await axios.post("/.netlify/functions/parse_text", { text: chunks[0] });
// // // // // // // // //     const { segments: firstChunkSegments } = parseResponse.data;
// // // // // // // // //     console.log("Parsed segments for first chunk:", firstChunkSegments);

// // // // // // // // //     // Perform client-side voice assignment.
// // // // // // // // //     const processedFirstChunk: Segment[] = firstChunkSegments.map((seg: Segment) => {
// // // // // // // // //       const voiceAssignment = getVoiceForSpeaker(seg.speaker, seg.gender || "UNKNOWN");
// // // // // // // // //       return { ...seg, voice: voiceAssignment.voice };
// // // // // // // // //     });

// // // // // // // // //     combinedSegments = combinedSegments.concat(processedFirstChunk);
// // // // // // // // //     setSegments(combinedSegments);

// // // // // // // // //     // Fetch TTS for the first chunk's segments.
// // // // // // // // //     const firstChunkTTS = await fetchTTS(processedFirstChunk);
// // // // // // // // //     console.log("TTS results for first chunk:", firstChunkTTS);
// // // // // // // // //     setAudioQueue(firstChunkTTS);

// // // // // // // // //     // Immediately start playback for the first chunk.
// // // // // // // // //     setIsPlaying(true);
// // // // // // // // //     setIsPaused(false);
// // // // // // // // //     setCurrentSegmentIndex(0);
// // // // // // // // //     setDisplayedText("");

// // // // // // // // //     // Now, mark the loading as complete.
// // // // // // // // //     setIsLoading(false);
// // // // // // // // //   } catch (error: any) {
// // // // // // // // //     console.error("Error processing first chunk:", error);
// // // // // // // // //     alert("Failed to process the text. Please try again.");
// // // // // // // // //     setIsLoading(false);
// // // // // // // // //     return;
// // // // // // // // //   }

// // // // // // // // //   // Process the remaining chunks asynchronously (without blocking UI updates).
// // // // // // // // //   for (let i = 1; i < chunks.length; i++) {
// // // // // // // // //     try {
// // // // // // // // //       console.log(`Processing chunk ${i + 1} of ${chunks.length}`);
// // // // // // // // //       const parseResponse = await axios.post("/.netlify/functions/parse_text", { text: chunks[i] });
// // // // // // // // //       const { segments: chunkSegments } = parseResponse.data;
// // // // // // // // //       console.log(`Parsed segments for chunk ${i + 1}:`, chunkSegments);

// // // // // // // // //       const processedSegments: Segment[] = chunkSegments.map((seg: Segment) => {
// // // // // // // // //         const voiceAssignment = getVoiceForSpeaker(seg.speaker, seg.gender || "UNKNOWN");
// // // // // // // // //         return { ...seg, voice: voiceAssignment.voice };
// // // // // // // // //       });
// // // // // // // // //       combinedSegments = combinedSegments.concat(processedSegments);
// // // // // // // // //       setSegments(combinedSegments);

// // // // // // // // //       const ttsResults = await fetchTTS(processedSegments);
// // // // // // // // //       console.log(`TTS results for chunk ${i + 1}:`, ttsResults);
// // // // // // // // //       setAudioQueue((prev) => [...prev, ...ttsResults]);
// // // // // // // // //     } catch (error: any) {
// // // // // // // // //       console.error(`Error processing chunk ${i + 1}:`, error);
// // // // // // // // //     }
// // // // // // // // //   }
// // // // // // // // //   console.log("All chunks processed.");
// // // // // // // // // };

// // // // // // // // // // Handle Start: split text into chunks and process them sequentially.
// // // // // // // // // const handleStart = async () => {
// // // // // // // // //   if (!currentPageContent.trim()) {
// // // // // // // // //     alert("No text found on this page. Try navigating to another page.");
// // // // // // // // //     return;
// // // // // // // // //   }
// // // // // // // // //   setIsLoading(true);
// // // // // // // // //   try {
// // // // // // // // //     const MAX_CHUNK_LENGTH = 1300;
// // // // // // // // //     const chunks = currentPageContent.length > MAX_CHUNK_LENGTH
// // // // // // // // //       ? splitTextIntoChunks(currentPageContent, MAX_CHUNK_LENGTH)
// // // // // // // // //       : [currentPageContent];
// // // // // // // // //     console.log(`Splitting text into ${chunks.length} chunk(s)`);
// // // // // // // // //     // Process chunks; the first chunk will allow immediate playback.
// // // // // // // // //     await processChunksSequentially(chunks);
// // // // // // // // //   } catch (error: any) {
// // // // // // // // //     console.error("Error processing text:", error.response?.data?.error || error.message || error);
// // // // // // // // //     alert("Failed to process the text. Please try again.");
// // // // // // // // //   }
// // // // // // // // // };


 
// // // // // // // // // //   // Helper function to build the context summary.
// // // // // // // // // // const buildContextSummary = (segments: Segment[]): string => {
// // // // // // // // // //   // Filter out narrator entries (assuming "narrator" is case-insensitive).
// // // // // // // // // //   const nonNarratorSegments = segments.filter(
// // // // // // // // // //     (seg) => seg.speaker.trim().toLowerCase() !== "narrator"
// // // // // // // // // //   );

// // // // // // // // // //   // Create a unique map of speakers (avoid duplicates).
// // // // // // // // // //   const speakerMap: { [key: string]: { speaker: string; gender: string; voice: string } } = {};
// // // // // // // // // //   nonNarratorSegments.forEach((seg) => {
// // // // // // // // // //     const key = seg.speaker.trim().toLowerCase();
// // // // // // // // // //     if (!speakerMap[key]) {
// // // // // // // // // //       speakerMap[key] = {
// // // // // // // // // //         speaker: seg.speaker,
// // // // // // // // // //         gender: seg.gender || "UNKNOWN",
// // // // // // // // // //         voice: seg.voice || "", // Assumes voice has been assigned.
// // // // // // // // // //       };
// // // // // // // // // //     }
// // // // // // // // // //   });

// // // // // // // // // //   // Optionally, include the last segment.
// // // // // // // // // //   const lastSegment = segments[segments.length - 1] || null;
  
// // // // // // // // // //   const summary = {
// // // // // // // // // //     speakers: Object.values(speakerMap),
// // // // // // // // // //     lastSegment: lastSegment,
// // // // // // // // // //   };

// // // // // // // // // //   return JSON.stringify(summary, null, 2);
// // // // // // // // // // };




// // // // // // // // // // // const processChunksSequentially = async (chunks: string[]) => {
// // // // // // // // // // //   let combinedSegments: Segment[] = [];
// // // // // // // // // // //   let contextSummary = ""; // This will hold the context summary from combined segments.

// // // // // // // // // // //   // Process first chunk separately.
// // // // // // // // // // //   try {
// // // // // // // // // // //     console.log(`Processing first chunk of ${chunks.length}`);
// // // // // // // // // // //     const parseResponse = await axios.post("/.netlify/functions/parse_text", { text: chunks[0] });
// // // // // // // // // //     const { segments: firstChunkSegments } = parseResponse.data;
// // // // // // // // // //     console.log("Parsed segments for first chunk:", firstChunkSegments);

// // // // // // // // // //     // Perform client-side voice assignment.
// // // // // // // // // //     const processedFirstChunk: Segment[] = firstChunkSegments.map((seg: Segment) => {
// // // // // // // // // //       const voiceAssignment = getVoiceForSpeaker(seg.speaker, seg.gender || "UNKNOWN");
// // // // // // // // // //       return { ...seg, voice: voiceAssignment.voice };
// // // // // // // // // //     });

// // // // // // // // // //     combinedSegments = combinedSegments.concat(processedFirstChunk);
// // // // // // // // // //     setSegments(combinedSegments);

// // // // // // // // // //     // Build context summary from the first chunk (excluding Narrator).
// // // // // // // // // //     contextSummary = buildContextSummary(combinedSegments);
// // // // // // // // // //     console.log("Context Summary after first chunk:", contextSummary);

// // // // // // // // // //     // Fetch TTS for the first chunk's segments.
// // // // // // // // // //     const firstChunkTTS = await fetchTTS(processedFirstChunk);
// // // // // // // // // //     console.log("TTS results for first chunk:", firstChunkTTS);
// // // // // // // // // //     setAudioQueue(firstChunkTTS);

// // // // // // // // // //     // Immediately start playback for the first chunk.
// // // // // // // // // //     setIsPlaying(true);
// // // // // // // // // //     setIsPaused(false);
// // // // // // // // // //     setCurrentSegmentIndex(0);
// // // // // // // // // //     setDisplayedText("");

// // // // // // // // // //     // Mark loading as complete.
// // // // // // // // // //     setIsLoading(false);
// // // // // // // // // //   } catch (error: any) {
// // // // // // // // // //     console.error("Error processing first chunk:", error);
// // // // // // // // // //     alert("Failed to process the text. Please try again.");
// // // // // // // // // //     setIsLoading(false);
// // // // // // // // // //     return;
// // // // // // // // // //   }

// // // // // // // // // //   // Process remaining chunks sequentially (without blocking the UI).
// // // // // // // // // //   for (let i = 1; i < chunks.length; i++) {
// // // // // // // // // //     try {
// // // // // // // // // //       console.log(`Processing chunk ${i + 1} of ${chunks.length}`);

// // // // // // // // // //       // Build a context string from the current combined segments.
// // // // // // // // // //       let contextPart = "";
// // // // // // // // // //       if (contextSummary) {
// // // // // // // // // //         contextPart = `Context Summary:\n${contextSummary}\n\n`;
// // // // // // // // // //       }

// // // // // // // // // //       console.log(`Context Summary:\n${contextSummary}\n\n`);

// // // // // // // // // //       // Optionally, you can pass the context as a separate parameter:
// // // // // // // // // //       const parseResponse = await axios.post("/.netlify/functions/parse_text", {
// // // // // // // // // //         text: chunks[i],
// // // // // // // // // //         context: contextPart, // If your API is set up to accept context.
// // // // // // // // // //       });
// // // // // // // // // //       const { segments: chunkSegments } = parseResponse.data;
// // // // // // // // // //       console.log(`Parsed segments for chunk ${i + 1}:`, chunkSegments);

// // // // // // // // // //       const processedSegments: Segment[] = chunkSegments.map((seg: Segment) => {
// // // // // // // // // //         const voiceAssignment = getVoiceForSpeaker(seg.speaker, seg.gender || "UNKNOWN");
// // // // // // // // // //         return { ...seg, voice: voiceAssignment.voice };
// // // // // // // // // //       });
// // // // // // // // // //       combinedSegments = combinedSegments.concat(processedSegments);
// // // // // // // // // //       setSegments(combinedSegments);

// // // // // // // // // //       // Update context summary based on all combined segments so far.
// // // // // // // // // //       contextSummary = buildContextSummary(combinedSegments);
// // // // // // // // // //       console.log("Updated Context Summary:", contextSummary);

// // // // // // // // // //       // Fetch TTS for the current chunk's segments.
// // // // // // // // // //       const ttsResults = await fetchTTS(processedSegments);
// // // // // // // // // //       console.log(`TTS results for chunk ${i + 1}:`, ttsResults);
// // // // // // // // // //       setAudioQueue((prev) => [...prev, ...ttsResults]);
// // // // // // // // // //     } catch (error: any) {
// // // // // // // // // //       console.error(`Error processing chunk ${i + 1}:`, error);
// // // // // // // // // //     }
// // // // // // // // // //   }
// // // // // // // // // //   console.log("All chunks processed.");
// // // // // // // // // // };






// // // // // // // // // //   // Process chunks sequentially, but resolve after the first chunk to allow immediate UI updates.
// // // // // // // // // // const processChunksSequentially = async (chunks: string[]) => {
// // // // // // // // // //   let combinedSegments: Segment[] = [];

// // // // // // // // // //   // Process first chunk separately.
// // // // // // // // // //   try {
// // // // // // // // // //     console.log(`Processing first chunk of ${chunks.length}`);
// // // // // // // // // //     const parseResponse = await axios.post("/.netlify/functions/parse_text", { text: chunks[0] });
// // // // // // // // // //     const { segments: firstChunkSegments } = parseResponse.data;
// // // // // // // // // //     console.log("Parsed segments for first chunk:", firstChunkSegments);

// // // // // // // // // //     // Perform client-side voice assignment.
// // // // // // // // // //     const processedFirstChunk: Segment[] = firstChunkSegments.map((seg: Segment) => {
// // // // // // // // // //       const voiceAssignment = getVoiceForSpeaker(seg.speaker, seg.gender || "UNKNOWN");
// // // // // // // // // //       return { ...seg, voice: voiceAssignment.voice };
// // // // // // // // // //     });

// // // // // // // // // //     combinedSegments = combinedSegments.concat(processedFirstChunk);
// // // // // // // // // //     setSegments(combinedSegments);

// // // // // // // // // //     // Fetch TTS for the first chunk's segments.
// // // // // // // // // //     const firstChunkTTS = await fetchTTS(processedFirstChunk);
// // // // // // // // // //     console.log("TTS results for first chunk:", firstChunkTTS);
// // // // // // // // // //     setAudioQueue(firstChunkTTS);

// // // // // // // // // //     // Immediately start playback for the first chunk.
// // // // // // // // // //     setIsPlaying(true);
// // // // // // // // // //     setIsPaused(false);
// // // // // // // // // //     setCurrentSegmentIndex(0);
// // // // // // // // // //     setDisplayedText("");

// // // // // // // // // //     // Now, mark the loading as complete.
// // // // // // // // // //     setIsLoading(false);
// // // // // // // // // //   } catch (error: any) {
// // // // // // // // // //     console.error("Error processing first chunk:", error);
// // // // // // // // // //     alert("Failed to process the text. Please try again.");
// // // // // // // // // //     setIsLoading(false);
// // // // // // // // // //     return;
// // // // // // // // // //   }

// // // // // // // // // //   // Process the remaining chunks asynchronously (without blocking UI updates).
// // // // // // // // // //   for (let i = 1; i < chunks.length; i++) {
// // // // // // // // // //     try {
// // // // // // // // // //       console.log(`Processing chunk ${i + 1} of ${chunks.length}`);
// // // // // // // // // //       const parseResponse = await axios.post("/.netlify/functions/parse_text", { text: chunks[i] });
// // // // // // // // // //       const { segments: chunkSegments } = parseResponse.data;
// // // // // // // // // //       console.log(`Parsed segments for chunk ${i + 1}:`, chunkSegments);

// // // // // // // // // //       const processedSegments: Segment[] = chunkSegments.map((seg: Segment) => {
// // // // // // // // // //         const voiceAssignment = getVoiceForSpeaker(seg.speaker, seg.gender || "UNKNOWN");
// // // // // // // // // //         return { ...seg, voice: voiceAssignment.voice };
// // // // // // // // // //       });
// // // // // // // // // //       combinedSegments = combinedSegments.concat(processedSegments);
// // // // // // // // // //       setSegments(combinedSegments);

// // // // // // // // // //       const ttsResults = await fetchTTS(processedSegments);
// // // // // // // // // //       console.log(`TTS results for chunk ${i + 1}:`, ttsResults);
// // // // // // // // // //       setAudioQueue((prev) => [...prev, ...ttsResults]);
// // // // // // // // // //     } catch (error: any) {
// // // // // // // // // //       console.error(`Error processing chunk ${i + 1}:`, error);
// // // // // // // // // //     }
// // // // // // // // // //   }
// // // // // // // // // //   console.log("All chunks processed.");
// // // // // // // // // // };

// // // // // // // // // // // Handle Start: split text into chunks and process them sequentially.
// // // // // // // // // // const handleStart = async () => {
// // // // // // // // // //   if (!currentPageContent.trim()) {
// // // // // // // // // //     alert("No text found on this page. Try navigating to another page.");
// // // // // // // // // //     return;
// // // // // // // // // //   }
// // // // // // // // // //   setIsLoading(true);
// // // // // // // // // //   try {
// // // // // // // // // //     const MAX_CHUNK_LENGTH = 1300;
// // // // // // // // // //     const chunks = currentPageContent.length > MAX_CHUNK_LENGTH
// // // // // // // // // //       ? splitTextIntoChunks(currentPageContent, MAX_CHUNK_LENGTH)
// // // // // // // // // //       : [currentPageContent];
// // // // // // // // // //     console.log(`Splitting text into ${chunks.length} chunk(s)`);
// // // // // // // // // //     // Process chunks; the first chunk will allow immediate playback.
// // // // // // // // // //     await processChunksSequentially(chunks);
// // // // // // // // // //   } catch (error: any) {
// // // // // // // // // //     console.error("Error processing text:", error.response?.data?.error || error.message || error);
// // // // // // // // // //     alert("Failed to process the text. Please try again.");
// // // // // // // // // //   }
// // // // // // // // // // };




// // // // // // // // //   /**
// // // // // // // // //  * Splits a large text into chunks (by paragraphs) that are no longer than maxChunkLength characters.
// // // // // // // // //  */
// // // // // // // // // function splitTextIntoChunks(text: string, maxChunkLength: number = 3000): string[] {
// // // // // // // // //   const paragraphs = text.split(/\n+/).filter((p) => p.trim() !== "");
// // // // // // // // //   const chunks: string[] = [];
// // // // // // // // //   let currentChunk = "";

// // // // // // // // //   for (const para of paragraphs) {
// // // // // // // // //     // If adding the next paragraph would exceed maxChunkLength:
// // // // // // // // //     if ((currentChunk + "\n" + para).length > maxChunkLength) {
// // // // // // // // //       if (currentChunk) {
// // // // // // // // //         chunks.push(currentChunk);
// // // // // // // // //         currentChunk = "";
// // // // // // // // //       }
// // // // // // // // //       // If the paragraph itself is longer than maxChunkLength, split it further:
// // // // // // // // //       if (para.length > maxChunkLength) {
// // // // // // // // //         for (let i = 0; i < para.length; i += maxChunkLength) {
// // // // // // // // //           chunks.push(para.slice(i, i + maxChunkLength));
// // // // // // // // //         }
// // // // // // // // //       } else {
// // // // // // // // //         currentChunk = para;
// // // // // // // // //       }
// // // // // // // // //     } else {
// // // // // // // // //       currentChunk += (currentChunk ? "\n" : "") + para;
// // // // // // // // //     }
// // // // // // // // //   }
// // // // // // // // //   if (currentChunk) {
// // // // // // // // //     chunks.push(currentChunk);
// // // // // // // // //   }
// // // // // // // // //   return chunks;
// // // // // // // // // }

// // // // // // // // //   // -------------------------
// // // // // // // // //   // TTS Function (unchanged from older code)
// // // // // // // // //   // -------------------------
// // // // // // // // //   const createSilentAudio = (): string => {
// // // // // // // // //     const silence = new Uint8Array(1000);
// // // // // // // // //     const blob = new Blob([silence], { type: "audio/mp3" });
// // // // // // // // //     const url = URL.createObjectURL(blob);
// // // // // // // // //     console.log("Created silent audio blob URL:", url);
// // // // // // // // //     return url;
// // // // // // // // //   };

// // // // // // // // //   const fetchTTS = async (batch: Segment[]): Promise<string[]> => {
// // // // // // // // //     const audioUrls: string[] = [];
// // // // // // // // //     for (const segment of batch) {
// // // // // // // // //       const cacheKey = `${segment.speaker}:${segment.text}`;
// // // // // // // // //       if (ttsCache.current[cacheKey]) {
// // // // // // // // //         audioUrls.push(ttsCache.current[cacheKey]);
// // // // // // // // //         continue;
// // // // // // // // //       }
// // // // // // // // //       if (!segment.voice) {
// // // // // // // // //         console.error(`❌ No voice assigned for speaker: ${segment.speaker}`);
// // // // // // // // //         audioUrls.push(createSilentAudio());
// // // // // // // // //         continue;
// // // // // // // // //       }
// // // // // // // // //       try {
// // // // // // // // //         // Throttle with a 500ms delay.
// // // // // // // // //         await new Promise((resolve) => setTimeout(resolve, 500));

// // // // // // // // //         const response = await axios.post(
// // // // // // // // //           "/api/tts",
// // // // // // // // //           {
// // // // // // // // //             text: segment.text,
// // // // // // // // //             speaker: segment.speaker,
// // // // // // // // //             voice: segment.voice,
// // // // // // // // //           },
// // // // // // // // //           { responseType: "blob" }
// // // // // // // // //         );

// // // // // // // // //         const contentType = response.headers["content-type"];
// // // // // // // // //         if (!contentType || !contentType.startsWith("audio/")) {
// // // // // // // // //           console.error(
// // // // // // // // //             `❌ Expected audio content but received content-type: ${contentType}. Falling back to silent audio.`
// // // // // // // // //           );
// // // // // // // // //           audioUrls.push(createSilentAudio());
// // // // // // // // //         } else {
// // // // // // // // //           const audioBlob = response.data;
// // // // // // // // //           const audioUrl = URL.createObjectURL(audioBlob);
// // // // // // // // //           console.log("Created TTS audio blob URL:", audioUrl);
// // // // // // // // //           ttsCache.current[cacheKey] = audioUrl;
// // // // // // // // //           audioUrls.push(audioUrl);
// // // // // // // // //         }
// // // // // // // // //       } catch (error: any) {
// // // // // // // // //         console.error(`❌ TTS fetch failed for ${segment.speaker}:`, error);
// // // // // // // // //         audioUrls.push(createSilentAudio());
// // // // // // // // //       }
// // // // // // // // //     }
// // // // // // // // //     return audioUrls;
// // // // // // // // //   };



// // // // // // // // //   // -------------------------
// // // // // // // // //   // Playback & Text Animation
// // // // // // // // //   // -------------------------
// // // // // // // // //   useEffect(() => {
// // // // // // // // //     if (isPlaying && currentSegmentIndex < segments.length && audioQueue.length > 0) {
// // // // // // // // //       if (audioRef.current) return; // Avoid creating multiple audio instances.
// // // // // // // // //       const audioUrl = audioQueue[currentSegmentIndex];
// // // // // // // // //       const currentSegment = segments[currentSegmentIndex];
// // // // // // // // //       const audio = new Audio(audioUrl);
// // // // // // // // //       audio.load(); // Force the audio element to load metadata as soon as possible.
// // // // // // // // //       audioRef.current = audio;

// // // // // // // // //       audio.onended = () => {
// // // // // // // // //         setCurrentSegmentIndex((prev) => prev + 1);
// // // // // // // // //         setDisplayedText("");
// // // // // // // // //         audioRef.current = null;
// // // // // // // // //         if (!isPaused) playCurrentSegment();
// // // // // // // // //       };

// // // // // // // // //       // audio.onloadedmetadata = () => {
// // // // // // // // //       //   const duration = audio.duration;
// // // // // // // // //       //   if (isNaN(duration) || duration === Infinity || duration === 0) {
// // // // // // // // //       //     setTimeout(() => {
// // // // // // // // //       //       if (audioRef.current && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0) {
// // // // // // // // //       //         startTextAnimation(audioRef.current.duration, currentSegment.text);
// // // // // // // // //       //       } else {
// // // // // // // // //       //         console.warn("Audio duration still not available.");
// // // // // // // // //       //       }
// // // // // // // // //       //     }, 100);
// // // // // // // // //       //   } else {
// // // // // // // // //       //     startTextAnimation(duration, currentSegment.text);
// // // // // // // // //       //   }
// // // // // // // // //       // };


// // // // // // // // //       audio.onloadedmetadata = () => {
// // // // // // // // //         let duration = audio.duration;
// // // // // // // // //         if (isNaN(duration) || duration === Infinity || duration === 0) {
// // // // // // // // //           setTimeout(() => {
// // // // // // // // //             if (audioRef.current && audioRef.current.duration > 0) {
// // // // // // // // //               startTextAnimation(audioRef.current.duration, currentSegment.text);
// // // // // // // // //             } else {
// // // // // // // // //               console.warn("Falling back to default duration for animation.");
// // // // // // // // //               startTextAnimation(5, currentSegment.text); // Default to 5 seconds.
// // // // // // // // //             }
// // // // // // // // //           }, 200);
// // // // // // // // //         } else {
// // // // // // // // //           startTextAnimation(duration, currentSegment.text);
// // // // // // // // //         }
// // // // // // // // //       };
      

// // // // // // // // //       audio.play().catch((err) => {
// // // // // // // // //         console.error("Error playing audio:", err);
// // // // // // // // //       });
// // // // // // // // //     } else if (currentSegmentIndex >= segments.length && isPlaying) {
// // // // // // // // //       setIsPlaying(false);
// // // // // // // // //       alert("Playback finished.");
// // // // // // // // //     }

// // // // // // // // //     return () => {
// // // // // // // // //       if (animationIntervalRef.current) {
// // // // // // // // //         clearInterval(animationIntervalRef.current);
// // // // // // // // //       }
// // // // // // // // //     };
// // // // // // // // //   }, [isPlaying, currentSegmentIndex, audioQueue, segments, isPaused]);

// // // // // // // // //   const playCurrentSegment = () => {
// // // // // // // // //     if (audioRef.current && isPaused) {
// // // // // // // // //       audioRef.current.play().catch((err) => console.error("Error resuming audio:", err));
// // // // // // // // //       setIsPaused(false);
// // // // // // // // //     }
// // // // // // // // //   };

// // // // // // // // //   const startTextAnimation = (duration: number, text: string) => {
// // // // // // // // //     if (!text) return;
// // // // // // // // //     const animationDuration = duration * 50; // Adjust multiplier as needed.
// // // // // // // // //     const words = text.split(" ") || [];
// // // // // // // // //     const totalWords = words.length;
// // // // // // // // //     const wordInterval = animationDuration / totalWords;
// // // // // // // // //     let currentWordIndex = 0;
// // // // // // // // //     setDisplayedText("");

// // // // // // // // //     if (animationIntervalRef.current) {
// // // // // // // // //       clearInterval(animationIntervalRef.current);
// // // // // // // // //     }

// // // // // // // // //     animationIntervalRef.current = setInterval(() => {
// // // // // // // // //       if (isPaused) return;
// // // // // // // // //       if (currentWordIndex < totalWords) {
// // // // // // // // //         const word = words[currentWordIndex];
// // // // // // // // //         setDisplayedText((prev) => (prev ? `${prev} ${word}`.trim() : word));
// // // // // // // // //         currentWordIndex++;
// // // // // // // // //       } else {
// // // // // // // // //         clearInterval(animationIntervalRef.current!);
// // // // // // // // //       }
// // // // // // // // //     }, wordInterval);
// // // // // // // // //   };

// // // // // // // // //   // Playback control handlers.
// // // // // // // // //   const handlePlay = () => {
// // // // // // // // //     if (isPlaying && isPaused && audioRef.current) {
// // // // // // // // //       audioRef.current.play().catch((err) => console.error("Error resuming audio:", err));
// // // // // // // // //       setIsPaused(false);
// // // // // // // // //       return;
// // // // // // // // //     }
// // // // // // // // //     handleStart();
// // // // // // // // //   };

// // // // // // // // //   const handlePause = () => {
// // // // // // // // //     if (audioRef.current) {
// // // // // // // // //       audioRef.current.pause();
// // // // // // // // //     }
// // // // // // // // //     setIsPaused(true);
// // // // // // // // //   };

// // // // // // // // //   const handleStop = () => {
// // // // // // // // //     if (audioRef.current) {
// // // // // // // // //       audioRef.current.pause();
// // // // // // // // //       audioRef.current.currentTime = 0;
// // // // // // // // //       audioRef.current = null;
// // // // // // // // //     }
// // // // // // // // //     if (animationIntervalRef.current) {
// // // // // // // // //       clearInterval(animationIntervalRef.current);
// // // // // // // // //     }
// // // // // // // // //     setIsPlaying(false);
// // // // // // // // //     setIsPaused(false);
// // // // // // // // //     setCurrentSegmentIndex(0);
// // // // // // // // //     setDisplayedText("");
// // // // // // // // //   };

// // // // // // // // //   const handleBackward = () => {
// // // // // // // // //     if (currentSegmentIndex > 0) {
// // // // // // // // //       if (audioRef.current) {
// // // // // // // // //         audioRef.current.pause();
// // // // // // // // //         audioRef.current = null;
// // // // // // // // //       }
// // // // // // // // //       if (animationIntervalRef.current) {
// // // // // // // // //         clearInterval(animationIntervalRef.current);
// // // // // // // // //       }
// // // // // // // // //       setCurrentSegmentIndex((prev) => prev - 1);
// // // // // // // // //       setDisplayedText("");
// // // // // // // // //       playCurrentSegment();
// // // // // // // // //     }
// // // // // // // // //   };

// // // // // // // // //   const handleForward = () => {
// // // // // // // // //     if (currentSegmentIndex < segments.length - 1) {
// // // // // // // // //       if (audioRef.current) {
// // // // // // // // //         audioRef.current.pause();
// // // // // // // // //         audioRef.current = null;
// // // // // // // // //       }
// // // // // // // // //       if (animationIntervalRef.current) {
// // // // // // // // //         clearInterval(animationIntervalRef.current);
// // // // // // // // //       }
// // // // // // // // //       setCurrentSegmentIndex((prev) => prev + 1);
// // // // // // // // //       setDisplayedText("");
// // // // // // // // //       playCurrentSegment();
// // // // // // // // //     }
// // // // // // // // //   };

// // // // // // // // //   return (
// // // // // // // // //     <div className="absolute inset-0 z-50 flex items-center justify-center">
// // // // // // // // //       <div className={`relative bg-white rounded-lg shadow-lg ${!isPlaying ? "w-[650px] max-h-[85%] p-6" : "w-[800px] h-[85%]"} transition-all duration-300 overflow-hidden`}>
// // // // // // // // //         {/* Always-visible Close Icon */}
// // // // // // // // //         <button
// // // // // // // // //           className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 z-50"
// // // // // // // // //           onClick={onClose}
// // // // // // // // //           aria-label="Close"
// // // // // // // // //         >
// // // // // // // // //           <X size={20} />
// // // // // // // // //         </button>

// // // // // // // // //         {!isPlaying && !isLoading ? (
// // // // // // // // //           <div className="flex flex-col items-center gap-4 relative h-full">
// // // // // // // // //             <Button onClick={handlePlay} className="bg-yellow-700 hover:bg-yellow-800 text-white px-6 py-2">
// // // // // // // // //               Start Writing
// // // // // // // // //             </Button>
// // // // // // // // //           </div>
// // // // // // // // //         ) : isLoading ? (
// // // // // // // // //           <div className="flex items-center justify-center h-full">
// // // // // // // // //             <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-yellow-700"></div>
// // // // // // // // //           </div>
// // // // // // // // //         ) : (
// // // // // // // // //           <div className="relative h-full w-full bg-[url('/images/olderpaper.jpg')] bg-cover bg-center p-8 overflow-y-auto" ref={textContainerRef}>
// // // // // // // // //             <p className="text-2xl leading-relaxed font-serif">{displayedText}</p>
// // // // // // // // //           </div>
// // // // // // // // //         )}

// // // // // // // // //         {isPlaying && (
// // // // // // // // //           <div className="absolute bottom-4 left-4 flex gap-4">
// // // // // // // // //             <Button onClick={handleBackward} className="bg-gray-600 hover:bg-gray-700 text-white">
// // // // // // // // //               Back
// // // // // // // // //             </Button>
// // // // // // // // //             {isPaused ? (
// // // // // // // // //               <Button onClick={handlePlay} className="bg-green-600 hover:bg-green-700 text-white">
// // // // // // // // //                 <Play size={16} /> Resume
// // // // // // // // //               </Button>
// // // // // // // // //             ) : (
// // // // // // // // //               <Button onClick={handlePause} className="bg-blue-600 hover:bg-blue-700 text-white">
// // // // // // // // //                 <Pause size={16} /> Pause
// // // // // // // // //               </Button>
// // // // // // // // //             )}
// // // // // // // // //             <Button onClick={handleForward} className="bg-gray-600 hover:bg-gray-700 text-white">
// // // // // // // // //               Forward
// // // // // // // // //             </Button>
// // // // // // // // //             <Button onClick={handleStop} className="bg-red-600 hover:bg-red-700 text-white">
// // // // // // // // //               <X size={16} /> Stop
// // // // // // // // //             </Button>
// // // // // // // // //           </div>
// // // // // // // // //         )}
// // // // // // // // //       </div>
// // // // // // // // //     </div>
// // // // // // // // //   );
// // // // // // // // // };

// // // // // // // // // export default PlayMode;

















// // // // // // // // import React, { useState, useEffect, useRef } from "react";
// // // // // // // // import { Button } from "@/components/ui/button";
// // // // // // // // import { X, Play, Pause } from "lucide-react";
// // // // // // // // import axios from "axios";
// // // // // // // // import { getVoiceForSpeaker, VoiceAssignment } from "@/pages/api/getVoices";
// // // // // // // // import { loadVoiceAssignments, saveVoiceAssignments } from "@/lib/voiceStorage";


// // // // // // // // // Client-side interfaces (in your PlayMode file)
// // // // // // // // export interface Segment {
// // // // // // // //   speaker: string;
// // // // // // // //   text: string;
// // // // // // // //   voice?: string; // This will hold the assigned voice string.
// // // // // // // //   gender: "MALE" | "FEMALE"
// // // // // // // // }

// // // // // // // // export interface VoiceMapping {
// // // // // // // //   voice: string;
// // // // // // // //   source: "predefined" | "generated";
// // // // // // // // }

// // // // // // // // export interface VoiceMappings {
// // // // // // // //   [key: string]: VoiceMapping;
// // // // // // // // }

// // // // // // // // // Define the type for TTS results.
// // // // // // // // interface TTSResult {
// // // // // // // //   audioUrl: string;
// // // // // // // //   failed: boolean;
// // // // // // // // }



// // // // // // // // const PlayMode: React.FC<{ 
// // // // // // // //   currentPageContent: string;  
// // // // // // // //   onClose: () => void; 
// // // // // // // //   extractText: () => void; 
// // // // // // // // }> = ({ currentPageContent, onClose, extractText }) => {
  
// // // // // // // //   const [isPlaying, setIsPlaying] = useState(false);
// // // // // // // //   const [isPaused, setIsPaused] = useState(false);
// // // // // // // //   const [isLoading, setIsLoading] = useState(false); 
// // // // // // // //   const [segments, setSegments] = useState<Segment[]>([]);
// // // // // // // //   // const [voiceMappings, setVoiceMappings] = useState<VoiceMappings>({});
// // // // // // // //   const [voiceMappings, setVoiceMappings] = useState<VoiceMappings>(() => loadVoiceAssignments());
// // // // // // // //   const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
// // // // // // // //   const [displayedText, setDisplayedText] = useState("");
// // // // // // // //   const [audioQueue, setAudioQueue] = useState<string[]>([]);
// // // // // // // //   const [audioBuffer, setAudioBuffer] = useState<string[]>([]);
  
// // // // // // // //   const audioRef = useRef<HTMLAudioElement | null>(null);
// // // // // // // //   const textContainerRef = useRef<HTMLDivElement | null>(null);
// // // // // // // //   const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
// // // // // // // //   const ttsCache = useRef<{ [key: string]: string }>({});
// // // // // // // //   const [ttsResults, setTTSResults] = useState<TTSResult[]>([]);
// // // // // // // //   const currentTTSResult = ttsResults && ttsResults[currentSegmentIndex];
// // // // // // // //   const currentSegment = segments && segments[currentSegmentIndex];
// // // // // // // //   const textToDisplay = currentTTSResult?.failed
// // // // // // // //     ? currentSegment?.text || ""
// // // // // // // //     : displayedText;
  
  


// // // // // // // //   // Helper function: Update persistent voice mappings.
// // // // // // // //   const updateVoiceMapping = (speakerKey: string, assignment: VoiceAssignment) => {
// // // // // // // //     const newMappings = { ...voiceMappings, [speakerKey]: assignment };
// // // // // // // //     setVoiceMappings(newMappings);
// // // // // // // //     saveVoiceAssignments(newMappings);
// // // // // // // //   };
  

// // // // // // // //   // -------------------------
// // // // // // // //   // Helper: Build context summary from segments.
// // // // // // // //   // It extracts unique speakers (ignoring "narrator") and the last segment.
// // // // // // // //   const buildContextSummary = (segments: Segment[]): string => {
// // // // // // // //     // Filter out the narrator entries (assuming "narrator" is case‑insensitive).
// // // // // // // //     const nonNarrator = segments.filter(
// // // // // // // //       (seg) => seg.speaker.trim().toLowerCase() !== "narrator"
// // // // // // // //     );


// // // // // // // //     // Create a map for unique speakers.
// // // // // // // //     const speakerMap: { [key: string]: { speaker: string; gender: string; voice: string } } = {};
// // // // // // // //     nonNarrator.forEach((seg) => {
// // // // // // // //       const key = seg.speaker.trim().toLowerCase();
// // // // // // // //       const gender = (seg.gender === "MALE" || seg.gender === "FEMALE") ? seg.gender : "MALE"; // Default to "MALE" if seg.gender is not MALE or FEMALE
// // // // // // // //       if (!speakerMap[key]) {
// // // // // // // //         speakerMap[key] = {
// // // // // // // //           speaker: seg.speaker,
// // // // // // // //           gender: gender, //Use "gender" here to ensure gender is always MALE or FEMALE
// // // // // // // //           voice: seg.voice || "",
// // // // // // // //         };
// // // // // // // //       }
// // // // // // // //     });

// // // // // // // //     // Use the last segment from all segments.
// // // // // // // //     const lastSegment = segments[segments.length - 1] || null;

// // // // // // // //     // Build the summary object.
// // // // // // // //     const summary = {
// // // // // // // //       speakers: Object.values(speakerMap),
// // // // // // // //       lastSegment: lastSegment,
// // // // // // // //     };

// // // // // // // //     return JSON.stringify(summary, null, 2);
// // // // // // // //   };



// // // // // // // //   // Restore auto-scroll when displayedText updates.
// // // // // // // //   useEffect(() => {
// // // // // // // //     if (textContainerRef.current) {
// // // // // // // //       textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
// // // // // // // //     }
// // // // // // // //   }, [displayedText]);

// // // // // // // //   // Preload background image.
// // // // // // // //   useEffect(() => {
// // // // // // // //     const preloadImage = new Image();
// // // // // // // //     preloadImage.src = "/images/olderpaper.jpg";
// // // // // // // //   }, []);

// // // // // // // //   // Fetch text automatically when PlayMode opens.
// // // // // // // //   useEffect(() => {
// // // // // // // //     extractText();
// // // // // // // //   }, []);


// // // // // // // //   // -------------------------
// // // // // // // //   // Sequential Chunk Processing
// // // // // // // //   // -------------------------
// // // // // // // //   const processChunksSequentially = async (chunks: string[]) => {
// // // // // // // //     let combinedSegments: Segment[] = [];
// // // // // // // //     let contextSummary = ""; // This will be built from combinedSegments.

// // // // // // // //     // Process each chunk sequentially.
// // // // // // // //     for (let i = 0; i < chunks.length; i++) {
// // // // // // // //       try {
// // // // // // // //         console.log(`Processing chunk ${i + 1} of ${chunks.length}`);

// // // // // // // //         // Build payload. For the first chunk, no context is needed.
// // // // // // // //         const payload: any = { text: chunks[i] };
// // // // // // // //         if (i > 0 && contextSummary) {
// // // // // // // //           payload.context = `Context Summary:\n${contextSummary}`;
// // // // // // // //         }

// // // // // // // //         const parseResponse = await axios.post("/.netlify/functions/parse_text", payload);
// // // // // // // //         const { segments: chunkSegments } = parseResponse.data;
// // // // // // // //         console.log(`Parsed segments for chunk ${i + 1}:`, chunkSegments);
// // // // // // // //         const processedSegments: Segment[] = chunkSegments.map((seg: Segment) => {
// // // // // // // //           const normalizedSpeaker = seg.speaker.trim().toLowerCase();
// // // // // // // //           let assignment = voiceMappings[normalizedSpeaker];
        
// // // // // // // //           // If no existing assignment, compute one and update the mappings.
// // // // // // // //           if (!assignment) {
// // // // // // // //             // Ensure that seg.gender is valid (default to "MALE" if necessary).
// // // // // // // //             const gender: "MALE" | "FEMALE" = (seg.gender === "MALE" || seg.gender === "FEMALE") ? seg.gender : "MALE";
// // // // // // // //             assignment = getVoiceForSpeaker(seg.speaker, gender);
// // // // // // // //             // Update persistent voice mappings using your helper.
// // // // // // // //             updateVoiceMapping(normalizedSpeaker, assignment);
// // // // // // // //           }
        
// // // // // // // //           // Return the segment with the assigned voice and the confirmed gender.
// // // // // // // //           return { ...seg, voice: assignment.voice, gender: seg.gender };
// // // // // // // //         });
        

// // // // // // // //         // Append the processed segments.
// // // // // // // //         combinedSegments = combinedSegments.concat(processedSegments);
// // // // // // // //         setSegments(combinedSegments);

// // // // // // // //         // Update the context summary based on all combined segments so far.
// // // // // // // //         contextSummary = buildContextSummary(combinedSegments);
// // // // // // // //         console.log("Updated Context Summary:", contextSummary);


// // // // // // // //         const ttsResultsForChunk = await fetchTTS(processedSegments);
// // // // // // // //         setTTSResults((prev) => [...prev, ...ttsResultsForChunk]);
// // // // // // // //         setAudioQueue((prev) => [...prev, ...ttsResultsForChunk.map(result => result.audioUrl)]);



// // // // // // // //         // For the very first chunk, start playback immediately.
// // // // // // // //         if (i === 0) {
// // // // // // // //           setIsPlaying(true);
// // // // // // // //           setIsPaused(false);
// // // // // // // //           setCurrentSegmentIndex(0);
// // // // // // // //           setDisplayedText("");
// // // // // // // //           // Mark loading as complete.
// // // // // // // //           setIsLoading(false);
// // // // // // // //         }
// // // // // // // //       } catch (error: any) {
// // // // // // // //         console.error(
// // // // // // // //           `Error processing chunk ${i + 1}:`,
// // // // // // // //           error.response?.data?.error || error.message || error
// // // // // // // //         );
// // // // // // // //         setIsLoading(false);
// // // // // // // //       }
// // // // // // // //     }
// // // // // // // //     console.log("All chunks processed.");
// // // // // // // //   };


// // // // // // // //   // Handle Start: split text into chunks and process them sequentially.
// // // // // // // //   const handleStart = async () => {
// // // // // // // //     if (!currentPageContent.trim()) {
// // // // // // // //       alert("No text found on this page. Try navigating to another page.");
// // // // // // // //       return;
// // // // // // // //     }
// // // // // // // //     setIsLoading(true);
// // // // // // // //     try {
// // // // // // // //       const MAX_CHUNK_LENGTH = 1500;
// // // // // // // //       const chunks = currentPageContent.length > MAX_CHUNK_LENGTH
// // // // // // // //         ? splitTextIntoChunks(currentPageContent, MAX_CHUNK_LENGTH)
// // // // // // // //         : [currentPageContent];
// // // // // // // //       console.log(`Splitting text into ${chunks.length} chunk(s)`);
  
// // // // // // // //       await processChunksSequentially(chunks);
// // // // // // // //     } catch (error: any) {
// // // // // // // //       console.error("Error processing text:", error.response?.data?.error || error.message || error);
// // // // // // // //       alert("Failed to process the text. Please try again.");
// // // // // // // //     } finally {
// // // // // // // //       setIsLoading(false);
// // // // // // // //     }
// // // // // // // //   };




// // // // // // // //   /**
// // // // // // // //    * Splits a large text into chunks (by paragraphs) that are no longer than maxChunkLength characters.
// // // // // // // //    */
// // // // // // // //   function splitTextIntoChunks(text: string, maxChunkLength: number = 3000): string[] {
// // // // // // // //     const paragraphs = text.split(/\n+/).filter((p) => p.trim() !== "");
// // // // // // // //     const chunks: string[] = [];
// // // // // // // //     let currentChunk = "";
  
// // // // // // // //     for (const para of paragraphs) {
// // // // // // // //       if ((currentChunk + "\n" + para).length > maxChunkLength) {
// // // // // // // //         if (currentChunk) {
// // // // // // // //           chunks.push(currentChunk);
// // // // // // // //           currentChunk = "";
// // // // // // // //         }
// // // // // // // //         if (para.length > maxChunkLength) {
// // // // // // // //           for (let i = 0; i < para.length; i += maxChunkLength) {
// // // // // // // //             chunks.push(para.slice(i, i + maxChunkLength));
// // // // // // // //           }
// // // // // // // //         } else {
// // // // // // // //           currentChunk = para;
// // // // // // // //         }
// // // // // // // //       } else {
// // // // // // // //         currentChunk += (currentChunk ? "\n" : "") + para;
// // // // // // // //       }
// // // // // // // //     }
// // // // // // // //     if (currentChunk) {
// // // // // // // //       chunks.push(currentChunk);
// // // // // // // //     }
// // // // // // // //     return chunks;
// // // // // // // //   }
  
// // // // // // // //   // -------------------------
// // // // // // // //   // TTS Function (unchanged from older code)
// // // // // // // //   // -------------------------
// // // // // // // //   const createSilentAudio = (): string => {
// // // // // // // //     const silence = new Uint8Array(1000);
// // // // // // // //     const blob = new Blob([silence], { type: "audio/mp3" });
// // // // // // // //     const url = URL.createObjectURL(blob);
// // // // // // // //     console.log("Created silent audio blob URL:", url);
// // // // // // // //     return url;
// // // // // // // //   };
  

  
// // // // // // // //   // const fetchTTS = async (batch: Segment[]): Promise<TTSResult[]> => {
// // // // // // // //   //   const results: TTSResult[] = [];
// // // // // // // //   //   for (const segment of batch) {
// // // // // // // //   //     const cacheKey = `${segment.speaker}:${segment.text}`;
// // // // // // // //   //     if (ttsCache.current[cacheKey]) {
// // // // // // // //   //       results.push({ audioUrl: ttsCache.current[cacheKey], failed: false });
// // // // // // // //   //       continue;
// // // // // // // //   //     }
// // // // // // // //   //     if (!segment.voice) {
// // // // // // // //   //       console.error(`❌ No voice assigned for speaker: ${segment.speaker}`);
// // // // // // // //   //       results.push({ audioUrl: createSilentAudio(), failed: true });
// // // // // // // //   //       continue;
// // // // // // // //   //     }
      
// // // // // // // //   //     let attempt = 0;
// // // // // // // //   //     let success = false;
// // // // // // // //   //     let audioUrl = "";
// // // // // // // //   //     let failed = false;
      
// // // // // // // //   //     while (attempt < 3 && !success) {
// // // // // // // //   //       attempt++;
// // // // // // // //   //       console.log(`Attempt ${attempt} for TTS of speaker: ${segment.speaker}`);
// // // // // // // //   //       try {
// // // // // // // //   //         // Small delay between attempts.
// // // // // // // //   //         await new Promise((resolve) => setTimeout(resolve, 500));
          
// // // // // // // //   //         const response = await axios.post(
// // // // // // // //   //           "/api/tts",
// // // // // // // //   //           {
// // // // // // // //   //             text: segment.text,
// // // // // // // //   //             speaker: segment.speaker,
// // // // // // // //   //             voice: segment.voice,
// // // // // // // //   //             gender: segment.gender,
// // // // // // // //   //             voiceMapping: voiceMappings  // Pass the mapping under the property name the server expects
// // // // // // // //   //           },
// // // // // // // //   //           { responseType: "blob" }
// // // // // // // //   //         );
    
// // // // // // // //   //         const contentType = response.headers["content-type"];
// // // // // // // //   //         if (!contentType || !contentType.startsWith("audio/")) {
// // // // // // // //   //           throw new Error(`Unexpected content-type: ${contentType}`);
// // // // // // // //   //         }
          
// // // // // // // //   //         const audioBlob = response.data;
// // // // // // // //   //         audioUrl = URL.createObjectURL(audioBlob);
// // // // // // // //   //         ttsCache.current[cacheKey] = audioUrl;
// // // // // // // //   //         console.log(`✅ TTS success for ${segment.speaker} on attempt ${attempt}`);
// // // // // // // //   //         success = true;
// // // // // // // //   //       } catch (error: any) {
// // // // // // // //   //         console.error(`❌ TTS attempt ${attempt} failed for ${segment.speaker}:`, error.message);
// // // // // // // //   //         if (attempt >= 3) {
// // // // // // // //   //           // After exhausting retries, use fallback silent audio.
// // // // // // // //   //           audioUrl = createSilentAudio();
// // // // // // // //   //           failed = true;
// // // // // // // //   //           console.warn(`Using silent audio fallback for ${segment.speaker} after ${attempt} attempts.`);
// // // // // // // //   //         }
// // // // // // // //   //       }
// // // // // // // //   //     }
// // // // // // // //   //     results.push({ audioUrl, failed });
// // // // // // // //   //   }
// // // // // // // //   //   return results;
// // // // // // // //   // };

  

// // // // // // // //   const fetchTTS = async (batch: Segment[]): Promise<TTSResult[]> => {
// // // // // // // //     const results: TTSResult[] = [];
// // // // // // // //     for (const segment of batch) {
// // // // // // // //       const cacheKey = `${segment.speaker}:${segment.text}`;
// // // // // // // //       if (ttsCache.current[cacheKey]) {
// // // // // // // //         results.push({ audioUrl: ttsCache.current[cacheKey], failed: false });
// // // // // // // //         continue;
// // // // // // // //       }
// // // // // // // //       if (!segment.voice) {
// // // // // // // //         console.error(`❌ No voice assigned for speaker: ${segment.speaker}`);
// // // // // // // //         results.push({ audioUrl: createSilentAudio(), failed: true });
// // // // // // // //         continue;
// // // // // // // //       }
      
// // // // // // // //       let attempt = 0;
// // // // // // // //       let success = false;
// // // // // // // //       let audioUrl = "";
// // // // // // // //       let failed = false;
      
// // // // // // // //       while (attempt < 3 && !success) {
// // // // // // // //         attempt++;
// // // // // // // //         console.log(`Attempt ${attempt} for TTS of speaker: ${segment.speaker}`);
        
// // // // // // // //         // For the first attempt, you might wait a short period.
// // // // // // // //         // For subsequent attempts, wait longer (e.g., 1 minute)
// // // // // // // //         if (attempt === 1) {
// // // // // // // //           await new Promise((resolve) => setTimeout(resolve, 50));
// // // // // // // //         } else {
// // // // // // // //           console.log(`Waiting 1 minute before next attempt for ${segment.speaker}...`);
// // // // // // // //           await new Promise((resolve) => setTimeout(resolve, 30000));
// // // // // // // //         }
        
// // // // // // // //         try {
// // // // // // // //           const response = await axios.post(
// // // // // // // //             "/.netlify/functions/tts",
// // // // // // // //             {
// // // // // // // //               text: segment.text,
// // // // // // // //               speaker: segment.speaker,
// // // // // // // //               voice: segment.voice,
// // // // // // // //               gender: segment.gender,
// // // // // // // //               voiceMapping: voiceMappings // Pass the mapping under the property name the server expects
// // // // // // // //             },
// // // // // // // //             { 
// // // // // // // //               responseType: "blob", // expecting a binary blob
// // // // // // // //               // timeout: 60000  // Set timeout to 60 seconds, adjust as needed
// // // // // // // //             }
// // // // // // // //           );
      
// // // // // // // //           const contentType = response.headers["content-type"];
// // // // // // // //           if (!contentType || !contentType.startsWith("audio/")) {
// // // // // // // //             throw new Error(`Unexpected content-type: ${contentType}`);
// // // // // // // //           }
          
// // // // // // // //           // The function returns a binary audio blob.
// // // // // // // //           const audioBlob = response.data;
// // // // // // // //           audioUrl = URL.createObjectURL(audioBlob);
// // // // // // // //           ttsCache.current[cacheKey] = audioUrl;
// // // // // // // //           console.log(`✅ TTS success for ${segment.speaker} on attempt ${attempt}`);
// // // // // // // //           success = true;
// // // // // // // //         } catch (error: any) {
// // // // // // // //           console.error(`❌ TTS attempt ${attempt} failed for ${segment.speaker}:`, error.message);
// // // // // // // //           if (attempt >= 3) {
// // // // // // // //             // After exhausting retries, use fallback silent audio.
// // // // // // // //             audioUrl = createSilentAudio();
// // // // // // // //             failed = true;
// // // // // // // //             console.warn(`Using silent audio fallback for ${segment.speaker} after ${attempt} attempts.`);
// // // // // // // //           }
// // // // // // // //         }
// // // // // // // //       }
// // // // // // // //       results.push({ audioUrl, failed });
// // // // // // // //     }
// // // // // // // //     return results;
// // // // // // // //   };
  




// // // // // // // //   // -------------------------
// // // // // // // //   // Playback & Text Animation
// // // // // // // //   // -------------------------
// // // // // // // //   useEffect(() => {
// // // // // // // //     if (isPlaying && currentSegmentIndex < segments.length && audioQueue.length > 0) {
// // // // // // // //       if (audioRef.current) return; // Avoid multiple audio instances.
// // // // // // // //       const audioUrl = audioQueue[currentSegmentIndex];
// // // // // // // //       const currentSegment = segments[currentSegmentIndex];
// // // // // // // //       const audio = new Audio(audioUrl);
// // // // // // // //       audio.load(); // Force load metadata.
// // // // // // // //       audioRef.current = audio;
  
// // // // // // // //       audio.onended = () => {
// // // // // // // //         setCurrentSegmentIndex((prev) => prev + 1);
// // // // // // // //         setDisplayedText("");
// // // // // // // //         audioRef.current = null;
// // // // // // // //         if (!isPaused) playCurrentSegment();
// // // // // // // //       };
  
// // // // // // // //       audio.onloadedmetadata = () => {
// // // // // // // //         let duration = audio.duration;
// // // // // // // //         if (isNaN(duration) || duration === Infinity || duration === 0) {
// // // // // // // //           setTimeout(() => {
// // // // // // // //             if (audioRef.current && audioRef.current.duration > 0) {
// // // // // // // //               startTextAnimation(audioRef.current.duration, currentSegment.text);
// // // // // // // //             } else {
// // // // // // // //               console.warn("Falling back to default duration for animation.");
// // // // // // // //               startTextAnimation(5, currentSegment.text); // Default to 5 seconds.
// // // // // // // //             }
// // // // // // // //           }, 200);
// // // // // // // //         } else {
// // // // // // // //           startTextAnimation(duration, currentSegment.text);
// // // // // // // //         }
// // // // // // // //       };
  
// // // // // // // //       audio.play().catch((err) => {
// // // // // // // //         console.error("Error playing audio:", err);
// // // // // // // //       });
// // // // // // // //     } else if (currentSegmentIndex >= segments.length && isPlaying) {
// // // // // // // //       setIsPlaying(false);
// // // // // // // //       alert("Playback finished.");
// // // // // // // //     }
  
// // // // // // // //     return () => {
// // // // // // // //       if (animationIntervalRef.current) {
// // // // // // // //         clearInterval(animationIntervalRef.current);
// // // // // // // //       }
// // // // // // // //     };
// // // // // // // //   }, [isPlaying, currentSegmentIndex, audioQueue, segments, isPaused]);
  
// // // // // // // //   const playCurrentSegment = () => {
// // // // // // // //     if (audioRef.current && isPaused) {
// // // // // // // //       audioRef.current.play().catch((err) => console.error("Error resuming audio:", err));
// // // // // // // //       setIsPaused(false);
// // // // // // // //     }
// // // // // // // //   };
  
// // // // // // // //   const startTextAnimation = (duration: number, text: string) => {
// // // // // // // //     if (!text) return;
// // // // // // // //     const animationDuration = duration * 0; // Adjust multiplier as needed.
// // // // // // // //     const words = text.split(" ") || [];
// // // // // // // //     const totalWords = words.length;
// // // // // // // //     const wordInterval = animationDuration / totalWords;
// // // // // // // //     let currentWordIndex = 0;
// // // // // // // //     setDisplayedText("");
  
// // // // // // // //     if (animationIntervalRef.current) {
// // // // // // // //       clearInterval(animationIntervalRef.current);
// // // // // // // //     }
  
// // // // // // // //     animationIntervalRef.current = setInterval(() => {
// // // // // // // //       if (isPaused) return;
// // // // // // // //       if (currentWordIndex < totalWords) {
// // // // // // // //         const word = words[currentWordIndex];
// // // // // // // //         setDisplayedText((prev) => (prev ? `${prev} ${word}`.trim() : word));
// // // // // // // //         currentWordIndex++;
// // // // // // // //       } else {
// // // // // // // //         clearInterval(animationIntervalRef.current!);
// // // // // // // //       }
// // // // // // // //     }, wordInterval);
// // // // // // // //   };
  
// // // // // // // //   // Playback control handlers.
// // // // // // // //   const handlePlay = () => {
// // // // // // // //     if (isPlaying && isPaused && audioRef.current) {
// // // // // // // //       audioRef.current.play().catch((err) => console.error("Error resuming audio:", err));
// // // // // // // //       setIsPaused(false);
// // // // // // // //       return;
// // // // // // // //     }
// // // // // // // //     handleStart();
// // // // // // // //   };
  
// // // // // // // //   const handlePause = () => {
// // // // // // // //     if (audioRef.current) {
// // // // // // // //       audioRef.current.pause();
// // // // // // // //     }
// // // // // // // //     setIsPaused(true);
// // // // // // // //   };
  
// // // // // // // //   const handleStop = () => {
// // // // // // // //     if (audioRef.current) {
// // // // // // // //       audioRef.current.pause();
// // // // // // // //       audioRef.current.currentTime = 0;
// // // // // // // //       audioRef.current = null;
// // // // // // // //     }
// // // // // // // //     if (animationIntervalRef.current) {
// // // // // // // //       clearInterval(animationIntervalRef.current);
// // // // // // // //     }
// // // // // // // //     setIsPlaying(false);
// // // // // // // //     setIsPaused(false);
// // // // // // // //     setCurrentSegmentIndex(0);
// // // // // // // //     setDisplayedText("");
// // // // // // // //   };
  
// // // // // // // //   const handleBackward = () => {
// // // // // // // //     if (currentSegmentIndex > 0) {
// // // // // // // //       if (audioRef.current) {
// // // // // // // //         audioRef.current.pause();
// // // // // // // //         audioRef.current = null;
// // // // // // // //       }
// // // // // // // //       if (animationIntervalRef.current) {
// // // // // // // //         clearInterval(animationIntervalRef.current);
// // // // // // // //       }
// // // // // // // //       setCurrentSegmentIndex((prev) => prev - 1);
// // // // // // // //       setDisplayedText("");
// // // // // // // //       playCurrentSegment();
// // // // // // // //     }
// // // // // // // //   };
  
// // // // // // // //   const handleForward = () => {
// // // // // // // //     if (currentSegmentIndex < segments.length - 1) {
// // // // // // // //       if (audioRef.current) {
// // // // // // // //         audioRef.current.pause();
// // // // // // // //         audioRef.current = null;
// // // // // // // //       }
// // // // // // // //       if (animationIntervalRef.current) {
// // // // // // // //         clearInterval(animationIntervalRef.current);
// // // // // // // //       }
// // // // // // // //       setCurrentSegmentIndex((prev) => prev + 1);
// // // // // // // //       setDisplayedText("");
// // // // // // // //       playCurrentSegment();
// // // // // // // //     }
// // // // // // // //   };



// // // // // // // //   return (
// // // // // // // //     <div className="absolute inset-0 z-50 flex items-center justify-center">
// // // // // // // //       <div
// // // // // // // //         className={`relative bg-white text-gray-900 rounded-lg shadow-lg ${
// // // // // // // //           !isPlaying ? "w-[650px] max-h-[85%] p-6" : "w-[800px] h-[85%]"
// // // // // // // //         } transition-all duration-300 overflow-hidden`}
// // // // // // // //       >
// // // // // // // //         {/* Always-visible Close Icon */}
// // // // // // // //         <button
// // // // // // // //           className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 z-50"
// // // // // // // //           onMouseDown={() => {
// // // // // // // //             if (typeof window !== "undefined" && window.speechSynthesis) {
// // // // // // // //               window.speechSynthesis.cancel()
// // // // // // // //             }
// // // // // // // //           }}
// // // // // // // //           onClick={onClose}
// // // // // // // //           aria-label="Close"
// // // // // // // //         >
// // // // // // // //           <X size={20} />
// // // // // // // //         </button>

// // // // // // // //         {!isPlaying && !isLoading ? (
// // // // // // // //           <div className="flex flex-col items-center gap-4 relative h-full">
// // // // // // // //             <Button
// // // // // // // //               onClick={handlePlay}
// // // // // // // //               className="bg-yellow-700 hover:bg-yellow-800 text-white px-6 py-2"
// // // // // // // //             >
// // // // // // // //               Start Audiobook
// // // // // // // //             </Button>
// // // // // // // //           </div>
// // // // // // // //         ) : isLoading ? (
// // // // // // // //           <div className="flex items-center justify-center h-full">
// // // // // // // //             <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-yellow-700"></div>
// // // // // // // //           </div>
// // // // // // // //         ) : (
// // // // // // // //           <div
// // // // // // // //             className="relative h-full w-full bg-[url('/images/olderpaper.jpg')] bg-cover bg-center p-8 overflow-y-auto"
// // // // // // // //             ref={textContainerRef}
// // // // // // // //           >
// // // // // // // //             {currentTTSResult?.failed && (
// // // // // // // //               <div className="mb-2 text-sm text-red-600">
// // // // // // // //                 Audio unavailable – please read the text below.
// // // // // // // //               </div>
// // // // // // // //             )}
// // // // // // // //             <p className="text-2xl leading-relaxed font-serif">{textToDisplay}</p>
// // // // // // // //           </div>
// // // // // // // //         )}

// // // // // // // //         {isPlaying && (
// // // // // // // //           <div className="absolute bottom-4 left-4 flex gap-4">
// // // // // // // //             <Button onClick={handleBackward} className="bg-gray-600 hover:bg-gray-700 text-white">
// // // // // // // //               Back
// // // // // // // //             </Button>
// // // // // // // //             {isPaused ? (
// // // // // // // //               <Button onClick={handlePlay} className="bg-green-600 hover:bg-green-700 text-white">
// // // // // // // //                 <Play size={16} /> Resume
// // // // // // // //               </Button>
// // // // // // // //             ) : (
// // // // // // // //               <Button onClick={handlePause} className="bg-blue-600 hover:bg-blue-700 text-white">
// // // // // // // //                 <Pause size={16} /> Pause
// // // // // // // //               </Button>
// // // // // // // //             )}
// // // // // // // //             <Button onClick={handleForward} className="bg-gray-600 hover:bg-gray-700 text-white">
// // // // // // // //               Forward
// // // // // // // //             </Button>
// // // // // // // //             <Button onClick={handleStop} className="bg-red-600 hover:bg-red-700 text-white">
// // // // // // // //               <X size={16} /> Stop
// // // // // // // //             </Button>
// // // // // // // //           </div>
// // // // // // // //         )}
// // // // // // // //       </div>
// // // // // // // //     </div>
// // // // // // // //   )
// // // // // // // // }

// // // // // // // // export default PlayMode;





// // // // // // // import React, { useState, useEffect, useRef } from "react";
// // // // // // // import { Button } from "@/components/ui/button";
// // // // // // // import { X, Play, Pause } from "lucide-react";
// // // // // // // import axios from "axios";
// // // // // // // import { getVoiceForSpeaker, VoiceAssignment } from "@/pages/api/getVoices";
// // // // // // // import { loadVoiceAssignments, saveVoiceAssignments } from "@/lib/voiceStorage";


// // // // // // // // Client-side interfaces (in your PlayMode file)
// // // // // // // export interface Segment {
// // // // // // //   speaker: string;
// // // // // // //   text: string;
// // // // // // //   voice?: string; // This will hold the assigned voice string.
// // // // // // //   gender: "MALE" | "FEMALE"
// // // // // // // }

// // // // // // // export interface VoiceMapping {
// // // // // // //   voice: string;
// // // // // // //   source: "predefined" | "generated";
// // // // // // // }

// // // // // // // export interface VoiceMappings {
// // // // // // //   [key: string]: VoiceMapping;
// // // // // // // }

// // // // // // // // Define the type for TTS results.
// // // // // // // interface TTSResult {
// // // // // // //   audioUrl: string;
// // // // // // //   failed: boolean;
// // // // // // // }



// // // // // // // const PlayMode: React.FC<{ 
// // // // // // //   currentPageContent: string;  
// // // // // // //   onClose: () => void; 
// // // // // // //   extractText: () => void; 
// // // // // // // }> = ({ currentPageContent, onClose, extractText }) => {
  
// // // // // // //   const [isPlaying, setIsPlaying] = useState(false);
// // // // // // //   const [isPaused, setIsPaused] = useState(false);
// // // // // // //   const [isLoading, setIsLoading] = useState(false); 
// // // // // // //   const [segments, setSegments] = useState<Segment[]>([]);
// // // // // // //   // const [voiceMappings, setVoiceMappings] = useState<VoiceMappings>({});
// // // // // // //   const [voiceMappings, setVoiceMappings] = useState<VoiceMappings>(() => loadVoiceAssignments());
// // // // // // //   const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
// // // // // // //   const [displayedText, setDisplayedText] = useState("");
// // // // // // //   const [audioQueue, setAudioQueue] = useState<string[]>([]);
// // // // // // //   const [audioBuffer, setAudioBuffer] = useState<string[]>([]);
  
// // // // // // //   const audioRef = useRef<HTMLAudioElement | null>(null);
// // // // // // //   const textContainerRef = useRef<HTMLDivElement | null>(null);
// // // // // // //   const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
// // // // // // //   const ttsCache = useRef<{ [key: string]: string }>({});
// // // // // // //   const [ttsResults, setTTSResults] = useState<TTSResult[]>([]);
// // // // // // //   const currentTTSResult = ttsResults && ttsResults[currentSegmentIndex];
// // // // // // //   const currentSegment = segments && segments[currentSegmentIndex];
// // // // // // //   const textToDisplay = currentTTSResult?.failed
// // // // // // //     ? currentSegment?.text || ""
// // // // // // //     : displayedText;
// // // // // // //     // Estimated wait time in seconds before audio starts


// // // // // // //   // Helper function: Update persistent voice mappings.
// // // // // // //   const updateVoiceMapping = (speakerKey: string, assignment: VoiceAssignment) => {
// // // // // // //     const newMappings = { ...voiceMappings, [speakerKey]: assignment };
// // // // // // //     setVoiceMappings(newMappings);
// // // // // // //     saveVoiceAssignments(newMappings);
// // // // // // //   };
  

// // // // // // //   // -------------------------
// // // // // // //   // Helper: Build context summary from segments.
// // // // // // //   // It extracts unique speakers (ignoring "narrator") and the last segment.
// // // // // // //   const buildContextSummary = (segments: Segment[]): string => {
// // // // // // //     // Filter out the narrator entries (assuming "narrator" is case‑insensitive).
// // // // // // //     const nonNarrator = segments.filter(
// // // // // // //       (seg) => seg.speaker.trim().toLowerCase() !== "narrator"
// // // // // // //     );


// // // // // // //     // Create a map for unique speakers.
// // // // // // //     const speakerMap: { [key: string]: { speaker: string; gender: string; voice: string } } = {};
// // // // // // //     nonNarrator.forEach((seg) => {
// // // // // // //       const key = seg.speaker.trim().toLowerCase();
// // // // // // //       const gender = (seg.gender === "MALE" || seg.gender === "FEMALE") ? seg.gender : "MALE"; // Default to "MALE" if seg.gender is not MALE or FEMALE
// // // // // // //       if (!speakerMap[key]) {
// // // // // // //         speakerMap[key] = {
// // // // // // //           speaker: seg.speaker,
// // // // // // //           gender: gender, //Use "gender" here to ensure gender is always MALE or FEMALE
// // // // // // //           voice: seg.voice || "",
// // // // // // //         };
// // // // // // //       }
// // // // // // //     });

// // // // // // //     // Use the last segment from all segments.
// // // // // // //     const lastSegment = segments[segments.length - 1] || null;

// // // // // // //     // Build the summary object.
// // // // // // //     const summary = {
// // // // // // //       speakers: Object.values(speakerMap),
// // // // // // //       lastSegment: lastSegment,
// // // // // // //     };

// // // // // // //     return JSON.stringify(summary, null, 2);
// // // // // // //   };



// // // // // // //   // Restore auto-scroll when displayedText updates.
// // // // // // //   useEffect(() => {
// // // // // // //     if (textContainerRef.current) {
// // // // // // //       textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
// // // // // // //     }
// // // // // // //   }, [displayedText]);

// // // // // // //   // Preload background image.
// // // // // // //   useEffect(() => {
// // // // // // //     const preloadImage = new Image();
// // // // // // //     preloadImage.src = "/images/olderpaper.jpg";
// // // // // // //   }, []);

// // // // // // //   // Fetch text automatically when PlayMode opens.
// // // // // // //   useEffect(() => {
// // // // // // //     extractText();
// // // // // // //   }, []);


// // // // // // //   // -------------------------
// // // // // // //   // Sequential Chunk Processing
// // // // // // //   // -------------------------
// // // // // // //   const processChunksSequentially = async (chunks: string[]) => {
// // // // // // //     let combinedSegments: Segment[] = [];
// // // // // // //     let contextSummary = ""; // This will be built from combinedSegments.

// // // // // // //     // Process each chunk sequentially.
// // // // // // //     for (let i = 0; i < chunks.length; i++) {
// // // // // // //       try {
// // // // // // //         console.log(`Processing chunk ${i + 1} of ${chunks.length}`);

// // // // // // //         // Build payload. For the first chunk, no context is needed.
// // // // // // //         const payload: any = { text: chunks[i] };
// // // // // // //         if (i > 0 && contextSummary) {
// // // // // // //           payload.context = `Context Summary:\n${contextSummary}`;
// // // // // // //         }

// // // // // // //         const parseResponse = await axios.post("/api/parse_text", payload);
// // // // // // //         const { segments: chunkSegments } = parseResponse.data;
// // // // // // //         console.log(`Parsed segments for chunk ${i + 1}:`, chunkSegments);
// // // // // // //         const processedSegments: Segment[] = chunkSegments.map((seg: Segment) => {
// // // // // // //           const normalizedSpeaker = seg.speaker.trim().toLowerCase();
// // // // // // //           let assignment = voiceMappings[normalizedSpeaker];
        
// // // // // // //           // If no existing assignment, compute one and update the mappings.
// // // // // // //           if (!assignment) {
// // // // // // //             // Ensure that seg.gender is valid (default to "MALE" if necessary).
// // // // // // //             const gender: "MALE" | "FEMALE" = (seg.gender === "MALE" || seg.gender === "FEMALE") ? seg.gender : "MALE";
// // // // // // //             assignment = getVoiceForSpeaker(seg.speaker, gender);
// // // // // // //             // Update persistent voice mappings using your helper.
// // // // // // //             updateVoiceMapping(normalizedSpeaker, assignment);
// // // // // // //           }
        
// // // // // // //           // Return the segment with the assigned voice and the confirmed gender.
// // // // // // //           return { ...seg, voice: assignment.voice, gender: seg.gender };
// // // // // // //         });
        

// // // // // // //         // Append the processed segments.
// // // // // // //         combinedSegments = combinedSegments.concat(processedSegments);
// // // // // // //         setSegments(combinedSegments);

// // // // // // //         // Update the context summary based on all combined segments so far.
// // // // // // //         contextSummary = buildContextSummary(combinedSegments);
// // // // // // //         console.log("Updated Context Summary:", contextSummary);


// // // // // // //         const ttsResultsForChunk = await fetchTTS(processedSegments);
// // // // // // //         setTTSResults((prev) => [...prev, ...ttsResultsForChunk]);
// // // // // // //         setAudioQueue((prev) => [...prev, ...ttsResultsForChunk.map(result => result.audioUrl)]);



// // // // // // //         // For the very first chunk, start playback immediately.
// // // // // // //         if (i === 0) {
// // // // // // //           setIsPlaying(true);
// // // // // // //           setIsPaused(false);
// // // // // // //           setCurrentSegmentIndex(0);
// // // // // // //           setDisplayedText("");
// // // // // // //           // Mark loading as complete.
// // // // // // //           setIsLoading(false);
// // // // // // //         }
// // // // // // //       } catch (error: any) {
// // // // // // //         console.error(
// // // // // // //           `Error processing chunk ${i + 1}:`,
// // // // // // //           error.response?.data?.error || error.message || error
// // // // // // //         );
// // // // // // //         setIsLoading(false);
// // // // // // //       }
// // // // // // //     }
// // // // // // //     console.log("All chunks processed.");
// // // // // // //   };


// // // // // // //   // Handle Start: split text into chunks and process them sequentially.
// // // // // // //   const handleStart = async () => {
// // // // // // //     if (!currentPageContent.trim()) {
// // // // // // //       alert("No text found on this page. Try navigating to another page.");
// // // // // // //       return;
// // // // // // //     }
// // // // // // //     setIsLoading(true);
// // // // // // //     try {
// // // // // // //       const MAX_CHUNK_LENGTH = 1500;
// // // // // // //       const chunks = currentPageContent.length > MAX_CHUNK_LENGTH
// // // // // // //         ? splitTextIntoChunks(currentPageContent, MAX_CHUNK_LENGTH)
// // // // // // //         : [currentPageContent];
// // // // // // //       console.log(`Splitting text into ${chunks.length} chunk(s)`);
  
// // // // // // //       await processChunksSequentially(chunks);
// // // // // // //     } catch (error: any) {
// // // // // // //       console.error("Error processing text:", error.response?.data?.error || error.message || error);
// // // // // // //       alert("Failed to process the text. Please try again.");
// // // // // // //     } finally {
// // // // // // //       setIsLoading(false);
// // // // // // //     }
// // // // // // //   };




// // // // // // //   /**
// // // // // // //    * Splits a large text into chunks (by paragraphs) that are no longer than maxChunkLength characters.
// // // // // // //    */
// // // // // // //   function splitTextIntoChunks(text: string, maxChunkLength: number = 3000): string[] {
// // // // // // //     const paragraphs = text.split(/\n+/).filter((p) => p.trim() !== "");
// // // // // // //     const chunks: string[] = [];
// // // // // // //     let currentChunk = "";
  
// // // // // // //     for (const para of paragraphs) {
// // // // // // //       if ((currentChunk + "\n" + para).length > maxChunkLength) {
// // // // // // //         if (currentChunk) {
// // // // // // //           chunks.push(currentChunk);
// // // // // // //           currentChunk = "";
// // // // // // //         }
// // // // // // //         if (para.length > maxChunkLength) {
// // // // // // //           for (let i = 0; i < para.length; i += maxChunkLength) {
// // // // // // //             chunks.push(para.slice(i, i + maxChunkLength));
// // // // // // //           }
// // // // // // //         } else {
// // // // // // //           currentChunk = para;
// // // // // // //         }
// // // // // // //       } else {
// // // // // // //         currentChunk += (currentChunk ? "\n" : "") + para;
// // // // // // //       }
// // // // // // //     }
// // // // // // //     if (currentChunk) {
// // // // // // //       chunks.push(currentChunk);
// // // // // // //     }
// // // // // // //     return chunks;
// // // // // // //   }
  
// // // // // // //   // -------------------------
// // // // // // //   // TTS Function (unchanged from older code)
// // // // // // //   // -------------------------
// // // // // // //   const createSilentAudio = (): string => {
// // // // // // //     const silence = new Uint8Array(1000);
// // // // // // //     const blob = new Blob([silence], { type: "audio/mp3" });
// // // // // // //     const url = URL.createObjectURL(blob);
// // // // // // //     console.log("Created silent audio blob URL:", url);
// // // // // // //     return url;
// // // // // // //   };
  

// // // // // // //   // const fetchTTS = async (batch: Segment[]): Promise<TTSResult[]> => {
// // // // // // //   //   const results: TTSResult[] = [];
// // // // // // //   //   for (const segment of batch) {
// // // // // // //   //     const cacheKey = `${segment.speaker}:${segment.text}`;
// // // // // // //   //     if (ttsCache.current[cacheKey]) {
// // // // // // //   //       results.push({ audioUrl: ttsCache.current[cacheKey], failed: false });
// // // // // // //   //       continue;
// // // // // // //   //     }
// // // // // // //   //     if (!segment.voice) {
// // // // // // //   //       console.error(`❌ No voice assigned for speaker: ${segment.speaker}`);
// // // // // // //   //       results.push({ audioUrl: createSilentAudio(), failed: true });
// // // // // // //   //       continue;
// // // // // // //   //     }
      
// // // // // // //   //     let attempt = 0;
// // // // // // //   //     let success = false;
// // // // // // //   //     let audioUrl = "";
// // // // // // //   //     let failed = false;
      
// // // // // // //   //     while (attempt < 3 && !success) {
// // // // // // //   //       attempt++;
// // // // // // //   //       console.log(`Attempt ${attempt} for TTS of speaker: ${segment.speaker}`);
        
// // // // // // //   //       // For the first attempt, you might wait a short period.
// // // // // // //   //       // For subsequent attempts, wait longer (e.g., 1 minute)
// // // // // // //   //       if (attempt === 1) {
// // // // // // //   //         await new Promise((resolve) => setTimeout(resolve, 50));
// // // // // // //   //       } else {
// // // // // // //   //         console.log(`Waiting 30 seconds before next attempt for ${segment.speaker}...`);
// // // // // // //   //         await new Promise((resolve) => setTimeout(resolve, 30000));
// // // // // // //   //       }
        
// // // // // // //   //       try {
// // // // // // //   //         const response = await axios.post(
// // // // // // //   //           "/api/tts",
// // // // // // //   //           {
// // // // // // //   //             text: segment.text,
// // // // // // //   //             speaker: segment.speaker,
// // // // // // //   //             voice: segment.voice,
// // // // // // //   //             gender: segment.gender,
// // // // // // //   //             voiceMapping: voiceMappings // Pass the mapping under the property name the server expects
// // // // // // //   //           },
// // // // // // //   //           { 
// // // // // // //   //             responseType: "blob", // expecting a binary blob
// // // // // // //   //             // timeout: 60000  // Set timeout to 60 seconds, adjust as needed
// // // // // // //   //           }
// // // // // // //   //         );
      
// // // // // // //   //         const contentType = response.headers["content-type"];
// // // // // // //   //         if (!contentType || !contentType.startsWith("audio/")) {
// // // // // // //   //           throw new Error(`Unexpected content-type: ${contentType}`);
// // // // // // //   //         }
          
// // // // // // //   //         // The function returns a binary audio blob.
// // // // // // //   //         const audioBlob = response.data;
// // // // // // //   //         audioUrl = URL.createObjectURL(audioBlob);
// // // // // // //   //         ttsCache.current[cacheKey] = audioUrl;
// // // // // // //   //         console.log(`✅ TTS success for ${segment.speaker} on attempt ${attempt}`);
// // // // // // //   //         success = true;
// // // // // // //   //       } catch (error: any) {
// // // // // // //   //         console.error(`❌ TTS attempt ${attempt} failed for ${segment.speaker}:`, error.message);
// // // // // // //   //         if (attempt >= 3) {
// // // // // // //   //           // After exhausting retries, use fallback silent audio.
// // // // // // //   //           audioUrl = createSilentAudio();
// // // // // // //   //           failed = true;
// // // // // // //   //           console.warn(`Using silent audio fallback for ${segment.speaker} after ${attempt} attempts.`);
// // // // // // //   //         }
// // // // // // //   //       }
// // // // // // //   //     }
// // // // // // //   //     results.push({ audioUrl, failed });
// // // // // // //   //   }
// // // // // // //   //   return results;
// // // // // // //   // };



// // // // // // //   const processSegment = async (segment: Segment): Promise<TTSResult> => {
// // // // // // //     const cacheKey = `${segment.speaker}:${segment.text}`;
// // // // // // //     if (ttsCache.current[cacheKey]) {
// // // // // // //       return { audioUrl: ttsCache.current[cacheKey], failed: false };
// // // // // // //     }
// // // // // // //     if (!segment.voice) {
// // // // // // //       console.error(`❌ No voice assigned for speaker: ${segment.speaker}`);
// // // // // // //       return { audioUrl: createSilentAudio(), failed: true };
// // // // // // //     }
  
// // // // // // //     let attempt = 0;
// // // // // // //     let success = false;
// // // // // // //     let audioUrl = "";
// // // // // // //     let failed = false;
  
// // // // // // //     while (attempt < 3 && !success) {
// // // // // // //       attempt++;
// // // // // // //       console.log(`Attempt ${attempt} for TTS of speaker: ${segment.speaker}`);
  
// // // // // // //       // Wait before each attempt: a short wait for attempt 1, longer for subsequent attempts.
// // // // // // //       if (attempt === 1) {
// // // // // // //         await new Promise((resolve) => setTimeout(resolve, 50));
// // // // // // //       } else {
// // // // // // //         console.log(`Waiting 30 seconds before next attempt for ${segment.speaker}...`);
// // // // // // //         await new Promise((resolve) => setTimeout(resolve, 30000));
// // // // // // //       }
  
// // // // // // //       try {
// // // // // // //         const response = await axios.post(
// // // // // // //           "/api/tts",
// // // // // // //           {
// // // // // // //             text: segment.text,
// // // // // // //             speaker: segment.speaker,
// // // // // // //             voice: segment.voice,
// // // // // // //             gender: segment.gender,
// // // // // // //             voiceMapping: voiceMappings, // Ensure this is the mapping your server expects.
// // // // // // //           },
// // // // // // //           {
// // // // // // //             responseType: "blob", // Expecting a binary audio blob.
// // // // // // //           }
// // // // // // //         );
  
// // // // // // //         const contentType = response.headers["content-type"];
// // // // // // //         if (!contentType || !contentType.startsWith("audio/")) {
// // // // // // //           throw new Error(`Unexpected content-type: ${contentType}`);
// // // // // // //         }
  
// // // // // // //         const audioBlob = response.data;
// // // // // // //         audioUrl = URL.createObjectURL(audioBlob);
// // // // // // //         ttsCache.current[cacheKey] = audioUrl;
// // // // // // //         console.log(`✅ TTS success for ${segment.speaker} on attempt ${attempt}`);
// // // // // // //         success = true;
// // // // // // //       } catch (error: any) {
// // // // // // //         console.error(`❌ TTS attempt ${attempt} failed for ${segment.speaker}:`, error.message);
// // // // // // //         if (attempt >= 3) {
// // // // // // //           audioUrl = createSilentAudio();
// // // // // // //           failed = true;
// // // // // // //           console.warn(`Using silent audio fallback for ${segment.speaker} after ${attempt} attempts.`);
// // // // // // //         }
// // // // // // //       }
// // // // // // //     }
  
// // // // // // //     return { audioUrl, failed };
// // // // // // //   };
  
// // // // // // //   const fetchTTS = async (batch: Segment[]): Promise<TTSResult[]> => {
// // // // // // //     const results: TTSResult[] = [];
// // // // // // //     const concurrency = 4; // Number of API calls to run concurrently.
  
// // // // // // //     // Process segments in groups of 'concurrency'.
// // // // // // //     for (let i = 0; i < batch.length; i += concurrency) {
// // // // // // //       const chunk = batch.slice(i, i + concurrency);
// // // // // // //       // Launch API calls concurrently for this chunk.
// // // // // // //       const chunkResults = await Promise.all(chunk.map((segment) => processSegment(segment)));
// // // // // // //       results.push(...chunkResults);
// // // // // // //     }
// // // // // // //     return results;
// // // // // // //   };
  
  




// // // // // // //   // -------------------------
// // // // // // //   // Playback & Text Animation
// // // // // // //   // -------------------------
// // // // // // //   useEffect(() => {
// // // // // // //     if (isPlaying && currentSegmentIndex < segments.length && audioQueue.length > 0) {
// // // // // // //       if (audioRef.current) return; // Avoid multiple audio instances.
// // // // // // //       const audioUrl = audioQueue[currentSegmentIndex];
// // // // // // //       const currentSegment = segments[currentSegmentIndex];
// // // // // // //       const audio = new Audio(audioUrl);
// // // // // // //       audio.load(); // Force load metadata.
// // // // // // //       audioRef.current = audio;
  
// // // // // // //       audio.onended = () => {
// // // // // // //         setCurrentSegmentIndex((prev) => prev + 1);
// // // // // // //         setDisplayedText("");
// // // // // // //         audioRef.current = null;
// // // // // // //         if (!isPaused) playCurrentSegment();
// // // // // // //       };
  
// // // // // // //       audio.onloadedmetadata = () => {
// // // // // // //         let duration = audio.duration;
// // // // // // //         if (isNaN(duration) || duration === Infinity || duration === 0) {
// // // // // // //           setTimeout(() => {
// // // // // // //             if (audioRef.current && audioRef.current.duration > 0) {
// // // // // // //               startTextAnimation(audioRef.current.duration, currentSegment.text);
// // // // // // //             } else {
// // // // // // //               console.warn("Falling back to default duration for animation.");
// // // // // // //               startTextAnimation(5, currentSegment.text); // Default to 5 seconds.
// // // // // // //             }
// // // // // // //           }, 200);
// // // // // // //         } else {
// // // // // // //           startTextAnimation(duration, currentSegment.text);
// // // // // // //         }
// // // // // // //       };
  
// // // // // // //       audio.play().catch((err) => {
// // // // // // //         console.error("Error playing audio:", err);
// // // // // // //       });
// // // // // // //     } else if (currentSegmentIndex >= segments.length && isPlaying) {
// // // // // // //       setIsPlaying(false);
// // // // // // //       alert("Playback finished.");
// // // // // // //     }
  
// // // // // // //     return () => {
// // // // // // //       if (animationIntervalRef.current) {
// // // // // // //         clearInterval(animationIntervalRef.current);
// // // // // // //       }
// // // // // // //     };
// // // // // // //   }, [isPlaying, currentSegmentIndex, audioQueue, segments, isPaused]);
  
// // // // // // //   const playCurrentSegment = () => {
// // // // // // //     if (audioRef.current && isPaused) {
// // // // // // //       audioRef.current.play().catch((err) => console.error("Error resuming audio:", err));
// // // // // // //       setIsPaused(false);
// // // // // // //     }
// // // // // // //   };
  
// // // // // // //   const startTextAnimation = (duration: number, text: string) => {
// // // // // // //     if (!text) return;
// // // // // // //     const animationDuration = duration * 0; // Adjust multiplier as needed.
// // // // // // //     const words = text.split(" ") || [];
// // // // // // //     const totalWords = words.length;
// // // // // // //     const wordInterval = animationDuration / totalWords;
// // // // // // //     let currentWordIndex = 0;
// // // // // // //     setDisplayedText("");
  
// // // // // // //     if (animationIntervalRef.current) {
// // // // // // //       clearInterval(animationIntervalRef.current);
// // // // // // //     }
  
// // // // // // //     animationIntervalRef.current = setInterval(() => {
// // // // // // //       if (isPaused) return;
// // // // // // //       if (currentWordIndex < totalWords) {
// // // // // // //         const word = words[currentWordIndex];
// // // // // // //         setDisplayedText((prev) => (prev ? `${prev} ${word}`.trim() : word));
// // // // // // //         currentWordIndex++;
// // // // // // //       } else {
// // // // // // //         clearInterval(animationIntervalRef.current!);
// // // // // // //       }
// // // // // // //     }, wordInterval);
// // // // // // //   };
  
// // // // // // //   // Playback control handlers.
// // // // // // //   const handlePlay = () => {
// // // // // // //     if (isPlaying && isPaused && audioRef.current) {
// // // // // // //       audioRef.current.play().catch((err) => console.error("Error resuming audio:", err));
// // // // // // //       setIsPaused(false);
// // // // // // //       return;
// // // // // // //     }
// // // // // // //     handleStart();
// // // // // // //   };
  
// // // // // // //   const handlePause = () => {
// // // // // // //     if (audioRef.current) {
// // // // // // //       audioRef.current.pause();
// // // // // // //     }
// // // // // // //     setIsPaused(true);
// // // // // // //   };
  
// // // // // // //   const handleStop = () => {
// // // // // // //     if (audioRef.current) {
// // // // // // //       audioRef.current.pause();
// // // // // // //       audioRef.current.currentTime = 0;
// // // // // // //       audioRef.current = null;
// // // // // // //     }
// // // // // // //     if (animationIntervalRef.current) {
// // // // // // //       clearInterval(animationIntervalRef.current);
// // // // // // //     }
// // // // // // //     setIsPlaying(false);
// // // // // // //     setIsPaused(false);
// // // // // // //     setCurrentSegmentIndex(0);
// // // // // // //     setDisplayedText("");
// // // // // // //   };
  
// // // // // // //   const handleBackward = () => {
// // // // // // //     if (currentSegmentIndex > 0) {
// // // // // // //       if (audioRef.current) {
// // // // // // //         audioRef.current.pause();
// // // // // // //         audioRef.current = null;
// // // // // // //       }
// // // // // // //       if (animationIntervalRef.current) {
// // // // // // //         clearInterval(animationIntervalRef.current);
// // // // // // //       }
// // // // // // //       setCurrentSegmentIndex((prev) => prev - 1);
// // // // // // //       setDisplayedText("");
// // // // // // //       playCurrentSegment();
// // // // // // //     }
// // // // // // //   };
  
// // // // // // //   const handleForward = () => {
// // // // // // //     if (currentSegmentIndex < segments.length - 1) {
// // // // // // //       if (audioRef.current) {
// // // // // // //         audioRef.current.pause();
// // // // // // //         audioRef.current = null;
// // // // // // //       }
// // // // // // //       if (animationIntervalRef.current) {
// // // // // // //         clearInterval(animationIntervalRef.current);
// // // // // // //       }
// // // // // // //       setCurrentSegmentIndex((prev) => prev + 1);
// // // // // // //       setDisplayedText("");
// // // // // // //       playCurrentSegment();
// // // // // // //     }
// // // // // // //   };



// // // // // // //   return (
// // // // // // //     <div className="absolute inset-0 z-50 flex items-center justify-center">
// // // // // // //       <div
// // // // // // //         className={`relative bg-white text-gray-900 rounded-lg shadow-lg ${
// // // // // // //           !isPlaying ? "w-[650px] max-h-[85%] p-6" : "w-[800px] h-[85%]"
// // // // // // //         } transition-all duration-300 overflow-hidden`}
// // // // // // //       >
// // // // // // //         {/* Always-visible Close Icon */}
// // // // // // //         <button
// // // // // // //           className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 z-50"
// // // // // // //           onMouseDown={() => {
// // // // // // //             if (typeof window !== "undefined" && window.speechSynthesis) {
// // // // // // //               window.speechSynthesis.cancel()
// // // // // // //             }
// // // // // // //           }}
// // // // // // //           onClick={onClose}
// // // // // // //           aria-label="Close"
// // // // // // //         >
// // // // // // //           <X size={20} />
// // // // // // //         </button>

// // // // // // //         {!isPlaying && !isLoading ? (
// // // // // // //           <div className="flex flex-col items-center gap-4 relative h-full">
// // // // // // //             <Button
// // // // // // //               onClick={handlePlay}
// // // // // // //               className="bg-yellow-700 hover:bg-yellow-800 text-white px-6 py-2"
// // // // // // //             >
// // // // // // //               Start Audiobook
// // // // // // //             </Button>
// // // // // // //           </div>
// // // // // // //         ) : isLoading ? (
// // // // // // //           <div className="flex items-center justify-center h-full">
// // // // // // //             <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-yellow-700"></div>
// // // // // // //           </div>
// // // // // // //         ) : (
// // // // // // //           <div
// // // // // // //             className="relative h-full w-full bg-[url('/images/olderpaper.jpg')] bg-cover bg-center p-8 overflow-y-auto"
// // // // // // //             ref={textContainerRef}
// // // // // // //           >
// // // // // // //             {currentTTSResult?.failed && (
// // // // // // //               <div className="mb-2 text-sm text-red-600">
// // // // // // //                 Audio unavailable – please read the text below.
// // // // // // //               </div>
// // // // // // //             )}
// // // // // // //             <p className="text-2xl leading-relaxed font-serif">{textToDisplay}</p>
// // // // // // //           </div>
// // // // // // //         )}

// // // // // // //         {isPlaying && (
// // // // // // //           <div className="absolute bottom-4 left-4 flex gap-4">
// // // // // // //             <Button onClick={handleBackward} className="bg-gray-600 hover:bg-gray-700 text-white">
// // // // // // //               Back
// // // // // // //             </Button>
// // // // // // //             {isPaused ? (
// // // // // // //               <Button onClick={handlePlay} className="bg-green-600 hover:bg-green-700 text-white">
// // // // // // //                 <Play size={16} /> Resume
// // // // // // //               </Button>
// // // // // // //             ) : (
// // // // // // //               <Button onClick={handlePause} className="bg-blue-600 hover:bg-blue-700 text-white">
// // // // // // //                 <Pause size={16} /> Pause
// // // // // // //               </Button>
// // // // // // //             )}
// // // // // // //             <Button onClick={handleForward} className="bg-gray-600 hover:bg-gray-700 text-white">
// // // // // // //               Forward
// // // // // // //             </Button>
// // // // // // //             <Button onClick={handleStop} className="bg-red-600 hover:bg-red-700 text-white">
// // // // // // //               <X size={16} /> Stop
// // // // // // //             </Button>
// // // // // // //           </div>
// // // // // // //         )}
// // // // // // //       </div>
// // // // // // //     </div>
// // // // // // //   )
// // // // // // // }

// // // // // // // export default PlayMode;




// // // // // // import React, { useState, useEffect, useRef } from "react";
// // // // // // import { Button } from "@/components/ui/button";
// // // // // // import { X, Play, Pause } from "lucide-react";
// // // // // // import axios from "axios";
// // // // // // import { getVoiceForSpeaker, VoiceAssignment } from "@/pages/api/getVoices";
// // // // // // import { loadVoiceAssignments, saveVoiceAssignments } from "@/lib/voiceStorage";

// // // // // // // Client-side interfaces
// // // // // // export interface Segment {
// // // // // //   speaker: string;
// // // // // //   text: string;
// // // // // //   voice?: string; // Assigned voice string.
// // // // // //   gender: "MALE" | "FEMALE";
// // // // // // }

// // // // // // export interface VoiceMapping {
// // // // // //   voice: string;
// // // // // //   source: "predefined" | "generated";
// // // // // // }

// // // // // // export interface VoiceMappings {
// // // // // //   [key: string]: VoiceMapping;
// // // // // // }

// // // // // // // Define the type for TTS results.
// // // // // // interface TTSResult {
// // // // // //   audioUrl: string;
// // // // // //   failed: boolean;
// // // // // // }

// // // // // // interface PlayModeProps {
// // // // // //   currentPageContent: string;
// // // // // //   onClose: () => void;
// // // // // //   extractText: () => void;
// // // // // // }

// // // // // // const PlayMode: React.FC<PlayModeProps> = ({ currentPageContent, onClose, extractText }) => {
// // // // // //   // Playback and TTS state
// // // // // //   const [isPlaying, setIsPlaying] = useState(false);
// // // // // //   const [isPaused, setIsPaused] = useState(false);
// // // // // //   const [isLoading, setIsLoading] = useState(false);
// // // // // //   const [segments, setSegments] = useState<Segment[]>([]);
// // // // // //   const [voiceMappings, setVoiceMappings] = useState<VoiceMappings>(() => loadVoiceAssignments());
// // // // // //   const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
// // // // // //   const [displayedText, setDisplayedText] = useState("");
// // // // // //   const [audioQueue, setAudioQueue] = useState<string[]>([]);
// // // // // //   const [audioBuffer, setAudioBuffer] = useState<string[]>([]);
// // // // // //   const [ttsResults, setTTSResults] = useState<TTSResult[]>([]);
// // // // // //   // New: estimated wait time (in seconds) until audio starts.
// // // // // //   const [estimatedTime, setEstimatedTime] = useState<number>(0);

// // // // // //   const audioRef = useRef<HTMLAudioElement | null>(null);
// // // // // //   const textContainerRef = useRef<HTMLDivElement | null>(null);
// // // // // //   const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
// // // // // //   const ttsCache = useRef<{ [key: string]: string }>({});

// // // // // //   const currentTTSResult = ttsResults && ttsResults[currentSegmentIndex];
// // // // // //   const currentSegment = segments && segments[currentSegmentIndex];
// // // // // //   const textToDisplay = currentTTSResult?.failed
// // // // // //     ? currentSegment?.text || ""
// // // // // //     : displayedText;

// // // // // //   const [ttsError, setTtsError] = useState(false);
// // // // // //   // Optionally, you can track the time at which the next retry is allowed.
// // // // // //   const [retryAvailableAt, setRetryAvailableAt] = useState<Date | null>(null);
// // // // // //   const [isChunkLoading, setIsChunkLoading] = useState(false);


  

// // // // // //   // Countdown timer: update estimatedTime every second.
// // // // // //   useEffect(() => {
// // // // // //     if (estimatedTime > 0) {
// // // // // //       const interval = setInterval(() => {
// // // // // //         setEstimatedTime(prev => {
// // // // // //           if (prev <= 1) {
// // // // // //             clearInterval(interval);
// // // // // //             return 0;
// // // // // //           }
// // // // // //           return prev - 1;
// // // // // //         });
// // // // // //       }, 1000);
// // // // // //       return () => clearInterval(interval);
// // // // // //     }
// // // // // //   }, [estimatedTime]);



// // // // // //   // Additionally, add a useEffect to hide the overlay when playback starts:
// // // // // //   useEffect(() => {
// // // // // //     if (isPlaying) {
// // // // // //       setIsChunkLoading(false);
// // // // // //     }
// // // // // //   }, [isPlaying]);
  


// // // // // //   // NEW: Auto-scroll when the audioQueue changes (i.e. when a new chunk is added)
// // // // // //   useEffect(() => {
// // // // // //     if (textContainerRef.current) {
// // // // // //       textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
// // // // // //     }
// // // // // //   }, [audioQueue]);

// // // // // //   // NEW: Auto-start playback if there's audio in the queue but nothing is playing
// // // // // //   useEffect(() => {
// // // // // //     if (!isPlaying && audioQueue.length > 0) {
// // // // // //       // Optionally, you can add a check or delay here if needed.
// // // // // //       handlePlay();
// // // // // //     }
// // // // // //   }, [audioQueue, isPlaying]);

// // // // // //   // Helper: Update persistent voice mappings.
// // // // // //   const updateVoiceMapping = (speakerKey: string, assignment: VoiceAssignment) => {
// // // // // //     const newMappings = { ...voiceMappings, [speakerKey]: assignment };
// // // // // //     setVoiceMappings(newMappings);
// // // // // //     saveVoiceAssignments(newMappings);
// // // // // //   };

// // // // // //   // Helper: Build context summary from segments.
// // // // // //   const buildContextSummary = (segments: Segment[]): string => {
// // // // // //     const nonNarrator = segments.filter(
// // // // // //       (seg) => seg.speaker.trim().toLowerCase() !== "narrator"
// // // // // //     );
// // // // // //     const speakerMap: { [key: string]: { speaker: string; gender: string; voice: string } } = {};
// // // // // //     nonNarrator.forEach((seg) => {
// // // // // //       const key = seg.speaker.trim().toLowerCase();
// // // // // //       const gender = (seg.gender === "MALE" || seg.gender === "FEMALE") ? seg.gender : "MALE";
// // // // // //       if (!speakerMap[key]) {
// // // // // //         speakerMap[key] = {
// // // // // //           speaker: seg.speaker,
// // // // // //           gender: gender,
// // // // // //           voice: seg.voice || "",
// // // // // //         };
// // // // // //       }
// // // // // //     });
// // // // // //     const lastSegment = segments[segments.length - 1] || null;
// // // // // //     const summary = {
// // // // // //       speakers: Object.values(speakerMap),
// // // // // //       lastSegment: lastSegment,
// // // // // //     };
// // // // // //     return JSON.stringify(summary, null, 2);
// // // // // //   };

// // // // // //   // Auto-scroll when displayedText updates.
// // // // // //   useEffect(() => {
// // // // // //     if (textContainerRef.current) {
// // // // // //       textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
// // // // // //     }
// // // // // //   }, [displayedText]);

// // // // // //   // Preload background image.
// // // // // //   useEffect(() => {
// // // // // //     const preloadImage = new Image();
// // // // // //     preloadImage.src = "/images/olderpaper.jpg";
// // // // // //   }, []);

// // // // // //   // Fetch text automatically when PlayMode opens.
// // // // // //   useEffect(() => {
// // // // // //     extractText();
// // // // // //   }, [extractText]);

// // // // // //   // // // -------------------------
// // // // // //   // // // Sequential Chunk Processing
// // // // // //   // // // -------------------------
// // // // // //   // // const processChunksSequentially = async (chunks: string[]): Promise<void> => {
// // // // // //   // //   let combinedSegments: Segment[] = [];
// // // // // //   // //   let contextSummary = "";
// // // // // //   // //   for (let i = 0; i < chunks.length; i++) {
// // // // // //   // //     try {
// // // // // //   // //       console.log(`Processing chunk ${i + 1} of ${chunks.length}`);
// // // // // //   // //       const payload: any = { text: chunks[i] };
// // // // // //   // //       if (i > 0 && contextSummary) {
// // // // // //   // //         payload.context = `Context Summary:\n${contextSummary}`;
// // // // // //   // //       }
// // // // // //   // //       const parseResponse = await axios.post("/api/parse_text", payload);
// // // // // //   // //       const { segments: chunkSegments } = parseResponse.data;
// // // // // //   // //       console.log(`Parsed segments for chunk ${i + 1}:`, chunkSegments);
// // // // // //   // //       const processedSegments: Segment[] = chunkSegments.map((seg: Segment) => {
// // // // // //   // //         const normalizedSpeaker = seg.speaker.trim().toLowerCase();
// // // // // //   // //         let assignment = voiceMappings[normalizedSpeaker];
// // // // // //   // //         if (!assignment) {
// // // // // //   // //           const gender: "MALE" | "FEMALE" = (seg.gender === "MALE" || seg.gender === "FEMALE") ? seg.gender : "MALE";
// // // // // //   // //           assignment = getVoiceForSpeaker(seg.speaker, gender);
// // // // // //   // //           updateVoiceMapping(normalizedSpeaker, assignment);
// // // // // //   // //         }
// // // // // //   // //         return { ...seg, voice: assignment.voice, gender: seg.gender };
// // // // // //   // //       });
// // // // // //   // //       combinedSegments = combinedSegments.concat(processedSegments);
// // // // // //   // //       setSegments(combinedSegments);
// // // // // //   // //       contextSummary = buildContextSummary(combinedSegments);
// // // // // //   // //       console.log("Updated Context Summary:", contextSummary);

// // // // // //   // //       // Here we calculate the estimated time based on the number of segments.
// // // // // //   // //       const estimatedTimeForChunk = processedSegments.length * 10; // e.g. 10 seconds per segment
// // // // // //   // //       setEstimatedTime((prev) => prev + estimatedTimeForChunk);

// // // // // //   // //       const ttsResultsForChunk = await fetchTTS(processedSegments);
// // // // // //   // //       setTTSResults((prev) => [...prev, ...ttsResultsForChunk]);
// // // // // //   // //       setAudioQueue((prev) => [
// // // // // //   // //         ...prev,
// // // // // //   // //         ...ttsResultsForChunk.map((result) => result.audioUrl),
// // // // // //   // //       ]);

// // // // // //   // //       if (i === 0) {
// // // // // //   // //         setIsPlaying(true);
// // // // // //   // //         setIsPaused(false);
// // // // // //   // //         setCurrentSegmentIndex(0);
// // // // // //   // //         setDisplayedText("");
// // // // // //   // //         setIsLoading(false);
// // // // // //   // //       }
// // // // // //   // //     } catch (error: any) {
// // // // // //   // //       console.error(
// // // // // //   // //         `Error processing chunk ${i + 1}:`,
// // // // // //   // //         error.response?.data?.error || error.message || error
// // // // // //   // //       );
// // // // // //   // //       setIsLoading(false);
// // // // // //   // //     }
// // // // // //   // //   }
// // // // // //   // //   console.log("All chunks processed.");
// // // // // //   // // };



// // // // // //   // const processChunksSequentially = async (chunks: string[]): Promise<void> => {
// // // // // //   //   let combinedSegments: Segment[] = [];
// // // // // //   //   let contextSummary = "";
// // // // // //   //   let failCount = 0; // count TTS failures overall
  
// // // // // //   //   for (let i = 0; i < chunks.length; i++) {
// // // // // //   //     try {
// // // // // //   //       console.log(`Processing chunk ${i + 1} of ${chunks.length}`);
// // // // // //   //       const payload: any = { text: chunks[i] };
// // // // // //   //       if (i > 0 && contextSummary) {
// // // // // //   //         payload.context = `Context Summary:\n${contextSummary}`;
// // // // // //   //       }
// // // // // //   //       const parseResponse = await axios.post("/api/parse_text", payload);
// // // // // //   //       const { segments: chunkSegments } = parseResponse.data;
// // // // // //   //       console.log(`Parsed segments for chunk ${i + 1}:`, chunkSegments);
  
// // // // // //   //       const processedSegments: Segment[] = chunkSegments.map((seg: Segment) => {
// // // // // //   //         const normalizedSpeaker = seg.speaker.trim().toLowerCase();
// // // // // //   //         let assignment = voiceMappings[normalizedSpeaker];
// // // // // //   //         if (!assignment) {
// // // // // //   //           const gender: "MALE" | "FEMALE" =
// // // // // //   //             seg.gender === "MALE" || seg.gender === "FEMALE" ? seg.gender : "MALE";
// // // // // //   //           assignment = getVoiceForSpeaker(seg.speaker, gender);
// // // // // //   //           updateVoiceMapping(normalizedSpeaker, assignment);
// // // // // //   //         }
// // // // // //   //         return { ...seg, voice: assignment.voice, gender: seg.gender };
// // // // // //   //       });
// // // // // //   //       combinedSegments = combinedSegments.concat(processedSegments);
// // // // // //   //       setSegments(combinedSegments);
// // // // // //   //       contextSummary = buildContextSummary(combinedSegments);
// // // // // //   //       console.log("Updated Context Summary:", contextSummary);
  
// // // // // //   //       // For each chunk, we estimate a wait time (e.g. 3 seconds per segment).
// // // // // //   //       const estimatedTimeForChunk = processedSegments.length * 3;
// // // // // //   //       setEstimatedTime((prev) => prev + estimatedTimeForChunk);
  
// // // // // //   //       // Fetch TTS results for this batch.
// // // // // //   //       const ttsResultsForChunk = await fetchTTS(processedSegments);
        
// // // // // //   //       // Count the failures in this batch.
// // // // // //   //       const failedCountForChunk = ttsResultsForChunk.filter(r => r.failed).length;
// // // // // //   //       failCount += failedCountForChunk;
// // // // // //   //       // If more than 3 failures occur, stop processing and show an error.
// // // // // //   //       if (failCount > 3) {
// // // // // //   //         setTtsError(true);
// // // // // //   //         setIsLoading(false);
// // // // // //   //         // Set a timeout of 5 minutes before retry is allowed.
// // // // // //   //         setRetryAvailableAt(new Date(Date.now() + 2 * 60 * 1000));
// // // // // //   //         return;
// // // // // //   //       }
        
// // // // // //   //       setTTSResults((prev) => [...prev, ...ttsResultsForChunk]);
// // // // // //   //       setAudioQueue((prev) => [
// // // // // //   //         ...prev,
// // // // // //   //         ...ttsResultsForChunk.map((result) => result.audioUrl),
// // // // // //   //       ]);
  
// // // // // //   //       // For the very first chunk, start playback.
// // // // // //   //       if (i === 0) {
// // // // // //   //         setIsPlaying(true);
// // // // // //   //         setIsPaused(false);
// // // // // //   //         setCurrentSegmentIndex(0);
// // // // // //   //         setDisplayedText("");
// // // // // //   //         setIsLoading(false);
// // // // // //   //       }
// // // // // //   //     } catch (error: any) {
// // // // // //   //       console.error(
// // // // // //   //         `Error processing chunk ${i + 1}:`,
// // // // // //   //         error.response?.data?.error || error.message || error
// // // // // //   //       );
// // // // // //   //       setIsLoading(false);
// // // // // //   //     }
// // // // // //   //   }
// // // // // //   //   console.log("All chunks processed.");
// // // // // //   // };


// // // // // //   const processChunksSequentially = async (chunks: string[]): Promise<void> => {
// // // // // //     let combinedSegments: Segment[] = [];
// // // // // //     let contextSummary = "";
// // // // // //     let failCount = 0; // count TTS failures overall

// // // // // //     for (let i = 0; i < chunks.length; i++) {
// // // // // //       // Signal that a new chunk is loading
// // // // // //       setIsChunkLoading(true);
// // // // // //       try {
// // // // // //         console.log(`Processing chunk ${i + 1} of ${chunks.length}`);
// // // // // //         const payload: any = { text: chunks[i] };
// // // // // //         if (i > 0 && contextSummary) {
// // // // // //           payload.context = `Context Summary:\n${contextSummary}`;
// // // // // //         }
// // // // // //         const parseResponse = await axios.post("/api/parse_text", payload);
// // // // // //         const { segments: chunkSegments } = parseResponse.data;
// // // // // //         console.log(`Parsed segments for chunk ${i + 1}:`, chunkSegments);

// // // // // //         const processedSegments: Segment[] = chunkSegments.map((seg: Segment) => {
// // // // // //           const normalizedSpeaker = seg.speaker.trim().toLowerCase();
// // // // // //           let assignment = voiceMappings[normalizedSpeaker];
// // // // // //           if (!assignment) {
// // // // // //             const gender: "MALE" | "FEMALE" =
// // // // // //               seg.gender === "MALE" || seg.gender === "FEMALE" ? seg.gender : "MALE";
// // // // // //             assignment = getVoiceForSpeaker(seg.speaker, gender);
// // // // // //             updateVoiceMapping(normalizedSpeaker, assignment);
// // // // // //           }
// // // // // //           return { ...seg, voice: assignment.voice, gender: seg.gender };
// // // // // //         });

// // // // // //         combinedSegments = combinedSegments.concat(processedSegments);
// // // // // //         setSegments(combinedSegments);
// // // // // //         contextSummary = buildContextSummary(combinedSegments);
// // // // // //         console.log("Updated Context Summary:", contextSummary);

// // // // // //         // Estimate wait time for the chunk
// // // // // //         const estimatedTimeForChunk = processedSegments.length * 10;
// // // // // //         setEstimatedTime((prev) => prev + estimatedTimeForChunk);

// // // // // //         // Fetch TTS results for this batch.
// // // // // //         const ttsResultsForChunk = await fetchTTS(processedSegments);

// // // // // //         // Count the failures in this batch.
// // // // // //         const failedCountForChunk = ttsResultsForChunk.filter(r => r.failed).length;
// // // // // //         failCount += failedCountForChunk;
// // // // // //         if (failCount > 3) {
// // // // // //           setTtsError(true);
// // // // // //           setIsLoading(false);
// // // // // //           setRetryAvailableAt(new Date(Date.now() + 2 * 60 * 1000));
// // // // // //           return;
// // // // // //         }

// // // // // //         setTTSResults((prev) => [...prev, ...ttsResultsForChunk]);
// // // // // //         setAudioQueue((prev) => [
// // // // // //           ...prev,
// // // // // //           ...ttsResultsForChunk.map((result) => result.audioUrl),
// // // // // //         ]);

// // // // // //         // (Optional) If this is the very first chunk, you can initialize playback here.
// // // // // //         if (i === 0) {
// // // // // //           setIsPlaying(true);
// // // // // //           setIsPaused(false);
// // // // // //           setCurrentSegmentIndex(0);
// // // // // //           setDisplayedText("");
// // // // // //           setIsLoading(false);
// // // // // //         }
// // // // // //       } catch (error: any) {
// // // // // //         console.error(
// // // // // //           `Error processing chunk ${i + 1}:`,
// // // // // //           error.response?.data?.error || error.message || error
// // // // // //         );
// // // // // //         setIsLoading(false);
// // // // // //       } finally {
// // // // // //         // Mark that this chunk is done processing.
// // // // // //         setIsChunkLoading(false);
// // // // // //       }
// // // // // //     }
// // // // // //     console.log("All chunks processed.");
// // // // // //   };

  
  

// // // // // //   /**
// // // // // //    * Splits text into chunks (by paragraphs) that are no longer than maxChunkLength characters.
// // // // // //    */
// // // // // //   function splitTextIntoChunks(text: string, maxChunkLength: number = 3000): string[] {
// // // // // //     const paragraphs = text.split(/\n+/).filter((p) => p.trim() !== "");
// // // // // //     const chunks: string[] = [];
// // // // // //     let currentChunk = "";
// // // // // //     for (const para of paragraphs) {
// // // // // //       if ((currentChunk + "\n" + para).length > maxChunkLength) {
// // // // // //         if (currentChunk) {
// // // // // //           chunks.push(currentChunk);
// // // // // //           currentChunk = "";
// // // // // //         }
// // // // // //         if (para.length > maxChunkLength) {
// // // // // //           for (let i = 0; i < para.length; i += maxChunkLength) {
// // // // // //             chunks.push(para.slice(i, i + maxChunkLength));
// // // // // //           }
// // // // // //         } else {
// // // // // //           currentChunk = para;
// // // // // //         }
// // // // // //       } else {
// // // // // //         currentChunk += (currentChunk ? "\n" : "") + para;
// // // // // //       }
// // // // // //     }
// // // // // //     if (currentChunk) {
// // // // // //       chunks.push(currentChunk);
// // // // // //     }
// // // // // //     return chunks;
// // // // // //   }

// // // // // //   // -------------------------
// // // // // //   // TTS Function (unchanged from older code)
// // // // // //   // -------------------------
// // // // // //   const createSilentAudio = (): string => {
// // // // // //     const silence = new Uint8Array(1000);
// // // // // //     const blob = new Blob([silence], { type: "audio/mp3" });
// // // // // //     const url = URL.createObjectURL(blob);
// // // // // //     console.log("Created silent audio blob URL:", url);
// // // // // //     return url;
// // // // // //   };

// // // // // //   const fetchTTS = async (batch: Segment[]): Promise<TTSResult[]> => {
// // // // // //     const results: TTSResult[] = [];
// // // // // //     for (const segment of batch) {
// // // // // //       const cacheKey = `${segment.speaker}:${segment.text}`;
// // // // // //       if (ttsCache.current[cacheKey]) {
// // // // // //         results.push({ audioUrl: ttsCache.current[cacheKey], failed: false });
// // // // // //         continue;
// // // // // //       }
// // // // // //       if (!segment.voice) {
// // // // // //         console.error(`❌ No voice assigned for speaker: ${segment.speaker}`);
// // // // // //         results.push({ audioUrl: createSilentAudio(), failed: true });
// // // // // //         continue;
// // // // // //       }
      
// // // // // //       let attempt = 0;
// // // // // //       let success = false;
// // // // // //       let audioUrl = "";
// // // // // //       let failed = false;
      
// // // // // //       while (attempt < 3 && !success) {
// // // // // //         attempt++;
// // // // // //         console.log(`Attempt ${attempt} for TTS of speaker: ${segment.speaker}`);
// // // // // //         if (attempt === 1) {
// // // // // //           await new Promise((resolve) => setTimeout(resolve, 50));
// // // // // //         } else {
// // // // // //           console.log(`Waiting 1 minute before next attempt for ${segment.speaker}...`);
// // // // // //           await new Promise((resolve) => setTimeout(resolve, 30000));
// // // // // //         }
        
// // // // // //         try {
// // // // // //           const response = await axios.post(
// // // // // //             "/api/tts",
// // // // // //             {
// // // // // //               text: segment.text,
// // // // // //               speaker: segment.speaker,
// // // // // //               voice: segment.voice,
// // // // // //               gender: segment.gender,
// // // // // //               voiceMapping: voiceMappings
// // // // // //             },
// // // // // //             { 
// // // // // //               responseType: "blob"
// // // // // //             }
// // // // // //           );
      
// // // // // //           const contentType = response.headers["content-type"];
// // // // // //           if (!contentType || !contentType.startsWith("audio/")) {
// // // // // //             throw new Error(`Unexpected content-type: ${contentType}`);
// // // // // //           }
          
// // // // // //           const audioBlob = response.data;
// // // // // //           audioUrl = URL.createObjectURL(audioBlob);
// // // // // //           ttsCache.current[cacheKey] = audioUrl;
// // // // // //           console.log(`✅ TTS success for ${segment.speaker} on attempt ${attempt}`);
// // // // // //           success = true;
// // // // // //         } catch (error: any) {
// // // // // //           console.error(`❌ TTS attempt ${attempt} failed for ${segment.speaker}:`, error.message);
// // // // // //           if (attempt >= 3) {
// // // // // //             audioUrl = createSilentAudio();
// // // // // //             failed = true;
// // // // // //             console.warn(`Using silent audio fallback for ${segment.speaker} after ${attempt} attempts.`);
// // // // // //           }
// // // // // //         }
// // // // // //       }
// // // // // //       results.push({ audioUrl, failed });
// // // // // //     }
// // // // // //     return results;
// // // // // //   };



// // // // // //   // -------------------------
// // // // // //   // Playback & Text Animation
// // // // // //   // -------------------------
// // // // // //   // useEffect(() => {
// // // // // //   //   if (isPlaying && currentSegmentIndex < segments.length && audioQueue.length > 0) {
// // // // // //   //     if (audioRef.current) return;
// // // // // //   //     const audioUrl = audioQueue[currentSegmentIndex];
// // // // // //   //     const currentSegment = segments[currentSegmentIndex];
// // // // // //   //     const audio = new Audio(audioUrl);
// // // // // //   //     audio.load();
// // // // // //   //     audioRef.current = audio;
  
// // // // // //   //     audio.onended = () => {
// // // // // //   //       setCurrentSegmentIndex((prev) => prev + 1);
// // // // // //   //       setDisplayedText("");
// // // // // //   //       audioRef.current = null;
// // // // // //   //       if (!isPaused) playCurrentSegment();
// // // // // //   //     };
  
// // // // // //   //     audio.onloadedmetadata = () => {
// // // // // //   //       let duration = audio.duration;
// // // // // //   //       if (isNaN(duration) || duration === Infinity || duration === 0) {
// // // // // //   //         setTimeout(() => {
// // // // // //   //           if (audioRef.current && audioRef.current.duration > 0) {
// // // // // //   //             startTextAnimation(audioRef.current.duration, currentSegment.text);
// // // // // //   //           } else {
// // // // // //   //             console.warn("Falling back to default duration for animation.");
// // // // // //   //             startTextAnimation(5, currentSegment.text);
// // // // // //   //           }
// // // // // //   //         }, 200);
// // // // // //   //       } else {
// // // // // //   //         startTextAnimation(duration, currentSegment.text);
// // // // // //   //       }
// // // // // //   //     };
  
// // // // // //   //     audio.play().catch((err) => {
// // // // // //   //       console.error("Error playing audio:", err);
// // // // // //   //     });
// // // // // //   //   } else if (currentSegmentIndex >= segments.length && isPlaying) {
// // // // // //   //     setIsPlaying(false);
// // // // // //   //     alert("Playback finished.");
// // // // // //   //   }
  
// // // // // //   //   return () => {
// // // // // //   //     if (animationIntervalRef.current) {
// // // // // //   //       clearInterval(animationIntervalRef.current);
// // // // // //   //     }
// // // // // //   //   };
// // // // // //   // }, [isPlaying, currentSegmentIndex, audioQueue, segments, isPaused]);

// // // // // //   useEffect(() => {
// // // // // //     if (isPlaying && currentSegmentIndex < segments.length && audioQueue.length > 0) {
// // // // // //       // Use the simpler guard condition
// // // // // //       if (audioRef.current) return;
      
// // // // // //       const audioUrl = audioQueue[currentSegmentIndex];
// // // // // //       console.log("Creating audio element with URL:", audioUrl);
// // // // // //       const currentSegment = segments[currentSegmentIndex];
// // // // // //       const audio = new Audio(audioUrl);
// // // // // //       audio.preload = "auto";
// // // // // //       audio.load(); // Force load metadata
// // // // // //       audioRef.current = audio;
      
// // // // // //       audio.onended = () => {
// // // // // //         setCurrentSegmentIndex((prev) => prev + 1);
// // // // // //         setDisplayedText("");
// // // // // //         audioRef.current = null;
// // // // // //         if (!isPaused) playCurrentSegment();
// // // // // //       };
      
// // // // // //       audio.onloadedmetadata = () => {
// // // // // //         let duration = audio.duration;
// // // // // //         if (isNaN(duration) || duration === Infinity || duration === 0) {
// // // // // //           setTimeout(() => {
// // // // // //             if (audioRef.current && audioRef.current.duration > 0) {
// // // // // //               startTextAnimation(audioRef.current.duration, currentSegment.text);
// // // // // //             } else {
// // // // // //               console.warn("Falling back to default duration for animation.");
// // // // // //               startTextAnimation(5, currentSegment.text);
// // // // // //             }
// // // // // //           }, 200);
// // // // // //         } else {
// // // // // //           startTextAnimation(duration, currentSegment.text);
// // // // // //         }
// // // // // //       };
      
// // // // // //       audio.play().catch((err) => {
// // // // // //         console.error("Error playing audio:", err);
// // // // // //       });
// // // // // //     } else if (currentSegmentIndex >= segments.length && isPlaying) {
// // // // // //       setIsPlaying(false);
// // // // // //       alert("Playback finished.");
// // // // // //     }
    
// // // // // //     return () => {
// // // // // //       if (animationIntervalRef.current) {
// // // // // //         clearInterval(animationIntervalRef.current);
// // // // // //       }
// // // // // //     };
// // // // // //   }, [isPlaying, currentSegmentIndex, audioQueue, segments, isPaused]);
  
  
  
  
// // // // // //   const playCurrentSegment = () => {
// // // // // //     if (audioRef.current && isPaused) {
// // // // // //       // Resume playback if the audio is paused.
// // // // // //       audioRef.current.play().catch((err) => console.error("Error resuming audio:", err));
// // // // // //       setIsPaused(false);
// // // // // //     }
// // // // // //   };
  
  
// // // // // //   const startTextAnimation = (duration: number, text: string) => {
// // // // // //     if (!text) return;
// // // // // //     const animationDuration = duration * 100; // Use the proper multiplier.
// // // // // //     const words = text.split(" ") || [];
// // // // // //     const totalWords = words.length;
// // // // // //     const wordInterval = animationDuration / totalWords;
// // // // // //     let currentWordIndex = 0;
// // // // // //     setDisplayedText("");
  
// // // // // //     if (animationIntervalRef.current) {
// // // // // //       clearInterval(animationIntervalRef.current);
// // // // // //     }
  
// // // // // //     animationIntervalRef.current = setInterval(() => {
// // // // // //       if (isPaused) return;
// // // // // //       if (currentWordIndex < totalWords) {
// // // // // //         const word = words[currentWordIndex];
// // // // // //         setDisplayedText((prev) => (prev ? `${prev} ${word}`.trim() : word));
// // // // // //         currentWordIndex++;
// // // // // //       } else {
// // // // // //         clearInterval(animationIntervalRef.current!);
// // // // // //       }
// // // // // //     }, wordInterval);
// // // // // //   };
  



// // // // // //   // Handle Start: split text into chunks and process them sequentially.
// // // // // //   const handleStart = async () => {
// // // // // //     if (!currentPageContent.trim()) {
// // // // // //       alert("No text found on this page. Try navigating to another page.");
// // // // // //       return;
// // // // // //     }
// // // // // //     setIsLoading(true);
// // // // // //     try {
// // // // // //       const MAX_CHUNK_LENGTH = 1500;
// // // // // //       const chunks = currentPageContent.length > MAX_CHUNK_LENGTH
// // // // // //         ? splitTextIntoChunks(currentPageContent, MAX_CHUNK_LENGTH)
// // // // // //         : [currentPageContent];
// // // // // //       console.log(`Splitting text into ${chunks.length} chunk(s)`);
  
// // // // // //       await processChunksSequentially(chunks);
// // // // // //     } catch (error: any) {
// // // // // //       console.error("Error processing text:", error.response?.data?.error || error.message || error);
// // // // // //       alert("Failed to process the text. Please try again.");
// // // // // //     } finally {
// // // // // //       setIsLoading(false);
// // // // // //     }
// // // // // //   };

  
// // // // // //   // Playback control handlers.
// // // // // //   const handlePlay = () => {
// // // // // //     if (retryAvailableAt && new Date() < retryAvailableAt) {
// // // // // //       alert("Please wait 5 minutes before trying again.");
// // // // // //       return;
// // // // // //     }
// // // // // //     // Reset error state when retrying.
// // // // // //     setTtsError(false);
// // // // // //     setRetryAvailableAt(null);
// // // // // //     if (isPlaying && isPaused && audioRef.current) {
// // // // // //       audioRef.current.play().catch((err) => console.error("Error resuming audio:", err));
// // // // // //       setIsPaused(false);
// // // // // //       return;
// // // // // //     }
// // // // // //     handleStart();
// // // // // //   };
  
  
// // // // // //   const handlePause = () => {
// // // // // //     if (audioRef.current) {
// // // // // //       audioRef.current.pause();
// // // // // //     }
// // // // // //     setIsPaused(true);
// // // // // //   };
  
// // // // // //   const handleStop = () => {
// // // // // //     if (audioRef.current) {
// // // // // //       audioRef.current.pause();
// // // // // //       audioRef.current.currentTime = 0;
// // // // // //       audioRef.current = null;
// // // // // //     }
// // // // // //     if (animationIntervalRef.current) {
// // // // // //       clearInterval(animationIntervalRef.current);
// // // // // //     }
// // // // // //     setIsPlaying(false);
// // // // // //     setIsPaused(false);
// // // // // //     setCurrentSegmentIndex(0);
// // // // // //     setDisplayedText("");
// // // // // //   };
  
// // // // // //   const handleBackward = () => {
// // // // // //     if (currentSegmentIndex > 0) {
// // // // // //       if (audioRef.current) {
// // // // // //         audioRef.current.pause();
// // // // // //         audioRef.current = null;
// // // // // //       }
// // // // // //       if (animationIntervalRef.current) {
// // // // // //         clearInterval(animationIntervalRef.current);
// // // // // //       }
// // // // // //       setCurrentSegmentIndex((prev) => prev - 1);
// // // // // //       setDisplayedText("");
// // // // // //       playCurrentSegment();
// // // // // //     }
// // // // // //   };
  
// // // // // //   const handleForward = () => {
// // // // // //     if (currentSegmentIndex < segments.length - 1) {
// // // // // //       if (audioRef.current) {
// // // // // //         audioRef.current.pause();
// // // // // //         audioRef.current = null;
// // // // // //       }
// // // // // //       if (animationIntervalRef.current) {
// // // // // //         clearInterval(animationIntervalRef.current);
// // // // // //       }
// // // // // //       setCurrentSegmentIndex((prev) => prev + 1);
// // // // // //       setDisplayedText("");
// // // // // //       playCurrentSegment();
// // // // // //     }
// // // // // //   };

// // // // // // //   return (
// // // // // // //     <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
// // // // // // //       <div
// // // // // // //         className={`relative bg-white text-gray-900 rounded-lg shadow-lg ${
// // // // // // //           !isPlaying ? "w-[650px] max-h-[85%] p-6" : "w-[800px] h-[85%]"
// // // // // // //         } transition-all duration-300 overflow-hidden`}
// // // // // // //       >
// // // // // // //         {/* Always-visible Close Icon */}
// // // // // // //         <button
// // // // // // //           className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 z-50"
// // // // // // //           onMouseDown={() => {
// // // // // // //             if (typeof window !== "undefined" && window.speechSynthesis) {
// // // // // // //               window.speechSynthesis.cancel();
// // // // // // //             }
// // // // // // //           }}
// // // // // // //           onClick={onClose}
// // // // // // //           aria-label="Close"
// // // // // // //         >
// // // // // // //           <X size={20} />
// // // // // // //         </button>

// // // // // // //         {!isPlaying && !isLoading ? (
// // // // // // //           <div className="flex flex-col items-center gap-4 relative h-full">
// // // // // // //             <Button
// // // // // // //               onClick={handlePlay}
// // // // // // //               className="bg-yellow-700 hover:bg-yellow-800 text-white px-6 py-2"
// // // // // // //             >
// // // // // // //               Start Audiobook
// // // // // // //             </Button>
// // // // // // //           </div>
// // // // // // //         ) : isLoading ? (
// // // // // // //           <div className="flex flex-col items-center justify-center h-full">
// // // // // // //             <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-yellow-700"></div>
// // // // // // //             <p className="mt-4 text-lg font-medium">
// // // // // // //               Your audio will start in approximately {estimatedTime} seconds...
// // // // // // //             </p>
// // // // // // //             <Button
// // // // // // //               onClick={handleStart}
// // // // // // //               className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
// // // // // // //             >
// // // // // // //               Start Audiobook
// // // // // // //             </Button>
// // // // // // //           </div>
// // // // // // //         ) : (
// // // // // // //           <div
// // // // // // //             className="relative h-full w-full bg-[url('/images/olderpaper.jpg')] bg-cover bg-center p-8 overflow-y-auto"
// // // // // // //             ref={textContainerRef}
// // // // // // //           >
// // // // // // //             {currentTTSResult?.failed && (
// // // // // // //               <div className="mb-2 text-sm text-red-600">
// // // // // // //                 Audio unavailable – please read the text below.
// // // // // // //               </div>
// // // // // // //             )}
// // // // // // //             <p className="text-2xl leading-relaxed font-serif">{textToDisplay}</p>
// // // // // // //           </div>
// // // // // // //         )}

// // // // // // //         {isPlaying && (
// // // // // // //           <div className="absolute bottom-4 left-4 flex gap-4">
// // // // // // //             <Button onClick={handleBackward} className="bg-gray-600 hover:bg-gray-700 text-white">
// // // // // // //               Back
// // // // // // //             </Button>
// // // // // // //             {isPaused ? (
// // // // // // //               <Button onClick={handlePlay} className="bg-green-600 hover:bg-green-700 text-white">
// // // // // // //                 <Play size={16} /> Resume
// // // // // // //               </Button>
// // // // // // //             ) : (
// // // // // // //               <Button onClick={handlePause} className="bg-blue-600 hover:bg-blue-700 text-white">
// // // // // // //                 <Pause size={16} /> Pause
// // // // // // //               </Button>
// // // // // // //             )}
// // // // // // //             <Button onClick={handleForward} className="bg-gray-600 hover:bg-gray-700 text-white">
// // // // // // //               Forward
// // // // // // //             </Button>
// // // // // // //             <Button onClick={handleStop} className="bg-red-600 hover:bg-red-700 text-white">
// // // // // // //               <X size={16} /> Stop
// // // // // // //             </Button>
// // // // // // //           </div>
// // // // // // //         )}
// // // // // // //       </div>
// // // // // // //     </div>
// // // // // // //   );
// // // // // // // };


// // // // // // // return (
// // // // // // //   <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
// // // // // // //     <div className={`relative bg-white text-gray-900 rounded-lg shadow-lg ${!isPlaying ? "w-[650px] max-h-[85%] p-6" : "w-[800px] h-[85%]"} transition-all duration-300 overflow-hidden`}>
// // // // // // //       {/* Always-visible Close Icon */}
// // // // // // //       <button
// // // // // // //         className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 z-50"
// // // // // // //         onMouseDown={() => {
// // // // // // //           if (typeof window !== "undefined" && window.speechSynthesis) {
// // // // // // //             window.speechSynthesis.cancel();
// // // // // // //           }
// // // // // // //         }}
// // // // // // //         onClick={onClose}
// // // // // // //         aria-label="Close"
// // // // // // //       >
// // // // // // //         <X size={20} />
// // // // // // //       </button>

// // // // // // //       {ttsError ? (
// // // // // // //         <div className="flex flex-col items-center justify-center h-full">
// // // // // // //           <p className="mt-4 text-lg font-medium text-red-600">
// // // // // // //             TTS failed multiple times. Please try again in 5 minutes.
// // // // // // //           </p>
// // // // // // //         </div>
// // // // // // //       ) : !isPlaying && !isLoading ? (
// // // // // // //         <div className="flex flex-col items-center gap-4 relative h-full">
// // // // // // //           <Button onClick={handlePlay} className="bg-yellow-700 hover:bg-yellow-800 text-white px-6 py-2">
// // // // // // //             Start Audiobook
// // // // // // //           </Button>
// // // // // // //         </div>
// // // // // // //       ) : isLoading ? (
// // // // // // //         <div className="flex flex-col items-center justify-center h-full">
// // // // // // //           <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-yellow-700"></div>
// // // // // // //           <p className="mt-4 text-lg font-medium">
// // // // // // //             Your audio will start in approximately {estimatedTime} seconds...
// // // // // // //           </p>
// // // // // // //           {/* Note: No Start button here during loading */}
// // // // // // //         </div>
// // // // // // //       ) : (
// // // // // // //         // Playback UI
// // // // // // //         <div
// // // // // // //           className="relative h-full w-full bg-[url('/images/olderpaper.jpg')] bg-cover bg-center p-8 overflow-y-auto"
// // // // // // //           ref={textContainerRef}
// // // // // // //         >
// // // // // // //           {currentTTSResult?.failed && (
// // // // // // //             <div className="mb-2 text-sm text-red-600">
// // // // // // //               Audio unavailable – please read the text below.
// // // // // // //             </div>
// // // // // // //           )}
// // // // // // //           <p className="text-2xl leading-relaxed font-serif">{textToDisplay}</p>
// // // // // // //         </div>
// // // // // // //       )}

// // // // // // //       {isPlaying && !ttsError && (
// // // // // // //         <div className="absolute bottom-4 left-4 flex gap-4">
// // // // // // //           <Button onClick={handleBackward} className="bg-gray-600 hover:bg-gray-700 text-white">
// // // // // // //             Back
// // // // // // //           </Button>
// // // // // // //           {isPaused ? (
// // // // // // //             <Button onClick={handlePlay} className="bg-green-600 hover:bg-green-700 text-white">
// // // // // // //               <Play size={16} /> Resume
// // // // // // //             </Button>
// // // // // // //           ) : (
// // // // // // //             <Button onClick={handlePause} className="bg-blue-600 hover:bg-blue-700 text-white">
// // // // // // //               <Pause size={16} /> Pause
// // // // // // //             </Button>
// // // // // // //           )}
// // // // // // //           <Button onClick={handleForward} className="bg-gray-600 hover:bg-gray-700 text-white">
// // // // // // //             Forward
// // // // // // //           </Button>
// // // // // // //           <Button onClick={handleStop} className="bg-red-600 hover:bg-red-700 text-white">
// // // // // // //             <X size={16} /> Stop
// // // // // // //           </Button>
// // // // // // //         </div>
// // // // // // //       )}
// // // // // // //     </div>
// // // // // // //   </div>
// // // // // // // );

// // // // // // // }
// // // // // // // export default PlayMode;



// // // // // // // return (
// // // // // // //   <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
// // // // // // //     <div
// // // // // // //       className={`
// // // // // // //         relative bg-white text-gray-900 rounded-lg shadow-lg
// // // // // // //         ${!isPlaying ? "w-[650px] max-h-[85%] p-6" : "w-[800px] h-[85%]"}
// // // // // // //         transition-all duration-300 overflow-hidden
// // // // // // //       `}
// // // // // // //     >
// // // // // // //       {/* Always-visible Close Icon */}
// // // // // // //       <button
// // // // // // //         className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 z-50 focus:outline-none"
// // // // // // //         onMouseDown={() => {
// // // // // // //           if (typeof window !== "undefined" && window.speechSynthesis) {
// // // // // // //             window.speechSynthesis.cancel();
// // // // // // //           }
// // // // // // //         }}
// // // // // // //         onClick={onClose}
// // // // // // //         aria-label="Close"
// // // // // // //       >
// // // // // // //         <X size={20} />
// // // // // // //       </button>

// // // // // // //       {ttsError ? (
// // // // // // //         <div className="flex flex-col items-center justify-center h-full">
// // // // // // //           <p className="mt-4 text-lg font-medium text-red-600">
// // // // // // //             TTS failed multiple times. Please try again in 5 minutes.
// // // // // // //           </p>
// // // // // // //         </div>
// // // // // // //       ) : !isPlaying && !isLoading ? (
// // // // // // //         <div className="flex flex-col items-center gap-4 relative h-full">
// // // // // // //           <Button
// // // // // // //             onClick={handlePlay}
// // // // // // //             className="bg-amber-700 hover:bg-amber-800 text-white px-6 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // // // // //           >
// // // // // // //             Start Audiobook
// // // // // // //           </Button>
// // // // // // //         </div>
// // // // // // //       ) : isLoading ? (
// // // // // // //         <div className="flex flex-col items-center justify-center h-full">
// // // // // // //           <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-amber-700"></div>
// // // // // // //           <p className="mt-4 text-lg font-medium">
// // // // // // //             Your audio will start in approximately {estimatedTime} seconds...
// // // // // // //           </p>
// // // // // // //         </div>
// // // // // // //       ) : (
// // // // // // //         // Playback UI
// // // // // // //         <div
// // // // // // //           className="relative h-full w-full bg-[url('/images/olderpaper.jpg')] bg-cover bg-center p-8 overflow-y-auto"
// // // // // // //           ref={textContainerRef}
// // // // // // //         >
// // // // // // //           {currentTTSResult?.failed && (
// // // // // // //             <div className="mb-2 text-sm text-red-600">
// // // // // // //               Audio unavailable – please read the text below.
// // // // // // //             </div>
// // // // // // //           )}
// // // // // // //           <p className="text-2xl leading-relaxed font-serif">{textToDisplay}</p>
// // // // // // //         </div>
// // // // // // //       )}

// // // // // // //       {isPlaying && !ttsError && (
// // // // // // //         <div className="absolute bottom-4 left-4 flex flex-wrap gap-4">
// // // // // // //           <Button
// // // // // // //             onClick={handleBackward}
// // // // // // //             className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // // // // //           >
// // // // // // //             Back
// // // // // // //           </Button>
// // // // // // //           {isPaused ? (
// // // // // // //             <Button
// // // // // // //               onClick={handlePlay}
// // // // // // //               className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // // // // //             >
// // // // // // //               <Play size={16} /> Resume
// // // // // // //             </Button>
// // // // // // //           ) : (
// // // // // // //             <Button
// // // // // // //               onClick={handlePause}
// // // // // // //               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // // // // //             >
// // // // // // //               <Pause size={16} /> Pause
// // // // // // //             </Button>
// // // // // // //           )}
// // // // // // //           <Button
// // // // // // //             onClick={handleForward}
// // // // // // //             className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // // // // //           >
// // // // // // //             Forward
// // // // // // //           </Button>
// // // // // // //           <Button
// // // // // // //             onClick={handleStop}
// // // // // // //             className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // // // // //           >
// // // // // // //             <X size={16} /> Stop
// // // // // // //           </Button>
// // // // // // //         </div>
// // // // // // //       )}
// // // // // // //     </div>
// // // // // // //   </div>
// // // // // // // );


// // // // // // // return (
// // // // // // //   <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
// // // // // // //     <div
// // // // // // //       className={`
// // // // // // //         relative bg-white text-gray-900 rounded-lg shadow-lg transition-all duration-300 overflow-hidden w-full h-full 
// // // // // // //         ${!isPlaying ? "sm:max-w-[650px] sm:max-h-[85%] sm:p-6" : "sm:max-w-[800px] sm:h-[85%]"}
// // // // // // //       `}
// // // // // // //     >
// // // // // // //       {/* Always-visible Close Icon */}
// // // // // // //       <button
// // // // // // //         className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 z-50 focus:outline-none"
// // // // // // //         onMouseDown={() => {
// // // // // // //           if (typeof window !== "undefined" && window.speechSynthesis) {
// // // // // // //             window.speechSynthesis.cancel();
// // // // // // //           }
// // // // // // //         }}
// // // // // // //         onClick={onClose}
// // // // // // //         aria-label="Close"
// // // // // // //       >
// // // // // // //         <X size={20} />
// // // // // // //       </button>

// // // // // // //       {ttsError ? (
// // // // // // //         <div className="flex flex-col items-center justify-center h-full">
// // // // // // //           <p className="mt-4 text-base sm:text-lg font-medium text-red-600">
// // // // // // //             TTS failed multiple times. Please try again in 5 minutes.
// // // // // // //           </p>
// // // // // // //         </div>
// // // // // // //       ) : !isPlaying && !isLoading ? (
// // // // // // //         <div className="flex flex-col items-center gap-4 relative h-full">
// // // // // // //           <Button
// // // // // // //             onClick={handlePlay}
// // // // // // //             className="bg-amber-700 hover:bg-amber-800 text-white px-6 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // // // // //           >
// // // // // // //             Start Audiobook
// // // // // // //           </Button>
// // // // // // //         </div>
// // // // // // //       ) : isLoading ? (
// // // // // // //         <div className="flex flex-col items-center justify-center h-full">
// // // // // // //           <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-gray-700"></div>
// // // // // // //           <p className="mt-4 text-base sm:text-lg font-medium">
// // // // // // //             Your audio will start in approximately {estimatedTime} seconds...
// // // // // // //           </p>
// // // // // // //         </div>
// // // // // // //       ) : (
// // // // // // //           <div
// // // // // // //           className="relative w-full h-full bg-[url('/images/olderpaper.jpg')] bg-cover bg-center p-4 sm:p-8 overflow-y-auto"
// // // // // // //           ref={textContainerRef}
// // // // // // //         >
// // // // // // //           {currentTTSResult?.failed && (
// // // // // // //             <div className="mb-2 text-sm text-red-600">
// // // // // // //               Audio unavailable – please read the text below.
// // // // // // //             </div>
// // // // // // //           )}
// // // // // // //           <p className="text-base sm:text-2xl leading-relaxed font-serif">
// // // // // // //             {textToDisplay}
// // // // // // //           </p>
// // // // // // //           {/* Overlay for chunk loading */}
// // // // // // //           {isChunkLoading && (
// // // // // // //             <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
// // // // // // //               <p className="text-white text-base sm:text-lg">
// // // // // // //                 Loading next chunk, please wait...
// // // // // // //               </p>
// // // // // // //             </div>
// // // // // // //           )}
// // // // // // //         </div>
// // // // // // //       )}

// // // // // // //       {isPlaying && !ttsError && (
// // // // // // //         <div className="absolute bottom-4 left-4 flex flex-wrap gap-4">
// // // // // // //           <Button
// // // // // // //             onClick={handleBackward}
// // // // // // //             className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // // // // //           >
// // // // // // //             Back
// // // // // // //           </Button>
// // // // // // //           {isPaused ? (
// // // // // // //             <Button
// // // // // // //               onClick={handlePlay}
// // // // // // //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // // // // //             >
// // // // // // //               <Play size={16} /> Resume
// // // // // // //             </Button>
// // // // // // //           ) : (
// // // // // // //             <Button
// // // // // // //               onClick={handlePause}
// // // // // // //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // // // // //             >
// // // // // // //               <Pause size={16} /> Pause
// // // // // // //             </Button>
// // // // // // //           )}
// // // // // // //           <Button
// // // // // // //             onClick={handleForward}
// // // // // // //             className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // // // // //           >
// // // // // // //             Forward
// // // // // // //           </Button>
// // // // // // //           <Button
// // // // // // //             onClick={handleStop}
// // // // // // //             className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // // // // //           >
// // // // // // //             <X size={16} /> Stop
// // // // // // //           </Button>
// // // // // // //         </div>
// // // // // // //       )}
// // // // // // //     </div>
// // // // // // //   </div>
// // // // // // // );

// // // // // // return (
// // // // // //   <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
// // // // // //     <div
// // // // // //       className={`
// // // // // //         relative bg-white text-gray-900 rounded-lg shadow-lg transition-all duration-300 overflow-hidden 
// // // // // //         ${!isPlaying 
// // // // // //           ? "w-[300px] h-[400px] sm:w-[650px] sm:max-h-[85%] sm:p-6" 
// // // // // //           : "w-full h-full sm:max-w-[800px] sm:h-[85%]"
// // // // // //         }
// // // // // //       `}
// // // // // //     >
// // // // // //       {/* Always-visible Close Icon */}
// // // // // //       <button
// // // // // //         className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 z-50 focus:outline-none"
// // // // // //         onMouseDown={() => {
// // // // // //           if (typeof window !== "undefined" && window.speechSynthesis) {
// // // // // //             window.speechSynthesis.cancel();
// // // // // //           }
// // // // // //         }}
// // // // // //         onClick={onClose}
// // // // // //         aria-label="Close"
// // // // // //       >
// // // // // //         <X size={20} />
// // // // // //       </button>

// // // // // //       {ttsError ? (
// // // // // //         <div className="flex flex-col items-center justify-center h-full">
// // // // // //           <p className="mt-4 text-base sm:text-lg font-medium text-red-600">
// // // // // //             TTS failed multiple times. Please try again in 5 minutes.
// // // // // //           </p>
// // // // // //         </div>
// // // // // //       ) : isLoading ? (
// // // // // //         <div className="flex flex-col items-center justify-center h-full">
// // // // // //           <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-gray-700"></div>
// // // // // //           <p className="mt-4 text-base sm:text-lg font-medium">
// // // // // //             Your audio will start in approximately {estimatedTime} seconds...
// // // // // //           </p>
// // // // // //         </div>
// // // // // //       ) : !isPlaying ? (
// // // // // //         // <div className="flex flex-col items-center gap-4 relative h-full">
// // // // // //         //   <Button
// // // // // //         //     onClick={handlePlay}
// // // // // //         //     className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // // // //         //   >
// // // // // //         //     Start Audiobook
// // // // // //         //   </Button>
// // // // // //         // </div>

// // // // // //         <div className="flex flex-col items-center justify-center gap-4 relative h-full">
// // // // // //           <Button
// // // // // //             onClick={handlePlay}
// // // // // //             className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // // // //           >
// // // // // //             Start Audiobook
// // // // // //           </Button>
// // // // // //         </div>

// // // // // //       ) : (
// // // // // //         // Playback UI
// // // // // //         <div
// // // // // //           className="relative w-full h-full bg-[url('/images/olderpaper.jpg')] bg-cover bg-center p-4 sm:p-8 overflow-y-auto"
// // // // // //           ref={textContainerRef}
// // // // // //         >
// // // // // //           {currentTTSResult?.failed && (
// // // // // //             <div className="mb-2 text-sm text-red-600">
// // // // // //               Audio unavailable – please read the text below.
// // // // // //             </div>
// // // // // //           )}
// // // // // //           <p className="text-base sm:text-2xl leading-relaxed font-serif">
// // // // // //             {textToDisplay}
// // // // // //           </p>
// // // // // //           {/* Overlay for chunk loading; only visible when isChunkLoading is true */}
// // // // // //           {isChunkLoading && (
// // // // // //             <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
// // // // // //               <p className="text-white text-base sm:text-lg">
// // // // // //                 Loading next chunk, please wait...
// // // // // //               </p>
// // // // // //             </div>
// // // // // //           )}
// // // // // //         </div>
// // // // // //       )}

// // // // // //       {isPlaying && !ttsError && (
// // // // // //         <div className="absolute bottom-4 left-4 flex flex-wrap gap-4">
// // // // // //           <Button
// // // // // //             onClick={handleBackward}
// // // // // //             className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // // // //           >
// // // // // //             Back
// // // // // //           </Button>
// // // // // //           {isPaused ? (
// // // // // //             <Button
// // // // // //               onClick={handlePlay}
// // // // // //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // // // //             >
// // // // // //               <Play size={16} /> Resume
// // // // // //             </Button>
// // // // // //           ) : (
// // // // // //             <Button
// // // // // //               onClick={handlePause}
// // // // // //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // // // //             >
// // // // // //               <Pause size={16} /> Pause
// // // // // //             </Button>
// // // // // //           )}
// // // // // //           <Button
// // // // // //             onClick={handleForward}
// // // // // //             className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // // // //           >
// // // // // //             Forward
// // // // // //           </Button>
// // // // // //           <Button
// // // // // //             onClick={handleStop}
// // // // // //             className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // // // //           >
// // // // // //             <X size={16} /> Stop
// // // // // //           </Button>
// // // // // //         </div>
// // // // // //       )}
// // // // // //     </div>
// // // // // //   </div>
// // // // // // );
// // // // // // };

// // // // // // export default PlayMode;



// // // // // //         // Playback UI
// // // // // //       //   <div
// // // // // //       //     className="relative w-full h-full bg-[url('/images/olderpaper.jpg')] bg-cover bg-center p-4 sm:p-8 overflow-y-auto"
// // // // // //       //     ref={textContainerRef}
// // // // // //       //   >
// // // // // //       //     {currentTTSResult?.failed && (
// // // // // //       //       <div className="mb-2 text-sm text-red-600">
// // // // // //       //         Audio unavailable – please read the text below.
// // // // // //       //       </div>
// // // // // //       //     )}
// // // // // //       //     <p className="text-base sm:text-2xl leading-relaxed font-serif">
// // // // // //       //       {textToDisplay}
// // // // // //       //     </p>
// // // // // //       //   </div>
// // // // // //       // )}











// // // // // import React, { useState, useEffect, useRef } from "react";
// // // // // import { Button } from "@/components/ui/button";
// // // // // import { X, Play, Pause } from "lucide-react";
// // // // // import axios from "axios";
// // // // // import { getVoiceForSpeaker, VoiceAssignment } from "@/pages/api/getVoices";
// // // // // import { loadVoiceAssignments, saveVoiceAssignments } from "@/lib/voiceStorage";
// // // // // import { saveAudio, loadAudio } from "@/lib/mediaStorage";



// // // // // // Client-side interfaces
// // // // // export interface Segment {
// // // // //   speaker: string;
// // // // //   text: string;
// // // // //   voice?: string; // Assigned voice string.
// // // // //   gender: "MALE" | "FEMALE";
// // // // // }

// // // // // export interface VoiceMapping {
// // // // //   voice: string;
// // // // //   source: "predefined" | "generated";
// // // // // }

// // // // // export interface VoiceMappings {
// // // // //   [key: string]: VoiceMapping;
// // // // // }

// // // // // // Define the type for TTS results.
// // // // // interface TTSResult {
// // // // //   audioUrl: string;
// // // // //   failed: boolean;
// // // // // }

// // // // // interface PlayModeProps {
// // // // //   currentPageContent: string;
// // // // //   onClose: () => void;
// // // // //   extractText: () => void;
// // // // // }

// // // // // const PlayMode: React.FC<PlayModeProps> = ({ currentPageContent, onClose, extractText }) => {
// // // // //   // Playback and TTS state
// // // // //   const [isPlaying, setIsPlaying] = useState(false);
// // // // //   const [isPaused, setIsPaused] = useState(false);
// // // // //   const [isLoading, setIsLoading] = useState(false);
// // // // //   const [segments, setSegments] = useState<Segment[]>([]);
// // // // //   const [voiceMappings, setVoiceMappings] = useState<VoiceMappings>(() => loadVoiceAssignments());
// // // // //   const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
// // // // //   const [displayedText, setDisplayedText] = useState("");
// // // // //   const [audioQueue, setAudioQueue] = useState<string[]>([]);
// // // // //   const [audioBuffer, setAudioBuffer] = useState<string[]>([]);
// // // // //   const [ttsResults, setTTSResults] = useState<TTSResult[]>([]);
// // // // //   // New: estimated wait time (in seconds) until audio starts.
// // // // //   const [estimatedTime, setEstimatedTime] = useState<number>(0);

// // // // //   const audioRef = useRef<HTMLAudioElement | null>(null);
// // // // //   const textContainerRef = useRef<HTMLDivElement | null>(null);
// // // // //   const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
// // // // //   const ttsCache = useRef<{ [key: string]: string }>({});

// // // // //   const currentTTSResult = ttsResults && ttsResults[currentSegmentIndex];
// // // // //   const currentSegment = segments && segments[currentSegmentIndex];
// // // // //   const textToDisplay = currentTTSResult?.failed
// // // // //     ? currentSegment?.text || ""
// // // // //     : displayedText;

// // // // //   const [ttsError, setTtsError] = useState(false);
// // // // //   // Optionally, you can track the time at which the next retry is allowed.
// // // // //   const [retryAvailableAt, setRetryAvailableAt] = useState<Date | null>(null);
// // // // //   const [isChunkLoading, setIsChunkLoading] = useState(false);
// // // // //   const [playbackFinished, setPlaybackFinished] = useState(false);



  

// // // // //   // Countdown timer: update estimatedTime every second.
// // // // //   useEffect(() => {
// // // // //     if (estimatedTime > 0) {
// // // // //       const interval = setInterval(() => {
// // // // //         setEstimatedTime(prev => {
// // // // //           if (prev <= 1) {
// // // // //             clearInterval(interval);
// // // // //             return 0;
// // // // //           }
// // // // //           return prev - 1;
// // // // //         });
// // // // //       }, 1000);
// // // // //       return () => clearInterval(interval);
// // // // //     }
// // // // //   }, [estimatedTime]);



// // // // //   // Helper: Update persistent voice mappings.
// // // // //   const updateVoiceMapping = (speakerKey: string, assignment: VoiceAssignment) => {
// // // // //     const newMappings = { ...voiceMappings, [speakerKey]: assignment };
// // // // //     setVoiceMappings(newMappings);
// // // // //     saveVoiceAssignments(newMappings);
// // // // //   };

// // // // //   // Helper: Build context summary from segments.
// // // // //   const buildContextSummary = (segments: Segment[]): string => {
// // // // //     const nonNarrator = segments.filter(
// // // // //       (seg) => seg.speaker.trim().toLowerCase() !== "narrator"
// // // // //     );
// // // // //     const speakerMap: { [key: string]: { speaker: string; gender: string; voice: string } } = {};
// // // // //     nonNarrator.forEach((seg) => {
// // // // //       const key = seg.speaker.trim().toLowerCase();
// // // // //       const gender = (seg.gender === "MALE" || seg.gender === "FEMALE") ? seg.gender : "MALE";
// // // // //       if (!speakerMap[key]) {
// // // // //         speakerMap[key] = {
// // // // //           speaker: seg.speaker,
// // // // //           gender: gender,
// // // // //           voice: seg.voice || "",
// // // // //         };
// // // // //       }
// // // // //     });
// // // // //     const lastSegment = segments[segments.length - 1] || null;
// // // // //     const summary = {
// // // // //       speakers: Object.values(speakerMap),
// // // // //       lastSegment: lastSegment,
// // // // //     };
// // // // //     return JSON.stringify(summary, null, 2);
// // // // //   };

// // // // //   // // Auto-scroll when displayedText updates.
// // // // //   // useEffect(() => {
// // // // //   //   if (textContainerRef.current) {
// // // // //   //     textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
// // // // //   //   }
// // // // //   // }, [displayedText]);

// // // // // // Remove the segment-based scrolling helper and its effect.

// // // // //   // Auto-resume playback effect remains unchanged.
// // // // //   useEffect(() => {
// // // // //     if (!isPlaying && audioQueue.length > 0 && !isChunkLoading) {
// // // // //       handlePlay();
// // // // //     }
// // // // //   }, [audioQueue, isPlaying, isChunkLoading]);

// // // // //   // New effect: Auto-scroll the container when the current text changes.
// // // // //   useEffect(() => {
// // // // //     if (textContainerRef.current) {
// // // // //       textContainerRef.current.scrollTo({
// // // // //         top: textContainerRef.current.scrollHeight,
// // // // //         behavior: "smooth",
// // // // //       });
// // // // //     }
// // // // //   }, [textToDisplay]);

  


// // // // //   // Preload background image.
// // // // //   useEffect(() => {
// // // // //     const preloadImage = new Image();
// // // // //     preloadImage.src = "/images/olderpaper.jpg";
// // // // //   }, []);

// // // // //   // Fetch text automatically when PlayMode opens.
// // // // //   useEffect(() => {
// // // // //     extractText();
// // // // //   }, [extractText]);


// // // // //   const processChunksSequentially = async (chunks: string[]): Promise<void> => {
// // // // //     let combinedSegments: Segment[] = [];
// // // // //     let contextSummary = "";
// // // // //     let failCount = 0; // count TTS failures overall

// // // // //     for (let i = 0; i < chunks.length; i++) {
// // // // //       // Signal that a new chunk is loading
// // // // //       setIsChunkLoading(true);
// // // // //       try {
// // // // //         console.log(`Processing chunk ${i + 1} of ${chunks.length}`);
// // // // //         const payload: any = { text: chunks[i] };
// // // // //         if (i > 0 && contextSummary) {
// // // // //           payload.context = `Context Summary:\n${contextSummary}`;
// // // // //         }
// // // // //         const parseResponse = await axios.post("/api/parse_text", payload);
// // // // //         const { segments: chunkSegments } = parseResponse.data;
// // // // //         console.log(`Parsed segments for chunk ${i + 1}:`, chunkSegments);

// // // // //         const processedSegments: Segment[] = chunkSegments.map((seg: Segment) => {
// // // // //           const normalizedSpeaker = seg.speaker.trim().toLowerCase();
// // // // //           let assignment = voiceMappings[normalizedSpeaker];
// // // // //           if (!assignment) {
// // // // //             const gender: "MALE" | "FEMALE" =
// // // // //               seg.gender === "MALE" || seg.gender === "FEMALE" ? seg.gender : "MALE";
// // // // //             assignment = getVoiceForSpeaker(seg.speaker, gender);
// // // // //             updateVoiceMapping(normalizedSpeaker, assignment);
// // // // //           }
// // // // //           return { ...seg, voice: assignment.voice, gender: seg.gender };
// // // // //         });

// // // // //         combinedSegments = combinedSegments.concat(processedSegments);
// // // // //         setSegments(combinedSegments);
// // // // //         contextSummary = buildContextSummary(combinedSegments);
// // // // //         console.log("Updated Context Summary:", contextSummary);

// // // // //         // Estimate wait time for the chunk
// // // // //         const estimatedTimeForChunk = processedSegments.length * 10;
// // // // //         setEstimatedTime((prev) => prev + estimatedTimeForChunk);

// // // // //         // Fetch TTS results for this batch.
// // // // //         const ttsResultsForChunk = await fetchTTS(processedSegments);

// // // // //         // Count the failures in this batch.
// // // // //         const failedCountForChunk = ttsResultsForChunk.filter(r => r.failed).length;
// // // // //         failCount += failedCountForChunk;
// // // // //         if (failCount > 3) {
// // // // //           setTtsError(true);
// // // // //           setIsLoading(false);
// // // // //           setRetryAvailableAt(new Date(Date.now() + 2 * 60 * 1000));
// // // // //           return;
// // // // //         }

// // // // //         setTTSResults((prev) => [...prev, ...ttsResultsForChunk]);
// // // // //         setAudioQueue((prev) => [
// // // // //           ...prev,
// // // // //           ...ttsResultsForChunk.map((result) => result.audioUrl),
// // // // //         ]);

// // // // //         // (Optional) If this is the very first chunk, you can initialize playback here.
// // // // //         if (i === 0) {
// // // // //           setIsPlaying(true);
// // // // //           setIsPaused(false);
// // // // //           setCurrentSegmentIndex(0);
// // // // //           setDisplayedText("");
// // // // //           setIsLoading(false);
// // // // //         }
// // // // //       } catch (error: any) {
// // // // //         console.error(
// // // // //           `Error processing chunk ${i + 1}:`,
// // // // //           error.response?.data?.error || error.message || error
// // // // //         );
// // // // //         setIsLoading(false);
// // // // //       } finally {
// // // // //         // Mark that this chunk is done processing.
// // // // //         setIsChunkLoading(false);
// // // // //       }
// // // // //     }
// // // // //     console.log("All chunks processed.");
// // // // //   };

  
  

// // // // //   /**
// // // // //    * Splits text into chunks (by paragraphs) that are no longer than maxChunkLength characters.
// // // // //    */
// // // // //   function splitTextIntoChunks(text: string, maxChunkLength: number = 3000): string[] {
// // // // //     const paragraphs = text.split(/\n+/).filter((p) => p.trim() !== "");
// // // // //     const chunks: string[] = [];
// // // // //     let currentChunk = "";
// // // // //     for (const para of paragraphs) {
// // // // //       if ((currentChunk + "\n" + para).length > maxChunkLength) {
// // // // //         if (currentChunk) {
// // // // //           chunks.push(currentChunk);
// // // // //           currentChunk = "";
// // // // //         }
// // // // //         if (para.length > maxChunkLength) {
// // // // //           for (let i = 0; i < para.length; i += maxChunkLength) {
// // // // //             chunks.push(para.slice(i, i + maxChunkLength));
// // // // //           }
// // // // //         } else {
// // // // //           currentChunk = para;
// // // // //         }
// // // // //       } else {
// // // // //         currentChunk += (currentChunk ? "\n" : "") + para;
// // // // //       }
// // // // //     }
// // // // //     if (currentChunk) {
// // // // //       chunks.push(currentChunk);
// // // // //     }
// // // // //     return chunks;
// // // // //   }

// // // // //   // -------------------------
// // // // //   // TTS Function (unchanged from older code)
// // // // //   // -------------------------
// // // // //   const createSilentAudio = (): string => {
// // // // //     const silence = new Uint8Array(1000);
// // // // //     const blob = new Blob([silence], { type: "audio/mp3" });
// // // // //     const url = URL.createObjectURL(blob);
// // // // //     console.log("Created silent audio blob URL:", url);
// // // // //     return url;
// // // // //   };


// // // // //   const fetchTTS = async (batch: Segment[]): Promise<TTSResult[]> => {
// // // // //     const results: TTSResult[] = [];
// // // // //     for (const segment of batch) {
// // // // //       const cacheKey = `${segment.speaker}:${segment.text}`;
// // // // //       const storageKey = `tts_${cacheKey}`;
      
// // // // //       // Log the storage key check.
// // // // //       console.log(`Checking persistent storage for key: ${storageKey}`);
      
// // // // //       // Try loading the audio from persistent storage.
// // // // //       const storedAudioBlob = await loadAudio(storageKey);
// // // // //       if (storedAudioBlob) {
// // // // //         const storedAudioUrl = URL.createObjectURL(storedAudioBlob);
// // // // //         console.log(`Loaded audio from persistent storage for key: ${storageKey}`);
// // // // //         ttsCache.current[cacheKey] = storedAudioUrl;
// // // // //         results.push({ audioUrl: storedAudioUrl, failed: false });
// // // // //         continue;
// // // // //       } else {
// // // // //         console.log(`No stored audio found for key: ${storageKey}. Fetching from API...`);
// // // // //       }
  
// // // // //       if (!segment.voice) {
// // // // //         console.error(`❌ No voice assigned for speaker: ${segment.speaker}`);
// // // // //         results.push({ audioUrl: createSilentAudio(), failed: true });
// // // // //         continue;
// // // // //       }
      
// // // // //       let attempt = 0;
// // // // //       let success = false;
// // // // //       let audioUrl = "";
// // // // //       let failed = false;
      
// // // // //       while (attempt < 3 && !success) {
// // // // //         attempt++;
// // // // //         if (attempt === 1) {
// // // // //           await new Promise((resolve) => setTimeout(resolve, 50));
// // // // //         } else {
// // // // //           console.log(`Waiting 1 minute before next attempt for ${segment.speaker}...`);
// // // // //           await new Promise((resolve) => setTimeout(resolve, 30000));
// // // // //         }
        
// // // // //         try {
// // // // //           const response = await axios.post(
// // // // //             "/api/tts",
// // // // //             {
// // // // //               text: segment.text,
// // // // //               speaker: segment.speaker,
// // // // //               voice: segment.voice,
// // // // //               gender: segment.gender,
// // // // //               voiceMapping: voiceMappings
// // // // //             },
// // // // //             { 
// // // // //               responseType: "blob"
// // // // //             }
// // // // //           );
      
// // // // //           const contentType = response.headers["content-type"];
// // // // //           if (!contentType || !contentType.startsWith("audio/")) {
// // // // //             throw new Error(`Unexpected content-type: ${contentType}`);
// // // // //           }
          
// // // // //           const audioBlob = response.data;
// // // // //           // Save the audio blob persistently.
// // // // //           await saveAudio(storageKey, audioBlob);
// // // // //           console.log(`Saved audio blob to persistent storage with key: ${storageKey}`);
          
// // // // //           audioUrl = URL.createObjectURL(audioBlob);
// // // // //           ttsCache.current[cacheKey] = audioUrl;
// // // // //           console.log(`✅ TTS success for ${segment.speaker} on attempt ${attempt}`);
// // // // //           success = true;
// // // // //         } catch (error: any) {
// // // // //           console.error(`❌ TTS attempt ${attempt} failed for ${segment.speaker}:`, error.message);
// // // // //           if (attempt >= 3) {
// // // // //             audioUrl = createSilentAudio();
// // // // //             failed = true;
// // // // //             console.warn(`Using silent audio fallback for ${segment.speaker} after ${attempt} attempts.`);
// // // // //           }
// // // // //         }
// // // // //       }
// // // // //       results.push({ audioUrl, failed });
// // // // //     }
// // // // //     return results;
// // // // //   };

  

// // // // //   useEffect(() => {
// // // // //     if (isPlaying && currentSegmentIndex < segments.length && audioQueue.length > 0) {
// // // // //       // If an audio element already exists, do nothing.
// // // // //       if (audioRef.current) return;
      
// // // // //       const audioUrl = audioQueue[currentSegmentIndex];
// // // // //       const currentSegment = segments[currentSegmentIndex];
// // // // //       const audio = new Audio(audioUrl);
// // // // //       audio.preload = "auto";
// // // // //       audio.load();
// // // // //       audioRef.current = audio;
  
// // // // //       audio.onended = () => {
// // // // //         setCurrentSegmentIndex((prev) => prev + 1);
// // // // //         setDisplayedText("");
// // // // //         audioRef.current = null;
// // // // //         if (!isPaused) playCurrentSegment();
// // // // //       };
  
// // // // //       audio.onloadedmetadata = () => {
// // // // //         setIsChunkLoading(false);
// // // // //         let duration = audio.duration;
// // // // //         if (isNaN(duration) || duration === Infinity || duration === 0) {
// // // // //           setTimeout(() => {
// // // // //             if (audioRef.current && audioRef.current.duration > 0) {
// // // // //               startTextAnimation(audioRef.current.duration, currentSegment.text);
// // // // //             } else {
// // // // //               console.warn("Falling back to default duration for animation.");
// // // // //               startTextAnimation(5, currentSegment.text);
// // // // //             }
// // // // //           }, 200);
// // // // //         } else {
// // // // //           startTextAnimation(duration, currentSegment.text);
// // // // //         }
// // // // //       };
  
// // // // //       audio.play().catch((err) => {
// // // // //         console.error("Error playing audio:", err);
// // // // //       });
// // // // //     }
// // // // //     // Remove auto-close logic when playback ends:
// // // // //     // else if (currentSegmentIndex >= segments.length && isPlaying) {
// // // // //     //   if (!isLoading && !isChunkLoading) {
// // // // //     //     setIsPlaying(false);
// // // // //     //     alert("Playback finished.");
// // // // //     //   }
// // // // //     // }

    
    
// // // // //     return () => {
// // // // //       if (animationIntervalRef.current) {
// // // // //         clearInterval(animationIntervalRef.current);
// // // // //       }
// // // // //     };
// // // // //   }, [isPlaying, currentSegmentIndex, audioQueue, segments, isPaused, isLoading, isChunkLoading]);
  
  
  
// // // // //   useEffect(() => {
// // // // //     if (isPlaying && currentSegmentIndex >= segments.length) {
// // // // //       setPlaybackFinished(true);
// // // // //     }
// // // // //   }, [isPlaying, currentSegmentIndex, segments]);


// // // // //   const playCurrentSegment = () => {
// // // // //     if (audioRef.current && isPaused) {
// // // // //       // Resume playback if the audio is paused.
// // // // //       audioRef.current.play().catch((err) => console.error("Error resuming audio:", err));
// // // // //       setIsPaused(false);
// // // // //     }
// // // // //   };
  
  
// // // // //   const startTextAnimation = (duration: number, text: string) => {
// // // // //     if (!text) return;
// // // // //     const animationDuration = duration * 100; // Use the proper multiplier.
// // // // //     const words = text.split(" ") || [];
// // // // //     const totalWords = words.length;
// // // // //     const wordInterval = animationDuration / totalWords;
// // // // //     let currentWordIndex = 0;
// // // // //     setDisplayedText("");
  
// // // // //     if (animationIntervalRef.current) {
// // // // //       clearInterval(animationIntervalRef.current);
// // // // //     }
  
// // // // //     animationIntervalRef.current = setInterval(() => {
// // // // //       if (isPaused) return;
// // // // //       if (currentWordIndex < totalWords) {
// // // // //         const word = words[currentWordIndex];
// // // // //         setDisplayedText((prev) => (prev ? `${prev} ${word}`.trim() : word));
// // // // //         currentWordIndex++;
// // // // //       } else {
// // // // //         clearInterval(animationIntervalRef.current!);
// // // // //       }
// // // // //     }, wordInterval);
// // // // //   };
  



// // // // //   // Handle Start: split text into chunks and process them sequentially.
// // // // //   const handleStart = async () => {
// // // // //     if (!currentPageContent.trim()) {
// // // // //       alert("No text found on this page. Try navigating to another page.");
// // // // //       return;
// // // // //     }
// // // // //     setIsLoading(true);
// // // // //     try {
// // // // //       const MAX_CHUNK_LENGTH = 1500;
// // // // //       const chunks = currentPageContent.length > MAX_CHUNK_LENGTH
// // // // //         ? splitTextIntoChunks(currentPageContent, MAX_CHUNK_LENGTH)
// // // // //         : [currentPageContent];
// // // // //       console.log(`Splitting text into ${chunks.length} chunk(s)`);
  
// // // // //       await processChunksSequentially(chunks);
// // // // //     } catch (error: any) {
// // // // //       console.error("Error processing text:", error.response?.data?.error || error.message || error);
// // // // //       alert("Failed to process the text. Please try again.");
// // // // //     } finally {
// // // // //       setIsLoading(false);
// // // // //     }
// // // // //   };

  
// // // // //   // Playback control handlers.
// // // // //   const handlePlay = () => {
// // // // //     if (retryAvailableAt && new Date() < retryAvailableAt) {
// // // // //       alert("Please wait 5 minutes before trying again.");
// // // // //       return;
// // // // //     }
// // // // //     // Reset error state when retrying.
// // // // //     setTtsError(false);
// // // // //     setRetryAvailableAt(null);
// // // // //     if (isPlaying && isPaused && audioRef.current) {
// // // // //       audioRef.current.play().catch((err) => console.error("Error resuming audio:", err));
// // // // //       setIsPaused(false);
// // // // //       return;
// // // // //     }
// // // // //     handleStart();
// // // // //   };
  
  
// // // // //   const handlePause = () => {
// // // // //     if (audioRef.current) {
// // // // //       audioRef.current.pause();
// // // // //     }
// // // // //     setIsPaused(true);
// // // // //   };
  
// // // // //   // const handleStop = () => {
// // // // //   //   if (audioRef.current) {
// // // // //   //     audioRef.current.pause();
// // // // //   //     audioRef.current.currentTime = 0;
// // // // //   //     audioRef.current = null;
// // // // //   //   }
// // // // //   //   if (animationIntervalRef.current) {
// // // // //   //     clearInterval(animationIntervalRef.current);
// // // // //   //   }
// // // // //   //   setIsPlaying(false);
// // // // //   //   setIsPaused(false);
// // // // //   //   setCurrentSegmentIndex(0);
// // // // //   //   setDisplayedText("");
// // // // //   // };


// // // // //   const handleStop = () => {
// // // // //     // Stop and clear the audio element.
// // // // //     if (audioRef.current) {
// // // // //       audioRef.current.pause();
// // // // //       audioRef.current.currentTime = 0;
// // // // //       audioRef.current = null;
// // // // //     }
// // // // //     // Clear any active text animation interval.
// // // // //     if (animationIntervalRef.current) {
// // // // //       clearInterval(animationIntervalRef.current);
// // // // //       animationIntervalRef.current = null;
// // // // //     }
// // // // //     // Reset playback and UI states.
// // // // //     setIsPlaying(false);
// // // // //     setIsPaused(false);
// // // // //     setCurrentSegmentIndex(0);
// // // // //     setDisplayedText("");
// // // // //     // Additional cleanup: clear the audio queue and chunk-loading flag.
// // // // //     setAudioQueue([]);
// // // // //     setIsChunkLoading(false);
// // // // //   };
  
  
// // // // //   const handleBackward = () => {
// // // // //     if (currentSegmentIndex > 0) {
// // // // //       if (audioRef.current) {
// // // // //         audioRef.current.pause();
// // // // //         audioRef.current = null;
// // // // //       }
// // // // //       if (animationIntervalRef.current) {
// // // // //         clearInterval(animationIntervalRef.current);
// // // // //       }
// // // // //       setCurrentSegmentIndex((prev) => prev - 1);
// // // // //       setDisplayedText("");
// // // // //       playCurrentSegment();
// // // // //     }
// // // // //   };
  
// // // // //   const handleForward = () => {
// // // // //     if (currentSegmentIndex < segments.length - 1) {
// // // // //       if (audioRef.current) {
// // // // //         audioRef.current.pause();
// // // // //         audioRef.current = null;
// // // // //       }
// // // // //       if (animationIntervalRef.current) {
// // // // //         clearInterval(animationIntervalRef.current);
// // // // //       }
// // // // //       setCurrentSegmentIndex((prev) => prev + 1);
// // // // //       setDisplayedText("");
// // // // //       playCurrentSegment();
// // // // //     }
// // // // //   };




// // // // // const cleanupPlayback = () => {
// // // // //   // Pause and clear any playing audio.
// // // // //   if (audioRef.current) {
// // // // //     audioRef.current.pause();
// // // // //     audioRef.current = null;
// // // // //   }
// // // // //   // Reset state variables.
// // // // //   setAudioQueue([]);
// // // // //   setIsPlaying(false);
// // // // //   setIsChunkLoading(false);
// // // // //   setCurrentSegmentIndex(0);
// // // // //   setDisplayedText("");
// // // // // };


// // // // // useEffect(() => {
// // // // //   return () => {
// // // // //     cleanupPlayback();
// // // // //   };
// // // // // }, []);



// // // // // return (
// // // // //   <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
// // // // //     <div
// // // // //       className={`
// // // // //         relative bg-white text-gray-900 rounded-lg shadow-lg transition-all duration-300 overflow-hidden 
// // // // //         ${
// // // // //           !isPlaying
// // // // //             ? "w-[300px] h-[400px] sm:w-[650px] sm:max-h-[85%] sm:p-6" // fixed rectangular box when not playing
// // // // //             : "w-full h-full sm:max-w-[800px] sm:h-[85%]"              // flexible container when playing
// // // // //         }
// // // // //       `}
// // // // //     >
// // // // //       {/* Always-visible Close Icon */}
// // // // //       <button
// // // // //         className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 z-50 focus:outline-none"
// // // // //         onMouseDown={() => {
// // // // //           if (typeof window !== "undefined" && window.speechSynthesis) {
// // // // //             window.speechSynthesis.cancel();
// // // // //           }
// // // // //         }}
// // // // //         onClick={() => {
// // // // //           cleanupPlayback();
// // // // //           onClose();
// // // // //         }}
// // // // //         aria-label="Close"
// // // // //       >
// // // // //         <X size={20} />
// // // // //       </button>

// // // // //       {playbackFinished && (
// // // // //         <div className="flex items-center justify-center p-4 bg-yellow-100 text-yellow-800">
// // // // //           Playback finished. Click "Stop" or "Close" to exit.
// // // // //         </div>
// // // // //         )}

// // // // //       {ttsError ? (
// // // // //         <div className="flex flex-col items-center justify-center h-full">
// // // // //           <p className="mt-4 text-base sm:text-lg font-medium text-red-600">
// // // // //             TTS failed multiple times. Please try again in 5 minutes.
// // // // //           </p>
// // // // //         </div>
// // // // //       ) : isLoading ? (
// // // // //         <div className="flex flex-col items-center justify-center h-full">
// // // // //           <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-gray-700"></div>
// // // // //           <p className="mt-4 text-base sm:text-lg font-medium">
// // // // //             Your audio will start in approximately {estimatedTime} seconds...
// // // // //           </p>
// // // // //         </div>
// // // // //       ) : !isPlaying ? (
// // // // //         // When not playing, show the Start Audiobook button inside a fixed rectangular box.
// // // // //         <div className="flex flex-col items-center justify-center gap-4 relative h-full">
// // // // //           <Button
// // // // //             onClick={handlePlay}
// // // // //             className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // // //           >
// // // // //             Start Audiobook
// // // // //           </Button>
// // // // //         </div>
// // // // //       ) : (
// // // // //         // Playback UI: Flexible container that auto-scrolls.
// // // // //         // Instead of rendering all segments, we only render the currently playing text.
// // // // //         <div
// // // // //           className="relative w-full h-full bg-[url('/images/olderpaper.jpg')] bg-cover bg-center p-4 sm:p-8 overflow-y-auto"
// // // // //           ref={textContainerRef}
// // // // //         >
// // // // //           {currentTTSResult?.failed && (
// // // // //             <div className="mb-2 text-sm text-red-600">
// // // // //               Audio unavailable – please read the text below.
// // // // //             </div>
// // // // //           )}
// // // // //           <p className="text-base sm:text-2xl leading-relaxed font-serif">
// // // // //             {textToDisplay}
// // // // //           </p>
// // // // //         </div>
// // // // //         )}


// // // // //       {isPlaying && !ttsError && (
// // // // //         <div className="absolute bottom-4 left-4 flex flex-wrap gap-4">
// // // // //           <Button
// // // // //             onClick={handleBackward}
// // // // //             className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // // //           >
// // // // //             Back
// // // // //           </Button>
// // // // //           {isPaused ? (
// // // // //             <Button
// // // // //               onClick={handlePlay}
// // // // //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // // //             >
// // // // //               <Play size={16} /> Resume
// // // // //             </Button>
// // // // //           ) : (
// // // // //             <Button
// // // // //               onClick={handlePause}
// // // // //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // // //             >
// // // // //               <Pause size={16} /> Pause
// // // // //             </Button>
// // // // //           )}
// // // // //           <Button
// // // // //             onClick={handleForward}
// // // // //             className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // // //           >
// // // // //             Forward
// // // // //           </Button>
// // // // //           <Button
// // // // //             onClick={handleStop}
// // // // //             className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // // //           >
// // // // //             <X size={16} /> Stop
// // // // //           </Button>
// // // // //         </div>
// // // // //       )}
// // // // //     </div>
// // // // //   </div>
// // // // // );


// // // // // };

// // // // // export default PlayMode;



// // // // import React, { useState, useEffect, useRef, useCallback } from "react";
// // // // import { Button } from "@/components/ui/button";
// // // // import { X, Play, Pause } from "lucide-react";
// // // // import axios from "axios";
// // // // import { getVoiceForSpeaker, VoiceAssignment } from "@/pages/api/getVoices";
// // // // import { loadVoiceAssignments, saveVoiceAssignments } from "@/lib/voiceStorage";
// // // // import { saveAudio, loadAudio } from "@/lib/mediaStorage";
// // // // import SHA256 from "crypto-js/sha256";

// // // // // Client-side interfaces
// // // // export interface Segment {
// // // //   speaker: string;
// // // //   text: string;
// // // //   voice?: string; // Assigned voice string.
// // // //   gender: "MALE" | "FEMALE";
// // // // }

// // // // export interface VoiceMapping {
// // // //   voice: string;
// // // //   source: "predefined" | "generated";
// // // // }

// // // // export interface VoiceMappings {
// // // //   [key: string]: VoiceMapping;
// // // // }

// // // // interface TTSResult {
// // // //   audioUrl: string;
// // // //   failed: boolean;
// // // // }

// // // // interface PlayModeProps {
// // // //   currentPageContent: string;
// // // //   onClose: () => void;
// // // //   extractText: () => void;
// // // // }

// // // // const PlayMode: React.FC<PlayModeProps> = ({ currentPageContent, onClose, extractText }) => {
// // // //   // Playback and TTS states
// // // //   const [isPlaying, setIsPlaying] = useState(false);
// // // //   const [isPaused, setIsPaused] = useState(false);
// // // //   const [isLoading, setIsLoading] = useState(false);
// // // //   const [segments, setSegments] = useState<Segment[]>([]);
// // // //   const [voiceMappings, setVoiceMappings] = useState<VoiceMappings>(() => loadVoiceAssignments());
// // // //   const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
// // // //   const [displayedText, setDisplayedText] = useState("");
// // // //   const [audioQueue, setAudioQueue] = useState<string[]>([]);
// // // //   const [ttsResults, setTTSResults] = useState<TTSResult[]>([]);
// // // //   const [estimatedTime, setEstimatedTime] = useState<number>(0);
// // // //   const [ttsError, setTtsError] = useState(false);
// // // //   const [retryAvailableAt, setRetryAvailableAt] = useState<Date | null>(null);
// // // //   const [isChunkLoading, setIsChunkLoading] = useState(false);
// // // //   const [playbackFinished, setPlaybackFinished] = useState(false);

// // // //   // Refs for audio, container, animation, and in-memory TTS cache.
// // // //   const audioRef = useRef<HTMLAudioElement | null>(null);
// // // //   const textContainerRef = useRef<HTMLDivElement | null>(null);
// // // //   const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
// // // //   const ttsCache = useRef<{ [key: string]: string }>({});

// // // //   // Derived values.
// // // //   const currentTTSResult = ttsResults[currentSegmentIndex];
// // // //   const currentSegment = segments[currentSegmentIndex];
// // // //   const textToDisplay = currentTTSResult?.failed ? currentSegment?.text || "" : displayedText;

// // // //   const isAnimationFinishedRef = useRef<boolean>(false);
// // // //   const [isAwaitingNewChunk, setIsAwaitingNewChunk] = useState<boolean>(false);
// // // //   const [allChunksProcessed, setAllChunksProcessed] = useState(false);
// // // //   const [chapterLocation, setChapterLocation] = useState<string | null>(null);





// // // //     // ----------------------------------------------------
// // // //   // Helper: Generate a stable key based on chapter location and absolute segment index.
// // // //   const generateChapterKey = (chapterLocation: string, segmentIndex: number): string => {
// // // //     // Optionally, sanitize chapterLocation if needed.
// // // //     return `tts_${chapterLocation}_${segmentIndex}`;
// // // //   };



// // // //   const locationChanged = (epubcifi: any) => {
// // // //     let newLocation: string | null = null;
// // // //     if (typeof epubcifi === "string") {
// // // //       newLocation = epubcifi;
// // // //     } else if (epubcifi && epubcifi.href) {
// // // //       newLocation = epubcifi.href;
// // // //     } else {
// // // //       console.warn("Unexpected location format:", epubcifi);
// // // //     }
// // // //     if (newLocation) {
// // // //       // If the chapter has changed, clear previous state:
// // // //       if (newLocation !== chapterLocation) {
// // // //         setChapterLocation(newLocation);
// // // //         setSegments([]);
// // // //         setTTSResults([]);
// // // //         setAudioQueue([]);
// // // //         ttsCache.current = {};  // Clear in-memory cache
// // // //       }
// // // //       extractText();
// // // //       localStorage.setItem("currentEpubLocation", newLocation);
// // // //     }
// // // //   };
  
  

// // // //   // const generateSegmentKey = (speaker: string, text: string): string => {
// // // //   //   const normalized = normalizeText(text);
// // // //   //   const hash = SHA256(normalized).toString();
// // // //   //   return `${speaker}:${hash}`;
// // // //   // };




// // // //   // ---------------------------
// // // //   // Helper Functions
// // // //   // ---------------------------
// // // //   const updateVoiceMapping = (speakerKey: string, assignment: VoiceAssignment) => {
// // // //     const newMappings = { ...voiceMappings, [speakerKey]: assignment };
// // // //     setVoiceMappings(newMappings);
// // // //     saveVoiceAssignments(newMappings);
// // // //   };

// // // //   const buildContextSummary = (segments: Segment[]): string => {
// // // //     const nonNarrator = segments.filter(
// // // //       (seg) => seg.speaker.trim().toLowerCase() !== "narrator"
// // // //     );
// // // //     const speakerMap: { [key: string]: { speaker: string; gender: string; voice: string } } = {};
// // // //     nonNarrator.forEach((seg) => {
// // // //       const key = seg.speaker.trim().toLowerCase();
// // // //       const gender = (seg.gender === "MALE" || seg.gender === "FEMALE") ? seg.gender : "MALE";
// // // //       if (!speakerMap[key]) {
// // // //         speakerMap[key] = { speaker: seg.speaker, gender, voice: seg.voice || "" };
// // // //       }
// // // //     });
// // // //     const lastSegment = segments[segments.length - 1] || null;
// // // //     return JSON.stringify({ speakers: Object.values(speakerMap), lastSegment }, null, 2);
// // // //   };

// // // //   const cleanupPlayback = () => {
// // // //     if (audioRef.current) {
// // // //       audioRef.current.pause();
// // // //       audioRef.current.currentTime = 0;
// // // //       audioRef.current = null;
// // // //     }
// // // //     if (animationIntervalRef.current) {
// // // //       clearInterval(animationIntervalRef.current);
// // // //       animationIntervalRef.current = null;
// // // //     }
// // // //     setAudioQueue([]);
// // // //     setIsPlaying(false);
// // // //     setIsChunkLoading(false);
// // // //     setCurrentSegmentIndex(0);
// // // //     setDisplayedText("");
// // // //   };

// // // //   // // ---------------------------
// // // //   // // TTS Fetch Function with Persistent Audio
// // // //   // // ---------------------------
// // // //   // const fetchTTS = async (batch: Segment[]): Promise<TTSResult[]> => {
// // // //   //   const results: TTSResult[] = [];
// // // //   //   for (const segment of batch) {
// // // //   //     const cacheKey = `${segment.speaker}:${segment.text}`;
// // // //   //     const storageKey = `tts_${cacheKey}`;

// // // //   //     console.log(`Checking persistent storage for key: ${storageKey}`);
// // // //   //     const storedAudioBlob = await loadAudio(storageKey);
// // // //   //     if (storedAudioBlob) {
// // // //   //       const storedAudioUrl = URL.createObjectURL(storedAudioBlob);
// // // //   //       console.log(`Loaded audio from persistent storage for key: ${storageKey}`);
// // // //   //       ttsCache.current[cacheKey] = storedAudioUrl;
// // // //   //       results.push({ audioUrl: storedAudioUrl, failed: false });
// // // //   //       continue;
// // // //   //     } else {
// // // //   //       console.log(`No stored audio found for key: ${storageKey}. Fetching from API...`);
// // // //   //     }

// // // //   //     if (!segment.voice) {
// // // //   //       console.error(`❌ No voice assigned for speaker: ${segment.speaker}`);
// // // //   //       results.push({ audioUrl: createSilentAudio(), failed: true });
// // // //   //       continue;
// // // //   //     }

// // // //   //     let attempt = 0;
// // // //   //     let success = false;
// // // //   //     let audioUrl = "";
// // // //   //     let failed = false;

// // // //   //     while (attempt < 3 && !success) {
// // // //   //       attempt++;
// // // //   //       if (attempt === 1) {
// // // //   //         await new Promise((resolve) => setTimeout(resolve, 50));
// // // //   //       } else {
// // // //   //         console.log(`Waiting 1 minute before next attempt for ${segment.speaker}...`);
// // // //   //         await new Promise((resolve) => setTimeout(resolve, 30000));
// // // //   //       }
// // // //   //       try {
// // // //   //         const response = await axios.post(
// // // //   //           "/api/tts",
// // // //   //           {
// // // //   //             text: segment.text,
// // // //   //             speaker: segment.speaker,
// // // //   //             voice: segment.voice,
// // // //   //             gender: segment.gender,
// // // //   //             voiceMapping: voiceMappings,
// // // //   //           },
// // // //   //           { responseType: "blob" }
// // // //   //         );
// // // //   //         const contentType = response.headers["content-type"];
// // // //   //         if (!contentType || !contentType.startsWith("audio/")) {
// // // //   //           throw new Error(`Unexpected content-type: ${contentType}`);
// // // //   //         }
// // // //   //         const audioBlob = response.data;
// // // //   //         await saveAudio(storageKey, audioBlob);
// // // //   //         console.log(`Saved audio blob to persistent storage with key: ${storageKey}`);
// // // //   //         audioUrl = URL.createObjectURL(audioBlob);
// // // //   //         ttsCache.current[cacheKey] = audioUrl;
// // // //   //         console.log(`✅ TTS success for ${segment.speaker} on attempt ${attempt}`);
// // // //   //         success = true;
// // // //   //       } catch (error: any) {
// // // //   //         console.error(`❌ TTS attempt ${attempt} failed for ${segment.speaker}:`, error.message);
// // // //   //         if (attempt >= 3) {
// // // //   //           audioUrl = createSilentAudio();
// // // //   //           failed = true;
// // // //   //           console.warn(`Using silent audio fallback for ${segment.speaker} after ${attempt} attempts.`);
// // // //   //         }
// // // //   //       }
// // // //   //     }
// // // //   //     results.push({ audioUrl, failed });
// // // //   //   }
// // // //   //   return results;
// // // //   // };




// // // //   // const fetchTTS = async (batch: Segment[]): Promise<TTSResult[]> => {
// // // //   //   const results: TTSResult[] = [];
// // // //   //   for (const segment of batch) {
// // // //   //     const cacheKey = generateSegmentKey(segment.speaker, segment.text);
// // // //   //     const storageKey = `tts_${cacheKey}`;
      
// // // //   //     console.log(`Checking persistent storage for key: ${storageKey}`);
// // // //   //     const storedAudioBlob = await loadAudio(storageKey);
// // // //   //     if (storedAudioBlob) {
// // // //   //       const storedAudioUrl = URL.createObjectURL(storedAudioBlob);
// // // //   //       console.log(`Loaded audio from storage for key: ${storageKey}`);
// // // //   //       ttsCache.current[cacheKey] = storedAudioUrl;
// // // //   //       results.push({ audioUrl: storedAudioUrl, failed: false });
// // // //   //       continue;
// // // //   //     } else {
// // // //   //       console.log(`No stored audio found for key: ${storageKey}. Fetching from API...`);
// // // //   //     }
  
// // // //   //     if (!segment.voice) {
// // // //   //       console.error(`No voice assigned for speaker: ${segment.speaker}`);
// // // //   //       results.push({ audioUrl: createSilentAudio(), failed: true });
// // // //   //       continue;
// // // //   //     }
      
// // // //   //     let attempt = 0;
// // // //   //     let success = false;
// // // //   //     let audioUrl = "";
// // // //   //     let failed = false;
      
// // // //   //     while (attempt < 3 && !success) {
// // // //   //       attempt++;
// // // //   //       console.log(`Attempt ${attempt} for TTS of speaker: ${segment.speaker}`);
        
// // // //   //       if (attempt === 1) {
// // // //   //         await new Promise((resolve) => setTimeout(resolve, 50));
// // // //   //       } else {
// // // //   //         console.log(`Waiting before next attempt for ${segment.speaker}...`);
// // // //   //         await new Promise((resolve) => setTimeout(resolve, 30000));
// // // //   //       }
        
// // // //   //       try {
// // // //   //         const response = await axios.post(
// // // //   //           "/api/tts",
// // // //   //           {
// // // //   //             text: segment.text,
// // // //   //             speaker: segment.speaker,
// // // //   //             voice: segment.voice,
// // // //   //             gender: segment.gender,
// // // //   //             voiceMapping: voiceMappings,
// // // //   //           },
// // // //   //           { responseType: "blob" }
// // // //   //         );
      
// // // //   //         const contentType = response.headers["content-type"];
// // // //   //         if (!contentType || !contentType.startsWith("audio/")) {
// // // //   //           throw new Error(`Unexpected content-type: ${contentType}`);
// // // //   //         }
          
// // // //   //         const audioBlob = response.data;
// // // //   //         await saveAudio(storageKey, audioBlob);
// // // //   //         console.log(`Saved audio to storage with key: ${storageKey}`);
          
// // // //   //         audioUrl = URL.createObjectURL(audioBlob);
// // // //   //         ttsCache.current[cacheKey] = audioUrl;
// // // //   //         console.log(`TTS success for ${segment.speaker} on attempt ${attempt}`);
// // // //   //         success = true;
// // // //   //       } catch (error: any) {
// // // //   //         console.error(`TTS attempt ${attempt} failed for ${segment.speaker}:`, error.message);
// // // //   //         if (attempt >= 3) {
// // // //   //           audioUrl = createSilentAudio();
// // // //   //           failed = true;
// // // //   //           console.warn(`Using silent audio fallback for ${segment.speaker} after ${attempt} attempts.`);
// // // //   //         }
// // // //   //       }
// // // //   //     }
// // // //   //     results.push({ audioUrl, failed });
// // // //   //   }
// // // //   //   return results;
// // // //   // };


// // // //     // ----------------------------------------------------
// // // //   // TTS Fetch Function (with Persistent Audio using Chapter Key)
// // // //   // Accept an offset parameter (absolute index of first segment in the batch).
// // // //   const fetchTTS = async (batch: Segment[], offset: number = 0): Promise<TTSResult[]> => {
// // // //     const results: TTSResult[] = [];
// // // //     for (let i = 0; i < batch.length; i++) {
// // // //       const segment = batch[i];
// // // //       const chapterLoc: string = location ? location.toString() : "default";
// // // //       const cacheKey = generateChapterKey(chapterLoc, offset + i);      

// // // //       console.log(`Checking persistent storage for key: ${cacheKey}`);
// // // //       const storedAudioBlob = await loadAudio(cacheKey);
// // // //       if (storedAudioBlob) {
// // // //         const storedAudioUrl = URL.createObjectURL(storedAudioBlob);
// // // //         console.log(`Loaded audio from persistent storage for key: ${cacheKey}`);
// // // //         ttsCache.current[cacheKey] = storedAudioUrl;
// // // //         results.push({ audioUrl: storedAudioUrl, failed: false });
// // // //         continue;
// // // //       } else {
// // // //         console.log(`No stored audio found for key: ${cacheKey}. Fetching from API...`);
// // // //       }

// // // //       if (!segment.voice) {
// // // //         console.error(`No voice assigned for speaker: ${segment.speaker}`);
// // // //         results.push({ audioUrl: createSilentAudio(), failed: true });
// // // //         continue;
// // // //       }

// // // //       let attempt = 0;
// // // //       let success = false;
// // // //       let audioUrl = "";
// // // //       let failed = false;
// // // //       console.log(`Segment index: ${offset + i} | Text: "${segment.text}" | Generated Key: ${cacheKey}`);
// // // //       while (attempt < 3 && !success) {
// // // //         attempt++;
// // // //         if (attempt === 1) {
// // // //           await new Promise((resolve) => setTimeout(resolve, 50));
// // // //         } else {
// // // //           console.log(`Waiting 1 minute before next attempt for ${segment.speaker}...`);
// // // //           await new Promise((resolve) => setTimeout(resolve, 30000));
// // // //         }
// // // //         try {
// // // //           const response = await axios.post(
// // // //             "/api/tts",
// // // //             {
// // // //               text: segment.text,
// // // //               speaker: segment.speaker,
// // // //               voice: segment.voice,
// // // //               gender: segment.gender,
// // // //               voiceMapping: voiceMappings,
// // // //             },
// // // //             { responseType: "blob" }
// // // //           );
// // // //           const contentType = response.headers["content-type"];
// // // //           if (!contentType || !contentType.startsWith("audio/")) {
// // // //             throw new Error(`Unexpected content-type: ${contentType}`);
// // // //           }
// // // //           const audioBlob = response.data;
// // // //           await saveAudio(cacheKey, audioBlob);
// // // //           console.log(`Saved audio to storage with key: ${cacheKey}`);
// // // //           audioUrl = URL.createObjectURL(audioBlob);
// // // //           ttsCache.current[cacheKey] = audioUrl;
// // // //           console.log(`TTS success for ${segment.speaker} on attempt ${attempt}`);
// // // //           success = true;
// // // //         } catch (error: any) {
// // // //           console.error(`TTS attempt ${attempt} failed for ${segment.speaker}:`, error.message);
// // // //           if (attempt >= 3) {
// // // //             audioUrl = createSilentAudio();
// // // //             failed = true;
// // // //             console.warn(`Using silent audio fallback for ${segment.speaker} after ${attempt} attempts.`);
// // // //           }
// // // //         }
// // // //       }
// // // //       results.push({ audioUrl, failed });
// // // //     }
// // // //     return results;
// // // //   };

  

// // // //   const createSilentAudio = (): string => {
// // // //     const silence = new Uint8Array(1000);
// // // //     const blob = new Blob([silence], { type: "audio/mp3" });
// // // //     const url = URL.createObjectURL(blob);
// // // //     console.log("Created silent audio blob URL:", url);
// // // //     return url;
// // // //   };

// // // //   // ---------------------------
// // // //   // Effects
// // // //   // ---------------------------
// // // //   // Countdown timer for estimated audio wait time.
// // // //   useEffect(() => {
// // // //     if (estimatedTime > 0) {
// // // //       const interval = setInterval(() => {
// // // //         setEstimatedTime((prev) => {
// // // //           if (prev <= 1) {
// // // //             clearInterval(interval);
// // // //             return 0;
// // // //           }
// // // //           return prev - 1;
// // // //         });
// // // //       }, 1000);
// // // //       return () => clearInterval(interval);
// // // //     }
// // // //   }, [estimatedTime]);

// // // //   // // Auto-resume playback if audio queue exists and not loading a chunk.
// // // //   // useEffect(() => {
// // // //   //   if (!isPlaying && audioQueue.length > 0 && !isChunkLoading) {
// // // //   //     handlePlay();
// // // //   //   }
// // // //   // }, [audioQueue, isPlaying, isChunkLoading]);


// // // //     // Auto-resume playback effect (only if not finished).
// // // //   useEffect(() => {
// // // //     if (!isPlaying && audioQueue.length > 0 && !isChunkLoading && !playbackFinished) {
// // // //       handlePlay();
// // // //     }
// // // //   }, [audioQueue, isPlaying, isChunkLoading, playbackFinished]);

// // // //   // Auto-scroll container when text updates.
// // // //   useEffect(() => {
// // // //     if (textContainerRef.current) {
// // // //       textContainerRef.current.scrollTo({
// // // //         top: textContainerRef.current.scrollHeight,
// // // //         behavior: "smooth",
// // // //       });
// // // //     }
// // // //   }, [textToDisplay]);

// // // //   // Preload background image.
// // // //   useEffect(() => {
// // // //     const preloadImage = new Image();
// // // //     preloadImage.src = "/images/olderpaper.jpg";
// // // //   }, []);

// // // //   // Fetch text automatically when PlayMode opens.
// // // //   useEffect(() => {
// // // //     extractText();
// // // //   }, [extractText]);

// // // //   // Cleanup playback on unmount.
// // // //   useEffect(() => {
// // // //     return () => {
// // // //       cleanupPlayback();
// // // //     };
// // // //   }, []);

// // // //   // // ---------------------------
// // // //   // // Playback Handling
// // // //   // // ---------------------------
// // // //   // const processChunksSequentially = async (chunks: string[]): Promise<void> => {
// // // //   //   let combinedSegments: Segment[] = [];
// // // //   //   let contextSummary = "";
// // // //   //   let failCount = 0;

// // // //   //   for (let i = 0; i < chunks.length; i++) {
// // // //   //     setIsChunkLoading(true);
// // // //   //     try {
// // // //   //       console.log(`Processing chunk ${i + 1} of ${chunks.length}`);
// // // //   //       const payload: any = { text: chunks[i] };
// // // //   //       if (i > 0 && contextSummary) {
// // // //   //         payload.context = `Context Summary:\n${contextSummary}`;
// // // //   //       }
// // // //   //       const parseResponse = await axios.post("/api/parse_text", payload);
// // // //   //       const { segments: chunkSegments } = parseResponse.data;
// // // //   //       console.log(`Parsed segments for chunk ${i + 1}:`, chunkSegments);

// // // //   //       const processedSegments: Segment[] = chunkSegments.map((seg: Segment) => {
// // // //   //         const normalizedSpeaker = seg.speaker.trim().toLowerCase();
// // // //   //         let assignment = voiceMappings[normalizedSpeaker];
// // // //   //         if (!assignment) {
// // // //   //           const gender = seg.gender === "MALE" || seg.gender === "FEMALE" ? seg.gender : "MALE";
// // // //   //           assignment = getVoiceForSpeaker(seg.speaker, gender);
// // // //   //           updateVoiceMapping(normalizedSpeaker, assignment);
// // // //   //         }
// // // //   //         return { ...seg, voice: assignment.voice, gender: seg.gender };
// // // //   //       });

// // // //   //       combinedSegments = combinedSegments.concat(processedSegments);
// // // //   //       setSegments(combinedSegments);
// // // //   //       contextSummary = buildContextSummary(combinedSegments);
// // // //   //       console.log("Updated Context Summary:", contextSummary);

// // // //   //       const estimatedTimeForChunk = processedSegments.length * 10;
// // // //   //       setEstimatedTime((prev) => prev + estimatedTimeForChunk);

// // // //   //       const ttsResultsForChunk = await fetchTTS(processedSegments);
// // // //   //       const failedCountForChunk = ttsResultsForChunk.filter(r => r.failed).length;
// // // //   //       failCount += failedCountForChunk;
// // // //   //       // You might do:
// // // //   //       if (failCount > segments.length * 0.5) { // if more than 50% failed, then show error
// // // //   //         setTtsError(true);
// // // //   //         setIsLoading(false);
// // // //   //         setRetryAvailableAt(new Date(Date.now() + 2 * 60 * 1000));
// // // //   //         return;
// // // //   //       }

// // // //   //       setTTSResults((prev) => [...prev, ...ttsResultsForChunk]);
// // // //   //       setAudioQueue((prev) => [
// // // //   //         ...prev,
// // // //   //         ...ttsResultsForChunk.map((result) => result.audioUrl),
// // // //   //       ]);

// // // //   //       if (i === 0) {
// // // //   //         setIsPlaying(true);
// // // //   //         setIsPaused(false);
// // // //   //         setCurrentSegmentIndex(0);
// // // //   //         setDisplayedText("");
// // // //   //         setIsLoading(false);
// // // //   //       }
// // // //   //     } catch (error: any) {
// // // //   //       console.error(
// // // //   //         `Error processing chunk ${i + 1}:`,
// // // //   //         error.response?.data?.error || error.message || error
// // // //   //       );
// // // //   //       setIsLoading(false);
// // // //   //     } finally {
// // // //   //       setIsChunkLoading(false);
// // // //   //     }
// // // //   //   }
// // // //   //   console.log("All chunks processed.");
// // // //   //   // At the end of processChunksSequentially, after processing the last chunk:
// // // //   //   setAllChunksProcessed(true);

// // // //   // };


// // // //   //   // ----------------------------------------------------
// // // //   // // Process Chunks Sequentially
// // // //   // // ----------------------------------------------------
// // // //   // const processChunksSequentially = async (chunks: string[]): Promise<void> => {
// // // //   //   let combinedSegments: Segment[] = [];
// // // //   //   let contextSummary = "";
// // // //   //   let failCount = 0;
// // // //   //   let offset = combinedSegments.length; // starting offset for keys

// // // //   //   for (let i = 0; i < chunks.length; i++) {
// // // //   //     setIsChunkLoading(true);
// // // //   //     try {
// // // //   //       console.log(`Processing chunk ${i + 1} of ${chunks.length}`);
// // // //   //       const payload: any = { text: chunks[i] };
// // // //   //       if (i > 0 && contextSummary) {
// // // //   //         payload.context = `Context Summary:\n${contextSummary}`;
// // // //   //       }
// // // //   //       const parseResponse = await axios.post("/api/parse_text", payload);
// // // //   //       const { segments: chunkSegments } = parseResponse.data;
// // // //   //       console.log(`Parsed segments for chunk ${i + 1}:`, chunkSegments);

// // // //   //       const processedSegments: Segment[] = chunkSegments.map((seg: Segment) => {
// // // //   //         const normalizedSpeaker = seg.speaker.trim().toLowerCase();
// // // //   //         let assignment = voiceMappings[normalizedSpeaker];
// // // //   //         if (!assignment) {
// // // //   //           const gender = (seg.gender === "MALE" || seg.gender === "FEMALE") ? seg.gender : "MALE";
// // // //   //           assignment = getVoiceForSpeaker(seg.speaker, gender);
// // // //   //           updateVoiceMapping(normalizedSpeaker, assignment);
// // // //   //         }
// // // //   //         return { ...seg, voice: assignment.voice, gender: seg.gender };
// // // //   //       });

// // // //   //       combinedSegments = combinedSegments.concat(processedSegments);
// // // //   //       setSegments(combinedSegments);
// // // //   //       contextSummary = buildContextSummary(combinedSegments);
// // // //   //       console.log("Updated Context Summary:", contextSummary);

// // // //   //       const estimatedTimeForChunk = processedSegments.length * 10;
// // // //   //       setEstimatedTime((prev) => prev + estimatedTimeForChunk);

// // // //   //       const ttsResultsForChunk = await fetchTTS(processedSegments, offset);
// // // //   //       const failedCountForChunk = ttsResultsForChunk.filter((r) => r.failed).length;
// // // //   //       failCount += failedCountForChunk;
// // // //   //       if (failCount > 3) {
// // // //   //         setTtsError(true);
// // // //   //         setIsLoading(false);
// // // //   //         setRetryAvailableAt(new Date(Date.now() + 2 * 60 * 1000));
// // // //   //         return;
// // // //   //       }

// // // //   //       setTTSResults((prev) => [...prev, ...ttsResultsForChunk]);
// // // //   //       setAudioQueue((prev) => [
// // // //   //         ...prev,
// // // //   //         ...ttsResultsForChunk.map((result) => result.audioUrl),
// // // //   //       ]);
// // // //   //       offset += processedSegments.length;

// // // //   //       if (i === 0) {
// // // //   //         setIsPlaying(true);
// // // //   //         setIsPaused(false);
// // // //   //         setCurrentSegmentIndex(0);
// // // //   //         setDisplayedText("");
// // // //   //         setIsLoading(false);
// // // //   //       }
// // // //   //     } catch (error: any) {
// // // //   //       console.error(
// // // //   //         `Error processing chunk ${i + 1}:`,
// // // //   //         error.response?.data?.error || error.message || error
// // // //   //       );
// // // //   //       setIsLoading(false);
// // // //   //     } finally {
// // // //   //       setIsChunkLoading(false);
// // // //   //     }
// // // //   //   }
// // // //   //   console.log("All chunks processed.");
// // // //   //   setAllChunksProcessed(true);
// // // //   // };


// // // //   const processChunksSequentially = async (chunks: string[]): Promise<void> => {
// // // //   let combinedSegments: Segment[] = [];
// // // //   let contextSummary = "";
// // // //   let failCount = 0;
// // // //   let offset = 0; // start offset at 0 for the chapter

// // // //   for (let i = 0; i < chunks.length; i++) {
// // // //     setIsChunkLoading(true);
// // // //     try {
// // // //       console.log(`Processing chunk ${i + 1} of ${chunks.length}`);
// // // //       const payload: any = { text: chunks[i] };
// // // //       if (i > 0 && contextSummary) {
// // // //         payload.context = `Context Summary:\n${contextSummary}`;
// // // //       }
// // // //       const parseResponse = await axios.post("/api/parse_text", payload);
// // // //       const { segments: chunkSegments } = parseResponse.data;
// // // //       console.log(`Parsed segments for chunk ${i + 1}:`, chunkSegments);

// // // //       const processedSegments: Segment[] = chunkSegments.map((seg: Segment) => {
// // // //         const normalizedSpeaker = seg.speaker.trim().toLowerCase();
// // // //         let assignment = voiceMappings[normalizedSpeaker];
// // // //         if (!assignment) {
// // // //           const gender = (seg.gender === "MALE" || seg.gender === "FEMALE") ? seg.gender : "MALE";
// // // //           assignment = getVoiceForSpeaker(seg.speaker, gender);
// // // //           updateVoiceMapping(normalizedSpeaker, assignment);
// // // //         }
// // // //         return { ...seg, voice: assignment.voice, gender: seg.gender };
// // // //       });

// // // //       combinedSegments = [...combinedSegments, ...processedSegments];
// // // //       setSegments(combinedSegments);
// // // //       contextSummary = buildContextSummary(combinedSegments);
// // // //       console.log("Updated Context Summary:", contextSummary);

// // // //       const estimatedTimeForChunk = processedSegments.length * 10;
// // // //       setEstimatedTime((prev) => prev + estimatedTimeForChunk);

// // // //       // Call fetchTTS with the current offset so that keys are generated as:
// // // //       // "tts_<chapterLocation>_<absoluteIndex>"
// // // //       const ttsResultsForChunk = await fetchTTS(processedSegments, offset);
// // // //       const failedCountForChunk = ttsResultsForChunk.filter(r => r.failed).length;
// // // //       failCount += failedCountForChunk;
// // // //       if (failCount > 3) {
// // // //         setTtsError(true);
// // // //         setIsLoading(false);
// // // //         setRetryAvailableAt(new Date(Date.now() + 2 * 60 * 1000));
// // // //         return;
// // // //       }

// // // //       setTTSResults((prev) => [...prev, ...ttsResultsForChunk]);
// // // //       setAudioQueue((prev) => [
// // // //         ...prev,
// // // //         ...ttsResultsForChunk.map((result) => result.audioUrl),
// // // //       ]);

// // // //       offset += processedSegments.length; // update offset for next chunk

// // // //       if (i === 0) {
// // // //         setIsPlaying(true);
// // // //         setIsPaused(false);
// // // //         setCurrentSegmentIndex(0);
// // // //         setDisplayedText("");
// // // //         setIsLoading(false);
// // // //       }
// // // //     } catch (error: any) {
// // // //       console.error(
// // // //         `Error processing chunk ${i + 1}:`,
// // // //         error.response?.data?.error || error.message || error
// // // //       );
// // // //       setIsLoading(false);
// // // //     } finally {
// // // //       setIsChunkLoading(false);
// // // //     }
// // // //   }
// // // //   console.log("All chunks processed.");
// // // //   setAllChunksProcessed(true);
// // // // };



// // // //   const splitTextIntoChunks = (text: string, maxChunkLength: number = 3000): string[] => {
// // // //     const paragraphs = text.split(/\n+/).filter((p) => p.trim() !== "");
// // // //     const chunks: string[] = [];
// // // //     let currentChunk = "";
// // // //     for (const para of paragraphs) {
// // // //       if ((currentChunk + "\n" + para).length > maxChunkLength) {
// // // //         if (currentChunk) {
// // // //           chunks.push(currentChunk);
// // // //           currentChunk = "";
// // // //         }
// // // //         if (para.length > maxChunkLength) {
// // // //           for (let i = 0; i < para.length; i += maxChunkLength) {
// // // //             chunks.push(para.slice(i, i + maxChunkLength));
// // // //           }
// // // //         } else {
// // // //           currentChunk = para;
// // // //         }
// // // //       } else {
// // // //         currentChunk += (currentChunk ? "\n" : "") + para;
// // // //       }
// // // //     }
// // // //     if (currentChunk) {
// // // //       chunks.push(currentChunk);
// // // //     }
// // // //     return chunks;
// // // //   };

// // // //   const playCurrentSegment = () => {
// // // //     if (audioRef.current && isPaused) {
// // // //       audioRef.current.play().catch((err) => console.error("Error resuming audio:", err));
// // // //       setIsPaused(false);
// // // //     }
// // // //   };

// // // //   // const startTextAnimation = (duration: number, text: string) => {
// // // //   //   if (!text) return;
// // // //   //   const animationDuration = duration * 0;
// // // //   //   const words = text.split(" ") || [];
// // // //   //   const totalWords = words.length;
// // // //   //   const wordInterval = animationDuration / totalWords;
// // // //   //   let currentWordIndex = 0;
// // // //   //   setDisplayedText("");
// // // //   //   if (animationIntervalRef.current) {
// // // //   //     clearInterval(animationIntervalRef.current);
// // // //   //   }
// // // //   //   animationIntervalRef.current = setInterval(() => {
// // // //   //     if (isPaused) return;
// // // //   //     if (currentWordIndex < totalWords) {
// // // //   //       const word = words[currentWordIndex];
// // // //   //       setDisplayedText((prev) => {
// // // //   //         const updatedText = prev ? `${prev} ${word}`.trim() : word;
// // // //   //         console.log(`Displaying word ${currentWordIndex + 1} of ${totalWords}:`, updatedText);
// // // //   //         return updatedText;
// // // //   //       });
// // // //   //       currentWordIndex++;
// // // //   //     } else {
// // // //   //       clearInterval(animationIntervalRef.current!);
// // // //   //     }
// // // //   //   }, wordInterval);
    
// // // //   // };


// // // //   const startTextAnimation = (duration: number, text: string) => {
// // // //     if (!text) return;
// // // //     isAnimationFinishedRef.current = false; // Reset flag at start
// // // //     const animationDuration = duration * 100; // Use the proper multiplier.
// // // //     const words = text.split(" ") || [];
// // // //     const totalWords = words.length;
// // // //     const wordInterval = animationDuration / totalWords;
// // // //     let currentWordIndex = 0;
// // // //     setDisplayedText("");
    
// // // //     if (animationIntervalRef.current) {
// // // //       clearInterval(animationIntervalRef.current);
// // // //     }
    
// // // //     animationIntervalRef.current = setInterval(() => {
// // // //       if (isPaused) return;
// // // //       if (currentWordIndex < totalWords) {
// // // //         const word = words[currentWordIndex];
// // // //         setDisplayedText((prev) => (prev ? `${prev} ${word}`.trim() : word));
// // // //         currentWordIndex++;
// // // //         if (currentWordIndex === totalWords) {
// // // //           // Mark the animation as finished once the last word is displayed.
// // // //           isAnimationFinishedRef.current = true;
// // // //         }
// // // //       } else {
// // // //         clearInterval(animationIntervalRef.current!);
// // // //       }
// // // //     }, wordInterval);
// // // //   };
  

// // // //   // ---------------------------
// // // //   // Playback Control Handlers
// // // //   // ---------------------------
// // // //   const handleStart = async () => {
// // // //     if (!currentPageContent.trim()) {
// // // //       alert("No text found on this page. Try navigating to another page.");
// // // //       return;
// // // //     }
// // // //     setIsLoading(true);
// // // //     try {
// // // //       const MAX_CHUNK_LENGTH = 1500;
// // // //       const chunks = currentPageContent.length > MAX_CHUNK_LENGTH
// // // //         ? splitTextIntoChunks(currentPageContent, MAX_CHUNK_LENGTH)
// // // //         : [currentPageContent];
// // // //       console.log(`Splitting text into ${chunks.length} chunk(s)`);
// // // //       await processChunksSequentially(chunks);
// // // //     } catch (error: any) {
// // // //       console.error("Error processing text:", error.response?.data?.error || error.message || error);
// // // //       alert("Failed to process the text. Please try again.");
// // // //     } finally {
// // // //       setIsLoading(false);
// // // //     }
// // // //   };

// // // //   const handlePlay = () => {
// // // //     if (retryAvailableAt && new Date() < retryAvailableAt) {
// // // //       alert("Please wait 5 minutes before trying again.");
// // // //       return;
// // // //     }
// // // //     setTtsError(false);
// // // //     setRetryAvailableAt(null);
// // // //     if (isPlaying && isPaused && audioRef.current) {
// // // //       audioRef.current.play().catch((err) => console.error("Error resuming audio:", err));
// // // //       setIsPaused(false);
// // // //       return;
// // // //     }
// // // //     handleStart();
// // // //   };

// // // //   const handlePause = () => {
// // // //     if (audioRef.current) {
// // // //       audioRef.current.pause();
// // // //     }
// // // //     setIsPaused(true);
// // // //   };

// // // //   const handleStop = () => {
// // // //     if (audioRef.current) {
// // // //       audioRef.current.pause();
// // // //       audioRef.current.currentTime = 0;
// // // //       audioRef.current = null;
// // // //     }
// // // //     if (animationIntervalRef.current) {
// // // //       clearInterval(animationIntervalRef.current);
// // // //       animationIntervalRef.current = null;
// // // //     }
// // // //     setIsPlaying(false);
// // // //     setIsPaused(false);
// // // //     setCurrentSegmentIndex(0);
// // // //     setDisplayedText("");
// // // //     setAudioQueue([]);
// // // //     setIsChunkLoading(false);
// // // //   };

// // // //   const handleBackward = () => {
// // // //     if (currentSegmentIndex > 0) {
// // // //       if (audioRef.current) {
// // // //         audioRef.current.pause();
// // // //         audioRef.current = null;
// // // //       }
// // // //       if (animationIntervalRef.current) {
// // // //         clearInterval(animationIntervalRef.current);
// // // //       }
// // // //       setCurrentSegmentIndex((prev) => prev - 1);
// // // //       setDisplayedText("");
// // // //       playCurrentSegment();
// // // //     }
// // // //   };

// // // //   const handleForward = () => {
// // // //     if (currentSegmentIndex < segments.length - 1) {
// // // //       if (audioRef.current) {
// // // //         audioRef.current.pause();
// // // //         audioRef.current = null;
// // // //       }
// // // //       if (animationIntervalRef.current) {
// // // //         clearInterval(animationIntervalRef.current);
// // // //       }
// // // //       setCurrentSegmentIndex((prev) => prev + 1);
// // // //       setDisplayedText("");
// // // //       playCurrentSegment();
// // // //     }
// // // //   };

// // // // //   // ---------------------------
// // // // //   // Playback Effects
// // // // //   // ---------------------------
// // // // //   // useEffect(() => {
// // // // //   //   if (isPlaying && currentSegmentIndex < segments.length && audioQueue.length > 0) {
// // // // //   //     if (audioRef.current) return;
// // // // //   //     const audioUrl = audioQueue[currentSegmentIndex];
// // // // //   //     const currentSeg = segments[currentSegmentIndex];
// // // // //   //     const audio = new Audio(audioUrl);
// // // // //   //     audio.preload = "auto";
// // // // //   //     audio.load();
// // // // //   //     audioRef.current = audio;

// // // // //   //     // audio.onended = () => {
// // // // //   //     //   setCurrentSegmentIndex((prev) => prev + 1);
// // // // //   //     //   setDisplayedText("");
// // // // //   //     //   audioRef.current = null;
// // // // //   //     //   if (!isPaused) playCurrentSegment();
// // // // //   //     // };

// // // // //   //     audio.onended = () => {
// // // // //   //       if (!isAnimationFinishedRef.current) {
// // // // //   //         // If the animation hasn't finished, delay the clearing.
// // // // //   //         setTimeout(() => {
// // // // //   //           setDisplayedText("");
// // // // //   //           audioRef.current = null;
// // // // //   //           if (!isPaused) playCurrentSegment();
// // // // //   //         }, 500); // Adjust the delay as needed
// // // // //   //       } else {
// // // // //   //         setDisplayedText("");
// // // // //   //         audioRef.current = null;
// // // // //   //         if (!isPaused) playCurrentSegment();
// // // // //   //       }
// // // // //   //     };      

// // // // //   //     audio.onloadedmetadata = () => {
// // // // //   //       setIsChunkLoading(false);
// // // // //   //       let duration = audio.duration;
// // // // //   //       if (isNaN(duration) || duration === Infinity || duration === 0) {
// // // // //   //         setTimeout(() => {
// // // // //   //           if (audioRef.current && audioRef.current.duration > 0) {
// // // // //   //             startTextAnimation(audioRef.current.duration, currentSeg.text);
// // // // //   //           } else {
// // // // //   //             console.warn("Falling back to default duration for animation.");
// // // // //   //             startTextAnimation(5, currentSeg.text);
// // // // //   //           }
// // // // //   //         }, 200);
// // // // //   //       } else {
// // // // //   //         startTextAnimation(duration, currentSeg.text);
// // // // //   //       }
// // // // //   //     };

// // // // //   //     audio.play().catch((err) => {
// // // // //   //       console.error("Error playing audio:", err);
// // // // //   //     });
// // // // //   //   }
// // // // //   //   return () => {
// // // // //   //     if (animationIntervalRef.current) {
// // // // //   //       clearInterval(animationIntervalRef.current);
// // // // //   //     }
// // // // //   //   };
// // // // //   // }, [isPlaying, currentSegmentIndex, audioQueue, segments, isPaused, isLoading, isChunkLoading]);

// // // // //   // useEffect(() => {
// // // // //   //   if (isPlaying && currentSegmentIndex >= segments.length) {
// // // // //   //     setPlaybackFinished(true);
// // // // //   //   }
// // // // //   // }, [isPlaying, currentSegmentIndex, segments]);



// // // // //   // In your playback effect (where you create and play the audio):
// // // // // // useEffect(() => {
// // // // // //   if (isPlaying && currentSegmentIndex < segments.length && audioQueue.length > 0) {
// // // // // //     if (audioRef.current) return;

// // // // // //     const audioUrl = audioQueue[currentSegmentIndex];
// // // // // //     const currentSeg = segments[currentSegmentIndex];
// // // // // //     const audio = new Audio(audioUrl);
// // // // // //     audio.preload = "auto";
// // // // // //     audio.load();
// // // // // //     audioRef.current = audio;

// // // // // //     audio.onended = () => {
// // // // // //       // Calculate next index.
// // // // // //       const nextIndex = currentSegmentIndex + 1;
// // // // // //       setCurrentSegmentIndex(nextIndex);
// // // // // //       setDisplayedText("");
// // // // // //       audioRef.current = null;

// // // // // //       // If next segment exists, play it; otherwise, pause playback until new audio is queued.
// // // // // //       if (nextIndex < audioQueue.length) {
// // // // // //         playCurrentSegment();
// // // // // //       } else {
// // // // // //         console.log("Reached the end of the current audio queue. Waiting for new chunks...");
// // // // // //         setIsAwaitingNewChunk(true);
// // // // // //       }
// // // // // //     };

// // // // // //     audio.onloadedmetadata = () => {
// // // // // //       setIsChunkLoading(false);
// // // // // //       let duration = audio.duration;
// // // // // //       if (isNaN(duration) || duration === Infinity || duration === 0) {
// // // // // //         setTimeout(() => {
// // // // // //           if (audioRef.current && audioRef.current.duration > 0) {
// // // // // //             startTextAnimation(audioRef.current.duration, currentSeg.text);
// // // // // //           } else {
// // // // // //             console.warn("Falling back to default duration for animation.");
// // // // // //             startTextAnimation(5, currentSeg.text);
// // // // // //           }
// // // // // //         }, 200);
// // // // // //       } else {
// // // // // //         startTextAnimation(duration, currentSeg.text);
// // // // // //       }
// // // // // //     };

// // // // // //     audio.play().catch((err) => {
// // // // // //       console.error("Error playing audio:", err);
// // // // // //     });
// // // // // //   }
// // // // // //   return () => {
// // // // // //     if (animationIntervalRef.current) {
// // // // // //       clearInterval(animationIntervalRef.current);
// // // // // //     }
// // // // // //   };
// // // // // // }, [isPlaying, currentSegmentIndex, audioQueue, segments, isPaused, isLoading, isChunkLoading]);



// // // // // useEffect(() => {
// // // // //   if (isPlaying && currentSegmentIndex < segments.length && audioQueue.length > 0) {
// // // // //     if (audioRef.current) return;

// // // // //     const audioUrl = audioQueue[currentSegmentIndex];
// // // // //     const currentSeg = segments[currentSegmentIndex];
// // // // //     const audio = new Audio(audioUrl);
// // // // //     audio.preload = "auto";
// // // // //     audio.load();
// // // // //     audioRef.current = audio;

// // // // //     audio.onended = () => {
// // // // //       const nextIndex = currentSegmentIndex + 1;
// // // // //       setDisplayedText("");
// // // // //       audioRef.current = null;

// // // // //       // If there is a next segment, continue playback;
// // // // //       // otherwise, mark playback as finished.
// // // // //       if (nextIndex < audioQueue.length) {
// // // // //         setCurrentSegmentIndex(nextIndex);
// // // // //         if (!isPaused) playCurrentSegment();
// // // // //       } else {
// // // // //         console.log("Reached the end of the current audio queue. Marking playback as finished.");
// // // // //         setPlaybackFinished(true);
// // // // //       }
// // // // //     };

// // // // //     audio.onloadedmetadata = () => {
// // // // //       setIsChunkLoading(false);
// // // // //       let duration = audio.duration;
// // // // //       if (isNaN(duration) || duration === Infinity || duration === 0) {
// // // // //         setTimeout(() => {
// // // // //           if (audioRef.current && audioRef.current.duration > 0) {
// // // // //             startTextAnimation(audioRef.current.duration, currentSeg.text);
// // // // //           } else {
// // // // //             console.warn("Falling back to default duration for animation.");
// // // // //             startTextAnimation(5, currentSeg.text);
// // // // //           }
// // // // //         }, 200);
// // // // //       } else {
// // // // //         startTextAnimation(duration, currentSeg.text);
// // // // //       }
// // // // //     };

// // // // //     audio.play().catch((err) => {
// // // // //       console.error("Error playing audio:", err);
// // // // //     });
// // // // //   }
// // // // //   return () => {
// // // // //     if (animationIntervalRef.current) {
// // // // //       clearInterval(animationIntervalRef.current);
// // // // //     }
// // // // //   };
// // // // // }, [isPlaying, currentSegmentIndex, audioQueue, segments, isPaused, isLoading, isChunkLoading]);




// // // // // // Add an effect to watch for new audio chunks:
// // // // // useEffect(() => {
// // // // //   // Auto-resume only if we're waiting for new audio chunks AND playback is not marked finished.
// // // // //   if (isAwaitingNewChunk && !playbackFinished && audioQueue.length > currentSegmentIndex + 1) {
// // // // //     console.log("New audio chunk detected. Resuming playback...");
// // // // //     setIsAwaitingNewChunk(false);
// // // // //     playCurrentSegment();
// // // // //   }
// // // // // }, [audioQueue, isAwaitingNewChunk, currentSegmentIndex, playbackFinished]);



// // // // // Effect to set playbackFinished only when all chunks are done:
// // // // useEffect(() => {
// // // //   if (isPlaying && allChunksProcessed && currentSegmentIndex >= segments.length) {
// // // //     setPlaybackFinished(true);
// // // //   }
// // // // }, [isPlaying, currentSegmentIndex, segments, allChunksProcessed]);

// // // // // Playback effect (unchanged except for the new flag check in auto-resume effect below)
// // // // useEffect(() => {
// // // //   if (isPlaying && currentSegmentIndex < segments.length && audioQueue.length > 0) {
// // // //     if (audioRef.current) return;

// // // //     const audioUrl = audioQueue[currentSegmentIndex];
// // // //     const currentSeg = segments[currentSegmentIndex];
// // // //     const audio = new Audio(audioUrl);
// // // //     audio.preload = "auto";
// // // //     audio.load();
// // // //     audioRef.current = audio;

// // // //     audio.onended = () => {
// // // //       const nextIndex = currentSegmentIndex + 1;
// // // //       setDisplayedText("");
// // // //       audioRef.current = null;

// // // //       if (nextIndex < audioQueue.length) {
// // // //         setCurrentSegmentIndex(nextIndex);
// // // //         if (!isPaused) playCurrentSegment();
// // // //       } else {
// // // //         console.log("Reached the end of the current audio queue.");
// // // //         // Only mark playback as finished if all chunks are processed:
// // // //         if (allChunksProcessed) {
// // // //           setPlaybackFinished(true);
// // // //         } else {
// // // //           setIsAwaitingNewChunk(true);
// // // //         }
// // // //       }
// // // //     };

// // // //     audio.onloadedmetadata = () => {
// // // //       setIsChunkLoading(false);
// // // //       let duration = audio.duration;
// // // //       if (isNaN(duration) || duration === Infinity || duration === 0) {
// // // //         setTimeout(() => {
// // // //           if (audioRef.current && audioRef.current.duration > 0) {
// // // //             startTextAnimation(audioRef.current.duration, currentSeg.text);
// // // //           } else {
// // // //             console.warn("Falling back to default duration for animation.");
// // // //             startTextAnimation(5, currentSeg.text);
// // // //           }
// // // //         }, 200);
// // // //       } else {
// // // //         startTextAnimation(duration, currentSeg.text);
// // // //       }
// // // //     };

// // // //     audio.play().catch((err) => {
// // // //       console.error("Error playing audio:", err);
// // // //     });
// // // //   }
// // // //   return () => {
// // // //     if (animationIntervalRef.current) {
// // // //       clearInterval(animationIntervalRef.current);
// // // //     }
// // // //   };
// // // // }, [isPlaying, currentSegmentIndex, audioQueue, segments, isPaused, isLoading, isChunkLoading, allChunksProcessed]);

// // // // // Auto-resume effect, which now also checks playbackFinished:
// // // // useEffect(() => {
// // // //   if (isAwaitingNewChunk && !playbackFinished && audioQueue.length > currentSegmentIndex + 1) {
// // // //     console.log("New audio chunk detected. Resuming playback...");
// // // //     setIsAwaitingNewChunk(false);
// // // //     playCurrentSegment();
// // // //   }
// // // // }, [audioQueue, isAwaitingNewChunk, currentSegmentIndex, playbackFinished]);


// // // //   // return (
// // // //   //   <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
// // // //   //     <div
// // // //   //       className={`
// // // //   //         relative bg-white text-gray-900 rounded-lg shadow-lg transition-all duration-300 overflow-hidden 
// // // //   //         ${!isPlaying
// // // //   //           ? "w-[300px] h-[400px] sm:w-[650px] sm:max-h-[85%] sm:p-6"
// // // //   //           : "w-full h-full sm:max-w-[800px] sm:h-[85%]"}
// // // //   //       `}
// // // //   //     >
// // // //   //       {/* Always-visible Close Icon */}
// // // //   //       <button
// // // //   //         className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 z-50 focus:outline-none"
// // // //   //         onMouseDown={() => {
// // // //   //           if (typeof window !== "undefined" && window.speechSynthesis) {
// // // //   //             window.speechSynthesis.cancel();
// // // //   //           }
// // // //   //         }}
// // // //   //         onClick={() => {
// // // //   //           cleanupPlayback();
// // // //   //           onClose();
// // // //   //         }}
// // // //   //         aria-label="Close"
// // // //   //       >
// // // //   //         <X size={20} />
// // // //   //       </button>

// // // //   //       {playbackFinished && (
// // // //   //         <div className="flex items-center justify-center p-4 bg-yellow-100 text-yellow-800">
// // // //   //           Playback finished. Click "Stop" or "Close" to exit.
// // // //   //         </div>
// // // //   //       )}

// // // //   //       {ttsError ? (
// // // //   //           <div className="flex flex-col items-center justify-center h-full">
// // // //   //           <p className="mt-4 text-base sm:text-lg font-medium text-red-600">
// // // //   //             TTS failed multiple times. Please try again in 5 minutes.
// // // //   //           </p>
// // // //   //         </div>
// // // //   //       ) : isLoading ? (
// // // //   //         <div className="flex flex-col items-center justify-center h-full">
// // // //   //           <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-gray-700"></div>
// // // //   //           <p className="mt-4 text-base sm:text-lg font-medium">
// // // //   //             Your audio will start in approximately {estimatedTime} seconds...
// // // //   //           </p>
// // // //   //         </div>
// // // //   //       ) : !isPlaying ? (
// // // //   //         <div className="flex flex-col items-center justify-center gap-4 relative h-full">
// // // //   //           <Button
// // // //   //             onClick={handlePlay}
// // // //   //             className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // //   //           >
// // // //   //             Start Audiobook
// // // //   //           </Button>
// // // //   //         </div>
// // // //   //       ) : (
// // // //   //         <div
// // // //   //           className="relative w-full h-full bg-[url('/images/olderpaper.jpg')] bg-cover bg-center p-4 sm:p-8 overflow-y-auto"
// // // //   //           ref={textContainerRef}
// // // //   //         >
// // // //   //           {currentTTSResult?.failed && (
// // // //   //             <div className="mb-2 text-sm text-red-600">
// // // //   //               Audio unavailable – please read the text below.
// // // //   //             </div>
// // // //   //           )}
// // // //   //           <p className="text-base sm:text-2xl leading-relaxed font-serif">
// // // //   //             {textToDisplay}
// // // //   //           </p>
// // // //   //         </div>
// // // //   //       )}

// // // //   //       {isPlaying && !ttsError && (
// // // //   //         <div className="absolute bottom-4 left-4 flex flex-wrap gap-4">
// // // //   //           <Button
// // // //   //             onClick={handleBackward}
// // // //   //             className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // //   //           >
// // // //   //             Back
// // // //   //           </Button>
// // // //   //           {isPaused ? (
// // // //   //             <Button
// // // //   //               onClick={handlePlay}
// // // //   //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // //   //             >
// // // //   //               <Play size={16} /> Resume
// // // //   //             </Button>
// // // //   //           ) : (
// // // //   //             <Button
// // // //   //               onClick={handlePause}
// // // //   //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // //   //             >
// // // //   //               <Pause size={16} /> Pause
// // // //   //             </Button>
// // // //   //           )}
// // // //   //           <Button
// // // //   //             onClick={handleForward}
// // // //   //             className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // //   //           >
// // // //   //             Forward
// // // //   //           </Button>
// // // //   //           <Button
// // // //   //             onClick={handleStop}
// // // //   //             className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // //   //           >
// // // //   //             <X size={16} /> Stop
// // // //   //           </Button>
// // // //   //         </div>
// // // //   //       )}
// // // //   //     </div>
// // // //   //   </div>
// // // //   // );


// // // //   return (
// // // //     <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
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
// // // //           onMouseDown={() => {
// // // //             if (typeof window !== "undefined" && window.speechSynthesis) {
// // // //               window.speechSynthesis.cancel();
// // // //             }
// // // //           }}
// // // //           onClick={() => {
// // // //             cleanupPlayback();
// // // //             onClose();
// // // //           }}
// // // //           aria-label="Close"
// // // //         >
// // // //           <X size={20} />
// // // //         </button>
  
// // // //         {/* Show playback finished message only if the entire chapter is done */}
// // // //         {playbackFinished && (
// // // //           <div className="flex items-center justify-center p-4 bg-yellow-100 text-yellow-800">
// // // //             Playback finished. Click "Stop" or "Close" to exit.
// // // //           </div>
// // // //         )}
  
// // // //         {ttsError ? (
// // // //           <div className="flex flex-col items-center justify-center h-full">
// // // //             <p className="mt-4 text-base sm:text-lg font-medium text-red-600">
// // // //               TTS failed multiple times. Please try again in 5 minutes.
// // // //             </p>
// // // //           </div>
// // // //         ) : isLoading ? (
// // // //           <div className="flex flex-col items-center justify-center h-full">
// // // //             <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-gray-700"></div>
// // // //             <p className="mt-4 text-base sm:text-lg font-medium">
// // // //               Your audio will start in approximately {estimatedTime} seconds...
// // // //             </p>
// // // //           </div>
// // // //         ) : !isPlaying ? (
// // // //           <div className="flex flex-col items-center justify-center gap-4 relative h-full">
// // // //             <Button
// // // //               onClick={handlePlay}
// // // //               className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // //             >
// // // //               Start Audiobook
// // // //             </Button>
// // // //           </div>
// // // //         ) : (
// // // //           // Playback UI: Render only the currently playing text.
// // // //           <div
// // // //             className="relative w-full h-full bg-[url('/images/olderpaper.jpg')] bg-cover bg-center p-4 sm:p-8 overflow-y-auto"
// // // //             ref={textContainerRef}
// // // //           >
// // // //             {currentTTSResult?.failed && (
// // // //               <div className="mb-2 text-sm text-red-600">
// // // //                 Audio unavailable – please read the text below.
// // // //               </div>
// // // //             )}
// // // //             <p className="text-base sm:text-2xl leading-relaxed font-serif">
// // // //               {textToDisplay}
// // // //             </p>
// // // //           </div>
// // // //         )}
  
// // // //         {isPlaying && !ttsError && (
// // // //           <div className="absolute bottom-4 left-4 flex flex-wrap gap-4">
// // // //             <Button
// // // //               onClick={handleBackward}
// // // //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // //             >
// // // //               Back
// // // //             </Button>
// // // //             {isPaused ? (
// // // //               <Button
// // // //                 onClick={handlePlay}
// // // //                 className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // //               >
// // // //                 <Play size={16} /> Resume
// // // //               </Button>
// // // //             ) : (
// // // //               <Button
// // // //                 onClick={handlePause}
// // // //                 className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // //               >
// // // //                 <Pause size={16} /> Pause
// // // //               </Button>
// // // //             )}
// // // //             <Button
// // // //               onClick={handleForward}
// // // //               // Disable forward if we've reached the end and not all chunks are processed
// // // //               disabled={!allChunksProcessed && currentSegmentIndex >= segments.length}
// // // //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // // //             >
// // // //               Forward
// // // //             </Button>
// // // //             <Button
// // // //               onClick={handleStop}
// // // //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // // //             >
// // // //               <X size={16} /> Stop
// // // //             </Button>
// // // //           </div>
// // // //         )}
// // // //       </div>
// // // //     </div>
// // // //   );  
// // // // };

// // // // export default PlayMode;





// // // import React, { useState, useEffect, useRef, useCallback } from "react";
// // // import { Button } from "@/components/ui/button";
// // // import { X, Play, Pause } from "lucide-react";
// // // import axios from "axios";
// // // import { getVoiceForSpeaker, VoiceAssignment } from "@/pages/api/getVoices";
// // // import { loadVoiceAssignments, saveVoiceAssignments } from "@/lib/voiceStorage";
// // // import { saveAudio, loadAudio } from "@/lib/mediaStorage";

// // // // Client-side interfaces
// // // export interface Segment {
// // //   speaker: string;
// // //   text: string;
// // //   voice?: string; // Assigned voice string.
// // //   gender: "MALE" | "FEMALE";
// // // }

// // // export interface VoiceMapping {
// // //   voice: string;
// // //   source: "predefined" | "generated";
// // // }

// // // export interface VoiceMappings {
// // //   [key: string]: VoiceMapping;
// // // }

// // // interface TTSResult {
// // //   audioUrl: string;
// // //   failed: boolean;
// // // }

// // // interface PlayModeProps {
// // //   currentPageContent: string;
// // //   onClose: () => void;
// // //   extractText: () => void;
// // // }

// // // const PlayMode: React.FC<PlayModeProps> = ({ currentPageContent, onClose, extractText }) => {
// // //   // Playback and TTS states
// // //   const [isPlaying, setIsPlaying] = useState(false);
// // //   const [isPaused, setIsPaused] = useState(false);
// // //   const [isLoading, setIsLoading] = useState(false);
// // //   const [segments, setSegments] = useState<Segment[]>([]);
// // //   const [voiceMappings, setVoiceMappings] = useState<VoiceMappings>(() => loadVoiceAssignments());
// // //   const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
// // //   const [displayedText, setDisplayedText] = useState("");
// // //   const [audioQueue, setAudioQueue] = useState<string[]>([]);
// // //   const [ttsResults, setTTSResults] = useState<TTSResult[]>([]);
// // //   const [estimatedTime, setEstimatedTime] = useState<number>(0);
// // //   const [ttsError, setTtsError] = useState(false);
// // //   const [retryAvailableAt, setRetryAvailableAt] = useState<Date | null>(null);
// // //   const [isChunkLoading, setIsChunkLoading] = useState(false);
// // //   const [playbackFinished, setPlaybackFinished] = useState(false);
// // //   const [isAwaitingNewChunk, setIsAwaitingNewChunk] = useState<boolean>(false);
// // //   const [allChunksProcessed, setAllChunksProcessed] = useState(false);
// // //   const [location, setLocation] = useState<string | null>(null); // Chapter location

// // //   // Refs for audio, container, animation, and in-memory TTS cache.
// // //   const audioRef = useRef<HTMLAudioElement | null>(null);
// // //   const textContainerRef = useRef<HTMLDivElement | null>(null);
// // //   const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
// // //   const ttsCache = useRef<{ [key: string]: string }>({});
// // //   const isAnimationFinishedRef = useRef<boolean>(false);

// // //   // Derived values.
// // //   const currentTTSResult = ttsResults[currentSegmentIndex];
// // //   const currentSegment = segments[currentSegmentIndex];
// // //   const textToDisplay = currentTTSResult?.failed ? currentSegment?.text || "" : displayedText;

// // //   // ----------------------------------------------------
// // //   // Helper: Generate a stable key based on chapter location and absolute segment index.
// // //   const generateChapterKey = (chapterLocation: string, segmentIndex: number): string => {
// // //     return `tts_${chapterLocation}_${segmentIndex}`;
// // //   };

// // //   // ----------------------------------------------------
// // //   // Updated locationChanged function to clear previous state on chapter change.
// // //   const locationChanged = (epubcifi: any) => {
// // //     let newLocation: string | null = null;
// // //     if (typeof epubcifi === "string") {
// // //       newLocation = epubcifi;
// // //     } else if (epubcifi && epubcifi.href) {
// // //       newLocation = epubcifi.href;
// // //     } else {
// // //       console.warn("Unexpected location format:", epubcifi);
// // //     }
// // //     if (newLocation) {
// // //       // If the chapter has changed, clear previous state so old audio isn't reused.
// // //       if (newLocation !== (location as string)) {
// // //         setLocation(newLocation);
// // //         setSegments([]);
// // //         setTTSResults([]);
// // //         setAudioQueue([]);
// // //         ttsCache.current = {};  // Clear in-memory cache
// // //       }
// // //       extractText();
// // //       localStorage.setItem("currentEpubLocation", newLocation);
// // //     }
// // //   };

// // //   // ----------------------------------------------------
// // //   // Helper Functions
// // //   const updateVoiceMapping = (speakerKey: string, assignment: VoiceAssignment) => {
// // //     const newMappings = { ...voiceMappings, [speakerKey]: assignment };
// // //     setVoiceMappings(newMappings);
// // //     saveVoiceAssignments(newMappings);
// // //   };

// // //   const buildContextSummary = (segments: Segment[]): string => {
// // //     const nonNarrator = segments.filter(
// // //       (seg) => seg.speaker.trim().toLowerCase() !== "narrator"
// // //     );
// // //     const speakerMap: { [key: string]: { speaker: string; gender: string; voice: string } } = {};
// // //     nonNarrator.forEach((seg) => {
// // //       const key = seg.speaker.trim().toLowerCase();
// // //       const gender = (seg.gender === "MALE" || seg.gender === "FEMALE") ? seg.gender : "MALE";
// // //       if (!speakerMap[key]) {
// // //         speakerMap[key] = { speaker: seg.speaker, gender, voice: seg.voice || "" };
// // //       }
// // //     });
// // //     const lastSegment = segments[segments.length - 1] || null;
// // //     return JSON.stringify({ speakers: Object.values(speakerMap), lastSegment }, null, 2);
// // //   };

// // //   const cleanupPlayback = () => {
// // //     if (audioRef.current) {
// // //       audioRef.current.pause();
// // //       audioRef.current.currentTime = 0;
// // //       audioRef.current = null;
// // //     }
// // //     if (animationIntervalRef.current) {
// // //       clearInterval(animationIntervalRef.current);
// // //       animationIntervalRef.current = null;
// // //     }
// // //     setAudioQueue([]);
// // //     setIsPlaying(false);
// // //     setIsChunkLoading(false);
// // //     setCurrentSegmentIndex(0);
// // //     setDisplayedText("");
// // //   };

// // //   // ----------------------------------------------------
// // //   // TTS Fetch Function (with Persistent Audio using Chapter Key)
// // //   // Accept an offset parameter (absolute index of first segment in the batch).
// // //   const fetchTTS = async (batch: Segment[], offset: number = 0): Promise<TTSResult[]> => {
// // //     const results: TTSResult[] = [];
// // //     for (let i = 0; i < batch.length; i++) {
// // //       const segment = batch[i];
// // //       const chapterLoc: string = location ? location.toString() : "default";
// // //       const cacheKey = generateChapterKey(chapterLoc, offset + i);

// // //       console.log(`Checking persistent storage for key: ${cacheKey}`);
// // //       const storedAudioBlob = await loadAudio(cacheKey);
// // //       if (storedAudioBlob) {
// // //         const storedAudioUrl = URL.createObjectURL(storedAudioBlob);
// // //         console.log(`Loaded audio from persistent storage for key: ${cacheKey}`);
// // //         ttsCache.current[cacheKey] = storedAudioUrl;
// // //         results.push({ audioUrl: storedAudioUrl, failed: false });
// // //         continue;
// // //       } else {
// // //         console.log(`No stored audio found for key: ${cacheKey}. Fetching from API...`);
// // //       }

// // //       if (!segment.voice) {
// // //         console.error(`No voice assigned for speaker: ${segment.speaker}`);
// // //         results.push({ audioUrl: createSilentAudio(), failed: true });
// // //         continue;
// // //       }

// // //       let attempt = 0;
// // //       let success = false;
// // //       let audioUrl = "";
// // //       let failed = false;
// // //       console.log(`Segment index: ${offset + i} | Text: "${segment.text}" | Generated Key: ${cacheKey}`);
// // //       while (attempt < 3 && !success) {
// // //         attempt++;
// // //         if (attempt === 1) {
// // //           await new Promise((resolve) => setTimeout(resolve, 50));
// // //         } else {
// // //           console.log(`Waiting 1 minute before next attempt for ${segment.speaker}...`);
// // //           await new Promise((resolve) => setTimeout(resolve, 30000));
// // //         }
// // //         try {
// // //           const response = await axios.post(
// // //             "/api/tts",
// // //             {
// // //               text: segment.text,
// // //               speaker: segment.speaker,
// // //               voice: segment.voice,
// // //               gender: segment.gender,
// // //               voiceMapping: voiceMappings,
// // //             },
// // //             { responseType: "blob" }
// // //           );
// // //           const contentType = response.headers["content-type"];
// // //           if (!contentType || !contentType.startsWith("audio/")) {
// // //             throw new Error(`Unexpected content-type: ${contentType}`);
// // //           }
// // //           const audioBlob = response.data;
// // //           await saveAudio(cacheKey, audioBlob);
// // //           console.log(`Saved audio to storage with key: ${cacheKey}`);
// // //           audioUrl = URL.createObjectURL(audioBlob);
// // //           ttsCache.current[cacheKey] = audioUrl;
// // //           console.log(`TTS success for ${segment.speaker} on attempt ${attempt}`);
// // //           success = true;
// // //         } catch (error: any) {
// // //           console.error(`TTS attempt ${attempt} failed for ${segment.speaker}:`, error.message);
// // //           if (attempt >= 3) {
// // //             audioUrl = createSilentAudio();
// // //             failed = true;
// // //             console.warn(`Using silent audio fallback for ${segment.speaker} after ${attempt} attempts.`);
// // //           }
// // //         }
// // //       }
// // //       results.push({ audioUrl, failed });
// // //     }
// // //     return results;
// // //   };

// // //   const createSilentAudio = (): string => {
// // //     const silence = new Uint8Array(1000);
// // //     const blob = new Blob([silence], { type: "audio/mp3" });
// // //     const url = URL.createObjectURL(blob);
// // //     console.log("Created silent audio blob URL:", url);
// // //     return url;
// // //   };

// // //   // ----------------------------------------------------
// // //   // Effects
// // //   // ----------------------------------------------------
// // //   // Countdown timer for estimated audio wait time.
// // //   useEffect(() => {
// // //     if (estimatedTime > 0) {
// // //       const interval = setInterval(() => {
// // //         setEstimatedTime((prev) => {
// // //           if (prev <= 1) {
// // //             clearInterval(interval);
// // //             return 0;
// // //           }
// // //           return prev - 1;
// // //         });
// // //       }, 1000);
// // //       return () => clearInterval(interval);
// // //     }
// // //   }, [estimatedTime]);

// // //   // Auto-resume playback effect (only if not finished).
// // //   useEffect(() => {
// // //     if (!isPlaying && audioQueue.length > 0 && !isChunkLoading && !playbackFinished) {
// // //       handlePlay();
// // //     }
// // //   }, [audioQueue, isPlaying, isChunkLoading, playbackFinished]);

// // //   // Auto-scroll container when text updates.
// // //   useEffect(() => {
// // //     if (textContainerRef.current) {
// // //       textContainerRef.current.scrollTo({
// // //         top: textContainerRef.current.scrollHeight,
// // //         behavior: "smooth",
// // //       });
// // //     }
// // //   }, [textToDisplay]);

// // //   // Preload background image.
// // //   useEffect(() => {
// // //     const preloadImage = new Image();
// // //     preloadImage.src = "/images/olderpaper.jpg";
// // //   }, []);

// // //   // Fetch text automatically when PlayMode opens.
// // //   useEffect(() => {
// // //     extractText();
// // //   }, [extractText]);

// // //   // Cleanup playback on unmount.
// // //   useEffect(() => {
// // //     return () => {
// // //       cleanupPlayback();
// // //     };
// // //   }, []);

// // //   // ----------------------------------------------------
// // //   // Process Chunks Sequentially
// // //   // ----------------------------------------------------
// // //   const processChunksSequentially = async (chunks: string[]): Promise<void> => {
// // //     let combinedSegments: Segment[] = [];
// // //     let contextSummary = "";
// // //     let failCount = 0;
// // //     let offset = 0; // start offset at 0 for the chapter

// // //     for (let i = 0; i < chunks.length; i++) {
// // //       setIsChunkLoading(true);
// // //       try {
// // //         console.log(`Processing chunk ${i + 1} of ${chunks.length}`);
// // //         const payload: any = { text: chunks[i] };
// // //         if (i > 0 && contextSummary) {
// // //           payload.context = `Context Summary:\n${contextSummary}`;
// // //         }
// // //         const parseResponse = await axios.post("/api/parse_text", payload);
// // //         const { segments: chunkSegments } = parseResponse.data;
// // //         console.log(`Parsed segments for chunk ${i + 1}:`, chunkSegments);

// // //         const processedSegments: Segment[] = chunkSegments.map((seg: Segment) => {
// // //           const normalizedSpeaker = seg.speaker.trim().toLowerCase();
// // //           let assignment = voiceMappings[normalizedSpeaker];
// // //           if (!assignment) {
// // //             const gender = (seg.gender === "MALE" || seg.gender === "FEMALE") ? seg.gender : "MALE";
// // //             assignment = getVoiceForSpeaker(seg.speaker, gender);
// // //             updateVoiceMapping(normalizedSpeaker, assignment);
// // //           }
// // //           return { ...seg, voice: assignment.voice, gender: seg.gender };
// // //         });

// // //         combinedSegments = [...combinedSegments, ...processedSegments];
// // //         setSegments(combinedSegments);
// // //         contextSummary = buildContextSummary(combinedSegments);
// // //         console.log("Updated Context Summary:", contextSummary);

// // //         const estimatedTimeForChunk = processedSegments.length * 10;
// // //         setEstimatedTime((prev) => prev + estimatedTimeForChunk);

// // //         const ttsResultsForChunk = await fetchTTS(processedSegments, offset);
// // //         const failedCountForChunk = ttsResultsForChunk.filter(r => r.failed).length;
// // //         failCount += failedCountForChunk;
// // //         if (failCount > 3) {
// // //           setTtsError(true);
// // //           setIsLoading(false);
// // //           setRetryAvailableAt(new Date(Date.now() + 2 * 60 * 1000));
// // //           return;
// // //         }

// // //         setTTSResults((prev) => [...prev, ...ttsResultsForChunk]);
// // //         setAudioQueue((prev) => [
// // //           ...prev,
// // //           ...ttsResultsForChunk.map((result) => result.audioUrl),
// // //         ]);
// // //         offset += processedSegments.length;

// // //         if (i === 0) {
// // //           setIsPlaying(true);
// // //           setIsPaused(false);
// // //           setCurrentSegmentIndex(0);
// // //           setDisplayedText("");
// // //           setIsLoading(false);
// // //         }
// // //       } catch (error: any) {
// // //         console.error(
// // //           `Error processing chunk ${i + 1}:`,
// // //           error.response?.data?.error || error.message || error
// // //         );
// // //         setIsLoading(false);
// // //       } finally {
// // //         setIsChunkLoading(false);
// // //       }
// // //     }
// // //     console.log("All chunks processed.");
// // //     setAllChunksProcessed(true);
// // //   };

// // //   const splitTextIntoChunks = (text: string, maxChunkLength: number = 3000): string[] => {
// // //     const paragraphs = text.split(/\n+/).filter((p) => p.trim() !== "");
// // //     const chunks: string[] = [];
// // //     let currentChunk = "";
// // //     for (const para of paragraphs) {
// // //       if ((currentChunk + "\n" + para).length > maxChunkLength) {
// // //         if (currentChunk) {
// // //           chunks.push(currentChunk);
// // //           currentChunk = "";
// // //         }
// // //         if (para.length > maxChunkLength) {
// // //           for (let i = 0; i < para.length; i += maxChunkLength) {
// // //             chunks.push(para.slice(i, i + maxChunkLength));
// // //           }
// // //         } else {
// // //           currentChunk = para;
// // //         }
// // //       } else {
// // //         currentChunk += (currentChunk ? "\n" : "") + para;
// // //       }
// // //     }
// // //     if (currentChunk) {
// // //       chunks.push(currentChunk);
// // //     }
// // //     return chunks;
// // //   };

// // //   const playCurrentSegment = () => {
// // //     if (audioRef.current && isPaused) {
// // //       audioRef.current.play().catch((err) => console.error("Error resuming audio:", err));
// // //       setIsPaused(false);
// // //     }
// // //   };

// // //   const startTextAnimation = (duration: number, text: string) => {
// // //     if (!text) return;
// // //     isAnimationFinishedRef.current = false; // Reset flag at start
// // //     const animationDuration = duration * 100; // Use the proper multiplier.
// // //     const words = text.split(" ") || [];
// // //     const totalWords = words.length;
// // //     const wordInterval = animationDuration / totalWords;
// // //     let currentWordIndex = 0;
// // //     setDisplayedText("");
// // //     if (animationIntervalRef.current) {
// // //       clearInterval(animationIntervalRef.current);
// // //     }
// // //     animationIntervalRef.current = setInterval(() => {
// // //       if (isPaused) return;
// // //       if (currentWordIndex < totalWords) {
// // //         const word = words[currentWordIndex];
// // //         setDisplayedText((prev) => (prev ? `${prev} ${word}`.trim() : word));
// // //         currentWordIndex++;
// // //         if (currentWordIndex === totalWords) {
// // //           isAnimationFinishedRef.current = true;
// // //         }
// // //       } else {
// // //         clearInterval(animationIntervalRef.current!);
// // //       }
// // //     }, wordInterval);
// // //   };

// // //   const handleStart = async () => {
// // //     if (!currentPageContent.trim()) {
// // //       alert("No text found on this page. Try navigating to another page.");
// // //       return;
// // //     }
// // //     setIsLoading(true);
// // //     try {
// // //       const MAX_CHUNK_LENGTH = 1500;
// // //       const chunks = currentPageContent.length > MAX_CHUNK_LENGTH
// // //         ? splitTextIntoChunks(currentPageContent, MAX_CHUNK_LENGTH)
// // //         : [currentPageContent];
// // //       console.log(`Splitting text into ${chunks.length} chunk(s)`);
// // //       await processChunksSequentially(chunks);
// // //     } catch (error: any) {
// // //       console.error("Error processing text:", error.response?.data?.error || error.message || error);
// // //       alert("Failed to process the text. Please try again.");
// // //     } finally {
// // //       setIsLoading(false);
// // //     }
// // //   };

// // //   const handlePlay = () => {
// // //     if (retryAvailableAt && new Date() < retryAvailableAt) {
// // //       alert("Please wait 5 minutes before trying again.");
// // //       return;
// // //     }
// // //     setTtsError(false);
// // //     setRetryAvailableAt(null);
// // //     if (isPlaying && isPaused && audioRef.current) {
// // //       audioRef.current.play().catch((err) => console.error("Error resuming audio:", err));
// // //       setIsPaused(false);
// // //       return;
// // //     }
// // //     handleStart();
// // //   };

// // //   const handlePause = () => {
// // //     if (audioRef.current) {
// // //       audioRef.current.pause();
// // //     }
// // //     setIsPaused(true);
// // //   };

// // //   const handleStop = () => {
// // //     if (audioRef.current) {
// // //       audioRef.current.pause();
// // //       audioRef.current.currentTime = 0;
// // //       audioRef.current = null;
// // //     }
// // //     if (animationIntervalRef.current) {
// // //       clearInterval(animationIntervalRef.current);
// // //       animationIntervalRef.current = null;
// // //     }
// // //     setIsPlaying(false);
// // //     setIsPaused(false);
// // //     setCurrentSegmentIndex(0);
// // //     setDisplayedText("");
// // //     setAudioQueue([]);
// // //     setIsChunkLoading(false);
// // //   };

// // //   const handleBackward = () => {
// // //     if (currentSegmentIndex > 0) {
// // //       if (audioRef.current) {
// // //         audioRef.current.pause();
// // //         audioRef.current = null;
// // //       }
// // //       if (animationIntervalRef.current) {
// // //         clearInterval(animationIntervalRef.current);
// // //       }
// // //       setCurrentSegmentIndex((prev) => prev - 1);
// // //       setDisplayedText("");
// // //       playCurrentSegment();
// // //     }
// // //   };

// // //   const handleForward = () => {
// // //     if (currentSegmentIndex < segments.length - 1) {
// // //       if (audioRef.current) {
// // //         audioRef.current.pause();
// // //         audioRef.current = null;
// // //       }
// // //       if (animationIntervalRef.current) {
// // //         clearInterval(animationIntervalRef.current);
// // //       }
// // //       setCurrentSegmentIndex((prev) => prev + 1);
// // //       setDisplayedText("");
// // //       playCurrentSegment();
// // //     }
// // //   };

// // //   // ----------------------------------------------------
// // //   // Playback Effects
// // //   // ----------------------------------------------------
// // //   useEffect(() => {
// // //     if (isPlaying && currentSegmentIndex < segments.length && audioQueue.length > 0) {
// // //       if (audioRef.current) return;

// // //       const audioUrl = audioQueue[currentSegmentIndex];
// // //       const currentSeg = segments[currentSegmentIndex];
// // //       const audio = new Audio(audioUrl);
// // //       audio.preload = "auto";
// // //       audio.load();
// // //       audioRef.current = audio;

// // //       audio.onended = () => {
// // //         const nextIndex = currentSegmentIndex + 1;
// // //         setDisplayedText("");
// // //         audioRef.current = null;

// // //         if (nextIndex < audioQueue.length) {
// // //           setCurrentSegmentIndex(nextIndex);
// // //           if (!isPaused) playCurrentSegment();
// // //         } else {
// // //           console.log("Reached the end of the current audio queue.");
// // //           if (allChunksProcessed) {
// // //             setPlaybackFinished(true);
// // //           } else {
// // //             setIsAwaitingNewChunk(true);
// // //           }
// // //         }
// // //       };

// // //       audio.onloadedmetadata = () => {
// // //         setIsChunkLoading(false);
// // //         let duration = audio.duration;
// // //         if (isNaN(duration) || duration === Infinity || duration === 0) {
// // //           setTimeout(() => {
// // //             if (audioRef.current && audioRef.current.duration > 0) {
// // //               startTextAnimation(audioRef.current.duration, currentSeg.text);
// // //             } else {
// // //               console.warn("Falling back to default duration for animation.");
// // //               startTextAnimation(5, currentSeg.text);
// // //             }
// // //           }, 200);
// // //         } else {
// // //           startTextAnimation(duration, currentSeg.text);
// // //         }
// // //       };

// // //       audio.play().catch((err) => {
// // //         console.error("Error playing audio:", err);
// // //       });
// // //     }
// // //     return () => {
// // //       if (animationIntervalRef.current) {
// // //         clearInterval(animationIntervalRef.current);
// // //       }
// // //     };
// // //   }, [isPlaying, currentSegmentIndex, audioQueue, segments, isPaused, isLoading, isChunkLoading, allChunksProcessed]);

// // //   useEffect(() => {
// // //     if (isAwaitingNewChunk && !playbackFinished && audioQueue.length > currentSegmentIndex + 1) {
// // //       console.log("New audio chunk detected. Resuming playback...");
// // //       setIsAwaitingNewChunk(false);
// // //       playCurrentSegment();
// // //     }
// // //   }, [audioQueue, isAwaitingNewChunk, currentSegmentIndex, playbackFinished]);

// // //   useEffect(() => {
// // //     if (isPlaying && allChunksProcessed && currentSegmentIndex >= segments.length) {
// // //       setPlaybackFinished(true);
// // //     }
// // //   }, [isPlaying, currentSegmentIndex, segments, allChunksProcessed]);

// // //   useEffect(() => {
// // //     return () => {
// // //       cleanupPlayback();
// // //     };
// // //   }, []);

// // //   return (
// // //     <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
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
// // //           onMouseDown={() => {
// // //             if (typeof window !== "undefined" && window.speechSynthesis) {
// // //               window.speechSynthesis.cancel();
// // //             }
// // //           }}
// // //           onClick={() => {
// // //             cleanupPlayback();
// // //             onClose();
// // //           }}
// // //           aria-label="Close"
// // //         >
// // //           <X size={20} />
// // //         </button>

// // //         {playbackFinished && (
// // //           <div className="flex items-center justify-center p-4 bg-yellow-100 text-yellow-800">
// // //             Playback finished. Click "Stop" or "Close" to exit.
// // //           </div>
// // //         )}

// // //         {ttsError ? (
// // //           <div className="flex flex-col items-center justify-center h-full">
// // //             <p className="mt-4 text-base sm:text-lg font-medium text-red-600">
// // //               TTS failed multiple times. Please try again in 5 minutes.
// // //             </p>
// // //           </div>
// // //         ) : isLoading ? (
// // //           <div className="flex flex-col items-center justify-center h-full">
// // //             <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-gray-700"></div>
// // //             <p className="mt-4 text-base sm:text-lg font-medium">
// // //               Your audio will start in approximately {estimatedTime} seconds...
// // //             </p>
// // //           </div>
// // //         ) : !isPlaying ? (
// // //           <div className="flex flex-col items-center justify-center gap-4 relative h-full">
// // //             <Button
// // //               onClick={handlePlay}
// // //               className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // //             >
// // //               Start Audiobook
// // //             </Button>
// // //           </div>
// // //         ) : (
// // //           <div
// // //             className="relative w-full h-full bg-[url('/images/olderpaper.jpg')] bg-cover bg-center p-4 sm:p-8 overflow-y-auto"
// // //             ref={textContainerRef}
// // //           >
// // //             {currentTTSResult?.failed && (
// // //               <div className="mb-2 text-sm text-red-600">
// // //                 Audio unavailable – please read the text below.
// // //               </div>
// // //             )}
// // //             <p className="text-base sm:text-2xl leading-relaxed font-serif">
// // //               {textToDisplay}
// // //             </p>
// // //           </div>
// // //         )}

// // //         {isPlaying && !ttsError && (
// // //           <div className="absolute bottom-4 left-4 flex flex-wrap gap-4">
// // //             <Button
// // //               onClick={handleBackward}
// // //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // //             >
// // //               Back
// // //             </Button>
// // //             {isPaused ? (
// // //               <Button
// // //                 onClick={handlePlay}
// // //                 className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // //               >
// // //                 <Play size={16} /> Resume
// // //               </Button>
// // //             ) : (
// // //               <Button
// // //                 onClick={handlePause}
// // //                 className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // //               >
// // //                 <Pause size={16} /> Pause
// // //               </Button>
// // //             )}
// // //             <Button
// // //               onClick={handleForward}
// // //               disabled={!allChunksProcessed && currentSegmentIndex >= segments.length}
// // //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// // //             >
// // //               Forward
// // //             </Button>
// // //             <Button
// // //               onClick={handleStop}
// // //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// // //             >
// // //               <X size={16} /> Stop
// // //             </Button>
// // //           </div>
// // //         )}
// // //       </div>
// // //     </div>
// // //   );
// // // };

// // // export default PlayMode;



// // import React, { useState, useEffect, useRef, useCallback } from "react";
// // import { Button } from "../components/ui/button";
// // import { X, Play, Pause } from "lucide-react";
// // import axios from "axios";
// // import { getVoiceForSpeaker, VoiceAssignment } from "../services/getVoices";
// // import { loadVoiceAssignments, saveVoiceAssignments } from "../lib/voiceStorage";
// // import { saveAudio, loadAudio } from "../lib/mediaStorage";
// // import { generateTTS } from '../services/tts';
// // import { textParsingService } from "../services/parse_text";

// // // Client-side interfaces
// // export interface Segment {
// //   speaker: string;
// //   text: string;
// //   voice?: string; // Assigned voice string.
// //   gender: "MALE" | "FEMALE";
// // }

// // export interface VoiceMapping {
// //   voice: string;
// //   source: "predefined" | "generated";
// // }

// // export interface VoiceMappings {
// //   [key: string]: VoiceMapping;
// // }

// // interface TTSResult {
// //   audioUrl: string;
// //   failed: boolean;
// // }

// // interface PlayModeProps {
// //   currentPageContent: string;
// //   onClose: () => void;
// //   extractText: () => void;
// //   // New prop: chapter location should be passed from the parent.
// //   location: string;
// //   bookName: string;
// // }

// // const PlayMode: React.FC<PlayModeProps> = ({
// //   currentPageContent,
// //   onClose,
// //   extractText,
// //   location, // use the location prop here
// //   bookName,
// // }) => {
// //   // Playback and TTS states
// //   const [isPlaying, setIsPlaying] = useState(false);
// //   const [isPaused, setIsPaused] = useState(false);
// //   const [isLoading, setIsLoading] = useState(false);
// //   const [segments, setSegments] = useState<Segment[]>([]);
// //   const [voiceMappings, setVoiceMappings] = useState<VoiceMappings>(() => loadVoiceAssignments());
// //   const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
// //   const [displayedText, setDisplayedText] = useState("");
// //   const [audioQueue, setAudioQueue] = useState<string[]>([]);
// //   const [ttsResults, setTTSResults] = useState<TTSResult[]>([]);
// //   const [estimatedTime, setEstimatedTime] = useState<number>(0);
// //   const [ttsError, setTtsError] = useState(false);
// //   const [retryAvailableAt, setRetryAvailableAt] = useState<Date | null>(null);
// //   const [isChunkLoading, setIsChunkLoading] = useState(false);
// //   const [playbackFinished, setPlaybackFinished] = useState(false);
// //   const [isAwaitingNewChunk, setIsAwaitingNewChunk] = useState<boolean>(false);
// //   const [allChunksProcessed, setAllChunksProcessed] = useState(false);
// //   // Remove local location state – we now rely on the prop 'location'

// //   // Refs for audio, container, animation, and in-memory TTS cache.
// //   const audioRef = useRef<HTMLAudioElement | null>(null);
// //   const textContainerRef = useRef<HTMLDivElement | null>(null);
// //   const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
// //   const ttsCache = useRef<{ [key: string]: string }>({});
// //   const isAnimationFinishedRef = useRef<boolean>(false);

// //   // Derived values.
// //   const currentTTSResult = ttsResults[currentSegmentIndex];
// //   const currentSegment = segments[currentSegmentIndex];
// //   const textToDisplay = currentTTSResult?.failed ? currentSegment?.text || "" : displayedText;

// //   // ----------------------------------------------------
// //   // Helper: Generate a stable key based on chapter location and absolute segment index.
// // // New key generator function:
// //   const generateChapterKey = (bookName: string, chapterLocation: string, segmentIndex: number): string => {
// //     return `tts_${bookName}_${chapterLocation}_${segmentIndex}`;
// //   };

// //   // // ----------------------------------------------------
// //   // // (Optional) If needed, you can keep a locationChanged function here.
// //   // // However, if the parent component already updates and passes a new 'location' prop,
// //   // // then you may not need to handle location changes here.
// //   // const locationChanged = (epubcifi: any) => {
// //   //   let newLocation: string | null = null;
// //   //   if (typeof epubcifi === "string") {
// //   //     newLocation = epubcifi;
// //   //   } else if (epubcifi && epubcifi.href) {
// //   //     newLocation = epubcifi.href;
// //   //   } else {
// //   //     console.warn("Unexpected location format:", epubcifi);
// //   //   }
// //   //   if (newLocation) {
// //   //     // Clear previous state if the chapter has changed.
// //   //     if (newLocation !== location) {
// //   //       setSegments([]);
// //   //       setTTSResults([]);
// //   //       setAudioQueue([]);
// //   //       ttsCache.current = {}; // Clear in-memory cache
// //   //     }
// //   //     extractText();
// //   //     localStorage.setItem("currentEpubLocation", newLocation);
// //   //   }
// //   // };

// //   // ----------------------------------------------------
// //   // Helper Functions
// //   const updateVoiceMapping = (speakerKey: string, assignment: VoiceAssignment) => {
// //     const newMappings = { ...voiceMappings, [speakerKey]: assignment };
// //     setVoiceMappings(newMappings);
// //     saveVoiceAssignments(newMappings);
// //   };

// //   const buildContextSummary = (segments: Segment[]): string => {
// //     const nonNarrator = segments.filter(
// //       (seg) => seg.speaker.trim().toLowerCase() !== "narrator"
// //     );
// //     const speakerMap: { [key: string]: { speaker: string; gender: string; voice: string } } = {};
// //     nonNarrator.forEach((seg) => {
// //       const key = seg.speaker.trim().toLowerCase();
// //       const gender = (seg.gender === "MALE" || seg.gender === "FEMALE") ? seg.gender : "MALE";
// //       if (!speakerMap[key]) {
// //         speakerMap[key] = { speaker: seg.speaker, gender, voice: seg.voice || "" };
// //       }
// //     });
// //     const lastSegment = segments[segments.length - 1] || null;
// //     return JSON.stringify({ speakers: Object.values(speakerMap), lastSegment }, null, 2);
// //   };

// //   const cleanupPlayback = () => {
// //     if (audioRef.current) {
// //       audioRef.current.pause();
// //       audioRef.current.currentTime = 0;
// //       audioRef.current = null;
// //     }
// //     if (animationIntervalRef.current) {
// //       clearInterval(animationIntervalRef.current);
// //       animationIntervalRef.current = null;
// //     }
// //     setAudioQueue([]);
// //     setIsPlaying(false);
// //     setIsChunkLoading(false);
// //     setCurrentSegmentIndex(0);
// //     setDisplayedText("");
// //   };

// //   // // ----------------------------------------------------
// //   // // TTS Fetch Function (with Persistent Audio using Chapter Key)
// //   // // Accept an offset parameter (absolute index of first segment in the batch).
// //   // const fetchTTS = async (batch: Segment[], offset: number = 0): Promise<TTSResult[]> => {
// //   //   const results: TTSResult[] = [];
// //   //   for (let i = 0; i < batch.length; i++) {
// //   //     const segment = batch[i];
// //   //     // Use the location prop here. It should be updated by the parent.
// //   //     const chapterLoc: string = location ? location.toString() : "default";
// //   //     const cacheKey = generateChapterKey( bookName, chapterLoc, offset + i);

// //   //     console.log(`Checking persistent storage for key: ${cacheKey}`);
// //   //     const storedAudioBlob = await loadAudio(cacheKey);
// //   //     if (storedAudioBlob) {
// //   //       const storedAudioUrl = URL.createObjectURL(storedAudioBlob);
// //   //       console.log(`Loaded audio from persistent storage for key: ${cacheKey}`);
// //   //       ttsCache.current[cacheKey] = storedAudioUrl;
// //   //       results.push({ audioUrl: storedAudioUrl, failed: false });
// //   //       continue;
// //   //     } else {
// //   //       console.log(`No stored audio found for key: ${cacheKey}. Fetching from API...`);
// //   //     }

// //   //     if (!segment.voice) {
// //   //       console.error(`No voice assigned for speaker: ${segment.speaker}`);
// //   //       results.push({ audioUrl: createSilentAudio(), failed: true });
// //   //       continue;
// //   //     }

// //   //     let attempt = 0;
// //   //     let success = false;
// //   //     let audioUrl = "";
// //   //     let failed = false;
// //   //     console.log(`Segment index: ${offset + i} | Text: "${segment.text}" | Generated Key: ${cacheKey}`);
// //   //     while (attempt < 3 && !success) {
// //   //       attempt++;
// //   //       if (attempt === 1) {
// //   //         await new Promise((resolve) => setTimeout(resolve, 50));
// //   //       } else {
// //   //         console.log(`Waiting 1 minute before next attempt for ${segment.speaker}...`);
// //   //         await new Promise((resolve) => setTimeout(resolve, 30000));
// //   //       }
// //   //       try {
// //   //         const response = await axios.post(
// //   //           "/api/tts",
// //   //           {
// //   //             text: segment.text,
// //   //             speaker: segment.speaker,
// //   //             voice: segment.voice,
// //   //             gender: segment.gender,
// //   //             voiceMapping: voiceMappings,
// //   //           },
// //   //           { responseType: "blob" }
// //   //         );
// //   //         const contentType = response.headers["content-type"];
// //   //         if (!contentType || !contentType.startsWith("audio/")) {
// //   //           throw new Error(`Unexpected content-type: ${contentType}`);
// //   //         }
// //   //         const audioBlob = response.data;
// //   //         await saveAudio(cacheKey, audioBlob);
// //   //         console.log(`Saved audio to storage with key: ${cacheKey}`);
// //   //         audioUrl = URL.createObjectURL(audioBlob);
// //   //         ttsCache.current[cacheKey] = audioUrl;
// //   //         console.log(`TTS success for ${segment.speaker} on attempt ${attempt}`);
// //   //         success = true;
// //   //       } catch (error: any) {
// //   //         console.error(`TTS attempt ${attempt} failed for ${segment.speaker}:`, error.message);
// //   //         if (attempt >= 3) {
// //   //           audioUrl = createSilentAudio();
// //   //           failed = true;
// //   //           console.warn(`Using silent audio fallback for ${segment.speaker} after ${attempt} attempts.`);
// //   //         }
// //   //       }
// //   //     }
// //   //     results.push({ audioUrl, failed });
// //   //   }
// //   //   return results;
// //   // };

// //   // const createSilentAudio = (): string => {
// //   //   const silence = new Uint8Array(1000);
// //   //   const blob = new Blob([silence], { type: "audio/mp3" });
// //   //   const url = URL.createObjectURL(blob);
// //   //   console.log("Created silent audio blob URL:", url);
// //   //   return url;
// //   // };


// // // ----------------------------------------------------
// // // TTS Fetch Function (with Persistent Audio using Chapter Key)
// // const fetchTTS = async (batch: Segment[], offset: number = 0): Promise<TTSResult[]> => {
// //   const results: TTSResult[] = [];
// //   for (let i = 0; i < batch.length; i++) {
// //     const segment = batch[i];
// //     // Use the location prop here. It should be updated by the parent.
// //     const chapterLoc: string = location ? location.toString() : "default";
// //     const cacheKey = generateChapterKey(bookName, chapterLoc, offset + i);

// //     console.log(`Checking persistent storage for key: ${cacheKey}`);
// //     const storedAudioBlob = await loadAudio(cacheKey);
// //     if (storedAudioBlob) {
// //       const storedAudioUrl = URL.createObjectURL(storedAudioBlob);
// //       console.log(`Loaded audio from persistent storage for key: ${cacheKey}`);
// //       ttsCache.current[cacheKey] = storedAudioUrl;
// //       results.push({ audioUrl: storedAudioUrl, failed: false });
// //       continue;
// //     } else {
// //       console.log(`No stored audio found for key: ${cacheKey}. Fetching from API...`);
// //     }

// //     if (!segment.voice) {
// //       console.error(`No voice assigned for speaker: ${segment.speaker}`);
// //       results.push({ audioUrl: createSilentAudio(), failed: true });
// //       continue;
// //     }

// //     let attempt = 0;
// //     let success = false;
// //     let audioUrl = "";
// //     let failed = false;
// //     console.log(`Segment index: ${offset + i} | Text: "${segment.text}" | Generated Key: ${cacheKey}`);
// //     while (attempt < 3 && !success) {
// //       attempt++;
// //       if (attempt === 1) {
// //         await new Promise((resolve) => setTimeout(resolve, 50));
// //       } else {
// //         console.log(`Waiting 1 minute before next attempt for ${segment.speaker}...`);
// //         await new Promise((resolve) => setTimeout(resolve, 30000));
// //       }
// //       try {
// //         // Use the new generateTTS service
// //         const audioBlob = await generateTTS({
// //           text: segment.text,
// //           speaker: segment.speaker,
// //           gender: segment.gender,
// //           voiceMapping: voiceMappings,
// //         });

// //         await saveAudio(cacheKey, audioBlob);
// //         console.log(`Saved audio to storage with key: ${cacheKey}`);
// //         audioUrl = URL.createObjectURL(audioBlob);
// //         ttsCache.current[cacheKey] = audioUrl;
// //         console.log(`TTS success for ${segment.speaker} on attempt ${attempt}`);
// //         success = true;
// //       } catch (error: any) {
// //         console.error(`TTS attempt ${attempt} failed for ${segment.speaker}:`, error.message);
// //         if (attempt >= 3) {
// //           audioUrl = createSilentAudio();
// //           failed = true;
// //           console.warn(`Using silent audio fallback for ${segment.speaker} after ${attempt} attempts.`);
// //         }
// //       }
// //     }
// //     results.push({ audioUrl, failed });
// //   }
// //   return results;
// // };

// // const createSilentAudio = (): string => {
// //   const silence = new Uint8Array(1000);
// //   const blob = new Blob([silence], { type: "audio/mp3" });
// //   const url = URL.createObjectURL(blob);
// //   console.log("Created silent audio blob URL:", url);
// //   return url;
// // };











// //   // ----------------------------------------------------
// //   // Effects
// //   // ----------------------------------------------------
// //   // Countdown timer for estimated audio wait time.
// //   useEffect(() => {
// //     if (estimatedTime > 0) {
// //       const interval = setInterval(() => {
// //         setEstimatedTime((prev) => {
// //           if (prev <= 1) {
// //             clearInterval(interval);
// //             return 0;
// //           }
// //           return prev - 1;
// //         });
// //       }, 1000);
// //       return () => clearInterval(interval);
// //     }
// //   }, [estimatedTime]);

// //   // Auto-resume playback effect (only if not finished).
// //   useEffect(() => {
// //     if (!isPlaying && audioQueue.length > 0 && !isChunkLoading && !playbackFinished) {
// //       handlePlay();
// //     }
// //   }, [audioQueue, isPlaying, isChunkLoading, playbackFinished]);

// //   // Auto-scroll container when text updates.
// //   useEffect(() => {
// //     if (textContainerRef.current) {
// //       textContainerRef.current.scrollTo({
// //         top: textContainerRef.current.scrollHeight,
// //         behavior: "smooth",
// //       });
// //     }
// //   }, [textToDisplay]);

// //   // Preload background image.
// //   useEffect(() => {
// //     const preloadImage = new Image();
// //     preloadImage.src = "/images/olderpaper.jpg";
// //   }, []);

// //   // Fetch text automatically when PlayMode opens.
// //   useEffect(() => {
// //     extractText();
// //   }, [extractText]);

// //   // Cleanup playback on unmount.
// //   useEffect(() => {
// //     return () => {
// //       cleanupPlayback();
// //     };
// //   }, []);

// //   // ----------------------------------------------------
// //   // Process Chunks Sequentially
// //   // ----------------------------------------------------
// //   const processChunksSequentially = async (chunks: string[]): Promise<void> => {
// //     let combinedSegments: Segment[] = [];
// //     let contextSummary = "";
// //     let failCount = 0;
// //     let offset = 0; // start offset at 0 for the chapter

// //     for (let i = 0; i < chunks.length; i++) {
// //       setIsChunkLoading(true);
// //       try {
// //         console.log(`Processing chunk ${i + 1} of ${chunks.length}`);
// //         const payload: any = { text: chunks[i] };
// //         if (i > 0 && contextSummary) {
// //           payload.context = `Context Summary:\n${contextSummary}`;
// //         }
// //         // const parseResponse = await axios.post("/api/parse_text", payload);
// //         // const { segments: chunkSegments } = parseResponse.data;
// //         // console.log(`Parsed segments for chunk ${i + 1}:`, chunkSegments);

// //         const parseResponse = await textParsingService.parseText(payload);
// //         const { segments: chunkSegments } = parseResponse;
// //         console.log(`Parsed segments for chunk ${i + 1}:`, chunkSegments);

// //         const processedSegments: Segment[] = chunkSegments.map((seg: Segment) => {
// //           const normalizedSpeaker = seg.speaker.trim().toLowerCase();
// //           let assignment = voiceMappings[normalizedSpeaker];
// //           if (!assignment) {
// //             const gender = (seg.gender === "MALE" || seg.gender === "FEMALE") ? seg.gender : "MALE";
// //             assignment = getVoiceForSpeaker(seg.speaker, gender);
// //             updateVoiceMapping(normalizedSpeaker, assignment);
// //           }
// //           return { ...seg, voice: assignment.voice, gender: seg.gender };
// //         });

// //         combinedSegments = [...combinedSegments, ...processedSegments];
// //         setSegments(combinedSegments);
// //         contextSummary = buildContextSummary(combinedSegments);
// //         console.log("Updated Context Summary:", contextSummary);

// //         const estimatedTimeForChunk = processedSegments.length * 10;
// //         setEstimatedTime((prev) => prev + estimatedTimeForChunk);

// //         const ttsResultsForChunk = await fetchTTS(processedSegments, offset);
// //         const failedCountForChunk = ttsResultsForChunk.filter(r => r.failed).length;
// //         failCount += failedCountForChunk;
// //         if (failCount > 3) {
// //           setTtsError(true);
// //           setIsLoading(false);
// //           setRetryAvailableAt(new Date(Date.now() + 2 * 60 * 1000));
// //           return;
// //         }

// //         setTTSResults((prev) => [...prev, ...ttsResultsForChunk]);
// //         setAudioQueue((prev) => [
// //           ...prev,
// //           ...ttsResultsForChunk.map((result) => result.audioUrl),
// //         ]);
// //         offset += processedSegments.length;

// //         if (i === 0) {
// //           setIsPlaying(true);
// //           setIsPaused(false);
// //           setCurrentSegmentIndex(0);
// //           setDisplayedText("");
// //           setIsLoading(false);
// //         }
// //       } catch (error: any) {
// //         console.error(
// //           `Error processing chunk ${i + 1}:`,
// //           error.response?.data?.error || error.message || error
// //         );
// //         setIsLoading(false);
// //       } finally {
// //         setIsChunkLoading(false);
// //       }
// //     }
// //     console.log("All chunks processed.");
// //     setAllChunksProcessed(true);
// //   };

// //   const splitTextIntoChunks = (text: string, maxChunkLength: number = 3000): string[] => {
// //     const paragraphs = text.split(/\n+/).filter((p) => p.trim() !== "");
// //     const chunks: string[] = [];
// //     let currentChunk = "";
// //     for (const para of paragraphs) {
// //       if ((currentChunk + "\n" + para).length > maxChunkLength) {
// //         if (currentChunk) {
// //           chunks.push(currentChunk);
// //           currentChunk = "";
// //         }
// //         if (para.length > maxChunkLength) {
// //           for (let i = 0; i < para.length; i += maxChunkLength) {
// //             chunks.push(para.slice(i, i + maxChunkLength));
// //           }
// //         } else {
// //           currentChunk = para;
// //         }
// //       } else {
// //         currentChunk += (currentChunk ? "\n" : "") + para;
// //       }
// //     }
// //     if (currentChunk) {
// //       chunks.push(currentChunk);
// //     }
// //     return chunks;
// //   };

// //   const playCurrentSegment = () => {
// //     if (audioRef.current && isPaused) {
// //       audioRef.current.play().catch((err) => console.error("Error resuming audio:", err));
// //       setIsPaused(false);
// //     }
// //   };

// //   const startTextAnimation = (duration: number, text: string) => {
// //     if (!text) return;
// //     isAnimationFinishedRef.current = false; // Reset flag at start
// //     const animationDuration = duration * 100; // Use the proper multiplier.
// //     const words = text.split(" ") || [];
// //     const totalWords = words.length;
// //     const wordInterval = animationDuration / totalWords;
// //     let currentWordIndex = 0;
// //     setDisplayedText("");
// //     if (animationIntervalRef.current) {
// //       clearInterval(animationIntervalRef.current);
// //     }
// //     animationIntervalRef.current = setInterval(() => {
// //       if (isPaused) return;
// //       if (currentWordIndex < totalWords) {
// //         const word = words[currentWordIndex];
// //         setDisplayedText((prev) => (prev ? `${prev} ${word}`.trim() : word));
// //         currentWordIndex++;
// //         if (currentWordIndex === totalWords) {
// //           isAnimationFinishedRef.current = true;
// //         }
// //       } else {
// //         clearInterval(animationIntervalRef.current!);
// //       }
// //     }, wordInterval);
// //   };

// //   const handleStart = async () => {
// //     if (!currentPageContent.trim()) {
// //       alert("No text found on this page. Try navigating to another page.");
// //       return;
// //     }
// //     setIsLoading(true);
// //     try {
// //       const MAX_CHUNK_LENGTH = 1500;
// //       const chunks = currentPageContent.length > MAX_CHUNK_LENGTH
// //         ? splitTextIntoChunks(currentPageContent, MAX_CHUNK_LENGTH)
// //         : [currentPageContent];
// //       console.log(`Splitting text into ${chunks.length} chunk(s)`);
// //       await processChunksSequentially(chunks);
// //     } catch (error: any) {
// //       console.error("Error processing text:", error.response?.data?.error || error.message || error);
// //       alert("Failed to process the text. Please try again.");
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   const handlePlay = () => {
// //     if (retryAvailableAt && new Date() < retryAvailableAt) {
// //       alert("Please wait 5 minutes before trying again.");
// //       return;
// //     }
// //     setTtsError(false);
// //     setRetryAvailableAt(null);
// //     if (isPlaying && isPaused && audioRef.current) {
// //       audioRef.current.play().catch((err) => console.error("Error resuming audio:", err));
// //       setIsPaused(false);
// //       return;
// //     }
// //     handleStart();
// //   };

// //   const handlePause = () => {
// //     if (audioRef.current) {
// //       audioRef.current.pause();
// //     }
// //     setIsPaused(true);
// //   };

// //   const handleStop = () => {
// //     if (audioRef.current) {
// //       audioRef.current.pause();
// //       audioRef.current.currentTime = 0;
// //       audioRef.current = null;
// //     }
// //     if (animationIntervalRef.current) {
// //       clearInterval(animationIntervalRef.current);
// //       animationIntervalRef.current = null;
// //     }
// //     setIsPlaying(false);
// //     setIsPaused(false);
// //     setCurrentSegmentIndex(0);
// //     setDisplayedText("");
// //     setAudioQueue([]);
// //     setIsChunkLoading(false);
// //   };

// //   const handleBackward = () => {
// //     if (currentSegmentIndex > 0) {
// //       if (audioRef.current) {
// //         audioRef.current.pause();
// //         audioRef.current = null;
// //       }
// //       if (animationIntervalRef.current) {
// //         clearInterval(animationIntervalRef.current);
// //       }
// //       setCurrentSegmentIndex((prev) => prev - 1);
// //       setDisplayedText("");
// //       playCurrentSegment();
// //     }
// //   };

// //   const handleForward = () => {
// //     if (currentSegmentIndex < segments.length - 1) {
// //       if (audioRef.current) {
// //         audioRef.current.pause();
// //         audioRef.current = null;
// //       }
// //       if (animationIntervalRef.current) {
// //         clearInterval(animationIntervalRef.current);
// //       }
// //       setCurrentSegmentIndex((prev) => prev + 1);
// //       setDisplayedText("");
// //       playCurrentSegment();
// //     }
// //   };

// //   // ----------------------------------------------------
// //   // Playback Effects
// //   // ----------------------------------------------------
// //   useEffect(() => {
// //     if (isPlaying && currentSegmentIndex < segments.length && audioQueue.length > 0) {
// //       if (audioRef.current) return;

// //       const audioUrl = audioQueue[currentSegmentIndex];
// //       const currentSeg = segments[currentSegmentIndex];
// //       const audio = new Audio(audioUrl);
// //       audio.preload = "auto";
// //       audio.load();
// //       audioRef.current = audio;

// //       audio.onended = () => {
// //         const nextIndex = currentSegmentIndex + 1;
// //         setDisplayedText("");
// //         audioRef.current = null;

// //         if (nextIndex < audioQueue.length) {
// //           setCurrentSegmentIndex(nextIndex);
// //           if (!isPaused) playCurrentSegment();
// //         } else {
// //           console.log("Reached the end of the current audio queue.");
// //           if (allChunksProcessed) {
// //             setPlaybackFinished(true);
// //           } else {
// //             setIsAwaitingNewChunk(true);
// //           }
// //         }
// //       };

// //       audio.onloadedmetadata = () => {
// //         setIsChunkLoading(false);
// //         let duration = audio.duration;
// //         if (isNaN(duration) || duration === Infinity || duration === 0) {
// //           setTimeout(() => {
// //             if (audioRef.current && audioRef.current.duration > 0) {
// //               startTextAnimation(audioRef.current.duration, currentSeg.text);
// //             } else {
// //               console.warn("Falling back to default duration for animation.");
// //               startTextAnimation(5, currentSeg.text);
// //             }
// //           }, 200);
// //         } else {
// //           startTextAnimation(duration, currentSeg.text);
// //         }
// //       };

// //       audio.play().catch((err) => {
// //         console.error("Error playing audio:", err);
// //       });
// //     }
// //     return () => {
// //       if (animationIntervalRef.current) {
// //         clearInterval(animationIntervalRef.current);
// //       }
// //     };
// //   }, [isPlaying, currentSegmentIndex, audioQueue, segments, isPaused, isLoading, isChunkLoading, allChunksProcessed]);

// //   useEffect(() => {
// //     if (isAwaitingNewChunk && !playbackFinished && audioQueue.length > currentSegmentIndex + 1) {
// //       console.log("New audio chunk detected. Resuming playback...");
// //       setIsAwaitingNewChunk(false);
// //       playCurrentSegment();
// //     }
// //   }, [audioQueue, isAwaitingNewChunk, currentSegmentIndex, playbackFinished]);

// //   useEffect(() => {
// //     if (isPlaying && allChunksProcessed && currentSegmentIndex >= segments.length) {
// //       setPlaybackFinished(true);
// //     }
// //   }, [isPlaying, currentSegmentIndex, segments, allChunksProcessed]);

// //   useEffect(() => {
// //     return () => {
// //       cleanupPlayback();
// //     };
// //   }, []);

// //   return (
// //     <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
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
// //           onMouseDown={() => {
// //             if (typeof window !== "undefined" && window.speechSynthesis) {
// //               window.speechSynthesis.cancel();
// //             }
// //           }}
// //           onClick={() => {
// //             cleanupPlayback();
// //             onClose();
// //           }}
// //           aria-label="Close"
// //         >
// //           <X size={20} />
// //         </button>

// //         {playbackFinished && (
// //           <div className="flex items-center justify-center p-4 bg-yellow-100 text-yellow-800">
// //             Playback finished. Click "Stop" or "Close" to exit.
// //           </div>
// //         )}

// //         {ttsError ? (
// //           <div className="flex flex-col items-center justify-center h-full">
// //             <p className="mt-4 text-base sm:text-lg font-medium text-red-600">
// //               TTS failed multiple times. Please try again in 5 minutes.
// //             </p>
// //           </div>
// //         ) : isLoading ? (
// //           <div className="flex flex-col items-center justify-center h-full">
// //             <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-gray-700"></div>
// //             <p className="mt-4 text-base sm:text-lg font-medium">
// //               Your audio will start in approximately {estimatedTime} seconds...
// //             </p>
// //           </div>
// //         ) : !isPlaying ? (
// //           <div className="flex flex-col items-center justify-center gap-4 relative h-full">
// //             <Button
// //               onClick={handlePlay}
// //               className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// //             >
// //               Start Audiobook
// //             </Button>
// //           </div>
// //         ) : (
// //           <div
// //             className="relative w-full h-full bg-[url('/images/olderpaper.jpg')] bg-cover bg-center p-4 sm:p-8 overflow-y-auto"
// //             ref={textContainerRef}
// //           >
// //             {currentTTSResult?.failed && (
// //               <div className="mb-2 text-sm text-red-600">
// //                 Audio unavailable – please read the text below.
// //               </div>
// //             )}
// //             <p className="text-base sm:text-2xl leading-relaxed font-serif">
// //               {textToDisplay}
// //             </p>
// //           </div>
// //         )}

// //         {isPlaying && !ttsError && (
// //           <div className="absolute bottom-4 left-4 flex flex-wrap gap-4">
// //             <Button
// //               onClick={handleBackward}
// //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// //             >
// //               Back
// //             </Button>
// //             {isPaused ? (
// //               <Button
// //                 onClick={handlePlay}
// //                 className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// //               >
// //                 <Play size={16} /> Resume
// //               </Button>
// //             ) : (
// //               <Button
// //                 onClick={handlePause}
// //                 className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// //               >
// //                 <Pause size={16} /> Pause
// //               </Button>
// //             )}
// //             <Button
// //               onClick={handleForward}
// //               disabled={!allChunksProcessed && currentSegmentIndex >= segments.length}
// //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
// //             >
// //               Forward
// //             </Button>
// //             <Button
// //               onClick={handleStop}
// //               className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
// //             >
// //               <X size={16} /> Stop
// //             </Button>
// //           </div>
// //         )}
// //       </div>
// //     </div>
// //   );
// // };

// // export default PlayMode;


// // components/PlayMode.tsx
// import React, { useState, useEffect, useRef } from "react";
// import { Button } from "./ui/button";
// import { Slider } from "./ui/slider";
// import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
// import { X, Play, Pause, Volume2 } from "lucide-react";
// import localforage from "localforage";

// interface PlayModeProps {
//   currentPageContent: string;
//   onClose: () => void;
//   extractText: () => void;
//   location: string;
//   bookName: string;
// }

// interface Segment {
//   speaker: string;
//   text: string;
//   voice?: string;
//   gender: "MALE" | "FEMALE";
// }

// interface VoiceMapping {
//   voice: string;
//   source: "predefined" | "generated";
// }

// interface VoiceMappings {
//   [key: string]: VoiceMapping;
// }

// const PlayMode: React.FC<PlayModeProps> = ({
//   currentPageContent,
//   onClose,
//   extractText,
//   location,
//   bookName
// }) => {
//   const [isPlaying, setIsPlaying] = useState<boolean>(false);
//   const [audioUrl, setAudioUrl] = useState<string | null>(null);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [error, setError] = useState<string | null>(null);
//   const [volume, setVolume] = useState<number>(80);
//   const [processedText, setProcessedText] = useState<string>("");
//   const audioRef = useRef<HTMLAudioElement | null>(null);
//   const [segments, setSegments] = useState<Segment[]>([]);
//   const [showRawText, setShowRawText] = useState<boolean>(false);

//   // Generate a storage key based on book name, location, and text content hash
//   const getStorageKey = () => {
//     // Simple hash function for text
//     const hash = Array.from(currentPageContent)
//       .reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
//       .toString(16);
    
//     // Create a key that combines book info, location, and content hash
//     return `tts_${bookName}_${location}_${hash}`;
//   };

//   // Process text into segments
//   const processTextIntoSegments = () => {
//     if (!currentPageContent) return [];
    
//     // Split into paragraphs
//     const paragraphs = currentPageContent
//       .split(/\n\s*\n/)
//       .map(p => p.trim())
//       .filter(p => p.length > 0);
    
//     // Convert paragraphs to segments
//     const newSegments: Segment[] = paragraphs.map((text, index) => ({
//       speaker: `Narrator`,
//       text,
//       gender: "FEMALE" // Default voice
//     }));
    
//     setSegments(newSegments);
    
//     // Combine all text for display
//     const combinedText = paragraphs.join('\n\n');
//     setProcessedText(combinedText);
    
//     return newSegments;
//   };

//   // Generate TTS audio from the current content
//   const generateAudio = async () => {
//     try {
//       const storageKey = getStorageKey();
      
//       // Try to get cached audio first
//       const cachedAudio = await localforage.getItem<string>(storageKey);
//       if (cachedAudio) {
//         console.log("Using cached audio");
//         setAudioUrl(cachedAudio);
//         return;
//       }
      
//       setLoading(true);
//       setError(null);
      
//       const processedSegments = segments.length > 0 ? segments : processTextIntoSegments();
      
//       // This is where you'd call your TTS API
//       // For this example, we'll use a placeholder implementation
//       // Replace this with your actual API call
      
//       console.log("Would generate TTS for segments:", processedSegments);
      
//       // Simulated API response delay
//       await new Promise(resolve => setTimeout(resolve, 1500));
      
//       // For demonstration, we'll use a sample audio URL
//       // In a real app, you would get this from your TTS API
//       const mockAudioUrl = "https://samplelib.com/lib/preview/mp3/sample-3s.mp3";
      
//       setAudioUrl(mockAudioUrl);
      
//       // Save to cache
//       await localforage.setItem(storageKey, mockAudioUrl);
      
//     } catch (err) {
//       console.error("Error generating audio:", err);
//       setError("Failed to generate audio. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Play/pause the audio
//   const togglePlayback = () => {
//     if (!audioRef.current) return;
    
//     if (isPlaying) {
//       audioRef.current.pause();
//     } else {
//       audioRef.current.play().catch(err => {
//         console.error("Error playing audio:", err);
//         setError("Failed to play audio");
//       });
//     }
//     setIsPlaying(!isPlaying);
//   };

//   // Update volume
//   const handleVolumeChange = (newValue: number[]) => {
//     const vol = newValue[0];
//     setVolume(vol);
//     if (audioRef.current) {
//       audioRef.current.volume = vol / 100;
//     }
//   };

//   // Initialize on mount
//   useEffect(() => {
//     processTextIntoSegments();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [currentPageContent]);

//   // Setup audio element
//   useEffect(() => {
//     if (audioUrl) {
//       if (!audioRef.current) {
//         audioRef.current = new Audio(audioUrl);
//         audioRef.current.volume = volume / 100;
        
//         audioRef.current.onended = () => {
//           setIsPlaying(false);
//         };
        
//         audioRef.current.onerror = () => {
//           setError("Error playing audio file");
//           setIsPlaying(false);
//         };
//       } else {
//         audioRef.current.src = audioUrl;
//       }
//     }
    
//     return () => {
//       if (audioRef.current) {
//         audioRef.current.pause();
//         audioRef.current = null;
//       }
//     };
//   }, [audioUrl, volume]);

//   return (
//     <Card className="w-full max-w-4xl bg-white dark:bg-gray-800 shadow-lg">
//       <CardHeader className="flex flex-row items-center justify-between">
//         <CardTitle>Play Mode</CardTitle>
//         <Button variant="ghost" size="icon" onClick={onClose}>
//           <X />
//         </Button>
//       </CardHeader>
      
//       <CardContent>
//         {/* Text display area */}
//         <div className="mb-6">
//           <div className="flex justify-between items-center mb-2">
//             <h3 className="text-lg font-medium">Content</h3>
//             <Button 
//               variant="outline" 
//               size="sm" 
//               onClick={() => setShowRawText(!showRawText)}
//             >
//               {showRawText ? "Show Processed" : "Show Raw"}
//             </Button>
//           </div>
//           <div className="max-h-64 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 rounded border">
//             {showRawText ? (
//               <pre className="whitespace-pre-wrap">{currentPageContent}</pre>
//             ) : (
//               <div>
//                 {segments.map((segment, idx) => (
//                   <p key={idx} className="mb-4">{segment.text}</p>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>
        
//         {/* Audio controls */}
//         <div className="space-y-4">
//           {error && (
//             <div className="text-red-500 mb-4">{error}</div>
//           )}
          
//           {!audioUrl && (
//             <Button 
//               onClick={generateAudio} 
//               disabled={loading || !currentPageContent}
//               className="w-full"
//             >
//               {loading ? "Generating Audio..." : "Generate Audio"}
//             </Button>
//           )}
          
//           {audioUrl && (
//             <>
//               <div className="flex items-center space-x-4">
//                 <Button 
//                   onClick={togglePlayback} 
//                   variant="outline"
//                   disabled={!audioUrl}
//                   size="icon"
//                 >
//                   {isPlaying ? <Pause /> : <Play />}
//                 </Button>
                
//                 <div className="flex items-center flex-1 space-x-2">
//                   <Volume2 size={18} />
//                   <Slider
//                     min={0}
//                     max={100}
//                     step={1}
//                     value={[volume]}
//                     onValueChange={handleVolumeChange}
//                     className="flex-1"
//                   />
//                 </div>
//               </div>
//             </>
//           )}
          
//           <div className="text-sm text-gray-500 dark:text-gray-400 mt-4">
//             {bookName !== "UnknownBook" && (
//               <p>Book: {bookName}</p>
//             )}
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// };

// export default PlayMode;




// components/PlayMode.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { X, Play, Pause } from "lucide-react";
import { getVoiceForSpeaker, VoiceAssignment } from "../services/getVoices";
import { loadVoiceAssignments, saveVoiceAssignments } from "../lib/voiceStorage";
import { saveAudio, loadAudio } from "../lib/mediaStorage";
import { generateTTS } from '../services/tts';
import { textParsingService } from "../services/parse_text";

// Client-side interfaces
export interface Segment {
  speaker: string;
  text: string;
  voice?: string; // Assigned voice string.
  gender: "MALE" | "FEMALE";
}

export interface VoiceMapping {
  voice: string;
  source: "predefined" | "generated";
}

export interface VoiceMappings {
  [key: string]: VoiceMapping;
}

interface TTSResult {
  audioUrl: string;
  failed: boolean;
}

interface PlayModeProps {
  currentPageContent: string;
  onClose: () => void;
  extractText: () => void;
  // New prop: chapter location should be passed from the parent.
  location: string;
  bookName: string;
}

const PlayMode: React.FC<PlayModeProps> = ({
  currentPageContent,
  onClose,
  extractText,
  location, // use the location prop here
  bookName,
}) => {
  // Playback and TTS states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [voiceMappings, setVoiceMappings] = useState<VoiceMappings>(() => loadVoiceAssignments());
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [ttsResults, setTTSResults] = useState<TTSResult[]>([]);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [ttsError, setTtsError] = useState(false);
  const [retryAvailableAt, setRetryAvailableAt] = useState<Date | null>(null);
  const [isChunkLoading, setIsChunkLoading] = useState(false);
  const [playbackFinished, setPlaybackFinished] = useState(false);
  const [isAwaitingNewChunk, setIsAwaitingNewChunk] = useState<boolean>(false);
  const [allChunksProcessed, setAllChunksProcessed] = useState(false);

  // Refs for audio, container, animation, and in-memory TTS cache.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textContainerRef = useRef<HTMLDivElement | null>(null);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ttsCache = useRef<{ [key: string]: string }>({});
  const isAnimationFinishedRef = useRef<boolean>(false);

  // Derived values.
  const currentTTSResult = ttsResults[currentSegmentIndex];
  const currentSegment = segments[currentSegmentIndex];
  const textToDisplay = currentTTSResult?.failed ? currentSegment?.text || "" : displayedText;

  // ----------------------------------------------------
  // Helper: Generate a stable key based on chapter location and absolute segment index.
  const generateChapterKey = (bookName: string, chapterLocation: string, segmentIndex: number): string => {
    return `tts_${bookName}_${chapterLocation}_${segmentIndex}`;
  };

  // ----------------------------------------------------
  // Helper Functions
  const updateVoiceMapping = (speakerKey: string, assignment: VoiceAssignment) => {
    const newMappings = { ...voiceMappings, [speakerKey]: assignment };
    setVoiceMappings(newMappings);
    saveVoiceAssignments(newMappings);
  };

  const buildContextSummary = (segments: Segment[]): string => {
    const nonNarrator = segments.filter(
      (seg) => seg.speaker.trim().toLowerCase() !== "narrator"
    );
    const speakerMap: { [key: string]: { speaker: string; gender: string; voice: string } } = {};
    nonNarrator.forEach((seg) => {
      const key = seg.speaker.trim().toLowerCase();
      const gender = (seg.gender === "MALE" || seg.gender === "FEMALE") ? seg.gender : "MALE";
      if (!speakerMap[key]) {
        speakerMap[key] = { speaker: seg.speaker, gender, voice: seg.voice || "" };
      }
    });
    const lastSegment = segments[segments.length - 1] || null;
    return JSON.stringify({ speakers: Object.values(speakerMap), lastSegment }, null, 2);
  };

  const cleanupPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    setAudioQueue([]);
    setIsPlaying(false);
    setIsChunkLoading(false);
    setCurrentSegmentIndex(0);
    setDisplayedText("");
  };

  // ----------------------------------------------------
  // TTS Fetch Function (with Persistent Audio using Chapter Key)
  const fetchTTS = async (batch: Segment[], offset: number = 0): Promise<TTSResult[]> => {
    const results: TTSResult[] = [];
    for (let i = 0; i < batch.length; i++) {
      const segment = batch[i];
      // Use the location prop here. It should be updated by the parent.
      const chapterLoc: string = location ? location.toString() : "default";
      const cacheKey = generateChapterKey(bookName, chapterLoc, offset + i);

      console.log(`Checking persistent storage for key: ${cacheKey}`);
      const storedAudioBlob = await loadAudio(cacheKey);
      if (storedAudioBlob) {
        const storedAudioUrl = URL.createObjectURL(storedAudioBlob);
        console.log(`Loaded audio from persistent storage for key: ${cacheKey}`);
        ttsCache.current[cacheKey] = storedAudioUrl;
        results.push({ audioUrl: storedAudioUrl, failed: false });
        continue;
      } else {
        console.log(`No stored audio found for key: ${cacheKey}. Fetching from API...`);
      }

      if (!segment.voice) {
        console.error(`No voice assigned for speaker: ${segment.speaker}`);
        results.push({ audioUrl: createSilentAudio(), failed: true });
        continue;
      }

      let attempt = 0;
      let success = false;
      let audioUrl = "";
      let failed = false;
      console.log(`Segment index: ${offset + i} | Text: "${segment.text}" | Generated Key: ${cacheKey}`);
      while (attempt < 3 && !success) {
        attempt++;
        if (attempt === 1) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        } else {
          console.log(`Waiting before next attempt for ${segment.speaker}...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        try {
          // Use the generateTTS service
          const audioBlob = await generateTTS({
            text: segment.text,
            speaker: segment.speaker,
            gender: segment.gender,
            voiceMapping: voiceMappings,
          });

          await saveAudio(cacheKey, audioBlob);
          console.log(`Saved audio to storage with key: ${cacheKey}`);
          audioUrl = URL.createObjectURL(audioBlob);
          ttsCache.current[cacheKey] = audioUrl;
          console.log(`TTS success for ${segment.speaker} on attempt ${attempt}`);
          success = true;
        } catch (error: any) {
          console.error(`TTS attempt ${attempt} failed for ${segment.speaker}:`, error.message);
          if (attempt >= 3) {
            audioUrl = createSilentAudio();
            failed = true;
            console.warn(`Using silent audio fallback for ${segment.speaker} after ${attempt} attempts.`);
          }
        }
      }
      results.push({ audioUrl, failed });
    }
    return results;
  };

  const createSilentAudio = (): string => {
    const silence = new Uint8Array(1000);
    const blob = new Blob([silence], { type: "audio/mp3" });
    const url = URL.createObjectURL(blob);
    console.log("Created silent audio blob URL:", url);
    return url;
  };

  // ----------------------------------------------------
  // Effects
  // ----------------------------------------------------
  // Countdown timer for estimated audio wait time.
  useEffect(() => {
    if (estimatedTime > 0) {
      const interval = setInterval(() => {
        setEstimatedTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [estimatedTime]);

  // Auto-resume playback effect (only if not finished).
  useEffect(() => {
    if (!isPlaying && audioQueue.length > 0 && !isChunkLoading && !playbackFinished) {
      handlePlay();
    }
  }, [audioQueue, isPlaying, isChunkLoading, playbackFinished]);

  // Auto-scroll container when text updates.
  useEffect(() => {
    if (textContainerRef.current) {
      textContainerRef.current.scrollTo({
        top: textContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [textToDisplay]);

  // Preload background image.
  useEffect(() => {
    const preloadImage = new Image();
    preloadImage.src = "/images/olderpaper.jpg";
  }, []);

  // Fetch text automatically when PlayMode opens.
  useEffect(() => {
    extractText();
  }, [extractText]);

  // Cleanup playback on unmount.
  useEffect(() => {
    return () => {
      cleanupPlayback();
    };
  }, []);

  // ----------------------------------------------------
  // Process Chunks Sequentially
  // ----------------------------------------------------
  const processChunksSequentially = async (chunks: string[]): Promise<void> => {
    let combinedSegments: Segment[] = [];
    let contextSummary = "";
    let failCount = 0;
    let offset = 0; // start offset at 0 for the chapter

    for (let i = 0; i < chunks.length; i++) {
      setIsChunkLoading(true);
      try {
        console.log(`Processing chunk ${i + 1} of ${chunks.length}`);
        const payload: any = { text: chunks[i] };
        if (i > 0 && contextSummary) {
          payload.context = `Context Summary:\n${contextSummary}`;
        }

        const parseResponse = await textParsingService.parseText(payload);
        const { segments: chunkSegments } = parseResponse;
        console.log(`Parsed segments for chunk ${i + 1}:`, chunkSegments);

        const processedSegments: Segment[] = chunkSegments.map((seg: Segment) => {
          const normalizedSpeaker = seg.speaker.trim().toLowerCase();
          let assignment = voiceMappings[normalizedSpeaker];
          if (!assignment) {
            const gender = (seg.gender === "MALE" || seg.gender === "FEMALE") ? seg.gender : "MALE";
            assignment = getVoiceForSpeaker(seg.speaker, gender);
            updateVoiceMapping(normalizedSpeaker, assignment);
          }
          return { ...seg, voice: assignment.voice, gender: seg.gender };
        });

        combinedSegments = [...combinedSegments, ...processedSegments];
        setSegments(combinedSegments);
        contextSummary = buildContextSummary(combinedSegments);
        console.log("Updated Context Summary:", contextSummary);

        const estimatedTimeForChunk = processedSegments.length * 10;
        setEstimatedTime((prev) => prev + estimatedTimeForChunk);

        const ttsResultsForChunk = await fetchTTS(processedSegments, offset);
        const failedCountForChunk = ttsResultsForChunk.filter(r => r.failed).length;
        failCount += failedCountForChunk;
        if (failCount > 3) {
          setTtsError(true);
          setIsLoading(false);
          setRetryAvailableAt(new Date(Date.now() + 2 * 60 * 1000));
          return;
        }

        setTTSResults((prev) => [...prev, ...ttsResultsForChunk]);
        setAudioQueue((prev) => [
          ...prev,
          ...ttsResultsForChunk.map((result) => result.audioUrl),
        ]);
        offset += processedSegments.length;

        if (i === 0) {
          setIsPlaying(true);
          setIsPaused(false);
          setCurrentSegmentIndex(0);
          setDisplayedText("");
          setIsLoading(false);
        }
      } catch (error: any) {
        console.error(
          `Error processing chunk ${i + 1}:`,
          error.response?.data?.error || error.message || error
        );
        setIsLoading(false);
      } finally {
        setIsChunkLoading(false);
      }
    }
    console.log("All chunks processed.");
    setAllChunksProcessed(true);
  };

  const splitTextIntoChunks = (text: string, maxChunkLength: number = 3000): string[] => {
    const paragraphs = text.split(/\n+/).filter((p) => p.trim() !== "");
    const chunks: string[] = [];
    let currentChunk = "";
    for (const para of paragraphs) {
      if ((currentChunk + "\n" + para).length > maxChunkLength) {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = "";
        }
        if (para.length > maxChunkLength) {
          for (let i = 0; i < para.length; i += maxChunkLength) {
            chunks.push(para.slice(i, i + maxChunkLength));
          }
        } else {
          currentChunk = para;
        }
      } else {
        currentChunk += (currentChunk ? "\n" : "") + para;
      }
    }
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    return chunks;
  };

  const playCurrentSegment = () => {
    if (audioRef.current && isPaused) {
      audioRef.current.play().catch((err) => console.error("Error resuming audio:", err));
      setIsPaused(false);
    }
  };

  const startTextAnimation = (duration: number, text: string) => {
    if (!text) return;
    isAnimationFinishedRef.current = false; // Reset flag at start
    const animationDuration = duration * 100; // Use the proper multiplier.
    const words = text.split(" ") || [];
    const totalWords = words.length;
    const wordInterval = animationDuration / totalWords;
    let currentWordIndex = 0;
    setDisplayedText("");
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
    }
    animationIntervalRef.current = setInterval(() => {
      if (isPaused) return;
      if (currentWordIndex < totalWords) {
        const word = words[currentWordIndex];
        setDisplayedText((prev) => (prev ? `${prev} ${word}`.trim() : word));
        currentWordIndex++;
        if (currentWordIndex === totalWords) {
          isAnimationFinishedRef.current = true;
        }
      } else {
        clearInterval(animationIntervalRef.current!);
      }
    }, wordInterval);
  };

  const handleStart = async () => {
    if (!currentPageContent.trim()) {
      alert("No text found on this page. Try navigating to another page.");
      return;
    }
    setIsLoading(true);
    try {
      const MAX_CHUNK_LENGTH = 1500;
      const chunks = currentPageContent.length > MAX_CHUNK_LENGTH
        ? splitTextIntoChunks(currentPageContent, MAX_CHUNK_LENGTH)
        : [currentPageContent];
      console.log(`Splitting text into ${chunks.length} chunk(s)`);
      await processChunksSequentially(chunks);
    } catch (error: any) {
      console.error("Error processing text:", error.response?.data?.error || error.message || error);
      alert("Failed to process the text. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = () => {
    if (retryAvailableAt && new Date() < retryAvailableAt) {
      alert("Please wait before trying again.");
      return;
    }
    setTtsError(false);
    setRetryAvailableAt(null);
    if (isPlaying && isPaused && audioRef.current) {
      audioRef.current.play().catch((err) => console.error("Error resuming audio:", err));
      setIsPaused(false);
      return;
    }
    handleStart();
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPaused(true);
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSegmentIndex(0);
    setDisplayedText("");
    setAudioQueue([]);
    setIsChunkLoading(false);
  };

  const handleBackward = () => {
    if (currentSegmentIndex > 0) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
      setCurrentSegmentIndex((prev) => prev - 1);
      setDisplayedText("");
      playCurrentSegment();
    }
  };

  const handleForward = () => {
    if (currentSegmentIndex < segments.length - 1) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
      setCurrentSegmentIndex((prev) => prev + 1);
      setDisplayedText("");
      playCurrentSegment();
    }
  };

  // ----------------------------------------------------
  // Playback Effects
  // ----------------------------------------------------
  useEffect(() => {
    if (isPlaying && currentSegmentIndex < segments.length && audioQueue.length > 0) {
      if (audioRef.current) return;

      const audioUrl = audioQueue[currentSegmentIndex];
      const currentSeg = segments[currentSegmentIndex];
      const audio = new Audio(audioUrl);
      audio.preload = "auto";
      audio.load();
      audioRef.current = audio;

      audio.onended = () => {
        const nextIndex = currentSegmentIndex + 1;
        setDisplayedText("");
        audioRef.current = null;

        if (nextIndex < audioQueue.length) {
          setCurrentSegmentIndex(nextIndex);
          if (!isPaused) playCurrentSegment();
        } else {
          console.log("Reached the end of the current audio queue.");
          if (allChunksProcessed) {
            setPlaybackFinished(true);
          } else {
            setIsAwaitingNewChunk(true);
          }
        }
      };

      audio.onloadedmetadata = () => {
        setIsChunkLoading(false);
        let duration = audio.duration;
        if (isNaN(duration) || duration === Infinity || duration === 0) {
          setTimeout(() => {
            if (audioRef.current && audioRef.current.duration > 0) {
              startTextAnimation(audioRef.current.duration, currentSeg.text);
            } else {
              console.warn("Falling back to default duration for animation.");
              startTextAnimation(5, currentSeg.text);
            }
          }, 200);
        } else {
          startTextAnimation(duration, currentSeg.text);
        }
      };

      audio.play().catch((err) => {
        console.error("Error playing audio:", err);
      });
    }
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, [isPlaying, currentSegmentIndex, audioQueue, segments, isPaused, isLoading, isChunkLoading, allChunksProcessed]);

  useEffect(() => {
    if (isAwaitingNewChunk && !playbackFinished && audioQueue.length > currentSegmentIndex + 1) {
      console.log("New audio chunk detected. Resuming playback...");
      setIsAwaitingNewChunk(false);
      playCurrentSegment();
    }
  }, [audioQueue, isAwaitingNewChunk, currentSegmentIndex, playbackFinished]);

  useEffect(() => {
    if (isPlaying && allChunksProcessed && currentSegmentIndex >= segments.length) {
      setPlaybackFinished(true);
    }
  }, [isPlaying, currentSegmentIndex, segments, allChunksProcessed]);

  useEffect(() => {
    return () => {
      cleanupPlayback();
    };
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
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
          onMouseDown={() => {
            if (typeof window !== "undefined" && window.speechSynthesis) {
              window.speechSynthesis.cancel();
            }
          }}
          onClick={() => {
            cleanupPlayback();
            onClose();
          }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {playbackFinished && (
          <div className="flex items-center justify-center p-4 bg-yellow-100 text-yellow-800">
            Playback finished. Click "Stop" or "Close" to exit.
          </div>
        )}

        {ttsError ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="mt-4 text-base sm:text-lg font-medium text-red-600">
              TTS failed multiple times. Please try again later.
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-gray-700"></div>
            <p className="mt-4 text-base sm:text-lg font-medium">
              Your audio will start in approximately {estimatedTime} seconds...
            </p>
          </div>
        ) : !isPlaying ? (
          <div className="flex flex-col items-center justify-center gap-4 relative h-full">
            <Button
              onClick={handlePlay}
              className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-md shadow-md transition-colors focus:outline-none"
            >
              Start Audiobook
            </Button>
          </div>
        ) : (
          <div
            className="relative w-full h-full bg-gray-100 dark:bg-gray-800 p-4 sm:p-8 overflow-y-auto"
            ref={textContainerRef}
          >
            {currentTTSResult?.failed && (
              <div className="mb-2 text-sm text-red-600">
                Audio unavailable – please read the text below.
              </div>
            )}
            <p className="text-base sm:text-2xl leading-relaxed font-serif text-gray-900 dark:text-gray-100">
              {textToDisplay}
            </p>
          </div>
        )}

        {isPlaying && !ttsError && (
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-4">
            <Button
              onClick={handleBackward}
              className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
            >
              Back
            </Button>
            {isPaused ? (
              <Button
                onClick={handlePlay}
                className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
              >
                <Play size={16} /> Resume
              </Button>
            ) : (
              <Button
                onClick={handlePause}
                className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
              >
                <Pause size={16} /> Pause
              </Button>
            )}
            <Button
              onClick={handleForward}
              disabled={!allChunksProcessed && currentSegmentIndex >= segments.length}
              className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none"
            >
              Forward
            </Button>
            <Button
              onClick={handleStop}
              className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition-colors focus:outline-none flex items-center gap-2"
            >
              <X size={16} /> Stop
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayMode;