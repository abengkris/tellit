# GEMINI.md — Project Context

## Tentang Proyek
Aplikasi microblogging berbasis protokol Nostr (seperti X/Twitter) dengan nama brand **Tell it!**.
Slogan: "Whatever it is, just Tell It."
Domain: tellit.id

## Tech Stack
- Framework: Next.js latest (App Router)
- Nostr SDK: NDK (@nostr-dev-kit/ndk)
- Messaging: @nostr-dev-kit/messages (NIP-17)
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

