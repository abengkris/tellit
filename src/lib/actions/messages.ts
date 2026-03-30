import { NDKUser } from "@nostr-dev-kit/ndk";
import { NDKMessenger } from "@nostr-dev-kit/messages";
import { clientLogger } from "../logger/client";

/**
 * Send a Private Direct Message (NIP-17) using NDKMessenger
 */
export const sendMessage = async (
  messenger: NDKMessenger,
  recipient: NDKUser,
  content: string
): Promise<boolean> => {
  try {
    console.log(`[Messages] Sending message to ${recipient.pubkey}...`);
    console.log(`[Messages] Messenger state:`, { 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      started: (messenger as any).started, 
      hasSigner: !!messenger.ndk.signer,
      pubkey: messenger.ndk.activeUser?.pubkey 
    });
    
    // Ensure recipient has NDK instance
    if (!recipient.ndk) recipient.ndk = messenger.ndk;

    // messenger.sendMessage handles NIP-17 Gift Wraps and self-copies automatically
    const result = await messenger.sendMessage(recipient, content);
    console.log(`[Messages] Message sent result:`, result);
    return true;
  } catch (err) {
    await clientLogger.error("Failed to send NIP-17 message", err as Error);
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
