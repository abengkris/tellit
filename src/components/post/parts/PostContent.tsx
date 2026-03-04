"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { tokenize, Token, resolveDeprecatedMentions, buildImetaMap } from "@/lib/content/tokenizer";
import { MentionLink } from "../tokens/MentionLink";
import { HashtagLink } from "../tokens/HashtagLink";
import { ImageEmbed } from "../tokens/ImageEmbed";
import { VideoEmbed } from "../tokens/VideoEmbed";
import { QuoteEmbed } from "../tokens/QuoteEmbed";
import { LightningCard } from "../tokens/LightningCard";
import { CashuCard } from "../tokens/CashuCard";
import { ShortenedUrl } from "../tokens/ShortenedUrl";
import { UrlPreview } from "../tokens/UrlPreview";
import { AsyncMediaEmbed } from "../tokens/AsyncMediaEmbed";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { shortenPubkey, toNpub } from "@/lib/utils/nip19";
import { useProfile } from "@/hooks/useProfile";

interface PostContentRendererProps {
  content: string;
  event: NDKEvent;
  renderMedia?: boolean;
  renderQuotes?: boolean;
  maxLines?: number;
  className?: string;
  replyingToPubkey?: string | null;
  isRepost?: boolean;
  isArticle?: boolean;
  isFullArticle?: boolean;
}

const ReplyRecipient: React.FC<{ pubkey: string }> = ({ pubkey }) => {
  const { profile } = useProfile(pubkey);
  const displayName = profile?.name || profile?.displayName || shortenPubkey(pubkey);
  
  return (
    <Link href={`/${toNpub(pubkey)}`} className="text-blue-500 hover:underline font-bold">
      @{displayName}
    </Link>
  );
};

export function PostContentRenderer({
  content,
  event,
  renderMedia = true,
  renderQuotes = true,
  maxLines,
  className = "",
  replyingToPubkey,
  isRepost,
  isArticle,
  isFullArticle = false,
}: PostContentRendererProps) {
  const [showFull, setShowFull] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);

  const nudeDetections = useMemo(() => {
    const map = new Map<string, number>();
    for (const tag of event.tags) {
      if (tag[0] === "nude_detector" && tag[1]) {
        const parts = tag[1].split(' ');
        if (parts.length >= 3) {
          const url = parts[0];
          const score = parseFloat(parts[2]);
          if (!isNaN(score)) {
            map.set(url, score);
          }
        }
      }
    }
    return map;
  }, [event.tags]);

  const contentWarning = useMemo(() => {
    const tag = event.tags.find(t => t[0] === "content-warning");
    if (tag) return tag[1] || "Sensitive content";
    const highScores = Array.from(nudeDetections.values()).filter(score => score > 0.5);
    if (highScores.length > 0) return "Media may contain sensitive content (detected)";
    return null;
  }, [event.tags, nudeDetections]);

  const isLong = content.length > 600;
  const shouldTruncate = isLong && !showFull && !isFullArticle;
  const imetaMap = useMemo(() => buildImetaMap(event.tags), [event.tags]);
  const normalizedContent = useMemo(() => resolveDeprecatedMentions(content, event.tags), [content, event.tags]);

  const emojiMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const tag of event.tags) {
      if (tag[0] === "emoji" && tag[1] && tag[2]) {
        map.set(`:${tag[1]}:`, tag[2]);
      }
    }
    return map;
  }, [event.tags]);

  const tokens = useMemo(() => tokenize(normalizedContent), [normalizedContent]);

  const textTokens: Token[] = [];
  const mediaTokens: Token[] = [];
  const quoteTokens: Token[] = [];
  const cardTokens: Token[] = [];
  const urlTokens: Token[] = [];

  for (const token of tokens) {
    if (token.type === "image" || token.type === "video") {
      mediaTokens.push(token);
    } else if (token.type === "note_ref" && renderQuotes) {
      quoteTokens.push(token);
    } else if (token.type === "lightning" || token.type === "cashu") {
      cardTokens.push(token);
    } else if (token.type === "url") {
      urlTokens.push(token);
      textTokens.push(token);
    } else {
      textTokens.push(token);
    }
  }

  // NIP-18: Collect quotes from 'q' tags that aren't already in the text
  const extraQuotes = useMemo(() => {
    if (!renderQuotes) return [];
    const qTags = event.tags.filter(t => t[0] === 'q');
    const existingIds = new Set(quoteTokens.map(t => t.decoded?.eventId).filter(Boolean));
    
    return qTags
      .map(t => ({ id: t[1], relays: t[2] ? [t[2]] : undefined }))
      .filter(q => !existingIds.has(q.id));
  }, [event.tags, quoteTokens, renderQuotes]);

  while (
    textTokens.length > 0 &&
    (textTokens[textTokens.length - 1].type === "linebreak" ||
      textTokens[textTokens.length - 1].value.trim() === "")
  ) {
    textTokens.pop();
  }

  return (
    <div className={`flex flex-col min-w-0 max-w-full overflow-hidden ${className}`}>
      {isArticle && !isFullArticle && (
        <div className="flex flex-col gap-3">
          {event.tags.find(t => t[0] === 'image')?.[1] && (
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <img 
                src={event.tags.find(t => t[0] === 'image')?.[1]} 
                alt={event.tags.find(t => t[0] === 'title')?.[1] || "Article hero"}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 leading-tight">
            {event.tags.find(t => t[0] === 'title')?.[1] || "Untitled Article"}
          </h2>
          {event.tags.find(t => t[0] === 'summary')?.[1] && (
            <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 italic">
              {event.tags.find(t => t[0] === 'summary')?.[1]}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-blue-500 text-xs font-bold hover:underline">Read article →</span>
          </div>
        </div>
      )}

      {(!isArticle || isFullArticle) && replyingToPubkey && !isRepost && (
        <div className="text-gray-500 text-xs mb-1" onClick={(e) => e.stopPropagation()}>
          Replying to <ReplyRecipient pubkey={replyingToPubkey} />
        </div>
      )}

      {(!isArticle || isFullArticle) && (contentWarning && !showSensitive ? (
        <div 
          className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 my-2 flex flex-col items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center text-center">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Content Warning</span>
            <span className="text-xs text-gray-500">{contentWarning}</span>
          </div>
          <button
            onClick={() => setShowSensitive(true)}
            className="px-4 py-1.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-full text-xs font-bold transition-colors"
          >
            Show Content
          </button>
        </div>
      ) : (
        <>
          {textTokens.length > 0 && (
            <div className="relative group">
              <div
                className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 text-pretty min-w-0 ${
                  shouldTruncate ? "max-h-[300px] overflow-hidden" : ""
                } ${
                  maxLines && !showFull ? `line-clamp-${maxLines}` : ""
                }`}
              >
                {textTokens.map((token, i) => (
                  <TokenRenderer key={i} token={token} emojiMap={emojiMap} />
                ))}
              </div>
              
              {isLong && !isFullArticle && (
                <div className={`${shouldTruncate ? "absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-black via-white/80 dark:via-black/80 to-transparent flex items-end justify-center pb-2" : "mt-2 flex justify-start"}`}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowFull(!showFull); }}
                    className={`text-blue-500 hover:text-blue-600 font-bold text-sm transition-all active:scale-95 ${
                      shouldTruncate ? "bg-white/90 dark:bg-black/90 backdrop-blur-sm px-4 py-1.5 rounded-full border border-blue-500/20 shadow-sm hover:border-blue-500/40" : "hover:underline"
                    }`}
                  >
                    {showFull ? "Show less" : "Show more"}
                  </button>
                </div>
              )}
            </div>
          )}

          {cardTokens.length > 0 && (
            <div className="space-y-1">
              {cardTokens.map((token, i) => (
                token.type === "lightning" 
                  ? <LightningCard key={i} invoice={token.value} />
                  : <CashuCard key={i} token={token.value} />
              ))}
            </div>
          )}

          {renderMedia && mediaTokens.length > 0 && (
            <div className="space-y-2 w-full">
              {mediaTokens.map((token, i) => {
                const cleanUrl = token.value.replace(/[.,;]$/, "");
                const imeta = imetaMap.get(cleanUrl);
                return token.type === "image" ? (
                  <ImageEmbed key={i} url={cleanUrl} imeta={imeta} />
                ) : (
                  <VideoEmbed key={i} url={cleanUrl} />
                );
              })}
            </div>
          )}

          {renderMedia && urlTokens.map((token, i) => {
            const cleanUrl = token.value.replace(/[.,;]$/, "");
            const imeta = imetaMap.get(cleanUrl);
            return <AsyncMediaEmbed key={i} url={cleanUrl} imeta={imeta} />;
          })}

          {renderQuotes && quoteTokens.map((token, i) => (
            <QuoteEmbed
              key={i}
              eventId={token.decoded?.eventId ?? ""}
              hintRelays={token.decoded?.relays}
            />
          ))}

          {/* Render NIP-18 'q' tag quotes that weren't in text */}
          {renderQuotes && extraQuotes.map((q, i) => (
            <QuoteEmbed
              key={`extra-q-${i}`}
              eventId={q.id}
              hintRelays={q.relays}
            />
          ))}

          {urlTokens.map((token, i) => (
            <UrlPreview key={i} url={token.value} />
          ))}
        </>
      ))}
    </div>
  );
}

function TokenRenderer({ token, emojiMap }: { token: Token; emojiMap: Map<string, string> }) {
  switch (token.type) {
    case "text": {
      const parts = token.value.split(/(:[a-zA-Z0-9_]+:)/g);
      return (
        <>
          {parts.map((part, i) => {
            const emojiUrl = emojiMap.get(part);
            if (emojiUrl) {
              return (
                <img
                  key={i}
                  src={emojiUrl}
                  alt={part}
                  className="inline-block w-5 h-5 align-middle mx-0.5"
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
    case "mention": return <MentionLink pubkey={token.decoded?.pubkey ?? ""} raw={token.value} />;
    case "hashtag": return <HashtagLink tag={token.value.slice(1)} />;
    case "url": return <ShortenedUrl url={token.value} />;
    case "note_ref":
    case "naddr_ref": {
      const rawValue = token.value.replace(/^nostr:/, "");
      return (
        <Link
          href={`/post/${token.decoded?.eventId || rawValue}`}
          className="text-blue-500 hover:text-blue-600 hover:underline font-mono text-sm"
          onClick={e => e.stopPropagation()}
        >
          {rawValue.slice(0, 20)}…
        </Link>
      );
    }
    default: return null;
  }
}
