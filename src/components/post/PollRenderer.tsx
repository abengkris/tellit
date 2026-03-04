"use client";

import React, { useState } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { usePoll } from "@/hooks/usePoll";
import { Loader2, CheckCircle2, Circle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUIStore } from "@/store/ui";

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
      <div className="mt-4 p-4 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col items-center gap-2">
        <Loader2 className="animate-spin text-blue-500" size={24} />
        <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Loading poll...</span>
      </div>
    );
  }

  return (
    <div className="mt-4 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-gray-50/30 dark:bg-gray-900/10">
      {/* Question */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-gray-100">{event.content}</h3>
      </div>

      {/* Options */}
      <div className="p-4 space-y-3">
        {config.options.map((opt) => {
          const voteCount = results[opt.id] || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isSelected = userVote?.includes(opt.id);
          const showResults = !!userVote || hasEnded;

          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={showResults || isVoting}
              className={`relative w-full text-left group overflow-hidden rounded-xl border transition-all ${
                isSelected 
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20" 
                  : "border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700"
              } ${showResults ? "cursor-default" : "cursor-pointer active:scale-[0.98]"}`}
            >
              {/* Progress Bar Background */}
              {showResults && (
                <div 
                  className={`absolute inset-y-0 left-0 transition-all duration-1000 ${
                    isSelected ? "bg-blue-500/20" : "bg-gray-200 dark:bg-gray-800/50"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="relative p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {!showResults && (
                    <Circle size={18} className="text-gray-400 group-hover:text-blue-500 shrink-0" />
                  )}
                  {showResults && isSelected && (
                    <CheckCircle2 size={18} className="text-blue-500 shrink-0" />
                  )}
                  <span className={`font-bold text-sm truncate ${isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>
                    {opt.label}
                  </span>
                </div>
                {showResults && (
                  <span className="text-xs font-black tabular-nums text-gray-500">
                    {percentage}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-3 bg-gray-100/50 dark:bg-gray-800/30 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
        <div className="flex items-center gap-1.5">
          <span>{totalVotes.toLocaleString()} votes</span>
          {userVote && <span>• Voted</span>}
        </div>
        
        {config.endsAt > 0 && (
          <div className="flex items-center gap-1">
            <Clock size={10} />
            <span>
              {hasEnded 
                ? `Ended ${formatDistanceToNow(new Date(config.endsAt * 1000))} ago`
                : `Ends in ${formatDistanceToNow(new Date(config.endsAt * 1000))}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
