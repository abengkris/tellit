"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { RightPanel } from "./RightPanel";
import { Plus, Bell, Search, Home, LucideIcon, MessageSquare } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { MobileDrawer } from "./MobileDrawer";
import { RelayModal } from "@/components/common/RelayModal";
import { useNotifications } from "@/hooks/useNotifications";
import { useUIStore } from "@/store/ui";
import { useProfile } from "@/hooks/useProfile";
import { Avatar } from "../common/Avatar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoggedIn } = useAuthStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRelayModalOpen, setIsRelayModalOpen] = useState(false);
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const { unreadMessagesCount } = useUIStore();
  const { profile } = useProfile(user?.pubkey);

  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-clip">
      {/* Mobile Header */}
      <header className="sm:hidden sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 h-14 flex-none">
        {isLoggedIn ? (
          <button 
            onClick={() => setIsDrawerOpen(true)} 
            className="outline-none relative active:scale-95 transition-transform"
          >
            <Avatar 
              pubkey={user?.pubkey || ""} 
              src={profile?.picture || (profile as { image?: string })?.image} 
              size={32} 
              className="border border-border"
            />
            {(unreadMessagesCount > 0 || unreadCount > 0) && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 size-2.5 p-0 min-w-0 rounded-full border-2 border-background" />
            )}
          </button>
        ) : (
          <div className="w-8" />
        )}
        
        <Link href="/" className="font-black text-xl text-primary tracking-tighter">Tell it!</Link>
        
        <Button asChild variant="ghost" size="icon" className="relative hover:bg-accent rounded-full">
          <Link href="/notifications">
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <Badge variant="destructive" className="absolute top-1.5 right-1.5 size-2.5 p-0 min-w-0 rounded-full border-2 border-background" />
            )}
          </Link>
        </Button>
      </header>

      <div className="flex-1 flex max-w-7xl mx-auto w-full relative overflow-visible">
        {/* Sidebar (Desktop) */}
        <nav className="hidden sm:relative sm:flex sm:flex-col sm:w-20 lg:w-64 sm:border-r border-border">
          <Sidebar />
        </nav>

        {/* Main Feed */}
        <main className="flex-1 min-w-0 min-h-screen border-r border-border pb-20 sm:pb-0">
          {children}
        </main>

        {/* Right Sidebar (Desktop only) */}
        <aside className="hidden lg:block w-80 xl:w-96 p-4">
          <RightPanel />
        </aside>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 border-t bg-background/80 backdrop-blur-md border-border flex items-center justify-around h-16 px-2">
        <MobileNavItem href="/" icon={Home} active={pathname === "/"} />
        <MobileNavItem href="/search" icon={Search} active={pathname === "/search"} />
        <MobileNavItem href="/messages" icon={MessageSquare} active={pathname === "/messages"} badge={unreadMessagesCount} />
        <MobileNavItem href="/notifications" icon={Bell} active={pathname === "/notifications"} badge={unreadCount} />
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
        <Button 
          aria-label="Create new post"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="sm:hidden fixed bottom-20 right-4 z-40 size-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/50 p-0"
        >
          <Plus className="size-8" />
        </Button>
      )}
    </div>
  );
};

const MobileNavItem = ({ href, icon: Icon, active, badge }: { href: string; icon: LucideIcon; active: boolean; badge?: number }) => (
  <Button asChild variant="ghost" className={cn(
    "p-3 rounded-full transition-all active:scale-90 relative h-auto",
    active ? 'text-primary' : 'text-muted-foreground'
  )}>
    <Link href={href}>
      <Icon 
        className="size-6"
        strokeWidth={active ? 3 : 2} 
      />
      {badge !== undefined && badge > 0 && (
        <Badge variant="destructive" className="absolute top-2 right-2 size-2.5 p-0 min-w-0 rounded-full border-2 border-background" />
      )}
    </Link>
  </Button>
);
