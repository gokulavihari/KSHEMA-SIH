// AASHRAY Emergency Safety Alerts Service Worker v1.1
// Handles Web Push events and notification click navigation

self.addEventListener("install", (event) => {
  logger_info("AASHRAY Service Worker installing...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  logger_info("AASHRAY Service Worker activated.");
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push events from backend (Section 8, 10, 11)
self.addEventListener("push", (event) => {
  logger_info("Received Web Push event.");
  
  let payload = {
    title: "🚨 AASHRAY Emergency Alert",
    body: "Disaster risk detected near your location. Open AASHRAY for your safety plan.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: "aashray-emergency-alert",
    data: { url: "/?view=safety-plan" }
  };

  if (event.data) {
    try {
      payload = Object.assign({}, payload, event.data.json());
    } catch (err) {
      payload.body = event.data.text() || payload.body;
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || "/favicon.svg",
    badge: payload.badge || "/favicon.svg",
    tag: payload.tag || "aashray-alert",
    renotify: true,
    requireInteraction: payload.data?.risk_level === "CRITICAL",
    data: payload.data || { url: "/?view=safety-plan" },
    actions: payload.actions || [
      { action: "view_safety_plan", title: "View Safety Plan" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

// Handle notification click action (Section 12)
self.addEventListener("notificationclick", (event) => {
  logger_info("Notification clicked:", event.action);
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || "/?view=safety-plan";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, focus it and post notification data
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          client.postMessage({
            type: "AASHRAY_NOTIFICATION_CLICKED",
            payload: event.notification.data
          });
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

function logger_info(...args) {
  console.log("[AASHRAY ServiceWorker]", ...args);
}
