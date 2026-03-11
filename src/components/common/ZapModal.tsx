"use client";

import React, { useState, useEffect } from "react";
import { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
import { createZapInvoice, listenForZapReceipt } from "@/lib/actions/zap";
import { Zap, Loader2, CheckCircle2, ExternalLink, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useUIStore } from "@/store/ui";
import { triggerZapConfetti } from "@/lib/utils/confetti";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface WebLN {
  enable: () => Promise<void>;
  sendPayment: (bolt11: string) => Promise<{ preimage: string }>;
}

declare global {
  interface Window {
    webln?: WebLN;
  }
}

interface ZapModalProps {
  event?: NDKEvent;
  user?: NDKUser;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ZapModal: React.FC<ZapModalProps> = ({ event, user, onClose, onSuccess }) => {
  const { ndk, refreshBalance } = useNDK();
  const { addToast, defaultZapAmount } = useUIStore();
  const [amount, setAmount] = useState<number>(defaultZapAmount || 21);
  const [comment, setComment] = useState("");
  const [invoice, setInvoice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  const target = event || user;

  // Listen for zap confirmation (receipt)
  useEffect(() => {
    if (!ndk || !target || !invoice) return;

    const targetId = event ? event.id : user?.pubkey;
    if (!targetId) return;

    const stopListening = listenForZapReceipt(ndk, targetId, (receipt) => {
      console.log("Zap confirmed:", receipt);
      setPaid(true);
      triggerZapConfetti();
      addToast("Zap received!", "success");
      refreshBalance(); // Update balance in store
      if (onSuccess) onSuccess();
    }, !!user);

    return () => stopListening();
  }, [ndk, event, user, invoice, onSuccess, addToast, target, refreshBalance]);

  const handleZap = async () => {
    if (!ndk || loading || !target) return;

    setLoading(true);
    try {
      // Amount in millisats (1 sat = 1000 millisats)
      const { invoice: bolt11, alreadyPaid } = await createZapInvoice(ndk, amount * 1000, target, comment);
      
      if (alreadyPaid) {
        setPaid(true);
        triggerZapConfetti();
        addToast("Zap sent via connected wallet!", "success");
        refreshBalance(); // Update balance in store
        if (onSuccess) onSuccess();
        return;
      }

      if (bolt11) {
        setInvoice(bolt11);
        
        // Try paying with WebLN if available (Alby, etc.)
        if (typeof window !== "undefined" && window.webln) {
          try {
            const webln = window.webln;
            await webln.enable();
            await webln.sendPayment(bolt11);
            // Confirmation will come through the event listener
          } catch (e) {
            console.warn("WebLN payment failed or was cancelled:", e);
          }
        }
      } else {
        addToast("Failed to create zap invoice.", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Something went wrong while zapping.", "error");
    } finally {
      setLoading(false);
    }
  };

  const copyInvoice = () => {
    if (invoice) {
      navigator.clipboard.writeText(invoice);
      addToast("Invoice copied to clipboard!", "success");
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-yellow-500 font-black">
            <Zap className="size-5" fill="currentColor" aria-hidden="true" />
            Send Zap
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            {!invoice ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Select Amount (Sats)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[21, 100, 1000, 5000].map((val) => (
                      <Button
                        key={val}
                        variant={amount === val ? "default" : "outline"}
                        onClick={() => setAmount(val)}
                        className={cn(
                          "h-10 rounded-xl font-black transition-all",
                          amount === val && "bg-yellow-500 hover:bg-yellow-600 border-yellow-500 text-white shadow-lg shadow-yellow-500/20"
                        )}
                      >
                        {val}
                      </Button>
                    ))}
                  </div>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="Custom amount"
                    className="h-12 rounded-xl bg-muted/30 border-none shadow-sm focus-visible:ring-primary/20 text-lg font-black"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Comment (Optional)</label>
                  <Input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Say something nice..."
                    className="h-12 rounded-xl bg-muted/30 border-none shadow-sm focus-visible:ring-primary/20"
                  />
                </div>

                <Button
                  onClick={handleZap}
                  disabled={loading || amount <= 0}
                  className="w-full h-14 bg-yellow-500 hover:bg-yellow-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-yellow-500/20 gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Zap className="size-5" fill="currentColor" aria-hidden="true" />}
                  <span>Zap {amount} Sats</span>
                </Button>
              </div>
            ) : paid ? (
              <div className="text-center py-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="inline-flex items-center justify-center size-24 bg-green-500/10 text-green-500 rounded-full">
                  <CheckCircle2 className="size-12" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-black tracking-tight">Zap Sent!</h4>
                  <p className="text-muted-foreground text-sm font-medium">Your zap has been confirmed on the lightning network.</p>
                </div>
                <Button
                  onClick={onClose}
                  className="w-full h-12 rounded-xl font-black shadow-lg"
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-6 text-center">
                <div 
                  className="bg-white p-4 rounded-3xl inline-block mx-auto border-8 border-yellow-500/10 shadow-xl"
                  role="img"
                  aria-label="Lightning Network Invoice QR Code"
                >
                  <QRCodeSVG value={`lightning:${invoice}`} size={200} />
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm font-bold text-muted-foreground">Scan with your lightning wallet</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={copyInvoice}
                      className="flex-1 h-12 rounded-xl font-black gap-2"
                    >
                      <Copy className="size-4" aria-hidden="true" />
                      <span>Copy</span>
                    </Button>
                    <Button
                      asChild
                      className="flex-1 h-12 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-black gap-2 shadow-lg shadow-yellow-500/20"
                    >
                      <a href={`lightning:${invoice}`}>
                        <ExternalLink className="size-4" aria-hidden="true" />
                        <span>Open</span>
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs font-bold">
                  <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                  <span>Waiting for payment...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
