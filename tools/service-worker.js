/* Build substitutes a content hash and lists only this site's local files. */
const VERSION = __VERSION__;
const CORE_URLS = __CORE_URLS__;
const MEDIA_URLS = __MEDIA_URLS__;
const PREFIX = 'vs-water-';
const CORE = PREFIX + 'core-' + VERSION;
const MEDIA = PREFIX + 'media-' + __MEDIA_VERSION__;
const corePaths = new Set(CORE_URLS);
const mediaPaths = new Set(MEDIA_URLS);
function keyFor(path) {
  if (path.endsWith('/')) return path + 'index.html';
  if (corePaths.has(path + '/index.html')) return path + '/index.html';
  return path;
}
self.addEventListener('install', event => {
  // Failure leaves the previous working version in place; never activate a
  // half-cached release. Updates wait for old tabs to close to avoid mixed code.
  event.waitUntil((async () => {
    const cache = await caches.open(CORE);
    let next = 0;
    await Promise.all(Array.from({length: 4}, async () => {
      while (next < CORE_URLS.length) {
        const path = CORE_URLS[next++];
        const response = await fetch(path, {cache: 'reload'});
        if (!response.ok) throw Error('Offline install failed: ' + path);
        await cache.put(path, response);
      }
    }));
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(PREFIX) && name !== CORE && name !== MEDIA) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
const downloads = new Map();
async function saveMedia(path) {
  if (!mediaPaths.has(path)) return;
  if (downloads.has(path)) return downloads.get(path);
  const task = (async () => {
    const cache = await caches.open(MEDIA);
    if (await cache.match(path)) return;
    const response = await fetch(path);
    if (response.ok && response.status === 200) await cache.put(path, response);
  })();
  downloads.set(path, task);
  try { await task; } finally { downloads.delete(path); }
}
self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_MEDIA' || !Array.isArray(event.data.urls)) return;
  event.waitUntil((async () => {
    for (const path of new Set(event.data.urls)) {
      try { await saveMedia(path); } catch { /* Retry on a later online visit. */ }
    }
  })());
});
async function ranged(response, header) {
  if (!header) return response;
  const bytes = await response.arrayBuffer(), size = bytes.byteLength;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header);
  let start, end;
  if (m && (m[1] || m[2])) {
    start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
    end = m[1] ? (m[2] ? Math.min(Number(m[2]), size - 1) : size - 1) : size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size)
    return new Response(null, {status: 416, headers: {'Content-Range': `bytes */${size}`}});
  const headers = new Headers(response.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');
  headers.delete('Content-Encoding');
  return new Response(bytes.slice(start, end + 1), {status: 206, headers});
}
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const path = keyFor(url.pathname);
  if (corePaths.has(path) || mediaPaths.has(path)) {
    event.respondWith((async () => {
      const cache = await caches.open(corePaths.has(path) ? CORE : MEDIA);
      const cached = await cache.match(path);
      if (cached) return ranged(cached, request.headers.get('Range'));
      const response = await fetch(request);
      // Partial video responses must never replace the complete cached file.
      if (response.status === 200) {
        try { await cache.put(path, response.clone()); } catch { /* Storage quota. */ }
      }
      return response;
    })());
  } else if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const page = await (await caches.open(CORE)).match('/404.html');
      return new Response(page ? await page.text() : 'Page unavailable offline.', {
        status: 404, headers: {'Content-Type': 'text/html; charset=utf-8'}
      });
    }));
  }
});
