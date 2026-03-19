import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, ArrowRight, ChevronLeft, Loader2, CheckCircle2, XCircle, Zap } from "lucide-react";
import { useOnboardingStore } from "@/store/onboarding";
import { cn } from "@/lib/utils";

export function IdentityStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { data, updateData } = useOnboardingStore();
  const [isChecking, setIsChecking] = useState(false);
  const [availability, setAvailability] = useState<{ available: boolean; price?: number; error?: string } | null>(null);

  useEffect(() => {
    if (!data.name || data.name.length < 1) {
      setAvailability(null);
      setIsChecking(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsChecking(true);
      try {
        const res = await fetch(`/api/nip05/register?name=${encodeURIComponent(data.name)}`);
        const result = await res.json();
        setAvailability(result);
      } catch (err) {
        setAvailability({ available: false, error: "Failed to check availability" });
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [data.name]);

  const handleNameChange = (val: string) => {
    const sanitized = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    updateData({ name: sanitized });
    if (sanitized) setIsChecking(true);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center justify-center size-16 bg-primary/10 text-primary rounded-2xl mb-2">
          <User size={32} />
        </div>
        <h2 className="text-3xl font-black tracking-tight">What should we call you?</h2>
        <p className="text-muted-foreground font-medium">This is how you&apos;ll appear to others on Tell it!</p>
      </div>

      <div className="space-y-6 max-w-sm mx-auto">
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
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg">@</span>
            <Input 
              id="username"
              placeholder="satoshi" 
              value={data.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={cn(
                "h-14 pl-10 pr-24 rounded-2xl border-2 focus-visible:ring-primary focus-visible:border-primary text-lg font-bold transition-colors",
                availability?.available === true && "border-green-500/50 bg-green-50/30 dark:bg-green-500/5",
                availability?.available === false && "border-red-500/50 bg-red-50/30 dark:bg-red-500/5",
                !availability && !isChecking && "border-muted"
              )}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isChecking && <Loader2 size={18} className="animate-spin text-muted-foreground" />}
              {!isChecking && availability?.available === true && (
                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-500 font-black text-[10px] uppercase tracking-wider">
                  <CheckCircle2 size={16} />
                  Available
                </div>
              )}
              {!isChecking && availability?.available === false && (
                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-500 font-black text-[10px] uppercase tracking-wider">
                  <XCircle size={16} />
                  Taken
                </div>
              )}
              <span className="text-muted-foreground font-bold text-sm">@tellit.id</span>
            </div>
          </div>
          
          {availability?.available === true && availability.price && (
            <div className="flex items-center gap-2 px-1 animate-in fade-in slide-in-from-top-1 duration-300">
              <Zap size={12} className="text-yellow-500 fill-yellow-500" />
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                Registration cost: <span className="text-foreground">{availability.price.toLocaleString()} sats</span> / year
              </p>
            </div>
          )}
          
          {availability?.error && (
            <p className="text-[11px] font-bold text-red-500 uppercase tracking-tight px-1">
              {availability.error}
            </p>
          )}
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
            disabled={(!data.display_name && !data.name) || (!!data.name && availability?.available === false) || isChecking}
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
