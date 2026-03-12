import { 
  HellthreadPolicy, 
  KeywordPolicy, 
  PipePolicy, 
  RegexPolicy,
  FiltersPolicy
} from '@nostrify/policies';
import { NostrEvent } from '@nostrify/nostrify';
import { NDKEvent } from '@nostr-dev-kit/ndk';

/**
 * Standard moderation policy pipeline for Tell it!
 * Combines various rules to reject spam and undesirable content.
 */
export const tellItPolicy = new PipePolicy([
  // Only allow common kinds
  new FiltersPolicy([{ 
    kinds: [1, 6, 16, 1068, 30023, 9802, 1111, 7] 
  }]),
  
  // Hellthread protection: reject if tags more than 50 participats
  new HellthreadPolicy({ limit: 50 }),
  
  // Keyword filters for common spam patterns
  new KeywordPolicy([
    'https://t.me/', 
    'whatsapp.com', 
    'crypto signals',
    'double your bitcoin',
  ]),
  
  // Regex for more complex patterns (e.g. ChatGPT spam accounts)
  new RegexPolicy(/(🟠|🔥|😳)ChtaGPT/i),
]);

/**
 * Validates an event against the global policy.
 * Returns true if accepted, false if rejected.
 */
export async function validateEvent(event: NDKEvent): Promise<boolean> {
  // Convert NDK event to simple NostrEvent if needed
  const nostrEvent: NostrEvent = {
    id: event.id,
    pubkey: event.pubkey,
    created_at: event.created_at || Math.floor(Date.now() / 1000),
    kind: event.kind || 1,
    tags: event.tags,
    content: event.content,
    sig: event.sig || '',
  };

  const result = await tellItPolicy.call(nostrEvent);
  const ok = result[2];
  const reason = result[3];
  
  if (!ok) {
    console.warn(`[Policy] Event ${event.id} rejected: ${reason}`);
  }
  
  return ok;
}
