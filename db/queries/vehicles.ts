import { getDatabase } from '../schema';

export interface Vehicle {
  id: number;
  name: string;
  make: string | null;
  model: string | null;
  year: number | null;
  license_plate: string | null;
  is_default: number;
  created_at: string;
}

export async function getAllVehicles(): Promise<Vehicle[]> {
  const db = await getDatabase();
  return db.getAllAsync<Vehicle>('SELECT * FROM vehicles ORDER BY is_default DESC, name ASC');
}

export async function getVehicleById(id: number): Promise<Vehicle | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Vehicle>('SELECT * FROM vehicles WHERE id = ?', [id]);
}

export async function getDefaultVehicle(): Promise<Vehicle | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Vehicle>('SELECT * FROM vehicles WHERE is_default = 1 LIMIT 1');
}

export async function insertVehicle(v: Omit<Vehicle, 'id' | 'created_at'>): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO vehicles (name, make, model, year, license_plate, is_default) VALUES (?, ?, ?, ?, ?, ?)`,
    [v.name, v.make, v.model, v.year, v.license_plate, v.is_default]
  );
  return result.lastInsertRowId;
}

export async function updateVehicle(id: number, partial: Partial<Omit<Vehicle, 'id' | 'created_at'>>): Promise<void> {
  const db = await getDatabase();
  const entries = Object.entries(partial).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;

  const setClauses = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([, v]) => v);
  values.push(id);

  await db.runAsync(`UPDATE vehicles SET ${setClauses} WHERE id = ?`, values as (string | number | null)[]);
}

export async function setDefaultVehicle(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE vehicles SET is_default = 0 WHERE is_default = 1');
  await db.runAsync('UPDATE vehicles SET is_default = 1 WHERE id = ?', [id]);
}

export async function deleteVehicle(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM vehicles WHERE id = ?', [id]);
}
