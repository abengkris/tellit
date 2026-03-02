"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { RightPanel } from "./RightPanel";
import { Plus, Bell, Search, Home, PenTool, LucideIcon } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { MobileDrawer } from "./MobileDrawer";
import { RelayModal } from "@/components/common/RelayModal";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoggedIn } = useAuthStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRelayModalOpen, setIsRelayModalOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Mobile Header */}
      <div className="sm:hidden sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 py-3">
        {isLoggedIn ? (
          <button onClick={() => setIsDrawerOpen(true)} className="outline-none">
            <Image
              src={user?.profile?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.pubkey}`}
              alt="Profile"
              width={32}
              height={32}
              className="w-8 h-8 rounded-full bg-gray-200 object-cover border border-gray-100 dark:border-gray-900"
              unoptimized={true}
            />
          </button>
        ) : (
          <div className="w-8" />
        )}
        
        <Link href="/" className="font-black text-xl text-blue-500 tracking-tighter">Sapa</Link>
        
        <Link href="/notifications" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors">
          <Bell size={22} />
        </Link>
      </div>

      <div className="max-w-7xl mx-auto flex h-full">
        {/* Sidebar (Desktop) */}
        <nav className="hidden sm:relative sm:flex sm:flex-col sm:w-20 lg:w-64 sm:border-r border-gray-200 dark:border-gray-800">
          <Sidebar />
        </nav>

        {/* Main Feed */}
        <main className="flex-1 min-h-screen border-r border-gray-200 dark:border-gray-800 pb-20 sm:pb-0">
          {children}
        </main>

        {/* Right Sidebar (Desktop only) */}
        <aside className="hidden lg:block w-80 xl:w-96 p-4">
          <RightPanel />
        </aside>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 border-t bg-white/80 dark:bg-black/80 backdrop-blur-md border-gray-200 dark:border-gray-800 flex items-center justify-around h-16 px-2">
        <MobileNavItem href="/" icon={Home} active={pathname === "/"} />
        <MobileNavItem href="/search" icon={Search} active={pathname === "/search"} />
        <MobileNavItem href="/article/new" icon={PenTool} active={pathname === "/article/new"} />
        <MobileNavItem href="/notifications" icon={Bell} active={pathname === "/notifications"} />
      </nav>

      {/* Mobile Drawer */}
      <MobileDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onOpenRelays={() => setIsRelayModalOpen(true)}
      />

      {/* Relay Modal (shared) */}
      <RelayModal 
        isOpen={isRelayModalOpen} 
        onClose={() => setIsRelayModalOpen(false)} 
      />

      {/* Mobile FAB */}
      {isLoggedIn && pathname === "/" && (
        <button 
          aria-label="Create new post"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="sm:hidden fixed bottom-20 right-4 z-40 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/50"
        >
          <Plus size={30} />
        </button>
      )}
    </div>
  );
};

const MobileNavItem = ({ href, icon: Icon, active }: { href: string; icon: LucideIcon; active: boolean }) => (
  <Link 
    href={href} 
    className={`p-3 rounded-full transition-all active:scale-90 ${active ? 'text-blue-500' : 'text-gray-500'}`}
  >
    <Icon 
      size={24} 
      strokeWidth={active ? 3 : 2} 
    />
  </Link>
);
