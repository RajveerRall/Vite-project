import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Eye, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Scene } from '../../types/fullCast';
import './FullCastSceneOverlay.css';

interface FullCastSceneOverlayProps {
    scene: Scene | null;
    allScenes: Scene[];
    currentImageIndex: number;
    imageUrl: string | null | undefined;
    isLoading: boolean;
    isVisible: boolean;
    onToggle: () => void;
    onManualNavigate: (index: number) => void;
}

const FullCastSceneOverlay: React.FC<FullCastSceneOverlayProps> = ({
    scene,
    allScenes = [],
    currentImageIndex,
    imageUrl,
    isLoading,
    isVisible,
    onToggle,
    onManualNavigate
}) => {
    const [finalPosition, setFinalPosition] = useState({ x: 20, y: 100 });
    const [finalWidth, setFinalWidth] = useState(320);
    const overlayRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const isResizing = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ width: 0, x: 0 });

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.fullcast-overlay-header')) {
            isDragging.current = true;
            dragOffset.current = {
                x: e.clientX - (overlayRef.current?.offsetLeft || 0),
                y: e.clientY - (overlayRef.current?.offsetTop || 0)
            };
            document.body.style.userSelect = 'none';
        }
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if ((e.target as HTMLElement).closest('.fullcast-overlay-header')) {
            isDragging.current = true;
            const touch = e.touches[0];
            dragOffset.current = {
                x: touch.clientX - (overlayRef.current?.offsetLeft || 0),
                y: touch.clientY - (overlayRef.current?.offsetTop || 0)
            };
            document.body.style.overflow = 'hidden';
        }
    }, []);

    const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        isResizing.current = true;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        resizeStart.current = {
            width: overlayRef.current?.offsetWidth || 0,
            x: clientX
        };
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'nwse-resize';
    }, []);

    useEffect(() => {
        const handleMove = (clientX: number, clientY: number) => {
            if (!overlayRef.current) return;

            if (isDragging.current) {
                const newX = clientX - dragOffset.current.x;
                const newY = clientY - dragOffset.current.y;
                overlayRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
            }

            if (isResizing.current) {
                const deltaX = clientX - resizeStart.current.x;
                const newWidth = Math.max(280, resizeStart.current.width + deltaX);
                overlayRef.current.style.width = `${newWidth}px`;
            }
        };

        const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const onTouchMove = (e: TouchEvent) => {
            if (isDragging.current || isResizing.current) {
                e.preventDefault();
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };

        const onEnd = () => {
            if (isDragging.current || isResizing.current) {
                if (overlayRef.current) {
                    const rect = overlayRef.current.getBoundingClientRect();
                    setFinalPosition({ x: rect.left, y: rect.top });
                    setFinalWidth(overlayRef.current.offsetWidth);
                }
                isDragging.current = false;
                isResizing.current = false;
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onEnd);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onEnd);
        };
    }, []);

    useEffect(() => {
        if (overlayRef.current) {
            overlayRef.current.style.transform = `translate(${finalPosition.x}px, ${finalPosition.y}px)`;
            overlayRef.current.style.width = `${finalWidth}px`;
        }
    }, [finalPosition, finalWidth]);

    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        if (imageUrl) {
            setImageLoaded(false);
            setImageError(false);
        }
    }, [imageUrl]);

    if (!isVisible) {
        return (
            <button onClick={onToggle} className="fullcast-toggle-button-floating" title="Show scene images">
                <Eye size={20} />
            </button>
        );
    }

    const hasPrev = currentImageIndex > 0;
    const hasNext = currentImageIndex < (allScenes.length - 1);

    return (
        <div
            ref={overlayRef}
            className="fullcast-overlay"
            style={{ width: finalWidth, touchAction: 'none' }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
        >
            <div className="fullcast-overlay-header">
                <h3>Scene {currentImageIndex + 1} / {Math.max(1, allScenes.length)}</h3>
                <div className="header-actions">
                    <button className="icon-btn" onClick={onToggle} onTouchEnd={onToggle} title="Hide overlay">
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="fullcast-overlay-body">
                {isLoading && !imageUrl ? (
                    <div className="fullcast-loading-message">
                        <Loader2 className="spinner" size={24} />
                        <span>Generating scenes...</span>
                    </div>
                ) : imageUrl ? (
                    <div className="fullcast-image-container">
                        <img
                            src={imageUrl}
                            alt={scene?.scene_description || 'Generated Scene'}
                            className={`fullcast-image ${imageLoaded ? 'loaded' : ''}`}
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageError(true)}
                        />

                        {!imageLoaded && !imageError && (
                            <div className="image-loader">
                                <Loader2 className="spinner" size={20} />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="fullcast-placeholder">
                        {isLoading ? (
                            <div className="fullcast-loading-message">
                                <Loader2 className="spinner" size={24} />
                                <span>Generating scene...</span>
                            </div>
                        ) : (
                            <p>No image available.</p>
                        )}
                    </div>
                )}

                <div className="fullcast-nav-controls">
                    <button
                        className="nav-arrow left"
                        disabled={!hasPrev}
                        onClick={(e) => { e.stopPropagation(); onManualNavigate(currentImageIndex - 1); }}
                        onTouchEnd={(e) => { e.stopPropagation(); if (hasPrev) onManualNavigate(currentImageIndex - 1); }}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        className="nav-arrow right"
                        disabled={!hasNext}
                        onClick={(e) => { e.stopPropagation(); onManualNavigate(currentImageIndex + 1); }}
                        onTouchEnd={(e) => { e.stopPropagation(); if (hasNext) onManualNavigate(currentImageIndex + 1); }}
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                {scene && (
                    <div className="scene-caption">
                        <p>{scene.anchor_text}</p>
                    </div>
                )}
            </div>
            <div
                className="resize-handle"
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
            />
        </div>
    );
};

export default FullCastSceneOverlay;
