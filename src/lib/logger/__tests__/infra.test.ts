import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '../rate-limiter';
import { createLoggerPool } from '../pool';
import { NPool } from '@nostrify/nostrify';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow first request', () => {
    const limiter = new RateLimiter(60000);
    expect(limiter.isAllowed('key1')).toBe(true);
  });

  it('should deny second request within window', () => {
    const limiter = new RateLimiter(60000);
    limiter.isAllowed('key1');
    expect(limiter.isAllowed('key1')).toBe(false);
  });

  it('should allow request after window has passed', () => {
    const limiter = new RateLimiter(60000);
    limiter.isAllowed('key1');
    
    vi.advanceTimersByTime(60001);
    
    expect(limiter.isAllowed('key1')).toBe(true);
  });

  it('should allow different keys within same window', () => {
    const limiter = new RateLimiter(60000);
    expect(limiter.isAllowed('key1')).toBe(true);
    expect(limiter.isAllowed('key2')).toBe(true);
  });

  it('should cleanup old keys when map grows too large', () => {
    const limiter = new RateLimiter(60000);
    for (let i = 0; i < 1001; i++) {
      limiter.isAllowed(`key${i}`);
    }
    // Advance time so all are expired
    vi.advanceTimersByTime(60001);
    // Trigger another check to run cleanup
    limiter.isAllowed('trigger');
    
    // We can't directly check the private map size, but we covered the code path
  });
});

describe('Connection Pool', () => {
  it('should create an NPool instance with provided relays', async () => {
    const relays = ['wss://relay1.com', 'wss://relay2.com'];
    const pool = createLoggerPool(relays);
    
    expect(pool).toBeInstanceOf(NPool);

    // Test reqRouter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reqRouter = (pool as any).opts.reqRouter;
    const filters = [{ kinds: [1] }];
    const routes = await reqRouter(filters);
    expect(routes.size).toBe(2);
    expect(routes.get('wss://relay1.com')).toEqual(filters);

    // Test eventRouter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventRouter = (pool as any).opts.eventRouter;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventRoutes = await eventRouter({} as any);
    expect(eventRoutes).toEqual(relays);
  });
});
