import { getDatabase } from '../schema';

export interface SavedLocation {
  id: number;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  default_category: 'business' | 'personal' | 'medical' | 'charity' | null;
  visit_count: number;
}

/**
 * Calculate haversine distance between two points in kilometers.
 */
function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getAllLocations(): Promise<SavedLocation[]> {
  const db = await getDatabase();
  return db.getAllAsync<SavedLocation>('SELECT * FROM saved_locations ORDER BY visit_count DESC, name ASC');
}

export async function findNearbyLocation(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<SavedLocation | null> {
  const db = await getDatabase();
  const locations = await db.getAllAsync<SavedLocation>('SELECT * FROM saved_locations');

  let closest: SavedLocation | null = null;
  let closestDistance = Infinity;

  for (const loc of locations) {
    const distance = haversineDistanceKm(lat, lng, loc.latitude, loc.longitude);
    if (distance <= radiusKm && distance < closestDistance) {
      closest = loc;
      closestDistance = distance;
    }
  }

  return closest;
}

export async function insertLocation(loc: Omit<SavedLocation, 'id' | 'visit_count'>): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO saved_locations (name, address, latitude, longitude, radius_meters, default_category) VALUES (?, ?, ?, ?, ?, ?)`,
    [loc.name, loc.address, loc.latitude, loc.longitude, loc.radius_meters, loc.default_category]
  );
  return result.lastInsertRowId;
}

export async function updateLocation(
  id: number,
  partial: Partial<Omit<SavedLocation, 'id' | 'visit_count'>>
): Promise<void> {
  const db = await getDatabase();
  const entries = Object.entries(partial).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;

  const setClauses = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([, v]) => v);
  values.push(id);

  await db.runAsync(
    `UPDATE saved_locations SET ${setClauses} WHERE id = ?`,
    values as (string | number | null)[]
  );
}

export async function incrementVisitCount(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE saved_locations SET visit_count = visit_count + 1 WHERE id = ?', [id]);
}

export async function deleteLocation(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM saved_locations WHERE id = ?', [id]);
}
