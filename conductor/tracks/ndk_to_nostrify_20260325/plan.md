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

## Phase 3: Publishing and Interactive Actions
*Goal: Migrate the write-side (posting and reacting) from NDK to Nostrify.*

- [ ] Task: Create a new `useNostrifyPublish` hook for sending Kind 1 notes and Kind 7 reactions.
- [ ] Task: Update the Note Creation component to use Nostrify's `NSigner` and `NRelay` for publishing.
- [ ] Task: Update Reaction components (likes, etc.) to use Nostrify.
- [ ] Task: Implement optimistic updates for the local `NStore` when publishing.
- [ ] Task: Conductor - User Manual Verification 'Publishing and Interactive Actions' (Protocol in workflow.md)

## Phase 4: Final Refactoring and Cleanup
*Goal: Remove NDK traces from the Microblogging slice and verify performance.*

- [ ] Task: Perform a thorough cleanup of unused NDK-related imports and logic in the Microblogging components.
- [ ] Task: Verify 80%+ code coverage for all new Nostrify-based modules and hooks.
- [ ] Task: Measure and document performance (Load time <500ms, Bundle size -20%).
- [ ] Task: Conductor - User Manual Verification 'Final Refactoring and Cleanup' (Protocol in workflow.md)
