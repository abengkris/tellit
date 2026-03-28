### **Track: finalize_nostrify_migration_20260328**

#### **Overview**
This final migration track aims to completely remove NDK (@nostr-dev-kit/ndk) from the core application logic of "Tell it!". While NDK may remain as a peer dependency for certain legacy or highly specialized features during a transition period, all primary user-facing features (Articles, Search, Settings, and Zaps) will be migrated to the Nostrify protocol implementation and its SQL-based local-first storage.

#### **Functional Requirements**
1.  **Long-form Content (Articles) Migration:**
    -   Migrate Kind 30023 (Long-form Content) fetching and publishing to Nostrify.
    -   Update `PremiumArticleContent` and related Article components to handle raw `NostrEvent`.
2.  **Search Functionality Migration:**
    -   Refactor `SearchContent` to use Nostrify's pool and storage for event and user searching.
    -   Implement efficient text-based searching using SQL queries where possible.
3.  **User Status & Settings Migration:**
    -   Migrate Kind 30315 (User Status) to Nostrify.
    -   Refactor handle verification and relay management in Settings to use Nostrify's signers and pool.
4.  **Zaps & Wallet Finalization:**
    -   Update `ZapModal` and wallet logic to use Nostrify's event templates for zap requests.
    -   Ensure consistent balance updates and transaction monitoring using Nostrify-friendly patterns.
5.  **Component & Hook Cleanup:**
    -   Refactor remaining components like `FeedList`, `UserRecommendation`, and `MessageBubbleContent` to accept `NostrEvent`.
    -   Conduct a thorough audit to remove or isolate NDK-specific class usages.

#### **Non-Functional Requirements**
-   **Stability:** The application must remain fully functional during and after the migration.
-   **Performance:** SQL-based search and filtering should be faster than Dexie/NDK-based alternatives.
-   **Code Quality:** Eliminate `any` casts introduced during the gradual migration.

#### **Acceptance Criteria**
-   [ ] All Kind 30023 events are managed via Nostrify.
-   [ ] Search functionality works without active NDK subscriptions.
-   [ ] Settings and profile verification are migrated to Nostrify.
-   [ ] Zap requests and wallet interactions use Nostrify templates.
-   [ ] NDK imports are removed from at least 90% of the `src/` directory.
-   [ ] Full test suite passes without NDK-related timeouts.

#### **Out of Scope**
-   Complete removal of NDK from `node_modules` (may still be needed for certain NIPs not yet fully implemented in Nostrify).
-   Large-scale UI redesigns.
