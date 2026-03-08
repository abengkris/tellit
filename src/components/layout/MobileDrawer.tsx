"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { X, User, Bookmark, Activity, LogOut, Settings, MessageSquare, PenTool, Wallet } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { useRelayStatus } from "@/hooks/useRelayStatus";
import { useUIStore } from "@/store/ui";
import { useWalletStore } from "@/store/wallet";
import { Avatar } from "../common/Avatar";
import { shortenPubkey } from "@/lib/utils/nip19";
import { useFollowingList } from "@/hooks/useFollowingList";
import { useFollowerCount } from "@/hooks/useFollowers";
import { useProfile } from "@/hooks/useProfile";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRelays: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose, onOpenRelays }) => {
  const { user, logout } = useAuthStore();
  const { sessions } = useNDK();
  const { unreadMessagesCount } = useUIStore();
  const { connectedCount, totalCount } = useRelayStatus();
  const { profile, loading: profileLoading } = useProfile(user?.pubkey);
  const { count: followingCount } = useFollowingList(user?.pubkey);
  const { count: followerCount } = useFollowerCount(user?.pubkey);
  const { balance, nwcPairingCode } = useWalletStore();

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] sm:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Drawer Content */}
      <div className="absolute top-0 left-0 bottom-0 w-[280px] bg-white dark:bg-black shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between">
          <span className="font-black text-xl text-blue-500">Account Info</span>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* User Profile Summary */}
          <div className="p-5">
            <div className="flex justify-between items-start mb-4">
              <Link href={`/${user?.npub}`} onClick={onClose} className="block">
                <Avatar 
                  pubkey={user?.pubkey || ""} 
                  src={profile?.picture || (profile as { image?: string })?.image} 
                  size={64} 
                  className="border-2 border-white dark:border-black shadow-sm"
                />
              </Link>
              
              {nwcPairingCode && (
                <Link 
                  href="/settings" 
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-500 rounded-full text-xs font-black border border-yellow-100 dark:border-yellow-900/30 transition-all active:scale-95"
                >
                  <Wallet size={14} fill={balance !== null ? "currentColor" : "none"} />
                  <span>{balance !== null ? `${balance.toLocaleString()}` : "Wallet"}</span>
                </Link>
              )}
            </div>

            <div className="mb-4 min-w-0">
              {profileLoading && !profile ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                </div>
              ) : (
                <>
                  <h2 className="font-black text-xl truncate text-gray-900 dark:text-white">
                    {profile?.displayName || profile?.name || "Nostrich"}
                  </h2>
                  <p className="text-gray-500 text-sm font-mono truncate">
                    @{shortenPubkey(user?.pubkey || "")}
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm mb-6">
              <Link href={`/${user?.npub}/following`} onClick={onClose} className="hover:underline">
                <span className="font-black text-gray-900 dark:text-white">{followingCount}</span>
                <span className="text-gray-500 ml-1">Following</span>
              </Link>
              <Link href={`/${user?.npub}/followers`} onClick={onClose} className="hover:underline">
                <span className="font-black text-gray-900 dark:text-white">{followerCount}</span>
                <span className="text-gray-500 ml-1">Followers</span>
              </Link>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-2 space-y-1">
            <DrawerItem 
              href={`/${user?.npub}`} 
              icon={<User size={22} />} 
              label="Profile" 
              onClick={onClose} 
            />
            <DrawerItem 
              href="/bookmarks" 
              icon={<Bookmark size={22} />} 
              label="Bookmarks" 
              onClick={onClose} 
            />
            <DrawerItem 
              href="/messages" 
              icon={<MessageSquare size={22} />} 
              label="Direct Messages" 
              badge={unreadMessagesCount}
              onClick={onClose} 
            />
            <DrawerItem 
              href="/article/new" 
              icon={<PenTool size={22} />} 
              label="Write Article" 
              onClick={onClose} 
            />
            <DrawerItem 
              href="/settings" 
              icon={<Settings size={22} />} 
              label="Settings" 
              onClick={onClose} 
            />
            <button
              onClick={() => { onClose(); onOpenRelays(); }}
              className="w-full flex items-center space-x-4 p-4 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors text-left"
            >
              <Activity size={22} className="text-gray-500" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base text-gray-900 dark:text-white">Relay Status</p>
                <p className="text-xs text-gray-500">{connectedCount}/{totalCount} connected</p>
              </div>
            </button>
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-900">
          <button
            onClick={() => { onClose(); logout(sessions); }}
            className="w-full flex items-center space-x-4 p-4 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors font-bold"
          >
            <LogOut size={22} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const DrawerItem = ({ href, icon, label, onClick, badge }: { href: string; icon: React.ReactNode; label: string; onClick: () => void; badge?: number }) => (
  <Link
    href={href}
    onClick={onClick}
    className="flex items-center space-x-4 p-4 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors font-bold text-base relative text-gray-900 dark:text-white"
  >
    <div className="relative">
      {icon}
      {badge !== undefined && badge > 0 && (
        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-white dark:border-black">
          {badge > 9 ? "9+" : badge}
        </div>
      )}
    </div>
    <span>{label}</span>
  </Link>
);
