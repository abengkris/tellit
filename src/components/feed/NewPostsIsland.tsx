"use client";

import { useRef, useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NewPostsIslandProps {
  count: number;
  onFlush: () => void;
}

export function NewPostsIsland({ count, onFlush }: NewPostsIslandProps) {
  const prevCount = useRef(0);
  const [shakeKey, setShakeKey] = useState(0);
  const isVisible = count > 0;

  useEffect(() => {
    if (count > prevCount.current) {
      Promise.resolve().then(() => setShakeKey(prev => prev + 1));
    }
    prevCount.current = count;
  }, [count]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex justify-center"
      aria-live="polite"
    >
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onFlush();
        }}
        key={shakeKey}
        size="sm"
        className={cn(
          "pointer-events-auto h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-full shadow-2xl shadow-primary/20 gap-2 border-none active:scale-95 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 zoom-in-95"
        )}
        style={{ 
          animation: shakeKey > 0 ? "shake 0.4s cubic-bezier(.36,.07,.19,.97) both" : undefined 
        }}
        aria-label={`Load ${count} new posts`}
      >
        <ArrowUp size={16} className="shrink-0" aria-hidden="true" />
        <span className="uppercase tracking-tight text-xs">
          {count === 1
            ? "1 new post"
            : `${count > 99 ? "99+" : count} new posts`}
        </span>
      </Button>
    </div>
  );
}
