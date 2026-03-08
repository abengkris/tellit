"use client";

import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useWalletStore } from "@/store/wallet";
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
  Copy
} from "lucide-react";
import { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk";
import { format } from "date-fns";
import { shortenPubkey } from "@/lib/utils/nip19";

export default function WalletPage() {
  const { nwcPairingCode, setNwcPairingCode, balance } = useWalletStore();
  const { ndk, isReady, refreshBalance } = useNDK();
  const { isLoggedIn, user } = useAuthStore();
  const { profile } = useProfile(user?.pubkey);
  const { addToast, defaultZapAmount, setDefaultZapAmount } = useUIStore();

  const [pairingInput, setPairingInput] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentZaps, setRecentZaps] = useState<NDKEvent[]>([]);
  const [isLoadingZaps, setIsLoadingZaps] = useState(false);

  const handleCopyAddress = () => {
    if (profile?.lud16) {
      navigator.clipboard.writeText(profile.lud16);
      addToast("Zap address copied!", "success");
    }
  };

  // Fetch recent zaps (kind 9735)
  useEffect(() => {
    if (!ndk || !user?.pubkey || !isReady) return;

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

        const [sent, received] = await Promise.all([
          ndk.fetchEvents(filter),
          ndk.fetchEvents(receivedFilter)
        ]);

        const allZaps = Array.from(new Set([...Array.from(sent), ...Array.from(received)]))
          .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
          .slice(0, 20);

        setRecentZaps(allZaps);
      } catch (err) {
        console.error("Failed to fetch zaps:", err);
      } finally {
        setIsLoadingZaps(false);
      }
    };

    fetchZaps();
  }, [ndk, user?.pubkey, isReady]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshBalance();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleConnect = () => {
    if (!pairingInput.trim().startsWith("nostr+walletconnect://")) {
      addToast("Invalid NWC pairing code", "error");
      return;
    }
    setNwcPairingCode(pairingInput.trim());
    addToast("Wallet connected!", "success");
    window.location.reload();
  };

  const handleDisconnect = () => {
    if (confirm("Disconnect your wallet? You will need to reconnect to use one-tap zapping.")) {
      setNwcPairingCode(null);
      addToast("Wallet disconnected", "info");
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
          <p className="text-gray-500 mb-8 max-w-sm">Please log in to manage your wallet and zaps.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-32">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Wallet className="text-blue-500" size={32} /> Wallet
          </h1>
          {nwcPairingCode && (
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all ${isRefreshing ? 'animate-spin text-blue-500' : ''}`}
            >
              <RefreshCw size={24} />
            </button>
          )}
        </header>

        {/* Balance Card */}
        {nwcPairingCode ? (
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-500/20 mb-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Zap size={120} fill="currentColor" />
            </div>
            
            <p className="text-blue-100 font-bold uppercase tracking-wider text-xs mb-2">Available Balance</p>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-5xl font-black">{balance !== null ? balance.toLocaleString() : "---"}</span>
              <span className="text-xl font-bold text-blue-200">sats</span>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => addToast("Deposit coming soon!", "info")}
                className="flex-1 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Plus size={18} /> Receive
              </button>
              <button 
                onClick={handleDisconnect}
                className="p-3 bg-white/10 hover:bg-red-500/40 backdrop-blur-md rounded-2xl transition-all"
                title="Disconnect Wallet"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2rem] p-10 text-center mb-8">
            <div className="w-20 h-20 bg-blue-500/10 text-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Plus size={40} />
            </div>
            <h2 className="text-xl font-bold mb-2">Connect your wallet</h2>
            <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto">
              Use Nostr Wallet Connect (NWC) to enable one-tap zapping and manage your sats directly.
            </p>
            
            <div className="space-y-4 max-w-sm mx-auto">
              <input 
                type="text"
                placeholder="nostr+walletconnect://..."
                value={pairingInput}
                onChange={(e) => setPairingInput(e.target.value)}
                className="w-full p-4 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleConnect}
                  disabled={!pairingInput.startsWith("nostr+walletconnect://")}
                  className="flex-1 py-4 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  Connect NWC
                </button>
                <a 
                  href="https://getalby.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-white dark:hover:bg-gray-900 transition-all text-gray-500"
                  title="Get Alby Wallet"
                >
                  <ExternalLink size={20} />
                </a>
              </div>
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
              <Info size={14} />
              <span>Standard NIP-47 protocol supported</span>
            </div>
          </div>
        )}

        {/* Lightning Address Section */}
        <section className="mb-10">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
            <Zap size={16} /> Zap Address
          </h2>
          <div className="bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-[1.5rem] p-6 shadow-sm">
            <p className="text-sm text-gray-500 mb-4">
              This is your public lightning address where people can send you zaps.
            </p>
            {profile?.lud16 ? (
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                <code className="text-blue-500 font-bold break-all">{profile.lud16}</code>
                <button 
                  onClick={handleCopyAddress}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-all text-gray-500 ml-4 shrink-0"
                  title="Copy Address"
                >
                  <Copy size={18} />
                </button>
              </div>
            ) : (
              <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
                <p className="text-sm text-yellow-600 dark:text-yellow-500 font-medium">
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

          <div className="bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-[1.5rem] overflow-hidden shadow-sm">
            {isLoadingZaps ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-4 animate-pulse">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded w-1/4" />
                      <div className="h-3 bg-gray-100 dark:bg-gray-900 rounded w-1/2" />
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
                    <div key={zap.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`p-2 rounded-full ${isSent ? 'bg-orange-500/10 text-orange-600' : 'bg-green-500/10 text-green-600'}`}>
                          {isSent ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-sm">
                            <span>{isSent ? 'Sent to' : 'Received from'}</span>
                            <span className="text-blue-500">
                              {targetPubkey ? shortenPubkey(targetPubkey) : 'Unknown'}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 font-medium">
                            {format(new Date((zap.created_at || 0) * 1000), "MMM d, yyyy · HH:mm")}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`font-black text-lg ${isSent ? 'text-gray-900 dark:text-white' : 'text-green-500'}`}>
                          {isSent ? '-' : '+'}{amount}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">sats</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <Zap className="mx-auto mb-3 opacity-20" size={40} />
                <p className="text-sm font-bold">No recent zap activity</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
