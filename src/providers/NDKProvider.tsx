"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import NDK, { NDKPrivateKeySigner, NDKNip07Signer } from "@nostr-dev-kit/ndk";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";
import { NDKMessenger } from "@nostr-dev-kit/messages";
import { useAuthStore } from "@/store/auth";
import { getNDK, connectNDK } from "@/lib/ndk";

export interface NDKContextType {
  ndk: NDK | null;
  messenger: NDKMessenger | null;
  isReady: boolean;
}

export const NDKContext = createContext<NDKContextType>({
  ndk: null,
  messenger: null,
  isReady: false,
});

export const NDKProvider = ({ children }: { children: ReactNode }) => {
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [messenger, setMessenger] = useState<NDKMessenger | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { privateKey, isLoggedIn, loginType, publicKey, setUser } = useAuthStore();

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    const dexieAdapter = new NDKCacheAdapterDexie({ dbName: "ndk-cache" });
    const instance = getNDK();
    
    // Set cache adapter if not already set
    if (!instance.cacheAdapter) {
      instance.cacheAdapter = dexieAdapter as any;
    }

    // Performance Optimization: Signature Verification Sampling
    instance.initialValidationRatio = 1.0;
    instance.lowestValidationRatio = 1.0;

    // Monitor for invalid signatures
    instance.on("event:invalid-sig", (event) => {
      console.error("Invalid signature received from relay:", event.relay?.url, event.id);
    });

    // Handle session restoration
    const restoreSession = async () => {
      if (isLoggedIn) {
        if (loginType === 'privateKey' && privateKey) {
          instance.signer = new NDKPrivateKeySigner(privateKey);
        } else if (loginType === 'nip07') {
          // Check if window.nostr is available
          if (window.nostr) {
            instance.signer = new NDKNip07Signer();
          }
        }

        // Re-populate the user object in the store
        if (publicKey) {
          const user = instance.getUser({ pubkey: publicKey });
          user.ndk = instance;
          instance.activeUser = user; // Enable automatic mute filtering
          // Trigger profile fetch in background
          user.fetchProfile().finally(() => {
            setUser(user);
          });
          setUser(user);
        }
      }
    };

    restoreSession();

    // Set NDK instance immediately
    setNdk(instance);

    // Initialize Messenger
    const msgInstance = new NDKMessenger(instance);
    setMessenger(msgInstance);

    // Connection with safety timeout
    const connectPromise = instance.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Connection timeout")), 10000)
    );

    Promise.race([connectPromise, timeoutPromise])
      .then(async () => {
        setIsReady(true);
        console.log("NDK connected and session restored");
        
        // Start messenger after connection
        if (isLoggedIn) {
          await msgInstance.start();
        }
      })
      .catch(async (err) => {
        console.warn("NDK connection partial or timed out:", err.message);
        // Still set isReady to true so the app can function with whatever relays connected
        setIsReady(true);
        
        if (isLoggedIn) {
          await msgInstance.start();
        }
      });
  }, [isLoggedIn, loginType, privateKey, publicKey, setUser]);

  return (
    <NDKContext.Provider value={{ ndk, messenger, isReady }}>
      {children}
    </NDKContext.Provider>
  );
};
