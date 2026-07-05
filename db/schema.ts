import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;
// Single-flight guard: without this, concurrent getDatabase() callers (the
// root layout init racing screen hooks and the background task at launch)
// each run openDatabaseAsync + migrations, leaving dbInstance pointing at a
// superseded native connection whose handle is null — every later query then
// fails with "NativeDatabase.prepareAsync rejected: NullPointerException".
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = initDatabase();
  try {
    dbInstance = await dbInitPromise;
    return dbInstance;
  } catch (err) {
    // Allow a later call to retry a failed initialization.
    dbInitPromise = null;
    throw err;
  }
}

async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('mileage.db');

  await db.execAsync(`PRAGMA journal_mode = WAL;`);
  await db.execAsync(`PRAGMA foreign_keys = ON;`);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      make TEXT,
      model TEXT,
      year INTEGER,
      license_plate TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NULL,
      date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      start_lat REAL,
      start_lng REAL,
      end_lat REAL,
      end_lng REAL,
      start_address TEXT,
      end_address TEXT,
      km REAL NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'business' CHECK (category IN ('business','personal','medical','charity')),
      purpose TEXT,
      notes TEXT,
      client_name TEXT,
      rate_used REAL,
      deductible REAL,
      auto_tracked INTEGER DEFAULT 0,
      inbox_status TEXT DEFAULT 'unclassified' CHECK (inbox_status IN ('unclassified','classified')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS trip_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      speed REAL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_trip_points_trip_id ON trip_points(trip_id);
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS odometer_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      reading_km REAL NOT NULL,
      recorded_at TEXT NOT NULL,
      source TEXT DEFAULT 'manual' CHECK (source IN ('manual','calculated')),
      notes TEXT,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS saved_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius_meters REAL DEFAULT 200,
      default_category TEXT CHECK (default_category IN ('business','personal','medical','charity')),
      visit_count INTEGER DEFAULT 0
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS work_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      is_enabled INTEGER DEFAULT 1
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS purposes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL UNIQUE,
      use_count INTEGER DEFAULT 0
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed default settings
  const defaultSettings: Record<string, string> = {
    business_name: '',
    vehicle_name: '',
    cra_rate_tier1: '0.70',
    cra_rate_tier2: '0.64',
    tier1_threshold: '5000',
    auto_track_enabled: 'true',
    auto_stop_minutes: '10',
    default_category: 'business',
    dark_mode: 'system',
    driver_name: '',
    organization_name: '',
    odometer_reminder_frequency: 'monthly',
    report_reminder_enabled: 'false',
    classification_reminder_enabled: 'true',
    pause_until: '',
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    await db.runAsync(
      `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
      [key, value]
    );
  }

  return db;
}
