# Nostrify NIP-17 Error Logger

A high-performance, resilient error logger that sends high-severity logs (`ERROR`, `FATAL`) as NIP-17 Private Direct Messages to a specific Nostr pubkey.

## Features

- **Functional Paradigm**: Built using the `nostrify` ecosystem.
- **NIP-17 Messaging**: Uses Rumors (Kind 14), Seals (Kind 13), and Gift Wraps (Kind 1059) for private, metadata-resistant alerts.
- **Rate Limiting**: In-memory deduplication (max 1 alert per minute for identical errors).
- **Persistent Connection**: Uses a shared `NPool` for relay communication.
- **Non-Blocking**: Fire-and-forget implementation ensures no performance impact on the main process.
- **Graceful Fallback**: Always logs to `console.error` and handles network failures without crashing.

## Configuration

The logger requires the following environment variables:

- `LOGGER_NSEC`: The private key (nsec or hex) of the sender identity.
- `RECEIVER_PUBKEY`: The hex public key of the recipient (e.g., the developer).
- `LOGGER_RELAYS` (Optional): Comma-separated list of relay URLs.
- `NODE_ENV` (Optional): Environment name (defaults to `development`).

## Usage

### Explicit Usage

```typescript
import { logger } from '@/lib/logger';

try {
  // ... some critical code
} catch (err) {
  logger.error('Failed to process payment', err as Error);
}
```

### Integration Example (`index.ts`)

```typescript
import { logger } from './lib/logger';

async function main() {
  try {
    throw new Error('Database connection lost');
  } catch (err) {
    // This will send a NIP-17 message to the RECEIVER_PUBKEY
    await logger.fatal('Application crash imminent', err as Error);
  }
}

main();
```

## Internal Architecture

1. **Rumor (Kind 14)**: Contains the log level, message, environment, stack trace, and timestamp.
2. **Seal (Kind 13)**: Rumor is encrypted with NIP-44 using the sender's private key.
3. **Gift Wrap (Kind 1059)**: Seal is wrapped and encrypted with NIP-44 using a random session key to ensure sender privacy at the relay level.
4. **NPool**: Published to configured relays via a persistent connection pool.
