import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="relative inline-block">
        <div className="absolute -inset-1 bg-linear-to-r from-primary to-purple-500 rounded-3xl blur-md opacity-25 animate-pulse" />
        <div className="relative bg-background border border-border size-24 rounded-3xl flex items-center justify-center shadow-2xl">
          <Sparkles className="size-12 text-primary" />
        </div>
      </div>
      
      <div className="space-y-3">
        <h1 className="text-4xl font-black tracking-tighter sm:text-5xl">Welcome to Tell it!</h1>
        <p className="text-muted-foreground text-lg max-w-sm mx-auto leading-relaxed">
          Let&apos;s set up your profile and get you connected to the decentralized world of Nostr.
        </p>
      </div>

      <div className="pt-4">
        <Button 
          onClick={onNext} 
          size="lg" 
          className="h-14 px-10 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 gap-3 group"
        >
          Get Started
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
      
      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
        Step 1 of 7 · Quick & Easy
      </p>
    </div>
  );
}
