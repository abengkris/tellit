# Implementation Plan - Bug Fix: cant access bookmarks

## Phase 1: Diagnostics and Reproduction
- [ ] Task: Inspect `useBookmarks` hook and `/bookmarks` page logic
    - [ ] Analyze pubkey retrieval logic for manual/remote signers
    - [ ] Check NDK subscription parameters and EOSE handling
- [ ] Task: Reproduce the infinite loading state in a test environment
    - [ ] Create a mock session with a remote signer pubkey
    - [ ] Verify that the bookmark fetch fails to resolve or finds the wrong pubkey
- [ ] Task: Conductor - User Manual Verification 'Diagnostics' (Protocol in workflow.md)

## Phase 2: Implementation of the Fix
- [ ] Task: Fix pubkey resolution in the bookmarks hook
    - [ ] Ensure `currentUser.pubkey` is awaited or correctly tracked from the session store
- [ ] Task: Robust loading state management
    - [ ] Implement a timeout or EOSE-based resolution for the loading state
    - [ ] Ensure "Empty" state is triggered if no events are returned
- [ ] Task: TDD - Write unit tests for `useBookmarks`
    - [ ] Test with extension pubkey
    - [ ] Test with remote signer pubkey
    - [ ] Test with empty result set
- [ ] Task: Conductor - User Manual Verification 'Implementation' (Protocol in workflow.md)

## Phase 3: Final Verification
- [ ] Task: Verify cross-device bookmark syncing
    - [ ] Add a bookmark on another client and verify it appears
- [ ] Task: UI/UX Polish
    - [ ] Ensure the "Empty" state is informative and visually consistent
- [ ] Task: Conductor - User Manual Verification 'Final Verification' (Protocol in workflow.md)
