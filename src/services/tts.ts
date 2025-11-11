// // // // // // // // // // // // // pages/api/tts.ts

// // // // // // // // // // // // import type { NextApiRequest, NextApiResponse } from 'next';
// // // // // // // // // // // // import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// // // // // // // // // // // // // Speaker-to-Voice Mapping
// // // // // // // // // // // // const speakerVoiceMap: { [key: string]: string } = {
// // // // // // // // // // // //   "Narrator": "en-US-AndrewNeural",
// // // // // // // // // // // //   "Speaker 1": "en-US-BrianMultilingualNeural",
// // // // // // // // // // // //   "Speaker 2": "en-US-SteffanNeural",
// // // // // // // // // // // //   "Speaker 3": "en-US-BrianMultilingualNeural",
// // // // // // // // // // // //   "Speaker 4": "en-US-RogerNeural"
// // // // // // // // // // // // };

// // // // // // // // // // // // export default async function handler(req: NextApiRequest, res: NextApiResponse) {
// // // // // // // // // // // //   if (req.method !== 'GET') {
// // // // // // // // // // // //     return res.status(405).json({ error: 'Method not allowed. Use GET.' });
// // // // // // // // // // // //   }

// // // // // // // // // // // //   const { text, speaker } = req.query;

// // // // // // // // // // // //   if (!text || !speaker) {
// // // // // // // // // // // //     return res.status(400).json({ error: "Missing text or speaker" });
// // // // // // // // // // // //   }

// // // // // // // // // // // //   const voice = speakerVoiceMap[speaker as string] || "en-US-AndrewNeural"; // Default to Narrator

// // // // // // // // // // // //   try {
// // // // // // // // // // // //     console.log(`🎤 Generating audio for speaker: ${speaker}, using voice: ${voice}`);

// // // // // // // // // // // //     const tts = new MsEdgeTTS();
// // // // // // // // // // // //     await tts.setMetadata(voice, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);

// // // // // // // // // // // //     console.log(`✅ TTS metadata set. Sending request for text: "${text}"`);

// // // // // // // // // // // //     const { audioStream } = tts.toStream(text as string);

// // // // // // // // // // // //     // Set appropriate headers for streaming audio
// // // // // // // // // // // //     res.setHeader('Content-Type', 'audio/webm');
// // // // // // // // // // // //     res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
// // // // // // // // // // // //     res.setHeader('Pragma', 'no-cache');
// // // // // // // // // // // //     res.setHeader('Expires', '0');

// // // // // // // // // // // //     // Pipe the audio stream directly to the response
// // // // // // // // // // // //     audioStream.pipe(res);

// // // // // // // // // // // //     console.log("✅ Audio stream sent.");
// // // // // // // // // // // //   } catch (error: any) {
// // // // // // // // // // // //     console.error("❌ TTS Error:", error.message || error);
// // // // // // // // // // // //     res.status(500).json({ error: "TTS failed" });
// // // // // // // // // // // //   }
// // // // // // // // // // // // }



// // // // // // // // // // // import type { NextApiRequest, NextApiResponse } from 'next';
// // // // // // // // // // // import axios from 'axios';

// // // // // // // // // // // // Speaker-to-Voice Mapping for Kokoro
// // // // // // // // // // // const speakerVoiceMap: { [key: string]: string } = {
// // // // // // // // // // //   "Narrator": "af", // Example Kokoro voice
// // // // // // // // // // //   "Speaker 1": "af_heart",
// // // // // // // // // // //   "Speaker 2": "af_bella",
// // // // // // // // // // //   "Speaker 3": "af_sky",
// // // // // // // // // // //   "Speaker 4": "af_bella"
// // // // // // // // // // // };

// // // // // // // // // // // export default async function handler(req: NextApiRequest, res: NextApiResponse) {
// // // // // // // // // // //   if (req.method !== 'GET') {
// // // // // // // // // // //     return res.status(405).json({ error: 'Method not allowed. Use GET.' });
// // // // // // // // // // //   }

// // // // // // // // // // //   const { text, speaker } = req.query;

// // // // // // // // // // //   if (!text || !speaker) {
// // // // // // // // // // //     return res.status(400).json({ error: "Missing text or speaker" });
// // // // // // // // // // //   }

// // // // // // // // // // //   const voice = speakerVoiceMap[speaker as string] || "af"; // Default to Narrator

// // // // // // // // // // //   try {
// // // // // // // // // // //     console.log(`🎤 Requesting TTS from Kokoro for speaker: ${speaker}, using voice: ${voice}`);

// // // // // // // // // // //     // Send request to Kokoro TTS API
// // // // // // // // // // //     const response = await axios.post(
// // // // // // // // // // //       "http://localhost:8880/v1/audio/speech",
// // // // // // // // // // //       {
// // // // // // // // // // //         model: "kokoro",           // Required: Use Kokoro model
// // // // // // // // // // //         input: text as string,     // Text to convert into speech
// // // // // // // // // // //         voice: voice,              // Assigned voice based on speaker
// // // // // // // // // // //         response_format: "mp3",    // Output format
// // // // // // // // // // //         speed: 1,                  // Adjust speaking speed (1 = normal)
// // // // // // // // // // //         stream: true,              // Enable streaming
// // // // // // // // // // //         return_download_link: false // We will stream directly, no download link
// // // // // // // // // // //       },
// // // // // // // // // // //       { responseType: "stream" } // Ensure response is streamed
// // // // // // // // // // //     );

// // // // // // // // // // //     console.log("✅ Kokoro TTS response received. Streaming audio...");

// // // // // // // // // // //     // Set appropriate headers for streaming audio
// // // // // // // // // // //     res.setHeader('Content-Type', 'audio/mp3');
// // // // // // // // // // //     res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
// // // // // // // // // // //     res.setHeader('Pragma', 'no-cache');
// // // // // // // // // // //     res.setHeader('Expires', '0');

// // // // // // // // // // //     // Pipe the audio stream directly to the client
// // // // // // // // // // //     response.data.pipe(res);

// // // // // // // // // // //   } catch (error: any) {
// // // // // // // // // // //     console.error("❌ Kokoro TTS Error:", error.message || error);
// // // // // // // // // // //     res.status(500).json({ error: "Kokoro TTS failed" });
// // // // // // // // // // //   }
// // // // // // // // // // // }



// // // // // // // // // import type { NextApiRequest, NextApiResponse } from 'next';
// // // // // // // // // import axios from 'axios';

// // // // // // // // // // Updated Speaker-to-Voice Mapping with High-Quality Voices (for remapping if needed)
// // // // // // // // // const speakerVoiceMap: { [key: string]: { male: string; female: string } } = {
// // // // // // // // //   "Narrator": { male: "am_michael", female: "af_heart" },
// // // // // // // // //   "Speaker 1": { male: "am_michael", female: "af_bella" },
// // // // // // // // //   "Speaker 2": { male: "am_adam", female: "af_nicole" },
// // // // // // // // //   "Speaker 3": { male: "am_gurney", female: "af_sarah" },
// // // // // // // // //   "Speaker 4": { male: "am_michael", female: "af_bella" },
// // // // // // // // // };


// // // // // // // // // export default async function handler(req: NextApiRequest, res: NextApiResponse) {
// // // // // // // // //   if (req.method !== 'GET') {
// // // // // // // // //     return res.status(405).json({ error: 'Method not allowed. Use GET.' });
// // // // // // // // //   }

// // // // // // // // //   const { text, speaker } = req.query;

// // // // // // // // //   if (!text || !speaker) {
// // // // // // // // //     return res.status(400).json({ error: "Missing text or speaker" });
// // // // // // // // //   }

// // // // // // // // //   const voice = speakerVoiceMap[speaker as string]; 

// // // // // // // // //   try {
// // // // // // // // //     console.log(`🎤 Requesting TTS from Kokoro for speaker: ${speaker}, using voice: ${voice}`);

// // // // // // // // //     // Send request to Kokoro TTS API
// // // // // // // // //     const response = await axios.post(
// // // // // // // // //       "http://localhost:8880/v1/audio/speech",
// // // // // // // // //       {
// // // // // // // // //         model: "kokoro",           // Required: Use Kokoro model
// // // // // // // // //         input: text as string,     // Text to convert into speech
// // // // // // // // //         voice: voice,              // Assigned voice based on speaker
// // // // // // // // //         response_format: "mp3",    // Output format
// // // // // // // // //         speed: 1,                  // Adjust speaking speed (1 = normal)
// // // // // // // // //         stream: true,              // Enable streaming
// // // // // // // // //         return_download_link: false // We will stream directly, no download link
// // // // // // // // //       },
// // // // // // // // //       { responseType: "stream" } // Ensure response is streamed
// // // // // // // // //     );

// // // // // // // // //     console.log("✅ Kokoro TTS response received. Streaming audio...");

// // // // // // // // //     // Set appropriate headers for streaming audio
// // // // // // // // //     res.setHeader('Content-Type', 'audio/mp3');
// // // // // // // // //     res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
// // // // // // // // //     res.setHeader('Pragma', 'no-cache');
// // // // // // // // //     res.setHeader('Expires', '0');

// // // // // // // // //     // Pipe the audio stream directly to the client
// // // // // // // // //     response.data.pipe(res);

// // // // // // // // //   } catch (error: any) {
// // // // // // // // //     console.error("❌ Kokoro TTS Error:", error.message || error);
// // // // // // // // //     res.status(500).json({ error: "Kokoro TTS failed" });
// // // // // // // // //   }
// // // // // // // // // }



// // // // // // // // // import type { NextApiRequest, NextApiResponse } from 'next';
// // // // // // // // // import axios from 'axios';

// // // // // // // // // export default async function handler(req: NextApiRequest, res: NextApiResponse) {
// // // // // // // // //   if (req.method !== 'GET') {
// // // // // // // // //     return res.status(405).json({ error: 'Method not allowed. Use GET.' });
// // // // // // // // //   }

// // // // // // // // //   const { text, speaker, voice } = req.query; // Now expecting `voice` directly

// // // // // // // // //   if (!text || !speaker || !voice) {
// // // // // // // // //     return res.status(400).json({ error: "Missing text, speaker, or voice" });
// // // // // // // // //   }

// // // // // // // // //   try {
// // // // // // // // //     console.log(`🎤 Requesting TTS from Kokoro for speaker: ${speaker}, using voice: ${voice}`);

// // // // // // // // //     // Send request to Kokoro TTS API
// // // // // // // // //     const response = await axios.post(
// // // // // // // // //       "http://localhost:8880/v1/audio/speech",
// // // // // // // // //       {
// // // // // // // // //         model: "kokoro",
// // // // // // // // //         input: text as string,
// // // // // // // // //         voice: voice as string,  // Directly use `voice` from request
// // // // // // // // //         response_format: "mp3",
// // // // // // // // //         speed: 1,
// // // // // // // // //         stream: true,
// // // // // // // // //         return_download_link: false
// // // // // // // // //       },
// // // // // // // // //       { responseType: "stream" } // Ensure response is streamed
// // // // // // // // //     );

// // // // // // // // //     console.log("✅ Kokoro TTS response received. Streaming audio...");

// // // // // // // // //     // Set appropriate headers for streaming audio
// // // // // // // // //     res.setHeader('Content-Type', 'audio/mp3');
// // // // // // // // //     res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
// // // // // // // // //     res.setHeader('Pragma', 'no-cache');
// // // // // // // // //     res.setHeader('Expires', '0');

// // // // // // // // //     // Pipe the audio stream directly to the client
// // // // // // // // //     response.data.pipe(res);
// // // // // // // // //   } catch (error: any) {
// // // // // // // // //     console.error("❌ Kokoro TTS Error:", error.message || error);
// // // // // // // // //     res.status(500).json({ error: "Kokoro TTS failed" });
// // // // // // // // //   }
// // // // // // // // // }



// // // // // // // // import type { NextApiRequest, NextApiResponse } from 'next';
// // // // // // // // import axios from 'axios';

// // // // // // // // export default async function handler(req: NextApiRequest, res: NextApiResponse) {
// // // // // // // //   if (req.method !== 'GET') {
// // // // // // // //     return res.status(405).json({ error: 'Method not allowed. Use GET.' });
// // // // // // // //   }

// // // // // // // //   const { text, speaker, voice } = req.query; // Expecting `voice`

// // // // // // // //   if (!text || !speaker || !voice) {
// // // // // // // //     return res.status(400).json({ error: "Missing text, speaker, or voice" });
// // // // // // // //   }

// // // // // // // //   try {
// // // // // // // //     console.log(`🎤 Requesting TTS from Kokoro for speaker: ${speaker}, using voice: ${voice}`);

// // // // // // // //     const response = await axios.post(
// // // // // // // //       "http://localhost:8880/v1/audio/speech",
// // // // // // // //       { model: "kokoro", input: text as string, voice: voice as string, response_format: "mp3", speed: 1, stream: true, return_download_link: false },
// // // // // // // //       { responseType: "stream" }
// // // // // // // //     );

// // // // // // // //     res.setHeader('Content-Type', 'audio/mp3');
// // // // // // // //     response.data.pipe(res);
// // // // // // // //   } catch (error) {
// // // // // // // //     console.error("❌ Kokoro TTS Error:", error);
// // // // // // // //     res.status(500).json({ error: "Kokoro TTS failed" });
// // // // // // // //   }
// // // // // // // // }



// // // // // // // import type { NextApiRequest, NextApiResponse } from "next";
// // // // // // // import axios from "axios";
// // // // // // // import { getVoiceForSpeaker } from "@/pages/api/getVoices"; // ✅ Import voice assignment

// // // // // // // export default async function handler(req: NextApiRequest, res: NextApiResponse) {
// // // // // // //   if (req.method !== "GET") {
// // // // // // //     return res.status(405).json({ error: "Method not allowed. Use GET." });
// // // // // // //   }

// // // // // // //   let { text, speaker, gender } = req.query;

// // // // // // //   if (!text || !speaker) {
// // // // // // //     return res.status(400).json({ error: "Missing text or speaker" });
// // // // // // //   }

// // // // // // //   try {
// // // // // // //     // ✅ Get assigned voice for the speaker
// // // // // // //     const voice = getVoiceForSpeaker(speaker as string, (gender as "MALE" | "FEMALE" | "UNKNOWN") || "UNKNOWN");

// // // // // // //     console.log(`🎤 Requesting TTS from Kokoro for speaker: ${speaker}, using voice: ${voice}`);

// // // // // // //     // ✅ Send request to Kokoro TTS API
// // // // // // //     const response = await axios.post(
// // // // // // //       "http://localhost:8880/v1/audio/speech",
// // // // // // //       {
// // // // // // //         model: "kokoro",
// // // // // // //         input: decodeURIComponent(text as string), // Ensure proper encoding
// // // // // // //         voice,
// // // // // // //         response_format: "mp3",
// // // // // // //         speed: 1,
// // // // // // //         stream: true,
// // // // // // //         return_download_link: false,
// // // // // // //       },
// // // // // // //       { responseType: "stream" }
// // // // // // //     );

// // // // // // //     // ✅ Set response headers for streaming
// // // // // // //     res.setHeader("Content-Type", "audio/mp3");
// // // // // // //     response.data.pipe(res);
// // // // // // //   } catch (error: any) {
// // // // // // //     console.error("❌ Kokoro TTS Error:", error.response?.data || error.message);
// // // // // // //     res.status(500).json({ error: "Kokoro TTS failed" });
// // // // // // //   }
// // // // // // // }



// // // // // // import type { NextApiRequest, NextApiResponse } from "next";
// // // // // // import axios from "axios";
// // // // // // import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
// // // // // // import { getVoiceForSpeaker } from "@/pages/api/getVoices";

// // // // // // // URLs for the two TTS engines (if Kokoro remains an HTTP API)
// // // // // // const KOKORO_TTS_URL = "http://localhost:8883/v1/audio/speech";

// // // // // // // Unified TTS endpoint: route the request based on the assigned voice’s source.
// // // // // // export default async function handler(req: NextApiRequest, res: NextApiResponse) {
// // // // // //   if (req.method !== "GET") {
// // // // // //     return res.status(405).json({ error: "Method not allowed. Use GET." });
// // // // // //   }

// // // // // //   // Expect text, speaker, and optionally gender in the query.
// // // // // //   const { text, speaker, gender } = req.query;
// // // // // //   if (!text || !speaker) {
// // // // // //     return res.status(400).json({ error: "Missing text or speaker" });
// // // // // //   }

// // // // // //   // Retrieve voice assignment.
// // // // // //   // (Assuming getVoiceForSpeaker returns an object: { voice: string, source: "predefined" | "generated" })
// // // // // //   const { voice, source } = getVoiceForSpeaker(
// // // // // //     speaker as string,
// // // // // //     (gender as "MALE" | "FEMALE" | "UNKNOWN") || "UNKNOWN"
// // // // // //   );

// // // // // //   console.log(
// // // // // //     `🎤 Requesting TTS for speaker: ${speaker}, using voice: ${voice} (source: ${source})`
// // // // // //   );

// // // // // //   // If the voice comes from the original pool (predefined), use Kokoro TTS.
// // // // // //   if (source === "predefined") {
// // // // // //     try {
// // // // // //       const response = await axios.post(
// // // // // //         KOKORO_TTS_URL,
// // // // // //         {
// // // // // //           model: "kokoro",
// // // // // //           input: decodeURIComponent(text as string),
// // // // // //           voice,
// // // // // //           response_format: "mp3",
// // // // // //           speed: 1,
// // // // // //           stream: true,
// // // // // //           return_download_link: false,
// // // // // //         },
// // // // // //         { responseType: "stream" }
// // // // // //       );
// // // // // //       res.setHeader("Content-Type", "audio/mp3");
// // // // // //       response.data.pipe(res);
// // // // // //       console.log("✅ Audio stream sent using Kokoro TTS.");
// // // // // //     } catch (error: any) {
// // // // // //       console.error("❌ Kokoro TTS Error:", error.response?.data || error.message);
// // // // // //       res.status(500).json({ error: "Kokoro TTS failed" });
// // // // // //     }
// // // // // //   } else {
// // // // // //     // Otherwise, if the voice is from the new msedge‑tts pool, use the msedge‑tts library.
// // // // // //     try {
// // // // // //       const tts = new MsEdgeTTS();
// // // // // //       await tts.setMetadata(voice, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);
// // // // // //       console.log(`✅ MsEdge TTS metadata set. Sending request for text: "${text}"`);
// // // // // //       const { audioStream } = tts.toStream(text as string);

// // // // // //       // Set headers for streaming audio (using msedge‑tts, we assume WebM format).
// // // // // //       res.setHeader("Content-Type", "audio/webm");
// // // // // //       res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
// // // // // //       res.setHeader("Pragma", "no-cache");
// // // // // //       res.setHeader("Expires", "0");

// // // // // //       audioStream.pipe(res);
// // // // // //       console.log("✅ Audio stream sent using MsEdgeTTS.");
// // // // // //     } catch (error: any) {
// // // // // //       console.error("❌ MsEdge TTS Error:", error.response?.data || error.message);
// // // // // //       res.status(500).json({ error: "MsEdge TTS failed" });
// // // // // //     }
// // // // // //   }
// // // // // // }







// // // // // import type { NextApiRequest, NextApiResponse } from "next";
// // // // // import axios from "axios";
// // // // // import { getVoiceForSpeaker } from "@/pages/api/getVoices";
// // // // // import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// // // // // // Kokoro API URL (ensure this is correct for your deployment)
// // // // // const KOKORO_TTS_URL = "https://ec7c-2402-a00-173-1166-21f5-abee-82e5-900e.ngrok-free.app/v1/audio/speech";

// // // // // export default async function handler(req: NextApiRequest, res: NextApiResponse) {
// // // // //   if (req.method !== "POST") {
// // // // //     return res.status(405).json({ error: "Method not allowed. Use POST." });
// // // // //   }

// // // // //   // Extract text, speaker, and optionally gender from the request body.
// // // // //   const { text, speaker, gender } = req.body;
// // // // //   if (!text || !speaker) {
// // // // //     return res.status(400).json({ error: "Missing text or speaker" });
// // // // //   }

// // // // //   // Retrieve the voice assignment using the new client‑side logic.
// // // // //   const voiceAssignment = getVoiceForSpeaker(
// // // // //     speaker as string,
// // // // //     (gender as "MALE" | "FEMALE")
// // // // //   );

// // // // //   // Fallback to a default narrator voice if no assignment is returned.
// // // // //   const finalVoice = voiceAssignment ? voiceAssignment.voice : "bm_george";

// // // // //   console.log(
// // // // //     `🎤 Requesting TTS for speaker: ${speaker}, using voice: ${finalVoice} (source: ${voiceAssignment ? voiceAssignment.source : "fallback"})`
// // // // //   );

// // // // //   // If the voice assignment indicates "predefined" or if no assignment was found, route to Kokoro TTS.
// // // // //   if (voiceAssignment?.source === "predefined" || !voiceAssignment) {
// // // // //     console.log("🚀 Sending request to Kokoro API...");
// // // // //     try {
// // // // //       const response = await axios.post(
// // // // //         KOKORO_TTS_URL,
// // // // //         {
// // // // //           model: "kokoro",
// // // // //           input: decodeURIComponent(text as string),
// // // // //           voice: finalVoice, // use the key "voice" as expected by your API
// // // // //           response_format: "mp3",
// // // // //           speed: 1,
// // // // //           stream: true,
// // // // //           return_download_link: false,
// // // // //         },
// // // // //         { responseType: "stream" }
// // // // //       );

// // // // //       res.setHeader("Content-Type", "audio/mp3");
// // // // //       response.data.pipe(res);
// // // // //       console.log("✅ Audio stream sent using Kokoro TTS.");
// // // // //     } catch (error: any) {
// // // // //       console.error("❌ Kokoro TTS Error:", error.response?.data || error.message);
// // // // //       res.status(500).json({ error: "Kokoro TTS failed", details: error.message });
// // // // //     }
// // // // //   } else {
// // // // //     // Otherwise, route to MsEdge TTS.
// // // // //     console.log("🔄 Routing to MsEdge-TTS...");
// // // // //     try {
// // // // //       const tts = new MsEdgeTTS();
// // // // //       await tts.setMetadata(finalVoice, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);
// // // // //       console.log(`✅ MsEdge TTS metadata set. Sending request for text: "${text}"`);
// // // // //       const { audioStream } = tts.toStream(text as string);

// // // // //       res.setHeader("Content-Type", "audio/webm");
// // // // //       res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
// // // // //       res.setHeader("Pragma", "no-cache");
// // // // //       res.setHeader("Expires", "0");

// // // // //       audioStream.pipe(res);
// // // // //       console.log("✅ Audio stream sent using MsEdgeTTS.");
// // // // //     } catch (error: any) {
// // // // //       console.error("❌ MsEdge TTS Error:", error.response?.data || error.message);
// // // // //       res.status(500).json({ error: "MsEdge TTS failed" });
// // // // //     }
// // // // //   }
// // // // // }











































// // // // // // // // // import type { NextApiRequest, NextApiResponse } from 'next';
// // // // // // // // // import axios from 'axios';

// // // // // // // // // // Updated Speaker-to-Voice Mapping with High-Quality Voices (for remapping if needed)
// // // // // // // // // const speakerVoiceMap: { [key: string]: { male: string; female: string } } = {
// // // // // // // // //   "Narrator": { male: "am_michael", female: "af_heart" },
// // // // // // // // //   "Speaker 1": { male: "bm_george", female: "af_bella" },
// // // // // // // // //   "Speaker 2": { male: "am_adam", female: "af_nicole" },
// // // // // // // // //   "Speaker 3": { male: "am_gurney", female: "af_sarah" },
// // // // // // // // //   "Speaker 4": { male: "bm_lewis", female: "af_sky" },
// // // // // // // // // };

// // // // // // // // // // Function to determine the correct voice based on speaker and gender
// // // // // // // // // const getVoiceForSpeaker = (speaker: string, gender: string): string => {
// // // // // // // // //   // Default narrator voices
// // // // // // // // //   const defaultMaleVoice = "am_michael";
// // // // // // // // //   const defaultFemaleVoice = "af_heart";

// // // // // // // // //   // Ensure gender is valid, defaulting to male if unknown
// // // // // // // // //   if (gender !== "MALE" && gender !== "FEMALE") {
// // // // // // // // //     console.warn(`⚠️ Unknown gender '${gender}' for speaker '${speaker}', using default male narrator voice.`);
// // // // // // // // //     return defaultMaleVoice;
// // // // // // // // //   }

// // // // // // // // //   // Check if the speaker exists in speakerVoiceMap and return the corresponding voice
// // // // // // // // //   return speakerVoiceMap[speaker]?.[gender === "MALE" ? "male" : "female"] ||
// // // // // // // // //          (gender === "MALE" ? defaultMaleVoice : defaultFemaleVoice);
// // // // // // // // // };


// // // // // // // // // export default async function handler(req: NextApiRequest, res: NextApiResponse) {
// // // // // // // // //   if (req.method !== 'GET') {
// // // // // // // // //     return res.status(405).json({ error: 'Method not allowed. Use GET.' });
// // // // // // // // //   }

// // // // // // // // //   const { text, speaker, gender } = req.query;

// // // // // // // // //   if (!text || !speaker || !gender) {
// // // // // // // // //     return res.status(400).json({ error: "Missing text, speaker, or gender" });
// // // // // // // // //   }

// // // // // // // // //   const selectedVoice = getVoiceForSpeaker(speaker as string, gender as string);

// // // // // // // // //   try {
// // // // // // // // //     console.log(`🎤 Requesting TTS from Kokoro for speaker: ${speaker}, Gender: ${gender}, using voice: ${selectedVoice}`);

// // // // // // // // //     // Send request to Kokoro TTS API
// // // // // // // // //     const response = await axios.post(
// // // // // // // // //       "http://localhost:8880/v1/audio/speech",
// // // // // // // // //       {
// // // // // // // // //         model: "kokoro",           // Required: Use Kokoro model
// // // // // // // // //         input: text as string,     // Text to convert into speech
// // // // // // // // //         voice: selectedVoice,      // Assigned voice based on speaker and gender
// // // // // // // // //         response_format: "mp3",    // Output format
// // // // // // // // //         speed: 1,                  // Adjust speaking speed (1 = normal)
// // // // // // // // //         stream: true,              // Enable streaming
// // // // // // // // //         return_download_link: false // We will stream directly, no download link
// // // // // // // // //       },
// // // // // // // // //       { responseType: "stream" } // Ensure response is streamed
// // // // // // // // //     );

// // // // // // // // //     console.log("✅ Kokoro TTS response received. Streaming audio...");

// // // // // // // // //     // Set appropriate headers for streaming audio
// // // // // // // // //     res.setHeader('Content-Type', 'audio/mp3');
// // // // // // // // //     res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
// // // // // // // // //     res.setHeader('Pragma', 'no-cache');
// // // // // // // // //     res.setHeader('Expires', '0');

// // // // // // // // //     // Pipe the audio stream directly to the client
// // // // // // // // //     response.data.pipe(res);

// // // // // // // // //   } catch (error: any) {
// // // // // // // // //     console.error("❌ Kokoro TTS Error:", error.message || error);
// // // // // // // // //     res.status(500).json({ error: "Kokoro TTS failed" });
// // // // // // // // //   }
// // // // // // // // // }



// // // // // // // // // import type { NextApiRequest, NextApiResponse } from 'next';
// // // // // // // // // import axios from 'axios';

// // // // // // // // // // Updated Speaker-to-Voice Mapping with High-Quality Voices (for remapping if needed)
// // // // // // // // // const speakerVoiceMap: { [key: string]: { male: string; female: string } } = {
// // // // // // // // //   "Narrator": { male: "am_michael", female: "af_heart" },
// // // // // // // // //   "Speaker 1": { male: "bm_george", female: "af_bella" },
// // // // // // // // //   "Speaker 2": { male: "am_adam", female: "af_nicole" },
// // // // // // // // //   "Speaker 3": { male: "am_gurney", female: "af_sarah" },
// // // // // // // // //   "Speaker 4": { male: "bm_lewis", female: "af_sky" },
// // // // // // // // // };

// // // // // // // // // // Function to determine the correct voice based on speaker and gender
// // // // // // // // // const getVoiceForSpeaker = (speaker: string, gender: string): string => {
// // // // // // // // //   const defaultVoice = "af"; // Default fallback voice

// // // // // // // // //   // Ensure the gender is either MALE or FEMALE, otherwise default
// // // // // // // // //   if (gender !== "MALE" && gender !== "FEMALE") {
// // // // // // // // //     console.warn(`⚠️ Unknown gender '${gender}' for speaker '${speaker}', using default voice.`);
// // // // // // // // //     return defaultVoice;
// // // // // // // // //   }

// // // // // // // // //   // If the speaker is in our mapping, return the appropriate voice, else default
// // // // // // // // //   return speakerVoiceMap[speaker]?.[gender.toLowerCase() as "male" | "female"] || defaultVoice;
// // // // // // // // // };

// // // // // // // // // export default async function handler(req: NextApiRequest, res: NextApiResponse) {
// // // // // // // // //   if (req.method !== 'GET') {
// // // // // // // // //     return res.status(405).json({ error: 'Method not allowed. Use GET.' });
// // // // // // // // //   }

// // // // // // // // //   const { text, speaker, gender } = req.query;

// // // // // // // // //   if (!text || !speaker || !gender) {
// // // // // // // // //     return res.status(400).json({ error: "Missing text, speaker, or gender" });
// // // // // // // // //   }

// // // // // // // // //   const selectedVoice = getVoiceForSpeaker(speaker as string, gender as string);

// // // // // // // // //   try {
// // // // // // // // //     console.log(`🎤 Requesting TTS from Kokoro for speaker: ${speaker}, Gender: ${gender}, using voice: ${selectedVoice}`);

// // // // // // // // //     // Send request to Kokoro TTS API
// // // // // // // // //     const response = await axios.post(
// // // // // // // // //       "http://localhost:8880/v1/audio/speech",
// // // // // // // // //       {
// // // // // // // // //         model: "kokoro",           // Required: Use Kokoro model
// // // // // // // // //         input: text as string,     // Text to convert into speech
// // // // // // // // //         voice: selectedVoice,      // Assigned voice based on speaker and gender
// // // // // // // // //         response_format: "mp3",    // Output format
// // // // // // // // //         speed: 1,                  // Adjust speaking speed (1 = normal)
// // // // // // // // //         stream: true,              // Enable streaming
// // // // // // // // //         return_download_link: false // We will stream directly, no download link
// // // // // // // // //       },
// // // // // // // // //       { responseType: "stream" } // Ensure response is streamed
// // // // // // // // //     );

// // // // // // // // //     console.log("✅ Kokoro TTS response received. Streaming audio...");

// // // // // // // // //     // Set appropriate headers for streaming audio
// // // // // // // // //     res.setHeader('Content-Type', 'audio/mp3');
// // // // // // // // //     res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
// // // // // // // // //     res.setHeader('Pragma', 'no-cache');
// // // // // // // // //     res.setHeader('Expires', '0');

// // // // // // // // //     // Pipe the audio stream directly to the client
// // // // // // // // //     response.data.pipe(res);

// // // // // // // // //   } catch (error: any) {
// // // // // // // // //     console.error("❌ Kokoro TTS Error:", error.message || error);
// // // // // // // // //     res.status(500).json({ error: "Kokoro TTS failed" });
// // // // // // // // //   }
// // // // // // // // // }






// // // // import type { NextApiRequest, NextApiResponse } from "next";
// // // // import axios from "axios";
// // // // import { getVoiceForSpeaker } from "@/pages/api/getVoices";
// // // // import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// // // // // Kokoro API URL (ensure this is correct)
// // // // const KOKORO_TTS_URL = "https://ruling-thrush-robust.ngrok-free.app/v1/audio/speech";

// // // // // In-memory voice mapping for the server.
// // // // // In your TTS file
// // // // import type { VoiceAssignment } from "@/pages/api/getVoices"; // Ensure the path is correct

// // // // // Use VoiceAssignment for typing the in-memory mapping:
// // // // let serverVoiceAssignments: { [key: string]: VoiceAssignment } = {};

// // // // // Helper function to merge client voice mapping into the server mapping:
// // // // const mergeClientMapping = (clientMapping: { [key: string]: VoiceAssignment }) => {
// // // //   serverVoiceAssignments = { ...serverVoiceAssignments, ...clientMapping };
// // // // };


// // // // export default async function handler(req: NextApiRequest, res: NextApiResponse) {
// // // //   if (req.method !== "POST") {
// // // //     return res.status(405).json({ error: "Method not allowed. Use POST." });
// // // //   }

// // // //   const { text, speaker, gender, voiceMapping } = req.body;
// // // //   if (!text || !speaker) {
// // // //     return res.status(400).json({ error: "Missing text or speaker" });
// // // //   }

// // // //   // Merge the client's mapping into the server's in‑memory mapping.
// // // //   if (voiceMapping) {
// // // //     mergeClientMapping(voiceMapping);
// // // //   }

// // // //   // Now call getVoiceForSpeaker. Note: This function should use the serverVoiceAssignments.
// // // //   // One simple solution is to temporarily override the server's in‑memory mapping with our merged mapping.
// // // //   // For demonstration, assume getVoiceForSpeaker (server version) reads and updates serverVoiceAssignments.
// // // //   const voiceAssignment = getVoiceForSpeaker(speaker, gender as "MALE" | "FEMALE");
// // // //   const finalVoice = voiceAssignment ? voiceAssignment.voice : "bm_george";

// // // //   console.log(
// // // //     `🎤 Requesting TTS for speaker: ${speaker}, using voice: ${finalVoice} (source: ${voiceAssignment ? voiceAssignment.source : "fallback"})`
// // // //   );

// // // //   if (voiceAssignment?.source === "predefined" || !voiceAssignment) {
// // // //     try {
// // // //           // Optionally log text to see if it's URI-encoded
// // // //       console.log("Sending text:", text);
// // // //       const response = await axios.post(
// // // //         KOKORO_TTS_URL,
// // // //         {
// // // //           model: "kokoro",
// // // //           input: text,
// // // //           voice: finalVoice,
// // // //           response_format: "mp3",
// // // //           speed: 1,
// // // //           stream: true,
// // // //           return_download_link: false,
// // // //         },
// // // //         { 
// // // //           responseType: "stream",
// // // //           // timeout: 60000  // Set timeout to 60 seconds, adjust as needed

// // // //          }
// // // //       );

// // // //       res.setHeader("Content-Type", "audio/mp3");
// // // //       response.data.pipe(res);
// // // //     } catch (error: any) {
// // // //       console.error("❌ Kokoro TTS Error:", error.response?.data || error.message);
// // // //       res.status(500).json({ error: "Kokoro TTS failed", details: error.message });
// // // //     }
// // // //   } else {
// // // //     try {
// // // //       const tts = new MsEdgeTTS();
// // // //       await tts.setMetadata(finalVoice, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS, );
// // // //       const { audioStream } = tts.toStream(text);
// // // //       res.setHeader("Content-Type", "audio/webm");
// // // //       res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
// // // //       res.setHeader("Pragma", "no-cache");
// // // //       res.setHeader("Expires", "0");
// // // //       audioStream.pipe(res);
// // // //     } catch (error: any) {
// // // //       console.error("❌ MsEdge TTS Error:", error.response?.data || error.message);
// // // //       res.status(500).json({ error: "MsEdge TTS failed" });
// // // //     }
// // // //   }
// // // // }



// import type { NextApiRequest, NextApiResponse } from "next";
// import axios from "axios";
// import { getVoiceForSpeaker } from "../services/getVoices";
// import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// // Kokoro API URL (ensure this is correct)
// // const KOKORO_TTS_URL = "https://ruling-thrush-robust.ngrok-free.app/v1/audio/speech";


// const KOKORO_TTS_URL = "https://wwtuovvoht.a.pinggy.link/v2/speech";

// // const highQualityNarratorVoice = "en-US-BrianMultilingualNeural";

// // In-memory voice mapping for the server.
// import type { VoiceAssignment } from "../services/getVoices"; // Ensure the path is correct

// let serverVoiceAssignments: { [key: string]: VoiceAssignment } = {};

// // Helper function to merge client voice mapping into the server mapping:
// const mergeClientMapping = (clientMapping: { [key: string]: VoiceAssignment }) => {
//   serverVoiceAssignments = { ...serverVoiceAssignments, ...clientMapping };
// };

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed. Use POST." });
//   }

//   const { text, speaker, gender, voiceMapping } = req.body;
//   if (!text || !speaker) {
//     return res.status(400).json({ error: "Missing text or speaker" });
//   }

//   // Merge the client's mapping into the server's in‑memory mapping.
//   if (voiceMapping) {
//     mergeClientMapping(voiceMapping);
//   }

//   // Get the voice assignment.
//   const voiceAssignment = getVoiceForSpeaker(speaker, gender as "MALE" | "FEMALE");
//   // Default to "bm_george" if no assignment is found.
//   let finalVoice = voiceAssignment ? voiceAssignment.voice : "bm_george";

//   // Override for narrator: permanently use the MS Edge voice "en-US-BrianMultilingualNeural".
//   if (speaker.trim().toLowerCase() === "narrator") {
//     finalVoice = "bm_george";
//   }

//   console.log(
//     `🎤 Requesting TTS for speaker: ${speaker}, using voice: ${finalVoice} (source: ${voiceAssignment ? voiceAssignment.source : "fallback"})`
//   );

//   if (voiceAssignment?.source === "predefined" || !voiceAssignment) {
//     try {
//       console.log("Sending text:", text);
//       const response = await axios.post(
//         KOKORO_TTS_URL,
//         {
//           model: "kokoro",
//           input: text,
//           voice: finalVoice,
//           response_format: "wav",
//           speed: 1,
//           stream: true,
//           return_download_link: false,
//         },
//         { 
//           responseType: "stream",
//           // timeout: 60000  // Set timeout to 60 seconds, adjust as needed
//         }
//       );

//       res.setHeader("Content-Type", "audio/wav");
//       response.data.pipe(res);
//     } catch (error: any) {
//       console.error("❌ Kokoro TTS Error:", error.response?.data || error.message);
//       res.status(500).json({ error: "Kokoro TTS failed", details: error.message });
//     }
//   } else {
//     try {
//       const tts = new MsEdgeTTS();
//       await tts.setMetadata(finalVoice, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);
//       const { audioStream } = tts.toStream(text);
//       res.setHeader("Content-Type", "audio/webm");
//       res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
//       res.setHeader("Pragma", "no-cache");
//       res.setHeader("Expires", "0");
//       audioStream.pipe(res);
//     } catch (error: any) {
//       console.error("❌ MsEdge TTS Error:", error.response?.data || error.message);
//       res.status(500).json({ error: "MsEdge TTS failed" });
//     }
//   }
// }



import axios from 'axios';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { getVoiceForSpeaker } from './getVoices';

// Kokoro API URL 
const KOKORO_TTS_URL = "https://wwtuovvoht.a.pinggy.link/v2/speech";

// In-memory voice mapping for the client
let clientVoiceAssignments: { [key: string]: VoiceAssignment } = {};

export interface VoiceAssignment {
  voice: string;
  source: 'predefined' | 'generated';
}

export interface TTSOptions {
  text: string;
  speaker: string;
  gender: 'MALE' | 'FEMALE';
  voiceMapping?: { [key: string]: VoiceAssignment };
}

// Merge client voice mapping
const mergeClientMapping = (clientMapping: { [key: string]: VoiceAssignment }) => {
  clientVoiceAssignments = { ...clientVoiceAssignments, ...clientMapping };
};

export async function generateTTS(options: TTSOptions): Promise<Blob> {
  const { text, speaker, gender, voiceMapping } = options;

  if (!text || !speaker) {
    throw new Error("Missing text or speaker");
  }

  // Merge the client's mapping 
  if (voiceMapping) {
    mergeClientMapping(voiceMapping);
  }

  // Get the voice assignment
  const voiceAssignment = getVoiceForSpeaker(speaker, gender);
  // Default to "bm_george" if no assignment is found
  let finalVoice = voiceAssignment ? voiceAssignment.voice : "bm_george";

  // Override for narrator
  if (speaker.trim().toLowerCase() === "narrator") {
    finalVoice = "bm_george";
  }

  console.log(
    `🎤 Requesting TTS for speaker: ${speaker}, using voice: ${finalVoice} (source: ${voiceAssignment ? voiceAssignment.source : "fallback"})`
  );

  if (voiceAssignment?.source === "predefined" || !voiceAssignment) {
    try {
      const response = await axios.post(
        KOKORO_TTS_URL,
        {
          model: "kokoro",
          input: text,
          voice: finalVoice,
          response_format: "wav",
          speed: 1,
          stream: true,
          return_download_link: false,
        },
        { 
          responseType: "blob",
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("❌ Kokoro TTS Error:", error.response?.data || error.message);
      throw new Error("Kokoro TTS failed");
    }
  } else {
    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(finalVoice, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);
      
      // For client-side, we'll need to handle streaming differently
      return new Promise((resolve, reject) => {
        const { audioStream } = tts.toStream(text);
        const chunks: Uint8Array[] = [];

        audioStream.on('data', (chunk) => {
          chunks.push(chunk);
        });

        audioStream.on('end', () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          resolve(blob);
        });

        audioStream.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error: any) {
      console.error("❌ MsEdge TTS Error:", error.response?.data || error.message);
      throw new Error("MsEdge TTS failed");
    }
  }
}

