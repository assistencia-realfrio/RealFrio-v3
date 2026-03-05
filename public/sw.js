
const CACHE_NAME = 'realfrio-tech-v10.3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/rf-favicon-v5.png',
  '/rf-apple-v5.png',
  '/rf-icon-192-v5.png',
  '/rf-icon-512-v5.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch handler is REQUIRED for PWA installation
self.addEventListener('fetch', (event) => {
  // Ignorar pedidos de API e Supabase para não quebrar o tempo real
  if (event.request.url.includes('supabase.co') || 
      event.request.url.includes('googleapis.com') ||
      event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // Fallback offline se necessário
      if (event.request.mode === 'navigate') {
        return caches.match('/');
      }
    })
  );
});

// Resto da lógica de notificações...
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, url } = event.data;
    const options = {
      body: body,
      icon: '/rf-icon-192-v5.png',
      badge: '/rf-favicon-v5.png',
      vibrate: [200, 100, 200],
      tag: 'rf-msg-' + Date.now(),
      renotify: true,
      data: { url: url || '/' }
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('push', (event) => {
  let data = { title: 'Real Frio', body: 'Nova atualização no sistema.', icon: '/rf-icon-192-v5.png' };
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
  }
  const options = {
    body: data.body,
    icon: data.icon || '/rf-icon-192-v5.png',
    badge: '/rf-favicon-v5.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data ? event.notification.data.url : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
