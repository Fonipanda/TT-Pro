/* TT Pro service worker — receives Web Push notifications */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "TT Pro", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) { /* ignore */ }
  const options = {
    body: data.body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: data.url },
    tag: data.tag || "ttpro-notif",
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(target)) return c.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
