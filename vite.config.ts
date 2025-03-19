import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'

// https://vitejs.dev/config/
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
  },  define: {
    'process.env': {},
    'global': {},
  },
    resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
  
});
