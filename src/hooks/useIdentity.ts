import { useState, useEffect } from "react";
import { decodeNip19 } from "@/lib/utils/nip19";
import { isVanitySlug } from "@/lib/utils/identity";
import { supabase } from "@/lib/supabase";
import { idLog } from "@/lib/utils/id-logger";

/**
 * Hook to resolve a slug (vanity name, npub, or hex) to a hex pubkey.
 */
export function useResolveIdentity(slug: string | undefined) {
  const [hexPubkey, setHexPubkey] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!slug);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!slug) {
      setHexPubkey(null);
      setLoading(false);
      return;
    }

    async function resolve() {
      const tracker = idLog.trackResolution(slug!);
      setLoading(true);
      setError(null);

      try {
        // 1. Check if it's an npub
        if (slug!.startsWith("npub1")) {
          const { id } = decodeNip19(slug!);
          tracker.success("nip19-npub", id);
          setHexPubkey(id);
          setLoading(false);
          return;
        }

        // 2. Check if it's a vanity slug
        if (isVanitySlug(slug!)) {
          if (!supabase) {
            tracker.fail("supabase", "Client not initialized");
            throw new Error("Supabase client not initialized");
          }

          const name = (slug!.startsWith('@') ? slug!.slice(1) : slug!).toLowerCase();

          const { data, error: dbError } = await supabase
            .from("handles")
            .select("pubkey")
            .eq("name", name)
            .single();

          if (dbError || !data) {
            tracker.fail("internal-db", dbError);
            // If not found in handles, it might still be a hex pubkey
            if (/^[0-9a-fA-F]{64}$/.test(slug!)) {
              tracker.success("hex-fallback", slug!);
              setHexPubkey(slug!);
            } else {
              setHexPubkey(null);
            }
          } else {
            tracker.success("internal-db", data.pubkey);
            setHexPubkey(data.pubkey);
          }
          setLoading(false);
          return;
        }

        // 3. Fallback to hex decoding if it's a 64 char hex string
        if (/^[0-9a-fA-F]{64}$/.test(slug!)) {
          tracker.success("hex-direct", slug!);
          setHexPubkey(slug!);
        } else {
          tracker.fatal("Resolution exhausted");
          setHexPubkey(null);
        }
      } catch (err) {
        tracker.fatal(err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setHexPubkey(null);
      } finally {
        setLoading(false);
      }
    }

    resolve();
  }, [slug]);

  return { hexPubkey, loading, error };
}
