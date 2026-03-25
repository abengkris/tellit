import { NSchema, type NostrEvent } from '@nostrify/nostrify';
import { PipePolicy, SizePolicy, type NPolicy } from '@nostrify/policies';

/**
 * Custom policy to validate events against NSchema (Zod-based).
 */
export class SchemaPolicy implements NPolicy {
  async call(event: NostrEvent): Promise<void> {
    try {
      NSchema.event().parse(event);
    } catch (error) {
      throw new Error(`Event validation failed: ${error}`);
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
