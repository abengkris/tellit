'use client';

import React, { useState } from 'react';
import { BadgeCheck, Loader2, AlertCircle, X, ExternalLink } from 'lucide-react';
import { useNIP05 } from '@/hooks/useNIP05';
import { useAffiliation } from '@/hooks/useAffiliation';
import { useProfile } from '@/hooks/useProfile';
import { shortenPubkey, toNpub } from '@/lib/utils/nip19';
import { Emojify } from './Emojify';
import { AffiliationBadge } from './AffiliationBadge';
import Link from 'next/link';
import Image from 'next/image';

interface UserIdentityProps {
  pubkey: string;
  displayName?: string;
  nip05?: string;
  variant?: 'post' | 'profile';
  className?: string;
  tags?: string[][];
}

export const UserIdentity: React.FC<UserIdentityProps> = ({
  pubkey,
  displayName,
  nip05,
  variant = 'post',
  className = '',
  tags,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const status = useNIP05(pubkey, nip05);
  const affiliationPubkey = useAffiliation(nip05);
  const { profile: orgProfile } = useProfile(affiliationPubkey || undefined);

  const isPost = variant === 'post';
  const isProfile = variant === 'profile';
  
  // Use shortenPubkey helper instead of manual slicing
  const processedName = displayName || (pubkey ? shortenPubkey(pubkey) : "Anonymous");

  const orgName = orgProfile?.name || orgProfile?.displayName || (affiliationPubkey ? shortenPubkey(affiliationPubkey) : '');
  const orgNpub = affiliationPubkey ? toNpub(affiliationPubkey) : '';

  return (
    <div className={`flex flex-col min-w-0 ${isPost ? 'gap-0' : 'gap-1'} ${className}`}>
      <div className="flex items-center gap-1 min-w-0">
        <span 
          className={`font-bold truncate ${isPost ? 'text-sm' : 'text-xl'} ${isProfile && affiliationPubkey ? 'cursor-pointer hover:underline' : ''}`}
          onClick={() => isProfile && affiliationPubkey && setIsModalOpen(true)}
        >
          <Emojify text={processedName} tags={tags} className={isPost ? "w-4 h-4" : "w-6 h-6"} />
        </span>

        {/* Badge logic */}
        {status === 'loading' && (
          <div className="w-3 h-3 rounded-full bg-zinc-800 animate-pulse" />
        )}

        {status === 'valid' && (
          <>
            <BadgeCheck
              size={isPost ? 14 : 20}
              className="text-amber-500 fill-amber-500/10 shrink-0"
            />
            {affiliationPubkey && (
              <AffiliationBadge 
                affiliationPubkey={affiliationPubkey} 
                isPost={isPost} 
              />
            )}
          </>
        )}

        {status === 'invalid' && (
          <AlertCircle
            size={isPost ? 14 : 20}
            className="text-red-500 shrink-0"
          />
        )}
      </div>

      {/* Affiliation Modal */}
      {isModalOpen && affiliationPubkey && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-zinc-950 w-full max-w-sm rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-2">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/10 rounded-full shrink-0">
                  <BadgeCheck size={24} className="text-amber-500" />
                </div>
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  This account is verified because it&apos;s an affiliate of{' '}
                  <Link 
                    href={`/${orgNpub}`} 
                    className="text-blue-500 font-bold hover:underline inline-flex items-center gap-0.5"
                    onClick={() => setIsModalOpen(false)}
                  >
                    @{orgName} <ExternalLink size={12} />
                  </Link>{' '}
                  on Nostr.
                </p>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-200 shrink-0 shadow-sm border border-white/20">
                  <Image 
                    src={orgProfile?.picture || `https://robohash.org/${affiliationPubkey}?set=set1`} 
                    alt={orgName} 
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Affiliate</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    This account is affiliated with{' '}
                    <Link 
                      href={`/${orgNpub}`} 
                      className="font-bold text-blue-500 hover:underline"
                      onClick={() => setIsModalOpen(false)}
                    >
                      {orgName}
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsModalOpen(false)}
              className="w-full mt-8 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black font-bold rounded-full hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {nip05 && (
        <span
          className={`
            truncate
            ${isPost ? 'text-xs text-zinc-500 max-w-[100px] sm:max-w-[150px]' : 'text-sm font-medium text-blue-500 max-w-[250px] sm:max-w-[400px]'}
            ${status === 'invalid' ? 'text-red-500' : ''}
          `}
        >
          {nip05.startsWith('_@') ? nip05.substring(1) : nip05}
        </span>
      )}
    </div>
  );
};
