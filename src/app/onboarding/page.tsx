"use client";

import React, { useState, useEffect } from "react";
import { useOnboardingStore, OnboardingStep } from "@/store/onboarding";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { useRouter } from "next/navigation";
import { 
  Loader2
} from "lucide-react";
import { updateProfile } from "@/lib/actions/profile";
import { useUIStore } from "@/store/ui";
import { cn } from "@/lib/utils";
import { NDKEvent } from "@nostr-dev-kit/ndk";

// Step Components
import { WelcomeStep } from "./steps/WelcomeStep";
import { IdentityStep } from "./steps/IdentityStep";
import { ProfileImageStep } from "./steps/ProfileImageStep";
import { InterestsStep } from "./steps/InterestsStep";
import { RecommendationsStep } from "./steps/RecommendationsStep";
import { MutingStep } from "./steps/MutingStep";
import { SecurityStep } from "./steps/SecurityStep";
import { LNPaymentModal } from "@/components/common/LNPaymentModal";

export default function OnboardingPage() {
  const { currentStep, setStep, data, reset } = useOnboardingStore();
  const { user, isLoggedIn, privateKey } = useAuthStore();
  const { ndk, isReady } = useNDK();
  const { addToast } = useUIStore();
  const router = useRouter();
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [invoice, setInvoice] = useState<{ pr: string, hash: string, amount: number } | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, router]);

  const handleFinish = async () => {
    if (!ndk || !isReady) return;

    setIsFinalizing(true);
    try {
      // 1. Update Profile (Kind 0)
      const metadata = {
        name: data.name,
        display_name: data.display_name,
        picture: data.picture,
        about: data.interests.length > 0 ? `Interested in ${data.interests.join(", ")}.` : "",
        nip05: data.name ? `${data.name}@tellit.id` : undefined,
      };
      
      await updateProfile(ndk, metadata);

      // 2. Update Follow List (Kind 3)
      if (data.followedPubkeys.length > 0) {
        const followEvent = new NDKEvent(ndk);
        followEvent.kind = 3;
        followEvent.tags = data.followedPubkeys.map(pk => ["p", pk]);
        await followEvent.publish();
      }

      // 3. Update Mute List (Kind 10000)
      if (data.mutedKeywords.length > 0) {
        const muteEvent = new NDKEvent(ndk);
        muteEvent.kind = 10000;
        muteEvent.tags = data.mutedKeywords.map(word => ["word", word]);
        await muteEvent.publish();
      }

      // 4. Register Handle if provided
      if (data.name && user?.pubkey) {
        try {
          const res = await fetch('/api/nip05/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: data.name,
              pubkey: user.pubkey,
              relays: ["wss://relay.damus.io", "wss://nos.lol"]
            })
          });
          
          const result = await res.json();
          if (result.paymentRequest) {
            setInvoice({
              pr: result.paymentRequest,
              hash: result.paymentHash,
              amount: result.amount
            });
            setShowPayment(true);
            setIsFinalizing(false);
            return; // Stay on page to show payment modal
          }
        } catch (err) {
          console.error("Handle registration failed:", err);
          addToast("Failed to initiate handle registration. You can try later in settings.", "error");
        }
      }

      completeOnboarding();
    } catch (err) {
      console.error(err);
      addToast("Failed to finalize setup.", "error");
      setIsFinalizing(false);
    }
  };

  const completeOnboarding = () => {
    addToast("Profile setup complete!", "success");
    reset();
    router.push("/");
  };

  const renderStep = () => {
    if (isFinalizing) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 py-20 animate-in fade-in duration-500">
          <Loader2 className="animate-spin text-primary size-12" />
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black">Finalizing your profile...</h2>
            <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Talking to the relays</p>
          </div>
        </div>
      );
    }

    switch (currentStep) {
      case 'welcome': return <WelcomeStep onNext={() => setStep('identity')} />;
      case 'identity': return <IdentityStep onNext={() => setStep('profile-image')} onBack={() => setStep('welcome')} />;
      case 'profile-image': return <ProfileImageStep onNext={() => setStep('interests')} onBack={() => setStep('identity')} />;
      case 'interests': return <InterestsStep onNext={() => setStep('recommendations')} onBack={() => setStep('profile-image')} />;
      case 'recommendations': return <RecommendationsStep onNext={() => setStep('muting')} onBack={() => setStep('interests')} />;
      case 'muting': return <MutingStep onNext={() => setStep('security')} onBack={() => setStep('recommendations')} />;
      case 'security': return <SecurityStep onNext={handleFinish} onBack={() => setStep('muting')} privateKey={privateKey || ''} />;
      default: return <WelcomeStep onNext={() => setStep('identity')} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Progress Bar */}
        <div className="flex gap-1 mb-8 px-4">
          {(['identity', 'profile-image', 'interests', 'recommendations', 'muting', 'security'] as OnboardingStep[]).map((s, _i) => {
            const steps = ['identity', 'profile-image', 'interests', 'recommendations', 'muting', 'security'];
            const currentIndex = steps.indexOf(currentStep);
            const stepIndex = steps.indexOf(s);
            
            return (
              <div 
                key={s} 
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-500",
                  stepIndex <= currentIndex ? "bg-primary" : "bg-muted"
                )} 
              />
            );
          })}
        </div>

        {renderStep()}
      </div>

      {invoice && (
        <LNPaymentModal 
          isOpen={showPayment}
          onClose={() => {
            setShowPayment(false);
            completeOnboarding();
          }}
          paymentRequest={invoice.pr}
          paymentHash={invoice.hash}
          amount={invoice.amount}
          onPaid={() => {
            setShowPayment(false);
            addToast("Handle registered and paid!", "success");
            completeOnboarding();
          }}
        />
      )}
    </div>
  );
}
