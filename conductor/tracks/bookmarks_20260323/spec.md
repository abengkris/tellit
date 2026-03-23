# Specification: bug fix: cant access bookmarks

## Overview
Users logged in via manual methods or remote signers (NIP-46) are unable to view their bookmarks. The bookmarks page remains in a persistent loading state (loading spinner) and fails to display any saved content from the Nostr network.

## Functional Requirements
- **Authentication Resilience**: Ensure the bookmark retrieval logic correctly identifies and utilizes the active user's pubkey regardless of the login method (Extension, NIP-46, or manual nsec).
- **Graceful Loading State**: The loading spinner must resolve to either a list of bookmarks or an "Empty" state if no bookmarks are found on relays.
- **Protocol Support**: Verify support for standard bookmark event kinds (NIP-51: `Kind 10003` for generic bookmarks and `Kind 30001` for categorized bookmarks).
- **Relay Synchronization**: Ensure the NDK subscription for bookmarks is robust and handles EOSE (End of Stored Events) correctly to stop the loading state.

## Non-Functional Requirements
- **Performance**: Bookmark retrieval should be snappy and utilize local cache (Dexie) before/during relay sync.
- **Reliability**: The system should handle relay timeouts or failures without locking the UI in a loading state.

## Acceptance Criteria
- [ ] Users using manual/remote signers can view their saved bookmarks on the `/bookmarks` page.
- [ ] The loading state resolves within a reasonable timeframe (e.g., < 5 seconds or upon EOSE).
- [ ] New bookmarks added in other clients appear in "Tell it!" after a refresh.
- [ ] An "Empty" state is shown clearly if the user has no bookmarks.

## Out of Scope
- Implementing advanced bookmark folders/categories (unless already partially implemented).
- Migration of bookmarks from other protocols.
