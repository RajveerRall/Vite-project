// // // // // // // // // // // // // // import fs from "fs";
// // // // // // // // // // // // // // import path from "path";

// // // // // // // // // // // // // // const VOICE_STORAGE_PATH = path.join(process.cwd(), "data", "speakerVoices.json");

// // // // // // // // // // // // // // // 🔹 High-Quality Narrator Voice
// // // // // // // // // // // // // // const highQualityNarratorVoice = "am_gurney";

// // // // // // // // // // // // // // // 🔹 Voice Selection for Speakers
// // // // // // // // // // // // // // const maleVoices = ["am_michael", "am_adam", "bm_george", "bm_lewis"];
// // // // // // // // // // // // // // const femaleVoices = ["af_heart", "af_bella", "af_nicole", "af_sarah"];

// // // // // // // // // // // // // // let maleCounter = 0;
// // // // // // // // // // // // // // let femaleCounter = 0;

// // // // // // // // // // // // // // const loadVoices = (): { [key: string]: string } => {
// // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // //     if (fs.existsSync(VOICE_STORAGE_PATH)) {
// // // // // // // // // // // // // //       return JSON.parse(fs.readFileSync(VOICE_STORAGE_PATH, "utf-8"));
// // // // // // // // // // // // // //     }
// // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // //     console.error("⚠️ Error loading voices:", error);
// // // // // // // // // // // // // //   }
// // // // // // // // // // // // // //   return {};
// // // // // // // // // // // // // // };

// // // // // // // // // // // // // // const saveVoices = (voices: { [key: string]: string }) => {
// // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // //     fs.writeFileSync(VOICE_STORAGE_PATH, JSON.stringify(voices, null, 2), "utf-8");
// // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // //     console.error("⚠️ Error saving voices:", error);
// // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // };

// // // // // // // // // // // // // // // 🔹 Get Voice for a Speaker
// // // // // // // // // // // // // // export const getVoiceForSpeaker = (speaker: string, gender: "MALE" | "FEMALE" | "UNKNOWN"): string => {
// // // // // // // // // // // // // //   const assignedVoices = loadVoices();

// // // // // // // // // // // // // //   if (assignedVoices[speaker]) {
// // // // // // // // // // // // // //     return assignedVoices[speaker];
// // // // // // // // // // // // // //   }

// // // // // // // // // // // // // //   let selectedVoice;
// // // // // // // // // // // // // //   if (gender === "MALE") {
// // // // // // // // // // // // // //     selectedVoice = maleVoices[maleCounter % maleVoices.length];
// // // // // // // // // // // // // //     maleCounter++;
// // // // // // // // // // // // // //   } else if (gender === "FEMALE") {
// // // // // // // // // // // // // //     selectedVoice = femaleVoices[femaleCounter % femaleVoices.length];
// // // // // // // // // // // // // //     femaleCounter++;
// // // // // // // // // // // // // //   } else {
// // // // // // // // // // // // // //     console.warn(`⚠️ No gender detected for '${speaker}'. Assigning a fallback voice.`);
// // // // // // // // // // // // // //     selectedVoice = maleVoices[maleCounter % maleVoices.length];
// // // // // // // // // // // // // //     maleCounter++;
// // // // // // // // // // // // // //   }

// // // // // // // // // // // // // //   assignedVoices[speaker] = selectedVoice;
// // // // // // // // // // // // // //   saveVoices(assignedVoices);
// // // // // // // // // // // // // //   return selectedVoice;
// // // // // // // // // // // // // // };


// // // // // // // // // // // // // // import fs from "fs";
// // // // // // // // // // // // // // import path from "path";

// // // // // // // // // // // // // // const VOICE_STORAGE_PATH = path.join(process.cwd(), "data", "speakerVoices.json");

// // // // // // // // // // // // // // // 🔹 High-Quality Narrator Voice
// // // // // // // // // // // // // // const highQualityNarratorVoice = "am_gurney";

// // // // // // // // // // // // // // // 🔹 Voice Selection for Speakers
// // // // // // // // // // // // // // const maleVoices = ["am_michael", "am_adam", "bm_george", "bm_lewis"];
// // // // // // // // // // // // // // const femaleVoices = ["af_heart", "af_bella", "af_nicole", "af_sarah"];

// // // // // // // // // // // // // // let maleCounter = 0;
// // // // // // // // // // // // // // let femaleCounter = 0;

// // // // // // // // // // // // // // type SpeakerVoices = Record<string, string>;

// // // // // // // // // // // // // // let assignedVoices: SpeakerVoices | null = null;

// // // // // // // // // // // // // // /**
// // // // // // // // // // // // // //  * Load stored voices from the file system (singleton pattern)
// // // // // // // // // // // // // //  */
// // // // // // // // // // // // // // const loadVoices = (): SpeakerVoices => {
// // // // // // // // // // // // // //   if (assignedVoices) return assignedVoices;

// // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // //     if (fs.existsSync(VOICE_STORAGE_PATH)) {
// // // // // // // // // // // // // //       const data = fs.readFileSync(VOICE_STORAGE_PATH, "utf-8");
// // // // // // // // // // // // // //       assignedVoices = JSON.parse(data) as SpeakerVoices;
// // // // // // // // // // // // // //     } else {
// // // // // // // // // // // // // //       assignedVoices = {};
// // // // // // // // // // // // // //     }
// // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // //     console.error("⚠️ Error loading voices:", error);
// // // // // // // // // // // // // //     assignedVoices = {};
// // // // // // // // // // // // // //   }

// // // // // // // // // // // // // //   return assignedVoices;
// // // // // // // // // // // // // // };

// // // // // // // // // // // // // // /**
// // // // // // // // // // // // // //  * Save voices to file with atomic write to prevent corruption
// // // // // // // // // // // // // //  */
// // // // // // // // // // // // // // const saveVoices = (voices: SpeakerVoices) => {
// // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // //     const tempPath = `${VOICE_STORAGE_PATH}.tmp`;
// // // // // // // // // // // // // //     fs.writeFileSync(tempPath, JSON.stringify(voices, null, 2), "utf-8");
// // // // // // // // // // // // // //     fs.renameSync(tempPath, VOICE_STORAGE_PATH);
// // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // //     console.error("⚠️ Error saving voices:", error);
// // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // };

// // // // // // // // // // // // // // /**
// // // // // // // // // // // // // //  * Get a voice for a speaker, assigning one if not already stored.
// // // // // // // // // // // // // //  */
// // // // // // // // // // // // // // export const getVoiceForSpeaker = (speaker: string, gender: "MALE" | "FEMALE" | "UNKNOWN"): string => {
// // // // // // // // // // // // // //   const voices = loadVoices();

// // // // // // // // // // // // // //   if (voices[speaker]) {
// // // // // // // // // // // // // //     return voices[speaker];
// // // // // // // // // // // // // //   }

// // // // // // // // // // // // // //   let selectedVoice: string;

// // // // // // // // // // // // // //   switch (gender) {
// // // // // // // // // // // // // //     case "MALE":
// // // // // // // // // // // // // //       selectedVoice = maleVoices[maleCounter % maleVoices.length];
// // // // // // // // // // // // // //       maleCounter = (maleCounter + 1) % maleVoices.length;
// // // // // // // // // // // // // //       break;
// // // // // // // // // // // // // //     case "FEMALE":
// // // // // // // // // // // // // //       selectedVoice = femaleVoices[femaleCounter % femaleVoices.length];
// // // // // // // // // // // // // //       femaleCounter = (femaleCounter + 1) % femaleVoices.length;
// // // // // // // // // // // // // //       break;
// // // // // // // // // // // // // //     default:
// // // // // // // // // // // // // //       console.warn(`⚠️ No gender detected for '${speaker}'. Assigning a fallback voice.`);
// // // // // // // // // // // // // //       selectedVoice = maleVoices[maleCounter % maleVoices.length];
// // // // // // // // // // // // // //       maleCounter = (maleCounter + 1) % maleVoices.length;
// // // // // // // // // // // // // //   }

// // // // // // // // // // // // // //   voices[speaker] = selectedVoice;
// // // // // // // // // // // // // //   saveVoices(voices);
// // // // // // // // // // // // // //   return selectedVoice;
// // // // // // // // // // // // // // };


// // // // // // // // // // // // // import fs from "fs";
// // // // // // // // // // // // // import path from "path";

// // // // // // // // // // // // // const VOICE_STORAGE_PATH = path.join(process.cwd(), "data", "speakerVoices.json");

// // // // // // // // // // // // // // 🔹 High-Quality Narrator Voice
// // // // // // // // // // // // // const highQualityNarratorVoice = "am_gurney";

// // // // // // // // // // // // // // 🔹 Voice Selection for Speakers
// // // // // // // // // // // // // const maleVoices = ["am_michael", "am_adam", "bm_george", "bm_lewis"];
// // // // // // // // // // // // // const femaleVoices = ["bf_isabella", "af_bella", "af_nicole", "af_sarah"];

// // // // // // // // // // // // // let maleCounter = 0;
// // // // // // // // // // // // // let femaleCounter = 0;

// // // // // // // // // // // // // /**
// // // // // // // // // // // // //  * Ensures the data directory exists before saving files
// // // // // // // // // // // // //  */
// // // // // // // // // // // // // const ensureDirectoryExists = (filePath: string) => {
// // // // // // // // // // // // //   const dir = path.dirname(filePath);
// // // // // // // // // // // // //   if (!fs.existsSync(dir)) {
// // // // // // // // // // // // //     fs.mkdirSync(dir, { recursive: true });
// // // // // // // // // // // // //   }
// // // // // // // // // // // // // };

// // // // // // // // // // // // // /**
// // // // // // // // // // // // //  * Load saved voices from JSON file
// // // // // // // // // // // // //  */
// // // // // // // // // // // // // const loadVoices = (): { [key: string]: string } => {
// // // // // // // // // // // // //   try {
// // // // // // // // // // // // //     if (fs.existsSync(VOICE_STORAGE_PATH)) {
// // // // // // // // // // // // //       return JSON.parse(fs.readFileSync(VOICE_STORAGE_PATH, "utf-8"));
// // // // // // // // // // // // //     }
// // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // //     console.error("⚠️ Error loading voices:", error);
// // // // // // // // // // // // //   }
// // // // // // // // // // // // //   return {};
// // // // // // // // // // // // // };

// // // // // // // // // // // // // /**
// // // // // // // // // // // // //  * Save voice assignments to file
// // // // // // // // // // // // //  */
// // // // // // // // // // // // // const saveVoices = (voices: { [key: string]: string }) => {
// // // // // // // // // // // // //   try {
// // // // // // // // // // // // //     ensureDirectoryExists(VOICE_STORAGE_PATH);
// // // // // // // // // // // // //     fs.writeFileSync(VOICE_STORAGE_PATH, JSON.stringify(voices, null, 2), "utf-8");
// // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // //     console.error("⚠️ Error saving voices:", error);
// // // // // // // // // // // // //   }
// // // // // // // // // // // // // };

// // // // // // // // // // // // // /**
// // // // // // // // // // // // //  * Get a voice for a speaker based on gender.
// // // // // // // // // // // // //  */
// // // // // // // // // // // // // export const getVoiceForSpeaker = (speaker: string, gender: "MALE" | "FEMALE" | "UNKNOWN"): string => {
// // // // // // // // // // // // //   const assignedVoices = loadVoices();

// // // // // // // // // // // // //   // Return existing voice assignment if available
// // // // // // // // // // // // //   if (assignedVoices[speaker]) {
// // // // // // // // // // // // //     return assignedVoices[speaker];
// // // // // // // // // // // // //   }

// // // // // // // // // // // // //   let selectedVoice;
// // // // // // // // // // // // //   if (gender === "MALE") {
// // // // // // // // // // // // //     selectedVoice = maleVoices[maleCounter % maleVoices.length];
// // // // // // // // // // // // //     maleCounter++;
// // // // // // // // // // // // //   } else if (gender === "FEMALE") {
// // // // // // // // // // // // //     selectedVoice = femaleVoices[femaleCounter % femaleVoices.length];
// // // // // // // // // // // // //     femaleCounter++;
// // // // // // // // // // // // //   } else {
// // // // // // // // // // // // //     console.warn(`⚠️ No gender detected for '${speaker}'. Assigning the narrator's high-quality voice.`);
// // // // // // // // // // // // //     selectedVoice = highQualityNarratorVoice;
// // // // // // // // // // // // //   }

// // // // // // // // // // // // //   // Save the assigned voice
// // // // // // // // // // // // //   assignedVoices[speaker] = selectedVoice;
// // // // // // // // // // // // //   saveVoices(assignedVoices);

// // // // // // // // // // // // //   return selectedVoice;
// // // // // // // // // // // // // };



// // // // // // // // // // // // import fs from "fs";
// // // // // // // // // // // // import path from "path";

// // // // // // // // // // // // const VOICE_STORAGE_PATH = path.join(process.cwd(), "data", "speakerVoices.json");

// // // // // // // // // // // // // 🔹 High-Quality Narrator Voice
// // // // // // // // // // // // const highQualityNarratorVoice = "am_gurney";

// // // // // // // // // // // // // 🔹 Voice Selection for Speakers
// // // // // // // // // // // // const maleVoices = ["am_michael", "am_adam", "bm_george", "bm_lewis"];
// // // // // // // // // // // // const femaleVoices = ["bf_isabella", "af_bella", "af_nicole", "af_sarah"];

// // // // // // // // // // // // let maleCounter = 0;
// // // // // // // // // // // // let femaleCounter = 0;

// // // // // // // // // // // // /**
// // // // // // // // // // // //  * Ensures the data directory exists before saving files
// // // // // // // // // // // //  */
// // // // // // // // // // // // const ensureDirectoryExists = (filePath: string) => {
// // // // // // // // // // // //   const dir = path.dirname(filePath);
// // // // // // // // // // // //   if (!fs.existsSync(dir)) {
// // // // // // // // // // // //     fs.mkdirSync(dir, { recursive: true });
// // // // // // // // // // // //   }
// // // // // // // // // // // // };

// // // // // // // // // // // // /**
// // // // // // // // // // // //  * Load saved voices from JSON file
// // // // // // // // // // // //  */
// // // // // // // // // // // // const loadVoices = (): { [key: string]: string } => {
// // // // // // // // // // // //   try {
// // // // // // // // // // // //     if (fs.existsSync(VOICE_STORAGE_PATH)) {
// // // // // // // // // // // //       return JSON.parse(fs.readFileSync(VOICE_STORAGE_PATH, "utf-8"));
// // // // // // // // // // // //     }
// // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // //     console.error("⚠️ Error loading voices:", error);
// // // // // // // // // // // //   }
// // // // // // // // // // // //   return {};
// // // // // // // // // // // // };

// // // // // // // // // // // // /**
// // // // // // // // // // // //  * Save voice assignments to file
// // // // // // // // // // // //  */
// // // // // // // // // // // // const saveVoices = (voices: { [key: string]: string }) => {
// // // // // // // // // // // //   try {
// // // // // // // // // // // //     ensureDirectoryExists(VOICE_STORAGE_PATH);
// // // // // // // // // // // //     fs.writeFileSync(VOICE_STORAGE_PATH, JSON.stringify(voices, null, 2), "utf-8");
// // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // //     console.error("⚠️ Error saving voices:", error);
// // // // // // // // // // // //   }
// // // // // // // // // // // // };

// // // // // // // // // // // // /**
// // // // // // // // // // // //  * Get a voice for a speaker based on gender.
// // // // // // // // // // // //  */
// // // // // // // // // // // // export const getVoiceForSpeaker = (speaker: string, gender: "MALE" | "FEMALE" | "UNKNOWN"): string => {
// // // // // // // // // // // //   const assignedVoices = loadVoices();

// // // // // // // // // // // //   // Return existing voice assignment if available
// // // // // // // // // // // //   if (assignedVoices[speaker]) {
// // // // // // // // // // // //     return assignedVoices[speaker];
// // // // // // // // // // // //   }

// // // // // // // // // // // //   let selectedVoice;
// // // // // // // // // // // //   if (gender === "MALE") {
// // // // // // // // // // // //     selectedVoice = maleVoices[maleCounter % maleVoices.length];
// // // // // // // // // // // //     maleCounter++;
// // // // // // // // // // // //   } else if (gender === "FEMALE") {
// // // // // // // // // // // //     selectedVoice = femaleVoices[femaleCounter % femaleVoices.length];
// // // // // // // // // // // //     femaleCounter++;
// // // // // // // // // // // //   } else {
// // // // // // // // // // // //     console.warn(`⚠️ Unknown gender for '${speaker}'. Assigning random voice.`);
// // // // // // // // // // // //     selectedVoice = Math.random() > 0.5 ? maleVoices[maleCounter % maleVoices.length] : femaleVoices[femaleCounter % femaleVoices.length];
// // // // // // // // // // // //   }

// // // // // // // // // // // //   // Save the assigned voice
// // // // // // // // // // // //   assignedVoices[speaker] = selectedVoice;
// // // // // // // // // // // //   saveVoices(assignedVoices);

// // // // // // // // // // // //   return selectedVoice;
// // // // // // // // // // // // };


// // // // // // // // // // // import fs from "fs";
// // // // // // // // // // // import path from "path";

// // // // // // // // // // // const VOICE_STORAGE_PATH = path.join(process.cwd(), "data", "speakerVoices.json");

// // // // // // // // // // // // High-Quality Narrator Voice
// // // // // // // // // // // const highQualityNarratorVoice = "am_gurney";

// // // // // // // // // // // // Available Voices for Speakers
// // // // // // // // // // // const maleVoices = ["am_michael", "am_adam", "bm_george", "bm_lewis"];
// // // // // // // // // // // const femaleVoices = ["bf_isabella", "af_bella", "af_nicole", "af_sarah"];

// // // // // // // // // // // let maleCounter = 0;
// // // // // // // // // // // let femaleCounter = 0;

// // // // // // // // // // // /**
// // // // // // // // // // //  * Ensures the data directory exists before saving files
// // // // // // // // // // //  */
// // // // // // // // // // // const ensureDirectoryExists = (filePath: string) => {
// // // // // // // // // // //   const dir = path.dirname(filePath);
// // // // // // // // // // //   if (!fs.existsSync(dir)) {
// // // // // // // // // // //     fs.mkdirSync(dir, { recursive: true });
// // // // // // // // // // //   }
// // // // // // // // // // // };

// // // // // // // // // // // /**
// // // // // // // // // // //  * Load existing voice mappings from the JSON file
// // // // // // // // // // //  */
// // // // // // // // // // // const loadVoices = (): { [key: string]: string } => {
// // // // // // // // // // //   try {
// // // // // // // // // // //     if (fs.existsSync(VOICE_STORAGE_PATH)) {
// // // // // // // // // // //       return JSON.parse(fs.readFileSync(VOICE_STORAGE_PATH, "utf-8"));
// // // // // // // // // // //     }
// // // // // // // // // // //   } catch (error) {
// // // // // // // // // // //     console.error("⚠️ Error loading voice mappings:", error);
// // // // // // // // // // //   }
// // // // // // // // // // //   return {};
// // // // // // // // // // // };

// // // // // // // // // // // /**
// // // // // // // // // // //  * Save updated voice mappings to the JSON file
// // // // // // // // // // //  */
// // // // // // // // // // // const saveVoices = (voices: { [key: string]: string }) => {
// // // // // // // // // // //   try {
// // // // // // // // // // //     ensureDirectoryExists(VOICE_STORAGE_PATH);
// // // // // // // // // // //     fs.writeFileSync(VOICE_STORAGE_PATH, JSON.stringify(voices, null, 2), "utf-8");
// // // // // // // // // // //   } catch (error) {
// // // // // // // // // // //     console.error("⚠️ Error saving voice mappings:", error);
// // // // // // // // // // //   }
// // // // // // // // // // // };

// // // // // // // // // // // /**
// // // // // // // // // // //  * Assigns a consistent voice to a speaker based on their gender.
// // // // // // // // // // //  */
// // // // // // // // // // // export const getVoiceForSpeaker = (speaker: string, gender: "MALE" | "FEMALE" | "UNKNOWN"): string => {
// // // // // // // // // // //   const assignedVoices = loadVoices();

// // // // // // // // // // //   // ✅ Return existing voice assignment if available
// // // // // // // // // // //   if (assignedVoices[speaker]) {
// // // // // // // // // // //     return assignedVoices[speaker];
// // // // // // // // // // //   }

// // // // // // // // // // //   let selectedVoice;
// // // // // // // // // // //   if (gender === "MALE") {
// // // // // // // // // // //     selectedVoice = maleVoices[maleCounter % maleVoices.length];
// // // // // // // // // // //     maleCounter++;
// // // // // // // // // // //   } else if (gender === "FEMALE") {
// // // // // // // // // // //     selectedVoice = femaleVoices[femaleCounter % femaleVoices.length];
// // // // // // // // // // //     femaleCounter++;
// // // // // // // // // // //   } else {
// // // // // // // // // // //     console.warn(`⚠️ No gender detected for '${speaker}'. Assigning the narrator's voice.`);
// // // // // // // // // // //     selectedVoice = highQualityNarratorVoice;
// // // // // // // // // // //   }

// // // // // // // // // // //   // ✅ Save the assigned voice to maintain consistency
// // // // // // // // // // //   assignedVoices[speaker] = selectedVoice;
// // // // // // // // // // //   saveVoices(assignedVoices);

// // // // // // // // // // //   return selectedVoice;
// // // // // // // // // // // };

// // // // // // // // // // import fs from "fs";
// // // // // // // // // // import path from "path";

// // // // // // // // // // // Path to store voice assignments
// // // // // // // // // // const VOICE_STORAGE_PATH = path.join(process.cwd(), "data", "speakerVoices.json");

// // // // // // // // // // // High-quality narrator voice
// // // // // // // // // // const highQualityNarratorVoice = "am_gurney";

// // // // // // // // // // // Predefined voice arrays (from your original TTS implementations)
// // // // // // // // // // const maleVoices: string[] = ["am_michael", "am_adam", "bm_george", "bm_lewis"];
// // // // // // // // // // const femaleVoices: string[] = ["bf_isabella", "af_bella", "af_nicole", "af_sarah"];

// // // // // // // // // // // Counters to rotate through the predefined voices
// // // // // // // // // // let maleCounter = 0;
// // // // // // // // // // let femaleCounter = 0;

// // // // // // // // // // // Define the structure of a voice assignment.
// // // // // // // // // // interface VoiceAssignment {
// // // // // // // // // //   voice: string;
// // // // // // // // // //   source: "predefined" | "generated";
// // // // // // // // // // }

// // // // // // // // // // /**
// // // // // // // // // //  * Ensures that the directory for the given file path exists.
// // // // // // // // // //  */
// // // // // // // // // // const ensureDirectoryExists = (filePath: string) => {
// // // // // // // // // //   const dir = path.dirname(filePath);
// // // // // // // // // //   if (!fs.existsSync(dir)) {
// // // // // // // // // //     fs.mkdirSync(dir, { recursive: true });
// // // // // // // // // //   }
// // // // // // // // // // };

// // // // // // // // // // /**
// // // // // // // // // //  * Loads existing voice assignments from the JSON file.
// // // // // // // // // //  */
// // // // // // // // // // const loadVoices = (): { [key: string]: VoiceAssignment } => {
// // // // // // // // // //   try {
// // // // // // // // // //     if (fs.existsSync(VOICE_STORAGE_PATH)) {
// // // // // // // // // //       return JSON.parse(fs.readFileSync(VOICE_STORAGE_PATH, "utf-8"));
// // // // // // // // // //     }
// // // // // // // // // //   } catch (error) {
// // // // // // // // // //     console.error("⚠️ Error loading voice mappings:", error);
// // // // // // // // // //   }
// // // // // // // // // //   return {};
// // // // // // // // // // };

// // // // // // // // // // /**
// // // // // // // // // //  * Saves updated voice assignments to the JSON file.
// // // // // // // // // //  */
// // // // // // // // // // const saveVoices = (voices: { [key: string]: VoiceAssignment }) => {
// // // // // // // // // //   try {
// // // // // // // // // //     ensureDirectoryExists(VOICE_STORAGE_PATH);
// // // // // // // // // //     fs.writeFileSync(VOICE_STORAGE_PATH, JSON.stringify(voices, null, 2), "utf-8");
// // // // // // // // // //   } catch (error) {
// // // // // // // // // //     console.error("⚠️ Error saving voice mappings:", error);
// // // // // // // // // //   }
// // // // // // // // // // };

// // // // // // // // // // /**
// // // // // // // // // //  * Generates an additional voice identifier for the given gender.
// // // // // // // // // //  * This implementation simply creates a new voice string by appending a timestamp.
// // // // // // // // // //  * You can modify this function to integrate with a voice-generation API if needed.
// // // // // // // // // //  */
// // // // // // // // // // function generateAdditionalVoice(gender: "MALE" | "FEMALE"): string {
// // // // // // // // // //   const timestamp = Date.now();
// // // // // // // // // //   if (gender === "MALE") {
// // // // // // // // // //     return `en-US-GeneratedMaleVoice-${timestamp}`;
// // // // // // // // // //   } else {
// // // // // // // // // //     return `en-US-GeneratedFemaleVoice-${timestamp}`;
// // // // // // // // // //   }
// // // // // // // // // // }

// // // // // // // // // // /**
// // // // // // // // // //  * Assigns a consistent voice to a speaker based on their gender.
// // // // // // // // // //  * If a voice is already assigned for the speaker, that voice is returned.
// // // // // // // // // //  * Otherwise, if there are predefined voices available for the speaker's gender,
// // // // // // // // // //  * the next voice is assigned. When the predefined list is exhausted, a new voice is generated.
// // // // // // // // // //  * The assignment is saved with a source flag ("predefined" or "generated") for tracking.
// // // // // // // // // //  */
// // // // // // // // // // export const getVoiceForSpeaker = (
// // // // // // // // // //   speaker: string,
// // // // // // // // // //   gender: "MALE" | "FEMALE" | "UNKNOWN"
// // // // // // // // // // ): string => {
// // // // // // // // // //   const assignedVoices = loadVoices();

// // // // // // // // // //   // Return the existing assignment if available.
// // // // // // // // // //   if (assignedVoices[speaker]) {
// // // // // // // // // //     return assignedVoices[speaker].voice;
// // // // // // // // // //   }

// // // // // // // // // //   let selectedVoice: string;
// // // // // // // // // //   let source: "predefined" | "generated" = "predefined";

// // // // // // // // // //   if (gender === "MALE") {
// // // // // // // // // //     if (maleCounter < maleVoices.length) {
// // // // // // // // // //       selectedVoice = maleVoices[maleCounter];
// // // // // // // // // //     } else {
// // // // // // // // // //       // Predefined male voices are exhausted—generate a new voice.
// // // // // // // // // //       selectedVoice = generateAdditionalVoice("MALE");
// // // // // // // // // //       source = "generated";
// // // // // // // // // //       // Optionally, add the new voice to the pool for future use.
// // // // // // // // // //       maleVoices.push(selectedVoice);
// // // // // // // // // //     }
// // // // // // // // // //     maleCounter++;
// // // // // // // // // //   } else if (gender === "FEMALE") {
// // // // // // // // // //     if (femaleCounter < femaleVoices.length) {
// // // // // // // // // //       selectedVoice = femaleVoices[femaleCounter];
// // // // // // // // // //     } else {
// // // // // // // // // //       // Predefined female voices are exhausted—generate a new voice.
// // // // // // // // // //       selectedVoice = generateAdditionalVoice("FEMALE");
// // // // // // // // // //       source = "generated";
// // // // // // // // // //       femaleVoices.push(selectedVoice);
// // // // // // // // // //     }
// // // // // // // // // //     femaleCounter++;
// // // // // // // // // //   } else {
// // // // // // // // // //     console.warn(`⚠️ No gender detected for '${speaker}'. Assigning narrator's voice.`);
// // // // // // // // // //     selectedVoice = highQualityNarratorVoice;
// // // // // // // // // //     source = "predefined";
// // // // // // // // // //   }

// // // // // // // // // //   // Save the assignment so that the same speaker always gets the same voice.
// // // // // // // // // //   assignedVoices[speaker] = { voice: selectedVoice, source };
// // // // // // // // // //   saveVoices(assignedVoices);

// // // // // // // // // //   return selectedVoice;
// // // // // // // // // // };

// // // // // // // // // import fs from "fs";
// // // // // // // // // import path from "path";

// // // // // // // // // const VOICE_STORAGE_PATH = path.join(process.cwd(), "data", "speakerVoices.json");

// // // // // // // // // // High-quality narrator voice.
// // // // // // // // // const highQualityNarratorVoice = "am_gurney";

// // // // // // // // // // Original voices (for Kokoro).
// // // // // // // // // const originalMaleVoices: string[] = ["am_michael", "am_adam", "bm_george", "bm_lewis"];
// // // // // // // // // const originalFemaleVoices: string[] = ["bf_isabella", "af_bella", "af_nicole", "af_sarah"];

// // // // // // // // // // New voices (from msedge-tts).
// // // // // // // // // const newMaleVoices: string[] = [
// // // // // // // // //   "en-US-BrianMultilingualNeural",
// // // // // // // // //   "en-US-SteffanNeural",
// // // // // // // // //   "en-US-RogerNeural",
// // // // // // // // //   "en-US-AndrewNeural"

// // // // // // // // // ];
// // // // // // // // // const newFemaleVoices: string[] = [
// // // // // // // // //   "en-US-AriaNeural",
// // // // // // // // //   "en-US-AnaNeural",
// // // // // // // // //   "en-GB-SoniaNeural",
// // // // // // // // //   "en-GB-MaisieNeural",
// // // // // // // // //   "en-US-AvaMultilingualNeural",
// // // // // // // // //   "en-US-EmmaMultilingualNeural",
// // // // // // // // //   "zh-HK-HiuMaanNeural",
// // // // // // // // //   "zh-CN-XiaoxiaoMultilingualNeural",
// // // // // // // // //   "zh-CN-YunxiaNeural",
// // // // // // // // // ];

// // // // // // // // // // Counters to track total speakers for each gender.
// // // // // // // // // let maleCounter = 0;
// // // // // // // // // let femaleCounter = 0;

// // // // // // // // // interface VoiceAssignment {
// // // // // // // // //   voice: string;
// // // // // // // // //   source: "predefined" | "generated";
// // // // // // // // // }

// // // // // // // // // const ensureDirectoryExists = (filePath: string) => {
// // // // // // // // //   const dir = path.dirname(filePath);
// // // // // // // // //   if (!fs.existsSync(dir)) {
// // // // // // // // //     fs.mkdirSync(dir, { recursive: true });
// // // // // // // // //   }
// // // // // // // // // };

// // // // // // // // // const loadVoices = (): { [key: string]: VoiceAssignment } => {
// // // // // // // // //   try {
// // // // // // // // //     if (fs.existsSync(VOICE_STORAGE_PATH)) {
// // // // // // // // //       return JSON.parse(fs.readFileSync(VOICE_STORAGE_PATH, "utf-8"));
// // // // // // // // //     }
// // // // // // // // //   } catch (error) {
// // // // // // // // //     console.error("⚠️ Error loading voice mappings:", error);
// // // // // // // // //   }
// // // // // // // // //   return {};
// // // // // // // // // };

// // // // // // // // // const saveVoices = (voices: { [key: string]: VoiceAssignment }) => {
// // // // // // // // //   try {
// // // // // // // // //     ensureDirectoryExists(VOICE_STORAGE_PATH);
// // // // // // // // //     fs.writeFileSync(VOICE_STORAGE_PATH, JSON.stringify(voices, null, 2), "utf-8");
// // // // // // // // //   } catch (error) {
// // // // // // // // //     console.error("⚠️ Error saving voice mappings:", error);
// // // // // // // // //   }
// // // // // // // // // };

// // // // // // // // // /**
// // // // // // // // //  * Selects an additional voice from the new msedge-tts voices.
// // // // // // // // //  */
// // // // // // // // // function getAdditionalVoice(gender: "MALE" | "FEMALE", count: number): string {
// // // // // // // // //   if (gender === "MALE") {
// // // // // // // // //     const index = count - originalMaleVoices.length;
// // // // // // // // //     if (index < newMaleVoices.length) {
// // // // // // // // //       return newMaleVoices[index];
// // // // // // // // //     }
// // // // // // // // //     return newMaleVoices[newMaleVoices.length - 1];
// // // // // // // // //   } else {
// // // // // // // // //     const index = count - originalFemaleVoices.length;
// // // // // // // // //     if (index < newFemaleVoices.length) {
// // // // // // // // //       return newFemaleVoices[index];
// // // // // // // // //     }
// // // // // // // // //     return newFemaleVoices[newFemaleVoices.length - 1];
// // // // // // // // //   }
// // // // // // // // // }

// // // // // // // // // /**
// // // // // // // // //  * Returns an object with the assigned voice and its source.
// // // // // // // // //  */
// // // // // // // // // export const getVoiceForSpeaker = (
// // // // // // // // //   speaker: string,
// // // // // // // // //   gender: "MALE" | "FEMALE" | "UNKNOWN"
// // // // // // // // // ): { voice: string; source: "predefined" | "generated" } => {
// // // // // // // // //   const assignedVoices = loadVoices();

// // // // // // // // //   if (assignedVoices[speaker]) {
// // // // // // // // //     return assignedVoices[speaker];
// // // // // // // // //   }

// // // // // // // // //   let selectedVoice: string;
// // // // // // // // //   let source: "predefined" | "generated" = "predefined";

// // // // // // // // //   if (gender === "MALE") {
// // // // // // // // //     if (maleCounter < originalMaleVoices.length) {
// // // // // // // // //       selectedVoice = originalMaleVoices[maleCounter];
// // // // // // // // //     } else {
// // // // // // // // //       selectedVoice = getAdditionalVoice("MALE", maleCounter);
// // // // // // // // //       source = "generated";
// // // // // // // // //     }
// // // // // // // // //     maleCounter++;
// // // // // // // // //   } else if (gender === "FEMALE") {
// // // // // // // // //     if (femaleCounter < originalFemaleVoices.length) {
// // // // // // // // //       selectedVoice = originalFemaleVoices[femaleCounter];
// // // // // // // // //     } else {
// // // // // // // // //       selectedVoice = getAdditionalVoice("FEMALE", femaleCounter);
// // // // // // // // //       source = "generated";
// // // // // // // // //     }
// // // // // // // // //     femaleCounter++;
// // // // // // // // //   } else {
// // // // // // // // //     console.warn(`⚠️ No gender detected for '${speaker}'. Using narrator's voice.`);
// // // // // // // // //     selectedVoice = highQualityNarratorVoice;
// // // // // // // // //     source = "predefined";
// // // // // // // // //   }

// // // // // // // // //   const assignment = { voice: selectedVoice, source };
// // // // // // // // //   assignedVoices[speaker] = assignment;
// // // // // // // // //   saveVoices(assignedVoices);

// // // // // // // // //   return assignment;
// // // // // // // // // };


// // // // // // // // import fs from "fs";
// // // // // // // // import path from "path";

// // // // // // // // const VOICE_STORAGE_PATH = path.join(process.cwd(), "data", "speakerVoices.json");

// // // // // // // // // High-quality narrator voice (default fallback if necessary).
// // // // // // // // const highQualityNarratorVoice = "bm_lewis";

// // // // // // // // // 🎤 Kokoro-Compatible Voices (Predefined)
// // // // // // // // const kokoroMaleVoices: string[] = ["am_puck", "am_adam", "bm_george","am_onyx",];
// // // // // // // // const kokoroFemaleVoices: string[] = [ "af_bella", "af_nicole", "af_sarah"];

// // // // // // // // // 🎤 MsEdge Voices (Generated)
// // // // // // // // const msedgeMaleVoices: string[] = [
// // // // // // // //   "en-US-BrianMultilingualNeural",
// // // // // // // //   "en-US-SteffanNeural",
// // // // // // // //   "en-US-AndrewNeural"
// // // // // // // // ];
// // // // // // // // const msedgeFemaleVoices: string[] = [
// // // // // // // //   "en-US-AriaNeural",
// // // // // // // //   "en-US-AnaNeural",
// // // // // // // //   "en-GB-SoniaNeural",
// // // // // // // //   "en-GB-MaisieNeural",
// // // // // // // //   "en-US-AvaMultilingualNeural",
// // // // // // // //   "en-US-EmmaMultilingualNeural",
// // // // // // // //   "zh-HK-HiuMaanNeural",
// // // // // // // //   "zh-CN-XiaoxiaoMultilingualNeural",
// // // // // // // //   "zh-CN-YunxiaNeural"
// // // // // // // // ];

// // // // // // // // // For unknown gender, use a combined list of predefined voices.
// // // // // // // // const kokoroUnknownVoices: string[] = [
// // // // // // // //   ...kokoroMaleVoices,
// // // // // // // //   ...kokoroFemaleVoices
// // // // // // // // ];

// // // // // // // // interface VoiceAssignment {
// // // // // // // //   voice: string;
// // // // // // // //   source: "predefined" | "generated";
// // // // // // // // }

// // // // // // // // // Ensure the storage directory exists.
// // // // // // // // const ensureDirectoryExists = (filePath: string) => {
// // // // // // // //   const dir = path.dirname(filePath);
// // // // // // // //   if (!fs.existsSync(dir)) {
// // // // // // // //     fs.mkdirSync(dir, { recursive: true });
// // // // // // // //   }
// // // // // // // // };

// // // // // // // // // Load voice mappings from JSON file.
// // // // // // // // const loadVoices = (): { [key: string]: VoiceAssignment } => {
// // // // // // // //   try {
// // // // // // // //     if (fs.existsSync(VOICE_STORAGE_PATH)) {
// // // // // // // //       return JSON.parse(fs.readFileSync(VOICE_STORAGE_PATH, "utf-8"));
// // // // // // // //     }
// // // // // // // //   } catch (error) {
// // // // // // // //     console.error("⚠️ Error loading voice mappings:", error);
// // // // // // // //   }
// // // // // // // //   return {};
// // // // // // // // };

// // // // // // // // // Save voice mappings to JSON file.
// // // // // // // // const saveVoices = (voices: { [key: string]: VoiceAssignment }) => {
// // // // // // // //   try {
// // // // // // // //     ensureDirectoryExists(VOICE_STORAGE_PATH);
// // // // // // // //     fs.writeFileSync(VOICE_STORAGE_PATH, JSON.stringify(voices, null, 2), "utf-8");
// // // // // // // //   } catch (error) {
// // // // // // // //     console.error("⚠️ Error saving voice mappings:", error);
// // // // // // // //   }
// // // // // // // // };

// // // // // // // // /**
// // // // // // // //  * Get an additional MsEdge-generated voice.
// // // // // // // //  * The "count" here represents the total number of speakers already assigned for this gender.
// // // // // // // //  */
// // // // // // // // function getMsEdgeVoice(gender: "MALE" | "FEMALE", count: number): string {
// // // // // // // //   if (gender === "MALE") {
// // // // // // // //     const index = count - kokoroMaleVoices.length;
// // // // // // // //     if (index < msedgeMaleVoices.length) {
// // // // // // // //       return msedgeMaleVoices[index];
// // // // // // // //     }
// // // // // // // //     return msedgeMaleVoices[msedgeMaleVoices.length - 1];
// // // // // // // //   } else {
// // // // // // // //     const index = count - kokoroFemaleVoices.length;
// // // // // // // //     if (index < msedgeFemaleVoices.length) {
// // // // // // // //       return msedgeFemaleVoices[index];
// // // // // // // //     }
// // // // // // // //     return msedgeFemaleVoices[msedgeFemaleVoices.length - 1];
// // // // // // // //   }
// // // // // // // // }

// // // // // // // // /**
// // // // // // // //  * Returns a voice and its source ("predefined" for Kokoro, "generated" for MsEdge)
// // // // // // // //  * for a given speaker and gender. This function assigns unique voices based on
// // // // // // // //  * the number of speakers already assigned in the persisted storage.
// // // // // // // //  */
// // // // // // // // export const getVoiceForSpeaker = (
// // // // // // // //     speaker: string,
// // // // // // // //     gender: "MALE" | "FEMALE" | "UNKNOWN"
// // // // // // // //   ): { voice: string; source: "predefined" | "generated" } => {
// // // // // // // //     const assignedVoices = loadVoices();
  
// // // // // // // //   // Special handling: if the speaker is "Narrator", always assign the narrator's voice.
// // // // // // // //   if (speaker.trim().toLowerCase() === "narrator") {
// // // // // // // //     const narratorAssignment: VoiceAssignment = { voice: highQualityNarratorVoice, source: "predefined" };
// // // // // // // //     assignedVoices[speaker] = narratorAssignment;
// // // // // // // //     saveVoices(assignedVoices);
// // // // // // // //     return narratorAssignment;
// // // // // // // //   }

// // // // // // // //   // Return existing voice mapping if available.
// // // // // // // //   if (assignedVoices[speaker]) {
// // // // // // // //     return assignedVoices[speaker];
// // // // // // // //   }
  
// // // // // // // //     let selectedVoice: string;
// // // // // // // //     let source: "predefined" | "generated" = "predefined"; // Default
  
// // // // // // // //     if (gender === "MALE") {
// // // // // // // //       // Count the number of male assignments.
// // // // // // // //       const maleCount = Object.values(assignedVoices).filter(
// // // // // // // //         (assignment) =>
// // // // // // // //           kokoroMaleVoices.includes(assignment.voice) ||
// // // // // // // //           msedgeMaleVoices.includes(assignment.voice)
// // // // // // // //       ).length;
  
// // // // // // // //       if (maleCount < kokoroMaleVoices.length) {
// // // // // // // //         selectedVoice = kokoroMaleVoices[maleCount];
// // // // // // // //       } else {
// // // // // // // //         selectedVoice = getMsEdgeVoice("MALE", maleCount);
// // // // // // // //         source = "generated";
// // // // // // // //       }
// // // // // // // //     } else if (gender === "FEMALE") {
// // // // // // // //       // Count the number of female assignments.
// // // // // // // //       const femaleCount = Object.values(assignedVoices).filter(
// // // // // // // //         (assignment) =>
// // // // // // // //           kokoroFemaleVoices.includes(assignment.voice) ||
// // // // // // // //           msedgeFemaleVoices.includes(assignment.voice)
// // // // // // // //       ).length;
  
// // // // // // // //       if (femaleCount < kokoroFemaleVoices.length) {
// // // // // // // //         selectedVoice = kokoroFemaleVoices[femaleCount];
// // // // // // // //       } else {
// // // // // // // //         selectedVoice = getMsEdgeVoice("FEMALE", femaleCount);
// // // // // // // //         source = "generated";
// // // // // // // //       }
// // // // // // // //     } else {
// // // // // // // //       // For UNKNOWN gender, use a combined list and assign sequentially.
// // // // // // // //       const unknownCount = Object.values(assignedVoices).filter(
// // // // // // // //         (assignment) => kokoroUnknownVoices.includes(assignment.voice)
// // // // // // // //       ).length;
  
// // // // // // // //       if (unknownCount < kokoroUnknownVoices.length) {
// // // // // // // //         selectedVoice = kokoroUnknownVoices[unknownCount];
// // // // // // // //       } else {
// // // // // // // //         // If we run out of unique voices, default to the last voice.
// // // // // // // //         selectedVoice = kokoroUnknownVoices[kokoroUnknownVoices.length - 1];
// // // // // // // //       }
// // // // // // // //       source = "predefined";
// // // // // // // //     }
  
// // // // // // // //     const assignment = { voice: selectedVoice, source };
// // // // // // // //     assignedVoices[speaker] = assignment;
// // // // // // // //     saveVoices(assignedVoices);
  
// // // // // // // //     return assignment;
// // // // // // // //   };
  



// // // // // // // // Voice options and constants.
// // // // // // // const highQualityNarratorVoice = "bm_george";

// // // // // // // // 🎤 Kokoro-Compatible Voices (Predefined)
// // // // // // // const kokoroMaleVoices: string[] = ["am_puck","am_michael", "bm_daniel", "bm_lewis", "am_adam", "am_onyx"];
// // // // // // // const kokoroFemaleVoices: string[] = ["af_bella", "af_nicole", "af_sarah"];

// // // // // // // // 🎤 MsEdge Voices (Generated)
// // // // // // // const msedgeMaleVoices: string[] = [
// // // // // // //   "en-US-BrianMultilingualNeural",
// // // // // // //   "en-US-SteffanNeural",
// // // // // // //   "en-US-AndrewNeural"
// // // // // // // ];
// // // // // // // const msedgeFemaleVoices: string[] = [
// // // // // // //   "en-US-AriaNeural",
// // // // // // //   "en-US-AnaNeural",
// // // // // // //   "en-GB-SoniaNeural",
// // // // // // //   "en-GB-MaisieNeural",
// // // // // // //   "en-US-AvaMultilingualNeural",
// // // // // // //   "en-US-EmmaMultilingualNeural",
// // // // // // //   "zh-CN-XiaoxiaoMultilingualNeural",
// // // // // // // ];

// // // // // // // // For unknown gender, use a combined list of predefined voices.
// // // // // // // const kokoroUnknownVoices: string[] = [...kokoroMaleVoices, ...kokoroFemaleVoices];

// // // // // // // // The VoiceAssignment interface.
// // // // // // // interface VoiceAssignment {
// // // // // // //   voice: string;
// // // // // // //   source: "predefined" | "generated";
// // // // // // // }

// // // // // // // // In-memory storage for speaker voice assignments.
// // // // // // // const voiceAssignments: { [key: string]: VoiceAssignment } = {};

// // // // // // // // Helper function to normalize speaker names.
// // // // // // // function normalizeSpeakerName(name: string): string {
// // // // // // //   return name.trim().toLowerCase();
// // // // // // // }

// // // // // // // /**
// // // // // // //  * A simple djb2 hash function for strings.
// // // // // // //  * Returns a positive number.
// // // // // // //  */
// // // // // // // function hashString(str: string): number {
// // // // // // //   let hash = 5381;
// // // // // // //   for (let i = 0; i < str.length; i++) {
// // // // // // //     hash = ((hash << 5) + hash) + str.charCodeAt(i); // hash * 33 + c
// // // // // // //   }
// // // // // // //   return Math.abs(hash);
// // // // // // // }

// // // // // // // /**
// // // // // // //  * Returns a voice and its source ("predefined" for Kokoro, "generated" for MsEdge)
// // // // // // //  * for a given speaker and gender using a deterministic hash-based approach.
// // // // // // //  *
// // // // // // //  * If a mapping for a speaker already exists in memory, that assignment is returned.
// // // // // // //  * Otherwise, a hash is computed from the normalized speaker name and used to
// // // // // // //  * deterministically select a voice from the combined list.
// // // // // // //  */
// // // // // // // export const getVoiceForSpeaker = (
// // // // // // //   speaker: string,
// // // // // // //   gender?: "MALE" | "FEMALE" | "UNKNOWN"
// // // // // // // ): { voice: string; source: "predefined" | "generated" } => {
// // // // // // //   // Normalize the speaker name.
// // // // // // //   const normalizedSpeaker = normalizeSpeakerName(speaker);
// // // // // // //   console.log(`Assigning voice for '${normalizedSpeaker}' with gender '${gender}'`);

// // // // // // //   // Special case: if the speaker is "narrator", always assign the narrator's voice.
// // // // // // //   if (normalizedSpeaker === "narrator") {
// // // // // // //     const narratorAssignment: VoiceAssignment = { voice: highQualityNarratorVoice, source: "predefined" };
// // // // // // //     voiceAssignments[normalizedSpeaker] = narratorAssignment;
// // // // // // //     console.log(`Speaker '${normalizedSpeaker}' is narrator. Assigned voice: ${narratorAssignment.voice}`);
// // // // // // //     return narratorAssignment;
// // // // // // //   }

// // // // // // //   // If an assignment already exists for this speaker, return it.
// // // // // // //   if (voiceAssignments[normalizedSpeaker]) {
// // // // // // //     console.log(`Found existing assignment for '${normalizedSpeaker}':`, voiceAssignments[normalizedSpeaker]);
// // // // // // //     return voiceAssignments[normalizedSpeaker];
// // // // // // //   }

// // // // // // //   let voiceList: string[] = [];
// // // // // // //   let source: "predefined" | "generated" = "predefined";

// // // // // // //   // Build the voice list based on gender.
// // // // // // //   if (gender === "MALE") {
// // // // // // //     // For male, the list is predefined voices followed by generated voices.
// // // // // // //     voiceList = [...kokoroMaleVoices, ...msedgeMaleVoices];
// // // // // // //   } else if (gender === "FEMALE") {
// // // // // // //     voiceList = [...kokoroFemaleVoices, ...msedgeFemaleVoices];
// // // // // // //   } else {
// // // // // // //     console.warn(`Warning: Gender for '${normalizedSpeaker}' is UNKNOWN. Using combined predefined voices.`);
// // // // // // //     voiceList = kokoroUnknownVoices;
// // // // // // //   }

// // // // // // //   // Compute a hash from the speaker name and select a voice.
// // // // // // //   const hash = hashString(normalizedSpeaker);
// // // // // // //   const index = hash % voiceList.length;
// // // // // // //   const selectedVoice = voiceList[index];

// // // // // // //   // Determine the source based on index (for MALE and FEMALE only).
// // // // // // //   if (gender === "MALE") {
// // // // // // //     source = index < kokoroMaleVoices.length ? "predefined" : "generated";
// // // // // // //   } else if (gender === "FEMALE") {
// // // // // // //     source = index < kokoroFemaleVoices.length ? "predefined" : "generated";
// // // // // // //   } else {
// // // // // // //     source = "predefined";
// // // // // // //   }

// // // // // // //   console.log(`Computed hash: ${hash}. Index: ${index}. Selected voice: ${selectedVoice} (${source}).`);

// // // // // // //   const assignment: VoiceAssignment = { voice: selectedVoice, source };
// // // // // // //   voiceAssignments[normalizedSpeaker] = assignment;
// // // // // // //   console.log(`Final assignment for '${normalizedSpeaker}':`, assignment);

// // // // // // //   return assignment;
// // // // // // // };



// // // // // // // Voice options and constants.
// // // // // // const highQualityNarratorVoice = "bm_george";

// // // // // // // 🎤 Kokoro-Compatible Voices (Predefined)
// // // // // // const kokoroMaleVoices: string[] = ["am_puck", "am_michael", "bm_daniel", "bm_lewis", "am_adam", "am_onyx"];
// // // // // // const kokoroFemaleVoices: string[] = ["af_bella", "af_nicole", "af_sarah"];

// // // // // // // 🎤 MsEdge Voices (Generated)
// // // // // // const msedgeMaleVoices: string[] = [
// // // // // //   "en-US-BrianMultilingualNeural",
// // // // // //   "en-US-SteffanNeural",
// // // // // //   "en-US-AndrewNeural"
// // // // // // ];
// // // // // // const msedgeFemaleVoices: string[] = [
// // // // // //   "en-US-AriaNeural",
// // // // // //   "en-US-AnaNeural",
// // // // // //   "en-GB-SoniaNeural",
// // // // // //   "en-GB-MaisieNeural",
// // // // // //   "en-US-AvaMultilingualNeural",
// // // // // //   "en-US-EmmaMultilingualNeural",
// // // // // //   "zh-CN-XiaoxiaoMultilingualNeural",
// // // // // // ];

// // // // // // // For unknown gender, we will now simply rely on the gender provided by the model.
// // // // // // // (We no longer build a separate array for unknown speakers.)

// // // // // // // The VoiceAssignment interface.
// // // // // // export interface VoiceAssignment {
// // // // // //   voice: string;
// // // // // //   source: "predefined" | "generated";
// // // // // // }

// // // // // // // In‑memory storage for speaker voice assignments.
// // // // // // const voiceAssignments: { [key: string]: VoiceAssignment } = {};

// // // // // // // Arrays to track order‑of‑appearance for male and female speakers.
// // // // // // let maleSpeakers: string[] = [];
// // // // // // let femaleSpeakers: string[] = [];

// // // // // // // Helper function to normalize speaker names.
// // // // // // function normalizeSpeakerName(name: string): string {
// // // // // //   return name.trim().toLowerCase();
// // // // // // }

// // // // // // /**
// // // // // //  * Returns a voice assignment based on order‑of‑appearance for male and female speakers.
// // // // // //  * If the speaker name is "unknown" (or empty), returns null so the client can handle it.
// // // // // //  */
// // // // // // export const getVoiceForSpeaker = (
// // // // // //   speaker: string,
// // // // // //   gender: "MALE" | "FEMALE" | "UNKNOWN" = "UNKNOWN"
// // // // // // ): { voice: string; source: "predefined" | "generated" } | null => {
// // // // // //   const normalizedSpeaker = normalizeSpeakerName(speaker);
// // // // // //   console.log(`Assigning voice for '${normalizedSpeaker}' with gender '${gender}'`);

// // // // // //   // If the speaker is "narrator", always assign the fixed narrator voice.
// // // // // //   if (normalizedSpeaker === "narrator") {
// // // // // //     const narratorAssignment: VoiceAssignment = { voice: highQualityNarratorVoice, source: "predefined" };
// // // // // //     voiceAssignments[normalizedSpeaker] = narratorAssignment;
// // // // // //     console.log(`Speaker '${normalizedSpeaker}' is narrator. Assigned voice: ${narratorAssignment.voice}`);
// // // // // //     return narratorAssignment;
// // // // // //   }

// // // // // //   // If the speaker is "unknown" or empty, do not assign a voice.
// // // // // //   if (normalizedSpeaker === "unknown" || normalizedSpeaker === "") {
// // // // // //     console.warn(`Speaker is unknown or empty. Skipping voice assignment for input: '${speaker}'`);
// // // // // //     return null;
// // // // // //   }

// // // // // //   // If an assignment already exists, return it.
// // // // // //   if (voiceAssignments[normalizedSpeaker]) {
// // // // // //     console.log(`Found existing assignment for '${normalizedSpeaker}':`, voiceAssignments[normalizedSpeaker]);
// // // // // //     return voiceAssignments[normalizedSpeaker];
// // // // // //   }

// // // // // //   let index: number;
// // // // // //   let selectedVoice: string;
// // // // // //   let source: "predefined" | "generated" = "predefined";

// // // // // //   if (gender === "MALE") {
// // // // // //     if (!maleSpeakers.includes(normalizedSpeaker)) {
// // // // // //       maleSpeakers.push(normalizedSpeaker);
// // // // // //     }
// // // // // //     index = maleSpeakers.indexOf(normalizedSpeaker);
// // // // // //     const combinedMaleVoices = [...kokoroMaleVoices, ...msedgeMaleVoices];
// // // // // //     selectedVoice = combinedMaleVoices[index % combinedMaleVoices.length];
// // // // // //     source = index < kokoroMaleVoices.length ? "predefined" : "generated";
// // // // // //   } else if (gender === "FEMALE") {
// // // // // //     if (!femaleSpeakers.includes(normalizedSpeaker)) {
// // // // // //       femaleSpeakers.push(normalizedSpeaker);
// // // // // //     }
// // // // // //     index = femaleSpeakers.indexOf(normalizedSpeaker);
// // // // // //     const combinedFemaleVoices = [...kokoroFemaleVoices, ...msedgeFemaleVoices];
// // // // // //     selectedVoice = combinedFemaleVoices[index % combinedFemaleVoices.length];
// // // // // //     source = index < kokoroFemaleVoices.length ? "predefined" : "generated";
// // // // // //   } else {
// // // // // //     // If gender is UNKNOWN but speaker is known, you might decide to choose a default.
// // // // // //     // For example, you can default to the male voices (or a fixed unknown voice).
// // // // // //     // Here we default to a fixed unknown voice (e.g., first male voice) to avoid repeating.
// // // // // //     selectedVoice = kokoroMaleVoices[0];
// // // // // //     source = "predefined";
// // // // // //   }

// // // // // //   const assignment: VoiceAssignment = { voice: selectedVoice, source };
// // // // // //   voiceAssignments[normalizedSpeaker] = assignment;
// // // // // //   console.log(`Final assignment for '${normalizedSpeaker}':`, assignment);

// // // // // //   return assignment;
// // // // // // };



// // // // // // Voice options and constants.
// // // // // const highQualityNarratorVoice = "bm_george";

// // // // // // 🎤 Kokoro-Compatible Voices (Predefined)
// // // // // const kokoroMaleVoices: string[] = [
// // // // //   "am_puck", "am_michael", "bm_daniel", "bm_lewis", "am_adam", "am_onyx"
// // // // // ];
// // // // // const kokoroFemaleVoices: string[] = [
// // // // //   "af_bella", "af_nicole", "af_sarah"
// // // // // ];

// // // // // // 🎤 MsEdge Voices (Generated)
// // // // // const msedgeMaleVoices: string[] = [
// // // // //   "en-US-BrianMultilingualNeural", "en-US-SteffanNeural", "en-US-AndrewNeural"
// // // // // ];
// // // // // const msedgeFemaleVoices: string[] = [
// // // // //   "en-US-AriaNeural", "en-US-AnaNeural", "en-GB-SoniaNeural", "en-GB-MaisieNeural",
// // // // //   "en-US-AvaMultilingualNeural", "en-US-EmmaMultilingualNeural", "zh-CN-XiaoxiaoMultilingualNeural"
// // // // // ];

// // // // // // For unknown gender, we simply won't assign a custom voice.
// // // // // const defaultUnknownVoice = ""; // Or choose a fixed fallback if desired

// // // // // // The VoiceAssignment interface.
// // // // // export interface VoiceAssignment {
// // // // //   voice: string;
// // // // //   source: "predefined" | "generated";
// // // // // }

// // // // // // In‑memory storage for speaker voice assignments.
// // // // // const voiceAssignments: { [key: string]: VoiceAssignment } = {};

// // // // // // Arrays to track order‑of‑appearance for each gender.
// // // // // let maleSpeakers: string[] = [];
// // // // // let femaleSpeakers: string[] = [];

// // // // // // Helper function to normalize speaker names.
// // // // // function normalizeSpeakerName(name: string): string {
// // // // //   return name.trim().toLowerCase();
// // // // // }

// // // // // /**
// // // // //  * Returns a voice assignment based on the order in which speakers appear.
// // // // //  * - If the speaker is "narrator", always assign the fixed narrator voice.
// // // // //  * - If the normalized speaker name is "unknown" or empty, return null so the client can handle it.
// // // // //  * - Otherwise, assign the next available voice from the male or female lists.
// // // // //  */
// // // // // export const getVoiceForSpeaker = (
// // // // //   speaker: string,
// // // // //   gender: "MALE" | "FEMALE" | "UNKNOWN" = "UNKNOWN"
// // // // // ): { voice: string; source: "predefined" | "generated" } | null => {
// // // // //   const normalizedSpeaker = normalizeSpeakerName(speaker);
// // // // //   console.log(`Assigning voice for '${normalizedSpeaker}' with gender '${gender}'`);

// // // // //   // Special case: Narrator always gets the fixed narrator voice.
// // // // //   if (normalizedSpeaker === "narrator") {
// // // // //     const narratorAssignment: VoiceAssignment = { voice: highQualityNarratorVoice, source: "predefined" };
// // // // //     voiceAssignments[normalizedSpeaker] = narratorAssignment;
// // // // //     console.log(`Speaker '${normalizedSpeaker}' is narrator. Assigned voice: ${narratorAssignment.voice}`);
// // // // //     return narratorAssignment;
// // // // //   }

// // // // //   // If the speaker is "unknown" or empty, do not assign a custom voice.
// // // // //   if (normalizedSpeaker === "unknown" || normalizedSpeaker === "") {
// // // // //     console.warn(`Speaker is unknown or empty. Skipping voice assignment for '${speaker}'`);
// // // // //     return null;
// // // // //   }

// // // // //   // Return an existing assignment if one exists.
// // // // //   if (voiceAssignments[normalizedSpeaker]) {
// // // // //     console.log(`Found existing assignment for '${normalizedSpeaker}':`, voiceAssignments[normalizedSpeaker]);
// // // // //     return voiceAssignments[normalizedSpeaker];
// // // // //   }

// // // // //   let assignedVoice: string;
// // // // //   let source: "predefined" | "generated" = "predefined";

// // // // //   // Use the order-of-appearance approach.
// // // // //   if (gender === "MALE") {
// // // // //     // Add to the male speakers list if not already present.
// // // // //     if (!maleSpeakers.includes(normalizedSpeaker)) {
// // // // //       maleSpeakers.push(normalizedSpeaker);
// // // // //     }
// // // // //     // Use the speaker's index to choose from the predefined male voices first.
// // // // //     const index = maleSpeakers.indexOf(normalizedSpeaker);
// // // // //     // If there are more speakers than available predefined voices, wrap around (or you could switch to generated voices).
// // // // //     assignedVoice = kokoroMaleVoices[index % kokoroMaleVoices.length];
// // // // //     // Optionally, you might decide to switch to generated voices if index exceeds the predefined list length.
// // // // //     // For example:
// // // // //     // source = index < kokoroMaleVoices.length ? "predefined" : "generated";
// // // // //   } else if (gender === "FEMALE") {
// // // // //     if (!femaleSpeakers.includes(normalizedSpeaker)) {
// // // // //       femaleSpeakers.push(normalizedSpeaker);
// // // // //     }
// // // // //     const index = femaleSpeakers.indexOf(normalizedSpeaker);
// // // // //     assignedVoice = kokoroFemaleVoices[index % kokoroFemaleVoices.length];
// // // // //     // Optionally, set source as "generated" if needed.
// // // // //     // source = index < kokoroFemaleVoices.length ? "predefined" : "generated";
// // // // //   } else {
// // // // //     // For UNKNOWN gender, you may choose not to assign any custom voice (or use a fixed fallback).
// // // // //     console.warn(`Gender for '${normalizedSpeaker}' is UNKNOWN. No custom voice assigned.`);
// // // // //     return null;
// // // // //   }

// // // // //   const assignment: VoiceAssignment = { voice: assignedVoice, source };
// // // // //   voiceAssignments[normalizedSpeaker] = assignment;
// // // // //   console.log(`Final assignment for '${normalizedSpeaker}':`, assignment);
// // // // //   return assignment;
// // // // // };




// // // // // Voice options and constants.
// // // // const highQualityNarratorVoice = "bm_george";

// // // // // 🎤 Kokoro-Compatible Voices (Predefined)
// // // // const kokoroMaleVoices: string[] = [
// // // //   "am_puck", "am_michael", "bm_daniel", "bm_lewis", "am_adam", "am_onyx"
// // // // ];
// // // // const kokoroFemaleVoices: string[] = [
// // // //   "af_bella", "af_nicole", "af_sarah"
// // // // ];

// // // // // 🎤 MsEdge Voices (Generated)
// // // // const msedgeMaleVoices: string[] = [
// // // //   "en-US-BrianMultilingualNeural",
// // // //   "en-US-SteffanNeural",
// // // //   "en-US-AndrewNeural"
// // // // ];
// // // // const msedgeFemaleVoices: string[] = [
// // // //   "en-US-AriaNeural",
// // // //   "en-US-AnaNeural",
// // // //   "en-GB-SoniaNeural",
// // // //   "en-GB-MaisieNeural",
// // // //   "en-US-AvaMultilingualNeural",
// // // //   "en-US-EmmaMultilingualNeural",
// // // //   "zh-CN-XiaoxiaoMultilingualNeural"
// // // // ];

// // // // // For unknown gender, we choose not to assign a custom voice.

// // // // // The VoiceAssignment interface.
// // // // export interface VoiceAssignment {
// // // //   voice: string;
// // // //   source: "predefined" | "generated";
// // // // }

// // // // // In‑memory storage for speaker voice assignments.
// // // // const voiceAssignments: { [key: string]: VoiceAssignment } = {};

// // // // // Arrays to track order‑of‑appearance for each gender.
// // // // let maleSpeakers: string[] = [];
// // // // let femaleSpeakers: string[] = [];

// // // // // Helper function to normalize speaker names.
// // // // function normalizeSpeakerName(name: string): string {
// // // //   return name.trim().toLowerCase();
// // // // }

// // // // /**
// // // //  * Returns a voice assignment based on the order in which speakers appear.
// // // //  * - If the speaker is "narrator", always assign the fixed narrator voice.
// // // //  * - If the normalized speaker name is "unknown" or empty, return null so the client can handle it.
// // // //  * - For MALE and FEMALE speakers, first use the predefined voices.
// // // //  *   Once those are exhausted, use the MsEdge voices.
// // // //  */
// // // // export const getVoiceForSpeaker = (
// // // //   speaker: string,
// // // //   gender: "MALE" | "FEMALE" | "UNKNOWN" = "UNKNOWN"
// // // // ): { voice: string; source: "predefined" | "generated" } | null => {
// // // //   const normalizedSpeaker = normalizeSpeakerName(speaker);
// // // //   console.log(`Assigning voice for '${normalizedSpeaker}' with gender '${gender}'`);

// // // //   // Special case: Narrator always gets the fixed narrator voice.
// // // //   if (normalizedSpeaker === "narrator") {
// // // //     const narratorAssignment: VoiceAssignment = { voice: highQualityNarratorVoice, source: "predefined" };
// // // //     voiceAssignments[normalizedSpeaker] = narratorAssignment;
// // // //     console.log(`Speaker '${normalizedSpeaker}' is narrator. Assigned voice: ${narratorAssignment.voice}`);
// // // //     return narratorAssignment;
// // // //   }

// // // //   // If the speaker is "unknown" or empty, do not assign a custom voice.
// // // //   if (normalizedSpeaker === "unknown" || normalizedSpeaker === "") {
// // // //     console.warn(`Speaker is unknown or empty. Skipping voice assignment for '${speaker}'`);
// // // //     return null;
// // // //   }

// // // //   // Return an existing assignment if one exists.
// // // //   if (voiceAssignments[normalizedSpeaker]) {
// // // //     console.log(`Found existing assignment for '${normalizedSpeaker}':`, voiceAssignments[normalizedSpeaker]);
// // // //     return voiceAssignments[normalizedSpeaker];
// // // //   }

// // // //   let assignedVoice: string;
// // // //   let source: "predefined" | "generated" = "predefined";

// // // //   if (gender === "MALE") {
// // // //     if (!maleSpeakers.includes(normalizedSpeaker)) {
// // // //       maleSpeakers.push(normalizedSpeaker);
// // // //     }
// // // //     const index = maleSpeakers.indexOf(normalizedSpeaker);
// // // //     if (index < kokoroMaleVoices.length) {
// // // //       assignedVoice = kokoroMaleVoices[index];
// // // //       source = "predefined";
// // // //     } else {
// // // //       // Use MsEdge voices after predefined voices are exhausted.
// // // //       const msedgeIndex = index - kokoroMaleVoices.length;
// // // //       assignedVoice = msedgeMaleVoices[msedgeIndex % msedgeMaleVoices.length];
// // // //       source = "generated";
// // // //     }
// // // //   } else if (gender === "FEMALE") {
// // // //     if (!femaleSpeakers.includes(normalizedSpeaker)) {
// // // //       femaleSpeakers.push(normalizedSpeaker);
// // // //     }
// // // //     const index = femaleSpeakers.indexOf(normalizedSpeaker);
// // // //     if (index < kokoroFemaleVoices.length) {
// // // //       assignedVoice = kokoroFemaleVoices[index];
// // // //       source = "predefined";
// // // //     } else {
// // // //       const msedgeIndex = index - kokoroFemaleVoices.length;
// // // //       assignedVoice = msedgeFemaleVoices[msedgeIndex % msedgeFemaleVoices.length];
// // // //       source = "generated";
// // // //     }
// // // //   } else {
// // // //     // For unknown gender, return null so the client can use a fallback.
// // // //     console.warn(`Gender for '${normalizedSpeaker}' is UNKNOWN. No custom voice assigned.`);
// // // //     return null;
// // // //   }

// // // //   const assignment: VoiceAssignment = { voice: assignedVoice, source };
// // // //   voiceAssignments[normalizedSpeaker] = assignment;
// // // //   console.log(`Final assignment for '${normalizedSpeaker}':`, assignment);
// // // //   return assignment;
// // // // };





// // // import fs from "fs";
// // // import path from "path";

// // // // Path where the voice mappings are stored.
// // // const VOICE_STORAGE_PATH = path.join(process.cwd(), "data", "speakerVoices.json");

// // // // High-quality narrator voice (always fixed).
// // // const highQualityNarratorVoice = "bm_george";

// // // // 🎤 Kokoro-Compatible Voices (Predefined)
// // // const kokoroMaleVoices: string[] = [
// // //   "am_puck",
// // //   "am_adam",
// // //   "bm_daniel",
// // //   "bm_lewis"
// // // ];
// // // const kokoroFemaleVoices: string[] = ["af_bella", "af_nicole", "af_sarah"];

// // // // 🎤 MsEdge Voices (Generated)
// // // const msedgeMaleVoices: string[] = [
// // //   "en-US-BrianMultilingualNeural",
// // //   "en-US-SteffanNeural",
// // //   "en-US-AndrewNeural"
// // // ];
// // // const msedgeFemaleVoices: string[] = [
// // //   "en-US-AriaNeural",
// // //   "en-US-AnaNeural",
// // //   "en-GB-SoniaNeural",
// // //   "en-GB-MaisieNeural",
// // //   "en-US-AvaMultilingualNeural",
// // //   "en-US-EmmaMultilingualNeural",
// // //   "zh-CN-XiaoxiaoMultilingualNeural"
// // // ];

// // // // For unknown gender, use a combined list of predefined voices.
// // // const kokoroUnknownVoices: string[] = [...kokoroMaleVoices, ...kokoroFemaleVoices];

// // // // Fallback voice for unknown speakers.
// // // const defaultUnknownVoice = highQualityNarratorVoice;

// // // // Define the VoiceAssignment interface.
// // // export interface VoiceAssignment {
// // //   voice: string;
// // //   source: "predefined" | "generated";
// // // }

// // // // In‑memory cache for voice assignments.
// // // let voiceAssignments: { [key: string]: VoiceAssignment } = loadVoices();

// // // // Helper function to ensure the storage directory exists.
// // // const ensureDirectoryExists = (filePath: string) => {
// // //   const dir = path.dirname(filePath);
// // //   if (!fs.existsSync(dir)) {
// // //     fs.mkdirSync(dir, { recursive: true });
// // //   }
// // // };

// // // // Load voice mappings from the JSON file.
// // // function loadVoices(): { [key: string]: VoiceAssignment } {
// // //   try {
// // //     if (fs.existsSync(VOICE_STORAGE_PATH)) {
// // //       const fileData = fs.readFileSync(VOICE_STORAGE_PATH, "utf-8");
// // //       return JSON.parse(fileData);
// // //     }
// // //   } catch (error) {
// // //     console.error("⚠️ Error loading voice mappings:", error);
// // //   }
// // //   return {};
// // // }

// // // // Save voice mappings to the JSON file.
// // // function saveVoices(voices: { [key: string]: VoiceAssignment }) {
// // //   try {
// // //     ensureDirectoryExists(VOICE_STORAGE_PATH);
// // //     fs.writeFileSync(VOICE_STORAGE_PATH, JSON.stringify(voices, null, 2), "utf-8");
// // //   } catch (error) {
// // //     console.error("⚠️ Error saving voice mappings:", error);
// // //   }
// // // }

// // // // Optionally, you can hard‑code overrides for known speakers.
// // // const genderOverrides: { [key: string]: "MALE" | "FEMALE" } = {
// // //   kaladin: "MALE",
// // //   // add other overrides as needed…
// // // };

// // // /**
// // //  * Returns a voice assignment based on a persistent mapping.
// // //  * If a mapping for the speaker already exists (loaded from file), that is returned.
// // //  * Otherwise, a new voice is selected based on the number of assignments already stored for that gender.
// // //  *
// // //  * The “Narrator” is always assigned the fixed narrator voice.
// // //  */
// // // export const getVoiceForSpeaker = (
// // //   speaker: string,
// // //   gender: "MALE" | "FEMALE" | "UNKNOWN" = "UNKNOWN"
// // // ): { voice: string; source: "predefined" | "generated" } => {
// // //   // Normalize the speaker name.
// // //   const normalizedSpeaker = speaker.trim().toLowerCase();
// // //   console.log(`Assigning voice for '${normalizedSpeaker}' with gender '${gender}'`);

// // //   // Special case: Narrator always gets the fixed narrator voice.
// // //   if (normalizedSpeaker === "narrator") {
// // //     const narratorAssignment: VoiceAssignment = { voice: highQualityNarratorVoice, source: "predefined" };
// // //     voiceAssignments[normalizedSpeaker] = narratorAssignment;
// // //     saveVoices(voiceAssignments);
// // //     console.log(`Speaker '${normalizedSpeaker}' is narrator. Assigned voice: ${narratorAssignment.voice}`);
// // //     return narratorAssignment;
// // //   }

// // //   // Apply gender override if available.
// // //   if (genderOverrides[normalizedSpeaker]) {
// // //     gender = genderOverrides[normalizedSpeaker];
// // //   }

// // //   // If speaker is "unknown" or empty, return fallback.
// // //   if (normalizedSpeaker === "unknown" || normalizedSpeaker === "") {
// // //     console.warn(`Speaker is unknown or empty. Returning fallback voice for '${speaker}'`);
// // //     return { voice: defaultUnknownVoice, source: "predefined" };
// // //   }

// // //   // Return existing assignment if available.
// // //   if (voiceAssignments[normalizedSpeaker]) {
// // //     console.log(`Found existing assignment for '${normalizedSpeaker}':`, voiceAssignments[normalizedSpeaker]);
// // //     return voiceAssignments[normalizedSpeaker];
// // //   }

// // //   // Count current assignments for the given gender.
// // //   const assignments = Object.entries(voiceAssignments).filter(
// // //     ([, assignment]) => {
// // //       // Determine the gender of each assignment by checking if the assigned voice is in one of the lists.
// // //       if (gender === "MALE") {
// // //         return kokoroMaleVoices.includes(assignment.voice) || msedgeMaleVoices.includes(assignment.voice);
// // //       } else if (gender === "FEMALE") {
// // //         return kokoroFemaleVoices.includes(assignment.voice) || msedgeFemaleVoices.includes(assignment.voice);
// // //       }
// // //       return false;
// // //     }
// // //   );
// // //   const count = assignments.length;
// // //   let selectedVoice: string;
// // //   let source: "predefined" | "generated" = "predefined";

// // //   if (gender === "MALE") {
// // //     if (count < kokoroMaleVoices.length) {
// // //       selectedVoice = kokoroMaleVoices[count];
// // //     } else {
// // //       const msIndex = count - kokoroMaleVoices.length;
// // //       selectedVoice = msedgeMaleVoices[msIndex % msedgeMaleVoices.length];
// // //       source = "generated";
// // //     }
// // //   } else if (gender === "FEMALE") {
// // //     if (count < kokoroFemaleVoices.length) {
// // //       selectedVoice = kokoroFemaleVoices[count];
// // //     } else {
// // //       const msIndex = count - kokoroFemaleVoices.length;
// // //       selectedVoice = msedgeFemaleVoices[msIndex % msedgeFemaleVoices.length];
// // //       source = "generated";
// // //     }
// // //   } else {
// // //     // For UNKNOWN gender, use a fixed fallback.
// // //     selectedVoice = defaultUnknownVoice;
// // //     source = "predefined";
// // //   }

// // //   const assignment: VoiceAssignment = { voice: selectedVoice, source };
// // //   voiceAssignments[normalizedSpeaker] = assignment;
// // //   saveVoices(voiceAssignments);
// // //   console.log(`Final assignment for '${normalizedSpeaker}':`, assignment);
// // //   return assignment;
// // // };



// // getClientVoices.ts
// export interface VoiceAssignment {
//   voice: string;
//   source: "predefined" | "generated";
// }

// // Voice options and constants.
// const highQualityNarratorVoice = "bm_george";

// // 🎤 Kokoro-Compatible Voices (Predefined)
// const kokoroMaleVoices: string[] = ["am_puck", "am_michael", "bm_daniel", "bm_lewis", "am_adam", "am_onyx"];
// const kokoroFemaleVoices: string[] = ["af_bella", "af_nicole", "af_sarah"];

// // 🎤 MsEdge Voices (Generated)
// const msedgeMaleVoices: string[] = [
//   "en-US-BrianMultilingualNeural",
//   "en-US-SteffanNeural",
//   "en-US-AndrewNeural"
// ];
// const msedgeFemaleVoices: string[] = [
//   "en-US-AriaNeural",
//   "en-US-AnaNeural",
//   "en-GB-SoniaNeural",
//   "en-GB-MaisieNeural",
//   "en-US-AvaMultilingualNeural",
//   "en-US-EmmaMultilingualNeural",
//   "zh-CN-XiaoxiaoMultilingualNeural",
// ];

// // For unknown gender, use a combined list of predefined voices.
// const kokoroUnknownVoices: string[] = [...kokoroMaleVoices, ...kokoroFemaleVoices];

// // In-memory cache for voice assignments.
// const voiceAssignments: { [key: string]: VoiceAssignment } = {};

// // Helper function to normalize speaker names.
// function normalizeSpeakerName(name: string): string {
//   return name.trim().toLowerCase();
// }

// /**
//  * Returns a voice assignment for a given speaker and gender.
//  * This version is for client-side use and does not use fs or persistent storage.
//  */
// export const getVoiceForSpeaker = (
//   speaker: string,
//   gender: "MALE" | "FEMALE"
// ): { voice: string; source: "predefined" | "generated" } => {
//   const normalizedSpeaker = normalizeSpeakerName(speaker);
//   console.log(`Assigning voice for '${normalizedSpeaker}' with gender '${gender}'`);

//   // Special case: Narrator always gets the fixed narrator voice.
//   if (normalizedSpeaker === "narrator") {
//     const assignment: VoiceAssignment = { voice: highQualityNarratorVoice, source: "predefined" };
//     voiceAssignments[normalizedSpeaker] = assignment;
//     console.log(`Speaker '${normalizedSpeaker}' is narrator. Assigned voice: ${assignment.voice}`);
//     return assignment;
//   }

//   // If already assigned, return the assignment.
//   if (voiceAssignments[normalizedSpeaker]) {
//     console.log(`Found existing assignment for '${normalizedSpeaker}':`, voiceAssignments[normalizedSpeaker]);
//     return voiceAssignments[normalizedSpeaker];
//   }

//   // For client-side, we can assign voices deterministically based on order-of-appearance.
//   // For simplicity, we can maintain separate arrays for male and female speakers.
//   // (This is a simplified version; you can refine as needed.)
//   let assignment: VoiceAssignment;
//   if (gender === "MALE") {
//     // Count male speakers already assigned.
//     const maleCount = Object.keys(voiceAssignments).filter(key => {
//       return voiceAssignments[key].voice && kokoroMaleVoices.concat(msedgeMaleVoices).includes(voiceAssignments[key].voice);
//     }).length;
//     const combinedMaleVoices = [...kokoroMaleVoices, ...msedgeMaleVoices];
//     assignment = { voice: combinedMaleVoices[maleCount % combinedMaleVoices.length], source: maleCount < kokoroMaleVoices.length ? "predefined" : "generated" };
//   } else if (gender === "FEMALE") {
//     const femaleCount = Object.keys(voiceAssignments).filter(key => {
//       return voiceAssignments[key].voice && kokoroFemaleVoices.concat(msedgeFemaleVoices).includes(voiceAssignments[key].voice);
//     }).length;
//     const combinedFemaleVoices = [...kokoroFemaleVoices, ...msedgeFemaleVoices];
//     assignment = { voice: combinedFemaleVoices[femaleCount % combinedFemaleVoices.length], source: femaleCount < kokoroFemaleVoices.length ? "predefined" : "generated" };
//   } else {
//     // For UNKNOWN, simply use the unknown voices.
//     const unknownCount = Object.keys(voiceAssignments).filter(key => {
//       return voiceAssignments[key].voice && kokoroUnknownVoices.includes(voiceAssignments[key].voice);
//     }).length;
//     assignment = { voice: kokoroUnknownVoices[unknownCount % kokoroUnknownVoices.length], source: "predefined" };
//   }

//   voiceAssignments[normalizedSpeaker] = assignment;
//   console.log(`Final assignment for '${normalizedSpeaker}':`, assignment);
//   return assignment;
// };



// // // Define the VoiceAssignment interface.
// // export interface VoiceAssignment {
// //   voice: string;
// //   source: "predefined" | "generated";
// // }

// // // Available voices
// // const highQualityNarratorVoice = "bm_george";
// // const kokoroMaleVoices = ["am_puck", "am_adam", "bm_george", "am_onyx"];
// // const kokoroFemaleVoices = ["af_bella", "af_nicole", "af_sarah"];
// // const msedgeMaleVoices = ["en-US-BrianMultilingualNeural", "en-US-SteffanNeural", "en-US-AndrewNeural"];
// // const msedgeFemaleVoices = [
// //   "en-US-AriaNeural", "en-US-AnaNeural", "en-GB-SoniaNeural", 
// //   "en-GB-MaisieNeural", "en-US-AvaMultilingualNeural", "en-US-EmmaMultilingualNeural"
// // ];

// // // In-memory storage for speaker-to-voice mappings.
// // const voiceAssignments: { [key: string]: VoiceAssignment } = {};

// // // Track assigned voices to avoid duplication.
// // const assignedVoices = new Set<string>();

// // // Normalize speaker names.
// // function normalizeSpeakerName(name: string): string {
// //   return name.trim().toLowerCase();
// // }

// // /**
// //  * Get a unique voice for a given speaker and gender.
// //  */
// // export const getVoiceForSpeaker = (
// //   speaker: string,
// //   gender: "MALE" | "FEMALE"
// // ): { voice: string; source: "predefined" | "generated" } => {
// //   const normalizedSpeaker = normalizeSpeakerName(speaker);

// //   // Assign fixed narrator voice.
// //   if (normalizedSpeaker === "narrator") {
// //     voiceAssignments[normalizedSpeaker] = { voice: highQualityNarratorVoice, source: "predefined" };
// //     return voiceAssignments[normalizedSpeaker];
// //   }

// //   // Return the existing assignment if the speaker already has a voice.
// //   if (voiceAssignments[normalizedSpeaker]) {
// //     return voiceAssignments[normalizedSpeaker];
// //   }

// //   let selectedVoice: string;
// //   let source: "predefined" | "generated" = "predefined";

// //   // Choose from available voices, ensuring no duplicates.
// //   if (gender === "MALE") {
// //     const availableMaleVoices = [...kokoroMaleVoices, ...msedgeMaleVoices].filter(v => !assignedVoices.has(v));
// //     selectedVoice = availableMaleVoices.length ? availableMaleVoices[0] : msedgeMaleVoices[0];
// //   } else {
// //     const availableFemaleVoices = [...kokoroFemaleVoices, ...msedgeFemaleVoices].filter(v => !assignedVoices.has(v));
// //     selectedVoice = availableFemaleVoices.length ? availableFemaleVoices[0] : msedgeFemaleVoices[0];
// //   }

// //   // Mark the voice as used to prevent duplication.
// //   assignedVoices.add(selectedVoice);

// //   // Determine source.
// //   if (kokoroMaleVoices.includes(selectedVoice) || kokoroFemaleVoices.includes(selectedVoice)) {
// //     source = "predefined";
// //   } else {
// //     source = "generated";
// //   }

// //   // Store the assignment.
// //   const assignment: VoiceAssignment = { voice: selectedVoice, source };
// //   voiceAssignments[normalizedSpeaker] = assignment;

// //   console.log(`✅ Assigned '${selectedVoice}' to speaker '${normalizedSpeaker}' (gender: ${gender})`);

// //   return assignment;
// // };






// // getvoices.ts
// import { loadVoiceAssignments, saveVoiceAssignments } from "@/lib/voiceStorage";

// export interface VoiceAssignment {
//   voice: string;
//   source: "predefined" | "generated";
// }

// const highQualityNarratorVoice = "bm_george";

// const kokoroMaleVoices: string[] = ["am_puck", "am_michael", "bm_daniel", "bm_lewis", "am_adam", "am_onyx"];
// const kokoroFemaleVoices: string[] = ["af_bella", "af_sarah", "af_sky"];

// const msedgeMaleVoices: string[] = ["en-US-BrianMultilingualNeural", "en-US-SteffanNeural", "en-US-AndrewNeural"];
// const msedgeFemaleVoices: string[] = ["en-US-AriaNeural", "en-US-AnaNeural", "en-GB-SoniaNeural", "en-GB-MaisieNeural", "en-US-AvaMultilingualNeural", "en-US-EmmaMultilingualNeural", "zh-CN-XiaoxiaoMultilingualNeural"];

// const kokoroUnknownVoices: string[] = [...kokoroMaleVoices, ...kokoroFemaleVoices];

// // Initialize our in‑memory cache from persistent storage.
// let voiceAssignments: { [key: string]: VoiceAssignment } = loadVoiceAssignments();

// // Helper: Normalize speaker name.
// function normalizeSpeakerName(name: string): string {
//   return name.trim().toLowerCase();
// }

// /**
//  * Returns a voice assignment for a given speaker and gender.
//  * This version is for client‑side use.
//  */
// export const getVoiceForSpeaker = (
//   speaker: string,
//   gender: "MALE" | "FEMALE"
// ): VoiceAssignment => {
//   const normalizedSpeaker = normalizeSpeakerName(speaker);
//   console.log(`Assigning voice for '${normalizedSpeaker}' with gender '${gender}'`);

//   // Special case: Narrator always gets the fixed narrator voice.
//   if (normalizedSpeaker === "narrator") {
//     const assignment: VoiceAssignment = { voice: highQualityNarratorVoice, source: "predefined" };
//     voiceAssignments[normalizedSpeaker] = assignment;
//     saveVoiceAssignments(voiceAssignments);
//     return assignment;
//   }


//   // Return existing assignment if present.
//   if (voiceAssignments[normalizedSpeaker]) {
//     return voiceAssignments[normalizedSpeaker];
//   }

//   // New assignment.
//   let assignment: VoiceAssignment;
//   if (gender === "MALE") {
//     // Count existing male assignments.
//     const maleCount = Object.keys(voiceAssignments).filter(key =>
//       [...kokoroMaleVoices, ...msedgeMaleVoices].includes(voiceAssignments[key].voice)
//     ).length;
//     const combinedMaleVoices = [...kokoroMaleVoices, ...msedgeMaleVoices];
//     assignment = {
//       voice: combinedMaleVoices[maleCount % combinedMaleVoices.length],
//       source: maleCount < kokoroMaleVoices.length ? "predefined" : "generated",
//     };
//   } else if (gender === "FEMALE") {
//     const femaleCount = Object.keys(voiceAssignments).filter(key =>
//       [...kokoroFemaleVoices, ...msedgeFemaleVoices].includes(voiceAssignments[key].voice)
//     ).length;
//     const combinedFemaleVoices = [...kokoroFemaleVoices, ...msedgeFemaleVoices];
//     assignment = {
//       voice: combinedFemaleVoices[femaleCount % combinedFemaleVoices.length],
//       source: femaleCount < kokoroFemaleVoices.length ? "predefined" : "generated",
//     };
//   } else {
//     const unknownCount = Object.keys(voiceAssignments).filter(key =>
//       kokoroUnknownVoices.includes(voiceAssignments[key].voice)
//     ).length;
//     assignment = {
//       voice: kokoroUnknownVoices[unknownCount % kokoroUnknownVoices.length],
//       source: "predefined",
//     };
//   }

//   // Save the assignment.
//   voiceAssignments[normalizedSpeaker] = assignment;
//   saveVoiceAssignments(voiceAssignments);
//   return assignment;
// };




import { loadVoiceAssignments, saveVoiceAssignments } from "../lib/voiceStorage";

export interface VoiceAssignment {
  voice: string;
  source: "predefined" | "generated";
}

const highQualityNarratorVoice = "bm_george";


const kokoroMaleVoices: string[] = ["am_puck", "am_michael", "bm_daniel", "bm_lewis", "am_adam", "am_onyx"];
const kokoroFemaleVoices: string[] = ["af_bella", "af_sarah", "af_sky"];

const msedgeMaleVoices: string[] = ["en-US-BrianMultilingualNeural", "en-US-SteffanNeural", "en-US-AndrewNeural"];
const msedgeFemaleVoices: string[] = ["en-US-AriaNeural", "en-US-AnaNeural", "en-GB-SoniaNeural", "en-GB-MaisieNeural", "en-US-AvaMultilingualNeural", "en-US-EmmaMultilingualNeural", "zh-CN-XiaoxiaoMultilingualNeural"];

const kokoroUnknownVoices: string[] = [...kokoroMaleVoices, ...kokoroFemaleVoices];

// Initialize our in‑memory cache from persistent storage.
let voiceAssignments: { [key: string]: VoiceAssignment } = loadVoiceAssignments();

// Helper: Normalize speaker name.
function normalizeSpeakerName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Returns a voice assignment for a given speaker and gender.
 * This version is for client‑side use.
 */
export const getVoiceForSpeaker = (
  speaker: string,
  gender: "MALE" | "FEMALE"
): VoiceAssignment => {
  const normalizedSpeaker = normalizeSpeakerName(speaker);
  console.log(`Assigning voice for '${normalizedSpeaker}' with gender '${gender}'`);

  // Special case: Narrator always gets the fixed narrator voice.
  if (normalizedSpeaker === "narrator") {
    const assignment: VoiceAssignment = { voice: highQualityNarratorVoice, source: "predefined" };
    voiceAssignments[normalizedSpeaker] = assignment;
    saveVoiceAssignments(voiceAssignments);
    return assignment;
  }


  // if (normalizedSpeaker === "narrator") {
  //   const assignment: VoiceAssignment = { voice: "en-US-BrianMultilingualNeural", source: "generated" };
  //   voiceAssignments[normalizedSpeaker] = assignment;
  //   saveVoiceAssignments(voiceAssignments);
  //   return assignment;
  // }
  

  // Return existing assignment if present.
  if (voiceAssignments[normalizedSpeaker]) {
    return voiceAssignments[normalizedSpeaker];
  }

  // New assignment.
  let assignment: VoiceAssignment;
  if (gender === "MALE") {
    // Count existing Kokoro (predefined) male assignments.
    const predefinedMaleCount = Object.keys(voiceAssignments).filter(key =>
      kokoroMaleVoices.includes(voiceAssignments[key].voice)
    ).length;
    if (predefinedMaleCount < kokoroMaleVoices.length) {
      assignment = {
        voice: kokoroMaleVoices[predefinedMaleCount],
        source: "predefined",
      };
    } else {
      // Count existing MS Edge (generated) male assignments.
      const msedgeMaleCount = Object.keys(voiceAssignments).filter(key =>
        msedgeMaleVoices.includes(voiceAssignments[key].voice)
      ).length;
      assignment = {
        voice: msedgeMaleVoices[msedgeMaleCount % msedgeMaleVoices.length],
        source: "generated",
      };
    }
  } else if (gender === "FEMALE") {
    // Count existing Kokoro (predefined) female assignments.
    const predefinedFemaleCount = Object.keys(voiceAssignments).filter(key =>
      kokoroFemaleVoices.includes(voiceAssignments[key].voice)
    ).length;
    if (predefinedFemaleCount < kokoroFemaleVoices.length) {
      assignment = {
        voice: kokoroFemaleVoices[predefinedFemaleCount],
        source: "predefined",
      };
    } else {
      // Count existing MS Edge (generated) female assignments.
      const msedgeFemaleCount = Object.keys(voiceAssignments).filter(key =>
        msedgeFemaleVoices.includes(voiceAssignments[key].voice)
      ).length;
      assignment = {
        voice: msedgeFemaleVoices[msedgeFemaleCount % msedgeFemaleVoices.length],
        source: "generated",
      };
    }
  } else {
    // For unknown gender, use Kokoro unknown voices.
    const unknownCount = Object.keys(voiceAssignments).filter(key =>
      kokoroUnknownVoices.includes(voiceAssignments[key].voice)
    ).length;
    assignment = {
      voice: kokoroUnknownVoices[unknownCount % kokoroUnknownVoices.length],
      source: "predefined",
    };
  }

  // Save the assignment.
  voiceAssignments[normalizedSpeaker] = assignment;
  saveVoiceAssignments(voiceAssignments);
  return assignment;
};
