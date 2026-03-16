# Changelog

All notable changes to this project will be documented in this file.

## [0.7.12] - 2026-03-16

### Added
- **Remote Signer Support (NIP-46):** Users can now log in using Nostr Connect / Bunker URIs. This allows using signers like Amber or other remote signing services.
- **Password-Protected Keys (NIP-49):** Added support for `ncryptsec` login. Users can now use their password-encrypted private keys for a more secure manual login experience.
- **Improved Login UI:** Refactored the login page with a tabbed manual login interface for better organization of nsec, ncryptsec, and Bunker methods.

## [0.7.11] - 2026-03-16

### Added
- **Trending Posts:** Integrated `nostr.wine` trending API into the search/discovery page. Users can now see the most discussed posts (ordered by replies) from the last 24 hours when the search bar is empty.
- **Enhanced useTrendingPosts Hook:** Updated the hook to support custom timeframes (hours), ordering (zaps, reposts, etc.), and automatic NDK event resolution.

## [0.7.10] - 2026-03-16

### Added
- **NDK Debugging:** Integrated NDK network debugging and general NDK logs. Developers can now enable detailed protocol logs by setting `localStorage.debug = 'ndk:*'` in the browser console. Network traffic (REQ/EVENT/CLOSE) can be specifically monitored by including `ndk:net` in the debug string.

## [0.7.9] - 2026-03-09

### Added
- **Wallet Encryption (Storage PIN):** Users can now secure their NWC wallet connection with a PIN. This uses the Web Crypto API (AES-GCM) to encrypt the pairing code before it is stored in `localStorage`.
- **Wallet Locking:** A manual "Lock" button allows users to clear the pairing code from memory immediately. The wallet automatically locks on page reload if a PIN is set.
- **Wallet Privacy Mode:** Added a global "Privacy Mode" toggle that masks wallet balances across the app (Sidebar, Mobile Drawer, Wallet Page).

### Improved
- **Wallet Security:** Masked sensitive inputs like NWC pairing codes with a visibility toggle to prevent "over-the-shoulder" leakage.
- **NWC Integration:** Streamlined the wallet experience to focus exclusively on Nostr Wallet Connect (NWC).

## [0.7.8] - 2026-03-08

### Added
- **Nostr Wallet Connect (NWC):** Integrated `@nostr-dev-kit/wallet` to support secure, cross-device wallet connections via NIP-47.
- **Mobile One-tap Zaps:** Users on mobile can now perform instant zaps using their connected NWC wallet, bypassing the need for browser extensions.
- **Wallet Settings:** Added a dedicated wallet management section in Settings to pair NWC strings and view real-time balances.

### Improved
- **Build Reliability:** Switched to the more stable `@nostr-dev-kit/wallet` package to resolve Vercel deployment and dependency issues.

## [0.7.7] - 2026-03-07

### Added
- **Reactions Modal:** Users can now click on interaction counts (likes, reposts, zaps) to see exactly who reacted to a post.
- **Trending Hashtags:** Added a live trending section to the sidebar that displays popular tags from across the Nostr network, powered by `nostr.band`.

### Improved
- **Discovery:** Integrated "Who to Follow" into the sidebar for better user discovery.
- **Stability:** Fixed cascading render issues in reaction tracking.

## [0.7.6] - 2026-03-07

### Fixed
- **Robust Avatar Loading:** Re-implemented the `Avatar` component with a multi-stage fallback system (Optimized -> Original -> Robohash) and a native `onError` handler to eliminate broken images.
- **Profile Data Resilience:** Improved `useProfile` hook to provide loading states and consistent metadata objects even when relay fetches fail.
- **Mobile UI Polish:** Fixed profile and avatar rendering in the mobile drawer and header for a smoother user experience.

### Improved
- **Metadata Compatibility:** Standardized property access for profile pictures across all components, supporting both `picture` and legacy `image` fields.

## [0.7.4] - 2026-03-07

### Fixed
- **Avatar Rendering:** Resolved an issue where avatar images were appearing broken due to aggressive optimization and strict metadata field requirements.
- **Metadata Compatibility:** Improved support for older Kind 0 profile events by correctly handling both `picture` and `image` fields.
- **Improved Avatar Fallback:** Switched to standard `<img>` tags with robust `onError` handlers for more reliable profile image loading.

## [0.7.3] - 2026-03-07

### Added
- **Poll Creation:** Users can now create interactive polls directly from the post composer.
- **Zap Splits (Collaborators):** Creators can now add collaborators to their posts to automatically split zap proceeds.

### Fixed
- **Mobile Drawer Rendering:** Fixed an issue where the user's avatar and display name were not rendering correctly in the mobile navigation drawer.
- **App-wide Profile Consistency:** Standardized the use of the `Avatar` component and `useProfile` hook across the mobile header, sidebar, and profile pages for optimized metadata fetching and display.
- **Build Compatibility:** Fixed a Vercel deployment error by explicitly forcing the Webpack build engine for PWA compatibility.

## [0.7.2] - 2026-03-07

### Improved
- **Refined Toast System:** Overhauled the toast notification system with smoother animations using `framer-motion`.
- **Toast Features:** Added support for custom display durations and optional action buttons within toast notifications.
- **Modern UI:** Updated toast styling with glassmorphism effects, informative icons, and a countdown progress bar.

## [0.7.1] - 2026-03-07

### Added
- **New DM Search:** Added a "New Message" button to the inbox that allows users to search for people by name, npub, or NIP-05 to start a new private conversation.
- **Relay Latency Tracking:** The network status modal now displays real-time latency (ping) for each connected relay, helping users identify high-performance servers.

### Improved
- **Inbox UX:** Added a "Start a conversation" button for new users with empty inboxes.

## [0.7.0] - 2026-03-07

### Performance Optimizations
- **Instant Feed Loading:** Optimized `useFeed` to fetch from local Dexie cache immediately on app start, providing instant UI feedback while relay connections establish.
- **PWA Service Worker:** Integrated `@ducanh2912/next-pwa` to enable offline support and faster asset loading via a background service worker.

### Improved
- **PWA Configuration:** Enhanced `manifest.ts` and `next.config.ts` for a better standalone "app-like" experience.

## [0.6.8] - 2026-03-07

### Added
- **Rich DM Messaging:** Enabled media (image/video) rendering in direct messages using a new `MessageBubbleContent` component.
- **DM Media Uploads:** Integrated Blossom media uploads directly into the chat interface.
- **Composition Drafts:** Implemented a new `useDrafts` hook to automatically save and restore unsent text in both the main post composer and DM chats.
- **DM Emoji Picker:** Added custom emoji support to the direct messaging interface.

### Fixed
- **One-tap Zap Support:** Correctly passed author information to post actions to enable seamless instant zapping.

## [0.6.7] - 2026-03-07

### Added
- **One-tap Zaps:** Users with a connected WebLN provider (e.g., Alby) can now zap posts instantly with a single click using their default amount.
- **Zap Confetti:** Added a fun confetti animation when a zap is successfully sent or confirmed.
- **Zap Settings:** Added a new setting to configure the default zap amount for one-tap zaps.

### Improved
- **Visual Feedback:** Enhanced the Zap modal and post actions to provide clearer feedback during payment processing.

## [0.6.6] - 2026-03-07

### Improved
- **Optimized Search:** Integrated dedicated search relays (`nostr.band`, `nos.today`) and added debouncing to the search hook for more reliable and efficient results.
- **PWA Enhancements:** Updated manifest with theme colors, standalone display mode, and app shortcuts for a better native experience.
- **Render Stability:** Completed refactoring of `PostCard` and `useSearch` to eliminate remaining cascading render warnings.

## [0.6.5] - 2026-03-07

### Performance Optimizations
- **Optimized Post Stats:** Refactored `usePostStats` to avoid unnecessary resets and cascading renders when switching between posts.
- **Improved React Hook Stability:** Fixed multiple `react-hooks/set-state-in-effect` warnings in `Avatar`, `useMessages`, and `usePostStats` to improve overall app responsiveness and reduce redundant render cycles.

### Improved
- **Standardized Messaging Logic:** Introduced a shared `mapNDKMessage` utility to ensure consistent message and sender/recipient detection between `useMessages` and `useChat`.
- **Refined UI Store:** Improved persistence and state management for UI-related settings.

## [0.6.4] - 2026-03-07

### Performance Optimizations
- **Batch Ancestor Fetching:** Optimized `useThread` to fetch all thread ancestors in a single batch request instead of sequential loop, significantly reducing thread load times.
- **Redundant Fetch Removal:** Streamlined `useProfile` to utilize NDK's cached Kind 0 data, eliminating duplicate network requests for profile metadata.
- **Subscription Hardening:** Improved `useFeed` and `usePostStats` with better subscription management, ensuring old subscriptions are stopped and enabling NDK's `groupable` feature for better relay scaling.
- **Render Optimization:** Fixed cascading renders in `Avatar` and `PostCard` by improving state initialization and memoization.

### Fixed
- **Thread Sorting:** Fixed a bug where replies in a thread were not correctly sorted by time.
- **Real-time Feed Gap:** Fixed a delay where real-time posts were missed during the initial feed history fetch.

## [0.6.3] - 2026-03-07

### Added
- **Settings Page:** Introduced a dedicated settings page (`/settings`) to manage user preferences.
- **Native Browser Notifications:** Added support for opt-in browser notifications for new messages and mentions.
- **Preferences Management:** Users can now toggle Browser Notifications and Web of Trust Strict Mode from the settings page.

### Improved
- **Optimized DM Inbox:** Improved conversation loading and real-time updates in the message list.
- **Reliable Unread Tracking:** Implemented more robust unread message detection using application state tracking.
- **NIP-17 Read Receipts:** Added support for publishing Kind 15 read receipts when reading DMs.

## [0.6.2] - 2026-03-07

### Added
- **Enforced Type Safety:** Enabled `@typescript-eslint/no-explicit-any` as an error in ESLint configuration to ensure stricter type safety across the codebase.

### Fixed
- **Type Refactoring:** Replaced all occurrences of `any` with proper interfaces and specific types in hooks (`useChat`, `useMessages`, `useBlossom`, `usePostStats`), components (`ArticleRenderer`, `Sidebar`, `Avatar`, `ZapModal`), and tests.
- **Async Blossom Integration:** Updated `useBlossom` and `Avatar` component to correctly handle the asynchronous nature of Blossom's URL optimization.

## [0.6.1] - 2026-03-06

### Changed
- **Responsive Images:** Improved image embedding to prevent overflow and "offside" layouts on mobile devices. Images now use `object-cover` within their constrained containers for a more consistent appearance while respecting their aspect ratios.

## [0.6.0] - 2026-03-06

### Added
- **Blurhash Support:** Implemented high-quality image placeholders using Blurhash. Images in posts and the profile media grid now show a smooth, color-matching blur while loading instead of a generic skeleton.
- **Enhanced Media Discovery in Grid:** Improved `MediaGrid` to prioritize `imeta` tags, ensuring better extraction of blurhash strings and more accurate media types.

## [0.5.6] - 2026-03-06

### Fixed
- **Image Rendering Reliability:** Simplified `ImageEmbed` to use original URLs by default, bypassing potentially unreliable optimization servers.
- **Improved Error Feedback:** Added a "Failed to load image" placeholder with a direct link to the media when an image fails to load, improving debuggability and user experience.

## [0.5.5] - 2026-03-06

### Removed
- **Multi-Image Grid:** Reverted the experimental image grid layout. Multiple images in a single post now render in a vertical stack for consistent alignment and simplicity.

## [0.5.4] - 2026-03-06

### Fixed
- **Media Discovery Refinement:** Further refined media URL regex to avoid over-matching and correctly identify multiple URLs separated by newlines or spaces.
- **Smart Media Embedding:** `PostContentRenderer` now automatically upgrades generic URL tokens to media tokens if they have media extensions or associated `imeta` tags, ensuring they are rendered in the visual grid.
- **Grid Layout Consistency:** Improved the image grid layout with forced aspect ratios and height-filling images for a more uniform and polished appearance when multiple images are present.

## [0.5.3] - 2026-03-06

### Fixed
- **Media Discovery:** Fixed a greedy regex bug in the tokenizer that caused media URLs to be missed when multiple URLs were placed on consecutive lines.
- **Media Support:** Added support for `.jfif` image extension.
- **Async Media Fallback:** Improved `AsyncMediaEmbed` to fallback to extension-based identification when `HEAD` requests fail due to CORS or network issues.

## [0.5.2] - 2026-03-06

### Changed
- **Home Feed Enrichment:** Added support for **reposts** (Kind 6, 16) across all main home feed tabs (For You, Following, and Global). This ensures a more consistent and active discovery experience on the home screen.

## [0.5.1] - 2026-03-06

### Changed
- **Repost Handling Optimization:** Kind 6/16 reposts now prioritize parsing the full event JSON directly from the `content` field. This significantly improves load times for reposts and reduces relay load.

## [0.5.0] - 2026-03-06

### Added
- **Multi-Image Grid:** Posts with 2, 3, or 4 images now render in a beautiful, responsive grid layout instead of a vertical stack.
- **Audio Support:** Added `AudioEmbed` component to render and play audio files (mp3, wav, etc.) directly within posts.
- **Async Audio Discovery:** `AsyncMediaEmbed` now correctly identifies and renders audio content-types from URLs without extensions.

### Changed
- **Image Rendering:** Improved `ImageEmbed` with support for custom class names and margin-less rendering for better integration in grid layouts.
- **Content Parsing:** Updated `PostContentRenderer` to prioritize media grouping and handle the new audio token type.

## [0.4.4] - 2026-03-06

### Fixed
- **TypeScript Build Error:** Resolved a type mismatch between `NDKWoT` and `CachedWoT` by centralizing trust score access in the `useWoT` hook.

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
