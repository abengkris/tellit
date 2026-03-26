"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth";

export function usePushNotifications() {
  const { user, isLoggedIn } = useAuthStore();
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(true);

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const getSubscription = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setLoading(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
      setPermission(Notification.permission);
    } catch (err) {
      console.error("Error getting subscription:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getSubscription();
  }, [getSubscription]);

  const subscribe = async () => {
    if (!vapidPublicKey) {
      console.error("VAPID public key not found");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      setSubscription(sub);
      setPermission(Notification.permission);

      // Save subscription to server
      if (isLoggedIn && user?.pubkey) {
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscription: sub,
            pubkey: user.pubkey,
          }),
        });
      }
      
      return sub;
    } catch (err) {
      console.error("Error subscribing to push:", err);
      throw err;
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return;

    try {
      await subscription.unsubscribe();
      setSubscription(null);
      setPermission(Notification.permission);

      // Remove subscription from server
      if (isLoggedIn && user?.pubkey) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            pubkey: user.pubkey,
          }),
        });
      }
    } catch (err) {
      console.error("Error unsubscribing from push:", err);
    }
  };

  return {
    subscription,
    permission,
    loading,
    subscribe,
    unsubscribe,
    refresh: getSubscription,
  };
}
