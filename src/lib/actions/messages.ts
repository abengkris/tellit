import { NDKUser } from "@nostr-dev-kit/ndk";
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
