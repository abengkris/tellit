import NDK, { NDKEvent, NDKKind, NDKUser, NDKFilter } from "@nostr-dev-kit/ndk";
import { addClientTag } from "@/lib/utils/nostr";

/**
 * NIP-37 Draft Wraps (Kind 31234)
 */

export interface DraftWrapOptions {
  identifier: string;
  kind: number;
  expiration?: number;
}

/**
 * Encrypts and publishes a draft event as a Kind 31234 event.
 */
export const saveDraftWrap = async (
  ndk: NDK,
  draftEvent: Partial<NDKEvent>,
  options: DraftWrapOptions
): Promise<NDKEvent> => {
  if (!ndk.signer) throw new Error("Signer required for NIP-37");
  const user = await ndk.signer.user();

  const wrap = new NDKEvent(ndk);
  wrap.kind = 31234 as NDKKind;
  
  // NIP-37 tags
  wrap.tags = [
    ["d", options.identifier],
    ["k", String(options.kind)]
  ];

  if (options.expiration) {
    wrap.tags.push(["expiration", String(options.expiration)]);
  }

  // Encrypt the stringified draft event using NIP-44 to self
  const content = JSON.stringify(draftEvent);
  wrap.content = await ndk.signer.encrypt(user, content, "nip44");

  addClientTag(wrap);
  await wrap.sign();
  await wrap.publish();

  return wrap;
};

/**
 * Fetches and decrypts Kind 31234 draft wraps.
 */
export const fetchDraftWraps = async (
  ndk: NDK,
  user: NDKUser,
  kind?: number
): Promise<{ wrap: NDKEvent; draft: Partial<NDKEvent> }[]> => {
  const filter: NDKFilter = {
    kinds: [31234 as NDKKind],
    authors: [user.pubkey]
  };
  if (kind !== undefined) {
    filter["#k"] = [String(kind)];
  }

  const events = await ndk.fetchEvents(filter);
  const results: { wrap: NDKEvent; draft: Partial<NDKEvent> }[] = [];

  for (const event of Array.from(events)) {
    try {
      if (!event.content) continue; // Signifies deletion
      
      const decrypted = await ndk.signer?.decrypt(user, event.content, "nip44");
      if (decrypted) {
        results.push({
          wrap: event,
          draft: JSON.parse(decrypted) as Partial<NDKEvent>
        });
      }
    } catch (err) {
      console.warn("Failed to decrypt draft wrap:", event.id, err);
    }
  }

  return results;
};

/**
 * Deletes a draft wrap by publishing an event with empty content (as per NIP-37)
 * or using NIP-09 deletion. NIP-37 says blanked content signals deletion.
 */
export const deleteDraftWrap = async (
  ndk: NDK,
  identifier: string
): Promise<void> => {
  if (!ndk.signer) throw new Error("Signer required");

  const wrap = new NDKEvent(ndk);
  wrap.kind = 31234 as NDKKind;
  wrap.tags = [["d", identifier]];
  wrap.content = ""; // NIP-37: blanked content signals deletion

  addClientTag(wrap);
  await wrap.sign();
  await wrap.publish();
};

/**
 * NIP-37 Relay List for Private Content (Kind 10013)
 */

export const savePrivateRelayList = async (
  ndk: NDK,
  relays: string[]
): Promise<NDKEvent> => {
  if (!ndk.signer) throw new Error("Signer required");
  const user = await ndk.signer.user();

  const event = new NDKEvent(ndk);
  event.kind = 10013 as NDKKind;
  
  // NIP-37: Private tags are JSON stringified and NIP-44 encrypted into content
  const privateTags = relays.map(r => ["relay", r]);
  const content = JSON.stringify(privateTags);
  event.content = await ndk.signer.encrypt(user, content, "nip44");

  addClientTag(event);
  await event.sign();
  await event.publish();

  return event;
};

export const getPrivateRelayList = async (
  ndk: NDK,
  user: NDKUser
): Promise<string[]> => {
  if (!ndk.signer) return [];
  
  const event = await ndk.fetchEvent({
    kinds: [10013 as NDKKind],
    authors: [user.pubkey]
  });

  if (!event || !event.content) return [];

  try {
    const decrypted = await ndk.signer.decrypt(user, event.content, "nip44");
    if (decrypted) {
      const tags = JSON.parse(decrypted);
      return tags
        .filter((t: string[]) => t[0] === 'relay')
        .map((t: string[]) => t[1]);
    }
  } catch (err) {
    console.warn("Failed to decrypt private relay list:", err);
  }

  return [];
};
