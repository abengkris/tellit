"use client";

import React, { useState } from "react";
import { Lock, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { useWalletStore, EncryptedData } from "@/store/wallet";
import { encryptData, decryptData, hashPin } from "@/lib/utils/encryption";
import { useUIStore } from "@/store/ui";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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
    } catch {
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
    } catch {
      setError("Invalid PIN. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[80vh]">
        <DialogHeader className="p-6 border-b shrink-0">
          <DialogTitle className="font-black flex items-center gap-2">
            {mode === "setup" ? (
              <ShieldCheck className="text-primary size-5" aria-hidden="true" />
            ) : (
              <Lock className="text-orange-500 size-5" aria-hidden="true" />
            )}
            {mode === "setup" ? "Secure Your Wallet" : "Unlock Wallet"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {mode === "setup" ? "Set a security PIN for your wallet." : "Provide your PIN to decrypt wallet keys."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-8 space-y-8">
            <div className="text-center">
              <p className="text-sm text-muted-foreground font-medium">
                {mode === "setup" ? "Set a PIN to encrypt your wallet keys locally." : "Enter your PIN to access your wallet."}
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3 text-center">
                <Label htmlFor="pin-input" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {mode === "setup" ? "Enter PIN" : "PIN"}
                </Label>
                <Input 
                  id="pin-input"
                  type="password" 
                  inputMode="numeric" 
                  pattern="[0-9]*" 
                  value={pin} 
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))} 
                  placeholder="••••" 
                  className="h-16 text-center text-3xl tracking-[0.5em] font-black bg-muted/30 border-none rounded-2xl focus-visible:ring-primary/20"
                  autoFocus 
                />
              </div>

              {mode === "setup" && (
                <div className="space-y-3 text-center animate-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="confirm-pin-input" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Confirm PIN</Label>
                  <Input 
                    id="confirm-pin-input"
                    type="password" 
                    inputMode="numeric" 
                    value={confirmPin} 
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))} 
                    placeholder="••••" 
                    className="h-16 text-center text-3xl tracking-[0.5em] font-black bg-muted/30 border-none rounded-2xl focus-visible:ring-primary/20"
                  />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-destructive text-xs font-bold bg-destructive/10 p-4 rounded-2xl border border-destructive/20 animate-in shake-in duration-300">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-4">
                <Button 
                  onClick={mode === "setup" ? handleSetup : handleUnlock} 
                  disabled={isLoading || pin.length < 4} 
                  className={cn(
                    "w-full h-14 font-black rounded-2xl shadow-xl transition-all gap-2",
                    mode === "setup" ? "bg-primary" : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
                  )}
                >
                  {isLoading ? <Loader2 className="animate-spin size-5" aria-hidden="true" /> : (mode === "setup" ? "Enable Security" : "Unlock")}
                </Button>

                {mode === "unlock" && (
                  <Button 
                    variant="ghost"
                    onClick={() => confirm("FORGOT PIN? This will PERMANENTLY DELETE your local wallet data. Are you sure you want to reset?") && (resetWallet(), onClose(), window.location.reload())} 
                    className="w-full h-auto py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    Forgot PIN? Reset Wallet
                  </Button>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
