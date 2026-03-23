"use client";

import React, { useMemo } from "react";
import { tokenize, Token } from "@/lib/content/tokenizer";
import { MentionLink } from "../post/tokens/MentionLink";
import { HashtagLink } from "../post/tokens/HashtagLink";
import { ImageEmbed } from "../post/tokens/ImageEmbed";
import { VideoEmbed } from "../post/tokens/VideoEmbed";
import { ShortenedUrl } from "../post/tokens/ShortenedUrl";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { cn } from "@/lib/utils";

interface MessageBubbleContentProps {
  text: string;
  event: NDKEvent;
  isMe?: boolean;
}

export const MessageBubbleContent: React.FC<MessageBubbleContentProps> = ({ text, event, isMe }) => {
  const emojiMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const tag of event.tags) {
      if (tag[0] === "emoji" && tag[1] && tag[2]) {
        map.set(`:${tag[1]}:`, tag[2]);
      }
    }
    return map;
  }, [event.tags]);

  const tokens = useMemo(() => tokenize(text), [text]);

  const cleanUrlFn = (u: string) => u.replace(/[.,;!?:()\[\]{}'"]+$/, "");

  const isMediaUrl = (url: string) => {
    const cleaned = cleanUrlFn(url);
    const path = cleaned.split('?')[0].split('#')[0].toLowerCase();
    return !!path.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|jfif|mp4|mov|webm|ogg)$/);
  };

  const { textTokens, mediaTokens } = useMemo(() => {
    const textT: Token[] = [];
    const mediaT: Token[] = [];

    for (const token of tokens) {
      if (token.type === "image" || token.type === "video") {
        mediaT.push(token);
      } else if (token.type === "url") {
        const cleanUrl = cleanUrlFn(token.value);
        if (isMediaUrl(cleanUrl)) {
          const path = cleanUrl.split('?')[0].split('#')[0].toLowerCase();
          const isVideo = path.match(/\.(mp4|mov|webm|ogg)$/);
          mediaT.push({
            ...token,
            type: isVideo ? "video" : "image",
            value: cleanUrl
          });
        } else {
          textT.push(token);
        }
      } else {
        textT.push(token);
      }
    }

    return { textTokens: textT, mediaTokens: mediaT };
  }, [tokens]);

  return (
    <div className="flex flex-col gap-3">
      {textTokens.length > 0 && (
        <div className={cn(
          "whitespace-pre-wrap break-words leading-relaxed text-[15px]",
          isMe ? "text-primary-foreground" : "text-foreground"
        )}>
          {textTokens.map((token, i) => (
            <MessageTokenRenderer key={i} token={token} emojiMap={emojiMap} isMe={isMe} />
          ))}
        </div>
      )}
      
      {mediaTokens.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          {mediaTokens.map((token, i) => (
            <div key={i} className="max-w-full rounded-2xl overflow-hidden border border-border shadow-sm">
              {token.type === "image" ? (
                <ImageEmbed url={token.value} noMargin className="max-h-80 object-contain bg-muted/20" />
              ) : (
                <VideoEmbed url={token.value} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function MessageTokenRenderer({ token, emojiMap, isMe }: { token: Token; emojiMap: Map<string, string>; isMe?: boolean }) {
  switch (token.type) {
    case "text": {
      const parts = token.value.split(/(:[a-zA-Z0-9_]+:)/g);
      return (
        <>
          {parts.map((part, i) => {
            const emojiUrl = emojiMap.get(part);
            if (emojiUrl) {
              return (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={i}
                  src={emojiUrl}
                  alt={part}
                  className="inline-block size-5 align-middle mx-0.5"
                  loading="lazy"
                />
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </>
      );
    }
    case "linebreak": return <br />;
    case "mention": return <MentionLink pubkey={token.decoded?.pubkey ?? ""} raw={token.value} className={isMe ? "text-primary-foreground underline decoration-primary-foreground/30" : ""} />;
    case "hashtag": return <HashtagLink tag={token.value.slice(1)} className={isMe ? "text-primary-foreground underline decoration-primary-foreground/30" : ""} />;
    case "url": return <ShortenedUrl url={token.value} className={isMe ? "text-primary-foreground underline decoration-primary-foreground/30" : ""} />;
    default: return null;
  }
}
