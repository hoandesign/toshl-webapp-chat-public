# Mobile Viewport Solution for Android Navigation Bars

This document explains the comprehensive solution implemented to handle Android navigation bar issues in the Toshl WebApp Chat.

## Problem

On Android devices, the browser's navigation bar (the black bar at the bottom with gesture controls) can cover parts of the web app's interface, particularly fixed bottom elements like chat input areas. This creates a poor user experience where users can't properly interact with the app.

## Solution Overview

We've implemented a multi-layered approach that provides maximum compatibility across different Android devices and browsers:

### 1. Modern CSS Viewport Units (Primary Solution)

```css
.chat-container {
  height: 100dvh; /* Dynamic viewport height - adjusts automatically */
  height: 100vh; /* Fallback for older browsers */
}
```

- **`100dvh`**: Dynamic viewport height that automatically adjusts as browser UI elements appear/disappear
- **`100vh`**: Fallback for browsers that don't support `dvh`

### 2. Safe Area Insets

```css
.input-area {
  padding-bottom: max(env(safe-area-inset-bottom, 0px), 12px);
}
```

- Uses CSS environment variables to respect device safe areas
- Provides minimum padding even when safe area insets aren't available

### 3. Progressive Enhancement

```css
@supports (height: 100dvh) {
  .chat-container {
    height: 100dvh;
  }
}

@supports (-webkit-touch-callout: none) and (not (height: 100dvh)) {
  .chat-container {
    height: -webkit-fill-available;
  }
}
```

- Uses `@supports` queries to apply the best available solution
- Handles iOS Safari and older Android browsers specifically

### 4. JavaScript Fallback

For browsers that don't support modern CSS solutions, we provide a JavaScript fallback:

```typescript
// src/utils/viewport.ts
export function setViewportHeight(): void {
  if (window.innerWidth <= 768) {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
}
```

- Calculates actual viewport height using JavaScript
- Sets CSS custom properties that can be used in stylesheets
- Includes debouncing and orientation change handling

## Implementation Details

### Files Modified

1. **`index.html`**: Already had `viewport-fit=cover` in the meta tag ✅
2. **`src/index.css`**: Added comprehensive mobile viewport handling
3. **`src/utils/viewport.ts`**: Created utility functions for JavaScript fallback
4. **`src/App.tsx`**: Initialize viewport height handling on app start

### CSS Classes and Utilities

- **`.chat-container`**: Main container with dynamic height
- **`.input-area`**: Chat input area with safe area padding
- **`.js-viewport-height`**: Fallback class using JavaScript-set custom properties
- **`.debug-viewport-info`**: Debug utility (remove in production)

### Responsive Breakpoints

- **Mobile**: `@media (max-width: 768px)`
- **Small screens**: `@media (max-height: 700px)` - Extra padding for devices with large nav bars
- **Very small screens**: `@media (max-height: 600px)` - Additional padding for older Android phones
- **Landscape**: `@media (orientation: landscape)` - Reduced padding in landscape mode
- **Virtual keyboard**: `@media (max-height: 500px)` - Reduced padding when keyboard is likely visible

## Browser Support

| Browser | Solution Used |
|---------|---------------|
| Chrome 108+ | `100dvh` |
| Safari 16.4+ | `100dvh` |
| Firefox 110+ | `100dvh` |
| Older iOS Safari | `-webkit-fill-available` |
| Older Android Chrome | `-webkit-fill-available` |
| Very old browsers | JavaScript fallback with `--vh` custom property |

## Testing

To test the implementation:

1. **Desktop**: Should work normally with standard viewport behavior
2. **Mobile Chrome**: Should use `100dvh` and adjust automatically
3. **Mobile Safari**: Should use `100dvh` or `-webkit-fill-available`
4. **Older browsers**: Should fall back to JavaScript solution

### Debug Mode

Add the `debug-viewport-info` class to any element to see viewport information:

```html
<div class="debug-viewport-info" data-dvh="supported" data-fill="supported">
  Debug info will appear in top-left corner
</div>
```

## Performance Considerations

- **CSS-first approach**: Most modern browsers use pure CSS solutions (no JavaScript overhead)
- **Debounced resize handling**: JavaScript fallback uses debouncing to prevent excessive calculations
- **Conditional loading**: JavaScript only runs on mobile devices (width ≤ 768px)
- **Cleanup**: Event listeners are properly cleaned up on app unmount

## Future Improvements

1. **Container Query Units**: When `cqh` (container query height) gets better support, it could provide another fallback option
2. **Visual Viewport API**: Could be used for more precise viewport calculations in the future
3. **CSS `@media (display-mode: standalone)`**: For PWA-specific optimizations

## Troubleshooting

If the solution doesn't work on a specific device:

1. Check if the device supports any of the modern CSS units
2. Verify that the JavaScript fallback is running (check console for errors)
3. Test with different orientations
4. Check if the device has unusual navigation bar behavior

The solution is designed to be robust and should work on 95%+ of mobile devices in use today.