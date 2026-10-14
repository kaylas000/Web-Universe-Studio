/* Базовый offline: кэш оболочки мини-приложения (VK / Telegram). */
const CACHE = "evakuator-vk-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(["./index.html", "./style.css", "./app.js"])),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
