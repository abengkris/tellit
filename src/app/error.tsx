"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // This will be caught by our remote logger initialized in ClientShell
    console.error("Route Error Boundary:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center animate-in fade-in duration-500">
      <div className="bg-destructive/10 p-6 rounded-3xl mb-8 border border-destructive/20 shadow-xl shadow-destructive/5">
        <AlertCircle size={64} className="text-destructive" />
      </div>
      
      <h2 className="text-3xl font-black mb-3 tracking-tighter">Something went wrong</h2>
      
      <p className="text-muted-foreground mb-8 max-w-md font-medium leading-relaxed">
        {error.message || "An unexpected error occurred while communicating with the Nostr network."}
      </p>

      {error.digest && (
        <div className="mb-8 p-3 bg-muted rounded-xl border border-border">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Error ID: {error.digest}
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none justify-center">
        <Button
          onClick={() => reset()}
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-8 rounded-2xl transition-all shadow-xl shadow-primary/20 gap-2 h-14"
        >
          <RotateCcw size={20} />
          <span>Try again</span>
        </Button>

        <Button
          asChild
          variant="outline"
          size="lg"
          className="font-black px-8 rounded-2xl h-14 gap-2"
        >
          <Link href="/">
            <Home size={20} />
            <span>Go Home</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
