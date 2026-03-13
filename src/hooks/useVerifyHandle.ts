import { useState, useEffect, useCallback } from "react";
import { useNDK } from "@/hooks/useNDK";
import { HandleStatus } from "@/hooks/useHandleStatus";

export interface VerificationResult {
  isValid: boolean;
  profileNip05?: string;
  profileLud16?: string;
  isNip05Valid: boolean;
  isLud16Valid: boolean;
  error?: string;
}

/**
 * Hook to verify if a handle is correctly set in the user's Nostr profile metadata.
 */
export function useVerifyHandle(handle: HandleStatus | null) {
  const { ndk, isReady } = useNDK();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const verify = useCallback(async () => {
    if (!ndk || !isReady || !handle) return;

    setLoading(true);
    try {
      const pubkey = handle.pubkey;
      
      const nostrUser = ndk.getUser({ pubkey });
      const profile = await nostrUser.fetchProfile();

      const isNip05Valid = profile?.nip05 === handle.fullHandle;
      const isLud16Valid = profile?.lud16 === handle.fullHandle;

      if (!profile) {
        setResult({ isValid: false, isNip05Valid: false, isLud16Valid: false, error: "Profile not found" });
      } else {
        setResult({ 
          isValid: isNip05Valid && isLud16Valid, 
          isNip05Valid,
          isLud16Valid,
          profileNip05: profile.nip05, 
          profileLud16: profile.lud16,
          error: !isNip05Valid ? "NIP-05 mismatch" : (!isLud16Valid ? "Lightning Address mismatch" : undefined)
        });
      }
    } catch (err) {
      console.error("Verification error:", err);
      setResult({ isValid: false, isNip05Valid: false, isLud16Valid: false, error: "Failed to fetch Nostr profile" });
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, handle]);

  useEffect(() => {
    verify();
  }, [verify]);

  return { result, loading, refresh: verify };
}
