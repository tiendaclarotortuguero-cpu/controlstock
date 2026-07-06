// ============================================================================
// ControlStock — Service Worker (PWA Nivel 1)
// Objetivo: que la INTERFAZ cargue al instante y la app abra aunque no haya
// internet. NUNCA cachea las llamadas a Google (datos), que siempre van a la red
// para mantenerse frescos.
// ============================================================================

// Sube este número cada vez que cambies el index.html, para forzar actualización.
const CACHE_VERSION = 'controlstock-v1';
const BASE = '/controlstock/';

// Archivos de la "cáscara" de la app que se guardan para arranque instantáneo.
const ARCHIVOS_CACHE = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png'
];

// --- Instalación: guarda la cáscara de la app ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ARCHIVOS_CACHE))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('SW install:', err))
  );
});

// --- Activación: limpia versiones viejas del caché ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((c) => c !== CACHE_VERSION).map((c) => caches.delete(c)))
    ).then(() => self.clients.claim())
  );
});

// --- Estrategia de red ---
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Las llamadas a Google (Apps Script / Sheets) SIEMPRE van a la red.
  //    Nunca se cachean, para que los datos estén siempre actualizados.
  if (url.hostname.includes('google.com') || url.hostname.includes('googleusercontent.com')) {
    return; // deja que el navegador la maneje normal (requiere internet)
  }

  // 2. Solo gestionamos peticiones GET de nuestro propio origen.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 3. Para la interfaz y recursos: primero la red (para tener lo último),
  //    y si no hay internet, servimos la copia en caché.
  event.respondWith(
    fetch(event.request)
      .then((respuesta) => {
        // Guardar una copia fresca en caché
        const copia = respuesta.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copia)).catch(() => {});
        return respuesta;
      })
      .catch(() => caches.match(event.request).then((r) => r || caches.match(BASE + 'index.html')))
  );
});
