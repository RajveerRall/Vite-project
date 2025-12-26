export interface Scene {
    sceneIndex: number;
    anchor_text: string;
    scene_description: string;
    image_prompt: string;
    mood: string;
    elements?: string[];
    sourceJustification?: string[];
}

export interface SceneImage {
    sceneIndex: number;
    filename: string;
    filepath: string;
    mimeType: string;
    anchor_text: string;
    scene_description: string;
    url?: string; // Blob URL for display
}

export interface CachedSceneAnalysis {
    scenes: Scene[];
    sceneImages: SceneImage[];
}

export interface SceneAnalysisOptions {
    maxScenes?: number;
    bookTheme?: string;
    colorPalette?: string;
    videoFormat?: 'youtube' | 'mobile';
    styleKey?: string;
}
