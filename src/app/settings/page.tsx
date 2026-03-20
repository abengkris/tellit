"use client";

import React, { useEffect, useState } from "react";
import { useUIStore, RelayAuthStrategy } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { useProfile } from "@/hooks/useProfile";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Bell, Shield, User, Globe, Wallet, Clock, LogOut, Key, VolumeX, BadgeCheck, RefreshCcw, Sun, Moon, Monitor, Trash, AlertTriangle } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar } from "@/components/common/Avatar";
import Link from "next/link";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useLists } from "@/hooks/useLists";
import { MuteList } from "@/components/profile/MuteList";
import { KeyBackupModal } from "@/components/settings/KeyBackupModal";
import { requestVanish } from "@/lib/actions/vanish";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ExtendedCacheAdapter {
  getUnpublishedEvents?: () => Promise<{ event: NDKEvent; relays?: string[]; lastTryAt?: number }[]>;
}

export default function SettingsPage() {
  const { isLoggedIn, user, logout, logoutAll, accounts } = useAuthStore();
  const { sessions, ndk, isReady } = useNDK();
  const { profile } = useProfile(user?.pubkey);
  const { mutedPubkeys, loading: loadingLists } = useLists();
  const { loading: settingsLoading, lastSync, saveSettings, fetchSettings } = useAppSettings();
  const { 
    browserNotificationsEnabled, 
    setBrowserNotificationsEnabled,
    wotStrictMode,
    setWotStrictMode,
    relayAuthStrategy,
    setRelayAuthStrategy,
    addToast
  } = useUIStore();

  const { theme, setTheme } = useTheme();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");
  const [unpublishedCount, setUnpublishedCount] = useState(0);
  const [isMuteListModalOpen, setIsMuteListModalOpen] = useState(false);
  const [isKeyBackupModalOpen, setIsKeyBackupModalOpen] = useState(false);
  const [isVanishDialogOpen, setIsVanishDialogOpen] = useState(false);
  const [isVanishing, setIsVanishing] = useState(false);

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

  const handleNotificationToggle = async (enabled: boolean) => {
    if (!("Notification" in window)) {
      addToast("Browser does not support notifications", "error");
      return;
    }

    if (enabled) {
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
    addToast("Logged out of current account", "info");
  };

  const handleLogoutAll = () => {
    logoutAll(sessions);
    addToast("Logged out of all accounts", "info");
  };

  const handleVanish = async () => {
    if (!ndk || !isLoggedIn) return;
    
    setIsVanishing(true);
    try {
      await requestVanish(ndk, ["ALL_RELAYS"], "Global vanish request via Tell it!");
      addToast("Vanish request sent to the network!", "success");
      setIsVanishDialogOpen(false);
      // It's recommended to logout after a vanish request
      logout(sessions);
    } catch (err) {
      console.error(err);
      addToast("Failed to send vanish request", "error");
    } finally {
      setIsVanishing(false);
    }
  };

  const hasLocalBackup = typeof window !== 'undefined' && user?.pubkey && localStorage.getItem(`tellit-backup-${user.pubkey}`);

  return (
    <>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-32 space-y-10">
        <h1 className="text-3xl font-black">Settings</h1>

        {/* Account Section */}
        {isLoggedIn && user && (
          <section className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
              <User size={14} /> Account
            </h2>
            <Card className="rounded-3xl overflow-hidden border-none bg-muted/30 shadow-none">
              <CardContent className="p-4 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Avatar pubkey={user.pubkey} src={user.profile?.image} size={60} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg truncate">{user.profile?.display_name || user.profile?.name || "Nostrich"}</div>
                    <div className="text-muted-foreground text-xs truncate font-mono">{user.npub.slice(0, 12)}...{user.npub.slice(-8)}</div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <Separator className="bg-background/50" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    <Button 
                      asChild
                      variant="outline"
                      className="rounded-2xl font-black h-12 bg-primary/10 text-primary border-none shadow-sm hover:bg-primary/20"
                    >
                      <Link href={profile?.nip05?.endsWith("@tellit.id") ? "/settings/handle" : "/settings/verify"}>
                        <BadgeCheck className="size-4" />
                        <span>{profile?.nip05?.endsWith("@tellit.id") ? "Manage Handle" : "Get Verified"}</span>
                      </Link>
                    </Button>

                    <Button 
                      asChild
                      variant="outline"
                      className="rounded-2xl font-black h-12 bg-background border-none shadow-sm"
                    >
                      <Link href="/settings/profile">
                        <User className="size-4 text-primary" />
                        <span>Edit Profile</span>
                      </Link>
                    </Button>

                    <Button 
                      asChild
                      variant="outline"
                      className="rounded-2xl font-black h-12 bg-background border-none shadow-sm relative group"
                    >
                      <Link href="/settings/unpublished">
                        <Clock className="size-4 text-primary" />
                        <span>Local Outbox</span>
                        {unpublishedCount > 0 && (
                          <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 rounded-full border-2 border-background animate-in zoom-in duration-300">
                            {unpublishedCount}
                          </Badge>
                        )}
                      </Link>
                    </Button>

                    <Button 
                      asChild
                      variant="outline"
                      className="rounded-2xl font-black h-12 bg-background border-none shadow-sm"
                    >
                      <Link href="/settings/relays">
                        <Globe className="size-4 text-primary" />
                        <span>Manage Relays</span>
                      </Link>
                    </Button>
                    
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="rounded-2xl font-black h-12 text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="size-4" />
                      Logout Current
                    </Button>

                    {accounts.length > 1 && (
                      <Button
                        variant="ghost"
                        onClick={handleLogoutAll}
                        className="rounded-2xl font-black h-12 text-destructive hover:bg-destructive/10 sm:col-span-2"
                      >
                        <LogOut className="size-4" />
                        Logout of All Accounts ({accounts.length})
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Security Section */}
        {isLoggedIn && user && (
          <section className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
              <Shield size={14} /> Security
            </h2>
            <Card className="rounded-3xl border-none bg-muted/30 shadow-none">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-3 bg-primary/10 text-primary rounded-2xl shrink-0">
                    <Key size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-black truncate">Local Key Backup</div>
                    <div className="text-xs text-muted-foreground font-medium truncate flex items-center gap-2">
                      {hasLocalBackup ? (
                        <>
                          <Badge variant="outline" className="h-4 px-1 bg-green-500/10 text-green-600 border-green-500/20 text-[8px] font-black uppercase">Active</Badge>
                          <span>Key encrypted in this browser</span>
                        </>
                      ) : (
                        <span>Save encrypted key for easier login</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsKeyBackupModalOpen(true)}
                  className="rounded-full font-black bg-background border-none shadow-sm"
                >
                  {hasLocalBackup ? "Manage" : "Setup"}
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Wallet Section (NWC) */}
        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
            <Wallet size={14} /> Wallet & Zaps
          </h2>
          <Card className="rounded-3xl border-none bg-muted/30 shadow-none">
            <CardHeader className="pb-2">
              <CardDescription className="text-sm font-medium">
                Manage your Nostr Wallet Connect (NWC) settings, view your balance, and set default zap amounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Button 
                asChild
                className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-2xl shadow-lg shadow-primary/20"
              >
                <Link href="/wallet">
                  <Wallet className="size-5" />
                  Open Wallet Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Relay Authentication Section */}
        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
            <Key size={14} /> Relay Authentication
          </h2>
          <Card className="rounded-3xl border-none bg-muted/30 shadow-none">
            <CardHeader className="pb-4">
              <CardDescription className="text-sm font-medium">
                Control how the app responds when a relay requests authentication (NIP-42).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(["ask", "always", "never"] as RelayAuthStrategy[]).map((strategy) => (
                <Button
                  key={strategy}
                  variant={relayAuthStrategy === strategy ? "default" : "outline"}
                  onClick={() => {
                    setRelayAuthStrategy(strategy);
                    addToast(`Relay authentication set to: ${strategy}`, "success");
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center h-auto py-4 rounded-2xl border-none shadow-sm gap-1",
                    relayAuthStrategy === strategy ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"
                  )}
                >
                  <span className="font-black capitalize">{strategy}</span>
                  <span className={cn(
                    "text-[10px] leading-tight font-medium",
                    relayAuthStrategy === strategy ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {strategy === "ask" && "Confirm each"}
                    {strategy === "always" && "Automatic"}
                    {strategy === "never" && "Always decline"}
                  </span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Cloud Sync Section (NIP-78) */}
        {isLoggedIn && (
          <section className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
              <RefreshCcw size={14} /> Cloud Sync
            </h2>
            <Card className="rounded-3xl border-none bg-muted/30 shadow-none">
              <CardHeader className="pb-4">
                <CardDescription className="text-sm font-medium">
                  Sync your app preferences (theme, filters, zap settings) to the Nostr network so they follow you across devices.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fetchSettings()}
                    disabled={settingsLoading}
                    className="h-12 rounded-2xl font-black bg-background border-none shadow-sm gap-2"
                  >
                    <RefreshCcw size={16} className={cn(settingsLoading && "animate-spin")} />
                    Pull from Cloud
                  </Button>
                  <Button
                    onClick={() => saveSettings()}
                    disabled={settingsLoading}
                    className="h-12 rounded-2xl font-black bg-primary text-primary-foreground shadow-lg shadow-primary/20 gap-2"
                  >
                    <Globe size={16} />
                    Sync to Relays
                  </Button>
                </div>
                {lastSync > 0 && (
                  <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-tight">
                    Last synced: {new Date(lastSync).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Privacy Section (Mutes) */}
        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
            <VolumeX size={14} /> Privacy
          </h2>
          <div className="flex flex-col gap-2">
            <Card className="rounded-3xl border-none bg-muted/30 shadow-none">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-black">Muted Users</div>
                  <div className="text-xs text-muted-foreground font-medium">{mutedPubkeys.size} users currently muted</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMuteListModalOpen(true)}
                  className="rounded-full font-black bg-background border-none shadow-sm"
                >
                  Manage List
                </Button>
              </CardContent>
            </Card>

            {/* NIP-62 Vanish */}
            {isLoggedIn && (
              <Card className="rounded-3xl border-none bg-destructive/5 hover:bg-destructive/10 transition-colors shadow-none border border-destructive/10">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-3 bg-destructive/10 text-destructive rounded-2xl shrink-0">
                      <Trash size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-destructive">Vanish from Network</div>
                      <div className="text-xs text-destructive/70 font-medium truncate">Request all relays to delete your data (NIP-62)</div>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsVanishDialogOpen(true)}
                    className="rounded-full font-black shadow-lg shadow-destructive/20"
                  >
                    Vanish
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <Dialog open={isVanishDialogOpen} onOpenChange={setIsVanishDialogOpen}>
          <DialogContent className="sm:max-w-md p-6 rounded-[2rem] border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-destructive flex items-center gap-2">
                <AlertTriangle className="size-6" />
                DANGER ZONE
              </DialogTitle>
              <CardDescription className="text-base font-medium pt-2">
                This will send a **Request to Vanish** (NIP-62) to all relays.
              </CardDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="p-4 bg-destructive/5 rounded-2xl border border-destructive/10 text-sm font-medium leading-relaxed text-destructive/80">
                <p>By proceeding, you request that relays delete **ALL** your events, including posts, profile metadata, and follows. This action is **permanent** and cannot be undone.</p>
                <p className="mt-2 text-xs italic">Note: While NIP-62 is a standard, full deletion depends on relay implementation.</p>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleVanish}
                  disabled={isVanishing}
                  className="h-14 rounded-2xl font-black text-lg gap-2"
                >
                  {isVanishing ? <RefreshCcw className="animate-spin size-5" /> : <Trash className="size-5" />}
                  Confirm Global Vanish
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsVanishDialogOpen(false)}
                  className="h-12 rounded-2xl font-black"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preferences Section */}
        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
            <Globe size={14} /> Preferences
          </h2>
          
          <div className="flex flex-col gap-2">
            {/* App Theme */}
            <Card className="rounded-3xl border-none bg-muted/30 shadow-none overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-500 rounded-2xl shrink-0">
                    <Sun size={20} className="dark:hidden" />
                    <Moon size={20} className="hidden dark:block" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-black">App Theme</div>
                    <div className="text-xs text-muted-foreground font-medium">Choose how Tell it! looks on your device</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2">
                {[
                  { value: "light", icon: Sun, label: "Light" },
                  { value: "dark", icon: Moon, label: "Dark" },
                  { value: "system", icon: Monitor, label: "System" }
                ].map((item) => (
                  <Button
                    key={item.value}
                    variant={theme === item.value ? "default" : "outline"}
                    onClick={() => setTheme(item.value)}
                    className={cn(
                      "flex flex-col items-center justify-center h-auto py-3 rounded-2xl border-none shadow-sm gap-1.5 transition-all",
                      theme === item.value ? "bg-primary text-primary-foreground scale-[1.02]" : "bg-background hover:bg-accent"
                    )}
                  >
                    <item.icon size={16} />
                    <span className="font-black text-[10px] uppercase tracking-wider">{item.label}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Browser Notifications */}
            <Card className={cn(
              "rounded-3xl border-none bg-muted/30 shadow-none",
              browserNotificationsEnabled && permissionStatus === "denied" && "ring-1 ring-destructive/50"
            )}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-3 bg-primary/10 text-primary rounded-2xl shrink-0">
                    <Bell size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-black truncate">Notifications</div>
                    <div className="text-xs text-muted-foreground font-medium truncate">Alerts for new messages and mentions</div>
                  </div>
                </div>
                <Switch
                  checked={browserNotificationsEnabled}
                  onCheckedChange={handleNotificationToggle}
                />
              </CardContent>
              {browserNotificationsEnabled && permissionStatus === "denied" && (
                <div className="px-4 pb-4 text-[10px] text-destructive font-black uppercase tracking-tight text-center">
                  ⚠️ Blocked by browser settings. Please enable them.
                </div>
              )}
            </Card>

            {/* WoT Strict Mode */}
            <Card className="rounded-3xl border-none bg-muted/30 shadow-none">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl shrink-0">
                    <Shield size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-black truncate">Web of Trust</div>
                    <div className="text-xs text-muted-foreground font-medium truncate">Only show content from reputable users</div>
                  </div>
                </div>
                <Switch
                  checked={wotStrictMode}
                  onCheckedChange={(checked) => setWotStrictMode(checked)}
                />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer info */}
        <div className="text-center text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-20 opacity-50">
          Tell it! v0.7.8 · Built with NDK & Next.js
        </div>
      </div>

      {/* Mute List Modal */}
      <Dialog open={isMuteListModalOpen} onOpenChange={setIsMuteListModalOpen}>
        <DialogContent className="p-0 gap-0 sm:max-w-md h-[70vh] flex flex-col overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-destructive font-black">
              <VolumeX className="size-5" />
              Muted Users
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <MuteList 
              pubkeys={Array.from(mutedPubkeys)} 
              loading={loadingLists}
            />
          </ScrollArea>
          
          <div className="p-4 border-t bg-muted/30">
            <p className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-tight italic">
              Changes are published to your relays (Kind 10000)
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <KeyBackupModal 
        isOpen={isKeyBackupModalOpen} 
        onClose={() => setIsKeyBackupModalOpen(false)} 
      />
    </>
  );
}
