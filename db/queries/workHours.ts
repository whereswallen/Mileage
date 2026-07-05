import { getDatabase } from '../schema';

export interface WorkHourEntry {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_enabled: number;
}

export async function getWorkHours(): Promise<WorkHourEntry[]> {
  const db = await getDatabase();
  return db.getAllAsync<WorkHourEntry>('SELECT * FROM work_hours ORDER BY day_of_week ASC');
}

export async function setWorkHours(entries: Omit<WorkHourEntry, 'id'>[]): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM work_hours');

  for (const entry of entries) {
    await db.runAsync(
      `INSERT INTO work_hours (day_of_week, start_time, end_time, is_enabled) VALUES (?, ?, ?, ?)`,
      [entry.day_of_week, entry.start_time, entry.end_time, entry.is_enabled]
    );
  }
}

export async function isWithinWorkHours(dateTimeISO: string): Promise<boolean> {
  const db = await getDatabase();
  const date = new Date(dateTimeISO);
  const dayOfWeek = date.getDay(); // 0 = Sunday
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const currentTime = `${hours}:${minutes}`;

  const entries = await db.getAllAsync<WorkHourEntry>(
    'SELECT * FROM work_hours WHERE day_of_week = ? AND is_enabled = 1',
    [dayOfWeek]
  );

  for (const entry of entries) {
    if (currentTime >= entry.start_time && currentTime <= entry.end_time) {
      return true;
    }
  }

  return false;
}
