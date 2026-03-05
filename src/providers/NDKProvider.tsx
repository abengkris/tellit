"use client";

import { createContext, useEffect, useState, ReactNode, useRef } from "react";
import NDK, { NDKPrivateKeySigner, NDKNip07Signer } from "@nostr-dev-kit/ndk";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";
import { NDKMessenger, CacheModuleStorage } from "@nostr-dev-kit/messages";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { getNDK } from "@/lib/ndk";

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
  const { incrementUnreadMessagesCount, addToast } = useUIStore();
  const messengerRef = useRef<NDKMessenger | null>(null);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    let dexieAdapter: NDKCacheAdapterDexie | null = null;
    try {
      dexieAdapter = new NDKCacheAdapterDexie({ dbName: "ndk-cache" });
    } catch (e) {
      console.error("Failed to initialize Dexie adapter:", e);
    }

    const instance = getNDK();
    
    // Set cache adapter if not already set
    if (!instance.cacheAdapter && dexieAdapter) {
      instance.cacheAdapter = dexieAdapter as any;
    }

    // Performance Optimization: Validation Sampling
    // Initially verify 50% of signatures, dropping to 5% as relay trust is established
    instance.initialValidationRatio = 0.5;
    instance.lowestValidationRatio = 0.05;

    // Handle invalid signatures
    instance.on("event:invalid-sig", (event) => {
      console.error("Invalid signature detected from relay:", event.relay?.url);
      addToast(`Invalid signature detected from relay: ${event.relay?.url || 'unknown'}`, "error");
    });

    // Handle session restoration
    const restoreSession = async () => {
      if (isLoggedIn) {
        if (loginType === 'privateKey' && privateKey) {
          instance.signer = new NDKPrivateKeySigner(privateKey);
        } else if (loginType === 'nip07') {
          if (window.nostr) {
            instance.signer = new NDKNip07Signer();
          }
        }

        if (publicKey) {
          const user = instance.getUser({ pubkey: publicKey });
          user.ndk = instance;
          instance.activeUser = user;
          
          // Initial set to ensure state is available
          setUser(user);
          
          // Background fetch profile and update if needed
          user.fetchProfile().then(() => {
            setUser(user);
          });
        }
      }
      
      setNdk(instance);

      // Initialize Messenger safely with Storage
      let msgInstance: NDKMessenger | null = null;
      try {
        const storage = (dexieAdapter && publicKey) 
          ? new CacheModuleStorage(dexieAdapter as any, publicKey) 
          : undefined;
        
        msgInstance = new NDKMessenger(instance, { storage });
        messengerRef.current = msgInstance;
        setMessenger(msgInstance);

      } catch (e) {
        console.error("Failed to initialize NDKMessenger:", e);
      }

      return msgInstance;
    };

    restoreSession().then((msgInstance) => {
      // Connection with safety timeout
      const connectPromise = instance.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Connection timeout")), 10000)
      );

      Promise.race([connectPromise, timeoutPromise])
        .then(async () => {
          setIsReady(true);
          console.log("NDK connected and session restored");
          
          if (isLoggedIn && msgInstance) {
            try {
              await msgInstance.start();

              // Global Message Listener for Notifications
              msgInstance.on("message", (message: any) => {
                // Only notify for INCOMING messages that are not from the current user
                if (message.sender?.pubkey !== publicKey && message.recipient?.pubkey === publicKey) {
                  // Don't show toast if we are on the message page for this specific user
                  const isCurrentChat = window.location.pathname.includes(`/messages/${message.sender?.pubkey}`);
                  
                  if (!isCurrentChat) {
                    incrementUnreadMessagesCount();
                  }
                }
              });
            } catch (e) {
              console.error("Failed to start NDKMessenger:", e);
            }
          }
        })
        .catch(async (err) => {
          console.warn("NDK connection partial or timed out:", err.message);
          setIsReady(true);
          
          if (isLoggedIn && msgInstance) {
            try {
              await msgInstance.start();

              // Global Message Listener for Notifications (Fallback)
              msgInstance.on("message", (message: any) => {
                if (message.sender?.pubkey !== publicKey && message.recipient?.pubkey === publicKey) {
                  const isCurrentChat = window.location.pathname.includes(`/messages/${message.sender?.pubkey}`);
                  if (!isCurrentChat) {
                    incrementUnreadMessagesCount();
                  }
                }
              });
            } catch (e) {
              console.error("Failed to start NDKMessenger (fallback):", e);
            }
          }
        });
    });

    return () => {
      if (messengerRef.current) {
        try {
          (messengerRef.current as any).destroy();
        } catch (e) {
          console.warn("Error destroying NDKMessenger:", e);
        }
      }
    };
  }, [isLoggedIn, loginType, privateKey, publicKey, setUser, incrementUnreadMessagesCount]);

  return (
    <NDKContext.Provider value={{ ndk, messenger, isReady }}>
      {children}
    </NDKContext.Provider>
  );
};
