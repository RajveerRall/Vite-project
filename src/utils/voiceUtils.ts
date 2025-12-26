/**
 * Voice utility functions for TTS voice management
 * Provides centralized voice name mapping and display name resolution
 */

/**
 * Available voices mapping
 * Matches the voices available in SettingsWidget
 */
const AVAILABLE_VOICES = [
  { id: 'en-US-AvaMultilingualNeural', name: 'Ava (F)' },
  { id: 'en-US-EmmaMultilingualNeural', name: 'Emma (F)' },
  { id: 'en-US-BrianMultilingualNeural', name: 'Brian (M)' },
  { id: 'en-US-AndrewNeural', name: 'Andrew (M)' },
] as const;

/**
 * Get display name for a voice ID
 * @param voiceId - The voice ID (e.g., 'en-US-BrianMultilingualNeural')
 * @returns Display name (e.g., 'Brian (M)') or the voice ID if not found
 */
export function getVoiceDisplayName(voiceId: string): string {
  const voice = AVAILABLE_VOICES.find(v => v.id === voiceId);
  return voice ? voice.name : voiceId;
}

/**
 * Get all available voices
 * @returns Array of voice objects with id and name
 */
export function getAvailableVoices(): Array<{ id: string; name: string }> {
  return [...AVAILABLE_VOICES];
}








