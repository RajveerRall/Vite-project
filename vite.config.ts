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
    // Simplified build config for reliable deployment
    // Removed manualChunks to restore faster initial page loading
    rollupOptions: {
      output: {
        // Let Vite handle chunking automatically for optimal performance
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