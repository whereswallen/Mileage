import { getAllLocations, type SavedLocation } from '../db/queries/savedLocations';
import { getWorkHours, type WorkHourEntry } from '../db/queries/workHours';
import { isWithinRadius } from '../utils/geo';
import { getDayOfWeek, isWithinTimeRange } from '../utils/time';

type TripCategory = 'business' | 'personal' | 'medical' | 'charity';

/**
 * Find a saved location that matches the given coordinates within its configured radius.
 */
function findMatchingLocation(
  lat: number,
  lng: number,
  locations: SavedLocation[]
): SavedLocation | null {
  for (const loc of locations) {
    const radiusKm = loc.radius_meters / 1000;
    if (isWithinRadius(lat, lng, loc.latitude, loc.longitude, radiusKm)) {
      return loc;
    }
  }
  return null;
}

/**
 * Check if a given start_time (ISO datetime or HH:MM) falls within configured work hours.
 */
function matchesWorkHours(
  startTime: string,
  dayOfWeek: number,
  workHours: WorkHourEntry[]
): boolean {
  const enabledEntries = workHours.filter(
    (wh) => wh.day_of_week === dayOfWeek && wh.is_enabled === 1
  );

  if (enabledEntries.length === 0) return false;

  // Extract HH:MM from the startTime
  let timeStr: string;
  if (startTime.includes('T')) {
    // ISO datetime format
    const date = new Date(startTime);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    timeStr = `${hours}:${minutes}`;
  } else if (startTime.includes(':')) {
    // Already HH:MM or HH:MM:SS
    timeStr = startTime.substring(0, 5);
  } else {
    return false;
  }

  for (const entry of enabledEntries) {
    if (isWithinTimeRange(timeStr, entry.start_time, entry.end_time)) {
      return true;
    }
  }

  return false;
}

/**
 * Automatically classify a trip based on saved locations and work hours.
 *
 * Priority:
 * 1. Saved location match (check start AND end coords against saved_locations within their radius)
 * 2. Work hours match (check day_of_week + time)
 * 3. Return null (unclassified)
 */
export async function classifyTrip(
  _tripId: number,
  startLat: number,
  startLng: number,
  endLat: number | null,
  endLng: number | null,
  startTime: string
): Promise<TripCategory | null> {
  const locations = await getAllLocations();

  // Priority 1: Check saved locations
  // Check start location
  const startMatch = findMatchingLocation(startLat, startLng, locations);
  if (startMatch?.default_category) {
    return startMatch.default_category;
  }

  // Check end location
  if (endLat != null && endLng != null) {
    const endMatch = findMatchingLocation(endLat, endLng, locations);
    if (endMatch?.default_category) {
      return endMatch.default_category;
    }
  }

  // Priority 2: Work hours match
  const workHours = await getWorkHours();
  // Determine the day from the startTime or use the trip date
  let dayOfWeek: number;
  if (startTime.includes('T') || startTime.includes('-')) {
    dayOfWeek = getDayOfWeek(startTime);
  } else {
    // If only time is given, we cannot determine day - skip work hours check
    return null;
  }

  if (matchesWorkHours(startTime, dayOfWeek, workHours)) {
    return 'business';
  }

  // Priority 3: Unclassified
  return null;
}
