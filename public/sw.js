/**
 * FinancieCerto — Service Worker
 *
 * Estratégia:
 *  - Assets estáticos (JS/CSS/fontes/imagens)  → Cache First (velocidade máxima)
 *  - Páginas HTML                              → Network First (conteúdo atualizado)
 *  - API /api/*                                → Network Only (dados sempre ao vivo)
 *  - Offline fallback                          → página cached mais recente
 */

const CACHE_VERSION  = 'fc-v2';
const STATIC_CACHE   = `${CACHE_VERSION}-static`;
const PAGES_CACHE    = `${CACHE_VERSION}-pages`;

// Páginas que pré-cacheamos na instalação
const PRECACHE_PAGES = ['/', '/imoveis', '/simulador', '/guia', '/sobre', '/contato'];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGES_CACHE).then(cache =>
      // addAll silencia erros individuais para não travar o install
      Promise.allSettled(PRECACHE_PAGES.map(url => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

// ── Activate — limpa caches antigos ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => !k.startsWith(CACHE_VERSION))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-GET e de outros domínios (exceto CDN de fotos Orulo)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin && !url.hostname.includes('orulo.com.br')) return;

  // API → Network Only (nunca cache)
  if (url.pathname.startsWith('/api/')) return;

  // Assets estáticos (_next/static, fontes, ícones) → Cache First
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(woff2?|ttf|otf|eot)$/)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Imagens → Cache First com expiração implícita (versão do cache)
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|gif)$/)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Páginas HTML → Network First, fallback para cache
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, PAGES_CACHE));
    return;
  }

  // Default → Network First
  event.respondWith(networkFirst(request, PAGES_CACHE));
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback offline: retorna a home se estiver em cache
    const home = await caches.match('/');
    return home || new Response('Offline — verifique sua conexão.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
