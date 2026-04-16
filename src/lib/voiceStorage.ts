// voiceStorage.ts
import type { VoiceAssignment } from "../services/getVoices"; // adjust the path accordingly

const STORAGE_KEY = "voiceAssignments";

export const loadVoiceAssignments = (): { [key: string]: VoiceAssignment } => {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  }
  return {};
};

export const saveVoiceAssignments = (assignments: { [key: string]: VoiceAssignment }): void => {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  }
};
