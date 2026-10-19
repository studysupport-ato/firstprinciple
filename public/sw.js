// First Principles / Back 2 Basics Service Worker
// Handles Web Push events and notification click interactions.
// Does NOT intercept or cache application fetch requests to avoid interfering with Next.js navigation.

self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  let title = "First Principles Announcement";
  let body = "You have a new announcement from Back 2 Basics.";
  let tag = "announcement";
  let icon = "/icons/icon-192.png";
  let badge = "/icons/icon-192.png";
  let url = "/dashboard";
  let announcementId = null;

  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload && typeof payload === "object") {
        if (typeof payload.title === "string" && payload.title.trim()) {
          title = payload.title.trim().slice(0, 120);
        }
        if (typeof payload.body === "string" && payload.body.trim()) {
          body = payload.body.trim().slice(0, 300);
        }
        if (typeof payload.tag === "string" && payload.tag.trim()) {
          tag = payload.tag.trim();
        }
        if (typeof payload.icon === "string" && payload.icon.trim()) {
          icon = payload.icon.trim();
        }
        if (typeof payload.badge === "string" && payload.badge.trim()) {
          badge = payload.badge.trim();
        }
        if (payload.data && typeof payload.data === "object") {
          if (typeof payload.data.url === "string") {
            url = payload.data.url;
          }
          if (typeof payload.data.announcementId === "string") {
            announcementId = payload.data.announcementId;
          }
        }
      }
    } catch {
      // If parsing JSON fails, try plain text
      try {
        const text = event.data.text();
        if (text && text.trim()) {
          body = text.trim().slice(0, 300);
        }
      } catch {
        // Fallback defaults are used
      }
    }
  }

  const options = {
    body: body,
    icon: icon,
    badge: badge,
    tag: tag,
    renotify: true,
    data: {
      url: url,
      announcementId: announcementId,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

function getSanitizedDestinationUrl(rawUrl, origin) {
  const fallback = origin + "/dashboard";
  if (!rawUrl || typeof rawUrl !== "string") return fallback;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith("javascript:") || trimmed.startsWith("data:") || trimmed.startsWith("vbscript:")) {
    return fallback;
  }
  try {
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
      const resolved = new URL(trimmed, origin);
      return resolved.origin === origin ? resolved.toString() : fallback;
    }
    const parsed = new URL(trimmed);
    if (parsed.origin === origin) {
      return parsed.toString();
    }
  } catch {
    return fallback;
  }
  return fallback;
}

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const rawUrl = event.notification.data ? event.notification.data.url : "/dashboard";
  const targetUrl = getSanitizedDestinationUrl(rawUrl, self.location.origin);

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(function (clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            if ("navigate" in client && client.url !== targetUrl) {
              return client.navigate(targetUrl).then(function (navigatedClient) {
                return navigatedClient ? navigatedClient.focus() : client.focus();
              });
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
