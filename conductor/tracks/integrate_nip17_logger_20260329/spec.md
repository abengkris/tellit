# Specification: Integrate NIP-17 Error Logger

## Overview
Integrate the recently implemented NIP-17 Error Logger into the "Tell it!" codebase. This track aims to provide resilient, private alerts for critical errors across all layers of the application (Server, Client, and Infrastructure) without exposing sensitive credentials to the browser.

## Functional Requirements

### 1. Server-Side Integration
- **Target Areas**: Server Actions, API Routes, and Middlewares.
- **Action**: Manually replace high-priority `console.error` calls with `logger.error` or `logger.fatal` from `@/lib/logger`.
- **Level**: Report both `ERROR` and `FATAL` severities.

### 2. Infrastructure Integration
- **Target Areas**: Database logic (`src/lib/db.ts`), SQL Store (`src/lib/nostrify-sql-store.ts`), and Sync engine.
- **Action**: Ensure infrastructure failures (connection drops, sync errors) trigger NIP-17 alerts.

### 3. Client-Side Integration (Secure Proxy)
- **Proxy API**: Create a new Next.js API route `/api/log` (POST).
    - This route will receive error messages and stack traces from the client.
    - It will utilize the server-side `NostrifyLogger` (and the secure `LOGGER_NSEC`) to transmit the alert via NIP-17.
- **Client Logger Utility**: Create `src/lib/logger/client.ts`.
    - A lightweight utility that sends log data to the Proxy API.
    - Designed to be safe for use in browser environments.
- **Integration**: Use the client logger in high-impact React hooks (e.g., `useNDK`, `useSync`) and critical UI boundaries.

### 4. Security
- **Credential Protection**: Strictly maintain the server-only status of `LOGGER_NSEC`. 
- **Validation**: The `/api/log` route should have basic validation to prevent abuse.

## Acceptance Criteria
- [ ] Critical server-side errors trigger a NIP-17 message to the `RECEIVER_PUBKEY`.
- [ ] Critical client-side errors are successfully proxied and received as NIP-17 messages.
- [ ] `LOGGER_NSEC` is confirmed to be absent from the client-side bundle.
- [ ] Rate limiting (1 alert/min for identical errors) is functioning across both direct and proxied logs.
- [ ] Errors in the logger itself or the proxy do not crash the application.

## Out of Scope
- Automated replacement of all `console.error` calls (focus on high-priority files).
- Global window error capturing (manual integration preferred for now).
