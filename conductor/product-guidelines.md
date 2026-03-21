# Product Guidelines: Tell it!

## Prose Style & Tone
- **Precise & Informative:** Copy should be technically accurate and descriptive, ensuring users understand the decentralized nature of their actions without unnecessary complexity.
- **Goal:** Empower users through clarity, aligning with the slogan: "Whatever it is, just Tell It."
- **Standard:** Use TSDoc/JSDoc for all code documentation. Keep UI copy concise and avoid jargon where possible.

## UI/UX Design Principles
- **Performance-First UI:** Prioritize speed and responsiveness. Interactions must feel instantaneous, minimizing any perceived latency.
- **Minimalist & Focused:** Maintain clean, distraction-free layouts that prioritize the user's content. Every element must serve a purpose.
- **Interactive & Alive:** Utilize subtle transitions and satisfying feedback loops (via Framer Motion and shadcn/ui) to make the interface feel modern and responsive.

## Accessibility Standards
- **Standard Compliance (WCAG 2.1 AA):** Ensure all components are accessible, providing proper ARIA labels and color contrast ratios.
- **High Legibility Focus:** Utilize a clear visual hierarchy and robust typography to ensure content is readable across all devices and conditions.

## Local-First & Nostr Integration (NDK)
- **Pure Optimistic UI:** Adhere to "fire and forget" patterns. Update the local UI state immediately upon user action (posts, follows, reactions), trusting NDK and Dexie to handle background publishing.
- **Cache-First Pattern:** Always prefer reading from the local cache. UI components should remain functional even when offline or during relay sync delays.
- **Resilient Feedback:** Only notify the user of network issues if a persistent failure is detected, allowing the UI to remain snappy during transient relay timeouts.

## Branding Consistency
- **Colors:** Primary Blue (#3b82f6), following the shadcn/ui theming system.
- **Logo/Iconography:** Consistent use of Lucide React icons, ensuring a unified visual language across the platform.
