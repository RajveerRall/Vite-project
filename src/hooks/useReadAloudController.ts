import { useMemo, useState, useCallback } from 'react';
import { transition, ReadAloudState, ReadAloudContext } from '../services/tts/readAloudMachine';
import { createReadAloudCommands, ReaderTTSApi } from '../services/tts/readAloudCommands';

export interface ReadAloudController {
  state: ReadAloudState;
  label: string;
  isBusy: boolean;
  isDisabled: boolean;
  onClick: (selectedText?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

export function useReadAloudController(ttsApi: ReaderTTSApi): ReadAloudController {
  const [state, setState] = useState<ReadAloudState>('idle');
  const [ctx, setCtx] = useState<ReadAloudContext>({});

  const commands = useMemo(() => createReadAloudCommands(ttsApi), [ttsApi]);

  const send = useCallback((event: Parameters<typeof transition>[1]) => {
    const next = transition(state, event, ctx);
    setState(next.state);
    setCtx(next.ctx);
  }, [state, ctx]);

  const onClick = useCallback((selectedText?: string) => {
    if (state === 'idle' || state === 'error') {
      send({ type: 'CLICK' });
      // We don't block here; ttsApi handles checks and prepares first chunk non-blocking
      commands.start(selectedText);
      // Optimistically move through states (controller is view-only, side-effects happen in hook)
      send({ type: 'LIMIT_OK' });
      send({ type: 'PREPARED' });
      return;
    }
    if (state === 'playing') {
      commands.pause();
      send({ type: 'PAUSE' });
      return;
    }
    if (state === 'paused') {
      commands.resume();
      send({ type: 'PLAY' });
      return;
    }
  }, [state, commands, send]);

  const pause = useCallback(() => {
    commands.pause();
    send({ type: 'PAUSE' });
  }, [commands, send]);

  const resume = useCallback(() => {
    commands.resume();
    send({ type: 'PLAY' });
  }, [commands, send]);

  const stop = useCallback(() => {
    commands.stop();
    send({ type: 'STOP' });
  }, [commands, send]);

  const { label, isBusy, isDisabled } = useMemo(() => {
    switch (state) {
      case 'idle':
        return { label: 'Read Aloud', isBusy: false, isDisabled: false };
      case 'checkingLimit':
      case 'preparing':
        return { label: 'Starting...', isBusy: true, isDisabled: true };
      case 'playing':
        return { label: 'Pause', isBusy: false, isDisabled: false };
      case 'paused':
        return { label: 'Resume', isBusy: false, isDisabled: false };
      case 'error':
        return { label: 'Retry', isBusy: false, isDisabled: false };
      default:
        return { label: 'Read Aloud', isBusy: false, isDisabled: false };
    }
  }, [state]);

  return { state, label, isBusy, isDisabled, onClick, pause, resume, stop };
}


