# Contributing Guidelines

Welcome to **Tell it!** contribution guide. To maintain code quality and project consistency, please follow these rules before pushing your changes to GitHub.

## 1. Branching Strategy

- **Do not push directly to `main`**.
- Always create a new branch for your features or bug fixes.
  - `feat/feature-name`
  - `fix/bug-name`
  - `chore/task-name`
  - `docs/doc-update`
- Open a Pull Request (PR) when your changes are ready for review.

## 2. Coding Standards

- **Language:** TypeScript.
- **Naming Conventions:**
  - Components: `PascalCase`
  - Hooks: `usePrefix` (e.g., `useNostr`)
  - Utilities/Variables: `camelCase`
- **UI Components (shadcn/ui):**
  - We use **shadcn/ui** for core UI components.
  - Components are located in `src/components/ui`.
  - To add a new component: `npx shadcn@latest add <component-name>`
  - Avoid creating custom styled components if a shadcn component can be used or composed.
- **Error Handling:** Always handle loading and error states.
- **Validation:** Nostr events MUST be validated before being displayed.

## 3. Automated Quality Checks (Git Hooks)

We use **Husky** and **lint-staged** to ensure code quality:

- **Pre-commit Hook:** Runs `eslint --fix` and `vitest related` on staged files.
- **Pre-push Hook:** Runs the full test suite (`npm test`). Pushing will fail if any test fails.

## 4. Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat:` for new features.
- `fix:` for bug fixes.
- `docs:` for documentation changes.
- `style:` for changes that do not affect the meaning of the code (white-space, formatting, etc.).
- `refactor:` for code changes that neither fix a bug nor add a feature.
- `perf:` for performance improvements.
- `test:` for adding missing tests or correcting existing tests.
- `chore:` for updating build tasks, package manager configs, etc.

## 5. Documentation (Mandatory)

- **Changelog:** Every significant update or bug fix MUST be recorded in `CHANGELOG.md`.
- **JSDoc/TSDoc:** Use JSDoc to document complex functions, hooks, and components.
- **README:** Update the README if your changes modify installation or configuration steps.

---
"Whatever it is, just Tell It." - tellit.id
