import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VolumeX, Plus, Trash2, ArrowRight, ChevronLeft } from "lucide-react";
import { useOnboardingStore } from "@/store/onboarding";
import { Badge } from "@/components/ui/badge";

const SUGGESTED_MUTES = ["crypto", "nft", "politics", "drama", "scams"];

export function MutingStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { data, updateData } = useOnboardingStore();
  const [input, setInput] = useState("");

  const addMute = (word: string) => {
    const cleanWord = word.trim().toLowerCase();
    if (cleanWord && !data.mutedKeywords.includes(cleanWord)) {
      updateData({ mutedKeywords: [...data.mutedKeywords, cleanWord] });
    }
    setInput("");
  };

  const removeMute = (word: string) => {
    updateData({ mutedKeywords: data.mutedKeywords.filter(w => w !== word) });
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center justify-center size-16 bg-red-500/10 text-red-500 rounded-2xl mb-2">
          <VolumeX size={32} />
        </div>
        <h2 className="text-3xl font-black tracking-tight">Personalize your feed</h2>
        <p className="text-muted-foreground font-medium">Any topics or keywords you&apos;d rather not see?</p>
      </div>

      <div className="max-w-sm mx-auto space-y-6">
        <div className="flex gap-2">
          <Input 
            placeholder="Enter a keyword..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMute(input)}
            className="h-12 rounded-xl border-2 font-bold"
          />
          <Button onClick={() => addMute(input)} className="h-12 w-12 rounded-xl p-0">
            <Plus size={20} />
          </Button>
        </div>

        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Suggestions</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_MUTES.map(word => (
              <Button
                key={word}
                variant="ghost"
                size="sm"
                onClick={() => addMute(word)}
                className="h-8 rounded-full px-3 bg-muted/50 border border-border text-[11px] font-bold uppercase tracking-wider hover:bg-primary/10 hover:text-primary transition-all"
                disabled={data.mutedKeywords.includes(word)}
              >
                #{word}
              </Button>
            ))}
          </div>
        </div>

        {data.mutedKeywords.length > 0 && (
          <div className="space-y-3 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-[10px] font-black uppercase text-red-500 tracking-widest ml-1">Muted Topics</p>
            <div className="flex flex-wrap gap-2">
              {data.mutedKeywords.map(word => (
                <Badge 
                  key={word} 
                  variant="destructive" 
                  className="h-8 pl-3 pr-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-destructive/10"
                >
                  {word}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeMute(word)}
                    className="size-6 rounded-full hover:bg-white/20 text-white"
                  >
                    <Trash2 size={12} />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}
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
            className="rounded-2xl h-12 px-8 font-black gap-2 shadow-lg shadow-primary/20"
          >
            Almost Done
            <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
