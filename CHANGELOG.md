# Changelog

All notable changes to this project will be documented in this file.

## [0.3.4] - 2026-03-05

### Changed
- **NIP-05 Display:** Improved display of NIP-05 identifiers with a local part of `_` (e.g., `_@domain.com` now shows as `@domain.com` in profiles and search results).
- **Mentions:** Updated `MentionLink` to correctly use the domain as the display name when a user has a `_` NIP-05 identifier and no other name set.

### Added
- **NDK Performance Optimizations:** Implemented validation sampling to reduce main-thread load and improve event processing speed.
- **Invalid Signature Detection:** Added real-time notifications for invalid event signatures received from relays.
- **Organizational Affiliation:** Added support for NIP-05 affiliations. If a user is verified via `name@domain.tld`, the app now automatically checks for a root identity at `_@domain.tld` and displays its profile picture as a small badge next to the user's name (similar to X/Twitter affiliations).
- **Affiliation Hook:** New `useAffiliation` hook for efficient root identity discovery with domain-level caching.
- **Affiliation Info Modal:** Clicking the display name on a profile page now shows a detailed modal explaining the account's organizational affiliation with links to the parent entity.

### Fixed
- **Runtime Stability:** Fixed browser crash issues caused by nested links and redundant hook execution.
- **NIP-05 CORS:** Fixed CORS issues by proxying NIP-05 verification requests through an internal API route.
- **Affiliation Proxy:** Updated organizational affiliation discovery to use the same proxy for better reliability.
- **Hook Optimization:** Simplified `useNIP05` and `useAffiliation` hooks to reduce unnecessary re-renders and improve performance.

## [0.3.3] - 2026-03-04

### Added
- **Lightning Address Support:** Users can now set and update their Lightning Address (LUD-16) in the profile edit modal.
- **Lightning UI:** The Lightning Address is now displayed on the profile page with a dedicated icon.
- **Improved Metadata:** Enhanced profile metadata handling to ensure better parity with other Nostr clients.

## [0.3.2] - 2026-03-03

### Added
- **NIP-88 Polls:** Users can now create and vote on polls (kind 1068 and 1018).
- **Poll UI:** Added a beautiful `PollRenderer` with real-time result updates and progress bars.
- **Poll Management:** Integrated poll creation into the `PostComposer`.
- **Poll Badges:** Added a "Poll" badge to the post header for better discoverability.

## [0.3.1] - 2026-03-03

### Added
- **NIP-18 Quote Posts:** Fully implemented quoting functionality. You can now quote any post with a comment.
- **Improved Feed Rendering:** Reposts and Quotes now correctly display 'q' tag references even if not explicitly linked in the text.
- **Repost UX:** Added a loading skeleton for reposted content to prevent layout shifts and provide better feedback.

## [0.3.0] - 2026-03-03

### Added
- **IndexedDB WoT Cache:** Migrated trust graph storage from localStorage to Dexie (IndexedDB) for massive performance gains and scalability.
- **Spam Shield:** New "Spam Shield" toggle on the home feed to instantly filter out untrusted content.
- **Intersection-based Trust:** Improved ranking algorithm that boosts users followed by multiple mutual trusted contacts.
- **Loader Resilience:** Implemented exponential backoff retry logic for background WoT loading.

### Changed
- **Performance:** Memoized feed ranking logic to ensure buttery smooth scrolling even with large feeds.
- **Data Model:** Extended the WoT cache to store full graph connectivity, enabling more intelligent scoring.

## [0.2.0] - 2026-03-03

### Added
- **NIP-39 External Identities:** Users can now link and verify GitHub, Twitter, Mastodon, and Telegram accounts.
- **NIP-51 Lists:** Full support for "Interests" (hashtags) and "Pinned Posts".
- **Web of Trust (WoT) Caching:** Implemented localStorage caching for WoT graphs with 1-hour expiry and background refreshing to improve load times.
- **Suggested for You:** New page showing depth-2 network suggestions.
- **Pinned Posts:** Pinned posts now appear at the top of the user's profile feed.
- **Native Sharing:** Added a Share button to posts and profiles using the Web Share API.
- **Verification Guide:** Interactive "How to verify?" guide added to the Profile Edit modal.

### Changed
- **Profile Feed:** Completely refactored `useFeed` to handle tab filtering internally, resolving scroll glitches and content resetting.
- **Search:** Enhanced search with NIP-19 support (npub, nevent, etc.) and better UI.
- **Performance:** Optimized dependency handling in `useLists` and `useFeed` to prevent unnecessary re-renders.

### Fixed
- Fixed build errors related to `NDKWoT` serialization and type mismatches.
- Fixed `useMemo` conditional hook call violations in Profile page.
- Removed toast notifications for every new message to reduce noise.
