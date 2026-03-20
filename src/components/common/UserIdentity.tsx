'use client';

import React, { useState } from 'react';
import { BadgeCheck, AlertCircle, ExternalLink, Activity } from 'lucide-react';
import { useNIP05 } from '@/hooks/useNIP05';
import { useAffiliation } from '@/hooks/useAffiliation';
import { useProfile } from '@/hooks/useProfile';
import { useUserStatus } from '@/hooks/useUserStatus';
import { shortenPubkey, toNpub } from '@/lib/utils/nip19';
import { Emojify } from './Emojify';
import { AffiliationBadge } from './AffiliationBadge';
import Link from 'next/link';
import { Avatar } from './Avatar';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface UserIdentityProps {
  pubkey: string;
  display_name?: string;
  name?: string;
  nip05?: string;
  variant?: 'post' | 'profile';
  className?: string;
  tags?: string[][];
}

export const UserIdentity: React.FC<UserIdentityProps> = ({
  pubkey,
  display_name,
  name,
  nip05,
  variant = 'post',
  className = '',
  tags,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const status = useNIP05(pubkey, nip05);
  const affiliationPubkey = useAffiliation(nip05);
  const { generalStatus } = useUserStatus(pubkey);

  const [nip05Name, domain] = nip05?.split('@') || [];
  const domainPart = domain?.split('.')[0];
  const isOrg = nip05Name === '_' || nip05Name === domainPart;
  const isTellIt = domain === 'tellit.id';
  
  // Only fetch org profile when modal is open to save resources
  const { profile: orgProfile, loading: orgLoading } = useProfile(isModalOpen ? (affiliationPubkey || undefined) : undefined);

  const isPost = variant === 'post';
  const isProfile = variant === 'profile';
  
  // Use display_name first, then name, then pubkey
  const processedName = display_name || name || (pubkey ? shortenPubkey(pubkey) : "Anonymous");

  const orgName = orgProfile?.display_name || orgProfile?.name || (affiliationPubkey ? shortenPubkey(affiliationPubkey) : '');
  const orgNpub = affiliationPubkey ? toNpub(affiliationPubkey) : '';

  return (
    <div className={cn("flex flex-col min-w-0", isPost ? "gap-0" : "gap-0.5", className)}>
      <div className="flex items-center gap-1 min-w-0">
        <span 
          className={cn(
            "font-black truncate",
            isPost ? "text-sm" : "text-2xl tracking-tight",
            isProfile && affiliationPubkey ? "cursor-pointer hover:underline" : ""
          )}
          onClick={() => isProfile && affiliationPubkey && setIsModalOpen(true)}
        >
          <Emojify text={processedName} tags={tags} />
        </span>

        {/* Badge logic */}
        {status === 'loading' && (
          <div className="size-3 rounded-full bg-muted animate-pulse shrink-0" />
        )}

        {status === 'valid' && (
          <>
            <BadgeCheck
              size={isPost ? 14 : 22}
              className={cn(
                "shrink-0",
                isTellIt ? "text-blue-500 fill-blue-500/10" : 
                (isOrg ? "text-amber-500 fill-amber-500/10" : "text-primary fill-primary/10")
              )}
              aria-hidden="true"
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
            size={isPost ? 14 : 22}
            className="text-destructive shrink-0"
            aria-hidden="true"
          />
        )}

        {/* NIP-38 User Status */}
        {isPost && generalStatus?.content && (
          <div className="flex items-center gap-1 ml-1 px-1.5 py-0.5 bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 text-primary rounded-full text-[9px] font-black uppercase tracking-tighter shrink-0 animate-in fade-in zoom-in-95">
            <Activity size={10} aria-hidden="true" />
            <span className="max-w-[80px] truncate">
              <Emojify text={generalStatus.content} tags={tags} />
            </span>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[80vh]">
          <DialogHeader className="p-6 border-b shrink-0">
            <DialogTitle className="font-black text-xl flex items-center gap-2">
              <BadgeCheck className="text-amber-500 size-6" aria-hidden="true" />
              Affiliation Detail
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-8 space-y-8">
              <div className="flex items-start gap-4">
                <p className="text-sm leading-relaxed text-muted-foreground font-medium">
                  This account is verified because it&apos;s an affiliate of{' '}
                  <Link 
                    href={`/${orgNpub}`} 
                    className="text-primary font-black hover:underline inline-flex items-center gap-0.5"
                    onClick={() => setIsModalOpen(false)}
                  >
                    @{orgName} <ExternalLink size={12} aria-hidden="true" />
                  </Link>{' '}
                  on Nostr.
                </p>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-3xl bg-muted/30 border border-border">
                <Avatar 
                  pubkey={affiliationPubkey || ""} 
                  src={orgProfile?.picture} 
                  size={56}
                  isLoading={orgLoading}
                  className="rounded-2xl shrink-0 shadow-sm"
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0 py-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Affiliate</p>
                  <Link 
                    href={`/${orgNpub}`} 
                    className="font-black text-primary hover:underline text-base truncate block"
                    onClick={() => setIsModalOpen(false)}
                  >
                    {orgName}
                  </Link>
                </div>
              </div>

              <Button 
                onClick={() => setIsModalOpen(false)}
                className="w-full h-12 rounded-2xl font-black shadow-lg"
              >
                Close
              </Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {nip05 && (
        <span
          className={cn(
            "truncate font-medium",
            isPost ? "text-[11px] text-muted-foreground max-w-[100px] sm:max-w-[150px]" : "text-sm text-primary max-w-[250px] sm:max-w-[400px]",
            status === 'invalid' && "text-destructive"
          )}
        >
          {nip05.startsWith('_@') ? nip05.substring(1) : nip05}
        </span>
      )}
    </div>
  );
};
