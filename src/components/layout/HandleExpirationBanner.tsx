"use client";

import React, { useState } from "react";
import { useHandleStatus } from "@/hooks/useHandleStatus";
import { AlertCircle, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export const HandleExpirationBanner = () => {
  const { expiringSoonHandles } = useHandleStatus();
  const [isVisible, setIsOpen] = useState(true);
  const router = useRouter();

  // If no handles are expiring soon, don't show anything
  if (expiringSoonHandles.length === 0 || !isVisible) return null;

  const handle = expiringSoonHandles[0]; // Show the first one expiring

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-linear-to-r from-yellow-500/90 to-orange-600/90 text-white overflow-hidden relative"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex-1 flex items-center min-w-0">
              <span className="flex p-2 rounded-lg bg-white/20">
                <AlertCircle className="size-5 text-white" aria-hidden="true" />
              </span>
              <p className="ml-3 font-bold text-sm sm:text-base truncate">
                <span className="md:hidden">
                  {handle.name} expires in {handle.daysRemaining}d!
                </span>
                <span className="hidden md:inline">
                  Big news! Your handle <span className="font-black underline">@{handle.name}</span> expires in {handle.daysRemaining} days.
                </span>
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white text-orange-600 hover:bg-orange-50 rounded-full font-black border-none h-9 px-4"
                onClick={() => router.push("/settings/handle")}
              >
                <Zap className="size-4 mr-1 fill-current" />
                Renew Now
              </Button>
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
