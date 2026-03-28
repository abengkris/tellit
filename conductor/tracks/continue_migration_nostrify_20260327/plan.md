### **Plan: continue_migration_nostrify_20260327**

#### **Phase 1: Foundation & Local Storage (SQL Store)** [checkpoint: cc5a0c0]
- [x] Task: Set up Nostrify SQL Store (`@nostrify/store/sql`) and establish the base connection and schema. (5ab12d4)
    - [x] Research and implement the appropriate SQL adapter for the project (e.g., PostgreSQL or SQLite).
    - [x] Write failing tests for SQL store initialization and basic CRUD operations.
    - [x] Implement the store and verify that tests pass.
- [x] Task: Replace `NDKCacheAdapterDexie` with Nostrify SQL Store in the global NDK setup (if still needed) or parallelized Nostrify setup. (50c072c)
    - [x] Update `src/lib/ndk.ts` (or equivalent) to initialize Nostrify's store.
    - [x] Write tests to verify that the store is correctly initialized and accessible.
- [x] Task: Implement a data migration strategy (or a clean start) for moving from Dexie to the SQL store. (e84507b)
    - [x] Write failing tests for the migration logic.
    - [x] Implement the migration and verify that tests pass.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Local Storage' (Protocol in workflow.md) (cc5a0c0)

#### **Phase 2: Core Note & Reaction Migration** [checkpoint: 7170c42]
- [x] Task: Migrate Kind 1 (Notes) and Kind 7 (Reactions) logic to use Nostrify's event handling and signing. (a2b8157)
    - [x] Write failing tests for fetching and publishing Kind 1 and Kind 7 events using Nostrify.
    - [x] Implement the migration in `useNostrifyPublish` or equivalent hooks.
    - [x] Refactor components (e.g., `PostCard`, `PostActions`) to use Nostrify's event schema instead of `NDKEvent`.
    - [x] Verify that all tests pass and coverage is >80%.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Core Note & Reaction Migration' (Protocol in workflow.md) (7170c42)

#### **Phase 3: NIP-17 Messaging & Profile Migration** [checkpoint: 037c277]
- [x] Task: Migrate NIP-17 Private Messaging (Kind 1059, 1058, 14) to Nostrify. (7170c42)
    - [x] Write failing tests for NIP-17 messaging flows (send/receive) using Nostrify's messaging policies.
    - [x] Implement the migration in the `useMessages` hook and related services.
    - [x] Verify that messaging remains secure and metadata-resistant.
- [x] Task: Migrate Profile & Metadata (Kind 0) fetching and updating to use Nostrify's signers and stores. (7170c42)
    - [x] Write failing tests for profile fetching and metadata updates.
    - [x] Implement the migration in the `useProfile` hook.
    - [x] Verify profile synchronization across devices.
- [x] Task: Conductor - User Manual Verification 'Phase 3: NIP-17 Messaging & Profile Migration' (Protocol in workflow.md) (037c277)

#### **Phase 4: Feed & Filtering Migration** [checkpoint: 7381425]
- [x] Task: Migrate Feed loading logic and filtering to use Nostrify's policies and pool management. (037c277)
    - [x] Write failing tests for feed fetching with complex filters (e.g., following list, global feed).
    - [x] Implement the migration in `useFeed` and related hooks.
    - [x] Refactor filtering and sorting logic to use Nostrify's patterns.
    - [x] Verify feed performance and real-time update handling.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Feed & Filtering Migration' (Protocol in workflow.md) (7381425)

- [x] Task: Final verification of the entire migration and cleanup of NDK dependencies. (7d65c6d)
    - [x] Conduct a thorough review of the codebase for remaining NDK references.
    - [x] Run the full test suite and verify >80% coverage.
