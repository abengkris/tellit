# Implementation Plan: Migration from NDK to Nostrify (Microblogging Slice)

## Phase 1: Core Nostrify Infrastructure Setup [checkpoint: b7f9ffb]
*Goal: Initialize the foundation for Nostrify with Relays, Signers, and Storage.*

- [x] Task: Install required Nostrify dependencies (`@nostrify/nostrify`, `@nostrify/postgres`, etc.). cd9e77a
- [x] Task: Implement `NSigner` factory/adapter for NIP-07 and Private Key support. 7915edc
- [x] Task: Implement `NRelay` manager to handle multiple relay connections and pools. 1347e17
- [x] Task: Set up `NPostgres` for storage, integrating it with existing Supabase/Postgres infrastructure. 05efb2a
- [x] Task: Define base `NPolicy` for event validation and basic filtering using `NSchema`. b19cdc7
- [x] Task: Conductor - User Manual Verification 'Core Nostrify Infrastructure Setup' (Protocol in workflow.md) b7f9ffb

## Phase 2: Data Fetching and Feed Migration [checkpoint: 4fae3c2]
*Goal: Migrate the read-side of Microblogging from NDK to Nostrify.*

- [x] Task: Create a new `useNostrifyFeed` hook to replace or complement the current feed logic for the Microblogging slice. 906e2cc
- [x] Task: Implement event fetching and streaming logic using `NRelay` and `AsyncGenerators`. 906e2cc
- [x] Task: Integrate `NStore` (NPostgres) for caching and retrieving Kind 1 notes. 906e2cc
- [x] Task: Update the main Home Feed component to use the new `useNostrifyFeed` hook. 21136f7
- [x] Task: Conductor - User Manual Verification 'Data Fetching and Feed Migration' (Protocol in workflow.md) 4fae3c2

## Phase 3: Publishing and Interactive Actions [checkpoint: e78aa12]
*Goal: Migrate the write-side (posting and reacting) from NDK to Nostrify.*

- [x] Task: Create a new `useNostrifyPublish` hook for sending Kind 1 notes and Kind 7 reactions. ea3ae28
- [x] Task: Update the Note Creation component to use Nostrify's `NSigner` and `NRelay` for publishing. 503ccfc
- [x] Task: Update Reaction components (likes, etc.) to use Nostrify. 503ccfc
- [x] Task: Implement optimistic updates for the local `NStore` when publishing. 503ccfc
- [x] Task: Conductor - User Manual Verification 'Publishing and Interactive Actions' (Protocol in workflow.md) e78aa12

## Phase 4: Final Refactoring and Cleanup [checkpoint: 9163ec0]
*Goal: Remove NDK traces from the Microblogging slice and verify performance.*

- [x] Task: Perform a thorough cleanup of unused NDK-related imports and logic in the Microblogging components. db962e1
- [x] Task: Verify 80%+ code coverage for all new Nostrify-based modules and hooks. b0f1ff6
- [x] Task: Measure and document performance (Load time <500ms, Bundle size -20%). 354b934
- [x] Task: Conductor - User Manual Verification 'Final Refactoring and Cleanup' (Protocol in workflow.md) 9163ec0

## Phase: Review Fixes
- [x] Task: Apply review suggestions 70b87dc

