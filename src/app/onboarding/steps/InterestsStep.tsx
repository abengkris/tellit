import React from "react";
import { Button } from "@/components/ui/button";
import { Hash, ArrowRight, ChevronLeft, Check } from "lucide-react";
import { useOnboardingStore } from "@/store/onboarding";
import { cn } from "@/lib/utils";

const INTERESTS = [
  { id: "nostr", label: "Nostr", emoji: "🌐" },
  { id: "food", label: "Food", emoji: "🍕" },
  { id: "photography", label: "Photography", emoji: "📷" },
  { id: "tech", label: "Tech", emoji: "💻" },
  { id: "ai", label: "AI", emoji: "🤖" },
  { id: "politic", label: "Politics", emoji: "🏛️" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "bitcoin", label: "Bitcoin", emoji: "₿" },
  { id: "art", label: "Art", emoji: "🎨" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "science", label: "Science", emoji: "🧪" },
  { id: "gaming", label: "Gaming", emoji: "🎮" },
];

export function InterestsStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { data, updateData } = useOnboardingStore();

  const toggleInterest = (id: string) => {
    const current = data.interests;
    if (current.includes(id)) {
      updateData({ interests: current.filter(i => i !== id) });
    } else {
      updateData({ interests: [...current, id] });
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center justify-center size-16 bg-primary/10 text-primary rounded-2xl mb-2">
          <Hash size={32} />
        </div>
        <h2 className="text-3xl font-black tracking-tight">What do you like?</h2>
        <p className="text-muted-foreground font-medium">Pick a few topics to customize your feed.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {INTERESTS.map((item) => {
          const isSelected = data.interests.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggleInterest(item.id)}
              className={cn(
                "p-4 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-2 group relative",
                isSelected 
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/5" 
                  : "border-muted hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <span className="text-3xl group-hover:scale-110 transition-transform duration-300">{item.emoji}</span>
              <span className={cn(
                "font-black text-sm uppercase tracking-widest",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
              {isSelected && (
                <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-0.5">
                  <Check size={12} strokeWidth={4} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-8">
        <Button variant="ghost" onClick={onBack} className="rounded-xl h-12 font-bold gap-2 text-muted-foreground">
          <ChevronLeft size={20} />
          Back
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onNext} className="rounded-xl h-12 font-bold px-6">
            Skip
          </Button>
          <Button 
            onClick={onNext} 
            disabled={data.interests.length === 0}
            className="rounded-2xl h-12 px-8 font-black gap-2 shadow-lg shadow-primary/20"
          >
            Continue ({data.interests.length})
            <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
