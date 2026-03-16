import { NDKUser, NDKEvent } from "@nostr-dev-kit/ndk";
import { NDKMessenger } from "@nostr-dev-kit/messages";

/**
 * Send a Private Direct Message (NIP-17) using NDKMessenger
 */
export const sendMessage = async (
  messenger: NDKMessenger,
  recipient: NDKUser,
  content: string,
  replyTo?: string
): Promise<boolean> => {
  try {
    // messenger.sendMessage handles NIP-17 Gift Wraps and self-copies automatically
    await messenger.sendMessage(recipient, content);
    return true;
  } catch (err) {
    console.error("Failed to send NIP-17 message:", err);
    return false;
  }
};

/**
 * Publish the user's preferred DM relays (Kind 10050)
 */
export const syncDMRelays = async (
  messenger: NDKMessenger,
  relays: string[]
): Promise<void> => {
  try {
    await messenger.publishDMRelays(relays);
  } catch (err) {
    console.warn("Failed to publish DM relays:", err);
  }
};

/**
 * Publish a Kind 15 Read Receipt for a conversation
 */
export const publishReadReceipt = async (
  event: NDKEvent,
  recipient: NDKUser
): Promise<void> => {
  if (!event.ndk) return;

  try {
    const receipt = new NDKEvent(event.ndk);
    receipt.kind = 15;
    receipt.content = "";
    receipt.tags = [
      ["e", event.id],
      ["p", recipient.pubkey]
    ];
    await receipt.publish();
  } catch (err) {
    console.warn("Failed to publish read receipt:", err);
  }
};
