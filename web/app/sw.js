const CACHE='nexo-ride-v200-kyc-camera-file';
const ASSETS=['/app/?v200-kyc-camera-file','/app/index.html','/app/styles.css?v200-kyc-camera-file','/app/app.js?v200-kyc-camera-file','/app/manifest.webmanifest?v200-kyc-camera-file','/app/assets/realistic-toto-splash-lite.webp?v200-kyc-camera-file'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{})).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(url.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c)).catch(()=>{});return r}).catch(()=>caches.match(e.request)));
});


self.addEventListener('push', event => {
  let data = { title: 'NEXO Ride', body: 'New notification' };
  try { data = event.data ? event.data.json() : data; } catch(e) {}
  event.waitUntil(self.registration.showNotification(data.title || 'NEXO Ride', {
    body: data.body || data.message || 'New notification',
    icon: '/app/icon-192.png',
    badge: '/app/icon-192.png',
    data: data.data || {}
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/app/?v=200'));
});
