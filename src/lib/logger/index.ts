import { NPool, NSecSigner } from '@nostrify/nostrify';
import { NostrSigner } from '@nostrify/types';
import { nip19 } from 'nostr-tools';
import { LoggerConfig, loadLoggerConfig } from './config';
import { RateLimiter } from './rate-limiter';
import { createRumor, wrapSeal, wrapGift } from './nip17';
import { createLoggerPool } from './pool';

/**
 * High-performance, resilient error logger using NIP-17.
 */
export class NostrifyLogger {
  private static instance: NostrifyLogger;

  constructor(
    private config: LoggerConfig,
    private pool: NPool,
    private rateLimiter: RateLimiter = new RateLimiter(),
    private signer: NostrSigner
  ) {}

  /**
   * Gets the global singleton instance of the logger.
   */
  static async get(): Promise<NostrifyLogger> {
    if (!this.instance) {
      const config = loadLoggerConfig();
      const pool = createLoggerPool(config.relays);
      const rateLimiter = new RateLimiter();
      
      let secretKey: Uint8Array;
      if (config.senderNsec.startsWith('nsec')) {
        const decoded = nip19.decode(config.senderNsec);
        if (decoded.type !== 'nsec') {
          throw new Error('Invalid nsec provided for logger');
        }
        secretKey = decoded.data;
      } else {
        const { hexToBytes } = await import('@noble/hashes/utils');
        secretKey = hexToBytes(config.senderNsec);
      }

      const signer = new NSecSigner(secretKey);
      this.instance = new NostrifyLogger(config, pool, rateLimiter, signer);
    }
    return this.instance;
  }

  /**
   * Logs an ERROR message.
   */
  async error(message: string, error?: Error): Promise<void> {
    await this.log('ERROR', message, error);
  }

  /**
   * Logs a FATAL message.
   */
  async fatal(message: string, error?: Error): Promise<void> {
    await this.log('FATAL', message, error);
  }

  /**
   * Internal logging implementation.
   * Uses fire-and-forget for NIP-17 transmission.
   */
  private async log(level: string, message: string, error?: Error): Promise<void> {
    const stack = error?.stack || 'no stack trace';
    const dedupeKey = `${message}:${stack}`;

    if (!this.rateLimiter.isAllowed(dedupeKey)) {
      console.error(`[NostrifyLogger] [RateLimited] [${level}] ${message}`, error || '');
      return;
    }

    // Always fallback to console.error
    console.error(`[NostrifyLogger] [${level}] ${message}`, error || '');

    // Fire and forget
    this.sendNIP17(level, message, stack).catch((err) => {
      console.error('[NostrifyLogger] [CriticalFailure] Failed to send NIP-17 log:', err);
    });
  }

  /**
   * Composes and sends NIP-17 message.
   */
  private async sendNIP17(level: string, message: string, stack: string): Promise<void> {
    const senderPubkey = await this.signer.getPublicKey();
    
    const rumor = createRumor(senderPubkey, `[${level}] ${message}`, {
      level,
      env: this.config.env,
      stack,
      timestamp: new Date().toISOString(),
    });

    const seal = await wrapSeal(this.signer, this.config.receiverPubkey, rumor);
    const giftWrap = await wrapGift(this.config.receiverPubkey, seal);

    await this.pool.event(giftWrap);
  }
}

/**
 * Convenience export for explicit logging.
 */
export const logger = {
  error: async (msg: string, err?: Error) => (await NostrifyLogger.get()).error(msg, err),
  fatal: async (msg: string, err?: Error) => (await NostrifyLogger.get()).fatal(msg, err),
};
