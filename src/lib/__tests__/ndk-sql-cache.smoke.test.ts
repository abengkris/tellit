import { describe, it, expect, vi } from 'vitest';
import { getServerNDK } from '../server-ndk';
import { NostrifyNDKCacheAdapter } from '../nostrify-ndk-adapter';

// Mock dependencies
vi.mock('../nostrify-sql-store', () => ({
  getSqlStore: vi.fn().mockResolvedValue({
    migrate: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../env', () => ({
  ENV: {
    TELLIT_NSEC: '',
    DATABASE: { URL: 'postgres://...' }
  },
}));

// Mock NDK to avoid connecting to relays
vi.mock('@nostrify/ndk', async () => ({}));  

vi.mock('@nostr-dev-kit/ndk', async () => {
  const actual = await vi.importActual('@nostr-dev-kit/ndk');
  class MockNDK extends (actual as any).default { // eslint-disable-line @typescript-eslint/no-explicit-any
    constructor(opts: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      super(opts);
      this.connect = vi.fn().mockResolvedValue(undefined);
    }
  }
  return {
    ...actual,
    default: MockNDK,
  };
});

describe('NDK SQL Cache Smoke Test', () => {
  it('getServerNDK should have NostrifyNDKCacheAdapter', async () => {
    const ndk = await getServerNDK();
    expect(ndk.cacheAdapter).toBeInstanceOf(NostrifyNDKCacheAdapter);
  });
});
