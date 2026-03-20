"use client";

import React from "react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { useProfile } from "@/hooks/useProfile";
import { Avatar } from "@/components/common/Avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, Trash2, Check, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { shortenPubkey } from "@/lib/utils/nip19";
import { cn } from "@/lib/utils";

const AccountItem = ({ 
  pubkey, 
  isActive, 
  onSelect, 
  onRemove 
}: { 
  pubkey: string; 
  isActive: boolean; 
  onSelect: (pubkey: string) => void;
  onRemove: (e: React.MouseEvent, pubkey: string) => void;
}) => {
  const { profile, loading } = useProfile(pubkey);
  const name = profile?.display_name || profile?.name || shortenPubkey(pubkey);

  return (
    <DropdownMenuItem 
      className={cn(
        "flex items-center justify-between gap-3 p-2 rounded-xl cursor-pointer transition-colors",
        isActive ? "bg-accent/50 font-bold" : "hover:bg-accent/30"
      )}
      onClick={() => onSelect(pubkey)}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Avatar pubkey={pubkey} size={24} isLoading={loading} nip05={profile?.nip05} className="shrink-0" />
        <span className="truncate text-sm">{name}</span>
      </div>
      <div className="flex items-center gap-1">
        {isActive && <Check size={14} className="text-primary" />}
        {!isActive && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => onRemove(e, pubkey)}
          >
            <Trash2 size={12} />
          </Button>
        )}
      </div>
    </DropdownMenuItem>
  );
};

export const AccountSwitcher = () => {
  const { user, accounts, switchAccount, removeAccount, logout } = useAuthStore();
  const { sessions } = useNDK();
  const router = useRouter();
  const { profile, loading } = useProfile(user?.pubkey);

  if (!user || accounts.length === 0) return null;

  const otherAccounts = accounts.filter(a => a !== user.pubkey);
  const name = profile?.display_name || profile?.name || shortenPubkey(user.pubkey);

  const handleAddAccount = () => {
    router.push("/login?add=true");
  };

  const handleRemoveAccount = (e: React.MouseEvent, pubkey: string) => {
    e.stopPropagation();
    if (sessions) {
      removeAccount(pubkey, sessions);
    }
  };

  const handleSwitchAccount = (pubkey: string) => {
    if (sessions && pubkey !== user.pubkey) {
      switchAccount(pubkey, sessions);
    }
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center justify-start gap-4 p-3 h-auto rounded-full hover:bg-accent transition-colors w-fit lg:w-full group"
        >
          <div className="relative flex items-center justify-center shrink-0 size-7">
            <Avatar pubkey={user.pubkey} size={28} isLoading={loading} nip05={profile?.nip05} />
          </div>
          <div className="hidden lg:flex flex-col items-start min-w-0 text-left">
            <span className="text-sm font-black truncate w-full">{name}</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
              Switch Account
            </span>
          </div>
          <ChevronUp className="hidden lg:block ml-auto size-4 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        side="top" 
        className="w-64 p-2 rounded-2xl shadow-2xl border-accent/50 mb-2"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Your Accounts
        </DropdownMenuLabel>
        
        <DropdownMenuGroup className="space-y-1">
          <AccountItem 
            pubkey={user.pubkey} 
            isActive={true} 
            onSelect={handleSwitchAccount}
            onRemove={handleRemoveAccount}
          />
          
          {otherAccounts.map(pubkey => (
            <AccountItem 
              key={pubkey}
              pubkey={pubkey} 
              isActive={false} 
              onSelect={handleSwitchAccount}
              onRemove={handleRemoveAccount}
            />
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-2" />
        
        <DropdownMenuItem 
          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-blue-500/10 text-blue-500 transition-colors font-bold"
          onClick={handleAddAccount}
        >
          <Plus size={18} />
          <span>Add another account</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2" />

        <DropdownMenuItem 
          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-destructive/10 text-destructive transition-colors font-bold"
          onClick={() => sessions && logout(sessions)}
        >
          <LogOut size={18} />
          <span>Logout current</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
