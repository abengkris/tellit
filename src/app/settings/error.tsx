"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Settings Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center animate-in fade-in duration-500">
      <div className="bg-destructive/10 p-4 rounded-2xl mb-6 border border-destructive/20">
        <AlertCircle size={40} className="text-destructive" />
      </div>
      <h2 className="text-xl font-black mb-2 tracking-tighter">Settings Error</h2>
      <p className="text-muted-foreground mb-6 max-w-sm text-sm">
        Failed to load settings. Please try again.
      </p>
      <Button
        onClick={() => reset()}
        size="sm"
        className="rounded-full font-black px-8 h-11 gap-2 shadow-lg shadow-primary/20"
      >
        <RotateCcw size={16} />
        <span>Try again</span>
      </Button>
    </div>
  );
}
