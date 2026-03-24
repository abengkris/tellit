import { NextRequest, NextResponse } from "next/server";
import { getServerNDK } from "@/lib/server-ndk";
import { NDKMessenger } from "@nostr-dev-kit/messages";

const MONITOR_NPUB = "npub1q7g8dyxw8lkrp7eq38445cwpga2gcfzt4ptqtecn67v3e48qzhmqwgk6wr";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { level, message, url, userAgent, timestamp } = data;

    const ndk = await getServerNDK();
    if (!ndk.signer) {
      console.error("[LogAPI] No signer available, cannot send NIP-17 message");
      return NextResponse.json({ error: "No signer" }, { status: 500 });
    }

    const messenger = new NDKMessenger(ndk);
    
    // Recipient user
    const recipient = ndk.getUser({ npub: MONITOR_NPUB });

    const formattedMessage = `[${level.toUpperCase()}] ${timestamp}\nURL: ${url}\nUA: ${userAgent}\n\n${message}`;

    console.log(`[LogAPI] Sending NIP-17 report to ${MONITOR_NPUB}...`);
    
    // NIP-17 message with timeout to avoid hanging
    const sendPromise = messenger.sendMessage(recipient, formattedMessage);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Send timeout")), 15000)
    );

    await Promise.race([sendPromise, timeoutPromise]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[LogAPI] Error processing log:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
