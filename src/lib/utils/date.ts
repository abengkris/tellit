import { format, isSameYear, differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";

/**
 * Format a Unix timestamp into a simplified, compact string (Twitter/X style).
 * Examples: 'now', '2m', '5h', '3d', 'Mar 6', 'Oct 12, 2024'
 * 
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted compact date string
 */
export function formatCompactDate(timestamp: number | undefined): string {
  if (!timestamp) return "unknown";

  const date = new Date(timestamp * 1000);
  const now = new Date();

  const diffInMins = differenceInMinutes(now, date);
  if (diffInMins < 1) return "now";
  if (diffInMins < 60) return `${diffInMins}m`;

  const diffInHours = differenceInHours(now, date);
  if (diffInHours < 24) return `${diffInHours}h`;

  const diffInDays = differenceInDays(now, date);
  if (diffInDays < 7) return `${diffInDays}d`;

  if (isSameYear(date, now)) {
    return format(date, "MMM d");
  }

  return format(date, "MMM d, yyyy");
}

/**
 * Format a Unix timestamp into a full date string for detail views.
 * Example: '4:30 PM · Mar 17, 2026'
 * 
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted full date string
 */
export function formatFullTimestamp(timestamp: number | undefined): string {
  if (!timestamp) return "unknown";
  const date = new Date(timestamp * 1000);
  return format(date, "h:mm a · MMM d, yyyy");
}
