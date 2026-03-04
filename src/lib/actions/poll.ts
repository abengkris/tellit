import NDK, { NDKEvent } from "@nostr-dev-kit/ndk";

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
  const event = new NDKEvent(ndk);
  event.kind = 1068;
  event.content = content;

  // Add options
  pollOptions.options.forEach((opt) => {
    event.tags.push(["option", opt.id, opt.label]);
  });

  // Add poll type (default singlechoice)
  event.tags.push(["polltype", pollOptions.pollType || "singlechoice"]);

  // Add expiration if provided
  if (pollOptions.endsAt) {
    event.tags.push(["endsAt", String(pollOptions.endsAt)]);
  }

  // Add response relays (standard NDK relays if not provided)
  const relays = pollOptions.relays || ndk.pool?.urls || [];
  relays.forEach((url) => {
    event.tags.push(["relay", url]);
  });

  await event.publish();
  return event;
};

/**
 * Creates a NIP-88 Poll Response (Kind 1018).
 */
export const respondToPoll = async (
  ndk: NDK,
  pollEvent: NDKEvent,
  optionIds: string[]
): Promise<NDKEvent> => {
  const event = new NDKEvent(ndk);
  event.kind = 1018;
  event.content = "";
  
  event.tags.push(["e", pollEvent.id]);
  
  optionIds.forEach(id => {
    event.tags.push(["response", id]);
  });

  await event.publish();
  return event;
};
