import { getDatabase } from '../schema';

export interface OdometerReading {
  id: number;
  vehicle_id: number;
  reading_km: number;
  recorded_at: string;
  source: 'manual' | 'calculated';
  notes: string | null;
}

export async function getReadings(vehicleId: number): Promise<OdometerReading[]> {
  const db = await getDatabase();
  return db.getAllAsync<OdometerReading>(
    'SELECT * FROM odometer_readings WHERE vehicle_id = ? ORDER BY recorded_at DESC',
    [vehicleId]
  );
}

export async function getLatestReading(vehicleId: number): Promise<OdometerReading | null> {
  const db = await getDatabase();
  return db.getFirstAsync<OdometerReading>(
    'SELECT * FROM odometer_readings WHERE vehicle_id = ? ORDER BY recorded_at DESC LIMIT 1',
    [vehicleId]
  );
}

export async function insertReading(r: Omit<OdometerReading, 'id'>): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO odometer_readings (vehicle_id, reading_km, recorded_at, source, notes) VALUES (?, ?, ?, ?, ?)`,
    [r.vehicle_id, r.reading_km, r.recorded_at, r.source, r.notes]
  );
  return result.lastInsertRowId;
}

export async function deleteReading(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM odometer_readings WHERE id = ?', [id]);
}
