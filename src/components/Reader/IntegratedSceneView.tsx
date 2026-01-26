import React, { useState, useEffect } from 'react';
import { ChevronLeft, MoreHorizontal, Loader2 } from 'lucide-react';
import type { Scene } from '../../types/fullCast';
import './IntegratedSceneView.css';

interface IntegratedSceneViewProps {
    scene: Scene | null;
    bookTitle: string;
    imageUrl: string | null | undefined;
    isLoading: boolean;
    onClose: () => void;
}

const IntegratedSceneView: React.FC<IntegratedSceneViewProps> = ({
    scene,
    bookTitle,
    imageUrl,
    isLoading,
    onClose
}) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        if (imageUrl) {
            setImageLoaded(false);
            setImageError(false);
        }
    }, [imageUrl]);

    return (
        <div className="integrated-scene-view">
            {/* Header matching the design */}
            <div className="integrated-scene-header">
                <button className="back-btn" onClick={onClose} title="Exit Picture Mode">
                    <ChevronLeft size={24} />
                </button>
                <div className="header-title-container">
                    <p className="ai-viz-label">✨ AI VISUALIZATION</p>
                    <div className="book-title-mini-wrapper">
                        <h2 className="book-title-mini">{bookTitle}</h2>
                    </div>
                </div>
                <button className="more-btn">
                    <MoreHorizontal size={24} />
                </button>
            </div>

            {/* Image Container */}
            <div className="integrated-image-container">
                {isLoading && !imageUrl ? (
                    <div className="scene-loading-state">
                        <Loader2 className="animate-spin text-amber-500" size={32} />
                        <p>Generating Scene...</p>
                    </div>
                ) : imageUrl ? (
                    <>
                        <img
                            src={imageUrl}
                            alt={scene?.scene_description || 'AI Generated Scene'}
                            className={`scene-image ${imageLoaded ? 'loaded' : ''}`}
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageError(true)}
                        />

                        {!imageLoaded && !imageError && (
                            <div className="scene-image-placeholder">
                                <Loader2 className="animate-spin text-amber-500" size={24} />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="scene-empty-state">
                        <p>No image generated for this scene.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IntegratedSceneView;
