import webpush from "web-push";
import { ENV } from "./env";
import { getSupabaseAdmin } from "./supabase";

if (ENV.VAPID.PUBLIC && ENV.VAPID.PRIVATE) {
  webpush.setVapidDetails(
    "mailto:hello@tellit.id",
    ENV.VAPID.PUBLIC,
    ENV.VAPID.PRIVATE
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

export async function sendPushNotification(pubkey: string, payload: PushPayload) {
  const supabase = getSupabaseAdmin();

  // Get all subscriptions for this pubkey
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, subscription, endpoint")
    .eq("pubkey", pubkey);

  if (error || !subscriptions) {
    console.error("Error fetching subscriptions:", error);
    return;
  }

  const payloadString = JSON.stringify(payload);

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        const pushSubscription = JSON.parse(sub.subscription);
        await webpush.sendNotification(pushSubscription, payloadString);
        return { success: true, id: sub.id };
      } catch (err: unknown) {
        const error = err as { statusCode?: number };
        // If subscription is expired or invalid, remove it
        if (error.statusCode === 404 || error.statusCode === 410) {
          console.log(`Push subscription ${sub.id} expired, removing.`);
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error(`Error sending push to ${sub.id}:`, err);
        }
        throw err;
      }
    })
  );

  return results;
}
