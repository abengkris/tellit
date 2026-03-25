import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRelayPool, createRelay } from '../nostrify-relay';
import { NRelay1, NPool } from '@nostrify/nostrify';

vi.mock('@nostrify/nostrify', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    NRelay1: vi.fn().mockImplementation(function(this: any, url: string) {
      this.url = url;
      this.query = vi.fn().mockResolvedValue([]);
    }),
    NPool: vi.fn().mockImplementation(function(this: any, opts: any) {
      this.opts = opts;
      return opts; // If it's used with 'new', it will return 'this' unless we return an object.
      // Returning opts here makes createRelayPool return the opts object itself, 
      // which is what we want for testing the callbacks.
    }),
  };
});

describe('Nostrify Relay Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an NRelay1 instance', () => {
    const url = 'wss://relay.example.com';
    const relay = createRelay(url);
    expect(relay).toBeDefined();
    expect(NRelay1).toHaveBeenCalledWith(url);
  });

  it('should create an NPool with provided relay URLs and correct options', async () => {
    const relays = ['wss://relay1.com', 'wss://relay2.com'];
    const options = createRelayPool(relays) as any;
    
    expect(NPool).toHaveBeenCalled();
    
    // Now we can test the internal functions passed to NPool
    const url = 'wss://test.com';
    const relay = options.open(url);
    expect(NRelay1).toHaveBeenCalledWith(url);
    expect(relay).toBeDefined();
    
    const filters = [{ kinds: [1] }];
    const reqRouterResult = options.reqRouter(filters);
    expect(reqRouterResult).toBeInstanceOf(Map);
    expect(reqRouterResult.get('wss://relay1.com')).toEqual(filters);
    
    const eventRouterResult = options.eventRouter();
    expect(eventRouterResult).toEqual(relays);
  });
});
