"use client";

import React, { useState } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { PostCard } from "./PostCard";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ThreadNodeProps {
  event: NDKEvent;
  depth?: number;
  isLast?: boolean;
  fetchReplies: (id: string) => Promise<NDKEvent[]>;
}

export const ThreadNode: React.FC<ThreadNodeProps> = ({ 
  event, 
  depth = 0, 
  fetchReplies 
}) => {
  const [nestedReplies, setNestedReplies] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(depth < 1); // Auto-expand first level
  const [hasFetched, setHasFetched] = useState(false);

  const handleExpand = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = !expanded;
    setExpanded(newExpanded);

    if (newExpanded && !hasFetched) {
      setLoading(true);
      const replies = await fetchReplies(event.id);
      setNestedReplies(replies);
      setHasFetched(true);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="relative w-full">
        {/* Thread connection line for nested items */}
        {depth > 0 && (
          <div 
            className="absolute left-[-1.5rem] top-[-1rem] w-[1.5rem] h-[2.5rem] border-l-2 border-b-2 border-border/60 rounded-bl-2xl z-0"
            aria-hidden="true"
          />
        )}

        <PostCard 
          event={event} 
          indent={0} 
          threadLine={nestedReplies.length > 0 && expanded ? "bottom" : "none"} 
          variant="feed"
        />
        
        {!hasFetched && depth < 3 && (
          <Button 
            variant="ghost"
            size="sm"
            onClick={handleExpand}
            className="absolute left-14 bottom-2 z-20 h-7 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 px-3 rounded-full transition-all active:scale-95"
            aria-label="Show replies"
          >
            {loading ? <Loader2 size={10} className="animate-spin" aria-hidden="true" /> : "Show replies"}
          </Button>
        )}
      </div>

      {expanded && nestedReplies.length > 0 && (
        <div 
          className="flex flex-col ml-[1.45rem] border-l-2 border-border/60"
        >
          {nestedReplies.map((reply) => (
            <div key={reply.id} className="pl-4">
              <ThreadNode 
                event={reply} 
                depth={depth + 1} 
                fetchReplies={fetchReplies} 
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
