import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, ArrowRight, ChevronLeft } from "lucide-react";
import { useOnboardingStore } from "@/store/onboarding";

export function IdentityStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { data, updateData } = useOnboardingStore();

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center justify-center size-16 bg-primary/10 text-primary rounded-2xl mb-2">
          <User size={32} />
        </div>
        <h2 className="text-3xl font-black tracking-tight">What should we call you?</h2>
        <p className="text-muted-foreground font-medium">This is how you&apos;ll appear to others on Tell it!</p>
      </div>

      <div className="space-y-4 max-w-sm mx-auto">
        <div className="space-y-2">
          <label htmlFor="display_name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Display Name</label>
          <Input 
            id="display_name"
            placeholder="e.g. Satoshi Nakamoto" 
            value={data.display_name}
            onChange={(e) => updateData({ display_name: e.target.value })}
            className="h-14 rounded-2xl border-2 border-muted focus-visible:ring-primary focus-visible:border-primary text-lg font-bold"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="username" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Username (Handle)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">@</span>
            <Input 
              id="username"
              placeholder="satoshi" 
              value={data.name}
              onChange={(e) => updateData({ name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
              className="h-14 pl-8 rounded-2xl border-2 border-muted focus-visible:ring-primary focus-visible:border-primary text-lg font-bold"
            />
          </div>
        </div>
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
            disabled={!data.display_name && !data.name}
            className="rounded-2xl h-12 px-8 font-black gap-2 shadow-lg shadow-primary/20"
          >
            Next Step
            <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
