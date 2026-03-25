import { NSchema, type NostrEvent } from '@nostrify/nostrify';
import { PipePolicy, SizePolicy } from '@nostrify/policies';
import { type NPolicy, type NostrRelayOK } from '@nostrify/types';

/**
 * Custom policy to validate events against NSchema (Zod-based).
 */
export class SchemaPolicy implements NPolicy {
  async call(event: NostrEvent): Promise<NostrRelayOK> {
    try {
      NSchema.event().parse(event);
      return ['OK', event.id, true, ''];
    } catch (error) {
      return ['OK', event.id, false, `blocked: event validation failed: ${error}`];
    }
  }
}

/**
 * Validates a single event using NSchema directly.
 */
export function validateEvent(event: unknown): NostrEvent {
  return NSchema.event().parse(event);
}

/**
 * Returns a combined base policy for filtering events.
 * This includes schema validation and size limits.
 */
export function getBasePolicy(): NPolicy {
  return new PipePolicy([
    new SchemaPolicy(),
    new SizePolicy({ maxBytes: 65536 }), // 64KB max event size
  ]);
}
