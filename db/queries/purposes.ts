import { getDatabase } from '../schema';

export interface Purpose {
  id: number;
  label: string;
  use_count: number;
}

export async function getPurposes(): Promise<Purpose[]> {
  const db = await getDatabase();
  return db.getAllAsync<Purpose>('SELECT * FROM purposes ORDER BY use_count DESC, label ASC');
}

export async function addPurpose(label: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO purposes (label) VALUES (?)',
    [label]
  );
  return result.lastInsertRowId;
}

export async function incrementPurposeCount(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE purposes SET use_count = use_count + 1 WHERE id = ?', [id]);
}

export async function deletePurpose(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM purposes WHERE id = ?', [id]);
}
