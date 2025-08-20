import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';

export default defineConfig({
  plugins: [
    react(),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
        'process.env': '{}'
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true
        })
      ]
    }
  },
  define: {
    'process.env': {},
    'global': {}, 
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core app (Library + React) - loads first
          'app-core': ['react', 'react-dom'],
          
          // Reader features - loads only when opening a book
          'reader-features': ['jszip', 'xmldom', 'epubjs', 'msedge-tts', 'kokoro-js'],
          
          // UI and utilities - loads after core
          'ui-utils': ['lucide-react', '@radix-ui/react-slot', '@radix-ui/react-slider', 'localforage', 'compromise']
        }
      }
    },
    // Use default minifier instead of terser to avoid build issues
    minify: true,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Ensure assets are properly handled
    assetsDir: 'assets',
    // Generate source maps for debugging
    sourcemap: false
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
});