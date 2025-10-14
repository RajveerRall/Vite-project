import { useState, useCallback } from 'react';
import { AudiobookGenerator, AudiobookOptions, AudiobookProgress, Chapter, ChapterAudio } from '../services/AudiobookGenerator';

export interface UseAudiobookGeneration {
  isInitializing: boolean;
  isGenerating: boolean;
  progress: AudiobookProgress | null;
  error: string | null;
  chapters: Chapter[];
  chapterAudios: ChapterAudio[];
  extractChapters: (epubFile: File) => Promise<void>;
  generateSingleChapter: (chapterIndex: number, options: AudiobookOptions) => Promise<void>;
  downloadChapter: (chapterIndex: number) => void;
  reset: () => void;
}

export function useAudiobookGeneration(): UseAudiobookGeneration {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<AudiobookProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterAudios, setChapterAudios] = useState<ChapterAudio[]>([]);
  const [generator] = useState(() => new AudiobookGenerator());

  const extractChapters = useCallback(async (epubFile: File): Promise<void> => {
    setIsInitializing(true);
    setError(null);
    setProgress(null);
    setChapters([]);
    setChapterAudios([]);

    try {
      // Initialize generator if needed
      await generator.initialize((progress) => {
        setProgress(progress);
      });

      // Extract chapters
      const extractedChapters = await generator.extractChaptersOnly(epubFile);
      setChapters(extractedChapters);
      
      // Initialize chapter audios array
      const initialChapterAudios: ChapterAudio[] = extractedChapters.map(chapter => ({
        chapterIndex: chapter.index,
        title: chapter.title,
        audioBlob: new Blob([''], { type: 'audio/wav' }),
        duration: 0,
        startTime: 0,
        isGenerated: false,
        isGenerating: false
      }));
      setChapterAudios(initialChapterAudios);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, [generator]);

  const generateSingleChapter = useCallback(async (
    chapterIndex: number, 
    options: AudiobookOptions
  ): Promise<void> => {
    const chapter = chapters.find(c => c.index === chapterIndex);
    if (!chapter) {
      setError(`Chapter ${chapterIndex} not found`);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Update chapter audio state to show it's generating
      setChapterAudios(prev => prev.map(ca => 
        ca.chapterIndex === chapterIndex 
          ? { ...ca, isGenerating: true, error: undefined }
          : ca
      ));

      // Generate audio for the chapter
      const chapterAudio = await generator.generateSingleChapter(chapter, options, (progress) => {
        setProgress({
          stage: 'generating',
          currentChapter: chapterIndex + 1,
          totalChapters: chapters.length,
          progress: progress,
          estimatedTime: 'Generating...',
          currentAction: `Generating audio for: ${chapter.title}`
        });
      });

      // Update chapter audio state with the result
      setChapterAudios(prev => prev.map(ca => 
        ca.chapterIndex === chapterIndex 
          ? chapterAudio
          : ca
      ));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Update chapter audio state to show error
      setChapterAudios(prev => prev.map(ca => 
        ca.chapterIndex === chapterIndex 
          ? { ...ca, isGenerating: false, error: errorMessage }
          : ca
      ));
    } finally {
      setIsGenerating(false);
    }
  }, [generator, chapters]);

  const downloadChapter = useCallback((chapterIndex: number): void => {
    const chapterAudio = chapterAudios.find(ca => ca.chapterIndex === chapterIndex);
    if (!chapterAudio || !chapterAudio.isGenerated) {
      setError('Chapter audio not available for download');
      return;
    }

    const url = URL.createObjectURL(chapterAudio.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chapterAudio.title.replace(/[^a-zA-Z0-9]/g, '_')}.m4a`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [chapterAudios]);

  const reset = useCallback(() => {
    setIsInitializing(false);
    setIsGenerating(false);
    setProgress(null);
    setError(null);
    setChapters([]);
    setChapterAudios([]);
  }, []);

  return {
    isInitializing,
    isGenerating,
    progress,
    error,
    chapters,
    chapterAudios,
    extractChapters,
    generateSingleChapter,
    downloadChapter,
    reset
  };
}
