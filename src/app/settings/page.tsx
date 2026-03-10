"use client";

import React, { useEffect, useState } from "react";
import { useUIStore, RelayAuthStrategy } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { Bell, Shield, User, Globe, Wallet, Clock, LogOut, Key, VolumeX, X } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import Link from "next/link";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useLists } from "@/hooks/useLists";
import { MuteList } from "@/components/profile/MuteList";

interface ExtendedCacheAdapter {
  getUnpublishedEvents?: () => Promise<{ event: NDKEvent; relays?: string[]; lastTryAt?: number }[]>;
}

export default function SettingsPage() {
  const { isLoggedIn, user, logout } = useAuthStore();
  const { sessions, ndk, isReady } = useNDK();
  const { mutedPubkeys, loading: loadingLists } = useLists();
  const { 
    browserNotificationsEnabled, 
    setBrowserNotificationsEnabled,
    wotStrictMode,
    setWotStrictMode,
    relayAuthStrategy,
    setRelayAuthStrategy,
    addToast
  } = useUIStore();

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");
  const [unpublishedCount, setUnpublishedCount] = useState(0);
  const [isMuteListModalOpen, setIsMuteListModalOpen] = useState(false);

  useEffect(() => {
    if (isReady && ndk?.cacheAdapter) {
      const adapter = ndk.cacheAdapter as ExtendedCacheAdapter;
      if (adapter.getUnpublishedEvents) {
        adapter.getUnpublishedEvents().then((events) => {
          setUnpublishedCount(events.length);
        }).catch(() => {});
      }
    }
  }, [isReady, ndk]);

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

  const handleLogout = () => {
    logout(sessions);
    addToast("Logged out successfully", "info");
  };

  return (
    <>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-32">
        <h1 className="text-3xl font-black mb-8">Settings</h1>

        {/* Account Section */}
        {isLoggedIn && user && (
          <section className="mb-10">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
              <User size={16} /> Account
            </h2>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-4 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Avatar pubkey={user.pubkey} src={user.profile?.image} size={60} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-lg truncate">{user.profile?.display_name || user.profile?.name || "Nostrich"}</div>
                  <div className="text-gray-500 text-sm truncate font-mono">{user.npub.slice(0, 12)}...{user.npub.slice(-8)}</div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 border-t border-gray-200 dark:border-gray-800 pt-4">
                <Link 
                  href="/settings/unpublished"
                  className="w-full py-3 bg-white dark:bg-black hover:bg-blue-50 dark:hover:bg-blue-900/10 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all border border-gray-100 dark:border-gray-800 shadow-sm relative"
                >
                  <Clock size={18} className="text-blue-500" />
                  <span>View Local Outbox</span>
                  {unpublishedCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center bg-red-500 text-[10px] text-white font-black rounded-full ring-2 ring-gray-50 dark:ring-gray-900 animate-in zoom-in duration-300">
                      {unpublishedCount}
                    </span>
                  )}
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="w-full py-3 text-red-500 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Wallet Section (NWC) */}
        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
            <Wallet size={16} /> Wallet & Zaps
          </h2>
          <div className="p-4 bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-3xl">
            <p className="text-sm text-gray-500 mb-6">
              Manage your Nostr Wallet Connect (NWC) settings, view your balance, and set default zap amounts in the wallet dashboard.
            </p>
            <Link 
              href="/wallet"
              className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
            >
              <Wallet size={20} />
              Open Wallet Dashboard
            </Link>
          </div>
        </section>

        {/* Relay Authentication Section */}
        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
            <Key size={16} /> Relay Authentication
          </h2>
          <div className="bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-3xl p-4">
            <p className="text-sm text-gray-500 mb-4">
              Control how the app responds when a relay requests authentication (NIP-42).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(["ask", "always", "never"] as RelayAuthStrategy[]).map((strategy) => (
                <button
                  key={strategy}
                  onClick={() => {
                    setRelayAuthStrategy(strategy);
                    addToast(`Relay authentication set to: ${strategy}`, "success");
                  }}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center gap-1 ${
                    relayAuthStrategy === strategy
                      ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500"
                      : "border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
                  }`}
                >
                  <span className="font-bold capitalize">{strategy}</span>
                  <span className="text-[10px] text-gray-500 leading-tight">
                    {strategy === "ask" && "Confirm each request"}
                    {strategy === "always" && "Auto-authenticate"}
                    {strategy === "never" && "Always decline"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy Section (Mutes) */}
        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
            <VolumeX size={16} /> Privacy
          </h2>
          <div className="bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-3xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold">Muted Users</div>
                <div className="text-sm text-gray-500">{mutedPubkeys.size} users currently muted</div>
              </div>
              <button
                onClick={() => setIsMuteListModalOpen(true)}
                className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white rounded-full text-xs font-bold transition-all"
              >
                Manage List
              </button>
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
        <div className="text-center text-gray-500 text-xs mt-20">
          Tell it! v0.7.8<br/>
          Built with NDK & Next.js
        </div>
      </div>

      {/* Mute List Modal */}
      {isMuteListModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-950 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 h-[70vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <VolumeX size={20} className="text-red-500" />
                <h3 className="font-black text-xl">Muted Users</h3>
              </div>
              <button 
                onClick={() => setIsMuteListModalOpen(false)} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <MuteList 
                pubkeys={Array.from(mutedPubkeys)} 
                loading={loadingLists}
              />
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
              <p className="text-[10px] text-gray-500 text-center italic">
                Changes to your mute list are published to your Nostr relays (Kind 10000).
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
