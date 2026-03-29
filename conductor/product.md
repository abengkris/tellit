# Product Definition: Tell it!

## Initial Concept
A decentralized, metadata-resistant microblogging application built on the [Nostr](https://github.com/nostr-protocol/nips) protocol. Slogan: "Whatever it is, just Tell It."

## Vision
To provide a private, censorship-resistant platform for sharing thoughts and media, leveraging the decentralized nature of the Nostr protocol. "Tell it!" aims to be the go-to microblogging interface that prioritizes user privacy and data ownership.

## Target Audience
- Privacy-conscious individuals.
- Decentralized technology enthusiasts.
- Nostr protocol users.
- People looking for an alternative to centralized social media.

## Core Features
- **NIP-17 Private Messaging**: Secure, end-to-end encrypted direct messages using Gift Wraps (Kind 1059).
- **Resilient Error Logging**: Internal alerts sent via NIP-17 for production monitoring.
- **Microblogging**: Post notes (Kind 1), replies, and reactions (Kind 7).
- **Rich Media Support**: Seamlessly share and view images, videos, and links.
- **User Status**: Real-time status updates (Kind 30315).
- **Long-form Content**: Read and write articles using Kind 30023.
- **Web of Trust (WoT)**: Integration for discovery and spam prevention.
- **Local-First Experience**: Powered by Nostrify SQL Store (PGlite) for high-performance, persistent local caching and offline-first capabilities.

## Success Metrics
- Seamless user onboarding with NIP-07 or NIP-46.
- High performance and responsiveness (even on slow connections).
- Robust handling of decentralized relay connections.
