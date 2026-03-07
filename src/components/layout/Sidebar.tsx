"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, User, LogIn, LogOut, Bell, MessageSquare, Activity, Bookmark, PenTool, Settings } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { useNotifications } from "@/hooks/useNotifications";
import { useRelayStatus } from "@/hooks/useRelayStatus";
import { useUIStore } from "@/store/ui";
import { RelayModal } from "@/components/common/RelayModal";

const SidebarItem = ({ href, icon: Icon, label, badge }: { href: string; icon: React.ElementType; label: string; badge?: number }) => {
  const pathname = usePathname();
  // More robust active state check for nested routes
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex items-center space-x-4 p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors relative ${
        active ? "font-bold text-blue-500" : ""
      }`}
    >
      <div className="relative">
        <Icon size={26} className={active ? "text-blue-500" : ""} strokeWidth={active ? 3 : 2} />
        {badge !== undefined && badge > 0 && (
          <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-black">
            {badge > 9 ? "9+" : badge}
          </div>
        )}
      </div>
      <span className="hidden lg:block text-xl">{label}</span>
    </Link>
  );
};

export const Sidebar = () => {
  const { user, isLoggedIn, login, logout } = useAuthStore();
  const { ndk, sessions } = useNDK();
  const { unreadCount } = useNotifications();
  const { unreadMessagesCount } = useUIStore();
  const { connectedCount, totalCount } = useRelayStatus();
  const [isRelayModalOpen, setIsRelayModalOpen] = React.useState(false);

  return (
    <div className="flex sm:flex-col items-center sm:items-start justify-around sm:justify-between h-16 sm:h-screen w-full sm:sticky sm:top-0 p-2 sm:p-4">
      <div className="flex sm:flex-col space-y-0 sm:space-y-4 w-full">
        <div className="hidden sm:block p-3">
          <div className="text-3xl font-bold text-blue-500">Tell it!</div>
        </div>

        <SidebarItem href="/" icon={Home} label="Home" />
        <SidebarItem href="/search" icon={Search} label="Search" />
        
        {isLoggedIn && (
          <>
            <SidebarItem href="/notifications" icon={Bell} label="Notifications" badge={unreadCount} />
            <SidebarItem href="/messages" icon={MessageSquare} label="Messages" badge={unreadMessagesCount} />
            <SidebarItem href="/article/new" icon={PenTool} label="Write" />
            <SidebarItem href="/bookmarks" icon={Bookmark} label="Bookmarks" />
            <SidebarItem href="/settings" icon={Settings} label="Settings" />
            <SidebarItem href={`/${user?.npub}`} icon={User} label="Profile" />
          </>
        )}
      </div>

      <div className="flex sm:flex-col w-full sm:mt-auto gap-2">
        {/* Relay Indicator */}
        <button 
          onClick={() => setIsRelayModalOpen(true)}
          className="hidden sm:flex items-center space-x-4 p-3 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors w-full text-left outline-none"
        >
          <Activity size={26} className={connectedCount > 0 ? "text-green-500" : "text-red-500"} />
          <span className="hidden lg:block text-sm">
            {connectedCount}/{totalCount} relays
          </span>
        </button>

        {isLoggedIn ? (
          <button
            onClick={() => logout(sessions)}
            aria-label="Logout"
            className="hidden sm:flex items-center space-x-4 p-3 rounded-full hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500 transition-colors w-full"
          >
            <LogOut size={26} />
            <span className="hidden lg:block text-xl">Logout</span>
          </button>
        ) : (
          <button
            onClick={() => ndk && sessions && login(ndk, sessions)}
            aria-label="Login"
            className="flex items-center space-x-4 p-3 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/10 text-blue-500 transition-colors w-full"
          >
            <LogIn size={26} />
            <span className="hidden lg:block text-xl">Login</span>
          </button>
        )}
      </div>

      <RelayModal 
        isOpen={isRelayModalOpen} 
        onClose={() => setIsRelayModalOpen(false)} 
      />
    </div>
  );
};
