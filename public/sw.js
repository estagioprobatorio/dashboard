const CACHE_NAME = 'estagio-probatorio-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/brasao_parana.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch((err) => {
      console.warn('Erro ao pré-cachear assets:', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Apenas requisições GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Não tenta armazenar no cache do service worker o JSON de 31.5MB de 2024 ou APIs externas
  // para evitar estouro da cota de memória do Cache Storage do navegador
  if (
    url.pathname.includes('observacoes_2024.json') ||
    url.protocol.startsWith('chrome-extension') ||
    !url.protocol.startsWith('http')
  ) {
    return;
  }

  // Estratégia Network-first com fallback seguro para Cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch((err) => {
              // Ignora silenciosamente se o navegador rejeitar o cache por cota ou tamanho
            });
          }).catch(() => {});
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
