// public/worker.js - Service Worker for Background Audio

const CACHE_NAME = 'background-audio-v1';
const AUDIO_CACHE_NAME = 'audio-cache-v1';

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll([
          '/',
          '/index.html',
          '/src/main.tsx'
        ]);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== AUDIO_CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - handle audio requests and cache them
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle audio file requests
  if (request.destination === 'audio' || 
      url.pathname.includes('.mp3') || 
      url.pathname.includes('.wav') ||
      url.pathname.includes('.ogg') ||
      url.pathname.includes('/api/tts')) {
    
    event.respondWith(
      caches.open(AUDIO_CACHE_NAME).then(cache => {
        return cache.match(request).then(response => {
          if (response) {
            console.log('[ServiceWorker] Audio served from cache:', url.pathname);
            return response;
          }

          // Fetch and cache the audio
          return fetch(request).then(networkResponse => {
            if (networkResponse.ok) {
              console.log('[ServiceWorker] Caching audio:', url.pathname);
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // Handle other requests with cache-first strategy
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request);
      })
    );
  }
});

// Background sync for audio playback
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-audio-sync') {
    console.log('[ServiceWorker] Background audio sync triggered');
    event.waitUntil(handleBackgroundAudioSync());
  }
});

// Handle background audio sync
async function handleBackgroundAudioSync() {
  try {
    // Get all clients (tabs/windows)
    const clients = await self.clients.matchAll();
    
    // Check if any client is playing audio
    for (const client of clients) {
      if (client.url.includes('localhost') || client.url.includes('your-domain.com')) {
        // Send message to client to check audio state
        client.postMessage({
          type: 'CHECK_AUDIO_STATE',
          timestamp: Date.now()
        });
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Background audio sync failed:', error);
  }
}

// Handle messages from the main app
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'AUDIO_STARTED':
      console.log('[ServiceWorker] Audio playback started');
      // Set up periodic checks to keep audio alive
      setInterval(() => {
        event.source?.postMessage({
          type: 'KEEP_ALIVE',
          timestamp: Date.now()
        });
      }, 30000); // Every 30 seconds
      break;

    case 'AUDIO_STOPPED':
      console.log('[ServiceWorker] Audio playback stopped');
      break;

    case 'AUDIO_PAUSED':
      console.log('[ServiceWorker] Audio playback paused');
      break;

    case 'CACHE_AUDIO':
      if (data && data.url) {
        console.log('[ServiceWorker] Caching audio URL:', data.url);
        caches.open(AUDIO_CACHE_NAME).then(cache => {
          fetch(data.url).then(response => {
            if (response.ok) {
              cache.put(data.url, response);
            }
          });
        });
      }
      break;

    default:
      console.log('[ServiceWorker] Unknown message type:', type);
  }
});

// Push notification support for audio controls
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    if (data.type === 'audio-control') {
      const options = {
        body: data.message || 'Audio playback notification',
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: 'audio-control',
        actions: [
          {
            action: 'play',
            title: 'Play',
            icon: '/vite.svg'
          },
          {
            action: 'pause',
            title: 'Pause',
            icon: '/vite.svg'
          },
          {
            action: 'stop',
            title: 'Stop',
            icon: '/vite.svg'
          }
        ],
        requireInteraction: true,
        silent: true
      };

      event.waitUntil(
        self.registration.showNotification('Audio Player', options)
      );
    }
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action) {
    // Send action to main app
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'AUDIO_CONTROL',
          action: event.action,
          timestamp: Date.now()
        });
      });
    });
  } else {
    // Default: focus on the app
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        if (clients.length > 0) {
          return clients[0].focus();
        }
        return self.clients.openWindow('/');
      })
    );
  }
});

// Keep the service worker alive
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'keep-alive') {
    console.log('[ServiceWorker] Periodic sync - keeping alive');
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'KEEP_ALIVE',
            timestamp: Date.now()
          });
        });
      })
    );
  }
});

console.log('[ServiceWorker] Background audio service worker loaded'); 