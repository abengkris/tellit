import { describe, it, expect } from 'vitest';

describe('Nostrify Dependencies Smoke Test', () => {
  it('should be able to import @nostrify/nostrify', async () => {
    const nostrify = await import('@nostrify/nostrify');
    expect(nostrify).toBeDefined();
  });

  it('should be able to import @nostrify/db', async () => {
    const db = await import('@nostrify/db');
    expect(db).toBeDefined();
  });
});
