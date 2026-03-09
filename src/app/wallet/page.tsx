"use client";

import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useWalletStore, WalletType } from "@/store/wallet";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { useProfile } from "@/hooks/useProfile";
import { 
  Wallet, 
  RefreshCw,
  ArrowUpRight, 
  ArrowDownLeft, 
  Zap, 
  Trash2, 
  ExternalLink, 
  Plus, 
  Info,
  History,
  Settings,
  Copy,
  PlusCircle,
  XCircle,
  Database,
  Share2,
  CheckCircle2,
  CreditCard,
  Loader2,
  Shield,
  Eye,
  EyeOff,
  Key,
  ShieldCheck,
  Lock,
  Unlock
} from "lucide-react";
import { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk";
import { NDKCashuWallet } from "@nostr-dev-kit/wallet";
import { format } from "date-fns";
import Link from "next/link";
import { shortenPubkey } from "@/lib/utils/nip19";
import { CashuDepositModal } from "@/components/common/CashuDepositModal";
import { generateMnemonic, validateMnemonic, mnemonicToPrivateKey } from "@/lib/utils/wallet";
import { WalletPinModal } from "@/components/common/WalletPinModal";

export default function WalletPage() {
  const { 
    walletType, 
    setWalletType, 
    nwcPairingCode, 
    setNwcPairingCode, 
    cashuMints, 
    setCashuMints, 
    cashuPrivateKey,
    setCashuPrivateKey,
    cashuMnemonic,
    setCashuMnemonic,
    balance, 
    info: walletInfo,
    resetWallet,
    isLocked,
    pinHash,
    lock
  } = useWalletStore();
  
  const { ndk, isReady, refreshBalance } = useNDK();
  const { isLoggedIn, user } = useAuthStore();
  const { profile } = useProfile(user?.pubkey);
  const { addToast, defaultZapAmount, setDefaultZapAmount, hideBalance, setHideBalance } = useUIStore();

  const [pairingInput, setPairingInput] = useState("");
  const [showPairing, setShowPairing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentZaps, setRecentZaps] = useState<NDKEvent[]>([]);
  const [isLoadingZaps, setIsLoadingZaps] = useState(false);
  
  const [newMint, setNewMint] = useState("");
  const [p2pk, setP2pk] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [isReceivingToken, setIsReceivingToken] = useState(false);

  const [showRecovery, setShowRecovery] = useState(false);
  const [restoreInput, setRestoreInput] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  // Auto-refresh balance if missing
  useEffect(() => {
    if (walletType !== 'none' && balance === null && isReady && !isLocked) {
      refreshBalance();
    }
  }, [walletType, balance, isReady, refreshBalance, isLocked]);

  // Get P2PK for Cashu
  useEffect(() => {
    if (walletType === 'cashu' && ndk?.wallet instanceof NDKCashuWallet && !isLocked) {
      ndk.wallet.getP2pk().then(setP2pk).catch(console.error);
    }
  }, [walletType, ndk?.wallet, isLocked]);

  // Fetch recent zaps (kind 9735)
  useEffect(() => {
    if (!ndk || !user?.pubkey || !isReady || isLocked) return;

    let isMounted = true;

    const fetchZaps = async () => {
      setIsLoadingZaps(true);
      try {
        const filter: NDKFilter = {
          kinds: [9735],
          authors: [user.pubkey], 
          limit: 20
        };
        const receivedFilter: NDKFilter = {
          kinds: [9735],
          "#p": [user.pubkey], 
          limit: 20
        };

        const fetchWithTimeout = async (f: NDKFilter) => {
          return new Promise<Set<NDKEvent>>((resolve) => {
            const events = new Set<NDKEvent>();
            const sub = ndk.subscribe(f, { closeOnEose: true });
            sub.on("event", (e) => events.add(e));
            sub.on("eose", () => resolve(events));
            setTimeout(() => {
              sub.stop();
              resolve(events);
            }, 5000);
          });
        };

        const [sent, received] = await Promise.all([
          fetchWithTimeout(filter),
          fetchWithTimeout(receivedFilter)
        ]);

        if (!isMounted) return;

        const allZaps = Array.from(new Set([...Array.from(sent), ...Array.from(received)]))
          .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
          .slice(0, 20);

        setRecentZaps(allZaps);
      } catch (err) {
        console.error("Failed to fetch zaps:", err);
      } finally {
        if (isMounted) setIsLoadingZaps(false);
      }
    };

    fetchZaps();
    return () => { isMounted = false; };
  }, [ndk, user?.pubkey, isReady, isLocked]);

  const handleRefresh = async () => {
    if (isLocked) {
      setShowPinModal(true);
      return;
    }
    setIsRefreshing(true);
    await refreshBalance();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleConnectNWC = () => {
    if (!pairingInput.trim().startsWith("nostr+walletconnect://")) {
      addToast("Invalid NWC pairing code", "error");
      return;
    }
    setNwcPairingCode(pairingInput.trim());
    addToast("NWC Wallet connected!", "success");
    window.location.reload();
  };

  const handleSwitchType = (type: WalletType) => {
    if (type === walletType) return;
    if (confirm(`Switch to ${type.toUpperCase()} wallet? Current session will reload.`)) {
      setWalletType(type);
      window.location.reload();
    }
  };

  const handleAddMint = async () => {
    if (!newMint.trim().startsWith("http")) {
      addToast("Invalid mint URL", "error");
      return;
    }
    const updatedMints = [...cashuMints, newMint.trim()];
    setCashuMints(updatedMints);
    setNewMint("");
    if (ndk?.wallet instanceof NDKCashuWallet) {
      ndk.wallet.mints = updatedMints;
      await ndk.wallet.publish();
      addToast("Mint added and wallet updated", "success");
    }
  };

  const handleRemoveMint = async (mint: string) => {
    if (cashuMints.length <= 1) {
      addToast("You need at least one mint", "error");
      return;
    }
    const updatedMints = cashuMints.filter(m => m !== mint);
    setCashuMints(updatedMints);
    if (ndk?.wallet instanceof NDKCashuWallet) {
      ndk.wallet.mints = updatedMints;
      await ndk.wallet.publish();
      addToast("Mint removed and wallet updated", "success");
    }
  };

  const handleCreateCashuWallet = async () => {
    if (!ndk) return;
    setIsPublishing(true);
    try {
      const mnemonic = generateMnemonic();
      const privateKey = mnemonicToPrivateKey(mnemonic);
      setCashuMnemonic(mnemonic);
      setCashuPrivateKey(privateKey);
      const wallet = await NDKCashuWallet.create(ndk, cashuMints);
      await wallet.addPrivkey(privateKey);
      await wallet.publish();
      addToast("New Cashu wallet created and backed up to Nostr!", "success");
      setWalletType('cashu');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error(err);
      addToast("Failed to create Cashu wallet", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRestoreWallet = async () => {
    if (!ndk) return;
    const input = restoreInput.trim();
    if (!input) return;
    setIsRestoring(true);
    try {
      let privateKey = "";
      let mnemonic = null;
      if (input.split(" ").length >= 12) {
        if (!validateMnemonic(input)) {
          addToast("Invalid seed phrase", "error");
          setIsRestoring(false);
          return;
        }
        mnemonic = input;
        privateKey = mnemonicToPrivateKey(input);
      } else if (/^[0-9a-fA-F]{64}$/.test(input)) {
        privateKey = input;
      } else {
        addToast("Invalid input. Enter 12 words or hex key.", "error");
        setIsRestoring(false);
        return;
      }
      setCashuMnemonic(mnemonic);
      setCashuPrivateKey(privateKey);
      setWalletType('cashu');
      const wallet = new NDKCashuWallet(ndk);
      wallet.mints = cashuMints;
      await wallet.addPrivkey(privateKey);
      addToast("Wallet restored! Reloading...", "success");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error(err);
      addToast("Failed to restore wallet", "error");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRestoreFromNostr = async () => {
    if (!ndk || !ndk.signer) return;
    setIsPublishing(true);
    try {
      const user = await ndk.signer.user();
      const event = await ndk.fetchEvent({ kinds: [37375] as number[], authors: [user.pubkey] });
      if (event) {
        const wallet = await NDKCashuWallet.from(event);
        if (wallet) {
          const keys = Array.from(wallet.privkeys.values());
          if (keys.length > 0) setCashuPrivateKey(keys[0].privateKey);
          setCashuMints(wallet.mints);
          setWalletType('cashu');
          addToast("Wallet restored from Nostr!", "success");
          setTimeout(() => window.location.reload(), 1000);
          return;
        }
      }
      addToast("No backup found on Nostr.", "info");
    } catch (err) {
      console.error(err);
      addToast("Restore failed", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishCashu = async () => {
    if (!(ndk?.wallet instanceof NDKCashuWallet)) return;
    setIsPublishing(true);
    try {
      await ndk.wallet.publish();
      await ndk.wallet.publishMintList();
      addToast("Wallet synced to Nostr!", "success");
    } catch {
      addToast("Failed to sync", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReceiveToken = async () => {
    if (!tokenInput.trim() || !(ndk?.wallet instanceof NDKCashuWallet)) return;
    setIsReceivingToken(true);
    try {
      const result = await ndk.wallet.receiveToken(tokenInput.trim());
      if (result) {
        addToast("Token received!", "success");
        setTokenInput("");
        refreshBalance();
      } else {
        addToast("Failed to receive token", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Error receiving token", "error");
    } finally {
      setIsReceivingToken(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${label} copied!`, "success");
  };

  if (!isLoggedIn) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] p-6 text-center">
          <div className="p-6 bg-gray-100 dark:bg-gray-900 rounded-full mb-6 text-gray-400">
            <Wallet size={64} />
          </div>
          <h1 className="text-2xl font-black mb-2">Wallet Access Restricted</h1>
          <p className="text-gray-500 mb-8 max-w-sm">Please log in to manage your wallet.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:p-6 pb-32">
        <header className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
              <Wallet className="text-blue-500" size={28} /> Wallet
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm font-medium">Manage eCash and connections</p>
          </div>
          <div className="flex gap-2">
            {pinHash && !isLocked && (
              <button 
                onClick={() => lock()}
                className="p-2.5 sm:p-3 bg-gray-100 dark:bg-gray-900 rounded-2xl hover:bg-orange-500 hover:text-white transition-all group"
                title="Lock Wallet"
              >
                <Lock size={20} />
              </button>
            )}
            {walletType !== 'none' && (
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`p-2.5 sm:p-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all ${isRefreshing ? 'animate-spin text-blue-500' : ''}`}
              >
                <RefreshCw size={24} />
              </button>
            )}
          </div>
        </header>

        {isLocked && (
          <div className="mb-8 p-8 sm:p-10 bg-gray-900 dark:bg-white rounded-[2rem] text-white dark:text-black shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="p-5 bg-white/10 dark:bg-black/5 rounded-full mb-6">
              <Lock size={48} className="text-orange-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black mb-2">Wallet is Locked</h2>
            <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm mb-8 max-w-xs leading-relaxed">
              Your wallet data is encrypted. Enter your PIN to access your funds and settings.
            </p>
            <button 
              onClick={() => setShowPinModal(true)}
              className="px-10 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-95"
            >
              Unlock with PIN
            </button>
          </div>
        )}

        <div className={isLocked ? "opacity-20 pointer-events-none grayscale transition-all" : ""}>
          <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl mb-8">
            {(['nwc', 'cashu'] as WalletType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleSwitchType(type)}
                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all uppercase tracking-widest ${
                  walletType === type 
                    ? "bg-white dark:bg-gray-800 shadow-sm text-blue-500" 
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div 
              onClick={() => setHideBalance(!hideBalance)}
              className={`p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all group ${
                hideBalance ? "bg-blue-500/5 border-blue-500/20 text-blue-500" : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800"
              }`}
            >
              <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${hideBalance ? "bg-blue-500 text-white" : "bg-blue-500/10 text-blue-500"}`}>
                {hideBalance ? <Eye size={18} /> : <EyeOff size={18} />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Privacy Mode</p>
                <p className="text-xs font-bold">{hideBalance ? 'Balance Hidden' : 'Hide Balance'}</p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${pinHash ? "bg-green-500 text-white" : "bg-blue-500/10 text-blue-500"}`}>
                {pinHash ? <ShieldCheck size={18} /> : <Shield size={18} />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{pinHash ? 'Secured' : 'Safety Status'}</p>
                <p className="text-xs font-bold">{nwcPairingCode || walletType === 'cashu' ? 'Connected & Private' : 'No Active Wallet'}</p>
              </div>
            </div>
          </div>

          {walletType !== 'none' && (nwcPairingCode || walletType === 'cashu') ? (
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/20 mb-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                <Zap size={120} fill="currentColor" />
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4 sm:mb-2">
                <div>
                  <p className="text-blue-100 font-bold uppercase tracking-wider text-[10px]">Available Balance</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black truncate max-w-[200px] sm:max-w-none">
                      {hideBalance ? "****" : (balance !== null ? balance.toLocaleString() : "---")}
                    </span>
                    <span className="text-lg sm:text-xl font-bold text-blue-200">sats</span>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 self-start sm:self-auto">
                  <div className={`w-2 h-2 rounded-full ${balance !== null ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                  {walletInfo?.alias || walletType}
                </div>
              </div>
              {walletInfo?.lud16 && (
                <button onClick={() => handleCopy(walletInfo.lud16!, "Address")} className="flex items-center gap-2 text-blue-100/80 hover:text-white transition-colors mb-6 sm:mb-8 group/addr max-w-full">
                  <span className="text-xs sm:text-sm font-mono truncate">{walletInfo.lud16}</span>
                  <Copy size={14} className="opacity-50 group-hover/addr:opacity-100 transition-opacity shrink-0" />
                </button>
              )}
              <div className="flex gap-3 mt-4">
                <button onClick={() => walletType === 'cashu' ? setShowDepositModal(true) : addToast("Deposit coming soon for NWC!", "info")} className="flex-1 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-95">
                  <Plus size={18} /> Receive
                </button>
                <button onClick={() => handleSwitchType('none')} className="p-3 bg-white/10 hover:bg-red-500/40 backdrop-blur-md rounded-2xl transition-all active:scale-95">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-10 text-center mb-8">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                {walletType === 'nwc' ? <CreditCard size={32} /> : <Database size={32} />}
              </div>
              <h2 className="text-lg font-bold mb-2">{walletType === 'nwc' ? 'Connect NWC Wallet' : 'Initialize Cashu Wallet'}</h2>
              {walletType === 'nwc' ? (
                <div className="space-y-4 max-w-sm mx-auto mt-6">
                  <div className="relative">
                    <input type={showPairing ? "text" : "password"} placeholder="nostr+walletconnect://..." value={pairingInput} onChange={(e) => setPairingInput(e.target.value)} className="w-full p-3 sm:p-4 pr-12 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    <button onClick={() => setShowPairing(!showPairing)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">{showPairing ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleConnectNWC} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-2xl shadow-lg transition-all disabled:opacity-50" disabled={!pairingInput.startsWith("nostr+walletconnect://")}>Connect NWC</button>
                    <a href="https://getalby.com" target="_blank" rel="noopener noreferrer" className="p-3 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-white dark:hover:bg-gray-900 transition-all text-gray-500 flex items-center justify-center"><ExternalLink size={20} /></a>
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  <p className="text-gray-500 text-sm mb-4 max-w-xs mx-auto">Native eCash wallet using NIP-60. Fast, private, and built directly into Nostr.</p>
                  <div className="space-y-3 max-w-sm mx-auto">
                    <button onClick={handleCreateCashuWallet} disabled={isPublishing} className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-2xl shadow-lg transition-all disabled:opacity-50">{isPublishing ? <RefreshCw size={20} className="animate-spin mx-auto" /> : "Create New Cashu Wallet"}</button>
                    <button onClick={handleRestoreFromNostr} disabled={isPublishing} className="w-full py-4 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-2xl font-bold transition-all">Restore from Nostr</button>
                  </div>
                  <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Manual Restore</p>
                    <div className="space-y-3">
                      <textarea placeholder="Enter 12-word seed phrase or hex key..." value={restoreInput} onChange={(e) => setRestoreInput(e.target.value)} className="w-full p-4 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-blue-500 h-24 resize-none" />
                      <button onClick={handleRestoreWallet} disabled={isRestoring || !restoreInput.trim()} className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-black font-black rounded-2xl transition-all disabled:opacity-50">{isRestoring ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Restore Wallet"}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <section className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2"><Shield size={16} /> Security</h2>
            <div className="bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${pinHash ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-900 text-gray-400"}`}><ShieldCheck size={18} /></div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Storage Encryption</p>
                    <p className="text-[10px] text-gray-500 font-medium">{pinHash ? "Your keys are encrypted with a PIN" : "Protect your keys with a PIN"}</p>
                  </div>
                </div>
                <button onClick={() => setShowPinModal(true)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${pinHash ? "border border-gray-200 dark:border-gray-800 hover:bg-gray-50" : "bg-blue-500 text-white shadow-lg shadow-blue-500/20"}`}>{pinHash ? "Change PIN" : "Setup PIN"}</button>
              </div>
            </div>
          </section>

          {walletType === 'cashu' && (
            <section className="mb-10">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2"><Database size={16} /> Cashu Management</h2>
              <div className="bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-sm">
                <div>
                  <button onClick={() => setShowRecovery(!showRecovery)} className="flex items-center justify-between w-full p-4 bg-orange-500/5 hover:bg-orange-500/10 border border-orange-500/20 rounded-2xl transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500 text-white rounded-lg"><Key size={18} /></div>
                      <div className="text-left"><p className="text-xs font-black uppercase tracking-widest text-orange-600">Recovery Seed</p><p className="text-[10px] text-orange-500 font-medium">Backup your wallet safely</p></div>
                    </div>
                    <div className="text-orange-500">{showRecovery ? <EyeOff size={20} /> : <Eye size={20} />}</div>
                  </button>
                  {showRecovery && (
                    <div className="mt-4 p-5 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 rounded-2xl animate-in slide-in-from-top-2">
                      <p className="text-[11px] text-orange-800 dark:text-orange-300 mb-4 font-medium">Write these 12 words down. Anyone with this phrase can access your funds. <strong>Never share it.</strong></p>
                      {cashuMnemonic ? (
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {cashuMnemonic.split(" ").map((word, i) => (
                            <div key={i} className="flex gap-1.5 items-center p-2 bg-white dark:bg-black rounded-lg border border-orange-200 shadow-sm"><span className="text-[9px] font-black text-orange-400">{i + 1}</span><span className="text-xs font-bold font-mono">{word}</span></div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="p-3 bg-white dark:bg-black rounded-xl border border-orange-200 overflow-hidden"><p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-black">Private Key (Hex)</p><code className="text-[10px] font-mono text-blue-500 break-all">{cashuPrivateKey}</code></div>
                          <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                            <p className="text-[11px] text-orange-600 font-bold mb-2 flex items-center gap-1.5"><Info size={14} /> No Seed Phrase</p>
                            <p className="text-[10px] text-gray-500 mb-3">This wallet doesn&apos;t have a 12-word seed phrase. Backup the Private Key Hex above.</p>
                            <button onClick={() => confirm("WARNING: This will delete your wallet. Are you sure?") && (resetWallet(), window.location.reload())} className="w-full py-2 border border-orange-500/30 text-orange-600 text-[10px] font-black uppercase rounded-xl hover:bg-orange-500 hover:text-white">Reset & Create New Wallet</button>
                          </div>
                        </div>
                      )}
                      <button onClick={() => handleCopy(cashuMnemonic || cashuPrivateKey || "", "Seed phrase")} className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black rounded-xl shadow-lg flex items-center justify-center gap-2"><Copy size={14} /> Copy to Clipboard</button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold mb-2 flex items-center gap-2">P2PK Address <Info size={14} className="text-gray-400" /></label>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 overflow-hidden">
                    <code className="text-[10px] sm:text-xs font-mono text-blue-500 truncate mr-2">{p2pk ? `${p2pk.slice(0, 12)}...${p2pk.slice(-12)}` : "Generating..."}</code>
                    {p2pk && <button onClick={() => handleCopy(p2pk, "P2PK")} className="text-gray-400 hover:text-blue-500 transition-colors shrink-0"><Copy size={16} /></button>}
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold mb-3">Managed Mints</label>
                  <div className="space-y-2">
                    {cashuMints.map(mint => (
                      <div key={mint} className="flex items-center justify-between p-2.5 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden"><span className="text-[10px] font-medium truncate mr-2">{mint}</span><button onClick={() => handleRemoveMint(mint)} className="text-gray-300 hover:text-red-500 transition-all shrink-0"><XCircle size={16} /></button></div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input type="text" placeholder="https://mint-url..." value={newMint} onChange={(e) => setNewMint(e.target.value)} className="flex-1 p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 rounded-xl text-[10px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <button onClick={handleAddMint} className="p-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shrink-0"><PlusCircle size={18} /></button>
                  </div>
                </div>
                <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                  <label className="block text-xs sm:text-sm font-bold mb-3">Redeem Cashu Token</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="cashuA..." value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} className="flex-1 p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 rounded-xl text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <button onClick={handleReceiveToken} disabled={isReceivingToken || !tokenInput.trim()} className="p-2.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 font-bold text-xs disabled:opacity-50">{isReceivingToken ? <Loader2 size={18} className="animate-spin" /> : "Redeem"}</button>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                  <button onClick={handlePublishCashu} disabled={isPublishing} className="flex-1 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50">{isPublishing ? <RefreshCw size={16} className="animate-spin" /> : <Share2 size={16} />} Backup to Nostr</button>
                  <button onClick={async () => { if (ndk?.wallet instanceof NDKCashuWallet) { try { setIsPublishing(true); await ndk.wallet.publishMintList(); addToast("Mint list published!", "success"); } catch (err) { console.error(err); addToast("Failed to publish", "error"); } finally { setIsPublishing(false); } } }} disabled={isPublishing} className="flex-1 py-3 border border-gray-200 dark:border-gray-800 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all"><CheckCircle2 size={16} className="text-green-500" /> Enable Nutzaps</button>
                </div>
              </div>
            </section>
          )}

          <section className="mb-10">
            <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-black uppercase tracking-widest text-gray-500 flex items-center gap-2"><Zap size={16} /> Zap Address</h2><Link href={`/${user?.npub}`} className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline">Edit Profile</Link></div>
            <div className="bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm">
              <p className="text-xs sm:text-sm text-gray-500 mb-4">Your public lightning address from your Nostr profile.</p>
              {profile?.lud16 ? (
                <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 overflow-hidden mb-4"><code className="text-[10px] sm:text-sm text-blue-500 font-bold break-all mr-2">{profile.lud16}</code><button onClick={() => handleCopy(profile.lud16!, "Zap Address")} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-all text-gray-500 shrink-0"><Copy size={18} /></button></div>
              ) : (
                <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl mb-4"><p className="text-xs sm:text-sm text-yellow-600 font-medium">You haven&apos;t set up a Lightning Address yet.</p></div>
              )}
              <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10"><h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Info size={12} /> Pro Tip: Cashu-Linked Addresses</h4><p className="text-[11px] text-gray-500 leading-relaxed">Use addresses from cashu.me or minibits.cash to receive eCash automatically!</p></div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2"><Settings size={16} /> Zap Settings</h2>
            <div className="bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-[1.5rem] p-6 space-y-6 shadow-sm">
              <div>
                <label className="block text-sm font-bold mb-4">Default Zap Amount</label>
                <div className="grid grid-cols-4 gap-2">
                  {[21, 100, 1000, 5000].map((val) => (
                    <button key={val} onClick={() => setDefaultZapAmount(val)} className={`py-3 rounded-xl text-sm font-black border transition-all ${defaultZapAmount === val ? "bg-yellow-500 border-yellow-500 text-white shadow-lg shadow-yellow-500/20" : "border-gray-200 dark:border-gray-800 hover:border-yellow-500"}`}>{val}</button>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3"><input type="number" value={defaultZapAmount} onChange={(e) => setDefaultZapAmount(Number(e.target.value))} className="flex-1 p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm font-bold" /><span className="text-sm font-bold text-gray-500">sats</span></div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-black uppercase tracking-widest text-gray-500 flex items-center gap-2"><History size={16} /> Recent Activity</h2></div>
            <div className="bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
              {isLoadingZaps ? (
                <div className="p-6 sm:p-8 space-y-4">{[1, 2, 3].map(i => (<div key={i} className="flex gap-4 animate-pulse"><div className="w-8 h-8 bg-gray-100 dark:bg-gray-900 rounded-full" /><div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 dark:bg-gray-900 rounded w-1/4" /><div className="h-2 bg-gray-100 dark:bg-gray-900 rounded w-1/2" /></div></div>))}</div>
              ) : recentZaps.length > 0 ? (
                <div className="divide-y divide-gray-50 dark:divide-gray-900">
                  {recentZaps.map((zap) => {
                    const isSent = zap.pubkey === user?.pubkey;
                    const zapAmountTag = zap.tags.find(t => t[0] === 'description');
                    let amount = "---";
                    try { if (zapAmountTag) { const desc = JSON.parse(zapAmountTag[1]); const amountTag = desc.tags.find((t: string[]) => t[0] === 'amount'); if (amountTag) amount = (Number(amountTag[1]) / 1000).toLocaleString(); } } catch { }
                    const targetPubkey = isSent ? zap.tags.find(t => t[0] === 'p')?.[1] : zap.pubkey;
                    return (
                      <div key={zap.id} className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className={`p-1.5 sm:p-2 rounded-full shrink-0 ${isSent ? 'bg-orange-500/10 text-orange-600' : 'bg-green-500/10 text-green-600'}`}>{isSent ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}</div>
                          <div className="min-w-0"><div className="flex items-center gap-1.5 font-bold text-[11px] sm:text-sm"><span>{isSent ? 'Sent to' : 'Received from'}</span><span className="text-blue-500 truncate">{targetPubkey ? shortenPubkey(targetPubkey) : 'Unknown'}</span></div><p className="text-[9px] sm:text-[10px] text-gray-500 font-medium">{format(new Date((zap.created_at || 0) * 1000), "MMM d, HH:mm")}</p></div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 ml-2"><span className={`font-black text-sm sm:text-lg ${isSent ? 'text-gray-900 dark:text-white' : 'text-green-500'}`}>{isSent ? '-' : '+'}{amount}</span><span className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">sats</span></div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-10 sm:p-12 text-center text-gray-500"><Zap className="mx-auto mb-3 opacity-20 w-8 h-8" /><p className="text-xs sm:text-sm font-bold">No recent activity</p></div>
              )}
            </div>
          </section>
        </div>
      </div>

      <WalletPinModal isOpen={showPinModal} onClose={() => setShowPinModal(false)} />

      {showDepositModal && ndk?.wallet instanceof NDKCashuWallet && (
        <CashuDepositModal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} wallet={ndk.wallet} />
      )}
    </MainLayout>
  );
}
