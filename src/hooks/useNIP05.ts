'use client';

import { useState, useEffect } from 'react';
import { idLog } from '@/lib/utils/id-logger';

export type NIP05Status = 'idle' | 'loading' | 'valid' | 'invalid' | 'error';

export function useNIP05(pubkey: string | undefined, nip05: string | undefined) {
  const [status, setStatus] = useState<NIP05Status>('idle');

  useEffect(() => {
    let isMounted = true;

    if (!pubkey || !nip05) {
      if (status !== 'idle') Promise.resolve().then(() => setStatus('idle'));
      return;
    }

    if (!nip05.includes('@')) {
      if (status !== 'invalid') Promise.resolve().then(() => setStatus('invalid'));
      return;
    }
    
    if (status !== 'loading') Promise.resolve().then(() => setStatus('loading'));

    const verify = async () => {
      idLog.debug(`Verifying NIP-05: ${nip05} for ${pubkey}`);
      try {
        const res = await fetch(`/api/nip05?identifier=${encodeURIComponent(nip05)}&t=${Date.now()}`);
        
        if (!isMounted) return;

        if (!res.ok) {
          idLog.warn(`NIP-05 fetch failed for ${nip05}: ${res.status}`);
          setStatus('error');
          return;
        }

        const data = await res.json();
        const [name] = nip05.split('@');
        
        const foundPubkey = data.names?.[name];

        if (isMounted) {
          const isValid = foundPubkey === pubkey;
          idLog.debug(`NIP-05 verification result for ${nip05}: ${isValid ? 'VALID' : 'INVALID'}`);
          setStatus(isValid ? 'valid' : 'invalid');
        }
      } catch (err) {
        if (isMounted) {
          idLog.error(`NIP-05 verification error for ${nip05}`, err);
          setStatus('error');
        }
      }
    };

    verify();

    return () => {
      isMounted = false;
    };
  }, [pubkey, nip05]); // eslint-disable-line react-hooks/exhaustive-deps

  return status;
}
