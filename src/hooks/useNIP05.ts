'use client';

import { useState, useEffect } from 'react';
import { idLog } from '@/lib/utils/id-logger';

export type NIP05Status = 'idle' | 'loading' | 'valid' | 'invalid' | 'error';

// Simple module-level cache for NIP-05 verification results
const verificationCache: Record<string, NIP05Status> = {};
const verificationPromises: Record<string, Promise<NIP05Status>> = {};

export function useNIP05(pubkey: string | undefined, nip05: string | undefined) {
  const [status, setStatus] = useState<NIP05Status>(() => {
    if (!pubkey || !nip05) return 'idle';
    const cacheKey = `${pubkey}:${nip05}`;
    return verificationCache[cacheKey] || 'idle';
  });

  useEffect(() => {
    let isMounted = true;

    if (!pubkey || !nip05) {
      if (status !== 'idle') setStatus('idle');
      return;
    }

    const cacheKey = `${pubkey}:${nip05}`;
    if (verificationCache[cacheKey]) {
      if (status !== verificationCache[cacheKey]) setStatus(verificationCache[cacheKey]);
      return;
    }

    if (!nip05.includes('@')) {
      verificationCache[cacheKey] = 'invalid';
      if (status !== 'invalid') setStatus('invalid');
      return;
    }
    
    if (status !== 'loading' && !verificationPromises[cacheKey]) setStatus('loading');

    const verify = async () => {
      // If there's already a promise for this key, wait for it
      const existingPromise = verificationPromises[cacheKey];
      if (existingPromise) {
        const result = await existingPromise;
        if (isMounted) setStatus(result);
        return;
      }

      idLog.debug(`Verifying NIP-05: ${nip05} for ${pubkey}`);
      
      const verificationPromise = (async (): Promise<NIP05Status> => {
        try {
          const res = await fetch(`/api/nip05?identifier=${encodeURIComponent(nip05)}&t=${Date.now()}`);
          
          if (!res.ok) {
            idLog.warn(`NIP-05 fetch failed for ${nip05}: ${res.status}`);
            return 'error';
          }

          const data = await res.json();
          const [name] = nip05.split('@');
          const foundPubkey = data.names?.[name];
          const isValid = foundPubkey === pubkey;
          
          return isValid ? 'valid' : 'invalid';
        } catch (err) {
          idLog.error(`NIP-05 verification error for ${nip05}`, err);
          return 'error';
        }
      })();

      verificationPromises[cacheKey] = verificationPromise;
      const finalStatus = await verificationPromise;
      
      verificationCache[cacheKey] = finalStatus;
      delete verificationPromises[cacheKey];

      if (isMounted) {
        idLog.debug(`NIP-05 verification result for ${nip05}: ${finalStatus}`);
        setStatus(finalStatus);
      }
    };

    verify();

    return () => {
      isMounted = false;
    };
  }, [pubkey, nip05]); // eslint-disable-line react-hooks/exhaustive-deps

  return status;
}
