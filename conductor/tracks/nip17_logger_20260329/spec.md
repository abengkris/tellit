# Specification: Nostrify NIP-17 Error Logger

## Overview
A TypeScript-based logging module that utilizes the `nostrify` ecosystem to catch high-severity logs (`ERROR`, `FATAL`) and transmit them as NIP-17 (Private Direct Messages) to a specified Nostr public key. This ensures developers are alerted to production issues via their preferred Nostr client while maintaining strict metadata privacy.

## Functional Requirements

### 1. Nostrify Integration
- **Paradigm**: The module must strictly follow Nostrify's functional programming approach. Use modular utilities rather than stateful classes.
- **NIP-17 Composition**: 
    - Create a **Rumor** (the actual log content).
    - Encrypt the rumor using **NIP-44**.
    - Wrap the encrypted content into a **Seal** (Kind 13).
    - Wrap the seal into a **Gift Wrap** (Kind 1059).
- **Metadata**: Every log rumor must include:
    - `content`: The error message.
    - `stack`: The error stack trace (if available).
    - `env`: The environment name (e.g., from `process.env.NODE_ENV`).
    - `timestamp`: High-resolution ISO timestamp.

### 2. Connection Management
- **Persistent Relays**: Implement a persistent WebSocket connection pool (using Nostrify's `NPool` or similar).
- **Default Relays**: Use a hardcoded list of reliable relays (e.g., `wss://relay.damus.io`, `wss://nos.lol`).
- **Resilience**: WebSocket errors must be caught gracefully. If connection fails, fallback to standard `console.error`.

### 3. Rate Limiting & Performance
- **Deduplication**: Implement an in-memory rate limiter using a `Map`.
- **Threshold**: Identical error messages (based on a hash of the content/stack) are limited to a maximum of **1 transmission per minute**.
- **Non-Blocking**: The logging call must be "Fire and Forget" (non-blocking) to ensure it doesn't degrade application performance.

### 4. Security
- **Sender Identity**: Private key must be read strictly from `process.env.LOGGER_NSEC`.
- **Receiver**: Destination pubkey must be read from `process.env.RECEIVER_PUBKEY`.
- **No Hardcoding**: Credentials and sensitive keys must never be committed to source control.

## Non-Functional Requirements
- **Language**: TypeScript.
- **Dependency**: Strictly use `nostrify` ecosystem libraries.
- **Stability**: The logger must never cause the host process to crash, even during network failures or invalid environment configurations.

## Acceptance Criteria
- [ ] Successfully sends a Kind 1059 event to the destination pubkey.
- [ ] Message content is correctly encrypted and decrypted via NIP-44.
- [ ] Only one message is sent for repeated errors within a 60-second window.
- [ ] Fallback to `console.error` works if relays are unreachable.
- [ ] Metadata (stack, env, timestamp) is verified in the rumor payload.

## Out of Scope
- Global `console` monkey-patching.
- Log aggregation or historical storage within the module.
- Support for group chats or public messages.
