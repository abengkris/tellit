'use client';

import { useState, useEffect } from 'react';

const affiliationCache: Record<string, string | null> = {};

export function useAffiliation(nip05: string | undefined) {
  const [affiliationPubkey, setAffiliationPubkey] = useState<string | null>(null);

  useEffect(() => {
    if (!nip05 || !nip05.includes('@')) {
      if (affiliationPubkey !== null) Promise.resolve().then(() => setAffiliationPubkey(null));
      return;
    }

    const [name, domain] = nip05.split('@');
    const domainPart = domain.split('.')[0];
    
    // If the name is already '_' or matches the domain name (e.g. primal@primal.net), 
    // it's the root identity, no need to show affiliation with itself
    if (name === '_' || name === domainPart) {
      if (affiliationPubkey !== null) Promise.resolve().then(() => setAffiliationPubkey(null));
      return;
    }

    if (domain in affiliationCache) {
      const cached = affiliationCache[domain];
      if (affiliationPubkey !== cached) {
        Promise.resolve().then(() => setAffiliationPubkey(cached));
      }
      return;
    }

    let isMounted = true;

    const fetchAffiliation = async () => {
      try {
        let rootPubkey: string | undefined;

        // 1. Try _@domain first (Standard NIP-05 root)
        try {
          const res = await fetch(`/api/nip05?identifier=${encodeURIComponent(`_@${domain}`)}`);
          if (res.ok) {
            const data = await res.json();
            rootPubkey = data.names?.['_'];
          }
        } catch (_) {
          // ignore error for first try
        }
        
        if (!isMounted) return;

        // 2. Fallback to domainPart@domain (e.g. primal@primal.net)
        if (!rootPubkey && domainPart) {
          try {
            const resFallback = await fetch(`/api/nip05?identifier=${encodeURIComponent(`${domainPart}@${domain}`)}`);
            if (resFallback.ok) {
              const dataFallback = await resFallback.json();
              rootPubkey = dataFallback.names?.[domainPart];
            }
          } catch (_) {
            // ignore
          }
        }

        if (isMounted) {
          const result = rootPubkey || null;
          affiliationCache[domain] = result;
          setAffiliationPubkey(result);
        }
      } catch (_) {
        if (isMounted) {
          affiliationCache[domain] = null;
          setAffiliationPubkey(null);
        }
      }
    };

    fetchAffiliation();

    return () => {
      isMounted = false;
    };
  }, [nip05]); // eslint-disable-line react-hooks/exhaustive-deps

  return affiliationPubkey;
}
