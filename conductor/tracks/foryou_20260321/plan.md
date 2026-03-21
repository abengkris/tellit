# Implementation Plan: Optimize "For You" Feed (foryou_20260321)

## Phase 1: Foundation & Scoring Interface [checkpoint: 6abdc8a]
Establish the core data structures and the background communication bridge for the scoring engine.

- [x] Task: Define scoring types and ranking signals (964ff25)
    - [x] Create `src/lib/feed/types.ts` for scoring interfaces (964ff25)
    - [x] Document weight constants for social, interaction, and interest signals (964ff25)
- [x] Task: Scaffold the scoring Web Worker (964ff25)
    - [x] Create `src/lib/feed/scoring.worker.ts` (964ff25)
    - [x] Implement request/response protocol for batch scoring (964ff25)
- [x] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Scoring Interface' (Protocol in workflow.md) (6abdc8a)

## Phase 2: Signal Data Retrieval [checkpoint: 729c33c]
Implement the logic to gather all inputs needed for the ranking algorithm.

- [x] Task: Implement WoT signal extractor (373c802)
    - [x] Create `src/lib/feed/signals/wot.ts` to fetch local WoT scores (373c802)
    - [x] Write tests for WoT signal mapping (373c802)
- [x] Task: Implement Interest signal extractor (NIP-51) (30cdd53)
    - [x] Create `src/lib/feed/signals/interests.ts` to map user interests to post tags (30cdd53)
    - [x] Write tests for interest-based semantic matching (30cdd53)
- [x] Task: Implement Social Graph signal extractor (c3c7be1)
    - [x] Create `src/lib/feed/signals/social.ts` to identify mutual follows and interaction depth (c3c7be1)
    - [x] Write tests for mutual follow detection (c3c7be1)
- [x] Task: Conductor - User Manual Verification 'Phase 2: Signal Data Retrieval' (Protocol in workflow.md) (ab292a5)

## Phase 3: Scoring Engine Implementation
Build the algorithm that combines all signals into a single ranking score.

- [x] Task: Implement core ranking algorithm in Web Worker (ab292a5)
    - [x] Develop the scoring logic in `src/lib/feed/scoring.worker.ts` (ab292a5)
    - [x] Implement additive weighting for combined signals (ab292a5)
- [x] Task: Write integration tests for the scoring engine (ab292a5)
    - [x] Create `src/lib/feed/__tests__/scoring.test.ts` (ab292a5)
    - [x] Verify ranking order for various signal combinations (ab292a5)
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Scoring Engine Implementation' (Protocol in workflow.md)

## Phase 4: Feed Integration & UX Stability
Integrate the optimized engine into the UI and ensure a smooth user experience.

- [ ] Task: Integrate Scoring Engine into `useForYouFeed`
    - [ ] Update `src/hooks/useForYouFeed.ts` to offload ranking to the Web Worker
    - [ ] Implement optimistic rendering for the first set of items
- [ ] Task: Implement Scroll Position Stability
    - [ ] Add logic to `src/components/feed/FeedList.tsx` to handle background updates without jumping
    - [ ] Write tests for scroll-stable insertion logic
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Feed Integration & UX Stability' (Protocol in workflow.md)

## Phase 5: Final Optimization & UX Audit
Perform final tuning and ensure all non-functional requirements are met.

- [ ] Task: Performance Benchmarking & Tuning
    - [ ] Audit CPU/Memory usage during large feed updates
    - [ ] Refine batch sizes for scoring to ensure 60fps
- [ ] Task: Full UX Audit
    - [ ] Verify "No Blocking Spinners" across different network conditions
    - [ ] Perform manual mobile responsiveness check
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Final Optimization & UX Audit' (Protocol in workflow.md)
