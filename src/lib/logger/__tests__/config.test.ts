import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadLoggerConfig, DEFAULT_LOGGER_RELAYS } from '../config';

describe('loadLoggerConfig', () => {
  beforeEach(() => {
    vi.stubEnv('LOGGER_NSEC', '');
    vi.stubEnv('RECEIVER_PUBKEY', '');
    vi.stubEnv('LOGGER_RELAYS', '');
    vi.stubEnv('NODE_ENV', '');
  });

  it('should throw if LOGGER_NSEC is missing', () => {
    vi.stubEnv('RECEIVER_PUBKEY', 'somepubkey');
    expect(() => loadLoggerConfig()).toThrow('Missing LOGGER_NSEC environment variable');
  });

  it('should throw if RECEIVER_PUBKEY is missing', () => {
    vi.stubEnv('LOGGER_NSEC', 'somensec');
    expect(() => loadLoggerConfig()).toThrow('Missing RECEIVER_PUBKEY environment variable');
  });

  it('should return config with default relays if LOGGER_RELAYS is missing', () => {
    vi.stubEnv('LOGGER_NSEC', 'somensec');
    vi.stubEnv('RECEIVER_PUBKEY', 'somepubkey');
    vi.stubEnv('NODE_ENV', 'production');

    const config = loadLoggerConfig();
    expect(config.senderNsec).toBe('somensec');
    expect(config.receiverPubkey).toBe('somepubkey');
    expect(config.relays).toEqual(DEFAULT_LOGGER_RELAYS);
    expect(config.env).toBe('production');
  });

  it('should return config with custom relays if LOGGER_RELAYS is provided', () => {
    vi.stubEnv('LOGGER_NSEC', 'somensec');
    vi.stubEnv('RECEIVER_PUBKEY', 'somepubkey');
    vi.stubEnv('LOGGER_RELAYS', 'wss://relay1.com, wss://relay2.com ');

    const config = loadLoggerConfig();
    expect(config.relays).toEqual(['wss://relay1.com', 'wss://relay2.com']);
  });

  it('should fallback to development env if NODE_ENV is missing', () => {
    vi.stubEnv('LOGGER_NSEC', 'somensec');
    vi.stubEnv('RECEIVER_PUBKEY', 'somepubkey');
    
    const config = loadLoggerConfig();
    expect(config.env).toBe('development');
  });
});
