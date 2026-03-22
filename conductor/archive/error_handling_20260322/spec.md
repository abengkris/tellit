# Specification: Error Handling for NDK Operations

## Goal
Improve the reliability and observability of NDK-related operations by implementing a centralized error handling and reporting system.

## Requirements
- Global error listener for NDK-related failures.
- User-facing notifications for critical errors (e.g., publishing failures).
- Logging system for non-critical errors.
- Integration with existing UI components (e.g., Sonner for notifications).

## Architecture
- A central error handler service or hook.
- Global listeners for NDK events (`event:publish-failed`).
- Utility for categorizing and formatting error messages.
