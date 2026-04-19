const CACHE   = 'haptica-v1';
const BASE    = '/LaHapticaDelRecuerdo';
const POEMS   = [
  '13_13','ConBuenosOjos','DeAdiosYDespedidas','ElEcoDeLoQueFuimos',
  'ElLugar','ElMiedoAQuererPorHaberQuerido','ElPoemaMasBonitoDelMundo',
  'Ensordecedor','Galtzerdi','HabitarEnElCasi','LaAfasiaEnLosTeQuiero',
  'LaEscalaDeVerdes','LaVisita','Metamorfosis','MiradasPorDoquier',
  'NadarPorEncimaDeLaLinea','NuncaMeHasQuerido','QuienSoy',
  'Sinestesia2011','_8'
];

// Recursos que se cachean en la primera visita (shell de la app)
const PRECACHE = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/icon-192.png`,
  `${BASE}/icon-512.png`,
  `${BASE}/manifest.json`,
  // Reproductores de cada poema
  ...POEMS.map(p => `${BASE}/play/${p}/`),
  // Portadas
  ...POEMS.map(p => `${BASE}/${p}/cover.png`),
];

// ── Instalación: pre-cachear el shell ─────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activación: limpiar cachés antiguas ───────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first para assets, network-first para HTML ───────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Solo interceptar peticiones de nuestro dominio
  if (!url.hostname.includes('cdccris.github.io')) return;

  const isAudio = /\.(m4a|mp3|ogg|wav)$/i.test(url.pathname);
  const isHTML  = event.request.headers.get('accept')?.includes('text/html');

  if (isAudio) {
    // Audios: network-first con fallback a caché (son pesados, mejor frescos)
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (isHTML) {
    // HTML: network-first (queremos contenido actualizado)
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Resto (imágenes, fuentes, CSS): cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(event.request, clone));
        return res;
      });
    })
  );
});
