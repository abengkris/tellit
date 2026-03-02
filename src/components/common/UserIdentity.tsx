'use client';

import React from 'react';
import { BadgeCheck, Loader2, AlertCircle } from 'lucide-react';
import { useNIP05 } from '@/hooks/useNIP05';
import { shortenPubkey } from '@/lib/utils/nip19';

interface UserIdentityProps {
  pubkey: string;
  displayName?: string;
  nip05?: string;
  variant?: 'post' | 'profile';
  className?: string;
}

export const UserIdentity: React.FC<UserIdentityProps> = ({
  pubkey,
  displayName,
  nip05,
  variant = 'post',
  className = '',
}) => {
  const status = useNIP05(pubkey, nip05);

  const isPost = variant === 'post';
  
  // Use shortenPubkey helper instead of manual slicing
  const processedName = displayName || (pubkey ? shortenPubkey(pubkey) : "Anonymous");

  return (
    <div className={`flex flex-col min-w-0 ${isPost ? 'gap-0' : 'gap-1'} ${className}`}>
      <div className="flex items-center gap-1 min-w-0">
        <span className={`font-bold truncate ${isPost ? 'text-sm' : 'text-xl'}`}>
          {processedName}
        </span>

        {/* Badge logic */}
        {status === 'loading' && (
          <div className="w-3 h-3 rounded-full bg-zinc-800 animate-pulse" />
        )}

        {status === 'valid' && (
          <BadgeCheck
            size={isPost ? 14 : 20}
            className="text-amber-500 fill-amber-500/10 shrink-0"
          />
        )}

        {status === 'invalid' && (
          <AlertCircle
            size={isPost ? 14 : 20}
            className="text-red-500 shrink-0"
          />
        )}
      </div>

      {nip05 && (
        <span
          className={`
            truncate
            ${isPost ? 'text-xs text-zinc-500 max-w-[100px] sm:max-w-[150px]' : 'text-sm font-medium text-blue-500'}
            ${status === 'invalid' ? 'text-red-500' : ''}
          `}
        >
          {nip05}
        </span>
      )}
    </div>
  );
};
