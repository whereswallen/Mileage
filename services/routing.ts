import { haversineKm } from '../utils/geo';

interface OSRMResponse {
  code: string;
  routes: Array<{
    distance: number; // meters
    duration: number; // seconds
  }>;
}

const HAVERSINE_ROAD_FACTOR = 1.3;

/**
 * Calculate route distance and duration between two points using OSRM.
 * Falls back to haversine * 1.3 if the API call fails.
 */
export async function calculateRouteDistance(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<{ distanceKm: number; durationMin: number } | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=false`;
    const response = await fetch(url);

    if (!response.ok) {
      return fallback(startLat, startLng, endLat, endLng);
    }

    const data: OSRMResponse = await response.json();

    if (data.code !== 'Ok' || data.routes.length === 0) {
      return fallback(startLat, startLng, endLat, endLng);
    }

    const route = data.routes[0];
    return {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    };
  } catch {
    return fallback(startLat, startLng, endLat, endLng);
  }
}

function fallback(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): { distanceKm: number; durationMin: number } {
  const straightLine = haversineKm(startLat, startLng, endLat, endLng);
  return {
    distanceKm: straightLine * HAVERSINE_ROAD_FACTOR,
    durationMin: 0, // Cannot estimate duration from haversine
  };
}
