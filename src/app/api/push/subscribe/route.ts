import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { subscription, pubkey } = await req.json();

    if (!subscription || !pubkey) {
      return NextResponse.json({ error: "Missing subscription or pubkey" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check if subscription already exists for this pubkey and endpoint
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("pubkey", pubkey)
      .eq("endpoint", subscription.endpoint)
      .single();

    if (existing) {
      return NextResponse.json({ success: true, message: "Already subscribed" });
    }

    // Save subscription
    const { error } = await supabase.from("push_subscriptions").insert([
      {
        pubkey,
        endpoint: subscription.endpoint,
        subscription: JSON.stringify(subscription),
      },
    ]);

    if (error) {
      console.error("Supabase error saving subscription:", error);
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in push/subscribe:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
