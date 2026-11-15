// Offline support: app shell is cached; updates load in the background.
const CACHE = "qim-v2";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png",
  "./vendor/jspdf.umd.min.js"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { mode: "same-origin" })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isPage = req.mode === "navigate" || url.pathname.endsWith("/index.html");
  if (isPage) {
    // network first for the app page so updates arrive; cached copy when offline
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put("./index.html", c)); return r; })
      .catch(() => caches.match("./index.html").then(r => r || caches.match("./"))));
    return;
  }
  if (url.origin !== self.location.origin) return; // never touch other sites
  // cache first for app files (icons, jsPDF)
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r && r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
    return r;
  })));
});
