import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth";

export interface HandleStatus {
  name: string;
  fullHandle: string;
  registeredAt: Date;
  expiresAt: Date;
  daysRemaining: number;
  isExpiringSoon: boolean;
  created_at: string;
  relays: string[];
  is_primary: boolean;
  lightning_address?: string;
  pubkey: string;
}

interface HandleDetail {
  name: string;
  created_at: string;
  relays: string[];
  is_primary?: boolean;
  lightning_address?: string;
  pubkey: string;
}

export interface PendingHandle {
  name: string;
  amount: number;
  payment_request: string;
  payment_hash: string;
  created_at: string;
}

/**
 * Hook to check and monitor the expiration status of the user's registered handles.
 */
export function useHandleStatus() {
  const { user, isLoggedIn } = useAuthStore();
  const [handles, setHandles] = useState<HandleStatus[]>([]);
  const [pendingHandles, setPendingHandles] = useState<PendingHandle[]>([]);
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!user?.pubkey || !isLoggedIn) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/nip05/register?pubkey=${user.pubkey}`);
      const data = await res.json();

      if (data.allHandleDetails) {
        const statuses: HandleStatus[] = data.allHandleDetails.map((h: HandleDetail) => {
          const registeredAt = new Date(h.created_at);
          // Assuming 1 year duration
          const expiresAt = new Date(registeredAt);
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          
          const now = new Date();
          const diffTime = expiresAt.getTime() - now.getTime();
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          return {
            name: h.name,
            fullHandle: `${h.name}@tellit.id`,
            registeredAt,
            expiresAt,
            daysRemaining,
            isExpiringSoon: daysRemaining <= 30 && daysRemaining > 0,
            created_at: h.created_at,
            relays: h.relays,
            is_primary: !!h.is_primary,
            lightning_address: h.lightning_address,
            pubkey: h.pubkey
          };
        });
        
        setHandles(statuses);
      }

      if (data.pendingRegistrations) {
        setPendingHandles(data.pendingRegistrations);
      } else {
        setPendingHandles([]);
      }
    } catch (err) {
      console.error("Failed to check handle status:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.pubkey, isLoggedIn]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const expiringSoonHandles = handles.filter(h => h.isExpiringSoon);

  return { 
    handles, 
    pendingHandles,
    expiringSoonHandles, 
    loading, 
    refresh: checkStatus 
  };
}
