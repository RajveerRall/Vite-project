/**
 * Utility function to play a pleasant notification sound using Web Audio API
 * Generates a two-tone chime sound for user notifications
 */
export async function playNotificationSound(): Promise<void> {
  try {
    // Check if Web Audio API is available
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('[soundNotification] Web Audio API not supported');
      return;
    }

    // Create or reuse AudioContext
    const audioContext = new AudioContextClass();
    
    // Resume AudioContext if suspended (required on some browsers, especially mobile)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // Create gain node for volume control
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.3; // Set volume to 30% to avoid being too loud

    // Play first tone: A4 (440Hz) for 150ms
    const oscillator1 = audioContext.createOscillator();
    oscillator1.type = 'sine';
    oscillator1.frequency.value = 440; // A4
    oscillator1.connect(gainNode);
    
    // Start first tone
    oscillator1.start(0);
    
    // Stop first tone after 150ms
    oscillator1.stop(audioContext.currentTime + 0.15);
    
    // Play second tone: C5 (523Hz) for 150ms, starting 50ms after first tone
    const oscillator2 = audioContext.createOscillator();
    oscillator2.type = 'sine';
    oscillator2.frequency.value = 523.25; // C5
    oscillator2.connect(gainNode);
    
    // Start second tone 50ms after first tone starts (overlapping for smooth transition)
    oscillator2.start(audioContext.currentTime + 0.05);
    
    // Fade out the second tone smoothly
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    // Stop second tone after 150ms
    oscillator2.stop(audioContext.currentTime + 0.2);
    
    // Clean up AudioContext after sound finishes
    setTimeout(() => {
      audioContext.close().catch(err => {
        console.warn('[soundNotification] Error closing AudioContext:', err);
      });
    }, 300);
    
  } catch (error) {
    // Silently handle errors - don't break the flow if sound fails
    console.warn('[soundNotification] Failed to play notification sound:', error);
  }
}

