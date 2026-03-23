# Specification: Bug Fix - Failed to Render Images from Post Content

## Overview
This track addresses multiple issues that caused image and media rendering failures in the post feed. The primary failures were related to layout collapse for images with unknown dimensions, aggressive URL tokenization that left trailing punctuation, and incorrect media identification for URLs with query parameters.

## Functional Requirements
- **Robust Image Rendering**: Images with unknown aspect ratios must not collapse to zero height.
- **Improved URL Cleaning**: URLs with trailing punctuation (e.g., `)`, `]`, `.`, `,`) must be correctly cleaned for media detection.
- **Accurate Media Detection**: Video URLs with query parameters or hashes (e.g., `?v=1`, `#t=10`) must be correctly identified as videos.
- **Consistent Cleaning**: All components rendering content (Feed, Chat) must use the same robust cleaning logic.

## Non-Functional Requirements
- **Performance**: URL cleaning must be efficient and not cause noticeable delays in rendering.
- **Compatibility**: The fix must work with standard Nostr media hosts (nostr.build, primal.net, etc.).

## Acceptance Criteria
- [x] Images with no `imeta` dimensions are visible in the feed.
- [x] URLs ending with punctuation (e.g., Markdown links) are correctly rendered as media.
- [x] Video URLs with query parameters are correctly rendered in the video player.
- [x] Message bubbles in chat also correctly render media with these fixes.

## Out of Scope
- Major refactoring of the NDK tokenize library.
- Implementation of a full-scale media proxy.
