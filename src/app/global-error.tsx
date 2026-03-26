"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Manually report to log API since ClientShell is bypassed
    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: "error",
        message: `GLOBAL CRITICAL ERROR: ${error.stack || error.message}`,
        url: typeof window !== "undefined" ? window.location.href : "unknown",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-white dark:bg-black text-black dark:text-white animate-in fade-in duration-700">
          <div className="bg-red-500/10 p-8 rounded-[2.5rem] mb-10 shadow-2xl shadow-red-500/10 border border-red-500/20">
            <AlertCircle size={80} className="text-red-500" />
          </div>
          
          <h1 className="text-4xl font-black mb-4 tracking-tighter max-w-lg">
            Tell it! has encountered a critical error
          </h1>
          
          <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-md text-lg font-medium leading-relaxed">
            A system-level error occurred that prevented the application from loading. Our team has been notified.
          </p>

          <div className="mb-10 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-2xl text-left overflow-auto max-w-2xl w-full">
            <p className="text-red-600 dark:text-red-400 font-bold mb-2">Error Details:</p>
            <pre className="text-xs font-mono text-red-500 dark:text-red-400 whitespace-pre-wrap">
              {error.message}
              {"\n\n"}
              {error.stack}
            </pre>
          </div>

          <button
            onClick={() => reset()}            className="flex items-center space-x-3 bg-blue-500 hover:bg-blue-600 text-white font-black h-16 px-10 rounded-[2rem] transition-all shadow-2xl shadow-blue-500/20 active:scale-95 group"
          >
            <RotateCcw size={24} className="group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-lg">Restart Application</span>
          </button>
          
          {error.digest && (
            <p className="mt-12 text-[10px] font-mono text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-white/5 px-4 py-2 rounded-full border border-border">
              Internal ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
