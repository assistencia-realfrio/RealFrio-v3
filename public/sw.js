
const CACHE_NAME = 'realfrio-tech-v10.6';
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

// Fetch handler: Network First strategy with robust CORS and external domain handling
self.addEventListener('fetch', (event) => {
  // Ignorar pedidos que não sejam GET ou que sejam para domínios externos críticos
  // para evitar erros de CORS ou falhas de fetch no interceptor
  const url = new URL(event.request.url);
  const isExternal = url.hostname !== self.location.hostname;
  
  if (event.request.method !== 'GET' || isExternal) {
    return;
  }

  // Ignorar assets do browser e extensões
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Se a rede responder com sucesso (200), atualizamos o cache
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch((err) => {
        // Em caso de erro de rede, tentamos servir do cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback para navegação (SPA)
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          // Se não há cache nem rede, deixamos o erro propagar de forma limpa
          throw err;
        });
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
