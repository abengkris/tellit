# Changelog

All notable changes to this project will be documented in this file.

## [0.4.3] - 2026-03-06

### Changed
- **"For You" Algorithm Refinement:** Improved the scoring engine with a more robust logarithmic freshness decay and increased weights for social signals.
- **WoT Integration:** Integrated Web of Trust (WoT) trust scores into the feed scoring algorithm via `useScoringContext`, allowing for better content prioritization from trusted sources.

## [0.4.2] - 2026-03-06

### Fixed
- **TypeScript Build Error:** Fixed a narrowing error in `useFeed.ts` that caused build failures on Vercel due to an unreachable type comparison.

## [0.4.1] - 2026-03-06

### Changed
- **Profile Feed Enrichment:** The "posts" tab on the profile page now includes **reposts** (Kind 6, 16), **polls** (Kind 1068), and **quote posts**. This ensures a more complete view of a user's activity.
- **Improved Filter Logic:** Refined `useFeed` filter to correctly categorize Kind 1111 as replies and ensure reposts are always treated as primary posts in the profile context.

## [0.4.0] - 2026-03-06

### Added
- **Visual Media Grid:** The profile "media" tab now features a high-performance 3-column visual grid (Instagram-style) instead of a standard vertical feed. This allows for a more immersive browsing experience for photos and videos.
- **Enhanced Media Discovery:** Updated `useFeed` and the media tab to support **NIP-92 (Kind 20)** and **NIP-94 (Kind 1063)** for better discovery of files and media uploaded via various Nostr clients.
- **NIP-94/92 Rendering:** `MediaGrid` now intelligently extracts media from `url` tags, `imeta` tags, and kind 30023 hero images, in addition to standard kind 1 content scanning.

### Changed
- **Feed Logic:** Improved the media filtering logic in `useFeed` to use the primary tokenizer for more accurate URL discovery and to avoid over-fetching irrelevant events.

## [0.3.9] - 2026-03-06

### Changed
- **Follow Button Refinement:** Updated the `FollowButton` to use the primary `blue-500` brand color for the "Follow" state. Improved the "Following/Unfollow" state with better color contrast and a dedicated hover effect for clearer user interaction.

## [0.3.8] - 2026-03-06

### Changed
- **Zap UI Optimization:** Removed the standalone Zap button from the profile header. Zaps can now be triggered by directly clicking on the Lightning Address (LUD-16) in the profile details, simplifying the UI and emphasizing the payment address.

## [0.3.7] - 2026-03-06

### Added
- **Documentation:** Created `VERIFICATION.md` to document NIP-05 verification and organizational affiliation concepts, including badge color rules and root identity discovery logic.

## [0.3.6] - 2026-03-06

### Changed
- **Verified Badge Differentiation:** The verified check mark (`BadgeCheck`) now uses different colors based on the account type: **Blue** (`text-blue-500`) for general verified users and **Orange** (`text-amber-500`) for organizational/root identities (NIP-05 ending in `_@domain.tld` or `domain@domain.tld`).

## [0.3.5] - 2026-03-06

### Changed
- **Affiliation Discovery:** Enhanced the organizational affiliation tracking to support a fallback to `domain@domain.tld` if the standard root identifier (`_@domain.tld`) is not found. This provides better compatibility with organizations that use their domain name as their primary NIP-05.
- **Affiliation Logic:** Improved `useAffiliation` hook with internal failure caching (caching `null`) to prevent redundant network requests for domains without identifiable organizational root identities.
- **Root Identity Recognition:** Users whose NIP-05 already matches the organization's name (e.g., `primal@primal.net`) are now correctly recognized as root identities, suppressing redundant affiliation badges on their own profiles.

## [0.3.4] - 2026-03-05

### Changed
- **NIP-05 Display:** Improved display of NIP-05 identifiers with a local part of `_` (e.g., `_@domain.com` now shows as `@domain.com` in profiles and search results).
- **Mentions:** Updated `MentionLink` to correctly use the domain as the display name when a user has a `_` NIP-05 identifier and no other name set.

### Added
- **Media Optimization (BUD-05):** Integrated Blossom media optimization. The app now requests resized and optimized images from Blossom servers, significantly reducing load times and data usage for avatars and post media.
- **Blossom URL Healing:** Implemented automatic URL healing for media. The app now uses the Blossom protocol to resolve broken media links by checking the author's preferred Blossom servers.
- **Enhanced useBlossom Hook:** Added `fixUrl` and `listBlobs` capabilities to the Blossom hook for better media management and discovery.
- **Search URL Parameters:** Added support for `?q=` URL parameter on the search page, enabling direct linking to search results and synchronizing search state with the browser address bar.
- **Optimistic Publishing:** Implemented optimistic publishing for posts, articles, reposts, and reactions. The UI now updates immediately without waiting for relay confirmation.
- **Unpublished Event Recovery:** The app now automatically detects and retries publishing events that failed in previous sessions by checking the local cache on startup.
- **Global Publish Failure Handling:** Added a global listener for event publishing failures with user-friendly toast notifications.
- **Improved Replaceable Events:** Updated profile updates, status changes, and follow lists to use `publishReplaceable()`, ensuring proper event sequencing and avoiding ID conflicts.
- **Enhanced NIP-19 Support:** Improved handling of Nostr identifiers (npub, nprofile, nevent, naddr) throughout the app.
- **Robust Search:** Search now leverages NDK's `fetchUser` and `fetchEvent` to provide reliable direct results for NIP-19 strings and NIP-05 identifiers.
- **NIP-19 Utilities:** Expanded utility functions in `lib/utils/nip19.ts` with comprehensive encoding/decoding for complex NIP-19 types.
- **Multi-Account Support:** Migrated to `@nostr-dev-kit/sessions` for robust multi-account management. Users can now maintain multiple sessions with persistent storage.
- **Session Persistence:** Login states, follows, mutes, and relay lists are now automatically persisted and restored between app launches using `NDKSessionManager`.
- **Automatic Data Fetching:** Added automatic background fetching of user profile data, contact lists, and mute lists upon login.
- **Cache-First Feed:** Optimized `useFeed` to use the `onEvents` handler for batch-processing initial cached results, enabling near-instant feed loading.
- **Relay Goal Optimization:** Improved contact list fetching in `useFollowing` with specified relay goals for better reliability.
- **Subscription Grouping:** Leveraged NDK's intelligent subscription grouping to reduce relay load by batching multiple requests (e.g., profile fetches and post stats) into single `REQ` commands.
- **Immediate Feed Loading:** Optimized `useFeed` to disable grouping for initial loads, ensuring the fastest possible time-to-first-post for users.
- **Filter Validation:** Enabled NDK filter validation in `fix` mode. This automatically cleans up `undefined` or invalid values in subscription filters, preventing runtime errors in cache adapters and relays.
- **NDK Performance Optimizations:** Implemented validation sampling to reduce main-thread load and improve event processing speed.
- **Relay Protection:** The app now automatically disconnects from relays that send too many invalid event signatures (threshold: 5).
- **Throttled Notifications:** Invalid signature warnings are now throttled to prevent UI overwhelming and potential browser crashes.
- **Organizational Affiliation:** Added support for NIP-05 affiliations. If a user is verified via `name@domain.tld`, the app now automatically checks for a root identity at `_@domain.tld` and displays its profile picture as a small badge next to the user's name (similar to X/Twitter affiliations).
- **Affiliation Hook:** New `useAffiliation` hook for efficient root identity discovery with domain-level caching.
- **Affiliation Info Modal:** Clicking the display name on a profile page now shows a detailed modal explaining the account's organizational affiliation with links to the parent entity.

### Fixed
- **Linting & Stability:** Fixed multiple critical linting issues including cascading renders in hooks/providers, unescaped entities, and invalid ref access in VideoEmbed.
- **Search Layout:** Fixed horizontal overflow issues on the search page by isolating scroll containers and refining text truncation for long identifiers.
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
