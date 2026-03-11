"use client";

import React, { useState } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { usePoll } from "@/hooks/usePoll";
import { Loader2, CheckCircle2, Circle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUIStore } from "@/store/ui";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PollRendererProps {
  event: NDKEvent;
}

export const PollRenderer: React.FC<PollRendererProps> = ({ event }) => {
  const { config, results, totalVotes, userVote, loading, vote, hasEnded } = usePoll(event);
  const [isVoting, setIsVoting] = useState(false);
  const { addToast } = useUIStore();

  const handleVote = async (optionId: string) => {
    if (loading || isVoting || hasEnded || userVote) return;

    setIsVoting(true);
    try {
      // For now we only support single choice in UI even if protocol allows multiple
      await vote([optionId]);
      addToast("Vote submitted!", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to submit vote.", "error");
    } finally {
      setIsVoting(false);
    }
  };

  if (loading && totalVotes === 0) {
    return (
      <Card className="mt-4 border-muted/50 bg-muted/30 shadow-none overflow-hidden rounded-2xl">
        <CardContent className="p-8 flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-primary size-6" aria-hidden="true" />
          <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Loading poll…</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4 border-muted/50 bg-muted/30 shadow-none overflow-hidden rounded-2xl">
      <CardHeader className="p-4 border-b border-muted/50 bg-muted/20">
        <CardTitle className="text-base font-black leading-tight text-foreground/90">
          {event.content}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-2.5">
        {config.options.map((opt) => {
          const voteCount = results[opt.id] || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isSelected = userVote?.includes(opt.id);
          const showResults = !!userVote || hasEnded;

          return (
            <Button
              key={opt.id}
              variant="outline"
              onClick={() => handleVote(opt.id)}
              disabled={showResults || isVoting}
              className={cn(
                "relative w-full justify-start h-auto p-0 overflow-hidden border-border transition-all hover:bg-transparent group",
                isSelected && "border-primary bg-primary/5 ring-1 ring-primary/20",
                showResults ? "cursor-default" : "cursor-pointer active:scale-[0.98]"
              )}
            >
              {/* Progress Bar Background */}
              {showResults && (
                <div 
                  className={cn(
                    "absolute inset-y-0 left-0 transition-all duration-1000",
                    isSelected ? "bg-primary/10" : "bg-muted/50"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="relative p-3.5 flex items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-3 min-w-0">
                  {!showResults && (
                    <Circle size={18} className="text-muted-foreground group-hover:text-primary shrink-0" aria-hidden="true" />
                  )}
                  {showResults && isSelected && (
                    <CheckCircle2 size={18} className="text-primary shrink-0" aria-hidden="true" />
                  )}
                  <span className={cn(
                    "font-bold text-sm truncate",
                    isSelected ? "text-primary" : "text-foreground/80"
                  )}>
                    {opt.label}
                  </span>
                </div>
                {showResults && (
                  <span className="text-xs font-black tabular-nums text-muted-foreground">
                    {percentage}%
                  </span>
                )}
              </div>
            </Button>
          );
        })}
      </CardContent>

      <CardFooter className="px-4 py-3 bg-muted/40 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground border-t border-muted/50">
        <div className="flex items-center gap-2">
          <span>{totalVotes.toLocaleString()} votes</span>
          {userVote && (
            <Badge variant="secondary" className="h-4 px-1.5 bg-primary/10 text-primary border-primary/20 font-black text-[8px] tracking-tight">
              Voted
            </Badge>
          )}
        </div>
        
        {config.endsAt > 0 && (
          <div className="flex items-center gap-1">
            <Clock size={10} aria-hidden="true" />
            <span>
              {hasEnded 
                ? `Ended ${formatDistanceToNow(new Date(config.endsAt * 1000))} ago`
                : `Ends in ${formatDistanceToNow(new Date(config.endsAt * 1000))}`}
            </span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
