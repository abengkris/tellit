# Implementation Plan - Integrate NIP-17 Error Logger

This plan outlines the steps to integrate the NIP-17 Error Logger into the "Tell it!" codebase, including a secure proxy for client-side errors.

## Phase 1: Secure Client-Side Logging Foundation [checkpoint: acd79fa]

- [x] Task: Implement Logger Proxy API [751bc60]
    - [ ] Create `src/app/api/log/route.ts`
    - [ ] Implement POST handler that uses `NostrifyLogger`
    - [ ] Add basic payload validation and rate limit headers
- [x] Task: Create Client-Side Logger Utility [2eed027]
    - [ ] Create `src/lib/logger/client.ts`
    - [ ] Implement `clientLogger` with `error` and `fatal` methods
    - [ ] Ensure it uses `fetch` to call `/api/log`
- [x] Task: TDD - Verify Proxy and Client Utility [10824e1]
    - [ ] Write tests in `src/lib/logger/__tests__/client.test.ts`
    - [ ] Verify that client logs reach the server without exposing `LOGGER_NSEC`
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Secure Client-Side Logging Foundation' (Protocol in workflow.md)

## Phase 2: Infrastructure and Sync Integration [checkpoint: eff0a16]

- [x] Task: Integrate into Database and Storage [3f1d382]
    - [ ] Update `src/lib/db.ts` to log connection failures
    - [ ] Update `src/lib/nostrify-sql-store.ts` to log SQL errors
- [x] Task: Integrate into Sync Engine [b2e45df]
    - [ ] Identify critical failure points in the sync logic
    - [ ] Replace `console.error` with `logger.error` (server) or `clientLogger.error` (client)
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Infrastructure and Sync Integration' (Protocol in workflow.md)

## Phase 3: Server Actions and Middleware Integration

- [x] Task: Audit and Update Server Actions [b710a10]
    - [ ] Integrate logger into NIP-05 registration actions
    - [ ] Integrate logger into publishing and profile update actions
- [ ] Task: Middleware and API Route Hardening
    - [ ] Add error logging to high-traffic API routes (e.g., `/api/nip05/*`)
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Server Actions and Middleware Integration' (Protocol in workflow.md)

## Phase 4: Client Hook and UI Boundary Integration

- [ ] Task: Integrate into Core Hooks
    - [ ] Update `src/hooks/useNDK.ts` to log initialization failures
    - [ ] Update `src/hooks/useWallet.ts` to log payment/connection errors
- [ ] Task: UI Error Boundary Integration
    - [ ] Update `src/app/error.tsx` and `src/app/global-error.tsx` to use `clientLogger`
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Client Hook and UI Boundary Integration' (Protocol in workflow.md)

## Phase 5: Final Verification and Registry Update

- [ ] Task: Final End-to-End Validation
    - [ ] Trigger a mock fatal error in both client and server
    - [ ] Confirm reception at `RECEIVER_PUBKEY`
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Final Verification and Registry Update' (Protocol in workflow.md)
