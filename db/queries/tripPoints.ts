import { getDatabase } from '../schema';

export interface TripPoint {
  id: number;
  trip_id: number;
  latitude: number;
  longitude: number;
  speed: number | null;
  timestamp: string;
}

export async function insertPoints(
  tripId: number,
  points: Omit<TripPoint, 'id' | 'trip_id'>[]
): Promise<void> {
  if (points.length === 0) return;
  const db = await getDatabase();

  const placeholders = points.map(() => '(?, ?, ?, ?, ?)').join(', ');
  const values: (number | string | null)[] = [];
  for (const point of points) {
    values.push(tripId, point.latitude, point.longitude, point.speed, point.timestamp);
  }

  await db.runAsync(
    `INSERT INTO trip_points (trip_id, latitude, longitude, speed, timestamp) VALUES ${placeholders}`,
    values
  );
}

export async function getPointsForTrip(tripId: number): Promise<TripPoint[]> {
  const db = await getDatabase();
  return db.getAllAsync<TripPoint>(
    'SELECT * FROM trip_points WHERE trip_id = ? ORDER BY timestamp ASC',
    [tripId]
  );
}

export async function deletePointsForTrip(tripId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM trip_points WHERE trip_id = ?', [tripId]);
}
