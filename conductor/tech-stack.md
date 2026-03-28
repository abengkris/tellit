# Technology Stack: Tell it!

## Core Framework
- **Next.js 16 (App Router)**: For server-side rendering, routing, and overall application structure.
- **React 19**: Modern component-based UI development.
- **TypeScript**: Ensuring type safety and maintainable code.

## Protocol Integration
- **Nostrify**: Modern protocol implementation for core events, messaging, and feeds.
- **NDK (@nostr-dev-kit/ndk)**: Gradual transition to Nostrify for core features.
- **@nostr-dev-kit/messages (NIP-17)**: Gradual transition to Nostrify messaging.

## User Interface (UI)
- **Shadcn UI**: Pre-built accessible components.
- **TailwindCSS 4**: Utility-first styling for a fast and flexible design.
- **Framer Motion**: Smooth animations and transitions.

## Data and State
- **Zustand**: Simple and effective state management.
- **Nostrify SQL Store (PGlite)**: Primary local-first storage for Nostr events.
- **Supabase**: Backend database for centralized storage (if needed).
- **Dexie**: Legacy local-first indexedDB wrapper.
- **Redis**: High-performance data storage for caching and sessions.

## Tooling and Deployment
- **Vitest**: Unit and integration testing.
- **ESLint**: Linting and code quality.
- **Vercel**: Deployment and analytics.
