### **Plan: finalize_nostrify_migration_20260328**

#### **Phase 1: Component & Basic Kind Migration** [checkpoint: 7beb6f7]
- [x] Task: Refactor Kind 30315 (User Status) logic to use Nostrify. (7beb6f7)
    - [x] Update `useUserStatus` hook.
    - [x] Update components displaying status.
- [x] Task: Update `FeedList` and `MessageBubbleContent` to use raw `NostrEvent`. (7beb6f7)
    - [x] Audit props and internal logic.
    - [x] Verify rendering with both NDK and Nostrify events (if still needed).
- [x] Task: Migrate `UserRecommendation` and related discovery components. (7beb6f7)

#### **Phase 2: Articles & Long-form Content** [checkpoint: b3151fb]
- [x] Task: Migrate Kind 30023 fetching and display. (b3151fb)
    - [x] Update `PremiumArticleContent` and `ArticleView`.
    - [x] Write failing tests for article resolution using Nostrify.
- [x] Task: Migrate Article publishing logic. (b3151fb)
    - [x] Update `ArticleComposer` (or equivalent) to use Nostrify templates.

#### **Phase 3: Search & Settings Migration** [checkpoint: 5732b70]
- [x] Task: Refactor `SearchContent` to use SQL store and relay pool. (5732b70)
    - [x] Implement text-based search queries using Nostrify storage.
    - [x] Verify search results consistency with previous NDK implementation.
- [x] Task: Migrate Settings (Relays, Handle Verification). (5732b70)
    - [x] Update `RelayModal` and `RelayStatus` hook.
    - [x] Refactor `VerifyHandle` logic to use Nostrify signers.

#### **Phase 4: Zaps, Wallets & Final Cleanup**
- [~] Task: Migrate `ZapModal` and Zap Request templates.
- [ ] Task: Conduct a final audit and remove redundant NDK code.
    - [ ] Search for remaining `new NDKEvent` or `new NDKUser` calls.
    - [ ] Remove unused NDK-related hooks and utilities.
- [ ] Task: Conductor - Final full suite verification.
