# Specification: Migration from NDK to Nostrify (Microblogging Slice)

## Overview
This track initiates the transition of the "Tell it!" application from NDK to the Nostrify framework. We are adopting an incremental migration strategy, starting with the core Microblogging (Notes and Home Feed) functionality. This includes implementing Nostrify's modular interfaces for relays, signing, and storage, specifically leveraging `NPostgres` with Supabase for persistent event storage.

## Functional Requirements
- **NRelay Integration**: Implement `NRelay` for managing connections to Nostr relays, replacing NDK's relay pool management for the Microblogging slice.
- **NSigner Implementation**: Implement `NSigner` for cryptographic operations (NIP-07 browser extension or private key), replacing NDK's signer interface.
- **NPostgres Storage (Supabase)**: Replace the current Dexie-based local-first caching for the Microblogging slice with `NStore` using the `NPostgres` adapter connected to Supabase.
- **Microblogging Core**:
    - Fetching and displaying text notes (Kind 1) from relays.
    - Publishing new text notes (Kind 1) using Nostrify's `NRelay` and `NSigner`.
    - Support for reactions (Kind 7) related to notes.
- **Validation**: Utilize Nostrify's `NSchema` (Zod-based) for all event and relay message validation.
- **Policy Engine**: Implement a basic `NPolicy` for initial event filtering and moderation.

## Non-Functional Requirements
- **Performance**: The Home Feed should load in under 500ms.
- **Bundle Efficiency**: Aim for a 20% reduction in the initial JavaScript bundle size related to Nostr protocol handling.
- **Type Safety**: Use TypeScript and Zod for strict interface definitions and runtime validation.
- **Modularity**: Ensure that the Nostrify implementation is highly decoupled, allowing for easy replacement of individual modules (e.g., swapping storage backends).

## Acceptance Criteria
- [ ] Users can successfully log in using their Nostr identity (via `NSigner`).
- [ ] The Home Feed displays notes (Kind 1) fetched using `NRelay` and `NStore` (NPostgres).
- [ ] Users can publish new text notes and reactions.
- [ ] No NDK-related code remains within the Microblogging/Note-related components or hooks.
- [ ] All incoming events are validated against `NSchema`.
- [ ] Performance and bundle size targets are met and verified.

## Out of Scope
- Migration of NIP-17 Private Messaging (to be handled in a subsequent track).
- Migration of User Status (Kind 30315) and Long-form Content (Kind 30023).
- Implementation of advanced Web of Trust (WoT) features within Nostrify.
- Complete removal of NDK from the entire repository (only the Microblogging slice is targeted here).
