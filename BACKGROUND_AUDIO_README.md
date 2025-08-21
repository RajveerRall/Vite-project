# Background Audio System for Ebook Reader

This system enables **background audio playback** for your TTS (Text-to-Speech) functionality, allowing audio to continue playing even when the screen is turned off or the app is in the background.

## 🚀 Features

- ✅ **Background Audio Playback**: Audio continues when app is minimized
- ✅ **Screen Off Support**: Works when device screen is turned off
- ✅ **Service Worker Integration**: Keeps audio alive in background
- ✅ **Advanced Controls**: Play, pause, skip, volume, playback speed
- ✅ **Progress Tracking**: Visual progress bar and time display
- ✅ **Chunk Navigation**: Skip between text chunks
- ✅ **Wake Lock Support**: Prevents device from sleeping during playback
- ✅ **Notification Controls**: Control audio from system notifications

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Reader App    │    │ Background Audio │    │ Service Worker  │
│                 │◄──►│     Service      │◄──►│                 │
│  - TTS Hook     │    │  - Web Audio API │    │  - Background   │
│  - Controls     │    │  - Audio Buffer  │    │  - Sync         │
│  - UI           │    │  - Chunk Mgmt    │    │  - Cache        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📱 Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Background Audio | ✅ | ✅ | ⚠️* | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Wake Lock | ✅ | ❌ | ❌ | ✅ |
| Background Sync | ✅ | ❌ | ❌ | ✅ |

*Safari has strict limitations on background audio

## 🛠️ Installation & Setup

### 1. Files Added

- `src/services/BackgroundAudioService.ts` - Core audio service
- `src/hooks/useBackgroundAudio.ts` - React hook for audio controls
- `src/components/Reader/BackgroundAudioControls.tsx` - UI controls
- `public/worker.js` - Service worker for background support
- CSS styles added to `Reader.css`

### 2. Service Worker Registration

The service worker is automatically registered when you use the `useBackgroundAudio` hook. Make sure your `worker.js` is accessible at the root of your public folder.

### 3. Basic Integration

```tsx
import { useBackgroundAudio } from '../hooks/useBackgroundAudio';

const MyComponent = () => {
  const {
    isPlaying,
    play,
    pause,
    stop,
    setAudioChunks,
    enableBackgroundPlayback
  } = useBackgroundAudio();

  // Set up audio chunks
  useEffect(() => {
    setAudioChunks(textChunks, audioUrls);
  }, [textChunks, audioUrls]);

  // Enable background features
  const handleEnableBackground = async () => {
    await enableBackgroundPlayback();
  };

  return (
    <div>
      <button onClick={play}>Play</button>
      <button onClick={pause}>Pause</button>
      <button onClick={stop}>Stop</button>
      <button onClick={handleEnableBackground}>Enable Background</button>
    </div>
  );
};
```

## 🎮 Usage Examples

### Example 1: Basic TTS Integration

```tsx
import BackgroundAudioControls from './BackgroundAudioControls';

const TTSComponent = () => {
  const [chunks, setChunks] = useState([]);
  const [audioUrls, setAudioUrls] = useState([]);

  return (
    <BackgroundAudioControls
      ttsChunks={chunks}
      ttsAudioUrls={audioUrls}
      onTTSStateChange={(isPlaying) => console.log('TTS:', isPlaying)}
      theme="light"
    />
  );
};
```

### Example 2: Custom Audio Controls

```tsx
const CustomAudioPlayer = () => {
  const {
    isPlaying,
    currentChunkIndex,
    totalChunks,
    play,
    pause,
    skipToChunk,
    setPlaybackRate
  } = useBackgroundAudio();

  return (
    <div className="custom-player">
      <div className="progress">
        Chunk {currentChunkIndex + 1} of {totalChunks}
      </div>
      
      <div className="controls">
        <button onClick={isPlaying ? pause : play}>
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        
        <button onClick={() => skipToChunk(currentChunkIndex - 1)}>
          ⏮️
        </button>
        
        <button onClick={() => skipToChunk(currentChunkIndex + 1)}>
          ⏭️
        </button>
      </div>
      
      <select onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}>
        <option value={0.5}>0.5x</option>
        <option value={1.0}>1.0x</option>
        <option value={1.5}>1.5x</option>
        <option value={2.0}>2.0x</option>
      </select>
    </div>
  );
};
```

### Example 3: Advanced Integration with Existing TTS

```tsx
const AdvancedTTSIntegration = () => {
  // Your existing TTS hook
  const ttsHook = useReaderTTS({...});
  
  // Background audio hook
  const backgroundAudio = useBackgroundAudio();
  
  // Sync TTS chunks with background audio
  useEffect(() => {
    if (ttsHook.chunks.length > 0) {
      // Convert TTS chunks to audio URLs
      const audioUrls = ttsHook.chunks.map(chunk => 
        generateAudioUrl(chunk) // Your TTS API call
      );
      
      backgroundAudio.setAudioChunks(ttsHook.chunks, audioUrls);
    }
  }, [ttsHook.chunks]);
  
  // Handle TTS state changes
  const handleTTSStateChange = (isPlaying: boolean) => {
    if (isPlaying) {
      // Start background audio
      backgroundAudio.play();
    } else {
      // Stop background audio
      backgroundAudio.stop();
    }
  };
  
  return (
    <div>
      {/* Your existing TTS controls */}
      <button onClick={ttsHook.handleTTS}>
        {ttsHook.isSpeaking ? 'Stop' : 'Start'} TTS
      </button>
      
      {/* Background audio controls */}
      <BackgroundAudioControls
        ttsChunks={ttsHook.chunks}
        ttsAudioUrls={audioUrls}
        onTTSStateChange={handleTTSStateChange}
        theme="light"
      />
    </div>
  );
};
```

## 🔧 Configuration Options

### Audio Settings

```tsx
const audioService = useBackgroundAudio();

// Set playback rate (0.5x to 2.0x)
audioService.setPlaybackRate(1.5);

// Set volume (0.0 to 1.0)
audioService.setVolume(0.8);

// Skip to specific chunk
audioService.skipToChunk(5);
```

### Background Features

```tsx
// Enable background playback
await audioService.enableBackgroundPlayback();

// Request notification permissions
const hasPermission = await audioService.requestNotificationPermission();
```

## 🚨 Important Notes

### 1. User Gesture Requirement

**Background audio requires a user gesture** (click, tap) to start. This is a browser security requirement.

```tsx
// ✅ This will work
<button onClick={() => audioService.play()}>Play</button>

// ❌ This won't work
useEffect(() => {
  audioService.play(); // Will fail
}, []);
```

### 2. iOS Safari Limitations

Safari on iOS has strict limitations:
- Audio stops when app goes to background
- No true background playback
- Limited service worker support

### 3. Battery Considerations

Background audio can drain battery:
- Use wake lock sparingly
- Implement auto-pause on low battery
- Consider user preferences

### 4. Audio Format Support

Supported formats:
- ✅ MP3 (recommended)
- ✅ WAV
- ✅ OGG
- ❌ AAC (limited support)

## 🐛 Troubleshooting

### Audio Not Playing

1. Check browser console for errors
2. Verify audio URLs are accessible
3. Ensure user gesture initiated playback
4. Check audio format compatibility

### Background Playback Not Working

1. Verify service worker is registered
2. Check notification permissions
3. Ensure wake lock is supported
4. Test on different browsers

### Chunks Not Syncing

1. Verify `setAudioChunks` is called
2. Check chunk array lengths match
3. Ensure audio URLs are valid
4. Check TTS integration

## 📚 API Reference

### useBackgroundAudio Hook

```tsx
const {
  // State
  isPlaying: boolean,
  isPaused: boolean,
  currentChunkIndex: number,
  totalChunks: number,
  currentTime: number,
  totalDuration: number,
  playbackRate: number,
  
  // Controls
  play: () => Promise<void>,
  pause: () => void,
  resume: () => Promise<void>,
  stop: () => void,
  skipToChunk: (index: number) => Promise<void>,
  setPlaybackRate: (rate: number) => void,
  setVolume: (volume: number) => void,
  
  // Audio Management
  setAudioChunks: (chunks: string[], urls: string[]) => void,
  clearAudioChunks: () => void,
  
  // Background Features
  enableBackgroundPlayback: () => Promise<void>,
  requestNotificationPermission: () => Promise<boolean>
} = useBackgroundAudio();
```

### BackgroundAudioControls Component

```tsx
<BackgroundAudioControls
  ttsChunks={string[]}           // Text chunks for TTS
  ttsAudioUrls={string[]}        // Audio URLs for each chunk
  onTTSStateChange={function}    // Callback for state changes
  theme="light"                  // Theme: 'light' | 'dark' | 'sepia'
  className="custom-class"       // Additional CSS classes
/>
```

## 🔮 Future Enhancements

- [ ] Offline audio caching
- [ ] Multiple voice support
- [ ] Audio effects and filters
- [ ] Cross-device sync
- [ ] Analytics and metrics
- [ ] Accessibility improvements

## 📄 License

This background audio system is part of your ebook reader project. Feel free to modify and extend as needed.

## 🤝 Contributing

To improve the background audio system:

1. Test on multiple browsers and devices
2. Consider performance and battery impact
3. Follow accessibility guidelines
4. Add comprehensive error handling
5. Include user preference options

---

**Happy coding! 🎧📚** 