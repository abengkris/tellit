"use client";

import React from "react";
import Link from "next/link";
import { User, Bookmark, Activity, LogOut, Settings, MessageSquare, PenTool, Wallet } from "lucide-react";
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
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRelays: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose, onOpenRelays }) => {
  const { user, logout } = useAuthStore();
  const { sessions } = useNDK();
  const { unreadMessagesCount, hideBalance } = useUIStore();
  const { connectedCount, totalCount } = useRelayStatus();
  const { profile, loading: profileLoading } = useProfile(user?.pubkey);
  const { count: followingCount } = useFollowingList(user?.pubkey);
  const { count: followerCount } = useFollowerCount(user?.pubkey);
  const { balance, nwcPairingCode } = useWalletStore();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col gap-0 border-r-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-xl font-black text-primary text-left">Account Info</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-0">
            {/* User Profile Summary */}
            <div className="p-5 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <Link href={`/${user?.npub}`} onClick={onClose} className="block">
                  <Avatar 
                    pubkey={user?.pubkey || ""} 
                    src={profile?.picture || (profile as { image?: string })?.image} 
                    size={64} 
                    className="border-2 border-background shadow-sm rounded-full"
                  />
                </Link>
                
                {nwcPairingCode && (
                  <Button
                    variant="secondary"
                    size="sm"
                    asChild
                    className="h-8 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20"
                  >
                    <Link href="/wallet" onClick={onClose}>
                      <Wallet className="size-3.5" fill={balance !== null ? "currentColor" : "none"} />
                      <span className="font-black text-xs">
                        {hideBalance ? "****" : (balance !== null ? `${balance.toLocaleString()}` : "Wallet")}
                      </span>
                    </Link>
                  </Button>
                )}
              </div>

              <div className="min-w-0">
                {profileLoading && !profile ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                ) : (
                  <>
                    <h2 className="font-black text-xl truncate">
                      {profile?.display_name || profile?.name || "Nostrich"}
                    </h2>
                    <p className="text-muted-foreground text-sm font-mono truncate">
                      @{shortenPubkey(user?.pubkey || "")}
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm">
                <Link href={`/${user?.npub}/following`} onClick={onClose} className="hover:underline">
                  <span className="font-black text-foreground">{followingCount}</span>
                  <span className="text-muted-foreground ml-1">Following</span>
                </Link>
                <Link href={`/${user?.npub}/followers`} onClick={onClose} className="hover:underline">
                  <span className="font-black text-foreground">{followerCount}</span>
                  <span className="text-muted-foreground ml-1">Followers</span>
                </Link>
              </div>
            </div>

            <Separator className="my-2" />

            {/* Navigation Links */}
            <nav className="flex flex-col px-2">
              <DrawerItem 
                href={`/${user?.npub}`} 
                icon={<User className="size-5" />} 
                label="Profile" 
                onClick={onClose} 
              />
              <DrawerItem 
                href="/bookmarks" 
                icon={<Bookmark className="size-5" />} 
                label="Bookmarks" 
                onClick={onClose} 
              />
              <DrawerItem 
                href="/wallet" 
                icon={<Wallet className="size-5" />} 
                label="Wallet" 
                onClick={onClose} 
              />
              <DrawerItem 
                href="/messages" 
                icon={<MessageSquare className="size-5" />} 
                label="Direct Messages" 
                badge={unreadMessagesCount}
                onClick={onClose} 
              />
              <DrawerItem 
                href="/article/new" 
                icon={<PenTool className="size-5" />} 
                label="Write Article" 
                onClick={onClose} 
              />
              <DrawerItem 
                href="/settings" 
                icon={<Settings className="size-5" />} 
                label="Settings" 
                onClick={onClose} 
              />
              
              <Button
                variant="ghost"
                onClick={() => { onClose(); onOpenRelays(); }}
                className="w-full justify-start gap-4 h-auto p-4 rounded-xl text-foreground font-bold"
              >
                <Activity className="size-5 text-muted-foreground" />
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="text-base">Relay Status</span>
                  <span className="text-xs text-muted-foreground font-normal">{connectedCount}/{totalCount} connected</span>
                </div>
              </Button>
            </nav>
          </div>
        </ScrollArea>

        <div className="p-4 border-t mt-auto">
          <Button
            variant="ghost"
            onClick={() => { onClose(); logout(sessions); }}
            className="w-full justify-start gap-4 h-auto p-4 rounded-xl text-destructive hover:bg-destructive/10 font-bold"
          >
            <LogOut className="size-5" />
            <span className="text-base">Logout</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const DrawerItem = ({ href, icon, label, onClick, badge }: { href: string; icon: React.ReactNode; label: string; onClick: () => void; badge?: number }) => (
  <Button
    variant="ghost"
    asChild
    className="w-full justify-start gap-4 h-auto p-4 rounded-xl text-foreground font-bold"
  >
    <Link href={href} onClick={onClick}>
      <div className="relative flex items-center justify-center">
        {icon}
        {badge !== undefined && badge > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1.5 -right-1.5 min-w-4 h-4 p-0 flex items-center justify-center text-[10px] font-black rounded-full border-2 border-background"
          >
            {badge > 9 ? "9+" : badge}
          </Badge>
        )}
      </div>
      <span className="text-base">{label}</span>
    </Link>
  </Button>
);
