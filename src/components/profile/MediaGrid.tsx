"use client";

import React, { useState } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useProfile } from "@/hooks/useProfile";
import Image from "next/image";
import Link from "next/link";
import { Play, FileText, Image as ImageIcon } from "lucide-react";
import { tokenize, parseImeta } from "@/lib/content/tokenizer";
import { getPostUrl, getArticleUrl } from "@/lib/utils/identity";
import { Blurhash } from "react-blurhash";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Lightbox } from "@/components/common/Lightbox";
import { cn } from "@/lib/utils";

interface MediaGridProps {
  posts: NDKEvent[];
  isLoading: boolean;
}

export function MediaGrid({ posts, isLoading }: MediaGridProps) {
  const [lightboxData, setLightboxData] = useState<{ src: string; type: "image" | "video"; href: string } | null>(null);

  if (isLoading && posts.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 sm:p-4">
        {[...Array(9)].map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 sm:p-4 animate-in fade-in duration-500">
      {posts.map((post) => (
        <MediaItem 
          key={post.id} 
          post={post} 
          onOpenLightbox={(src, type, href) => setLightboxData({ src, type, href })} 
        />
      ))}

      <Lightbox 
        media={lightboxData ? [{ url: lightboxData.src, type: lightboxData.type }] : []} 
        postHref={lightboxData?.href}
        isOpen={!!lightboxData} 
        onClose={() => setLightboxData(null)} 
      />
    </div>
  );
}

function MediaItem({ post, onOpenLightbox }: { post: NDKEvent; onOpenLightbox: (src: string, type: "image" | "video", href: string) => void }) {
  const [loaded, setLoaded] = useState(false);
  const { profile } = useProfile(post.pubkey);
  const media = React.useMemo(() => {
    // 1. Check imeta tags
    for (const tag of post.tags) {
      const meta = parseImeta(tag);
      if (meta && meta.url) {
        return { 
          url: meta.url, 
          type: meta.mimeType?.startsWith('video/') ? 'video' : 'image',
          blurhash: meta.blurhash
        };
      }
    }

    // 2. Check for NIP-94 (File Metadata) or Kind 20
    if (post.kind === 1063 || post.kind === 20) {
      const url = post.tags.find(t => t[0] === 'url')?.[1];
      const type = post.tags.find(t => t[0] === 'm')?.[1] || "";
      if (url) {
        return { 
          url, 
          type: type.startsWith('video') ? 'video' : (type.startsWith('audio') ? 'audio' : 'image'),
          blurhash: post.tags.find(t => t[0] === 'blurhash')?.[1]
        };
      }
    }

    // 3. Check kind 30023 image tag
    if (post.kind === 30023) {
      const image = post.tags.find(t => t[0] === 'image')?.[1];
      if (image) return { url: image, type: 'image', blurhash: undefined };
    }

    // 4. Tokenize content for media
    const tokens = tokenize(post.content);
    const firstMedia = tokens.find(t => t.type === 'image' || t.type === 'video');
    if (firstMedia) {
      return { url: firstMedia.value, type: firstMedia.type, blurhash: undefined };
    }

    return null;
  }, [post]);

  if (!media) return null;

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenLightbox(media.url, media.type as "image" | "video", href);
  };

  const href = post.kind === 30023 
    ? getArticleUrl(post, profile)
    : getPostUrl(post, profile);

  return (
    <Link 
      href={href}
      className="group relative aspect-square bg-muted overflow-hidden rounded-xl border border-border transition-all hover:ring-2 hover:ring-primary hover:ring-offset-2 dark:hover:ring-offset-background"
      aria-label={`View post with ${media.type}`}
      onClick={handleOpen}
    >
      {/* Placeholder: Blurhash */}
      {!loaded && media.blurhash && (
        <div className="absolute inset-0 z-0">
          <Blurhash
            hash={media.blurhash}
            width="100%"
            height="100%"
            resolutionX={32}
            resolutionY={32}
            punch={1}
          />
        </div>
      )}

      {media.type === 'video' ? (
        <div className="w-full h-full relative">
          <video src={media.url} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <Play fill="white" className="text-white drop-shadow-lg" size={32} aria-hidden="true" />
          </div>
        </div>
      ) : (
        <Image 
          src={media.url} 
          alt="" 
          fill 
          className={cn(
            "object-cover transition-all duration-700 group-hover:scale-110",
            loaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setLoaded(true)}
          unoptimized 
        />
      )}
      
      {/* Overlay info */}
      <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center p-2">
        {post.kind === 30023 && (
          <Badge variant="default" className="gap-1.5 font-black text-[10px] uppercase tracking-widest bg-primary px-3 py-1 rounded-full mb-2 shadow-lg">
            <FileText size={12} aria-hidden="true" />
            <span>Article</span>
          </Badge>
        )}
        <div className="flex items-center gap-1.5 text-foreground drop-shadow-md">
          <ImageIcon size={14} aria-hidden="true" />
          <span className="text-[10px] font-black uppercase tracking-widest">View Post</span>
        </div>
      </div>
    </Link>
  );
}
