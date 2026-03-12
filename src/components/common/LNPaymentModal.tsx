"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Copy, Check, Zap, AlertCircle, ExternalLink } from "lucide-react";
import { useUIStore } from "@/store/ui";

interface LNPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentRequest: string;
  paymentHash: string;
  amount: number;
  onPaid: (handle: string) => void;
}

export const LNPaymentModal: React.FC<LNPaymentModalProps> = ({
  isOpen,
  onClose,
  paymentRequest,
  paymentHash,
  amount,
  onPaid
}) => {
  const { addToast } = useUIStore();
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<'PENDING' | 'PAID' | 'EXPIRED' | 'ERROR'>('PENDING');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(paymentRequest);
    setCopied(true);
    addToast("Invoice copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (isOpen && status === 'PENDING') {
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/nip05/check-payment?hash=${paymentHash}`);
          const data = await res.json();
          
          if (data.status === 'PAID') {
            setStatus('PAID');
            if (pollingRef.current) clearInterval(pollingRef.current);
            setTimeout(() => onPaid(data.handle), 1500);
          } else if (data.status === 'EXPIRED') {
            setStatus('EXPIRED');
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isOpen, status, paymentHash, onPaid]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && status !== 'PAID' && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-none shadow-2xl bg-background">
        <DialogHeader className="p-6 border-b shrink-0 bg-linear-to-br from-primary/5 to-purple-500/5">
          <DialogTitle className="font-black text-2xl flex items-center gap-2">
            <Zap className="text-yellow-500 fill-current size-6" />
            Complete Payment
          </DialogTitle>
          <DialogDescription className="text-base font-medium">
            Pay <span className="font-black text-foreground">{amount.toLocaleString()} Sats</span> to activate your handle.
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 flex flex-col items-center space-y-6">
          {status === 'PAID' ? (
            <div className="flex flex-col items-center space-y-4 py-10 animate-in zoom-in duration-300">
              <div className="size-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                <Check size={48} strokeWidth={3} />
              </div>
              <p className="text-xl font-black text-green-600">Payment Received!</p>
            </div>
          ) : status === 'EXPIRED' ? (
            <div className="flex flex-col items-center space-y-4 py-10">
              <div className="size-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <AlertCircle size={48} />
              </div>
              <p className="text-xl font-black text-destructive">Invoice Expired</p>
              <Button onClick={onClose} variant="outline" className="rounded-xl">Try Again</Button>
            </div>
          ) : (
            <>
              {/* QR Code */}
              <div className="p-4 bg-white rounded-3xl shadow-inner border-4 border-muted">
                <QRCodeSVG 
                  value={paymentRequest.toUpperCase()} 
                  size={220} 
                  level="M"
                  includeMargin={false}
                />
              </div>

              {/* Status & Loader */}
              <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground animate-pulse">
                <Loader2 className="size-4 animate-spin" />
                Waiting for payment...
              </div>

              {/* Actions */}
              <div className="w-full space-y-3">
                <Button 
                  onClick={copyToClipboard}
                  variant="outline"
                  className="w-full h-12 rounded-2xl font-black gap-2 border-none bg-muted hover:bg-muted/80 shadow-sm"
                >
                  {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                  {copied ? "Copied!" : "Copy Invoice"}
                </Button>
                
                <Button 
                  asChild
                  className="w-full h-12 rounded-2xl font-black gap-2 shadow-lg shadow-primary/20"
                >
                  <a href={`lightning:${paymentRequest}`}>
                    <ExternalLink className="size-4" />
                    Open in Wallet
                  </a>
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t bg-muted/30 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
            Powered by Lightning Network
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
