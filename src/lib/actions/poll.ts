import NDK, { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";

export interface PollOption {
  id: string;
  label: string;
}

export interface CreatePollOptions {
  options: PollOption[];
  pollType?: "singlechoice" | "multiplechoice";
  endsAt?: number;
  relays?: string[];
}

/**
 * Creates a NIP-88 Poll Event (Kind 1068).
 */
export const createPoll = async (
  ndk: NDK,
  content: string,
  pollOptions: CreatePollOptions
): Promise<NDKEvent> => {
  if (!ndk) throw new Error("NDK instance is missing");
  if (!ndk.signer) throw new Error("Please log in to create a poll");
  if (!pollOptions || !Array.isArray(pollOptions.options)) throw new Error("Invalid poll options");

  try {
    const event = new NDKEvent(ndk);
    event.kind = 1068 as NDKKind;
    event.content = content;

    // Add options
    pollOptions.options.forEach((opt) => {
      if (opt && opt.id && opt.label) {
        event.tags.push(["option", String(opt.id), String(opt.label)]);
      }
    });

    // Add poll type
    event.tags.push(["polltype", pollOptions.pollType || "singlechoice"]);

    // Add expiration
    if (pollOptions.endsAt) {
      event.tags.push(["endsAt", String(pollOptions.endsAt)]);
    }

    // Add response relays
    let relayUrls: string[] = [];
    if (Array.isArray(pollOptions.relays) && pollOptions.relays.length > 0) {
      relayUrls = pollOptions.relays;
    } else {
      // Safely get some relays from the pool
      const pool = ndk.pool;
      if (pool) {
        relayUrls = Array.from(pool.relays.keys());
      }
    }

    // Ultimate fallback
    if (!Array.isArray(relayUrls) || relayUrls.length === 0) {
      relayUrls = ["wss://nos.lol", "wss://relay.damus.io"];
    }

    relayUrls.forEach((url) => {
      if (typeof url === "string" && url.startsWith("ws")) {
        event.tags.push(["relay", url]);
      }
    });

    event.created_at = Math.floor(Date.now() / 1000);

    console.log("[Poll] Signing and publishing...");
    await event.sign();
    // Fire and forget (optimistic)
    event.publish();
    
    return event;
  } catch (err) {
    console.error("[Poll] Error in createPoll:", err);
    throw err;
  }
};

/**
 * Creates a NIP-88 Poll Response (Kind 1018).
 */
export const respondToPoll = async (
  ndk: NDK,
  pollEvent: NDKEvent,
  optionIds: string[]
): Promise<NDKEvent> => {
  if (!ndk) throw new Error("NDK instance is missing");
  if (!ndk.signer) throw new Error("Please log in to vote");
  if (!pollEvent) throw new Error("Poll event is missing");
  
  try {
    const event = new NDKEvent(ndk);
    event.kind = 1018 as NDKKind;
    event.content = "";
    
    event.tags.push(["e", pollEvent.id]);
    
    if (Array.isArray(optionIds)) {
      optionIds.forEach(id => {
        event.tags.push(["response", String(id)]);
      });
    }

    await event.sign();
    // Fire and forget (optimistic)
    event.publish();
    return event;
  } catch (err) {
    console.error("[Poll] Error in respondToPoll:", err);
    throw err;
  }
};
