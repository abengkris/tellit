/**
 * Lightweight logger for client-side environments.
 * Proxies logs to the server-side NIP-17 logger via /api/log.
 */
export const clientLogger = {
  /**
   * Logs an ERROR from the browser.
   */
  error: async (message: string, error?: Error): Promise<void> => {
    await sendToProxy("ERROR", message, error);
  },

  /**
   * Logs a FATAL error from the browser.
   */
  fatal: async (message: string, error?: Error): Promise<void> => {
    await sendToProxy("FATAL", message, error);
  },
};

/**
 * Internal helper to send logs to the Proxy API.
 */
async function sendToProxy(level: string, message: string, error?: Error): Promise<void> {
  // Always log to local console first
  if (level === "FATAL") {
    console.error(`[FATAL] ${message}`, error || "");
  } else {
    console.error(`[ERROR] ${message}`, error || "");
  }

  try {
    const payload = {
      level,
      message,
      stack: error?.stack,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Node.js",
      timestamp: new Date().toISOString(),
    };

    // Fire and forget to avoid blocking UI
    fetch("/api/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.warn("[ClientLogger] Failed to send client log to proxy:", err);
    });
  } catch (err) {
    console.warn("[ClientLogger] Critical error in logging utility:", err);
  }
}
