const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Format a duration in seconds to a human-readable string.
 * Examples: "1h 23m", "45m", "12s"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${secs}s`;
}

/**
 * Format an ISO date string to "Jan 15, 2026" format.
 */
export function formatDate(isoDate: string): string {
  const [yearStr, monthStr, dayStr] = isoDate.split('T')[0].split('-');
  const monthIndex = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  return `${MONTHS[monthIndex]} ${day}, ${yearStr}`;
}

/**
 * Format an ISO date-time string to "2:30 PM" format.
 */
export function formatTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  if (hours === 0) hours = 12;

  const minutesStr = minutes.toString().padStart(2, '0');
  return `${hours}:${minutesStr} ${ampm}`;
}

/**
 * Get the current date in ISO format (YYYY-MM-DD).
 */
export function getCurrentDateISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a time string (HH:MM) falls within a given range (inclusive).
 * All parameters are in HH:MM format.
 */
export function isWithinTimeRange(
  timeStr: string,
  startTime: string,
  endTime: string
): boolean {
  return timeStr >= startTime && timeStr <= endTime;
}

/**
 * Get the day of the week for an ISO date string.
 * Returns 0 for Sunday, 1 for Monday, etc.
 */
export function getDayOfWeek(isoDate: string): number {
  const [yearStr, monthStr, dayStr] = isoDate.split('T')[0].split('-');
  const date = new Date(
    parseInt(yearStr, 10),
    parseInt(monthStr, 10) - 1,
    parseInt(dayStr, 10)
  );
  return date.getDay();
}
