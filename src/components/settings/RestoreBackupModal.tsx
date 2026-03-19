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
import { useNDK } from "@/hooks/useNDK";
import { useUIStore } from "@/store/ui";
import { decryptData } from "@/lib/utils/encryption";
import { Shield, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";

interface EncryptedBackup {
  pubkey: string;
  encrypted: string;
  createdAt: string;
  v: number;
}

interface RestoreBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RestoreBackupModal({ isOpen, onClose, onSuccess }: RestoreBackupModalProps) {
  const { loginWithPrivateKey } = useAuthStore();
  const { ndk, sessions, isReady } = useNDK();
  const { addToast } = useUIStore();
  
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [backups, setBackups] = useState<EncryptedBackup[]>([]);
  const [selectedPubkey, setSelectedPubkey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Find all tellit-backup keys in localStorage
      const foundBackups: EncryptedBackup[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('tellit-backup-')) {
          try {
            const data = JSON.parse(localStorage.getItem(key)!) as EncryptedBackup;
            foundBackups.push(data);
          } catch { /* ignore */ }
        }
      }
      setBackups(foundBackups);
      if (foundBackups.length === 1) {
        setSelectedPubkey(foundBackups[0].pubkey);
      }
      setPin("");
    }
  }, [isOpen]);

  const handleRestore = async () => {
    if (!ndk || !sessions || !isReady || !selectedPubkey) return;

    const backup = backups.find(b => b.pubkey === selectedPubkey);
    if (!backup) return;

    setIsLoading(true);
    try {
      const privateKey = await decryptData(backup.encrypted, pin);
      await loginWithPrivateKey(ndk, sessions, privateKey);
      
      addToast("Account restored successfully!", "success");
      onSuccess();
    } catch (err) {
      console.error(err);
      addToast("Invalid PIN or corrupted backup", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-2">
            <Shield className="text-primary size-6" />
            Restore Backup
          </DialogTitle>
          <DialogDescription className="font-medium text-balance">
            Enter your PIN to decrypt and restore your private key from this browser.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {backups.length > 1 && (
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Account</label>
              <div className="grid gap-2">
                {backups.map(b => (
                  <button
                    key={b.pubkey}
                    onClick={() => setSelectedPubkey(b.pubkey)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                      selectedPubkey === b.pubkey 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted bg-muted/20 hover:border-primary/30'
                    }`}
                  >
                    <Avatar pubkey={b.pubkey} size={32} />
                    <div className="text-left min-w-0">
                      <p className="text-sm font-bold truncate">{b.pubkey.slice(0, 8)}...{b.pubkey.slice(-8)}</p>
                      <p className="text-[10px] text-muted-foreground font-black uppercase">Backup from {new Date(b.createdAt).toLocaleDateString()}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {backups.length === 1 && (
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
              <Avatar pubkey={backups[0].pubkey} size={48} />
              <div>
                <p className="font-black text-sm">Stored Identity</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                  Backup from {new Date(backups[0].createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Enter PIN</label>
            <div className="relative">
              <Input 
                type={showPin ? "text" : "password"}
                placeholder="PIN"
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
        </div>

        <DialogFooter>
          <Button 
            onClick={handleRestore} 
            disabled={isLoading || pin.length < 4 || !selectedPubkey}
            className="w-full h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary/20"
          >
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Lock className="mr-2 size-5" />}
            Decrypt & Sign In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
