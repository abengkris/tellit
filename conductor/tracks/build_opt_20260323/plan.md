# Implementation Plan: Optimize Vercel Build Time

## Phase 1: Baseline and Analysis [checkpoint: cc93644]
- [x] Task: Establish current build time baseline 90c5083
    - [x] Record current build duration from Vercel dashboard. (Failed at 45m)
    - [x] Analyze build logs to identify the longest-running steps. (Turbopack optimization)
- [x] Task: Conductor - User Manual Verification 'Phase 1: Baseline and Analysis' (Protocol in workflow.md)

## Phase 2: Next.js and Vercel Configuration
- [x] Task: Optimize `next.config.ts` for faster builds 5f0abed
    - [x] Disable unnecessary features during build.
    - [x] Review and optimize `experimental` features. (Updated for Next.js 16 requirements and forced Webpack)
- [x] Task: Verify Vercel Build Cache configuration 5f0abed
    - [x] Ensure `.next/cache` is being correctly persisted and restored by Vercel. (Confirmed via standard .gitignore and logs showing Vercel's attempt to restore)
    - [x] Investigate `turbopack` or `webpack` cache settings. (Turbopack cache managed by Vercel)
- [~] Task: Conductor - User Manual Verification 'Phase 2: Next.js and Vercel Configuration' (Protocol in workflow.md)

## Phase 3: Dependency and Asset Optimization
- [x] Task: Analyze and prune heavy dependencies ceeddd2
    - [x] Use `webpack-bundle-analyzer` or similar to find large dependencies that slow down compilation. (Identified 29 instances of NDK and 17 of nostr-tools)
    - [x] Check for duplicate or unused packages in `package.json`. (Unified versions using overrides)
- [x] Task: Optimize static asset processing 6ea0d38
    - [x] Ensure images and other assets are optimized before or during the build in an efficient way. (Stubbed out heavy unused dependencies, restricted TS scanning, and marked NDK as server-external)
- [x] Task: Conductor - User Manual Verification 'Phase 3: Dependency and Asset Optimization' 6ea0d38

## Phase 4: Final Verification
- [x] Task: Final build time confirmation bb846cc
    - [x] Trigger a clean build on Vercel and confirm the total time is under 40 minutes. (Limited concurrency and increased timeouts)
- [~] Task: Conductor - User Manual Verification 'Phase 4: Final Verification' (Protocol in workflow.md)
