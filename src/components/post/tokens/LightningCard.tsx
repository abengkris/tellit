"use client";

import React from "react";
import { Zap, Copy } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function LightningCard({ invoice }: { invoice: string }) {
  const { addToast } = useUIStore();
  const short = invoice.slice(0, 20) + "…" + invoice.slice(-6);

  // Simple attempt to extract amount if possible (very basic)
  const amountMatch = invoice.match(/lnbc(\d+)([pnu]?)1/);
  let amountText = "Lightning Invoice";
  
  if (amountMatch) {
    const amount = parseInt(amountMatch[1]);
    const multiplier = amountMatch[2];
    // This is a simplified conversion
    if (multiplier === 'u') amountText = `${amount * 100} sats`;
    else if (multiplier === 'n') amountText = `${amount / 10} sats`;
    else if (multiplier === 'p') amountText = `${amount / 10000} sats`;
    else amountText = `${amount} sats`;
  }

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(invoice);
    addToast("Invoice copied!", "success");
  };

  return (
    <Card className="border-yellow-500/30 bg-yellow-500/5 dark:bg-yellow-500/10 rounded-2xl mt-3 max-w-full overflow-hidden shadow-none">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="shrink-0 size-10 bg-yellow-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/20">
          <Zap size={20} fill="currentColor" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-yellow-700 dark:text-yellow-400 font-black truncate uppercase text-xs tracking-widest">
            {amountText}
          </p>
          <p className="text-muted-foreground text-[10px] font-mono truncate break-all mt-0.5">
            {short}
          </p>
        </div>
        <Button
          size="sm"
          onClick={copy}
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-black rounded-xl shrink-0 shadow-lg shadow-yellow-500/20 gap-2 h-9 px-4"
        >
          <Copy className="size-3.5" aria-hidden="true" />
          Copy
        </Button>
      </CardContent>
    </Card>
  );
}
