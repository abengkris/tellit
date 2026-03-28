### **Track: continue_migration_nostrify_20260327**

#### **Overview**
This track focuses on the comprehensive migration of the "Tell it!" application from using NDK (@nostr-dev-kit/ndk) to the Nostrify protocol implementation. The goal is to replace NDK's core functionalities (Notes, Reactions, Messaging, Profiles, and Feed management) with Nostrify's more modern and potentially more performant architecture, while switching to Nostrify's SQL store for local-first persistence.

#### **Functional Requirements**
1.  **Core Note & Reaction Migration:**
    -   Migrate Kind 1 (Notes) and Kind 7 (Reactions) logic to use Nostrify's event handling and signing.
    -   Replace `NDKEvent` usage with Nostrify's event schema and validation.
2.  **NIP-17 Private Messaging Migration:**
    -   Migrate Kind 1059 (Gift Wrap) and underlying Kind 1058 (Seal) / Kind 14 (Rumor) logic to Nostrify.
    -   Ensure metadata-resistant messaging remains functional and secure.
3.  **Profile & Metadata Migration:**
    -   Migrate Kind 0 (Profile Metadata) fetching and updating to use Nostrify's signers and stores.
4.  **Feed & Filtering Migration:**
    -   Migrate feed loading logic, including relay selection and filtering (Kind 1, 6, 7, etc.) to use Nostrify's policies and pool management.
5.  **Local Storage Switch:**
    -   Replace `NDKCacheAdapterDexie` with Nostrify's SQL Store (`@nostrify/store/sql`) for local-first caching and persistence.
    -   Ensure data migration or initialization strategy for the new SQL store.

#### **Non-Functional Requirements**
-   **Performance:** The application must maintain or improve its responsiveness and feed loading speed.
-   **User Experience:** The migration should be seamless to the user, with no loss of data or functionality.
-   **Maintainability:** Use Nostrify's patterns for cleaner, more modern codebase.

#### **Acceptance Criteria**
-   [ ] All Kind 1 (Notes) and Kind 7 (Reactions) are fetched and published using Nostrify.
-   [ ] NIP-17 Private Messaging is fully functional using Nostrify.
-   [ ] User profiles (Kind 0) are correctly resolved and displayed via Nostrify.
-   [ ] All feeds load correctly using Nostrify's policies and pool.
-   [ ] The application uses Nostrify's SQL store for local caching instead of Dexie.
-   [ ] Automated tests for migrated components and hooks pass with >80% coverage.
-   [ ] No regressions in UI performance or user experience are detected during manual verification.

#### **Out of Scope**
-   Migration of Long-form content (Kind 30023) or other less frequently used kinds (unless required for core functionality).
-   Major UI redesigns (unless necessary for the migration).
