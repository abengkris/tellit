"use client";

import React from "react";
import { SuggestionCard } from "@/components/profile/WhoToFollow";
import { useFollowSuggestions } from "@/hooks/useFollowSuggestions";
import { Loader2, ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SuggestedPage() {
  const router = useRouter();
  // Requesting 100 suggestions from Redis
  const { suggestions, loading } = useFollowSuggestions(100);

  return (
    <>
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black tracking-tight">Suggested for you</h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Based on your Web of Trust</p>
        </div>
      </div>

      <div className="p-0 divide-y divide-gray-100 dark:divide-gray-900 pb-10">
        {loading && suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="animate-spin mb-4 text-blue-500" size={32} />
            <p className="text-sm font-bold animate-pulse">Scanning your network...</p>
          </div>
        ) : suggestions.length > 0 ? (
          <>
            <div className="bg-blue-50/30 dark:bg-blue-900/10 px-6 py-4 border-b border-blue-100 dark:border-blue-900/20">
              <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                <Users size={18} />
                <p className="text-sm font-black">We found {suggestions.length} people you might know</p>
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-900">
              {suggestions.map((suggestion) => (
                <div key={suggestion.pubkey} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                  <SuggestionCard 
                    pubkey={suggestion.pubkey} 
                    followedByCount={suggestion.followedByCount}
                    showAbout={true}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-20 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-900 rounded-3xl mb-6 text-gray-400">
              <Users size={40} />
            </div>
            <h3 className="text-xl font-black mb-2">No suggestions yet</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">Try following more people to help us discover your network.</p>
            <Link 
              href="/"
              className="mt-6 inline-block px-8 py-3 bg-blue-500 text-white rounded-2xl font-black transition-all active:scale-95 shadow-lg shadow-blue-500/20"
            >
              Back to Home
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
