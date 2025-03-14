// // import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// // export interface ParsedSegment {
// //   speaker: string;
// //   text: string;
// //   gender: "MALE" | "FEMALE";
// // }

// // export interface ParseResponse {
// //   segments: ParsedSegment[];
// // }

// // const MAX_TTS_CHUNK_LENGTH = 300;

// // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// // const schema = {
// //   description: "Parsed text segments for audiobook narration",
// //   type: SchemaType.OBJECT,
// //   properties: {
// //     segments: {
// //       type: SchemaType.ARRAY,
// //       items: {
// //         type: SchemaType.OBJECT,
// //         properties: {
// //           speaker: { type: SchemaType.STRING, description: "Speaker Name" },
// //           text: { type: SchemaType.STRING, description: "Content spoken or narrated" },
// //           gender: {
// //             type: SchemaType.STRING,
// //             enum: ["MALE", "FEMALE"],
// //             description: "Gender of speaker",
// //           },
// //         },
// //         required: ["speaker", "text", "gender"],
// //       },
// //     },
// //   },
// //   required: ["segments"],
// // };

// // const model = genAI.getGenerativeModel({
// //   model: "gemini-2.0-flash", // or "gemini-1.5-flash" as preferred
// //   generationConfig: {
// //     responseMimeType: "application/json",
// //     responseSchema: schema,
// //   },
// // });

// // // /**
// // //  * Splits text into TTS-friendly chunks.
// // //  * First, it splits the text into sentences using natural sentence boundaries.
// // //  * Then, if a sentence exceeds maxLength, it is further split at natural breakpoints—preferably after a comma.
// // //  */
// // // function splitTextForTTS(text: string, maxLength: number = MAX_TTS_CHUNK_LENGTH): string[] {
// // //   const sentences = text.split(/(?<=[.!?])\s+/);
// // //   const chunks: string[] = [];

// // //   sentences.forEach(sentence => {
// // //     if (sentence.length <= maxLength) {
// // //       chunks.push(sentence.trim());
// // //     } else {
// // //       let startIndex = 0;
// // //       while (startIndex < sentence.length) {
// // //         let chunk = sentence.substr(startIndex, maxLength);
// // //         if (startIndex + maxLength >= sentence.length) {
// // //           chunks.push(chunk.trim());
// // //           break;
// // //         }
// // //         const lastCommaIndex = chunk.lastIndexOf(",");
// // //         if (lastCommaIndex > 0) {
// // //           chunk = chunk.substring(0, lastCommaIndex + 1);
// // //           chunks.push(chunk.trim());
// // //           startIndex += lastCommaIndex + 1;
// // //         } else {
// // //           const lastSpaceIndex = chunk.lastIndexOf(" ");
// // //           if (lastSpaceIndex > 0) {
// // //             chunk = chunk.substring(0, lastSpaceIndex);
// // //             chunks.push(chunk.trim());
// // //             startIndex += lastSpaceIndex + 1;
// // //           } else {
// // //             chunks.push(chunk.trim());
// // //             startIndex += maxLength;
// // //           }
// // //         }
// // //       }
// // //     }
// // //   });

// // //   return chunks;
// // // }

// // // /**
// // //  * Annotates the input text by splitting it into dialogue and narration segments.
// // //  * Dialogue segments are captured using a regex (text enclosed in quotes).
// // //  * Narration segments are split into sentences then further processed with splitTextForTTS.
// // //  * Returns a JSON string with a "segments" array.
// // //  */
// // // function annotateChunkWithCompromise(text: string): string {
// // //   // Regex to capture dialogue segments (supports various quote styles).
// // //   const dialogueRegex = /(?<=^|\s)(["“‘'])([\s\S]+?)(["”’'])(?=\s|$|[.,!?])/g;
// // //   type Segment = { type: "dialogue" | "narration"; text: string };
// // //   const segments: Segment[] = [];
// // //   let lastIndex = 0;
// // //   let match: RegExpExecArray | null;

// // //   while ((match = dialogueRegex.exec(text)) !== null) {
// // //     if (match.index > lastIndex) {
// // //       const narrationText = text.slice(lastIndex, match.index).trim();
// // //       if (narrationText.length > 0) {
// // //         segments.push({ type: "narration", text: narrationText });
// // //       }
// // //     }
// // //     const dialogueText = match[0].trim();
// // //     segments.push({ type: "dialogue", text: dialogueText });
// // //     lastIndex = dialogueRegex.lastIndex;
// // //   }
  
// // //   if (lastIndex < text.length) {
// // //     const remainingText = text.slice(lastIndex).trim();
// // //     if (remainingText.length > 0) {
// // //       segments.push({ type: "narration", text: remainingText });
// // //     }
// // //   }

// // //   const finalSegments: Segment[] = [];
// // //   segments.forEach(seg => {
// // //     if (seg.type === "narration") {
// // //       const chunks = splitTextForTTS(seg.text, MAX_TTS_CHUNK_LENGTH);
// // //       chunks.forEach(chunk => {
// // //         if (chunk) {
// // //           finalSegments.push({ type: "narration", text: chunk });
// // //         }
// // //       });
// // //     } else {
// // //       if (seg.text.length > MAX_TTS_CHUNK_LENGTH) {
// // //         const chunks = splitTextForTTS(seg.text, MAX_TTS_CHUNK_LENGTH);
// // //         chunks.forEach(chunk => {
// // //           if (chunk) {
// // //             finalSegments.push({ type: "dialogue", text: chunk });
// // //           }
// // //         });
// // //       } else {
// // //         finalSegments.push({ type: "dialogue", text: seg.text });
// // //       }
// // //     }
// // //   });

// // //   const processedSegments = finalSegments.map(seg => ({
// // //     type: seg.type,
// // //     text: seg.text
// // //       .replace(/\n/g, " ")
// // //       .replace(/([.!?])([A-Z])/g, "$1 $2")
// // //       .replace(/([.!?])(["“‘])/g, "$1 $2")
// // //       .trim()
// // //   }));

// // //   return JSON.stringify({ segments: processedSegments });
// // // }


// // // /**
// // //  * Splits a long text into smaller chunks (each ≤ maxLength characters)
// // //  * without cutting off mid-word if possible.
// // //  */
// // // function splitTextForTTS(text: string, maxLength: number): string[] {
// // //   const chunks: string[] = [];
// // //   let startIndex = 0;

// // //   while (startIndex < text.length) {
// // //     // Get a substring up to maxLength.
// // //     let chunk = text.substr(startIndex, maxLength);

// // //     // Try to avoid breaking off mid-word.
// // //     const lastSpaceIndex = chunk.lastIndexOf(" ");
// // //     if (lastSpaceIndex > 0 && startIndex + maxLength < text.length) {
// // //       chunk = chunk.substring(0, lastSpaceIndex);
// // //       startIndex += lastSpaceIndex;
// // //     } else {
// // //       startIndex += maxLength;
// // //     }
// // //     chunks.push(chunk.trim());
// // //   }
// // //   return chunks;
// // // }



// import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// export interface ParsedSegment {
//   speaker: string;
//   text: string;
//   gender: "MALE" | "FEMALE";
// }

// export interface ParseResponse {
//   segments: ParsedSegment[];
// }

// const MAX_TTS_CHUNK_LENGTH = 300;

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// const schema = {
//   description: "Parsed text segments for audiobook narration",
//   type: SchemaType.OBJECT,
//   properties: {
//     segments: {
//       type: SchemaType.ARRAY,
//       items: {
//         type: SchemaType.OBJECT,
//         properties: {
//           speaker: { type: SchemaType.STRING, description: "Speaker Name" },
//           text: { type: SchemaType.STRING, description: "Content spoken or narrated" },
//           gender: {
//             type: SchemaType.STRING,
//             enum: ["MALE", "FEMALE"],
//             description: "Gender of speaker",
//           },
//         },
//         required: ["speaker", "text", "gender"],
//       },
//     },
//   },
//   required: ["segments"],
// };

// const model = genAI.getGenerativeModel({
//   model: "gemini-2.0-flash", // or "gemini-1.5-flash" as preferred
//   generationConfig: {
//     responseMimeType: "application/json",
//     responseSchema: schema,
//   },
// });

// function splitTextForTTS(text: string, maxLength: number): string[] {
//   const chunks: string[] = [];
//   let startIndex = 0;
  
//   while (startIndex < text.length) {
//     // If the remaining text is shorter than maxLength, push it as is.
//     if (text.length - startIndex <= maxLength) {
//       chunks.push(text.slice(startIndex).trim());
//       break;
//     }

//     // Set a tentative end index.
//     let endIndex = startIndex + maxLength;
//     const slice = text.slice(startIndex, endIndex);

//     // Try to find punctuation within the slice.
//     const punctuationMarks = [".", "?", "!"];
//     let breakIndex = -1;
//     for (const mark of punctuationMarks) {
//       const index = slice.lastIndexOf(mark);
//       if (index > breakIndex) {
//         breakIndex = index;
//       }
//     }

//     if (breakIndex !== -1) {
//       // If punctuation is found, break right after it.
//       endIndex = startIndex + breakIndex + 1;
//     } else {
//       // Otherwise, try to break at the last space.
//       const lastSpaceIndex = slice.lastIndexOf(" ");
//       if (lastSpaceIndex !== -1) {
//         endIndex = startIndex + lastSpaceIndex;
//       }
//       // If there's no space (very unlikely for normal text), endIndex remains unchanged.
//     }

//     // Add the chunk and update startIndex.
//     chunks.push(text.slice(startIndex, endIndex).trim());
//     startIndex = endIndex;
//   }
  
//   return chunks;
// }


// /**
//  * Annotates the input text by splitting it into dialogue and narration segments.
//  * Uses a regex to capture dialogue segments, then returns a JSON string with a segments array.
//  */
// function annotateChunkWithCompromise(text: string): string {
//   const dialogueRegex = /(?<=^|\s)(["“‘'])([\s\S]+?)(["”’'])(?=\s|$|[.,!?])/g;
//   type Segment = { type: "dialogue" | "narration"; text: string };
//   const segments: Segment[] = [];
//   let lastIndex = 0;
//   let match;

//   // Loop through all dialogue matches.
//   while ((match = dialogueRegex.exec(text)) !== null) {
//     // Any narration text before the dialogue match.
//     if (match.index > lastIndex) {
//       const narrationText = text.slice(lastIndex, match.index).trim();
//       if (narrationText.length > 0) {
//         segments.push({ type: "narration", text: narrationText });
//       }
//     }
//     // Add the dialogue segment.
//     const dialogueText = match[0].trim();
//     segments.push({ type: "dialogue", text: dialogueText });
//     lastIndex = dialogueRegex.lastIndex;
//   }

//   // Add any remaining text as narration.
//   if (lastIndex < text.length) {
//     const remainingText = text.slice(lastIndex).trim();
//     if (remainingText.length > 0) {
//       segments.push({ type: "narration", text: remainingText });
//     }
//   }

//   // Process segments: set types to uppercase and fix spacing.
//   const processedSegments = segments.map(seg => ({
//     type: seg.type === "dialogue" ? "DIALOGUE" : "NARRATION",
//     text: seg.text
//       .replace(/([.!?])([A-Z])/g, "$1 $2")  // Insert a space after punctuation if followed immediately by an uppercase letter.
//       .replace(/([.!?])(["“‘])/g, "$1 $2")  // Insert a space after punctuation if followed immediately by a quote.
//   }));

//   // Return a JSON string with a "segments" array.
//   return JSON.stringify({ segments: processedSegments });
// }

// /**
//  * Next.js API Route handler.
//  */
// export default async function handler(req: any, res: any) {
//   if (req.method !== "POST") {
//     res.status(405).json({ error: "Method not allowed. Use POST." });
//     return;
//   }

//   // Ensure the request body is parsed
//   let payload = req.body;
//   if (!payload) {
//     res.status(400).json({ error: "Text is required" });
//     return;
//   }
//   if (typeof payload === "string") {
//     try {
//       payload = JSON.parse(payload);
//     } catch (err) {
//       res.status(400).json({ error: "Invalid JSON body." });
//       return;
//     }
//   }

//   const { text, context } = payload;
//   if (!text) {
//     res.status(400).json({ error: "Text is required" });
//     return;
//   }

//   console.log("🔹 Received full text for annotation:", text);

//   // Annotate the text.
//   const annotatedChunk = annotateChunkWithCompromise(text);
//   console.log("🔹 Full annotated text generated.", annotatedChunk);

//   const contextPart = context ? `\nContext Summary:\n${context}\n` : "";

//   // Build the prompt.
//   const prompt = `
//   you are given a JSON array of text segments. Each segment has:

//   type: “dialogue” or “narration”
//   text: raw sentence
//   speaker: a name or “Narrator”
//   gender: a gender label
//   Your tasks:

//   Validate classification: If a segment is incorrectly labeled (dialogue vs. narration), correct it.
//   Example: A sentence in quotes labeled as “narration” should be “dialogue.” A short exclamation like “He would not!” might be dialogue if it’s obviously speech.
//   Assign speakers: Infer who is speaking from context or turn-taking; do not mix up speaker names when multiple characters alternate lines.
//   Example: If two characters speak in alternating lines, label them consistently: speaker A, then speaker B, then A, then B, and so on.
//   Gender:
//   Narration always has "speaker": "Narrator" and "gender": "MALE".
//   Dialogue should have "gender" inferred from context. If unclear, use "UNKNOWN".
//   Example: “Syl?” (spoken by Syl) → "gender": "FEMALE", or “Kaladin said” → "gender": "MALE".
//   Output only valid JSON containing:
//   "segments": the revised list of segments (type, text, speaker, gender), all properly labeled.
//   "speakersIdentified": a dictionary mapping speaker names to their inferred genders.
//   No additional commentary—only return this JSON.

//   4. **Output Format:**
//      - **Strictly return a JSON object** with two top-level keys:
//        1. "segments": an array of segment objects.  
//           Each segment object must have the following keys:
//           {
//             "type": "DIALOGUE" | "NARRATION",
//             "text": "<cleaned text>",
//             "speaker": "<speaker name or Narrator>",
//             "gender": "MALE" | "FEMALE"
//           }
//        2. "speakersIdentified": a dictionary mapping speaker names to their inferred genders.
//           For example:
//           {
//             "speakersIdentified": {
//               "Kaladin": "MALE",
//               "Shallan": "FEMALE",
//               "Moash": "MALE"
//             }
//           }
//      - Note: Do not assign FAMALE gender to the Narrator.
//      - Do not repeat or merge multiple segments into one.
//        Each segment of dialogue or narration should be a separate entry.
//      - **No extra commentary** outside of the JSON object. Do not include additional explanations or disclaimers.

//   5. **Example Output** (for reference only, do not repeat in your final answer):
//   {
//     "segments": [
//       {
//         "type": "DIALOGUE",
//         "text": "Let it come,",
//         "speaker": "Skar",
//         "gender": "MALE"
//       },
//       {
//         "type": "NARRATION",
//         "text": "Skar said quietly from the other side of the line.",
//         "speaker": "Narrator"
//       },
//       {
//         "type": "DIALOGUE",
//         "text": "They want us dead? Well, I’m not going to back down. We’ll show them what courage is. They can hide behind our bridges while we charge.",
//         "speaker": "Skar",
//         "gender": "MALE"
//       },
//       {
//         "type": "DIALOGUE",
//         "text": "That’s no victory,",
//         "speaker": "Moash",
//         "gender": "MALE"
//       },
//       {
//         "type": "NARRATION",
//         "text": "Moash said.",
//         "speaker": "Narrator"
//       }
//     ],
//     "speakersIdentified": {
//       "Skar": "MALE",
//       "Moash": "MALE"
//     }
//   }
//   Annotated Text:
//   ${annotatedChunk}

//   Here's some context of the previous API call: ${contextPart}
//   `;

//   try {
//     // Call the Gemini API with the prompt.
//     const result = await model.generateContent(prompt);
//     console.log("✅ Gemini API response:", result.response.text());

//     let parsedChunk: any = null;
//     try {
//       parsedChunk = JSON.parse(result.response.text());
//       console.log("✅ Parsed structured response:", parsedChunk);
//     } catch (err) {
//       console.error("Failed to parse JSON:", err);
//     }

//     if (!parsedChunk || !parsedChunk.segments) {
//       res.status(500).json({ error: "Failed to parse segments" });
//       return;
//     }

//     // Limit segment lengths for TTS.
//     const limitedSegments: any[] = [];
//     for (const segment of parsedChunk.segments) {
//       if (segment.text.length > MAX_TTS_CHUNK_LENGTH) {
//         const chunkedTexts = splitTextForTTS(segment.text, MAX_TTS_CHUNK_LENGTH);
//         for (const chunk of chunkedTexts) {
//           limitedSegments.push({
//             type: segment.type,
//             speaker: segment.speaker,
//             text: chunk,
//             gender: segment.gender,
//           });
//         }
//       } else {
//         limitedSegments.push(segment);
//       }
//     }

//     res.status(200).json({ segments: limitedSegments });
//   } catch (error: any) {
//     console.error("❌ Error processing text:", error.message || error);
//     res.status(500).json({ error: "Failed to process text", details: error.message });
//   }
// }



import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export interface ParsedSegment {
  type: "DIALOGUE" | "NARRATION";
  speaker: string;
  text: string;
  gender: "MALE" | "FEMALE";
}

export interface ParseResponse {
  segments: ParsedSegment[];
  speakersIdentified?: Record<string, "MALE" | "FEMALE">;
}


const MAX_TTS_CHUNK_LENGTH = 300;

// Utility functions from the original file
function splitTextForTTS(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    if (text.length - startIndex <= maxLength) {
      chunks.push(text.slice(startIndex).trim());
      break;
    }

    let endIndex = startIndex + maxLength;
    const slice = text.slice(startIndex, endIndex);

    const punctuationMarks = [".", "?", "!"];
    let breakIndex = -1;
    for (const mark of punctuationMarks) {
      const index = slice.lastIndexOf(mark);
      if (index > breakIndex) {
        breakIndex = index;
      }
    }

    if (breakIndex !== -1) {
      endIndex = startIndex + breakIndex + 1;
    } else {
      const lastSpaceIndex = slice.lastIndexOf(" ");
      if (lastSpaceIndex !== -1) {
        endIndex = startIndex + lastSpaceIndex;
      }
    }

    chunks.push(text.slice(startIndex, endIndex).trim());
    startIndex = endIndex;
  }
  
  return chunks;
}

function annotateChunkWithCompromise(text: string): string {
  const dialogueRegex = /(?<=^|\s)([""''])([\s\S]+?)([""''])(?=\s|$|[.,!?])/g;
  type Segment = { type: "dialogue" | "narration"; text: string };
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match;

  while ((match = dialogueRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const narrationText = text.slice(lastIndex, match.index).trim();
      if (narrationText.length > 0) {
        segments.push({ type: "narration", text: narrationText });
      }
    }
    const dialogueText = match[0].trim();
    segments.push({ type: "dialogue", text: dialogueText });
    lastIndex = dialogueRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex).trim();
    if (remainingText.length > 0) {
      segments.push({ type: "narration", text: remainingText });
    }
  }

  const processedSegments = segments.map(seg => ({
    type: seg.type === "dialogue" ? "DIALOGUE" : "NARRATION",
    text: seg.text
      .replace(/([.!?])([A-Z])/g, "$1 $2")
      .replace(/([.!?])([""'])/g, "$1 $2")
  }));

  return JSON.stringify({ segments: processedSegments });
}

// Create a service for text parsing
export const textParsingService = {
  async parseText(text: string, context?: string): Promise<ParseResponse> {
    // Ensure API key is available
    // Ensure API key is available
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error("Gemini API key is not configured");
    }
    
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

    const schema = {
      description: "Parsed text segments for audiobook narration",
      type: SchemaType.OBJECT,
      properties: {
        segments: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              speaker: { type: SchemaType.STRING, description: "Speaker Name" },
              text: { type: SchemaType.STRING, description: "Content spoken or narrated" },
              gender: {
                type: SchemaType.STRING,
                enum: ["MALE", "FEMALE"],
                description: "Gender of speaker",
              },
            },
            required: ["speaker", "text", "gender"],
          },
        },
      },
      required: ["segments"],
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema as any,
      },
    });

    const annotatedChunk = annotateChunkWithCompromise(text);
    const contextPart = context ? `\nContext Summary:\n${context}\n` : "";

    const prompt = `
    you are given a JSON array of text segments. Each segment has:

    type: "dialogue" or "narration"
    text: raw sentence
    speaker: a name or "Narrator"
    gender: a gender label
    Your tasks:

    Validate classification: If a segment is incorrectly labeled (dialogue vs. narration), correct it.
    Example: A sentence in quotes labeled as "narration" should be "dialogue." A short exclamation like "He would not!" might be dialogue if it's obviously speech.
    Assign speakers: Infer who is speaking from context or turn-taking; do not mix up speaker names when multiple characters alternate lines.
    Example: If two characters speak in alternating lines, label them consistently: speaker A, then speaker B, then A, then B, and so on.
    Gender:
    Narration always has "speaker": "Narrator" and "gender": "MALE".
    Dialogue should have "gender" inferred from context. If unclear, use "UNKNOWN".
    Example: "Syl?" (spoken by Syl) → "gender": "FEMALE", or "Kaladin said" → "gender": "MALE".
    Output only valid JSON containing:
    "segments": the revised list of segments (type, text, speaker, gender), all properly labeled.
    "speakersIdentified": a dictionary mapping speaker names to their inferred genders.
    No additional commentary—only return this JSON.

    Annotated Text:
    ${annotatedChunk}

    Here's some context of the previous API call: ${contextPart}
    `;

    try {
      const result = await model.generateContent(prompt);
      const parsedChunk = JSON.parse(result.response.text());

      // Limit segment lengths for TTS
      const limitedSegments: ParsedSegment[] = [];
      for (const segment of parsedChunk.segments) {
        if (segment.text.length > MAX_TTS_CHUNK_LENGTH) {
          const chunkedTexts = splitTextForTTS(segment.text, MAX_TTS_CHUNK_LENGTH);
          for (const chunk of chunkedTexts) {
            limitedSegments.push({
              type: segment.type,
              speaker: segment.speaker,
              text: chunk,
              gender: segment.gender,
            });
          }
        } else {
          limitedSegments.push(segment);
        }
      }

      return {
        segments: limitedSegments,
        speakersIdentified: parsedChunk.speakersIdentified
      };
    } catch (error) {
      console.error("Error processing text:", error);
      throw new Error("Failed to parse text segments");
    }
  }
};

// Hook for easier usage in components
export const useTextParsing = () => {
  const parseText = async (text: string, context?: string) => {
    try {
      return await textParsingService.parseText(text, context);
    } catch (error) {
      console.error("Text parsing error:", error);
      return null;
    }
  };

  return { parseText };
};