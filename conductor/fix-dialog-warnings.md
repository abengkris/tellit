# Plan: Fix Dialog Missing Description Warnings

Fix the Radix UI / shadcn warning: `Missing Description or aria-describedby={undefined} for {DialogContent}` by adding either a visible/hidden `DialogDescription` or explicitly setting `aria-describedby={undefined}`.

## Changes

### 1. Components with explicit headers
Add `DialogDescription` with `sr-only` class to components that have a `DialogHeader` but no description.

- `src/app/[npub]/ProfileContent.tsx` (Profile History Modal)
- `src/components/profile/UserStatusModal.tsx`
- `src/components/common/ZapModal.tsx`
- `src/components/post/parts/ReplyModal.tsx`
- `src/components/post/parts/QuoteModal.tsx`
- `src/components/post/parts/ReportModal.tsx`
- `src/components/post/parts/RawEventModal.tsx`
- `src/components/messages/NewMessageModal.tsx`
- `src/components/common/WalletPinModal.tsx`
- `src/components/common/UserListModal.tsx`
- `src/components/common/RelayModal.tsx`
- `src/components/common/LNPaymentModal.tsx`

### 2. Ad-hoc Dialogs in Pages
Add `aria-describedby={undefined}` to `DialogContent` where a separate description is not needed or doesn't fit the existing layout.

- `src/app/wallet/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/settings/handle/page.tsx`
- `src/components/common/UserIdentity.tsx` (Hover card dialog fallback)
- `src/components/common/Lightbox.tsx`

## Verification
- Monitor the remote NIP-17 logger for any new warnings.
- Manually open the affected modals to ensure no UI regression.
