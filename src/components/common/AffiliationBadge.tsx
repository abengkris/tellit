'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useProfile } from '@/hooks/useProfile';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface AffiliationBadgeProps {
  affiliationPubkey: string;
  isPost?: boolean;
}

export const AffiliationBadge: React.FC<AffiliationBadgeProps> = ({
  affiliationPubkey,
  isPost = false,
}) => {
  const { profile, loading, profileUrl } = useProfile(affiliationPubkey);

  if (loading) {
    const size = isPost ? 16 : 22;
    return <Skeleton className="rounded-md shrink-0" style={{ width: size, height: size }} />;
  }

  if (!profile?.picture) return null;

  const size = isPost ? 16 : 22;

  const content = (
    <Badge variant="secondary" className="p-0 overflow-hidden border-white/20 shadow-sm shrink-0" style={{ width: size, height: size }}>
      <Image
        src={profile.picture}
        alt=""
        width={size}
        height={size}
        className="object-cover w-full h-full"
        unoptimized
      />
    </Badge>
  );

  // Avoid nested links if we are already in a post (which is wrapped in a Link)
  if (isPost) {
    return content;
  }

  return (
    <Link 
      href={profileUrl}
      className="shrink-0 transition-transform hover:scale-110 active:scale-95 flex"
      onClick={(e) => e.stopPropagation()}
      title={`Affiliated with ${profile.display_name || profile.name || 'Organization'}`}
    >
      {content}
    </Link>
  );
};
