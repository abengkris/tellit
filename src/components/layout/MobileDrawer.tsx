"use client";

import React from "react";
import Link from "next/link";
import { User, Bookmark, Activity, Settings, MessageSquare, PenTool, Wallet } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useRelayStatus } from "@/hooks/useRelayStatus";
import { useUIStore } from "@/store/ui";
import { useWalletStore } from "@/store/wallet";
import { Avatar } from "../common/Avatar";
import { shortenPubkey } from "@/lib/utils/nip19";
import { useFollowingList } from "@/hooks/useFollowingList";
import { useFollowerCount } from "@/hooks/useFollowers";
import { useProfile } from "@/hooks/useProfile";
import { AccountSwitcher } from "./AccountSwitcher";
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
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col gap-0 border-r-0">
        {isOpen && (
          <MobileDrawerContent onClose={onClose} onOpenRelays={onOpenRelays} />
        )}
      </SheetContent>
    </Sheet>
  );
};

const MobileDrawerContent = ({ onClose, onOpenRelays }: { onClose: () => void; onOpenRelays: () => void }) => {
  const { user, publicKey } = useAuthStore();
  const { unreadMessagesCount, hideBalance } = useUIStore();
  const { connectedCount, totalCount } = useRelayStatus();
  const { profile, loading: profileLoading, profileUrl } = useProfile(publicKey || user?.pubkey || undefined);
  const { count: followingCount } = useFollowingList(publicKey || user?.pubkey || undefined);
  const { count: followerCount } = useFollowerCount(publicKey || user?.pubkey || undefined);
  const { balance, nwcPairingCode } = useWalletStore();

  return (
    <>
        <SheetHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-xl font-black text-primary text-left">Account</SheetTitle>
          <AccountSwitcher />
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-0">
            {/* User Profile Summary */}
            <div className="p-5 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <Link href={profileUrl} onClick={onClose} className="block">
                  <Avatar 
                    pubkey={publicKey || user?.pubkey || ""} 
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
                      @{shortenPubkey(publicKey || user?.pubkey || "")}
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm">
                <Link href={`${profileUrl}/following`} onClick={onClose} className="hover:underline">
                  <span className="font-black text-foreground">{followingCount}</span>
                  <span className="text-muted-foreground ml-1">Following</span>
                </Link>
                <Link href={`${profileUrl}/followers`} onClick={onClose} className="hover:underline">
                  <span className="font-black text-foreground">{followerCount}</span>
                  <span className="text-muted-foreground ml-1">Followers</span>
                </Link>
              </div>
            </div>

            <Separator className="my-2" />

            {/* Navigation Links */}
            <nav className="flex flex-col px-2">
              <DrawerItem 
                href="/settings/profile" 
                icon={<User className="size-5" />} 
                label="Edit Profile" 
                onClick={onClose} 
              />
              <DrawerItem 
                href={profileUrl} 
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

        <div className="p-4 border-t mt-auto text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
            Whatever it is, just Tell It.
          </p>
        </div>
    </>
  );
};

const DrawerItem = ({ href, icon, label, onClick, badge }: { href: string; icon: React.ReactNode; label: string; onClick: () => void; badge?: number }) => (
  <Link 
    href={href} 
    onClick={onClick}
    prefetch={false}
    className="w-full flex items-center justify-start gap-4 p-4 rounded-xl text-foreground font-bold hover:bg-accent/50 active:scale-95 transition-all duration-200"
  >
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
);
