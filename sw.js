// 오프라인 실행용 캐시. 파일을 고치면 VERSION을 올린다.
const VERSION = 'lolcareer-v3';
const FILES = ['./', './index.html', './data.js', './engine.js', './narration.js', './live.js', './ui.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => {
    const net = fetch(e.request).then(res => { if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); } return res; }).catch(() => hit);
    return hit || net; // 캐시 우선, 뒤에서 새 버전 받아 둠
  }));
});
