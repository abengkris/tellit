# Specification: Upgrade Next.js to Latest Stable

## Overview
Upgrade the "Tell it!" application from Next.js 16.1.6 to the latest stable version (16.2.1) using the official `npx next upgrade` tool. This track also includes updating core peer dependencies like React and Vercel-specific monitoring tools.

## Functional Requirements
- **Upgrade Execution**: Successfully execute `npx next upgrade` to update `next`, `react`, and `react-dom`.
- **Dependency Alignment**: Update `@vercel/analytics` and `@vercel/speed-insights` to their latest versions compatible with the new Next.js version.
- **Config Verification**: Ensure `next.config.ts` and `tsconfig.json` remain compatible with the new version.
- **Regression Testing**: Verify that the application builds and runs without errors after the upgrade.

## Non-Functional Requirements
- **Build Performance**: The upgrade should not negatively impact the recently optimized build times.
- **Type Safety**: Maintain full TypeScript compatibility and resolve any new type errors introduced by the upgrade.

## Acceptance Criteria
- [ ] `package.json` reflects Next.js version 16.2.1 (or latest stable).
- [ ] Application starts successfully in development mode (`npm run dev`).
- [ ] Production build completes successfully (`npm run build`).
- [ ] No regression in core Nostr functionality (DMs, Microblogging, WoT).

## Out of Scope
- Migrating to major version changes (e.g., Next.js 17) if released during this track.
- Adding new features unrelated to the framework upgrade.
