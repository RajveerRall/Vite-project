/**
 * Centralized error handling for TTS operations
 */

import { TTSError, TTSErrorType } from '../../types/tts';
import { TTS_ERROR_MESSAGES } from '../../constants/tts';

export class TTSErrorHandler {
  /**
   * Create a standardized TTS error
   */
  static createError(
    type: TTSErrorType,
    message: string,
    originalError?: Error | unknown,
    chunkIndex?: number,
    recoverable: boolean = false
  ): TTSError {
    const error = new Error(message) as TTSError;
    error.type = type;
    error.name = 'TTSError';
    error.chunkIndex = chunkIndex;
    error.recoverable = recoverable;
    
    if (originalError instanceof Error) {
      error.cause = originalError;
      error.stack = originalError.stack;
    }
    
    return error;
  }

  /**
   * Handle network errors
   */
  static handleNetworkError(error: unknown, chunkIndex?: number): TTSError {
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      return this.createError(
        'NETWORK_ERROR',
        TTS_ERROR_MESSAGES.NETWORK_ERROR,
        error,
        chunkIndex,
        true
      );
    }
    
    return this.createError(
      'NETWORK_ERROR',
      TTS_ERROR_MESSAGES.NETWORK_ERROR,
      error,
      chunkIndex,
      true
    );
  }

  /**
   * Handle audio playback errors
   */
  static handleAudioError(error: unknown, chunkIndex?: number): TTSError {
    return this.createError(
      'AUDIO_ERROR',
      TTS_ERROR_MESSAGES.AUDIO_ERROR,
      error,
      chunkIndex,
      true
    );
  }

  /**
   * Handle TTS synthesis errors
   */
  static handleSynthesisError(error: unknown, chunkIndex?: number): TTSError {
    if (error instanceof Error && error.message.includes('502')) {
      return this.createError(
        'SYNTHESIS_ERROR',
        TTS_ERROR_MESSAGES.SERVER_ERROR,
        error,
        chunkIndex,
        true
      );
    }
    
    return this.createError(
      'SYNTHESIS_ERROR',
      TTS_ERROR_MESSAGES.SYNTHESIS_ERROR,
      error,
      chunkIndex,
      true
    );
  }

  /**
   * Handle buffer errors
   */
  static handleBufferError(error: unknown, chunkIndex?: number): TTSError {
    return this.createError(
      'BUFFER_ERROR',
      TTS_ERROR_MESSAGES.PREFETCH_ERROR,
      error,
      chunkIndex,
      true
    );
  }

  /**
   * Handle permission errors
   */
  static handlePermissionError(error: unknown): TTSError {
    return this.createError(
      'PERMISSION_ERROR',
      TTS_ERROR_MESSAGES.PERMISSION_ERROR,
      error,
      undefined,
      false
    );
  }

  /**
   * Handle limit exceeded errors
   */
  static handleLimitExceeded(): TTSError {
    return this.createError(
      'LIMIT_EXCEEDED',
      TTS_ERROR_MESSAGES.LIMIT_EXCEEDED,
      undefined,
      undefined,
      false
    );
  }

  /**
   * Handle unknown errors
   */
  static handleUnknownError(error: unknown, chunkIndex?: number): TTSError {
    return this.createError(
      'UNKNOWN_ERROR',
      TTS_ERROR_MESSAGES.UNKNOWN_ERROR,
      error,
      chunkIndex,
      false
    );
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: TTSError): string {
    switch (error.type) {
      case 'NETWORK_ERROR':
        return TTS_ERROR_MESSAGES.NETWORK_ERROR;
      case 'AUDIO_ERROR':
        return TTS_ERROR_MESSAGES.AUDIO_ERROR;
      case 'SYNTHESIS_ERROR':
        return TTS_ERROR_MESSAGES.SYNTHESIS_ERROR;
      case 'BUFFER_ERROR':
        return TTS_ERROR_MESSAGES.PREFETCH_ERROR;
      case 'PERMISSION_ERROR':
        return TTS_ERROR_MESSAGES.PERMISSION_ERROR;
      case 'LIMIT_EXCEEDED':
        return TTS_ERROR_MESSAGES.LIMIT_EXCEEDED;
      default:
        return TTS_ERROR_MESSAGES.UNKNOWN_ERROR;
    }
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: TTSError): boolean {
    return error.recoverable;
  }
}

