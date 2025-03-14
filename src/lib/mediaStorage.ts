// lib/mediaStorage.ts
import localforage from "localforage";

// Configure localForage (optional, but helps in naming your store)
localforage.config({
  name: "EbookReaderApp",
  storeName: "mediaStorage",
});

/**
 * Saves the EPUB data.
 * @param data The EPUB data to store (for example, a Base64 string or ArrayBuffer).
 */
export const saveEpub = async (data: string | ArrayBuffer): Promise<void> => {
  await localforage.setItem("epubBook", data);
};

/**
 * Loads the stored EPUB data.
 * @returns The stored EPUB data or null if not found.
 */
export const loadEpub = async (): Promise<string | ArrayBuffer | null> => {
  const data = await localforage.getItem<string | ArrayBuffer>("epubBook");
  return data;
};

/**
 * Saves audio data under a specific key.
 * @param key A unique key to identify the audio (e.g., segment ID or a generated identifier).
 * @param audioData The Blob of audio data.
 */
export const saveAudio = async (key: string, audioData: Blob): Promise<void> => {
  await localforage.setItem(key, audioData);
};

/**
 * Loads the stored audio data for the given key.
 * @param key The key for the audio data.
 * @returns The stored audio Blob or null if not found.
 */
export const loadAudio = async (key: string): Promise<Blob | null> => {
  const data = await localforage.getItem<Blob>(key);
  return data;
};

/**
 * Removes the stored EPUB data.
 */
export const removeEpub = async (): Promise<void> => {
  await localforage.removeItem("epubBook");
};

/**
 * Removes the stored audio data for a given key.
 * @param key The key for the audio data to remove.
 */
export const removeAudio = async (key: string): Promise<void> => {
  await localforage.removeItem(key);
};
