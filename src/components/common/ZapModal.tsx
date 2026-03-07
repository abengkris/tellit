"use client";

import React, { useState, useEffect } from "react";
import NDK, { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
import { createZapInvoice, listenForZapReceipt } from "@/lib/actions/zap";
import { X, Zap, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useUIStore } from "@/store/ui";
import { triggerZapConfetti } from "@/lib/utils/confetti";

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
  const { ndk } = useNDK();
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
      if (onSuccess) onSuccess();
    }, !!user);

    return () => stopListening();
  }, [ndk, event, user, invoice, onSuccess, addToast, target]);

  const handleZap = async () => {
    if (!ndk || loading || !target) return;

    setLoading(true);
    try {
      // Amount in millisats (1 sat = 1000 millisats)
      const bolt11 = await createZapInvoice(ndk, amount * 1000, target, comment);
      
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center space-x-2 text-yellow-500">
            <Zap size={20} fill="currentColor" />
            <h3 className="font-bold text-lg">Send Zap</h3>
          </div>
          <button 
            onClick={onClose} 
            aria-label="Close modal"
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {!invoice ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Amount (Sats)</label>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[21, 100, 1000, 5000].map((val) => (
                    <button
                      key={val}
                      onClick={() => setAmount(val)}
                      className={`py-2 rounded-xl text-sm font-bold border transition-all ${
                        amount === val 
                          ? "bg-yellow-500 border-yellow-500 text-white shadow-lg shadow-yellow-500/20" 
                          : "border-gray-200 dark:border-gray-800 hover:border-yellow-500"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full p-4 bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Comment (Optional)</label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Say something nice..."
                  className="w-full p-4 bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <button
                onClick={handleZap}
                disabled={loading || amount <= 0}
                className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Zap size={18} fill="currentColor" />}
                <span>Zap {amount} Sats</span>
              </button>
            </div>
          ) : paid ? (
            <div className="text-center py-8 space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full mb-4">
                <CheckCircle2 size={48} />
              </div>
              <h4 className="text-2xl font-bold">Zap Sent!</h4>
              <p className="text-gray-500">Your zap has been confirmed on the lightning network.</p>
              <button
                onClick={onClose}
                className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-2xl mt-4"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-6 text-center">
              <div 
                className="bg-white p-4 rounded-3xl inline-block mx-auto border-4 border-yellow-500/10 shadow-xl"
                role="img"
                aria-label="Lightning Network Invoice QR Code"
              >
                <QRCodeSVG value={`lightning:${invoice}`} size={220} />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Scan with your lightning wallet</p>
                <div className="flex space-x-2">
                  <button
                    onClick={copyInvoice}
                    className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 hover:bg-gray-200 transition-colors"
                  >
                    <span>Copy Invoice</span>
                  </button>
                  <a
                    href={`lightning:${invoice}`}
                    className="flex-1 py-3 px-4 bg-yellow-500 text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 hover:bg-yellow-600 transition-colors"
                  >
                    <ExternalLink size={16} />
                    <span>Open Wallet</span>
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-2 text-gray-500 text-sm">
                <Loader2 className="animate-spin" size={14} />
                <span>Waiting for payment confirmation...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
