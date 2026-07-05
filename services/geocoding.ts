const USER_AGENT = 'MileageTracker/1.0';
const MIN_REQUEST_INTERVAL_MS = 1000;

let lastRequestTime = 0;
let requestQueue: Promise<void> = Promise.resolve();

interface NominatimSearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface NominatimReverseResult {
  display_name: string;
}

/**
 * Ensure rate limiting by queuing requests with at least 1 second spacing.
 */
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = requestQueue.then(async () => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed)
      );
    }
    lastRequestTime = Date.now();
    return fn();
  });

  // Update the queue chain (ignore errors for queue sequencing)
  requestQueue = result.then(
    () => undefined,
    () => undefined
  );

  return result;
}

/**
 * Reverse geocode coordinates to a formatted address string.
 * Returns null if the lookup fails.
 */
export function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  return enqueue(async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      });

      if (!response.ok) return null;

      const data: NominatimReverseResult = await response.json();
      return data.display_name ?? null;
    } catch {
      return null;
    }
  });
}

/**
 * Forward geocode an address string to coordinates.
 * Returns null if the lookup fails or no results are found.
 */
export function forwardGeocode(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  return enqueue(async () => {
    try {
      const encoded = encodeURIComponent(address);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      });

      if (!response.ok) return null;

      const data: NominatimSearchResult[] = await response.json();
      if (data.length === 0) return null;

      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    } catch {
      return null;
    }
  });
}
