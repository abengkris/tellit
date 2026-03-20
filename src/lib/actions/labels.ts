import NDK, { NDKEvent, NDKTag, NDKKind } from "@nostr-dev-kit/ndk";
import { addClientTag } from "@/lib/utils/nostr";

/**
 * Publish a NIP-32 Label event (Kind 1985).
 * @param ndk The NDK instance
 * @param namespace The namespace for the label (L tag)
 * @param label The label value (l tag)
 * @param targets An array of NDK tags representing the targets (e, p, a, r, or t tags)
 * @param content Optional explanation or description
 */
export const publishLabel = async (
  ndk: NDK,
  namespace: string,
  label: string,
  targets: NDKTag[],
  content: string = ""
): Promise<NDKEvent> => {
  if (!ndk.signer) throw new Error("No signer available to publish label");

  const event = new NDKEvent(ndk);
  event.kind = 1985 as NDKKind;
  event.content = content;

  // NIP-32 tags
  event.tags = [
    ["L", namespace],
    ["l", label, namespace],
    ...targets
  ];

  addClientTag(event);
  await event.sign();
  // Fire and forget (optimistic)
  event.publish();
  
  return event;
};

/**
 * Self-label an event by adding L and l tags.
 * This is meant to be used before signing/publishing the original event.
 */
export const addLabelTags = (
  event: NDKEvent,
  namespace: string,
  label: string
) => {
  event.tags.push(["L", namespace]);
  event.tags.push(["l", label, namespace]);
};
