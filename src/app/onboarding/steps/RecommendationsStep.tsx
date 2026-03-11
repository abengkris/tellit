import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight, ChevronLeft, Plus, Check, Loader2 } from "lucide-react";
import { useOnboardingStore } from "@/store/onboarding";
import { useNDK } from "@/hooks/useNDK";
import { Avatar } from "@/components/common/Avatar";
import { useProfile } from "@/hooks/useProfile";
import { decodeNip19 } from "@/lib/utils/nip19";
import { cn } from "@/lib/utils";

const RECOMMENDER_NPUB = "npub1q7g8dyxw8lkrp7eq38445cwpga2gcfzt4ptqtecn67v3e48qzhmqwgk6wr";

export function RecommendationsStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { data, updateData } = useOnboardingStore();
  const { ndk, isReady } = useNDK();
  const [recommendedUsers, setRecommendedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!ndk || !isReady) return;

    const fetchRecommendations = async () => {
      try {
        const { id: hex } = decodeNip19(RECOMMENDER_NPUB);
        const user = ndk.getUser({ pubkey: hex });
        const follows = await user.follows();
        const pks = Array.from(follows).map(u => u.pubkey).slice(0, 10); // Limit for onboarding
        setRecommendedUsers(pks);
        
        // Auto-select all recommendations initially
        updateData({ followedPubkeys: pks });
      } catch (err) {
        console.error("Failed to fetch recommendations", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [ndk, isReady, updateData]);

  const toggleFollow = (pk: string) => {
    const current = data.followedPubkeys;
    if (current.includes(pk)) {
      updateData({ followedPubkeys: current.filter(p => p !== pk) });
    } else {
      updateData({ followedPubkeys: [...current, pk] });
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center justify-center size-16 bg-primary/10 text-primary rounded-2xl mb-2">
          <Users size={32} />
        </div>
        <h2 className="text-3xl font-black tracking-tight">Tell it! is better with friends</h2>
        <p className="text-muted-foreground font-medium">Follow these interesting people to get started.</p>
      </div>

      <div className="max-w-md mx-auto space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="animate-spin text-primary size-8" />
            <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest">Finding interesting people...</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {recommendedUsers.map((pk) => (
              <UserRow 
                key={pk} 
                pubkey={pk} 
                isFollowing={data.followedPubkeys.includes(pk)} 
                onToggle={() => toggleFollow(pk)} 
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-8">
        <Button variant="ghost" onClick={onBack} className="rounded-xl h-12 font-bold gap-2 text-muted-foreground">
          <ChevronLeft size={20} />
          Back
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onNext} className="rounded-xl h-12 font-bold px-6">
            Skip
          </Button>
          <Button 
            onClick={onNext} 
            className="rounded-2xl h-12 px-8 font-black gap-2 shadow-lg shadow-primary/20"
          >
            Continue ({data.followedPubkeys.length})
            <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function UserRow({ pubkey, isFollowing, onToggle }: { pubkey: string; isFollowing: boolean; onToggle: () => void }) {
  const { profile } = useProfile(pubkey);
  
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-2xl border transition-all",
      isFollowing ? "border-primary bg-primary/5" : "border-muted hover:bg-muted/30"
    )}>
      <div className="flex items-center gap-3">
        <Avatar pubkey={pubkey} src={profile?.picture} size={44} className="rounded-xl" />
        <div className="min-w-0">
          <p className="font-black text-sm truncate">{profile?.display_name || profile?.name || "Anonymous"}</p>
          <p className="text-[10px] text-muted-foreground font-bold truncate">@{profile?.name || "nostr"}</p>
        </div>
      </div>
      <Button 
        size="sm" 
        variant={isFollowing ? "default" : "outline"} 
        onClick={onToggle}
        className={cn("rounded-xl h-9 px-4 font-black transition-all", isFollowing ? "" : "border-2")}
      >
        {isFollowing ? <Check size={16} className="mr-1.5" /> : <Plus size={16} className="mr-1.5" />}
        {isFollowing ? "Followed" : "Follow"}
      </Button>
    </div>
  );
}
