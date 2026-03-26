import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { endpoint, pubkey } = await req.json();

    if (!endpoint || !pubkey) {
      return NextResponse.json({ error: "Missing endpoint or pubkey" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .match({ pubkey, endpoint });

    if (error) {
      console.error("Supabase error deleting subscription:", error);
      return NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in push/unsubscribe:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
