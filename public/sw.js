// Push notification service worker for MarketMinds Academy.
// Body is intentionally generic — never leaks message content.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let title = "MarketMinds Academy";
  let body = "New course update available";
  try {
    if (event.data) {
      const payload = event.data.json();
      if (payload && typeof payload.title === "string") title = payload.title;
      if (payload && typeof payload.body === "string") body = payload.body;
    }
  } catch (_) {
    // ignore
  }

  event.waitUntil(
    (async () => {
      // Suppress the notification if the user already has the chat page
      // open and focused — no need to buzz them while they're chatting.
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const chatVisible = clientsList.some(
        (c) =>
          c.visibilityState === "visible" &&
          typeof c.url === "string" &&
          c.url.includes("/portal/chat"),
      );
      if (chatVisible) return;

      await self.registration.showNotification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "mm-update",
        renotify: true,
        data: { url: "/" },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          try {
            await client.navigate(target);
            return client.focus();
          } catch (_) {
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })(),
  );
});
