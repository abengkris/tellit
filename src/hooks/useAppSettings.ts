"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { NDKAppSettings, NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";
import { useNDK } from "./useNDK";
import { useAuthStore } from "@/store/auth";
import { useUIStore, RelayAuthStrategy } from "@/store/ui";

const APP_NAME = "tellit";

export function useAppSettings() {
  const { ndk, isReady } = useNDK();
  const { isLoggedIn, publicKey } = useAuthStore();
  const uiStore = useUIStore();
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<number>(0);
  const isInitialLoad = useRef(true);

  const fetchSettings = useCallback(async () => {
    if (!ndk || !isReady || !isLoggedIn || !publicKey) return;

    setLoading(true);
    try {
      const event = await ndk.fetchEvent({
        kinds: [30078],
        authors: [publicKey],
        "#d": [APP_NAME]
      }, { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST });

      if (event) {
        const appSettings = NDKAppSettings.from(event);
        appSettings.appName = APP_NAME;
        
        // Map settings to UI store
        if (appSettings.settings) {
          const s = appSettings.settings;
          if (typeof s.wotStrictMode === 'boolean') uiStore.setWotStrictMode(s.wotStrictMode);
          if (typeof s.browserNotificationsEnabled === 'boolean') uiStore.setBrowserNotificationsEnabled(s.browserNotificationsEnabled);
          if (typeof s.defaultZapAmount === 'number') uiStore.setDefaultZapAmount(s.defaultZapAmount);
          if (typeof s.hideBalance === 'boolean') uiStore.setHideBalance(s.hideBalance);
          if (typeof s.relayAuthStrategy === 'string') uiStore.setRelayAuthStrategy(s.relayAuthStrategy as RelayAuthStrategy);
        }
      }
      setLastSync(Date.now());
    } catch (err) {
      console.error("[useAppSettings] Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, isLoggedIn, publicKey, uiStore]);

  const saveSettings = useCallback(async () => {
    if (!ndk || !isReady || !isLoggedIn || !publicKey || !ndk.signer) return;

    try {
      const appSettings = new NDKAppSettings(ndk);
      appSettings.appName = APP_NAME;
      appSettings.set("wotStrictMode", uiStore.wotStrictMode);
      appSettings.set("browserNotificationsEnabled", uiStore.browserNotificationsEnabled);
      appSettings.set("defaultZapAmount", uiStore.defaultZapAmount);
      appSettings.set("hideBalance", uiStore.hideBalance);
      appSettings.set("relayAuthStrategy", uiStore.relayAuthStrategy);
      appSettings.set("updatedAt", Date.now());

      await appSettings.publishReplaceable();
      setLastSync(Date.now());
      uiStore.addToast("Settings synced to relays", "success", 2000);
    } catch (err) {
      console.error("[useAppSettings] Failed to save settings:", err);
      uiStore.addToast("Failed to sync settings", "error");
    }
  }, [ndk, isReady, isLoggedIn, publicKey, uiStore]);

  // Initial fetch on login
  useEffect(() => {
    if (isLoggedIn && isInitialLoad.current && isReady) {
      isInitialLoad.current = false;
      fetchSettings();
    }
  }, [isLoggedIn, isReady, fetchSettings]);

  // Reset initial load on logout
  useEffect(() => {
    if (!isLoggedIn) {
      isInitialLoad.current = true;
    }
  }, [isLoggedIn]);

  return {
    loading,
    lastSync,
    fetchSettings,
    saveSettings
  };
}
