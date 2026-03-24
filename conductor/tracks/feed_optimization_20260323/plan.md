# Implementation Plan: Feed Performance and UX Optimization

## Phase 1: Performance Tuning
- [x] Task: Optimize `FeedList` virtualization parameters
    - [x] Increase overscan for smoother scrolling
    - [x] Refine `estimateSize` to match average post height
- [x] Task: Implement better batching in `useForYouFeed` and `usePausedFeed`
    - [x] Adjust buffer timeouts and limits to reduce re-renders
- [x] Task: Leverage `NDKSubscriptionCacheUsage.PARALLEL` for initial feed load
- [x] Task: Conductor - User Manual Verification 'Performance' (Protocol in workflow.md)

## Phase 2: UX Enhancements
- [x] Task: Create a high-fidelity `PostSkeleton` component
    - [x] Match avatar, name, and content structure precisely
- [x] Task: Add "Back to Top" button in `HomeContent`
    - [x] Show only when scrolled down > 1000px
- [x] Task: Improve "Loading More" indicator
    - [x] Add a subtle text indicator or a more polished animation
- [x] Task: Conductor - User Manual Verification 'UX' (Protocol in workflow.md)

## Phase 3: Final Polish
- [x] Task: Run performance benchmarks (manual)
- [x] Task: Document optimizations in `CHANGELOG.md`
- [x] Task: Conductor - User Manual Verification 'Final' (Protocol in workflow.md)
