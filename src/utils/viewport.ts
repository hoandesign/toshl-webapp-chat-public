/**
 * Viewport utilities for handling mobile browser navigation bars
 * Provides fallback solutions for browsers that don't support modern CSS viewport units
 */

/**
 * Sets CSS custom property for viewport height
 * This is a fallback for browsers that don't support 100dvh or -webkit-fill-available
 */
export function setViewportHeight(): void {
  // Only run on mobile devices
  if (window.innerWidth <= 768) {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--viewport-height', `${vh}px`);
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
}

/**
 * Debounced version of setViewportHeight to avoid excessive calls during resize
 */
let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

export function setViewportHeightDebounced(): void {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }
  
  resizeTimeout = setTimeout(() => {
    setViewportHeight();
    resizeTimeout = null;
  }, 150);
}

/**
 * Initialize viewport height handling
 * Call this once when your app starts
 */
export function initializeViewportHeight(): void {
  // Set initial height
  setViewportHeight();
  
  // Update on resize (debounced)
  window.addEventListener('resize', setViewportHeightDebounced);
  
  // Update on orientation change
  window.addEventListener('orientationchange', () => {
    // Small delay to ensure the viewport has updated
    setTimeout(setViewportHeight, 100);
  });
  
  // Update on load (in case of cached pages)
  window.addEventListener('load', setViewportHeight);
}

/**
 * Cleanup viewport height event listeners
 * Call this when unmounting your app
 */
export function cleanupViewportHeight(): void {
  window.removeEventListener('resize', setViewportHeightDebounced);
  window.removeEventListener('orientationchange', setViewportHeight);
  window.removeEventListener('load', setViewportHeight);
  
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
    resizeTimeout = null;
  }
}

/**
 * Check if the browser supports modern viewport units
 */
export function supportsModernViewportUnits(): boolean {
  // Check for dvh support
  if (CSS.supports('height', '100dvh')) {
    return true;
  }
  
  // Check for -webkit-fill-available support
  if (CSS.supports('height', '-webkit-fill-available')) {
    return true;
  }
  
  return false;
}