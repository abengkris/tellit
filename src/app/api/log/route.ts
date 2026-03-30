import { NextRequest, NextResponse } from "next/server";
import { NostrifyLogger } from "@/lib/logger";

/**
 * Proxy API for client-side logging.
 * Receives logs from the browser and forwards them via NIP-17 using the secure server-side signer.
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { level, message, url, userAgent, timestamp, stack } = data;

    // 1. Validation
    if (!level || !message) {
      return NextResponse.json({ error: "Level and message are required" }, { status: 400 });
    }

    const upperLevel = level.toUpperCase();
    if (upperLevel !== "ERROR" && upperLevel !== "FATAL") {
      return NextResponse.json({ error: "Invalid log level for NIP-17 reporting" }, { status: 400 });
    }

    // 2. Initialize Logger
    const logger = await NostrifyLogger.get();

    // 3. Format detailed message
    const detailedMessage = `[Client] ${message}\nURL: ${url || "unknown"}\nUA: ${userAgent || "unknown"}\nTS: ${timestamp || new Date().toISOString()}`;
    
    // 4. Create Error object for stack trace preservation if provided
    const errorObj = new Error(message);
    if (stack) {
      errorObj.stack = stack;
    }

    // 5. Forward to NIP-17
    if (upperLevel === "FATAL") {
      await logger.fatal(detailedMessage, errorObj);
    } else {
      await logger.error(detailedMessage, errorObj);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[LogProxyAPI] Error processing log:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
