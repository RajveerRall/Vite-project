/**
 * Utility function to trigger Kokoro TTS wake-up call
 * This helps reduce cold start times for serverless TTS providers
 */
export async function triggerKokoroWakeup(): Promise<void> {
  try {
    const baseURL = (import.meta as any).env?.VITE_FULL_CAST_TTS_URL || 'http://161.35.186.252:4001';
    
    // Don't await; short timeout via AbortController
    const controller = new AbortController();
    setTimeout(() => { 
      try { 
        controller.abort(); 
      } catch {} 
    }, 2000);
    
    // Fire-and-forget wake-up call
    fetch(`${baseURL}/api/warmup/kokoro`, { 
      method: 'POST', 
      signal: controller.signal 
    }).catch(() => {
      // Silently ignore errors - this is a best-effort optimization
    });
    
    console.log('[Kokoro Wakeup] Triggered wake-up call');
  } catch (error) {
    // Silently ignore errors - this is a best-effort optimization
    console.log('[Kokoro Wakeup] Failed to trigger wake-up call:', error);
  }
}
