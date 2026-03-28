# Article Creator (Kind 30023) Enhancement

Track to transform the current basic Kind 30023 article creator into a professional-grade long-form content tool for the "Tell it!" platform.

## Goals
- Provide a smooth Markdown editing experience with a toolbar.
- Ensure content safety via auto-save and NIP-37 cloud drafts.
- Seamlessly integrate media (Blossom) into the long-form flow.

## Tasks
- [x] **Markdown Toolbar**: Add buttons for Bold, Italic, Links, Images, Quotes, and Headers.
- [x] **Auto-save (Local)**: Periodically save content to `localStorage` to prevent data loss.
- [x] **Blossom Integration**: Add an image upload button that inserts the Blossom URL into the Markdown content.
- [x] **Draft Management**: Improve the UI to list and resume existing drafts (local and cloud).
- [x] **Polished Preview**: Improve the transitions and layout of the preview mode.
- [x] **Slug Validation**: Prevent publishing if the slug (d-tag) conflicts with an existing article.

## Implementation Steps
1. Create a `MarkdownToolbar` component.
2. Integrate `useBlossom` for image uploads.
3. Add `useEffect` for local auto-save.
4. Enhance `src/app/article/new/page.tsx` with these new features.
