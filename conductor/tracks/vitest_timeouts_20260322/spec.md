# Track Specification: Fix Vitest Worker Timeouts

## Overview
Resolve unhandled errors in Vitest caused by worker fork timeouts during full test suite execution.

## Functional Requirements
1.  Identify why specific test files cause worker timeouts during a full test run.
2.  Adjust Vitest configuration or test setup to prevent worker timeouts.
3.  Ensure all tests pass reliably when running the full suite locally.

## Non-Functional Requirements
1.  **Maintainability:** Configuration changes should be clearly documented.
2.  **Performance:** Test suite execution time should remain within reasonable limits.

## Acceptance Criteria
- Running `npm test` completes without "Unhandled Error: [vitest-pool]: Failed to start forks worker".
- All tests in the project pass successfully.

## Out of Scope
- Optimizing test execution speed (unless directly related to preventing timeouts).
- Rewriting the logic of the affected tests (unless the logic is causing the timeout).
