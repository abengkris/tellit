"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Zap, CheckCircle2, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { NDKCashuWallet } from "@nostr-dev-kit/wallet";
import { useUIStore } from "@/store/ui";
import { useNDK } from "@/hooks/useNDK";

interface CashuDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: NDKCashuWallet;
  mint?: string;
  onSuccess?: () => void;
}

export const CashuDepositModal: React.FC<CashuDepositModalProps> = ({ 
  isOpen, 
  onClose, 
  wallet,
  mint,
  onSuccess
}) => {
  const { addToast } = useUIStore();
  const { refreshBalance } = useNDK();
  const [amount, setAmount] = useState(1000);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setInvoice(null);
      setPaid(false);
      setLoading(false);
    }
  }, [isOpen]);

  const handleStartDeposit = async () => {
    setLoading(true);
    try {
      const deposit = wallet.deposit(amount, mint || wallet.mints[0]);
      const pr = await deposit.start();
      setInvoice(pr);

      // Try paying with WebLN if available
      if (typeof window !== "undefined" && window.webln) {
        try {
          const webln = window.webln;
          await webln.enable();
          await webln.sendPayment(pr);
        } catch (e) {
          console.warn("WebLN payment failed or was cancelled:", e);
        }
      }

      deposit.on("success", (token) => {
        console.log("Deposit successful, received token:", token);
        setPaid(true);
        addToast("Deposit successful! Wallet updated.", "success");
        refreshBalance();
        if (onSuccess) onSuccess();
      });

    } catch (err) {
      console.error(err);
      addToast("Failed to start deposit.", "error");
    } finally {
      setLoading(false);
    }
  };

  const copyInvoice = () => {
    if (invoice) {
      navigator.clipboard.writeText(invoice);
      addToast("Invoice copied!", "success");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Zap className="text-yellow-500" size={20} fill="currentColor" />
            Deposit sats
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {paid ? (
            <div className="text-center py-6 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-black mb-2">Success!</h3>
              <p className="text-gray-500 text-sm mb-8">
                Your Cashu wallet has been funded with {amount.toLocaleString()} sats.
              </p>
              <button 
                onClick={onClose}
                className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black font-black rounded-2xl transition-all active:scale-95"
              >
                Done
              </button>
            </div>
          ) : invoice ? (
            <div className="space-y-6 text-center">
              <div className="bg-white p-4 rounded-3xl inline-block shadow-sm border border-gray-100 mx-auto">
                <QRCodeSVG value={invoice} size={200} level="M" />
              </div>
              
              <div className="space-y-3">
                <p className="text-sm font-bold text-gray-500 italic">
                  Pay this invoice to fund your Cashu wallet
                </p>
                <button 
                  onClick={copyInvoice}
                  className="flex items-center gap-2 text-blue-500 font-bold text-xs mx-auto hover:underline"
                >
                  <Copy size={14} /> Copy Invoice
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 animate-pulse">
                <Loader2 size={12} className="animate-spin" />
                <span>Waiting for payment...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3 ml-1">
                  Amount (sats)
                </label>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[100, 1000, 5000].map(val => (
                    <button
                      key={val}
                      onClick={() => setAmount(val)}
                      className={`py-2.5 rounded-xl text-sm font-black border transition-all ${
                        amount === val 
                          ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20" 
                          : "border-gray-100 dark:border-zinc-800 hover:border-blue-500"
                      }`}
                    >
                      {val.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full p-4 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl font-black text-center text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <p className="text-[10px] text-gray-500 leading-relaxed text-center px-2">
                Your Lightning payment will be converted to eCash and stored privately in your local Cashu wallet.
              </p>

              <button 
                onClick={handleStartDeposit}
                disabled={loading || amount <= 0}
                className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} fill="currentColor" />}
                Generate Invoice
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
