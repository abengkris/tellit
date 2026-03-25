"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLists } from "@/hooks/useLists";
import { useRouter } from "next/navigation";

const TOPICS = [
  { id: "nostr", label: "Nostr", emoji: "🌐" },
  { id: "bitcoin", label: "Bitcoin", emoji: "₿" },
  { id: "tech", label: "Tech", emoji: "💻" },
  { id: "ai", label: "AI", emoji: "🤖" },
  { id: "photography", label: "Photography", emoji: "📷" },
  { id: "art", label: "Art", emoji: "🎨" },
  { id: "gaming", label: "Gaming", emoji: "🎮" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "food", label: "Food", emoji: "🍕" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "science", label: "Science", emoji: "🧪" },
  { id: "politic", label: "Politics", emoji: "🏛️" },
  { id: "fitness", label: "Fitness", emoji: "💪" },
  { id: "movies", label: "Movies", emoji: "🎬" },
  { id: "business", label: "Business", emoji: "📈" },
];

export function InterestSelector() {
  const { interests, addInterest, removeInterest } = useLists();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const toggleTopic = (id: string) => {
    if (interests.has(id)) {
      removeInterest(id);
    } else {
      addInterest(id);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    // useLists handles saving to relay automatically in its updateList implementation
    // We just wait a bit to show a nice transition
    setTimeout(() => {
      setIsSubmitting(false);
      router.refresh(); // Refresh to trigger new feed fetch
    }, 1500);
  };

  return (
    <div className="p-6 bg-gradient-to-b from-primary/5 to-transparent border-b border-border">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center justify-center size-12 bg-primary/10 text-primary rounded-full mb-2">
            <Sparkles size={24} />
          </div>
          <h2 className="text-2xl font-black">Personalize your For You feed</h2>
          <p className="text-muted-foreground font-medium text-sm">Choose topics you&apos;re interested in to see more relevant posts.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {TOPICS.map((topic) => {
            const isSelected = interests.has(topic.id);
            return (
              <button
                key={topic.id}
                onClick={() => toggleTopic(topic.id)}
                className={cn(
                  "px-4 py-2 rounded-full border-2 transition-all flex items-center gap-2 font-bold text-sm uppercase tracking-wider",
                  isSelected 
                    ? "border-primary bg-primary text-white shadow-md" 
                    : "border-muted bg-background hover:border-primary/50 text-muted-foreground"
                )}
              >
                <span>{topic.emoji}</span>
                <span>{topic.label}</span>
                {isSelected && <Check size={14} strokeWidth={4} />}
              </button>
            );
          })}
        </div>

        <div className="flex justify-center pt-4">
          <Button 
            size="lg"
            onClick={handleSave}
            disabled={interests.size === 0 || isSubmitting}
            className="rounded-full px-12 font-black shadow-xl shadow-primary/20"
          >
            {isSubmitting ? "Updating your feed..." : "Save Interests"}
          </Button>
        </div>
      </div>
    </div>
  );
}
