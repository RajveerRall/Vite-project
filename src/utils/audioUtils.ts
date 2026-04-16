/**
 * Get duration of an audio blob in seconds
 */
export const getBlobDurationSeconds = async (blob: Blob): Promise<number> => {
    return new Promise((resolve) => {
        const audio = document.createElement('audio');
        const objectUrl = URL.createObjectURL(blob);

        const cleanup = () => {
            audio.removeEventListener('loadedmetadata', onLoaded);
            audio.removeEventListener('error', onError);
            URL.revokeObjectURL(objectUrl);
        };

        const onLoaded = () => {
            const duration = audio.duration;
            cleanup();
            resolve(Number.isFinite(duration) ? duration : 0);
        };

        const onError = () => {
            cleanup();
            resolve(0);
        };

        audio.addEventListener('loadedmetadata', onLoaded);
        audio.addEventListener('error', onError);
        audio.src = objectUrl;

        // Safety timeout
        setTimeout(() => {
            cleanup();
            resolve(0);
        }, 2000);
    });
};
