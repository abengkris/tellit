"use client";

import React, { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useUIStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import { Bell, Shield, User, Globe, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";

export default function SettingsPage() {
  const { isLoggedIn, user } = useAuthStore();
  const { 
    browserNotificationsEnabled, 
    setBrowserNotificationsEnabled,
    wotStrictMode,
    setWotStrictMode,
    addToast
  } = useUIStore();

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionStatus(Notification.permission);
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

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
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
          Tell it! v0.6.2<br/>
          Built with NDK & Next.js
        </div>
      </div>
    </MainLayout>
  );
}
