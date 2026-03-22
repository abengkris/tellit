export enum NDKErrorType {
  PUBLISH_FAILED = "PUBLISH_FAILED",
  CONNECTION_FAILED = "CONNECTION_FAILED",
  UNKNOWN = "UNKNOWN",
}

export interface FormattedError {
  message: string;
  isCritical: boolean;
  originalError: Error;
}

/**
 * Formats NDK errors into user-friendly messages.
 * @param error The original error object.
 * @param type The type of NDK error.
 * @returns A formatted error object.
 */
export function formatNDKError(
  error: Error,
  type: NDKErrorType = NDKErrorType.UNKNOWN
): FormattedError {
  let message = "An unexpected error occurred";
  let isCritical = false;

  switch (type) {
    case NDKErrorType.PUBLISH_FAILED:
      message = "Failed to publish. Relay may have rejected your event.";
      isCritical = true;
      break;
    case NDKErrorType.CONNECTION_FAILED:
      message = "Relay connection lost. Reconnecting...";
      isCritical = false;
      break;
    default:
      message = "An unexpected error occurred";
      isCritical = false;
  }

  const result = {
    message,
    isCritical,
    originalError: error,
  };

  if (!isCritical && type !== NDKErrorType.UNKNOWN) {
    console.warn(`[NDK Error]: ${error.message}`, error);
  }

  return result;
}
