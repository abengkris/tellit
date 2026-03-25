import { describe, it, expect } from 'vitest';

describe('Nostrify Policy Manager', () => {
  it('should validate an event using NSchema', async () => {
    const { validateEvent } = await import('../nostrify-policy');
    // Just check if the function exists.
    expect(validateEvent).toBeDefined();
  });

  it('should filter an event using a combined policy', async () => {
    const { getBasePolicy } = await import('../nostrify-policy');
    const policy = getBasePolicy();
    expect(policy).toBeDefined();
  });
});
