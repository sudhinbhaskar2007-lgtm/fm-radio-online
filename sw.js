// Caches the page shell so the site opens instantly and works offline.
// The live audio stream and now-playing data are never cached.
var CACHE = "radio-shell-v22";
var SHELL = ["./", "index.html", "config.js", "assets/style.css", "assets/app.js", "news.html", "news-data.js", "assets/news.js", "data/news.json", "data/gallery.json", "assets/icon.svg", "assets/eye-poster.jpg"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }));
  self.skipWaiting();
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});
self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || /\.mp4$/.test(url.pathname)) return;
  // Network first, so edits to config.js show up straight away; fall back to cache offline.
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match(e.request); })
  );
});
