# Specification: Feed Performance and UX Optimization

## Overview
Optimize the feed rendering performance and user experience to ensure smooth scrolling, fast initial load, and a polished interaction model.

## Functional Requirements
- **Smooth Virtualization**: Refine virtualization parameters to eliminate jitter during scrolling.
- **Improved Loading States**: Use more accurate skeletons to minimize layout shift.
- **Fast Data Retrieval**: Leverage NDK parallel cache/relay fetching for faster initial feed display.
- **UX Polish**: Add helpful navigation aids like "Back to top" and improved loading indicators.

## Non-Functional Requirements
- **Rendering Performance**: Maintain 60fps scrolling on mid-range devices.
- **Layout Stability**: Reduce Cumulative Layout Shift (CLS) during feed population.

## Acceptance Criteria
- [ ] Scrolling the feed is smooth with minimal jitter.
- [ ] The initial feed load displays cached content nearly instantly.
- [ ] Skeletons closely match the final post structure.
- [ ] A "Back to top" button appears after scrolling significantly.
- [ ] Loading indicators are visually consistent and non-distracting.

## Out of Scope
- Complete redesign of the PostCard.
- Changes to the backend scoring logic (except batching/timing).
