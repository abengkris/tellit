"use client";

import React from "react";
import { NDKProvider } from "@/providers/NDKProvider";
import { ToastContainer } from "@/components/ui/Toast";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuthStore } from "@/store/auth";
import { Loader2 } from "lucide-react";

export function ClientShell({ children }: { children: React.ReactNode }) {
  const { _hasHydrated, isLoading: isAuthLoading } = useAuthStore();

  return (
    <NDKProvider>
      <MainLayout>
        {!_hasHydrated || isAuthLoading ? (
          <div className="min-h-[60vh] flex items-center justify-center bg-white dark:bg-black">
            <Loader2 className="animate-spin text-blue-500" size={48} />
          </div>
        ) : (
          children
        )}
      </MainLayout>
      <ToastContainer />
    </NDKProvider>
  );
}
