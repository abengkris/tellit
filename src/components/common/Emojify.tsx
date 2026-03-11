"use client";

import React, { useMemo } from "react";

interface EmojifyProps {
  text: string;
  tags?: string[][];
  className?: string;
}

export const Emojify: React.FC<EmojifyProps> = ({ text, tags, className = "inline-block w-5 h-5 align-middle mx-0.5" }) => {
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

  if (emojiMap.size === 0) return <>{text}</>;

  // Split text by :shortcode: pattern
  const parts = text.split(/(:[a-zA-Z0-9_]+:)/g);

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
              className={className}
              loading="lazy"
            />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};
