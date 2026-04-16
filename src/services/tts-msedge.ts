// import type { NextApiRequest, NextApiResponse } from 'next';
// import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// // Speaker-to-Voice Mapping
// const speakerVoiceMap: { [key: string]: string } = {
//   "Narrator": "en-US-AndrewNeural",
//   "Speaker 1": "en-US-BrianMultilingualNeural",
//   "Speaker 2": "en-US-SteffanNeural",
//   "Speaker 3": "en-US-BrianMultilingualNeural",
//   "Speaker 4": "en-US-RogerNeural",
// };

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== 'GET') {
//     return res.status(405).json({ error: 'Method not allowed. Use GET.' });
//   }

//   const { text, speaker } = req.query;
//   if (!text || !speaker) {
//     return res.status(400).json({ error: 'Missing text or speaker' });
//   }

//   // Map the provided speaker to a voice; default if not found.
//   const voice = speakerVoiceMap[speaker as string] || "en-US-AndrewNeural";

//   try {
//     console.log(`🎤 Generating audio for speaker: ${speaker}, using voice: ${voice}`);

//     // Initialize the MsEdgeTTS instance.
//     const tts = new MsEdgeTTS();
//     // Set metadata with the chosen voice and desired output format.
//     await tts.setMetadata(voice, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);

//     console.log(`✅ TTS metadata set. Sending request for text: "${text}"`);

//     // Generate the audio stream.
//     const { audioStream } = tts.toStream(text as string);

//     // Set headers to stream audio (WebM format in this example).
//     res.setHeader('Content-Type', 'audio/webm');
//     res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
//     res.setHeader('Pragma', 'no-cache');
//     res.setHeader('Expires', '0');

//     // Pipe the generated audio stream directly to the response.
//     audioStream.pipe(res);

//     console.log("✅ Audio stream sent.");
//   } catch (error: any) {
//     console.error("❌ TTS Error:", error.message || error);
//     res.status(500).json({ error: "TTS failed" });
//   }
// }


// import type { NextApiRequest, NextApiResponse } from "next";
// import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== "GET") {
//     return res.status(405).json({ error: "Method not allowed. Use GET." });
//   }

//   // Expect text, speaker, and optionally gender in the query.
//   const { text, speaker, gender } = req.query;
//   if (!text || !speaker) {
//     return res.status(400).json({ error: "Missing text or speaker" });
//   }

//   // Get the assigned voice using getVoiceForSpeaker.
//   // This function will return a voice string from the original pool if available,
//   // or from the new msedge-tts voices if the original list is exhausted.
//   const voice = getVoiceForSpeaker(
//     speaker as string,
//     (gender as "MALE" | "FEMALE" | "UNKNOWN") || "UNKNOWN"
//   );

//   try {
//     console.log(`🎤 Generating audio (msedge) for speaker: ${speaker}, using voice: ${voice}`);

//     const tts = new MsEdgeTTS();
//     await tts.setMetadata(voice, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);
//     console.log(`✅ TTS metadata set. Sending request for text: "${text}"`);

//     const { audioStream } = tts.toStream(text as string);

//     // Set headers for streaming audio (WebM format)
//     res.setHeader("Content-Type", "audio/webm");
//     res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
//     res.setHeader("Pragma", "no-cache");
//     res.setHeader("Expires", "0");

//     audioStream.pipe(res);
//     console.log("✅ Audio stream sent.");
//   } catch (error: any) {
//     console.error("❌ TTS Error (msedge):", error.response?.data || error.message);
//     res.status(500).json({ error: "TTS failed" });
//   }
// }

