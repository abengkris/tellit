# NIP-05 Security & Flow Improvements

Track to implement recommendations from the audit of the NIP-05 registration system, focusing on session security and rate limiting.

## Status
- [x] Implement NIP-98 (Authenticated HTTP Requests) or similar for session verification in `dal.ts`.
- [x] Add rate limiting to registration and payment check endpoints.
- [x] Add explicit logging for `conflict` registrations to alert admins.
- [x] Improve handle ownership checks to prevent unauthorized primary handle toggling.
- [x] Verify all changes with integration tests.
