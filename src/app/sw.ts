/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (string | PrecacheEntry)[] | undefined;
    Notification: typeof Notification;
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

self.addEventListener("push", (event: PushEvent) => {
  if (!(self.Notification && self.Notification.permission === "granted")) {
    return;
  }

  const data = event.data?.json() ?? {};
  const title = data.title || "New notification";
  const options = {
    body: data.body || "Whatever it is, just Tell It.",
    icon: data.icon || "/favicon.ico",
    badge: "/favicon.ico",
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const windowClients = clientList as WindowClient[];
      if (windowClients.length > 0) {
        let client = windowClients[0];
        for (let i = 0; i < windowClients.length; i++) {
          if (clientList[i].focused) {
            client = windowClients[i];
          }
        }
        return client.focus();
      }
      return self.clients.openWindow(event.notification.data.url);
    })
  );
});

serwist.addEventListeners();
