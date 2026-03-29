import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NostrifyLogger } from '../index';
import { LoggerConfig } from '../config';
import { NPool } from '@nostrify/nostrify';
import { RateLimiter } from '../rate-limiter';

import { generateSecretKey, getPublicKey } from 'nostr-tools';

describe('NostrifyLogger', () => {
  const receiverPubkey = getPublicKey(generateSecretKey());

  const mockConfig: LoggerConfig = {
    senderNsec: 'nsec1...', // Invalid but doesn't matter if we mock signer
    receiverPubkey,
    relays: ['wss://relay.com'],
    env: 'test'
  };

  const mockPool = {
    event: vi.fn().mockResolvedValue(undefined),
  } as unknown as NPool;

  const mockRateLimiter = {
    isAllowed: vi.fn().mockReturnValue(true),
  } as unknown as RateLimiter;

  const mockSigner = {
    getPublicKey: vi.fn().mockResolvedValue('sender-pubkey'),
    nip44: {
      encrypt: vi.fn().mockResolvedValue('encrypted-content'),
    },
    signEvent: vi.fn().mockImplementation((e) => Promise.resolve({ ...e, id: 'id', sig: 'sig' })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send an error log when allowed by rate limiter', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logger = new NostrifyLogger(mockConfig, mockPool, mockRateLimiter, mockSigner as any);
    
    await logger.error('Test error');
    
    expect(mockRateLimiter.isAllowed).toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(mockPool.event).toHaveBeenCalled();
    });
    expect(mockSigner.nip44.encrypt).toHaveBeenCalled();
  });

  it('should not send an error log when rate limited', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockRateLimiter.isAllowed as any).mockReturnValue(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logger = new NostrifyLogger(mockConfig, mockPool, mockRateLimiter, mockSigner as any);
    
    await logger.error('Test error');
    
    expect(mockRateLimiter.isAllowed).toHaveBeenCalled();
    expect(mockPool.event).not.toHaveBeenCalled();
  });

  it('should fallback to console.error on failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPool.event as any).mockRejectedValue(new Error('Network failure'));
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logger = new NostrifyLogger(mockConfig, mockPool, mockRateLimiter, mockSigner as any);
    
    await logger.error('Test error');
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
