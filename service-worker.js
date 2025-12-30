// ===== Service Worker for Melo PWA =====

const CACHE_NAME = 'melo-v1.1.0';
const OFFLINE_URL = 'offline.html';

// Assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/about.html',
    '/melo.html',
    '/styles.css',
    '/style.css',
    '/app.js',
    '/config.js',
    '/api.js',
    '/firebase-config.js',
    '/login-page.js',
    '/admin-auth.js',
    '/utils-export.js',
    '/messaging-service.js',
    '/push-notifications.js',
    '/voice-input.js',
    '/graph-export.js',
    '/offline.html',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching static assets for Melo PWA');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Service Worker installed');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - cache first, then network
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // For navigation requests, try network first, then cache
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match(OFFLINE_URL))
                .then(response => response || caches.match(OFFLINE_URL))
        );
        return;
    }
    
    // For other requests, try cache first, then network
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                
                return fetch(event.request)
                    .then(response => {
                        // Don't cache if not a success response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    });
            })
            .catch(() => {
                // If both cache and network fail, show offline page for navigation
                if (event.request.mode === 'navigate') {
                    return caches.match(OFFLINE_URL);
                }
                return new Response('Offline', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            })
    );
});