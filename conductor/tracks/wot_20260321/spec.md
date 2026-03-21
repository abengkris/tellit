# Specification: Build Web of Trust

## Goal
Implement a performant Web of Trust (WoT) system for **Tell it!** that enhances content discovery and trust while maintaining the application's local-first, high-speed user experience.

## Objectives
- **On-Demand Scoring:** Calculate trust scores asynchronously to prevent UI blocking.
- **Local-First WoT:** Persist WoT data in Dexie for near-instant access during sessions.
- **Visual Trust Indicators:** Provide subtle, non-intrusive trust indicators in the feed and profile views.
- **Efficient Syncing:** Optimize relay subscriptions to fetch trust data (Kind 3/follows) without overloading the network.

## Technical Requirements
- **Storage:** Expand Dexie schema to store follow relationships and calculated trust scores.
- **Algorithm:** Implement a simple, iterative WoT algorithm (e.g., depth-limited follow graph) that runs in a Web Worker if necessary.
- **NDK Integration:** Utilize NDK to fetch and subscribe to follow lists from trusted seeds.
- **UX:** Maintain the "Pure Optimistic UI" by showing content immediately and updating trust indicators as background calculations complete.

## User Stories
- As a user, I want to see which posts are from people I trust or people my friends trust.
- As a user, I want the app to remain fast even when calculating complex trust relationships.
- As a user, I want to understand why a certain profile is considered 'trusted' by the system.
