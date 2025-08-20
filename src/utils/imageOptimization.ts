// Image optimization utilities for better performance

export interface ResponsiveImageSizes {
  sm: number;  // Small screens (mobile)
  md: number;  // Medium screens (tablet)
  lg: number;  // Large screens (desktop)
}

export const DEFAULT_COVER_SIZES: ResponsiveImageSizes = {
  sm: 200,  // 2x for high-DPI displays
  md: 300,
  lg: 400
};

/**
 * Generates responsive image URLs for book covers
 * Automatically converts to WebP when available and provides multiple sizes
 */
export function getResponsiveCoverUrls(
  baseCoverPath: string, 
  sizes: ResponsiveImageSizes = DEFAULT_COVER_SIZES
): {
  src: string;
  srcSet: string;
  sizes: string;
} {
  // Extract the base filename and extension
  const pathParts = baseCoverPath.split('/');
  const filename = pathParts[pathParts.length - 1];
  const nameWithoutExt = filename.split('.')[0];
  const extension = filename.split('.').pop()?.toLowerCase();
  
  // Determine if we should use WebP
  const useWebP = extension !== 'svg' && extension !== 'webp';
  const finalExtension = useWebP ? 'webp' : extension;
  
  // Generate different sizes
  const srcSet = Object.entries(sizes)
    .map(([breakpoint, width]) => {
      const url = `/sample-book-covers-webp/${nameWithoutExt}-${width}w.${finalExtension}`;
      return `${url} ${width}w`;
    })
    .join(', ');
  
  // Default src (medium size)
  const src = `/sample-book-covers-webp/${nameWithoutExt}-${sizes.md}w.${finalExtension}`;
  
  // CSS sizes attribute for responsive behavior
  const sizesAttr = '(max-width: 640px) 200px, (max-width: 1024px) 300px, 400px';
  
  return { src, srcSet, sizes: sizesAttr };
}

/**
 * Generates optimized cover URLs for different display contexts
 */
export function getOptimizedCoverUrl(
  baseCoverPath: string,
  targetWidth: number = 300
): string {
  const pathParts = baseCoverPath.split('/');
  const filename = pathParts[pathParts.length - 1];
  const nameWithoutExt = filename.split('.')[0];
  const extension = filename.split('.').pop()?.toLowerCase();
  
  // Use WebP for better compression (except SVG)
  if (extension !== 'svg' && extension !== 'webp') {
    return `/sample-book-covers-webp/${nameWithoutExt}-${targetWidth}w.webp`;
  }
  
  // Keep original for SVG or already WebP
  return baseCoverPath;
}

/**
 * Preload critical images for better performance
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
    img.src = src;
  });
}

/**
 * Batch preload multiple images
 */
export async function preloadImages(srcs: string[]): Promise<void> {
  const promises = srcs.map(src => preloadImage(src).catch(err => {
    console.warn('Image preload failed:', err);
  }));
  await Promise.all(promises);
} 