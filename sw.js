
const CACHE_NAME = 'realfrio-tech-v6.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/rf-favicon-v5.png',
  '/rf-apple-v5.png',
  '/rf-icon-192-v5.png',
  '/rf-icon-512-v5.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
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
  // Forçar o SW a assumir o controlo das páginas abertas imediatamente
  return self.clients.claim();
});

// ESCUTAR MENSAGENS DA INTERFACE (MAIN THREAD)
self.addEventListener('message', (event) => {
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

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// ESCUTAR NOTIFICAÇÕES PUSH REAIS (DE SERVIDOR)
self.addEventListener('push', (event) => {
  let data = { title: 'Real Frio', body: 'Nova atualização no sistema.', icon: '/rf-icon-192-v5.png' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/rf-icon-192-v5.png',
    badge: '/rf-favicon-v5.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// LIDAR COM CLIQUE NA NOTIFICAÇÃO
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('supabase.co') || event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});
