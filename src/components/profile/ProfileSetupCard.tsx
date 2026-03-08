"use client";

import React, { useMemo, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { CheckCircle2, Circle, ArrowRight, X, Sparkles } from "lucide-react";
import Link from "next/link";

export const ProfileSetupCard = ({ pubkey, npub }: { pubkey: string; npub: string }) => {
  const { profile, loading } = useProfile(pubkey);
  const [isVisible, setIsVisible] = useState(true);

  const steps = useMemo(() => {
    if (!profile) return [];
    return [
      { id: "name", label: "Display Name", completed: !!(profile.display_name || profile.name) },
      { id: "picture", label: "Profile Picture", completed: !!profile.picture },
      { id: "banner", label: "Profile Banner", completed: !!profile.banner },
      { id: "about", label: "Short Bio", completed: !!profile.about },
      { id: "website", label: "Website", completed: !!profile.website },
      { id: "nip05", label: "NIP-05 Verification", completed: !!profile.nip05 },
    ];
  }, [profile]);

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  if (loading || progressPercent === 100 || !isVisible) return null;

  return (
    <div className="m-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/10 dark:to-indigo-950/10 border border-blue-100 dark:border-blue-900/30 rounded-3xl relative overflow-hidden group shadow-sm">
      {/* Decorative background element */}
      <div className="absolute -right-4 -top-4 text-blue-500/10 dark:text-blue-400/5 group-hover:scale-110 transition-transform duration-700">
        <Sparkles size={120} />
      </div>

      <button 
        onClick={() => setIsVisible(false)}
        className="absolute top-4 right-4 text-blue-400 hover:text-blue-600 dark:text-blue-800 dark:hover:text-blue-600 transition-colors"
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-blue-900 dark:text-blue-100 text-base">Complete your profile</h3>
            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Verified accounts get more engagement</p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xl font-black text-blue-600 dark:text-blue-400">{progressPercent}%</span>
          </div>
        </div>

        <div className="w-full h-2 bg-blue-200/50 dark:bg-blue-900/30 rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-5">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-2 text-xs">
              {step.completed ? (
                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
              ) : (
                <Circle size={14} className="text-blue-300 dark:text-blue-800 shrink-0" />
              )}
              <span className={`truncate ${step.completed ? "text-gray-400 line-through decoration-gray-300 dark:decoration-gray-700" : "text-gray-700 dark:text-gray-300 font-bold"}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <Link
          href={`/${npub}`}
          className="flex items-center justify-center gap-2 w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
        >
          Setup My Profile
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
};

