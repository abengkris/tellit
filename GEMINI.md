# GEMINI.md — Project Context

## Tentang Proyek
Aplikasi microblogging berbasis protokol Nostr (seperti X/Twitter) dengan nama brand **Tell it!**.
Slogan: "Whatever it is, just Tell It."
Domain: tellit.id

## Tech Stack
- Framework: Next.js latest (App Router)
- Nostr SDK: NDK (@nostr-dev-kit/ndk)
- Messaging: @nostr-dev-kit/messages (NIP-17)
- UI Components: shadcn/ui
- Styling: TailwindCSS
- State: Zustand
- Auth: Nostr keypair (NIP-07 browser extension / NIP-46)

## Konvensi Kode
- Komponen: PascalCase
- Hook custom: use prefix (useNostr, useFeed)
- Event Nostr selalu divalidasi sebelum ditampilkan
- Selalu handle loading dan error state

## Standar Dokumentasi (Mandat)
- **CONTRIBUTING.md:** Lihat file ini untuk detail lengkap alur kerja dan standar teknis.
- **Changelog:** Setiap update fitur atau fix bug signifikan WAJIB dicatat di `CHANGELOG.md`.
- **JSDoc/TSDoc:** Gunakan JSDoc untuk mendokumentasikan fungsi, hook, dan komponen yang kompleks.
- **Commit Messages:** Gunakan prefix conventional commits (feat:, fix:, chore:, docs:).
- **README:** Update README jika ada perubahan pada cara install atau konfigurasi.

## Automated Quality Checks
- **Husky & lint-staged:** Terpasang untuk menjalankan ESLint dan Vitest secara otomatis.
- **Pre-commit:** Melakukan linting dan testing pada file yang berubah.
- **Pre-push:** Melakukan full test suite (`npm test`). Pushing akan gagal jika ada test yang error.

# Project Instructions

- **Framework:** We use Next.js.
- **UI Components:** Use **shadcn/ui**. Check if a component exists in `src/components/ui` before creating custom components. Use `npx shadcn@latest add <component>` to add new ones.
- **Styling:** Use Tailwind CSS for all styling. Do not write custom CSS.
- **Testing:** All new components must include a Vitest unit test.
- **Tone:** Be concise. Don't explain basic React concepts.

## Local-First Mandates (NDK)

As a "Tell it!" developer, you MUST adhere to local-first principles to ensure a responsive and resilient user experience:

- **Optimistic Publishing:** Prefer `event.publish()` over `await event.publish()`. Use "fire and forget" patterns for most user actions (posts, follows, reactions) to keep the UI snappy.
- **Cache-First Pattern:** Always ensure `NDKCacheAdapterDexie` is active. Trust that NDK will handle background publishing and retries.
- **Handling Failures:** Always listen to `event:publish-failed` globally to notify users. UI components should handle local state rollbacks if a persistent failure is detected.
- **Resilience:** Ensure the application checks for unpublished events on boot-up and re-attempts to sync them with relays.
- **Non-Blocking UI:** Avoid long-running spinners for network operations that NDK can handle asynchronously in the background. Update the local UI state immediately.
