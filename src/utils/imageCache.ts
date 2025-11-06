// Global caches for images to prevent layout shift and preserve blob URLs
// These persist across React re-renders

export const imageDimensionsCache = new Map<string, { width: number; height: number }>();
export const imageBlobUrlCache = new Map<string, string>();

