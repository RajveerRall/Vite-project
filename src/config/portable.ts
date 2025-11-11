/**
 * Portable mode configuration
 * Detects if running in portable desktop app mode and adjusts server URLs
 */

export interface PortableConfig {
  isPortableMode: boolean;
  fullCastTtsUrl: string;
  videoGeneratorUrl: string;
}

/**
 * Detect portable mode by checking for launcher files or environment variables
 */
function detectPortableMode(): boolean {
  // Check for environment variable set by launcher
  if (typeof window !== 'undefined') {
    // Check if we're in Electron or portable mode
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('electron')) {
      return true;
    }
    
    // Check for portable mode flag in localStorage (set by launcher)
    try {
      const portableFlag = localStorage.getItem('yoread_portable_mode');
      if (portableFlag === 'true') {
        return true;
      }
    } catch (e) {
      // localStorage not available
    }
  }
  
  // Check environment variable (set during build or runtime)
  const portableEnv = import.meta.env.VITE_PORTABLE_MODE === 'true';
  return portableEnv;
}

/**
 * Get server URLs based on mode
 */
function getServerUrls(): { fullCastTtsUrl: string; videoGeneratorUrl: string } {
  const portableMode = detectPortableMode();
  
  if (portableMode) {
    // Portable mode: use localhost with default ports
    return {
      fullCastTtsUrl: 'http://localhost:4001',
      videoGeneratorUrl: 'http://localhost:8000',
    };
  }
  
  // Development/Production mode: use environment variables or defaults
  return {
    fullCastTtsUrl: import.meta.env.VITE_FULL_CAST_TTS_URL || 'http://localhost:4001',
    videoGeneratorUrl: import.meta.env.VITE_VIDEO_GENERATOR_URL || 'http://localhost:8000',
  };
}

/**
 * Export configuration
 */
export const portableConfig: PortableConfig = (() => {
  const isPortable = detectPortableMode();
  const urls = getServerUrls();
  
  return {
    isPortableMode: isPortable,
    fullCastTtsUrl: urls.fullCastTtsUrl,
    videoGeneratorUrl: urls.videoGeneratorUrl,
  };
})();

/**
 * Check if servers are reachable
 */
export async function checkServerHealth(): Promise<{
  fullCastHealthy: boolean;
  videoGeneratorHealthy: boolean;
}> {
  const { fullCastTtsUrl, videoGeneratorUrl } = portableConfig;
  
  let fullCastHealthy = false;
  let videoGeneratorHealthy = false;
  
  try {
    const fullCastResponse = await fetch(`${fullCastTtsUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });
    fullCastHealthy = fullCastResponse.ok;
  } catch (e) {
    fullCastHealthy = false;
  }
  
  try {
    const videoGenResponse = await fetch(`${videoGeneratorUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    videoGeneratorHealthy = videoGenResponse.ok;
  } catch (e) {
    videoGeneratorHealthy = false;
  }
  
  return {
    fullCastHealthy,
    videoGeneratorHealthy,
  };
}


