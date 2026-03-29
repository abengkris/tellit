"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, LogIn, Bell, MessageSquare, Activity, Bookmark, PenTool, Settings, Wallet } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { useNotifications } from "@/hooks/useNotifications";
import { useRelayStatus } from "@/hooks/useRelayStatus";
import { useUIStore } from "@/store/ui";
import { useWalletStore } from "@/store/wallet";
import { useProfile } from "@/hooks/useProfile";
import { RelayModal } from "@/components/common/RelayModal";
import { Avatar } from "@/components/common/Avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccountSwitcher } from "./AccountSwitcher";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const SidebarItem = React.memo(({ 
  href, 
  icon: Icon, 
  label, 
  badge,
  isLoading = false,
  pubkey,
  nip05
}: { 
  href: string; 
  icon?: React.ElementType; 
  label: string; 
  badge?: number;
  isLoading?: boolean;
  pubkey?: string;
  nip05?: string;
}) => {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  const handleClick = (e: React.MouseEvent) => {
    if (active && href === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link 
          href={href} 
          aria-label={label} 
          onClick={handleClick}
          prefetch={false}
          className={cn(
            "flex items-center justify-start gap-4 p-3 rounded-full transition-all active:scale-95 duration-200 relative w-fit lg:w-full",
            active ? "font-black text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          <div className="relative flex items-center justify-center shrink-0 size-7">
            {pubkey ? (
              <Avatar pubkey={pubkey} size={28} isLoading={isLoading} nip05={nip05} />
            ) : Icon ? (
              <Icon className={cn("size-7", active ? "text-primary" : "")} strokeWidth={active ? 3 : 2} />
            ) : null}
            
            {badge !== undefined && badge > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1.5 -right-1.5 min-w-4 h-4 p-0 flex items-center justify-center text-[10px] font-black rounded-full border-2 border-background"
              >
                {badge > 9 ? "9+" : badge}
              </Badge>
            )}
          </div>
          <span className={cn("hidden lg:block text-xl", active ? "font-black" : "font-medium")}>{label}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="lg:hidden">
        {label} {badge && badge > 0 ? `(${badge})` : ""}
      </TooltipContent>
    </Tooltip>
  );
});

SidebarItem.displayName = "SidebarItem";

export const Sidebar = () => {
  const { user, publicKey, isLoggedIn, login } = useAuthStore();
  const { ndk, sessions } = useNDK();
  const { profile, loading: profileLoading, profileUrl } = useProfile(publicKey || user?.pubkey || undefined);
  const { unreadCount } = useNotifications();
  const { unreadMessagesCount, hideBalance } = useUIStore();
  const { connectedCount, totalCount } = useRelayStatus();
  const { balance, nwcPairingCode } = useWalletStore();
  
  const [isRelayModalOpen, setIsRelayModalOpen] = React.useState(false);

  return (
    <div className="flex sm:flex-col items-center sm:items-start justify-around sm:justify-between h-16 sm:h-screen w-full sm:sticky sm:top-0 p-2 sm:p-4">
      <div className="flex sm:flex-col gap-2 w-full">
        <div className="hidden sm:block p-3">
          <div className="text-3xl font-black text-primary tracking-tighter">Tell it!</div>
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
            <SidebarItem 
              href={profileUrl} 
              label="Profile" 
              pubkey={publicKey || user?.pubkey} 
              isLoading={profileLoading} 
              nip05={profile?.nip05}
            />
          </>
        )}
      </div>

      <div className="flex sm:flex-col w-full sm:mt-auto gap-2">
        {/* Wallet Indicator (if connected) */}
        {isLoggedIn && nwcPairingCode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                asChild
                className="flex items-center justify-start gap-4 p-3 h-auto rounded-full hover:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 transition-colors w-fit lg:w-full overflow-hidden"
              >
                <Link href="/wallet" prefetch={false}>
                  <div className="flex items-center justify-center shrink-0 size-7">
                    <Wallet className="size-7" fill={balance !== null ? "currentColor" : "none"} />
                  </div>
                  <span className="hidden lg:block text-sm font-black truncate">
                    {hideBalance ? "**** sats" : (balance !== null ? `${balance.toLocaleString()} sats` : "Wallet")}
                  </span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="lg:hidden">
              Wallet: {balance !== null ? `${balance.toLocaleString()} sats` : "Connect"}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Relay Indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={() => setIsRelayModalOpen(true)}
              aria-label={`Relay Status: ${connectedCount} of ${totalCount} connected`}
              className="hidden sm:flex items-center justify-start gap-4 p-3 h-auto text-muted-foreground hover:bg-accent rounded-full transition-colors w-fit lg:w-full text-left"
            >
              <div className="flex items-center justify-center shrink-0 size-7">
                <Activity className={cn("size-7", connectedCount > 0 ? "text-green-500" : "text-destructive")} aria-hidden="true" />
              </div>
              <span className="hidden lg:block text-sm font-bold">
                {connectedCount}/{totalCount} relays
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="lg:hidden">
            {connectedCount}/{totalCount} Relays connected
          </TooltipContent>
        </Tooltip>

        {isLoggedIn ? (
          <AccountSwitcher />
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={() => ndk && sessions && login(ndk, sessions)}
                aria-label="Login"
                className="flex items-center justify-start gap-4 p-3 h-auto rounded-full hover:bg-primary/10 text-primary transition-colors w-fit lg:w-full"
              >
                <div className="flex items-center justify-center shrink-0 size-7">
                  <LogIn className="size-7" aria-hidden="true" />
                </div>
                <span className="hidden lg:block text-xl font-bold">Login</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="lg:hidden">
              Login
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <RelayModal 
        isOpen={isRelayModalOpen} 
        onClose={() => setIsRelayModalOpen(false)} 
      />
    </div>
  );
};
