"use client";

import React, { useState } from "react";
import { X, Lock, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { useWalletStore, EncryptedData } from "@/store/wallet";
import { encryptData, decryptData, hashPin } from "@/lib/utils/encryption";
import { useUIStore } from "@/store/ui";

interface WalletPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode?: "setup" | "unlock";
}

export const WalletPinModal: React.FC<WalletPinModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  mode: forcedMode 
}) => {
  const { 
    pinHash, 
    pinSalt, 
    encryptedData, 
    setPin, 
    unlock,
    nwcPairingCode,
    resetWallet
  } = useWalletStore();
  const { addToast } = useUIStore();

  const [pin, setPinInput] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Determine mode: setup if no hash exists, otherwise unlock
  const mode = forcedMode || (pinHash ? "unlock" : "setup");

  if (!isOpen) return null;

  const handleSetup = async () => {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { hash, salt } = await hashPin(pin);
      const secrets: EncryptedData = { nwcPairingCode };
      const encrypted = await encryptData(JSON.stringify(secrets), pin);
      setPin(hash, salt, encrypted);
      addToast("Wallet PIN secured!", "success");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to secure wallet");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const saltBytes = new Uint8Array(atob(pinSalt!).split("").map((c) => c.charCodeAt(0)));
      const { hash } = await hashPin(pin, saltBytes);
      if (hash !== pinHash) throw new Error("Invalid PIN");
      if (encryptedData) {
        const decryptedStr = await decryptData(encryptedData, pin);
        const data: EncryptedData = JSON.parse(decryptedStr);
        unlock(data);
      }
      addToast("Wallet unlocked", "success");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError("Invalid PIN. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-gray-900 flex justify-between items-center">
          <h3 className="font-black flex items-center gap-2">
            {mode === "setup" ? <ShieldCheck className="text-blue-500" /> : <Lock className="text-orange-500" />}
            {mode === "setup" ? "Secure Your Wallet" : "Unlock Wallet"}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-8">
          <div className="text-center mb-8"><p className="text-sm text-gray-500 dark:text-gray-400">{mode === "setup" ? "Set a PIN to encrypt your wallet keys locally." : "Enter your PIN to access your wallet."}</p></div>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{mode === "setup" ? "Enter PIN" : "PIN"}</label>
              <input type="password" inputMode="numeric" pattern="[0-9]*" value={pin} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))} placeholder="••••" className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-center text-2xl tracking-[1em] focus:ring-2 focus:ring-blue-500 focus:outline-none" autoFocus />
            </div>
            {mode === "setup" && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Confirm PIN</label>
                <input type="password" inputMode="numeric" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-center text-2xl tracking-[1em] focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
            )}
            {error && <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-500/5 p-3 rounded-xl border border-red-500/10"><AlertCircle size={14} />{error}</div>}
            <button onClick={mode === "setup" ? handleSetup : handleUnlock} disabled={isLoading || pin.length < 4} className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black font-black rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">{isLoading ? <Loader2 className="animate-spin" /> : (mode === "setup" ? "Enable Security" : "Unlock")}</button>
            {mode === "unlock" && (
              <button onClick={() => confirm("FORGOT PIN? This will PERMANENTLY DELETE your local wallet data. Are you sure you want to reset?") && (resetWallet(), onClose(), window.location.reload())} className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors">Forgot PIN? Reset Wallet</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
