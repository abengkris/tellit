import { describe, it, expect } from 'vitest';
import { SchemaPolicy, validateEvent, getBasePolicy } from '../nostrify-policy';
import { type NostrEvent } from '@nostrify/nostrify';

describe('SchemaPolicy', () => {
  const policy = new SchemaPolicy();

  const validEvent: NostrEvent = {
    id: '0'.repeat(64),
    pubkey: '0'.repeat(64),
    created_at: 1234567890,
    kind: 1,
    tags: [],
    content: 'hello world',
    sig: '0'.repeat(128),
  };

  it('should return OK for a valid event', async () => {
    const result = await policy.call(validEvent);
    expect(result[0]).toBe('OK');
    expect(result[1]).toBe(validEvent.id);
    expect(result[2]).toBe(true);
  });

  it('should return blocked for an invalid event', async () => {
    const invalidEvent = { ...validEvent, kind: 'invalid' as any };
    const result = await policy.call(invalidEvent as any);
    expect(result[0]).toBe('OK');
    expect(result[2]).toBe(false);
    expect(result[3]).toContain('blocked: event validation failed');
  });
});

describe('validateEvent', () => {
  const validEvent: NostrEvent = {
    id: '0'.repeat(64),
    pubkey: '0'.repeat(64),
    created_at: 1234567890,
    kind: 1,
    tags: [],
    content: 'hello world',
    sig: '0'.repeat(128),
  };

  it('should return the event if valid', () => {
    const result = validateEvent(validEvent);
    expect(result).toEqual(validEvent);
  });

  it('should throw if invalid', () => {
    const invalidEvent = { ...validEvent, kind: 'invalid' as any };
    expect(() => validateEvent(invalidEvent)).toThrow();
  });
});

describe('getBasePolicy', () => {
  it('should return a combined policy', () => {
    const policy = getBasePolicy();
    expect(policy).toBeDefined();
    expect(typeof policy.call).toBe('function');
  });

  it('should accept a valid small event', async () => {
    const policy = getBasePolicy();
    const validEvent: NostrEvent = {
      id: '0'.repeat(64),
      pubkey: '0'.repeat(64),
      created_at: 1234567890,
      kind: 1,
      tags: [],
      content: 'hello world',
      sig: '0'.repeat(128),
    };
    const result = await policy.call(validEvent);
    expect(result[2]).toBe(true);
  });

  it('should reject a very large event', async () => {
    const policy = getBasePolicy();
    const largeEvent: NostrEvent = {
      id: '0'.repeat(64),
      pubkey: '0'.repeat(64),
      created_at: 1234567890,
      kind: 1,
      tags: [],
      content: 'a'.repeat(70000), // > 64KB
      sig: '0'.repeat(128),
    };
    const result = await policy.call(largeEvent);
    expect(result[2]).toBe(false);
  });
});
