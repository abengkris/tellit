import { useState, useEffect, useCallback } from "react";
import { useNDK } from "@/hooks/useNDK";
import { HandleStatus } from "@/hooks/useHandleStatus";

export interface VerificationResult {
  isValid: boolean;
  profileNip05?: string;
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

      if (!profile || !profile.nip05) {
        setResult({ isValid: false, error: "NIP-05 is not set on your profile" });
      } else if (profile.nip05 !== handle.fullHandle) {
        setResult({ 
          isValid: false, 
          profileNip05: profile.nip05, 
          error: `Profile has ${profile.nip05}, but you are managing ${handle.fullHandle}` 
        });
      } else {
        setResult({ isValid: true, profileNip05: profile.nip05 });
      }
    } catch (err) {
      console.error("Verification error:", err);
      setResult({ isValid: false, error: "Failed to fetch Nostr profile" });
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, handle]);

  useEffect(() => {
    verify();
  }, [verify]);

  return { result, loading, refresh: verify };
}
