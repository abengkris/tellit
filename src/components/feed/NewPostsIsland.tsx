"use client";

import { useRef, useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

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
      setShakeKey(prev => prev + 1);
    }
    prevCount.current = count;
  }, [count]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex justify-center"
      aria-live="polite"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFlush();
        }}
        key={shakeKey}
        className="
          pointer-events-auto
          flex items-center gap-2
          px-5 py-2.5
          bg-blue-500 hover:bg-blue-600 active:scale-95
          text-white font-bold text-sm
          rounded-full shadow-2xl shadow-blue-500/20
          border border-white/10
          transition-all duration-200
          animate-in fade-in slide-in-from-bottom-2 zoom-in-95
        "
        style={{ 
          animation: shakeKey > 0 ? "shake 0.4s cubic-bezier(.36,.07,.19,.97) both" : undefined 
        }}
      >
        <ArrowUp size={16} className="shrink-0" />
        <span>
          {count === 1
            ? "1 new post"
            : `${count > 99 ? "99+" : count} new posts`}
        </span>
      </button>
    </div>
  );
}
