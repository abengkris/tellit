import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Copy, CheckCircle2, AlertTriangle, ChevronLeft, ArrowRight, Eye, EyeOff, Lock } from "lucide-react";
import { useUIStore } from "@/store/ui";

export function SecurityStep({ onNext, onBack, privateKey }: { onNext: () => void; onBack: () => void; privateKey: string }) {
  const [isCopied, setIsCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const { addToast } = useUIStore();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(privateKey);
    setIsCopied(true);
    addToast("Key copied to clipboard!", "success");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center justify-center size-16 bg-yellow-500/10 text-yellow-600 rounded-2xl mb-2">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-3xl font-black tracking-tight">Security Check</h2>
        <p className="text-muted-foreground font-medium">Don&apos;t lose access to your account!</p>
      </div>

      <div className="max-w-md mx-auto bg-muted/30 border border-border rounded-3xl p-6 space-y-6">
        <div className="flex items-start gap-4 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
          <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
          <p className="text-xs text-yellow-700 dark:text-yellow-500 font-bold leading-relaxed uppercase tracking-tight">
            Nostr is decentralized. We cannot recover your account if you lose your private key. Back it up now!
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Your Private Key (Keep it Secret!)</p>
          <div className="relative group">
            <div className="bg-background border-2 border-muted rounded-2xl p-4 pr-12 min-h-[80px] flex items-center shadow-inner overflow-hidden">
              <p className={`font-mono text-xs break-all leading-relaxed ${!showKey ? 'blur-sm select-none' : ''}`}>
                {privateKey || "npub1..."}
              </p>
            </div>
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowKey(!showKey)}
                className="size-8 rounded-lg hover:bg-muted"
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={copyToClipboard}
                className="size-8 rounded-lg hover:bg-muted"
                title="Copy to clipboard"
              >
                {isCopied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-8">
        <Button variant="ghost" onClick={onBack} className="rounded-xl h-12 font-bold gap-2 text-muted-foreground">
          <ChevronLeft size={20} />
          Back
        </Button>
        <div className="flex gap-3">
          <Button 
            onClick={onNext} 
            className="rounded-2xl h-12 px-10 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg gap-2 shadow-xl shadow-primary/20 transition-all active:scale-95 group"
          >
            <Lock size={20} className="transition-transform group-hover:-translate-y-0.5" />
            Finish & Launch
          </Button>
        </div>
      </div>
      
      <p className="text-center text-[10px] text-muted-foreground font-black uppercase tracking-widest">
        By clicking finish, you confirm that you have saved your key.
      </p>
    </div>
  );
}
