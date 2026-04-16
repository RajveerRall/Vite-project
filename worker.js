// simple-worker.js
console.log("Simple worker started");

// Send a test message
self.postMessage({ status: "test", message: "Worker is running" });

// Import Kokoro and check if it loads
import { KokoroTTS } from 'kokoro-js';
console.log("Kokoro imported successfully");

// Post a message to confirm import worked
self.postMessage({ status: "import_success" });

// Try to load a minimal model
self.postMessage({ status: "loading_model" });

try {
  const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
    dtype: "q8",
    device: "wasm",
  });
  
  console.log("Model loaded in simple worker");
  self.postMessage({ status: "model_loaded" });
} catch (error) {
  console.error("Model loading error in simple worker:", error);
  self.postMessage({ status: "model_error", error: error.message });
}