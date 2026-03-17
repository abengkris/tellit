"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useWalletStore, WalletType, EncryptedData } from "@/store/wallet";
import { useNDK } from "@/hooks/useNDK";
import { useWallet } from "@/hooks/useWallet";
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
  Lock,
  Mic,
  Plus,
  Coins,
  X,
  Loader2,
  Globe
} from "lucide-react";
import { NDKEvent, NDKFilter, NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";
import { NDKWalletTransaction } from "@nostr-dev-kit/wallet";
import { format } from "date-fns";
import Link from "next/link";
import { shortenPubkey, toNpub } from "@/lib/utils/nip19";
import { WalletPinModal } from "@/components/common/WalletPinModal";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  podcast?: {
    itemGuid?: string;
    itemUrl?: string;
    podcastGuid?: string;
    podcastUrl?: string;
  };
}

function parseZapReceipt(zap: NDKEvent, currentUserPubkey?: string): ParsedZap {
  let senderPubkey: string | null = null;
  const recipientPubkey: string | null = zap.tags.find(t => t[0] === 'p')?.[1] || null;
  let amount = 0;

  // Extract podcast metadata from root tags (Kind 9735)
  const itemTag = zap.tags.find(t => t[0] === 'i' && t[1]?.startsWith('podcast:item:guid:'));
  const podcastTag = zap.tags.find(t => t[0] === 'i' && t[1]?.startsWith('podcast:guid:'));

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
    id: zap.id,
    podcast: (itemTag || podcastTag) ? {
      itemGuid: itemTag?.[1],
      itemUrl: itemTag?.[2],
      podcastGuid: podcastTag?.[1],
      podcastUrl: podcastTag?.[2],
    } : undefined
  };
}

export default function WalletPage() {
  const { 
    walletType, 
    nwcPairingCode, 
    setNwcPairingCode, 
    cashuMints,
    setCashuMints,
    setWalletType,
    balance, 
    info: walletInfo,
    isLocked,
    pinHash,
    lock
  } = useWalletStore();
  
  const { ndk, isReady, isWalletReady } = useNDK();
  const { wallet, refreshBalance, fetchTransactions } = useWallet();
  const { isLoggedIn, user } = useAuthStore();
  const { addToast, defaultZapAmount, setDefaultZapAmount, hideBalance, setHideBalance } = useUIStore();

  const [pairingInput, setPairingInput] = useState("");
  const [showPairing, setShowPairing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<NDKWalletTransaction[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [newMintUrl, setNewMintUrl] = useState("");

  // Load transactions
  useEffect(() => {
    if (!ndk || !user?.pubkey || isLocked) return;

    const isMounted = { current: true };

    const loadData = async () => {
      setIsLoadingTx(true);
      try {
        // 1. Fetch from wallet provider (NWC/Cashu)
        let walletTxs: NDKWalletTransaction[] = [];
        if (wallet) {
          console.log(`[WalletPage] Fetching transactions from ${walletType} wallet...`);
          walletTxs = await fetchTransactions();
          console.log(`[WalletPage] Received ${walletTxs.length} transactions from wallet`);
        }

        // 2. Fetch Zap Receipts (Kind 9735) as fallback/supplement
        console.log(`[WalletPage] Fetching Zap receipts for ${user.pubkey}...`);
        const filter: NDKFilter = {
          kinds: [9735],
          authors: [user.pubkey], 
          limit: 30
        };
        const receivedFilter: NDKFilter = {
          kinds: [9735],
          "#p": [user.pubkey], 
          limit: 30
        };

        const fetchZaps = async (f: NDKFilter) => {
          return new Promise<Set<NDKEvent>>((resolve) => {
            const events = new Set<NDKEvent>();
            // Use PARALLEL cache usage to ensure we get events from both local and remote
            const sub = ndk.subscribe(f, { 
              closeOnEose: true,
              cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
            });
            sub.on("event", (e) => events.add(e));
            sub.on("eose", () => resolve(events));
            // Ensure we resolve after some time even if EOSE is slow
            setTimeout(() => { sub.stop(); resolve(events); }, 8000);
          });
        };

        const [sent, received] = await Promise.all([
          fetchZaps(filter),
          fetchZaps(receivedFilter)
        ]);

        if (!isMounted.current) return;

        const allZaps = Array.from(new Set([...Array.from(sent), ...Array.from(received)]));
        const mappedZaps: NDKWalletTransaction[] = allZaps.map(zap => {
          const parsed = parseZapReceipt(zap, user.pubkey);
          return {
            id: `zap-${zap.id}`, // Prefix to avoid collisions
            direction: parsed.isSent ? 'out' : 'in',
            amount: parsed.amount,
            timestamp: parsed.timestamp,
            description: parsed.isSent ? 'Sent Zap' : 'Received Zap',
          };
        });

        // 3. Merge and Deduplicate
        const deduplicated = new Map<string, NDKWalletTransaction>();
        
        // Add wallet transactions first (preferred IDs)
        walletTxs.forEach(tx => deduplicated.set(tx.id, tx));

        // Add Zap receipts with fuzzy matching to avoid duplicates if they represent the same event
        mappedZaps.forEach(zapTx => {
          // Check if we already have a similar wallet transaction
          const isDuplicate = walletTxs.some(wTx => 
            wTx.amount === zapTx.amount && 
            Math.abs(wTx.timestamp - zapTx.timestamp) < 5 &&
            wTx.direction === zapTx.direction
          );

          if (!isDuplicate) {
            deduplicated.set(zapTx.id, zapTx);
          }
        });

        const combined = Array.from(deduplicated.values())
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 50);

        setTransactions(combined);
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        if (isMounted.current) setIsLoadingTx(false);
      }
    };

    loadData();
    if (wallet) refreshBalance();
    return () => { isMounted.current = false; };
  }, [ndk, user?.pubkey, wallet, isLocked, fetchTransactions, refreshBalance]);

  const handleRefresh = async () => {
    if (isLocked) {
      setShowPinModal(true);
      return;
    }
    setIsRefreshing(true);
    await refreshBalance();
    const txs = await fetchTransactions();
    setTransactions(txs);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleConnectNWC = async () => {
    if (!pairingInput.trim().startsWith("nostr+walletconnect://")) {
      addToast("Invalid NWC pairing code", "error");
      return;
    }
    setNwcPairingCode(pairingInput.trim());
    setWalletType('nwc');
    addToast("NWC Wallet connected!", "success");
  };

  const handleEnableCashu = () => {
    setWalletType('nip-60');
    addToast("Cashu Wallet enabled!", "success");
  };

  const handleEnableWebLN = () => {
    setWalletType('webln');
    addToast("WebLN Wallet enabled!", "success");
  };

  const handleAddMint = () => {
    if (!newMintUrl.startsWith("http")) return;
    if (cashuMints.includes(newMintUrl)) return;
    setCashuMints([...cashuMints, newMintUrl]);
    setNewMintUrl("");
    addToast("Mint added", "success");
  };

  const handleRemoveMint = (url: string) => {
    setCashuMints(cashuMints.filter(m => m !== url));
    addToast("Mint removed", "info");
  };

  const handleDisconnect = () => {
    if (confirm(`Disconnect your current wallet?`)) {
      setWalletType('none');
      setNwcPairingCode(null);
      addToast("Wallet disconnected", "info");
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-6 text-center">
        <div className="p-6 bg-gray-100 dark:bg-gray-900 rounded-full mb-6 text-gray-400">
          <Wallet size={64} />
        </div>
        <h1 className="text-2xl font-black mb-2">Wallet Access Restricted</h1>
        <p className="text-gray-500 mb-8 max-w-sm">Please log in to manage your wallet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:p-6 pb-32">
      <header className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
            <Wallet className="text-blue-500" size={28} /> Wallet
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm font-medium">Manage Nostr payments & Cashu</p>
        </div>
        <div className="flex gap-2">
          {pinHash && !isLocked && (
            <Button 
              variant="ghost"
              size="icon"
              onClick={() => lock()}
              className="rounded-2xl hover:bg-orange-500 hover:text-white transition-all"
              title="Lock Wallet"
            >
              <Lock size={20} />
            </Button>
          )}
          {walletType !== 'none' && (
            <Button 
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn("rounded-2xl bg-gray-50 dark:bg-gray-900", isRefreshing && "animate-spin text-blue-500")}
            >
              <RefreshCw size={20} />
            </Button>
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
          <Button 
            onClick={() => setShowPinModal(true)}
            size="lg"
            className="px-10 h-14 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-95"
          >
            Unlock with PIN
          </Button>
        </div>
      )}

      <div className={cn(isLocked && "opacity-20 pointer-events-none grayscale transition-all")}>
        {/* Balance Card */}
        {walletType !== 'none' ? (
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-none rounded-3xl overflow-hidden mb-8 text-white shadow-xl shadow-blue-500/20">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardDescription className="text-blue-100 font-bold uppercase tracking-wider text-[10px]">
                  {walletType.toUpperCase()} Balance
                </CardDescription>
                <Badge variant="secondary" className="bg-white/10 text-white border-none font-black text-[10px] uppercase tracking-widest gap-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full", balance !== null ? "bg-green-400" : "bg-yellow-400 animate-pulse")} />
                  {walletInfo?.alias || walletType}
                </Badge>
              </div>
              <div className="flex items-baseline gap-2 py-2">
                <span className="text-4xl sm:text-5xl font-black truncate">
                  {hideBalance ? "****" : (balance !== null ? balance.toLocaleString() : "---")}
                </span>
                <span className="text-lg font-bold text-blue-200">sats</span>
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex gap-2">
              <Button 
                variant="secondary" 
                className="flex-1 bg-white/10 hover:bg-white/20 border-none text-white font-bold h-12 rounded-2xl"
                onClick={() => setHideBalance(!hideBalance)}
              >
                {hideBalance ? <Eye size={18} className="mr-2" /> : <EyeOff size={18} className="mr-2" />}
                {hideBalance ? "Show" : "Hide"}
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1 bg-red-500/20 hover:bg-red-500/40 border-none font-bold h-12 rounded-2xl"
                onClick={handleDisconnect}
              >
                <Trash2 size={18} className="mr-2" />
                Disconnect
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 mb-8">
            <Card className="rounded-3xl border-2 border-dashed hover:border-blue-500/50 transition-colors cursor-pointer" onClick={() => setShowPairing(true)}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h3 className="font-black">Connect NWC</h3>
                  <p className="text-xs text-muted-foreground">Standard Nostr Wallet Connect (Alby, Mutiny, etc)</p>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-2 gap-4">
              <Card className="rounded-3xl border-2 border-dashed hover:border-purple-500/50 transition-colors cursor-pointer" onClick={handleEnableCashu}>
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl">
                    <Coins size={24} />
                  </div>
                  <div>
                    <h3 className="font-black">Enable Cashu</h3>
                    <p className="text-[10px] text-muted-foreground">NIP-60 Ecash Wallet</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-2 border-dashed hover:border-orange-500/50 transition-colors cursor-pointer" onClick={handleEnableWebLN}>
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="p-3 bg-orange-500/10 text-orange-500 rounded-2xl">
                    <Globe size={24} />
                  </div>
                  <div>
                    <h3 className="font-black">WebLN</h3>
                    <p className="text-[10px] text-muted-foreground">Browser Extension</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {showPairing && !nwcPairingCode && (
          <Card className="mb-8 rounded-3xl bg-muted/30 border-none shadow-none animate-in slide-in-from-top-4">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest">Setup NWC</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                type="password" 
                placeholder="nostr+walletconnect://..." 
                value={pairingInput} 
                onChange={(e) => setPairingInput(e.target.value)}
                className="h-12 rounded-xl bg-background border-none shadow-sm"
              />
              <div className="flex gap-2">
                <Button className="flex-1 rounded-xl h-12 font-black" onClick={handleConnectNWC} disabled={!pairingInput.startsWith("nostr+walletconnect://")}>
                  Connect
                </Button>
                <Button variant="ghost" className="rounded-xl h-12" onClick={() => setShowPairing(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* NIP-60 Mint Management */}
        {walletType === 'nip-60' && (
          <section className="mb-10">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
              <Coins size={16} /> Cashu Mints
            </h2>
            <div className="bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl p-5 space-y-4">
              <div className="space-y-2">
                {cashuMints.map(mint => (
                  <div key={mint} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                    <span className="text-xs font-mono truncate mr-4">{mint}</span>
                    <Button variant="ghost" size="icon" className="size-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleRemoveMint(mint)}>
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="https://mint-url.com" 
                  value={newMintUrl}
                  onChange={(e) => setNewMintUrl(e.target.value)}
                  className="rounded-xl"
                />
                <Button size="icon" className="rounded-xl shrink-0" onClick={handleAddMint} disabled={!newMintUrl.startsWith('http')}>
                  <Plus size={20} />
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Unified Transaction History */}
        <section className="mb-10">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
            <History size={16} /> Transaction History
          </h2>
          <Card className="rounded-3xl border-none bg-white dark:bg-black shadow-sm overflow-hidden">
            {isLoadingTx ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : transactions.length > 0 ? (
              <div className="divide-y divide-gray-50 dark:divide-gray-900">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2 rounded-full",
                        tx.direction === 'in' ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"
                      )}>
                        {tx.direction === 'in' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate max-w-[180px] sm:max-w-[300px]">
                          {tx.description || (tx.direction === 'in' ? 'Received' : 'Sent')}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {format(new Date(tx.timestamp * 1000), "MMM d, HH:mm")}
                          {tx.mint && ` • ${new URL(tx.mint).hostname}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-black", tx.direction === 'in' ? "text-green-500" : "text-gray-900 dark:text-white")}>
                        {tx.direction === 'in' ? '+' : '-'}{tx.amount.toLocaleString()}
                      </p>
                      <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">sats</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <History className="mx-auto mb-3 opacity-20 size-8" />
                <p className="text-sm font-bold">No transactions yet</p>
              </div>
            )}
          </Card>
        </section>

        {/* Settings & Security */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2"><Shield size={16} /> Security</h2>
            <Card className="rounded-3xl border-none bg-white dark:bg-black shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", pinHash ? "bg-green-500 text-white" : "bg-muted text-muted-foreground")}>
                    <ShieldCheck size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-tight">Encryption</p>
                    <p className="text-[10px] text-muted-foreground truncate">{pinHash ? "Active" : "Disabled"}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl text-[10px] font-black uppercase h-8" onClick={() => setShowPinModal(true)}>
                  {pinHash ? "Change" : "Setup"}
                </Button>
              </div>
            </Card>
          </section>

          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2"><Settings size={16} /> Defaults</h2>
            <Card className="rounded-3xl border-none bg-white dark:bg-black shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold">Zap Amount</span>
                <span className="text-xs font-black text-blue-500">{defaultZapAmount} sats</span>
              </div>
              <div className="flex gap-1">
                {[21, 100, 1000].map(val => (
                  <Button 
                    key={val} 
                    variant={defaultZapAmount === val ? "default" : "ghost"}
                    className="flex-1 h-8 rounded-lg text-[10px] font-black p-0"
                    onClick={() => setDefaultZapAmount(val)}
                  >
                    {val}
                  </Button>
                ))}
              </div>
            </Card>
          </section>
        </div>
      </div>

      <WalletPinModal isOpen={showPinModal} onClose={() => setShowPinModal(false)} />
    </div>
  );
}
