# Implementation Plan: Build Web of Trust (wot_20260321)

## Phase 1: Core WoT Infrastructure [checkpoint: e98260c]
Implement the fundamental data structures and background processes for the Web of Trust.

- [~] Task: Extend Dexie schema for follows and trust scores
    - [x] Update `src/lib/db.ts` to include `follows` and `wotScores` tables (a977c45)
    - [x] Add migration logic for existing users (a977c45)
- [x] Task: Implement asynchronous follow-graph crawler (60d1f48)
    - [x] Create `src/lib/wot/crawler.ts` to fetch Kind 3 events (follows) from relays (60d1f48)
    - [x] Implement depth-limited (Depth=2) BFS to discover trusted profiles (60d1f48)
- [x] Task: Implement basic scoring algorithm (e3612d8)
    - [x] Create `src/lib/wot/scoring.ts` to calculate scores based on follow distances (e3612d8)
    - [x] Store results in the `wotScores` table in Dexie (e3612d8)
- [x] Task: Conductor - User Manual Verification 'Phase 1: Core WoT Infrastructure' (Protocol in workflow.md) (38b38c3)

## Phase 2: Integration & UI Components [checkpoint: 5e56573]
Expose the WoT data through hooks and update the UI with trust indicators.

- [x] Task: Create `useWoT` custom hook (f8ee6db)
    - [x] Implement `src/hooks/useWoT.ts` to provide real-time trust scores for any pubkey (f8ee6db)
    - [x] Ensure hook utilizes Dexie for near-instant data retrieval (f8ee6db)
- [x] Task: Add trust indicators to post components (3d80094)
    - [x] Update `src/components/post/PostHeader.tsx` to display trust badges based on WoT score (3d80094)
    - [x] Implement subtle tooltips explaining the trust relationship (3d80094)
- [x] Task: Add WoT status to profile view (3d80094)
    - [x] Update `src/app/[npub]/page.tsx` to show a 'Trusted by [N] friends' indicator (3d80094)
- [x] Task: Conductor - User Manual Verification 'Phase 2: Integration & UI Components' (Protocol in workflow.md) (3d80094)

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
