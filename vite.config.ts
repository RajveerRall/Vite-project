// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import path from 'path'
// import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [
//     react(),

//   ],
//   optimizeDeps: {
//     exclude: ['lucide-react'],
//     esbuildOptions: {
//       define: {
//         global: 'globalThis',
//         'process.env': '{}'
//       },
//       plugins: [
//         NodeGlobalsPolyfillPlugin({
//           process: true,
//           buffer: true
//         })
//       ]
//     }
//   },  define: {
//     'process.env': {},
//     'global': {},
//   },
//     resolve: {
//     alias: {
//       '@': path.resolve(__dirname, './src')
//     }
//   }
  
// });



import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Your other plugins can stay here if you add more later
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
    esbuildOptions: {
      // Keep your existing esbuild defines
      define: {
        global: 'globalThis',
        'process.env': '{}' // Note: You also define this below, Vite usually merges, but keep it simple
      },
      // Keep your existing esbuild plugins
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true
        })
      ]
    }
  },
  // Keep your existing top-level define
  define: {
    'process.env': {},
    'global': {}, // Consider if this is still needed with the polyfill above
  },
  // Keep your existing resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },

  // --- Add the server proxy configuration ---
  server: {
    proxy: {
      // Proxy requests that start with '/api' during development
      '/api': {
        target: 'http://localhost:5100', // The address of your local backend server (server.cjs)
        changeOrigin: true, // Recommended, handles origin header correctly
        // No rewrite needed if your backend endpoint is actually '/api/tts'
        // rewrite: (path) => path.replace(/^\/api/, '') // Use this if backend expected '/tts' instead of '/api/tts'
      }
      // You can add other proxy rules here if needed
    }
  }
  // --- End of added server proxy configuration ---

});