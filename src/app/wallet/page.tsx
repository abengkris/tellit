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
  Shield
} from "lucide-react";
import { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk";
import { NDKCashuWallet } from "@nostr-dev-kit/wallet";
import { format } from "date-fns";
import { shortenPubkey } from "@/lib/utils/nip19";
import { CashuDepositModal } from "@/components/common/CashuDepositModal";

export default function WalletPage() {
  const { 
    walletType, 
    setWalletType, 
    nwcPairingCode, 
    setNwcPairingCode, 
    cashuMints, 
    setCashuMints, 
    balance, 
    info: walletInfo 
  } = useWalletStore();
  
  const { ndk, isReady, refreshBalance } = useNDK();
  const { isLoggedIn, user } = useAuthStore();
  const { profile } = useProfile(user?.pubkey);
  const { addToast, defaultZapAmount, setDefaultZapAmount } = useUIStore();

  const [pairingInput, setPairingInput] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentZaps, setRecentZaps] = useState<NDKEvent[]>([]);
  const [isLoadingZaps, setIsLoadingZaps] = useState(false);
  
  const [newMint, setNewMint] = useState("");
  const [p2pk, setP2pk] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [isReceivingToken, setIsReceivingToken] = useState(false);

  // Auto-refresh balance if missing
  useEffect(() => {
    if (walletType !== 'none' && balance === null && isReady) {
      refreshBalance();
    }
  }, [walletType, balance, isReady, refreshBalance]);

  // Get P2PK for Cashu
  useEffect(() => {
    if (walletType === 'cashu' && ndk?.wallet instanceof NDKCashuWallet) {
      ndk.wallet.getP2pk().then(setP2pk).catch(console.error);
    }
  }, [walletType, ndk?.wallet]);

  // Fetch recent zaps (kind 9735)
  useEffect(() => {
    if (!ndk || !user?.pubkey || !isReady) return;

    let isMounted = true;

    const fetchZaps = async () => {
      setIsLoadingZaps(true);
      try {
        const filter: NDKFilter = {
          kinds: [9735],
          authors: [user.pubkey], // Zaps sent by user
          limit: 20
        };
        const receivedFilter: NDKFilter = {
          kinds: [9735],
          "#p": [user.pubkey], // Zaps received by user
          limit: 20
        };

        // Fetch with a timeout to prevent infinite loading if relays are slow
        const fetchWithTimeout = async (f: NDKFilter) => {
          return new Promise<Set<NDKEvent>>((resolve) => {
            const events = new Set<NDKEvent>();
            const sub = ndk.subscribe(f, { closeOnEose: true });
            
            sub.on("event", (e) => events.add(e));
            sub.on("eose", () => resolve(events));
            
            // Force resolve after 5 seconds
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
  }, [ndk, user?.pubkey, isReady]);

  const handleRefresh = async () => {
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
    if (cashuMints.includes(newMint.trim())) {
      addToast("Mint already added", "info");
      return;
    }
    
    const updatedMints = [...cashuMints, newMint.trim()];
    setCashuMints(updatedMints);
    setNewMint("");

    // If wallet is active, update it live
    if (ndk?.wallet instanceof NDKCashuWallet) {
      ndk.wallet.mints = updatedMints;
      await ndk.wallet.publish();
      addToast("Mint added and wallet updated", "success");
    } else {
      addToast("Mint added. Connect wallet to sync.", "success");
    }
  };

  const handleRemoveMint = async (mint: string) => {
    if (cashuMints.length <= 1) {
      addToast("You need at least one mint", "error");
      return;
    }
    const updatedMints = cashuMints.filter(m => m !== mint);
    setCashuMints(updatedMints);

    // If wallet is active, update it live
    if (ndk?.wallet instanceof NDKCashuWallet) {
      ndk.wallet.mints = updatedMints;
      await ndk.wallet.publish();
      addToast("Mint removed and wallet updated", "success");
    } else {
      addToast("Mint removed. Connect wallet to sync.", "success");
    }
  };

  const handleCreateCashuWallet = async () => {
    if (!ndk) return;
    setIsPublishing(true);
    try {
      // Use static create() as recommended
      await NDKCashuWallet.create(ndk, cashuMints);
      addToast("New Cashu wallet created and backed up to Nostr!", "success");
      setWalletType('cashu');
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      addToast("Failed to create Cashu wallet", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishCashu = async () => {
    if (!(ndk?.wallet instanceof NDKCashuWallet)) return;
    setIsPublishing(true);
    try {
      // Direct publish as recommended for saving config
      await ndk.wallet.publish();
      await ndk.wallet.publishMintList();
      addToast("Wallet configuration and mint list synced to Nostr!", "success");
    } catch {
      addToast("Failed to sync wallet info", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReceiveToken = async () => {
    if (!tokenInput.trim() || !(ndk?.wallet instanceof NDKCashuWallet)) return;
    
    setIsReceivingToken(true);
    try {
      const token = tokenInput.trim();
      const result = await ndk.wallet.receiveToken(token);
      if (result) {
        addToast("Token received and added to wallet!", "success");
        setTokenInput("");
        refreshBalance();
      } else {
        addToast("Failed to receive token. Check if the mint is supported.", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Error receiving token.", "error");
    } finally {
      setIsReceivingToken(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${label} copied!`, "success");
  };

  const [showFaq, setShowFaq] = useState(false);

  if (!isLoggedIn) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] p-6 text-center">
          <div className="p-6 bg-gray-100 dark:bg-gray-900 rounded-full mb-6 text-gray-400">
            <Wallet size={64} />
          </div>
          <h1 className="text-2xl font-black mb-2">Wallet Access Restricted</h1>
          <p className="text-gray-500 mb-8 max-w-sm">Please log in to manage your wallet and zaps.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:p-6 pb-32">
        <header className="flex items-center justify-between mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
            <Wallet className="text-blue-500" size={28} /> Wallet
          </h1>
          {walletType !== 'none' && (
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all ${isRefreshing ? 'animate-spin text-blue-500' : ''}`}
            >
              <RefreshCw size={24} />
            </button>
          )}
        </header>

        {/* Wallet Type Switcher */}
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

        {/* Safety Status & Info Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div 
            onClick={() => setShowFaq(!showFaq)}
            className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-all group"
          >
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg group-hover:scale-110 transition-transform">
              <Info size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Knowledge Base</p>
              <p className="text-xs font-bold">How Cashu & NWC work?</p>
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
              <Shield size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Safety Status</p>
              <p className="text-xs font-bold">{nwcPairingCode || walletType === 'cashu' ? 'Connected & Secured' : 'No Active Wallet'}</p>
            </div>
          </div>
        </div>

        {showFaq && (
          <div className="mb-10 p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10 animate-in fade-in slide-in-from-top-2 duration-300">
            <h3 className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">Cashu Guide</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</div>
                <div>
                  <p className="text-xs font-black mb-1">Tokens = Physical Cash</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed">Cashu is not a bank account. Your money is stored as encrypted &quot;tokens&quot; in this browser. If you clear your browser data without a backup, your money is gone.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</div>
                <div>
                  <p className="text-xs font-black mb-1">Mints are Gateways</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed">Your money lives at specific &quot;Mints&quot;. They are private and blinded, meaning the mint owner doesn&apos;t know who you are, but you must trust that the mint stays online.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</div>
                <div>
                  <p className="text-xs font-black mb-1">Always Backup to Nostr</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed">Use the &quot;Backup to Nostr&quot; button. It encrypts your tokens and saves them to your Nostr identity. This allows you to restore your wallet on any device.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Balance Card */}
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
                    {balance !== null ? balance.toLocaleString() : "---"}
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
              <button 
                onClick={() => handleCopy(walletInfo.lud16!, "Address")}
                className="flex items-center gap-2 text-blue-100/80 hover:text-white transition-colors mb-6 sm:mb-8 group/addr max-w-full"
              >
                <span className="text-xs sm:text-sm font-mono truncate">
                  {walletInfo.lud16.length > 25 ? `${walletInfo.lud16.slice(0, 15)}...${walletInfo.lud16.slice(-8)}` : walletInfo.lud16}
                </span>
                <Copy size={14} className="opacity-50 group-hover/addr:opacity-100 transition-opacity shrink-0" />
              </button>
            )}

            <div className="flex gap-3 mt-4">
              <button 
                onClick={() => {
                  if (walletType === 'cashu') {
                    setShowDepositModal(true);
                  } else {
                    addToast("Deposit coming soon for NWC!", "info");
                  }
                }}
                className="flex-1 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Plus size={18} /> Receive
              </button>
              <button 
                onClick={() => handleSwitchType('none')}
                className="p-3 bg-white/10 hover:bg-red-500/40 backdrop-blur-md rounded-2xl transition-all active:scale-95"
                title="Disconnect Wallet"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-10 text-center mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-500/10 text-blue-500 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-6">
              {walletType === 'nwc' ? <CreditCard size={32} /> : <Database size={32} />}
            </div>
            <h2 className="text-lg sm:text-xl font-bold mb-2">
              {walletType === 'nwc' ? 'Connect NWC Wallet' : 'Initialize Cashu Wallet'}
            </h2>
            
            {walletType === 'nwc' ? (
              <div className="space-y-4 max-w-sm mx-auto mt-6">
                <input 
                  type="text"
                  placeholder="nostr+walletconnect://..."
                  value={pairingInput}
                  onChange={(e) => setPairingInput(e.target.value)}
                  className="w-full p-3 sm:p-4 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <button 
                    onClick={handleConnectNWC}
                    disabled={!pairingInput.startsWith("nostr+walletconnect://")}
                    className="flex-1 py-3 sm:py-4 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                  >
                    Connect NWC
                  </button>
                  <a 
                    href="https://getalby.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 sm:p-4 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-white dark:hover:bg-gray-900 transition-all text-gray-500 flex items-center justify-center"
                  >
                    <ExternalLink size={20} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto">
                  Native eCash wallet using NIP-60. Fast, private, and built directly into Nostr.
                </p>
                <button 
                  onClick={handleCreateCashuWallet}
                  disabled={isPublishing}
                  className="w-full max-w-sm py-3 sm:py-4 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {isPublishing ? <RefreshCw size={20} className="animate-spin mx-auto" /> : "Create New Cashu Wallet"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cashu Specific Settings */}
        {walletType === 'cashu' && (
          <section className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
              <Database size={16} /> Cashu Management
            </h2>
            <div className="bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-sm">
              {/* P2PK Address */}
              <div>
                <label className="block text-xs sm:text-sm font-bold mb-2 flex items-center gap-2">
                  P2PK Address <span title="Used for receiving Nutzaps (NIP-61)"><Info size={14} className="text-gray-400" /></span>
                </label>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <code className="text-[10px] sm:text-xs font-mono text-blue-500 truncate mr-2">
                    {p2pk ? `${p2pk.slice(0, 12)}...${p2pk.slice(-12)}` : "Generating..."}
                  </code>
                  {p2pk && (
                    <button onClick={() => handleCopy(p2pk, "P2PK")} className="text-gray-400 hover:text-blue-500 transition-colors shrink-0">
                      <Copy size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Mints */}
              <div>
                <label className="block text-xs sm:text-sm font-bold mb-3">Managed Mints</label>
                <div className="space-y-2">
                  {cashuMints.map(mint => (
                    <div key={mint} className="flex items-center justify-between p-2.5 sm:p-3 border border-gray-100 dark:border-gray-800 rounded-xl group overflow-hidden">
                      <span className="text-[10px] sm:text-xs font-medium truncate mr-2">{mint}</span>
                      <button 
                        onClick={() => handleRemoveMint(mint)}
                        className="text-gray-300 hover:text-red-500 transition-all shrink-0"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input 
                    type="text" 
                    placeholder="https://mint-url..."
                    value={newMint}
                    onChange={(e) => setNewMint(e.target.value)}
                    className="flex-1 p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-[10px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button onClick={handleAddMint} className="p-2.5 sm:p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shrink-0">
                    <PlusCircle size={18} />
                  </button>
                </div>
              </div>

              {/* Redeem Token */}
              <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                <label className="block text-xs sm:text-sm font-bold mb-3">Redeem Cashu Token</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="cashuA..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="flex-1 p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-[10px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  <button 
                    onClick={handleReceiveToken}
                    disabled={isReceivingToken || !tokenInput.trim()}
                    className="p-2.5 sm:p-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-colors shrink-0 font-bold text-xs disabled:opacity-50"
                  >
                    {isReceivingToken ? <Loader2 size={18} className="animate-spin" /> : "Redeem"}
                  </button>
                </div>
              </div>

              {/* Sync/Publish */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={handlePublishCashu}
                  disabled={isPublishing}
                  className="flex-1 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                  title="Backup your wallet configuration to Nostr (Kind 37375)"
                >
                  {isPublishing ? <RefreshCw size={16} className="animate-spin" /> : <Share2 size={16} />}
                  Backup to Nostr
                </button>
                <button 
                  onClick={async () => {
                    if (ndk?.wallet instanceof NDKCashuWallet) {
                      try {
                        setIsPublishing(true);
                        await ndk.wallet.publishMintList();
                        addToast("Mint list published! You can now receive Nutzaps.", "success");
                      } catch (err) {
                        addToast("Failed to publish mint list", "error");
                      } finally {
                        setIsPublishing(false);
                      }
                    }
                  }}
                  disabled={isPublishing}
                  className="flex-1 py-3 border border-gray-200 dark:border-gray-800 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all"
                  title="Announce your mints to receive Nutzaps (Kind 10019)"
                >
                  <CheckCircle2 size={16} className="text-green-500" />
                  Enable Nutzaps
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Zap Address Section (For Profile lud16) */}
        <section className="mb-10">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
            <Zap size={16} /> Zap Address
          </h2>
          <div className="bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm">
            <p className="text-xs sm:text-sm text-gray-500 mb-4">
              This is your public lightning address from your Nostr profile.
            </p>
            {profile?.lud16 ? (
              <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <code className="text-[10px] sm:text-sm text-blue-500 font-bold break-all mr-2">{profile.lud16}</code>
                <button 
                  onClick={() => handleCopy(profile.lud16!, "Zap Address")}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-all text-gray-500 shrink-0"
                >
                  <Copy size={18} />
                </button>
              </div>
            ) : (
              <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
                <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-500 font-medium">
                  You haven&apos;t set up a Lightning Address yet. Update your profile to start receiving zaps!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Quick Settings */}
        <section className="mb-10">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
            <Settings size={16} /> Zap Settings
          </h2>
          <div className="bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-[1.5rem] p-6 space-y-6 shadow-sm">
            <div>
              <label className="block text-sm font-bold mb-4">Default Zap Amount</label>
              <div className="grid grid-cols-4 gap-2">
                {[21, 100, 1000, 5000].map((val) => (
                  <button
                    key={val}
                    onClick={() => setDefaultZapAmount(val)}
                    className={`py-3 rounded-xl text-sm font-black border transition-all ${
                      defaultZapAmount === val 
                        ? "bg-yellow-500 border-yellow-500 text-white shadow-lg shadow-yellow-500/20" 
                        : "border-gray-200 dark:border-gray-800 hover:border-yellow-500"
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <input
                  type="number"
                  value={defaultZapAmount}
                  onChange={(e) => setDefaultZapAmount(Number(e.target.value))}
                  className="flex-1 p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm font-bold"
                />
                <span className="text-sm font-bold text-gray-500">sats</span>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
              <History size={16} /> Recent Activity
            </h2>
          </div>

          <div className="bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
            {isLoadingZaps ? (
              <div className="p-6 sm:p-8 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-4 animate-pulse">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 dark:bg-gray-900 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 sm:h-4 bg-gray-100 dark:bg-gray-900 rounded w-1/4" />
                      <div className="h-2 sm:h-3 bg-gray-100 dark:bg-gray-900 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentZaps.length > 0 ? (
              <div className="divide-y divide-gray-50 dark:divide-gray-900">
                {recentZaps.map((zap) => {
                  const isSent = zap.pubkey === user?.pubkey;
                  const zapAmountTag = zap.tags.find(t => t[0] === 'description');
                  let amount = "---";
                  try {
                    if (zapAmountTag) {
                      const desc = JSON.parse(zapAmountTag[1]);
                      const amountTag = desc.tags.find((t: string[]) => t[0] === 'amount');
                      if (amountTag) amount = (Number(amountTag[1]) / 1000).toLocaleString();
                    }
                  } catch {
                    // Ignore parsing errors
                  }

                  const targetPubkey = isSent 
                    ? zap.tags.find(t => t[0] === 'p')?.[1]
                    : zap.pubkey;

                  return (
                    <div key={zap.id} className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className={`p-1.5 sm:p-2 rounded-full shrink-0 ${isSent ? 'bg-orange-500/10 text-orange-600' : 'bg-green-500/10 text-green-600'}`}>
                          {isSent ? <ArrowUpRight size={16} className="sm:w-5 sm:h-5" /> : <ArrowDownLeft size={16} className="sm:w-5 sm:h-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-[11px] sm:text-sm">
                            <span>{isSent ? 'Sent to' : 'Received from'}</span>
                            <span className="text-blue-500 truncate">
                              {targetPubkey ? shortenPubkey(targetPubkey) : 'Unknown'}
                            </span>
                          </div>
                          <p className="text-[9px] sm:text-[10px] text-gray-500 font-medium">
                            {format(new Date((zap.created_at || 0) * 1000), "MMM d, HH:mm")}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 ml-2">
                        <span className={`font-black text-sm sm:text-lg ${isSent ? 'text-gray-900 dark:text-white' : 'text-green-500'}`}>
                          {isSent ? '-' : '+'}{amount}
                        </span>
                        <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">sats</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-10 sm:p-12 text-center text-gray-500">
                <Zap className="mx-auto mb-3 opacity-20 w-8 h-8 sm:w-10 sm:h-10" />
                <p className="text-xs sm:text-sm font-bold">No recent zap activity</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {showDepositModal && ndk?.wallet instanceof NDKCashuWallet && (
        <CashuDepositModal
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          wallet={ndk.wallet}
        />
      )}
    </MainLayout>
  );
}
