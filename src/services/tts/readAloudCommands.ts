// Command wrappers over useReaderTTS API
// Keeps UI independent of implementation details

export interface ReadAloudCommands {
  start: (selectedText?: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

export interface ReaderTTSApi {
  handleTTS: (selectedText?: string) => void;
  pausePlayback: () => void;
  resumePlayback: () => void;
  handleStopTTS: () => void;
}

export function createReadAloudCommands(api: ReaderTTSApi): ReadAloudCommands {
  return {
    start: async (selectedText?: string) => {
      // Start is fire-and-forget from UI perspective
      api.handleTTS(selectedText);
    },
    pause: () => {
      api.pausePlayback();
    },
    resume: () => {
      api.resumePlayback();
    },
    stop: () => {
      api.handleStopTTS();
    }
  };
}


