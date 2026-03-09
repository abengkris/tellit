"use client";

import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useWalletStore, WalletType, EncryptedData } from "@/store/wallet";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { 
  Wallet, 
  RefreshCw,
  ArrowUpRight, 
  ArrowDownLeft, 
  Zap, 
  Trash2, 
  ExternalLink, 
  Settings,
  History,
  CreditCard,
  Shield,
  Eye,
  EyeOff,
  ShieldCheck,
  Lock
} from "lucide-react";
import { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk";
import { format } from "date-fns";
import Link from "next/link";
import { shortenPubkey, toNpub } from "@/lib/utils/nip19";
import { WalletPinModal } from "@/components/common/WalletPinModal";
import { useProfile } from "@/hooks/useProfile";

const ZapUser = ({ pubkey }: { pubkey: string }) => {
  const { profile } = useProfile(pubkey);
  const name = profile?.display_name || profile?.name || shortenPubkey(pubkey);
  return (
    <Link href={`/${toNpub(pubkey)}`} className="text-blue-500 hover:underline font-bold">
      {name}
    </Link>
  );
};

interface ParsedZap {
  otherPartyPubkey: string | null;
  amount: number;
  isSent: boolean;
  timestamp: number;
  id: string;
}

function parseZapReceipt(zap: NDKEvent, currentUserPubkey?: string): ParsedZap {
  let senderPubkey: string | null = null;
  const recipientPubkey: string | null = zap.tags.find(t => t[0] === 'p')?.[1] || null;
  let amount = 0;

  try {
    const descriptionTag = zap.tags.find(t => t[0] === 'description');
    if (descriptionTag?.[1]) {
      const zapRequest = JSON.parse(descriptionTag[1]);
      senderPubkey = zapRequest.pubkey;
      
      const amountTag = zapRequest.tags.find((t: string[]) => t[0] === 'amount');
      if (amountTag?.[1]) {
        amount = Math.floor(Number(amountTag[1]) / 1000);
      }
    }
  } catch (e) {
    console.error("Failed to parse zap description", e);
  }

  const isSent = senderPubkey === currentUserPubkey;
  const otherPartyPubkey = isSent ? recipientPubkey : senderPubkey;

  return {
    otherPartyPubkey,
    amount,
    isSent,
    timestamp: zap.created_at || 0,
    id: zap.id
  };
}

export default function WalletPage() {
  const { 
    walletType, 
    nwcPairingCode, 
    setNwcPairingCode, 
    balance, 
    info: walletInfo,
    isLocked,
    pinHash,
    lock
  } = useWalletStore();
  
  const { ndk, isReady, isWalletReady, refreshBalance } = useNDK();
  const { isLoggedIn, user } = useAuthStore();
  const { addToast, defaultZapAmount, setDefaultZapAmount, hideBalance, setHideBalance } = useUIStore();

  const [pairingInput, setPairingInput] = useState("");
  const [showPairing, setShowPairing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentZaps, setRecentZaps] = useState<NDKEvent[]>([]);
  const [isLoadingZaps, setIsLoadingZaps] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  // Auto-refresh balance if missing
  useEffect(() => {
    if (walletType === 'nwc' && balance === null && isWalletReady && !isLocked) {
      refreshBalance();
    }
  }, [walletType, balance, isWalletReady, refreshBalance, isLocked]);

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

  const handleConnectNWC = async () => {
    if (!pairingInput.trim().startsWith("nostr+walletconnect://")) {
      addToast("Invalid NWC pairing code", "error");
      return;
    }
    
    const code = pairingInput.trim();
    
    // If we have a PIN, we should also update the encrypted blob
    if (pinHash) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const secrets: EncryptedData = { nwcPairingCode: code };
        // We'd need the PIN to re-encrypt. Since we don't have it here,
        // we'll just set it raw and it will be encrypted next time they 'lock' 
        // or we could prompt for PIN. 
        // For now, let's just set it. It will persist in localStorage.
        setNwcPairingCode(code);
      } catch (err) {
        console.error(err);
      }
    } else {
      setNwcPairingCode(code);
    }
    
    addToast("NWC Wallet connected!", "success");
    // Removed window.location.reload() to let NDKProvider react to the change
  };

  const handleDisconnect = () => {
    if (confirm(`Disconnect your NWC wallet?`)) {
      setNwcPairingCode(null);
      window.location.reload();
    }
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
            <p className="text-gray-500 text-xs sm:text-sm font-medium">Manage NWC and payments</p>
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
            {nwcPairingCode && (
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
              Your wallet connection is encrypted. Enter your PIN to access your balance and settings.
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
                <p className="text-xs font-bold">{nwcPairingCode ? 'Connected & Private' : 'No Active Wallet'}</p>
              </div>
            </div>
          </div>

          {nwcPairingCode ? (
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
                  {walletInfo?.alias || 'NWC'}
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={handleDisconnect} className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95">
                  <Trash2 size={18} /> Disconnect Wallet
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-10 text-center mb-8">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CreditCard size={32} />
              </div>
              <h2 className="text-lg font-bold mb-2">Connect Nostr Wallet Connect</h2>
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
                    <p className="text-[10px] text-gray-500 font-medium">{pinHash ? "Your wallet is encrypted with a PIN" : "Protect your connection with a PIN"}</p>
                  </div>
                </div>
                <button onClick={() => setShowPinModal(true)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${pinHash ? "border border-gray-200 dark:border-gray-800 hover:bg-gray-50" : "bg-blue-500 text-white shadow-lg shadow-blue-500/20"}`}>{pinHash ? "Change PIN" : "Setup PIN"}</button>
              </div>
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
                    const parsed = parseZapReceipt(zap, user?.pubkey);
                    return (
                      <div key={parsed.id} className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className={`p-1.5 sm:p-2 rounded-full shrink-0 ${parsed.isSent ? 'bg-orange-500/10 text-orange-600' : 'bg-green-500/10 text-green-600'}`}>
                            {parsed.isSent ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-bold text-[11px] sm:text-sm">
                              <span>{parsed.isSent ? 'Sent to' : 'Received from'}</span>
                              {parsed.otherPartyPubkey ? <ZapUser pubkey={parsed.otherPartyPubkey} /> : <span className="text-gray-400">Unknown</span>}
                            </div>
                            <p className="text-[9px] sm:text-[10px] text-gray-500 font-medium">{format(new Date(parsed.timestamp * 1000), "MMM d, HH:mm")}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 ml-2">
                          <span className={`font-black text-sm sm:text-lg ${parsed.isSent ? 'text-gray-900 dark:text-white' : 'text-green-500'}`}>
                            {parsed.isSent ? '-' : '+'}{parsed.amount.toLocaleString()}
                          </span>
                          <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">sats</span>
                        </div>
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
    </MainLayout>
  );
}
