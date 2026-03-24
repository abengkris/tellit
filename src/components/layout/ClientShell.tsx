"use client";

import React, { useEffect } from "react";
import { NDKProvider } from "@/providers/NDKProvider";
import { Toaster } from "@/components/ui/sonner";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuthStore } from "@/store/auth";
import { Loader2 } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initRemoteLogger } from "@/lib/remote-logger";

export function ClientShell({ children }: { children: React.ReactNode }) {
  const { _hasHydrated, isLoading: isAuthLoading } = useAuthStore();

  useEffect(() => {
    initRemoteLogger();
  }, []);

  return (
    <NDKProvider>
      <TooltipProvider>
        <MainLayout>
          {!_hasHydrated || isAuthLoading ? (
            <div className="min-h-[60vh] flex items-center justify-center bg-white dark:bg-black">
              <Loader2 className="animate-spin text-blue-500" size={48} />
            </div>
          ) : (
            children
          )}
        </MainLayout>
        <Toaster position="bottom-right" closeButton richColors />
      </TooltipProvider>
    </NDKProvider>
  );
}
