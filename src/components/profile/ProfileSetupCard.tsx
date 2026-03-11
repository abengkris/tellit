"use client";

import React, { useMemo, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { CheckCircle2, Circle, ArrowRight, X, Sparkles, Info } from "lucide-react";
import Link from "next/link";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardAction
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

export const ProfileSetupCard = ({ pubkey, npub }: { pubkey: string; npub: string }) => {
  const { profile, loading } = useProfile(pubkey);
  const [isVisible, setIsVisible] = useState(true);

  const steps = useMemo(() => {
    if (!profile) return [];
    return [
      { id: "name", label: "Display Name", description: "How people see you on the feed", completed: !!(profile.display_name || profile.name) },
      { id: "picture", label: "Profile Picture", description: "Help others recognize you", completed: !!profile.picture },
      { id: "banner", label: "Profile Banner", description: "Set the mood for your profile", completed: !!profile.banner },
      { id: "about", label: "Short Bio", description: "Tell others about yourself", completed: !!profile.about },
      { id: "website", label: "Website", description: "Link to your personal site or blog", completed: !!profile.website },
      { id: "nip05", label: "NIP-05 Verification", description: "Get a verified checkmark", completed: !!profile.nip05 },
    ];
  }, [profile]);

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  if (loading || progressPercent === 100 || !isVisible) return null;

  return (
    <Card className="m-4 bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-100 dark:border-blue-900/30 relative overflow-hidden group">
      {/* Decorative background element */}
      <div className="absolute -right-4 -top-4 text-blue-500/10 dark:text-blue-400/5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
        <Sparkles size={120} />
      </div>

      <CardHeader className="relative z-10">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-blue-900 dark:text-blue-100 font-black">Complete your profile</CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-400 font-medium">Verified accounts get more engagement</CardDescription>
          </div>
          <CardAction>
            <Button 
              variant="ghost" 
              size="icon-xs" 
              onClick={() => setIsVisible(false)}
              className="text-blue-400 hover:text-blue-600 dark:text-blue-800 dark:hover:text-blue-600"
            >
              <X />
            </Button>
          </CardAction>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 relative z-10">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-black text-blue-600 dark:text-blue-400">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-blue-200/50 dark:bg-blue-900/30" />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-2 text-xs">
              {step.completed ? (
                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
              ) : (
                <Circle size={14} className="text-blue-300 dark:text-blue-800 shrink-0" />
              )}
              <div className="flex items-center gap-1 min-w-0">
                <span className={`truncate ${step.completed ? "text-muted-foreground line-through" : "text-foreground font-bold"}`}>
                  {step.label}
                </span>
                {!step.completed && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-xs" className="size-3 p-0 h-auto">
                        <Info className="size-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{step.description}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button asChild className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/20 active:scale-[0.98]">
          <Link href={`/${npub}`}>
            Setup My Profile
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
