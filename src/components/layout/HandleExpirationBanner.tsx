"use client";

import React, { useState } from "react";
import { HandleStatus, PendingHandle, useHandleStatus } from "@/hooks/useHandleStatus";
import { AlertCircle, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
export const HandleExpirationBanner = () => {
  const { expiringSoonHandles, pendingHandles } = useHandleStatus();
  const [isVisible, setIsOpen] = useState(true);
  const router = useRouter();

  // If nothing to show or user closed it
  if (!isVisible || (expiringSoonHandles.length === 0 && pendingHandles.length === 0)) return null;

  // Prioritize pending handles
  const isPending = pendingHandles.length > 0;
  const handle: HandleStatus | PendingHandle = isPending ? pendingHandles[0] : expiringSoonHandles[0];
  const daysRemaining = !isPending ? (handle as HandleStatus).daysRemaining : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={cn(
          "text-white overflow-hidden relative",
          isPending 
            ? "bg-linear-to-r from-blue-600/90 to-indigo-700/90" 
            : "bg-linear-to-r from-yellow-500/90 to-orange-600/90"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex-1 flex items-center min-w-0">
              <span className="flex p-2 rounded-lg bg-white/20">
                <AlertCircle className="size-5 text-white" aria-hidden="true" />
              </span>
              <p className="ml-3 font-bold text-sm sm:text-base truncate">
                {isPending ? (
                  <>
                    <span className="md:hidden">
                      Complete @{handle.name} payment!
                    </span>
                    <span className="hidden md:inline">
                      You have a pending registration for <span className="font-black underline">@{handle.name}</span>. Pay now to secure it!
                    </span>
                  </>
                ) : (
                  <>
                    <span className="md:hidden">
                      {handle.name} expires in {daysRemaining}d!
                    </span>
                    <span className="hidden md:inline">
                      Big news! Your handle <span className="font-black underline">@{handle.name}</span> expires in {daysRemaining} days.
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white text-primary hover:bg-white/90 rounded-full font-black border-none h-9 px-4"
                onClick={() => router.push("/settings/handle")}
              >
                <Zap className="size-4 mr-1 fill-current" />
                {isPending ? "Pay Now" : "Renew Now"}
              </Button>
...

              <button
                type="button"
                className="p-2 rounded-md hover:bg-white/10 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <X className="size-5 text-white" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
