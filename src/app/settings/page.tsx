"use client";

import React, { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useUIStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import { useWalletStore } from "@/store/wallet";
import { Bell, Shield, User, Globe, Zap, Wallet, Trash2, ExternalLink } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";

export default function SettingsPage() {
  const { isLoggedIn, user } = useAuthStore();
  const { 
    browserNotificationsEnabled, 
    setBrowserNotificationsEnabled,
    wotStrictMode,
    setWotStrictMode,
    defaultZapAmount,
    setDefaultZapAmount,
    addToast
  } = useUIStore();

  const { nwcPairingCode, setNwcPairingCode, balance } = useWalletStore();
  const [pairingInput, setPairingInput] = useState(nwcPairingCode || "");

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Promise.resolve().then(() => setPermissionStatus(Notification.permission));
    }
  }, []);

  const handleNotificationToggle = async () => {
    if (!("Notification" in window)) {
      addToast("Browser does not support notifications", "error");
      return;
    }

    if (!browserNotificationsEnabled) {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === "granted") {
        setBrowserNotificationsEnabled(true);
        addToast("Notifications enabled!", "success");
        new Notification("Tell it!", {
          body: "Notifications are now active.",
          icon: "/favicon.ico"
        });
      } else {
        setBrowserNotificationsEnabled(false);
        addToast("Permission denied for notifications", "error");
      }
    } else {
      setBrowserNotificationsEnabled(false);
      addToast("Notifications disabled", "info");
    }
  };

  const handleSaveWallet = () => {
    if (!pairingInput.trim()) return;
    if (!pairingInput.startsWith("nostr+walletconnect://")) {
      addToast("Invalid NWC pairing code", "error");
      return;
    }
    setNwcPairingCode(pairingInput.trim());
    addToast("Wallet connection string saved", "success");
    // Reload to re-init NDK with wallet
    window.location.reload();
  };

  const handleDisconnectWallet = () => {
    setNwcPairingCode(null);
    setPairingInput("");
    addToast("Wallet disconnected", "info");
    window.location.reload();
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-32">
        <h1 className="text-3xl font-black mb-8">Settings</h1>

        {/* Account Section */}
        {isLoggedIn && user && (
          <section className="mb-10">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
              <User size={16} /> Account
            </h2>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-4 flex items-center gap-4">
              <Avatar pubkey={user.pubkey} src={user.profile?.image} size={60} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg truncate">{user.profile?.displayName || user.profile?.name || "Nostrich"}</div>
                <div className="text-gray-500 text-sm truncate font-mono">{user.npub.slice(0, 12)}...{user.npub.slice(-8)}</div>
              </div>
            </div>
          </section>
        )}

        {/* Wallet Section (NWC) */}
        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
            <Wallet size={16} /> Wallet (NWC)
          </h2>
          <div className="p-4 bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-3xl space-y-4">
            {nwcPairingCode ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase">Connected Wallet</p>
                    <p className="font-black text-xl">{balance !== null ? `${balance.toLocaleString()} sats` : "Connected"}</p>
                  </div>
                  <div className="p-3 bg-blue-500 text-white rounded-full">
                    <Wallet size={24} />
                  </div>
                </div>
                <button
                  onClick={handleDisconnectWallet}
                  className="w-full py-3 flex items-center justify-center gap-2 text-red-500 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
                >
                  <Trash2 size={16} />
                  Disconnect Wallet
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Connect your wallet using Nostr Wallet Connect (NIP-47) to enable one-tap zapping from any device.
                </p>
                <input
                  type="text"
                  value={pairingInput}
                  onChange={(e) => setPairingInput(e.target.value)}
                  placeholder="nostr+walletconnect://..."
                  className="w-full p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveWallet}
                    disabled={!pairingInput.trim()}
                    className="flex-1 py-3 bg-blue-500 text-white font-black rounded-xl disabled:opacity-50 hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                  >
                    Connect Wallet
                  </button>
                  <a 
                    href="https://getalby.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-all text-gray-500"
                    title="Get Alby"
                  >
                    <ExternalLink size={20} />
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Zap Settings Section */}
        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
            <Zap size={16} /> Zaps
          </h2>
          <div className="p-4 bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-3xl space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">Default Zap Amount (Sats)</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[21, 100, 1000, 5000].map((val) => (
                  <button
                    key={val}
                    onClick={() => setDefaultZapAmount(val)}
                    className={`py-2 rounded-xl text-sm font-bold border transition-all ${
                      defaultZapAmount === val 
                        ? "bg-yellow-500 border-yellow-500 text-white shadow-lg shadow-yellow-500/20" 
                        : "border-gray-200 dark:border-gray-800 hover:border-yellow-500"
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={defaultZapAmount}
                onChange={(e) => setDefaultZapAmount(Number(e.target.value))}
                className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
              />
              <p className="text-[10px] text-gray-500 mt-2">
                This amount will be used as the default in the Zap modal and for one-tap zaps.
              </p>
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
            <Globe size={16} /> Preferences
          </h2>
          
          <div className="space-y-2">
            {/* Browser Notifications */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                  <Bell size={20} />
                </div>
                <div>
                  <div className="font-bold">Browser Notifications</div>
                  <div className="text-sm text-gray-500">Get alerts for new messages and mentions</div>
                </div>
              </div>
              <button
                onClick={handleNotificationToggle}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  browserNotificationsEnabled ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  browserNotificationsEnabled ? "translate-x-7" : "translate-x-1"
                }`} />
              </button>
            </div>

            {/* Notification Status Hint */}
            {browserNotificationsEnabled && permissionStatus === "denied" && (
              <div className="px-4 py-2 text-xs text-red-500 font-medium">
                ⚠️ Notifications are blocked by your browser settings. Please enable them in your browser to receive alerts.
              </div>
            )}

            {/* WoT Strict Mode */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
                  <Shield size={20} />
                </div>
                <div>
                  <div className="font-bold">Web of Trust Strict Mode</div>
                  <div className="text-sm text-gray-500">Only show content from users with a positive reputation</div>
                </div>
              </div>
              <button
                onClick={() => setWotStrictMode(!wotStrictMode)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  wotStrictMode ? "bg-purple-500" : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  wotStrictMode ? "translate-x-7" : "translate-x-1"
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* Footer info */}
        <div className="text-center text-gray-500 text-sm mt-20">
          Tell it! v0.7.7<br/>
          Built with NDK & Next.js
        </div>
      </div>
    </MainLayout>
  );
}
