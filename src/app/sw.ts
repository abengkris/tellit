import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "@serwist/sw";
import { Serwist } from "@serwist/sw";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (string | PrecacheEntry)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

self.addEventListener("push", (event) => {
  if (!(self.Notification && self.Notification.permission === "granted")) {
    return;
  }

  const pushEvent = event as PushEvent;
  const data = pushEvent.data?.json() ?? {};
  const title = data.title || "New notification";
  const options = {
    body: data.body || "Whatever it is, just Tell It.",
    icon: data.icon || "/favicon.ico",
    badge: "/favicon.ico",
    data: {
      url: data.url || "/",
    },
  };

  pushEvent.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  const notificationEvent = event as NotificationEvent;
  notificationEvent.notification.close();
  notificationEvent.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const windowClients = clientList as WindowClient[];
      if (windowClients.length > 0) {
        let client = windowClients[0];
        for (let i = 0; i < windowClients.length; i++) {
          if (windowClients[i].focused) {
            client = windowClients[i];
          }
        }
        return client.focus();
      }
      return self.clients.openWindow(notificationEvent.notification.data.url);
    })
  );
});

serwist.addEventListeners();
