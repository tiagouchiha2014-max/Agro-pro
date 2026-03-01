// ============================================================
// AGRO PRO — Service Worker v10.5
// Cache-first para assets, network-first para API
// ============================================================

const CACHE_NAME = 'agropro-v10.7';
const STATIC_CACHE = 'agropro-static-v10.7';
const DYNAMIC_CACHE = 'agropro-dynamic-v1';
const OFFLINE_PAGE = '/offline.html';

// Arquivos essenciais para o shell funcionar offline
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/assets/style.css?v=10.7',
  '/assets/supabase-client.js?v=10.7',
  '/assets/modules/core.js?v=10.7',
  '/assets/modules/shell.js?v=10.7',
  '/assets/modules/login.js?v=10.7',
  '/assets/modules/app-init.js?v=10.7',
  '/assets/modules/dashboard.js?v=10.7',
  '/assets/modules/propriedade.js?v=10.7',
  '/assets/modules/safras.js?v=10.7',
  '/assets/modules/centralgestao.js?v=10.7',
  '/assets/modules/fazendas.js?v=10.7',
  '/assets/modules/talhoes.js?v=10.7',
  '/assets/modules/insumos.js?v=10.7',
  '/assets/modules/produtos.js?v=10.7',
  '/assets/modules/estoque.js?v=10.7',
  '/assets/modules/insumosbase.js?v=10.7',
  '/assets/modules/aplicacoes.js?v=10.7',
  '/assets/modules/combustivel.js?v=10.7',
  '/assets/modules/clima.js?v=10.7',
  '/assets/modules/colheitas.js?v=10.7',
  '/assets/modules/manutencao.js?v=10.7',
  '/assets/modules/equipe.js?v=10.7',
  '/assets/modules/folhaSalarial.js?v=10.7',
  '/assets/modules/analiseSolo.js?v=10.7',
  '/assets/modules/maquinas.js?v=10.7',
  '/assets/modules/relatorios.js?v=10.7',
  '/assets/modules/configuracoes.js?v=10.7',
  '/assets/modules/ajuda.js?v=10.7',
  '/assets/modules/ia-helpers.js?v=10.7',
  '/assets/modules/defensivos.js?v=10.7',
  '/assets/modules/copilot.js?v=10.7',
  '/assets/modules/pagamento.js?v=10.7',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/manifest.json',
  '/favicon.ico',
  '/offline.html'
];

// Paginas HTML para cache sob demanda
const HTML_PAGES = [
  '/ajuda.html', '/analisesolo.html', '/aplicacoes.html', '/centralgestao.html',
  '/clima.html', '/colheitas.html', '/combustivel.html', '/configuracoes.html',
  '/copilot.html', '/equipe.html', '/estoque.html', '/fazendas.html',
  '/folhasalarial.html', '/insumos.html', '/insumosbase.html', '/manutencao.html',
  '/maquinas.html', '/produtos.html', '/propriedade.html', '/relatorios.html',
  '/safras.html', '/talhoes.html'
];

// ============================================================
// INSTALL — Pre-cache dos recursos essenciais
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        // Cache com tolerancia a falha (alguns recursos podem nao existir)
        return Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch(() => {
              // Ignora erros de recursos individuais
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// ACTIVATE — Limpar caches antigos
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH — Estrategia de cache inteligente
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests nao-GET
  if (request.method !== 'GET') return;

  // Ignorar Supabase, APIs externas e Vercel analytics
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('open-meteo.com') ||
    url.hostname.includes('vercel-insights.com') ||
    url.hostname.includes('va.vercel-scripts.com') ||
    url.pathname.startsWith('/_vercel/') ||
    url.pathname.includes('/functions/v1/')
  ) {
    return;
  }

  // CDN do Supabase JS — cache-first (muda pouco)
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Assets JS/CSS — cache-first (versionados via ?v=)
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.ico'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // HTML pages — network-first (sempre pegar versao mais recente)
  if (
    url.pathname.endsWith('.html') ||
    url.pathname === '/' ||
    url.pathname === ''
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // Fallback para pagina offline
            return caches.match(OFFLINE_PAGE) || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Tudo mais — stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// ============================================================
// BACKGROUND SYNC — Para salvar dados offline (futuro)
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'clearCache') {
    caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
  }
});
