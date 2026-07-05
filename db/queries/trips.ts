import { getDatabase } from '../schema';

export interface Trip {
  id: number;
  vehicle_id: number | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  start_address: string | null;
  end_address: string | null;
  km: number;
  category: 'business' | 'personal' | 'medical' | 'charity';
  purpose: string | null;
  notes: string | null;
  client_name: string | null;
  rate_used: number | null;
  deductible: number | null;
  auto_tracked: number;
  inbox_status: 'unclassified' | 'classified';
}

export interface TripFilters {
  category?: 'business' | 'personal' | 'medical' | 'charity';
  vehicle_id?: number;
  auto_tracked?: boolean;
}

export async function getAllTrips(): Promise<Trip[]> {
  const db = await getDatabase();
  return db.getAllAsync<Trip>('SELECT * FROM trips ORDER BY date DESC, start_time DESC');
}

export async function getTripById(id: number): Promise<Trip | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Trip>('SELECT * FROM trips WHERE id = ?', [id]);
}

export async function getInboxTrips(): Promise<Trip[]> {
  const db = await getDatabase();
  return db.getAllAsync<Trip>(
    `SELECT * FROM trips WHERE inbox_status = 'unclassified' ORDER BY date DESC, start_time DESC`
  );
}

export async function getInboxCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM trips WHERE inbox_status = 'unclassified'`
  );
  return result?.count ?? 0;
}

export async function getTripsInDateRange(
  start: string,
  end: string,
  filters?: TripFilters
): Promise<Trip[]> {
  const db = await getDatabase();
  let query = 'SELECT * FROM trips WHERE date >= ? AND date <= ?';
  const params: (string | number)[] = [start, end];

  if (filters?.category) {
    query += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters?.vehicle_id !== undefined) {
    query += ' AND vehicle_id = ?';
    params.push(filters.vehicle_id);
  }
  if (filters?.auto_tracked !== undefined) {
    query += ' AND auto_tracked = ?';
    params.push(filters.auto_tracked ? 1 : 0);
  }

  query += ' ORDER BY date DESC, start_time DESC';
  return db.getAllAsync<Trip>(query, params);
}

export async function insertTrip(trip: Omit<Trip, 'id'>): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO trips (vehicle_id, date, start_time, end_time, start_lat, start_lng, end_lat, end_lng, start_address, end_address, km, category, purpose, notes, client_name, rate_used, deductible, auto_tracked, inbox_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      trip.vehicle_id,
      trip.date,
      trip.start_time,
      trip.end_time,
      trip.start_lat,
      trip.start_lng,
      trip.end_lat,
      trip.end_lng,
      trip.start_address,
      trip.end_address,
      trip.km,
      trip.category,
      trip.purpose,
      trip.notes,
      trip.client_name,
      trip.rate_used,
      trip.deductible,
      trip.auto_tracked,
      trip.inbox_status,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateTrip(id: number, partial: Partial<Omit<Trip, 'id'>>): Promise<void> {
  const db = await getDatabase();
  const entries = Object.entries(partial).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;

  const setClauses = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([, v]) => v);
  values.push(id);

  await db.runAsync(`UPDATE trips SET ${setClauses} WHERE id = ?`, values as (string | number | null)[]);
}

export async function classifyTrip(
  id: number,
  category: 'business' | 'personal' | 'medical' | 'charity'
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE trips SET category = ?, inbox_status = 'classified' WHERE id = ?`,
    [category, id]
  );
}

export async function bulkClassify(
  ids: number[],
  category: 'business' | 'personal' | 'medical' | 'charity'
): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE trips SET category = ?, inbox_status = 'classified' WHERE id IN (${placeholders})`,
    [category, ...ids]
  );
}

export async function deleteTrip(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM trips WHERE id = ?', [id]);
}

export async function getYtdBusinessKm(year: number, excludeId?: number): Promise<number> {
  const db = await getDatabase();
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  let query = `SELECT COALESCE(SUM(km), 0) as total FROM trips WHERE category = 'business' AND date >= ? AND date <= ?`;
  const params: (string | number)[] = [startDate, endDate];

  if (excludeId !== undefined) {
    query += ' AND id != ?';
    params.push(excludeId);
  }

  const result = await db.getFirstAsync<{ total: number }>(query, params);
  return result?.total ?? 0;
}
