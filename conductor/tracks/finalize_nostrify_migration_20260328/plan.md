### **Plan: finalize_nostrify_migration_20260328**

#### **Phase 1: Component & Basic Kind Migration**
- [~] Task: Refactor Kind 30315 (User Status) logic to use Nostrify.
    - [ ] Update `useUserStatus` hook.
    - [ ] Update components displaying status.
- [ ] Task: Update `FeedList` and `MessageBubbleContent` to use raw `NostrEvent`.
    - [ ] Audit props and internal logic.
    - [ ] Verify rendering with both NDK and Nostrify events (if still needed).
- [ ] Task: Migrate `UserRecommendation` and related discovery components.

#### **Phase 2: Articles & Long-form Content**
- [ ] Task: Migrate Kind 30023 fetching and display.
    - [ ] Update `PremiumArticleContent` and `ArticleView`.
    - [ ] Write failing tests for article resolution using Nostrify.
- [ ] Task: Migrate Article publishing logic.
    - [ ] Update `ArticleComposer` (or equivalent) to use Nostrify templates.

#### **Phase 3: Search & Settings Migration**
- [ ] Task: Refactor `SearchContent` to use SQL store and relay pool.
    - [ ] Implement text-based search queries using Nostrify storage.
    - [ ] Verify search results consistency with previous NDK implementation.
- [ ] Task: Migrate Settings (Relays, Handle Verification).
    - [ ] Update `RelayModal` and `RelayStatus` hook.
    - [ ] Refactor `VerifyHandle` logic to use Nostrify signers.

#### **Phase 4: Zaps, Wallets & Final Cleanup**
- [ ] Task: Migrate `ZapModal` and Zap Request templates.
- [ ] Task: Conduct a final audit and remove redundant NDK code.
    - [ ] Search for remaining `new NDKEvent` or `new NDKUser` calls.
    - [ ] Remove unused NDK-related hooks and utilities.
- [ ] Task: Conductor - Final full suite verification.
