// ClientTtsService.js
import { KokoroTTS, TextSplitterStream } from "kokoro-js";

class ClientTtsService {
  constructor() {
    this.tts = null;
    this.initialized = false;
    this.currentStream = null;
    this.audioContext = null;
    this.speakers = {};
    this.audioQueue = [];
    this.isProcessing = false;
  }

  // Initialize the TTS engine
  async initialize() {
    if (this.initialized) return;
    
    try {
      const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
      this.tts = await KokoroTTS.from_pretrained(model_id, {
        dtype: "fp32",
        // Use WebGPU if available, otherwise fall back to wasm
        device: "webgpu" in navigator ? "webgpu" : "wasm"
      });
      
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
      console.log("✅ TTS engine initialized");
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize TTS engine:", error);
      return false;
    }
  }

  // Set voice mapping for speakers
  setVoiceMapping(voiceMapping) {
    this.speakers = voiceMapping;
  }

  // Get the voice for a speaker
  getVoiceForSpeaker(speaker, gender) {
    const speakerKey = speaker.trim().toLowerCase();
    
    // Override for narrator
    if (speakerKey === "narrator") {
      return { voice: "bm_george", source: "predefined" };
    }
    
    // Check if we have a specific voice mapping for this speaker
    if (this.speakers[speakerKey]) {
      return this.speakers[speakerKey];
    }
    
    // Default to bm_george if no specific voice is found
    return { voice: "bm_george", source: "predefined" };
  }

  // Play audio from AudioBuffer
  async playAudioBuffer(audioBuffer) {
    return new Promise((resolve) => {
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => {
        resolve();
      };
      
      source.start(0);
    });
  }

  // Process the audio queue
  async processQueue() {
    if (this.isProcessing || this.audioQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.audioQueue.length > 0) {
      const audioBuffer = this.audioQueue.shift();
      await this.playAudioBuffer(audioBuffer);
    }
    
    this.isProcessing = false;
  }

  // Speak text with specified voice
  async speak(text, speaker, gender) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.tts) {
      throw new Error("TTS engine not initialized");
    }

    const voiceAssignment = this.getVoiceForSpeaker(speaker, gender);
    const finalVoice = voiceAssignment.voice;

    console.log(`🎤 Speaking as: ${speaker}, using voice: ${finalVoice}`);

    try {
      // Set up the stream
      const splitter = new TextSplitterStream();
      const stream = this.tts.stream(splitter, { voice: finalVoice });

      // Process stream chunks
      (async () => {
        for await (const { audio } of stream) {
          // Convert the audio data to AudioBuffer
          const audioArrayBuffer = await audio.arrayBuffer();
          this.audioContext.decodeAudioData(audioArrayBuffer, (audioBuffer) => {
            this.audioQueue.push(audioBuffer);
            
            if (!this.isProcessing) {
              this.processQueue();
            }
          });
        }
      })();

      // Push the text into the splitter
      splitter.push(text);
      splitter.close();

      return true;
    } catch (error) {
      console.error("❌ TTS error:", error);
      throw error;
    }
  }

  // Stop any ongoing speech
  stop() {
    if (this.audioContext) {
      this.audioContext.close().then(() => {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      });
      this.audioQueue = [];
      this.isProcessing = false;
    }
  }
}

// Create singleton instance
const ttsService = new ClientTtsService();

export default ttsService;
