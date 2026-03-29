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
});

describe('Connection Pool', () => {
  it('should create an NPool instance with provided relays', () => {
    const relays = ['wss://relay1.com', 'wss://relay2.com'];
    const pool = createLoggerPool(relays);
    
    expect(pool).toBeInstanceOf(NPool);
  });
});
