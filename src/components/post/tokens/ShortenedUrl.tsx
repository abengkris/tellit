"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

export function ShortenedUrl({ url, className }: { url: string; className?: string }) {
  const display = useMemo(() => {
    try {
      const u = new URL(url);
      const full = u.hostname + u.pathname;
      return full.length > 40 ? full.slice(0, 37) + "…" : full;
    } catch {
      return url.slice(0, 40) + "…";
    }
  }, [url]);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("text-primary hover:underline break-all font-black transition-colors", className)}
      onClick={e => e.stopPropagation()}
    >
      {display}
    </a>
  );
}
