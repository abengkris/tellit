# Implementation Plan - Bug Fix: cant access bookmarks

## Phase 1: Diagnostics and Reproduction
- [x] Task: Inspect `useBookmarks` hook and `/bookmarks` page logic
    - [x] Analyze pubkey retrieval logic for manual/remote signers
    - [x] Check NDK subscription parameters and EOSE handling
- [x] Task: Reproduce the infinite loading state in a test environment
    - [x] Create a mock session with a remote signer pubkey
    - [x] Verify that the bookmark fetch fails to resolve or finds the wrong pubkey
- [x] Task: Conductor - User Manual Verification 'Diagnostics' (Protocol in workflow.md)

## Phase 2: Implementation of the Fix
- [x] Task: Fix pubkey resolution in the bookmarks hook
    - [x] Ensure `currentUser.pubkey` is awaited or correctly tracked from the session store
- [x] Task: Robust loading state management
    - [x] Implement a timeout or EOSE-based resolution for the loading state
    - [x] Ensure "Empty" state is triggered if no events are returned
- [x] Task: TDD - Write unit tests for `useBookmarks`
    - [x] Test with extension pubkey
    - [x] Test with remote signer pubkey
    - [x] Test with empty result set
- [x] Task: Conductor - User Manual Verification 'Implementation' (Protocol in workflow.md)

## Phase 3: Final Verification
- [x] Task: Verify cross-device bookmark syncing
    - [x] Add a bookmark on another client and verify it appears
- [x] Task: UI/UX Polish
    - [x] Ensure the "Empty" state is informative and visually consistent
- [x] Task: Conductor - User Manual Verification 'Final Verification' (Protocol in workflow.md)

## Phase: Review Fixes
- [x] Task: Apply review suggestions 37639d9
