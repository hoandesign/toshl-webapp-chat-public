import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Remove explicit imports for tailwindcss and autoprefixer here

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Remove explicit css.postcss configuration, let Vite use postcss.config.js
  server: { // Add server configuration for proxy
    proxy: {
      // Proxy requests starting with /api/toshl to the actual Toshl API
      '/api/toshl': {
        target: 'https://api.toshl.com', // The target API base URL
        changeOrigin: true, // Needed for virtual hosted sites
        rewrite: (path) => path.replace(/^\/api\/toshl/, ''), // Remove '/api/toshl' prefix before forwarding
        secure: false, // Optional: set to false if target has self-signed cert (usually not needed for public APIs)
      },
    },
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        // Revert to simpler object-based manual chunks
        manualChunks: {
          react: ['react', 'react-dom'],
          lucide: ['lucide-react'] // Keep lucide separate for clarity
          // Let Vite handle the rest automatically for now
        }
      }
    }
  }
})
