# Specification: Optimize "For You" Feed

## Overview
This track focuses on enhancing the "For You" feed algorithm to provide more relevant content while significantly improving performance and maintaining a seamless user experience. The goal is to create a feed that feels intelligent, fast, and stable.

## Functional Requirements
- **Stronger Social Graph Weighting:** Increase the relevance of posts from direct follows and mutual connections (people followed by your friends).
- **Deep Interaction Weighting:** Boost content that has high engagement relative to the user's network (zaps, replies, and reactions).
- **Web of Trust (WoT) Integration:** Use calculated WoT scores from the local Dexie database to filter and rank content from the wider network.
- **Interest Matching (NIP-51):** Incorporate user-defined interests into the ranking logic to ensure content aligns with the user's explicit preferences.
- **Dynamic Scoring Engine:** Implement a multi-factor scoring system that balances social signals, interaction depth, and semantic interests.

## Non-Functional Requirements (Performance & UX)
- **Faster Initial Load:** Optimize the retrieval and scoring pipeline to show the first set of items nearly instantaneously upon app launch.
- **Smooth 60FPS Scroll:** Ensure all feed processing (scoring, filtering, rendering) happens without dropping frames, even on mid-range devices.
- **Lower Background Load:** Minimize CPU and memory usage by offloading heavy ranking calculations to background threads (Web Workers).
- **No Blocking Spinners:** Update the feed optimistically and asynchronously; never block user interaction with long-running recalculations.
- **Stable Scroll Position:** Implement logic to prevent "layout shift" or "jumping" when new items are inserted into the feed while the user is scrolling.

## Acceptance Criteria
- [ ] Posts from mutual connections appear higher in the feed than generic trending content.
- [ ] Users can see a measurable reduction in initial feed load time.
- [ ] The feed remains responsive and smooth (60fps) during scrolling.
- [ ] New items appear in the feed without causing the user's current scroll position to jump.
- [ ] Web Workers are utilized for the majority of the scoring and ranking logic.

## Out of Scope
- Implementing new UI components for the feed (only optimizing existing ones).
- Changing the global "Trending" algorithm (focus is strictly on the personalized "For You" feed).
- Real-time notification system updates.
