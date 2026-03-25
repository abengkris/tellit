"use client";

/**
 * Remote Logger Client
 * Intercepts console warnings and errors and sends them to the server-side NIP-17 logger.
 */

let isInitialized = false;
const LOG_ENDPOINT = "/api/log";
const THROTTLE_MS = 5000; // Only send one log every 5 seconds to avoid spam
let lastLogTime = 0;

async function sendRemoteLog(level: "warn" | "error", args: unknown[]) {
  const now = Date.now();
  if (now - lastLogTime < THROTTLE_MS) return;
  lastLogTime = now;

  try {
    const message = args
      .map((arg) => {
        if (arg instanceof Error) return arg.stack || arg.message;
        if (typeof arg === "object") return JSON.stringify(arg);
        return String(arg);
      })
      .join(" ");

    // Don't log requests to the log endpoint itself to avoid infinite loops
    if (message.includes(LOG_ENDPOINT)) return;

    // Filter out noisy non-critical Nostr/UI warnings
    const noisySubstrings = [
      "Sync session timeout",
      "Missing Description or aria-describedby",
      "local-cache:save",
      "signature verification offloaded",
      "Failed to sync with relay",
      "Duplicate event publishing detected",
      "[NDKProvider] Connection timeout",
      "Relay not connected, waiting for connection to publish",
    ];

    if (noisySubstrings.some(str => message.includes(str))) {
      return;
    }

    fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level,
        message,
        url: typeof window !== "undefined" ? window.location.href : "unknown",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      /* Silent fail to avoid infinite loops */
    });
  } catch (_e) {
    // Silent fail
  }
}

export function initRemoteLogger() {
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;

  const originalWarn = console.warn;
  const originalError = console.error;

  console.warn = (...args: unknown[]) => {
    originalWarn(...args);
    sendRemoteLog("warn", args);
  };

  console.error = (...args: unknown[]) => {
    originalError(...args);
    sendRemoteLog("error", args);
  };

  window.addEventListener("unhandledrejection", (event) => {
    sendRemoteLog("error", ["Unhandled Promise Rejection:", event.reason]);
  });

  window.addEventListener("error", (event) => {
    sendRemoteLog("error", ["Uncaught Error:", event.error || event.message]);
  });

  console.log("[RemoteLogger] Initialized. App tracking active.");
}
