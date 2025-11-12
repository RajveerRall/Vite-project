// Finite State Machine for Read Aloud button workflow
// Pure, testable transitions

export type ReadAloudState =
  | 'idle'
  | 'checkingLimit'
  | 'preparing'
  | 'playing'
  | 'paused'
  | 'error';

export type ReadAloudEvent =
  | { type: 'CLICK' }
  | { type: 'LIMIT_OK' }
  | { type: 'LIMIT_BLOCKED'; message?: string }
  | { type: 'PREPARED' }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'STOP' }
  | { type: 'ERROR'; message?: string };

export interface ReadAloudContext {
  errorMessage?: string;
}

export function transition(
  state: ReadAloudState,
  event: ReadAloudEvent,
  ctx: ReadAloudContext = {}
): { state: ReadAloudState; ctx: ReadAloudContext } {
  switch (state) {
    case 'idle':
      if (event.type === 'CLICK') return { state: 'checkingLimit', ctx };
      return { state, ctx };
    case 'checkingLimit':
      if (event.type === 'LIMIT_OK') return { state: 'preparing', ctx };
      if (event.type === 'LIMIT_BLOCKED') return { state: 'error', ctx: { errorMessage: event.message } };
      if (event.type === 'ERROR') return { state: 'error', ctx: { errorMessage: event.message } };
      return { state, ctx };
    case 'preparing':
      if (event.type === 'PREPARED') return { state: 'playing', ctx };
      if (event.type === 'ERROR') return { state: 'error', ctx: { errorMessage: event.message } };
      return { state, ctx };
    case 'playing':
      if (event.type === 'PAUSE') return { state: 'paused', ctx };
      if (event.type === 'STOP') return { state: 'idle', ctx: {} };
      if (event.type === 'ERROR') return { state: 'error', ctx: { errorMessage: event.message } };
      return { state, ctx };
    case 'paused':
      if (event.type === 'PLAY') return { state: 'playing', ctx };
      if (event.type === 'STOP') return { state: 'idle', ctx: {} };
      if (event.type === 'ERROR') return { state: 'error', ctx: { errorMessage: event.message } };
      return { state, ctx };
    case 'error':
      if (event.type === 'CLICK') return { state: 'checkingLimit', ctx: {} };
      return { state, ctx };
    default:
      return { state: 'idle', ctx: {} };
  }
}


