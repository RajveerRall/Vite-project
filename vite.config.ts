import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        return html.replace(
          /<!-- ANALYTICS_PLACEHOLDER -->/g,
          `
          <!-- Google Tag Manager -->
          <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-TZJL7XLW');</script>
          <!-- End Google Tag Manager -->

          <!-- Google tag (gtag.js) -->
          <script async src="https://www.googletagmanager.com/gtag/js?id=G-RDBQXF9CLH"></script>
          <script>
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-RDBQXF9CLH');
          </script>
          <!-- End Google tag (gtag.js) -->

          <!-- Amplitude Analytics with Error Handling -->
          <script>
            // Initialize analytics object to prevent errors
            window.analytics = window.analytics || {};
            
            // Load Amplitude with error handling
            (function() {
              try {
                // Load analytics browser
                var script1 = document.createElement('script');
                script1.src = 'https://cdn.amplitude.com/libs/analytics-browser-2.11.1-min.js.gz';
                script1.onload = function() {
                  // Load session replay plugin
                  var script2 = document.createElement('script');
                  script2.src = 'https://cdn.amplitude.com/libs/plugin-session-replay-browser-1.8.0-min.js.gz';
                  script2.onload = function() {
                    // Initialize Amplitude with error handling
                    try {
                      if (window.amplitude && window.sessionReplay) {
                        window.amplitude.add(window.sessionReplay.plugin({sampleRate: 1}));
                        window.amplitude.init('e64dc0aea57a1070515c6b210ccbca94', {
                          "autocapture": {
                            "elementInteractions": true
                          }
                        });
                        console.log('[Analytics] Amplitude initialized successfully');
                      }
                    } catch (initError) {
                      console.warn('[Analytics] Amplitude initialization failed:', initError);
                    }
                  };
                  script2.onerror = function() {
                    console.warn('[Analytics] Session replay plugin failed to load');
                  };
                  document.head.appendChild(script2);
                };
                script1.onerror = function() {
                  console.warn('[Analytics] Amplitude analytics failed to load');
                };
                document.head.appendChild(script1);
              } catch (error) {
                console.warn('[Analytics] Failed to setup Amplitude:', error);
              }
            })();
          </script>
          <!-- End Amplitude Analytics -->
          `
        );
      }
    }
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
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@supabase/supabase-js'],
          epub: ['jszip'],
          tts: ['msedge-tts']
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
    host: true, // Allow external connections
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '5dd73f473ba7.ngrok-free.app', // Your ngrok URL
      '.ngrok-free.app', // Allow all ngrok subdomains
      '.ngrok.io' // Allow legacy ngrok domains
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
});