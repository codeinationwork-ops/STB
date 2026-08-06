/**
 * Utility functions for high-performance image loading, optimization, and preloading.
 */

export const DEFAULT_PRODUCT_FALLBACK = '/female_ss.png';
export const DEFAULT_MALE_FALLBACK = '/male_ss.png';

/**
 * Ensures image URLs are optimized (e.g., adding sizing parameters to Unsplash URLs)
 */
export function getOptimizedImageUrl(url?: string, targetWidth: number = 600): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return DEFAULT_PRODUCT_FALLBACK;
  }

  const trimmed = url.trim();

  // If it's an Unsplash image, attach width and compression params for lightning-fast loading
  if (trimmed.includes('images.unsplash.com')) {
    if (!trimmed.includes('w=')) {
      const separator = trimmed.includes('?') ? '&' : '?';
      return `${trimmed}${separator}w=${targetWidth}&auto=format&fit=crop&q=80`;
    }
  }

  return trimmed;
}

/**
 * Asynchronously preloads an array of image URLs into browser memory cache
 */
export function preloadImageUrls(urls: string[]): void {
  if (typeof window === 'undefined') return;
  
  // Use requestIdleCallback or setTimeout so preloading doesn't block main thread
  const executePreload = () => {
    urls.slice(0, 20).forEach((url) => {
      if (!url) return;
      const optimized = getOptimizedImageUrl(url, 400);
      const img = new Image();
      img.src = optimized;
    });
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(executePreload);
  } else {
    setTimeout(executePreload, 100);
  }
}
