import NDK, { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";

/**
 * Send a Private Direct Message (NIP-17)
 * This uses Kind 1059 (Gift Wrap) -> Kind 13 (Seal) -> Kind 14 (Message)
 */
export const sendMessage = async (
  ndk: NDK,
  recipient: NDKUser,
  content: string,
  replyTo?: string
): Promise<boolean> => {
  if (!ndk.signer) throw new Error("No signer available");

  try {
    const event = new NDKEvent(ndk);
    event.kind = 14;
    event.content = content;
    event.tags = [["p", recipient.pubkey]];
    
    if (replyTo) {
      event.tags.push(["e", replyTo, "", "reply"]);
    }

    // Use NDK's publishAsDirectMessage which handles NIP-17 (Gift Wrap -> Seal -> Rumor)
    // We use 'nip17' explicitly to ensure it doesn't fallback to NIP-04
    await event.publishAsDirectMessage(recipient, "nip17");
    
    // Also send a copy to ourselves so it appears in our sent messages on all devices
    const currentUser = await ndk.signer.user();
    if (currentUser && currentUser.pubkey !== recipient.pubkey) {
      try {
        await event.publishAsDirectMessage(currentUser, "nip17");
      } catch (selfCopyErr) {
        console.warn("Failed to send NIP-17 self-copy:", selfCopyErr);
        // We don't fail the whole operation if only the self-copy fails
      }
    }

    return true;
  } catch (err) {
    console.error("Failed to send NIP-17 message:", err);
    return false;
  }
};
