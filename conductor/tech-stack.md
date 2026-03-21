# Tech Stack: Tell it!

## Core Framework
- **Next.js (App Router):** High-performance React framework for the modern web.
- **TypeScript:** Ensuring type safety and maintainable code across the project.

## Nostr Integration
- **NDK (@nostr-dev-kit):** Core SDK for interacting with the Nostr protocol.
- **NDK-Messages:** Specialized library for NIP-17 direct messaging.
- **NDK-Cache-Dexie:** Robust local-first caching layer for immediate UI feedback.

## User Interface & Styling
- **TailwindCSS:** Utility-first CSS for rapid, consistent styling.
- **shadcn/ui & Radix UI:** Accessible, unstyled UI primitives for building custom components.
- **Framer Motion:** High-quality animations for an 'alive' user experience.

## State Management & Persistence
- **Zustand:** Lightweight, efficient global state management.
- **Dexie:** Client-side IndexedDB wrapper for high-speed local data persistence.
- **Web Workers:** Offloading heavy computations (like WoT scoring) to background threads to maintain a responsive main UI thread.
- **Supabase:** Backend-as-a-service for extended metadata and global state.
- **Redis (ioredis):** High-performance server-side caching and state.

## Testing & Quality Assurance
- **Vitest:** Modern, fast unit and component testing framework.
- **Husky & lint-staged:** Automated pre-commit linting and testing hooks.
- **ESLint:** Code quality and formatting enforcement.
