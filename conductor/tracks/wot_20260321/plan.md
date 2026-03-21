# Implementation Plan: Build Web of Trust (wot_20260321)

## Phase 1: Core WoT Infrastructure
Implement the fundamental data structures and background processes for the Web of Trust.

- [~] Task: Extend Dexie schema for follows and trust scores
    - [x] Update `src/lib/db.ts` to include `follows` and `wotScores` tables (a977c45)
    - [x] Add migration logic for existing users (a977c45)
- [ ] Task: Implement asynchronous follow-graph crawler
    - [ ] Create `src/lib/wot/crawler.ts` to fetch Kind 3 events (follows) from relays
    - [ ] Implement depth-limited (Depth=2) BFS to discover trusted profiles
- [ ] Task: Implement basic scoring algorithm
    - [ ] Create `src/lib/wot/scoring.ts` to calculate scores based on follow distances
    - [ ] Store results in the `wotScores` table in Dexie
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Core WoT Infrastructure' (Protocol in workflow.md)

## Phase 2: Integration & UI Components
Expose the WoT data through hooks and update the UI with trust indicators.

- [ ] Task: Create `useWoT` custom hook
    - [ ] Implement `src/hooks/useWoT.ts` to provide real-time trust scores for any pubkey
    - [ ] Ensure hook utilizes Dexie for near-instant data retrieval
- [ ] Task: Add trust indicators to post components
    - [ ] Update `src/components/post/PostHeader.tsx` to display trust badges based on WoT score
    - [ ] Implement subtle tooltips explaining the trust relationship
- [ ] Task: Add WoT status to profile view
    - [ ] Update `src/app/[npub]/page.tsx` to show a 'Trusted by [N] friends' indicator
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Integration & UI Components' (Protocol in workflow.md)

## Phase 3: Performance Optimization & Testing
Refine the system to ensure it meets our speed and UX standards.

- [ ] Task: Offload scoring to a Web Worker
    - [ ] Move the BFS and scoring logic to a dedicated Web Worker to keep the main thread responsive
- [ ] Task: Implement background sync and reconciliation
    - [ ] Ensure WoT data stays up-to-date with periodic relay syncs
- [ ] Task: Full integration testing
    - [ ] Write Vitest tests for scoring logic and Dexie interactions
    - [ ] Perform manual UX audit for UI responsiveness
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Performance Optimization & Testing' (Protocol in workflow.md)
