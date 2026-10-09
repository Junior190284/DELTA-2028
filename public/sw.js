// DELTA 2018 GM — Service Worker (ETAP 11B)
// Handles background push notifications and safe deep link navigation.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Validates that an incoming URL is a safe internal relative path.
 */
function sanitizeInternalUrl(rawUrl) {
  if (typeof rawUrl !== "string") return "/dashboard?view=club";
  const trimmed = rawUrl.trim();
  // Reject absolute protocols (http:, https:, javascript:, data:) to prevent external open attacks
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("//")) {
    return "/dashboard?view=club";
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

self.addEventListener("push", (event) => {
  let data = {
    title: "DELTA 2018 GM",
    body: "Nowe powiadomienie drużyny",
    url: "/dashboard?view=club",
    tag: "delta-teamhub",
    category: "general"
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    if (event.data) {
      data.body = event.data.text() || data.body;
    }
  }

  const safeUrl = sanitizeInternalUrl(data.url);

  event.waitUntil(
    self.registration.showNotification(data.title || "DELTA 2018 GM", {
      body: data.body || "",
      icon: "/icons/delta-192.png",
      badge: "/icons/delta-badge-96.png",
      image: data.image || undefined,
      tag: data.tag || `delta-${Date.now()}`,
      renotify: true,
      requireInteraction: false,
      data: {
        url: safeUrl,
        eventId: data.eventId,
        category: data.category
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url || "/dashboard?view=club";
  const safeRelativePath = sanitizeInternalUrl(rawUrl);
  const targetUrl = new URL(safeRelativePath, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      // Focus an existing app window and navigate it to target deep link
      for (const client of windows) {
        try {
          if (new URL(client.url).origin === self.location.origin) {
            if ("navigate" in client) {
              await client.navigate(targetUrl);
            }
            if ("focus" in client) {
              return client.focus();
            }
          }
        } catch {
          // Continue loop if single client fails
        }
      }

      // If no window is currently open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});
