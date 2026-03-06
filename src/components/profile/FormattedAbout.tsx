"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { tokenize, Token } from "@/lib/content/tokenizer";
import { MentionLink } from "../post/tokens/MentionLink";
import { HashtagLink } from "../post/tokens/HashtagLink";
import { ShortenedUrl } from "../post/tokens/ShortenedUrl";

interface FormattedAboutProps {
  text: string;
  tags?: string[][];
}

export const FormattedAbout: React.FC<FormattedAboutProps> = ({ text, tags }) => {
  const emojiMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!tags) return map;
    for (const tag of tags) {
      if (tag[0] === "emoji" && tag[1] && tag[2]) {
        map.set(`:${tag[1]}:`, tag[2]);
      }
    }
    return map;
  }, [tags]);

  const tokens = useMemo(() => tokenize(text), [text]);

  return (
    <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
      {tokens.map((token, i) => (
        <AboutTokenRenderer key={i} token={token} emojiMap={emojiMap} />
      ))}
    </div>
  );
};

function AboutTokenRenderer({ token, emojiMap }: { token: Token; emojiMap: Map<string, string> }) {
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
      const link = token.type === "naddr_ref" ? `/article/${rawValue}` : `/post/${token.decoded?.eventId || rawValue}`;
      return (
        <Link
          href={link}
          className="text-blue-500 hover:underline font-mono text-sm"
        >
          {rawValue.slice(0, 16)}…
        </Link>
      );
    }
    default: return null;
  }
}
