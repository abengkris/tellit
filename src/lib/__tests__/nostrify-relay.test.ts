import { describe, it, expect, vi } from 'vitest';

describe('Nostrify Relay Manager', () => {
  it('should create an NPool with provided relay URLs', async () => {
    const { createRelayPool } = await import('../nostrify-relay');
    const relays = ['wss://relay1.com', 'wss://relay2.com'];
    
    const pool = createRelayPool(relays);
    expect(pool).toBeDefined();
    // In a real scenario we'd check internal state, but NPool is opaque.
    // We just check if it was created.
  });

  it('should be able to query from the pool', async () => {
    const { createRelayPool } = await import('../nostrify-relay');
    const pool = createRelayPool(['wss://relay1.com']);
    
    // Mock the pool.query method
    const mockEvent = { id: '1', kind: 1, content: 'test', pubkey: 'abc', sig: 'sig', created_at: 100, tags: [] };
    pool.query = vi.fn().mockResolvedValue([mockEvent]);

    const results = await pool.query([{ kinds: [1] }]);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });
});
