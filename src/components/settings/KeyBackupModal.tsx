"use client";

import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { encryptData } from "@/lib/utils/encryption";
import { Shield, Key, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";

interface KeyBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyBackupModal({ isOpen, onClose }: KeyBackupModalProps) {
  const { user, privateKey, loginType } = useAuthStore();
  const { addToast } = useUIStore();
  
  const [step, setStep] = useState<'info' | 'pin' | 'success' | 'verify'>('info');
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const [backupDate, setBackupDate] = useState<string | null>(null);

  const backupKey = `tellit-backup-${user?.pubkey}`;

  useEffect(() => {
    if (isOpen && user?.pubkey) {
      const stored = localStorage.getItem(backupKey);
      if (stored) {
        setHasBackup(true);
        try {
          const parsed = JSON.parse(stored);
          if (parsed.createdAt) {
            setBackupDate(new Date(parsed.createdAt).toLocaleString());
          }
        } catch { /* ignore */ }
      } else {
        setHasBackup(false);
        setBackupDate(null);
      }
      setStep('info');
      setPin("");
      setConfirmPin("");
    }
  }, [isOpen, user?.pubkey, backupKey]);

  const handleCreateBackup = async () => {
    if (!privateKey) {
      addToast("No private key found to backup", "error");
      return;
    }

    if (pin.length < 4) {
      addToast("PIN must be at least 4 digits", "error");
      return;
    }

    if (pin !== confirmPin) {
      addToast("PINs do not match", "error");
      return;
    }

    setIsLoading(true);
    try {
      const encrypted = await encryptData(privateKey, pin);
      const backupData = {
        pubkey: user?.pubkey,
        encrypted,
        createdAt: new Date().toISOString(),
        v: 1
      };
      
      localStorage.setItem(backupKey, JSON.stringify(backupData));
      setHasBackup(true);
      setBackupDate(new Date().toLocaleString());
      setStep('success');
      addToast("Key backed up locally!", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to create backup", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBackup = () => {
    if (window.confirm("Are you sure you want to delete this local backup?")) {
      localStorage.removeItem(backupKey);
      setHasBackup(false);
      setBackupDate(null);
      addToast("Backup deleted", "info");
      onClose();
    }
  };

  const isNsecLogin = loginType === 'privateKey';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-2">
            <Shield className="text-primary size-6" />
            Key Backup
          </DialogTitle>
          <DialogDescription className="font-medium text-balance">
            {step === 'info' && "Secure your identity by saving an encrypted backup of your private key in this browser."}
            {step === 'pin' && "Create a PIN to encrypt your private key. You will need this PIN to restore it later."}
            {step === 'success' && "Your private key has been encrypted and saved safely in this browser's local storage."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'info' && (
            <div className="space-y-6">
              {!isNsecLogin ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-tight leading-relaxed">
                    Backup is only available for accounts logged in with a private key (nsec).
                  </p>
                </div>
              ) : hasBackup ? (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black">Local Backup Active</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                        Created: {backupDate}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-muted/30 text-[11px] font-medium leading-relaxed">
                    Your key is stored in this browser&apos;s local storage, encrypted with your PIN. If you clear your browser data, this backup will be lost.
                  </div>

                  <Button 
                    variant="ghost" 
                    onClick={handleDeleteBackup}
                    className="w-full h-12 rounded-xl text-destructive hover:bg-destructive/10 font-bold gap-2"
                  >
                    <Trash2 size={16} />
                    Delete Backup
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-start gap-3">
                    <Key className="text-primary shrink-0 mt-0.5" size={18} />
                    <p className="text-xs font-medium leading-relaxed">
                      We will encrypt your <span className="font-bold">nsec</span> and save it to this browser&apos;s local storage. This allows you to quickly log back in if you get logged out, without needing to paste your key again.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                    <Lock className="text-blue-500 shrink-0" size={16} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600/80">
                      End-to-End Encrypted with AES-GCM
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'pin' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Set a 4+ digit PIN</label>
                <div className="relative">
                  <Input 
                    type={showPin ? "text" : "password"}
                    placeholder="Enter PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="h-14 rounded-2xl text-lg font-black tracking-[0.5em] text-center pr-12"
                    maxLength={8}
                    autoFocus
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirm PIN</label>
                <Input 
                  type={showPin ? "text" : "password"}
                  placeholder="Confirm PIN"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="h-14 rounded-2xl text-lg font-black tracking-[0.5em] text-center"
                  maxLength={8}
                />
              </div>

              {pin && confirmPin && pin !== confirmPin && (
                <p className="text-[10px] text-destructive font-black text-center uppercase tracking-widest animate-in zoom-in duration-200">
                  PINs do not match
                </p>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-6 space-y-4 animate-in zoom-in duration-500">
              <div className="size-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border-2 border-green-500/20">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-xl font-black">Backup Complete!</h3>
              <p className="text-sm text-center text-muted-foreground font-medium max-w-[280px]">
                Your key is now safely stored on this device. Remember your PIN!
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step === 'info' && (
            <>
              <Button variant="ghost" onClick={onClose} className="rounded-2xl h-12 font-bold">Close</Button>
              {isNsecLogin && (
                <Button 
                  onClick={() => setStep('pin')} 
                  className="flex-1 rounded-2xl h-12 font-black shadow-lg shadow-primary/20"
                >
                  {hasBackup ? "Update Backup" : "Start Backup"}
                </Button>
              )}
            </>
          )}

          {step === 'pin' && (
            <>
              <Button variant="ghost" onClick={() => setStep('info')} className="rounded-2xl h-12 font-bold">Back</Button>
              <Button 
                onClick={handleCreateBackup} 
                disabled={isLoading || pin.length < 4 || pin !== confirmPin}
                className="flex-1 rounded-2xl h-12 font-black shadow-lg shadow-primary/20"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Lock className="mr-2 size-4" />}
                Encrypt & Save
              </Button>
            </>
          )}

          {step === 'success' && (
            <Button onClick={onClose} className="w-full rounded-2xl h-12 font-black">Finish</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
