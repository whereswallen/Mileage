import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { insertTrip, updateTrip } from '../db/queries/trips';
import { insertPoints } from '../db/queries/tripPoints';
import { getSetting, setSetting } from '../db/queries/settings';
import { getDefaultVehicle } from '../db/queries/vehicles';
import { classifyTrip } from './autoClassification';
import { reverseGeocode } from './geocoding';
import { notifyTripEnded } from './notification';
import { haversineKm } from '../utils/geo';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

type TripCategory = 'business' | 'personal' | 'medical' | 'charity';
type TrackingMode = 'off' | 'monitoring' | 'recording';

const SPEED_START_KMH = 10; // driving speed that triggers auto-start
const SPEED_MOVING_KMH = 5; // movement that resets the auto-stop idle timer
const JITTER_MIN_M = 15; // ignore GPS drift below this displacement
const MIN_AUTO_TRIP_KM = 0.3; // discard auto-detected trips shorter than this
const START_DISPLACEMENT_KM = 0.25; // displacement fallback trigger distance
const MONITOR_BUFFER_MS = 300000; // lead-in window kept while monitoring
const SNAPSHOT_KEY = 'active_trip_snapshot';
const SNAPSHOT_EVERY_N_POINTS = 8;

interface EnginePoint {
  lat: number;
  lng: number;
  speed: number | null; // km/h
  t: number; // epoch ms
}

interface TripSnapshot {
  startedAt: number;
  lastMovementAt: number;
  isManual: boolean;
  category: TripCategory;
  purpose: string;
  vehicleId: number | null;
  km: number;
  points: EnginePoint[];
}

interface LiveTripState {
  mode: TrackingMode;
  isTracking: boolean;
  startTime: Date | null;
  currentKm: number;
  currentSpeed: number;
  category: TripCategory;
  purpose: string;
  vehicleId: number | null;
  lastFixAt: Date | null;
}

// ---------------------------------------------------------------------------
// Module state. The Android foreground service keeps this JS process alive,
// so in-memory state survives backgrounding; the DB snapshot covers process
// death (headless restart restores it before handling new points).
// ---------------------------------------------------------------------------

let mode: TrackingMode = 'off';
let restored = false;

// Rolling buffer of recent points while monitoring, used to seed a new trip
// with the lead-in from where movement actually began.
let monitorBuffer: EnginePoint[] = [];

let trip: TripSnapshot | null = null;
let pointsSinceSnapshot = 0;
let finalizing = false;
let lastFixAt: number | null = null;

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((fn) => fn());
}

export function subscribeTracking(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLiveTripState(): LiveTripState {
  const lastPoint = trip?.points[trip.points.length - 1] ?? null;
  return {
    mode,
    isTracking: mode === 'recording',
    startTime: trip ? new Date(trip.startedAt) : null,
    currentKm: trip?.km ?? 0,
    currentSpeed: lastPoint?.speed ?? 0,
    category: trip?.category ?? 'business',
    purpose: trip?.purpose ?? '',
    vehicleId: trip?.vehicleId ?? null,
    lastFixAt: lastFixAt ? new Date(lastFixAt) : null,
  };
}

export function setLiveCategory(category: TripCategory): void {
  if (trip) {
    trip.category = category;
    emit();
  }
}

export function setLivePurpose(purpose: string): void {
  if (trip) {
    trip.purpose = purpose;
    emit();
  }
}

// ---------------------------------------------------------------------------
// Location update profiles. Restarting startLocationUpdatesAsync with the
// same task name replaces the options, which is also how the foreground
// service notification text is switched between waiting/recording.
// ---------------------------------------------------------------------------

function monitorOptions(): Location.LocationTaskOptions {
  // High accuracy (GPS) is required: balanced/fused fixes on Android often
  // arrive without speed and too sparsely for driving detection to trigger.
  // distanceInterval gates updates while parked, so battery cost stays low.
  return {
    accuracy: Location.Accuracy.High,
    timeInterval: 15000,
    distanceInterval: 50,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Mileage Tracker',
      notificationBody: 'Waiting for your next trip',
      notificationColor: '#1976D2',
      killServiceOnDestroy: false,
    },
  };
}

function recordOptions(): Location.LocationTaskOptions {
  // distanceInterval must be 0: updates have to keep flowing while parked,
  // because the auto-stop idle check only runs when an update arrives.
  return {
    accuracy: Location.Accuracy.High,
    timeInterval: 4000,
    distanceInterval: 0,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Mileage Tracker',
      notificationBody: 'Recording your trip…',
      notificationColor: '#1976D2',
      killServiceOnDestroy: false,
    },
  };
}

async function startUpdates(options: Location.LocationTaskOptions): Promise<void> {
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, options);
}

async function stopUpdates(): Promise<void> {
  const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (registered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export async function hasTrackingPermissions(): Promise<boolean> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;
  const bg = await Location.getBackgroundPermissionsAsync();
  return bg.status === 'granted';
}

/**
 * Request foreground then background ("Allow all the time") location
 * permissions. On Android 11+ the background request opens system settings.
 */
export async function requestTrackingPermissions(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === 'granted';
}

// ---------------------------------------------------------------------------
// Settings helpers
// ---------------------------------------------------------------------------

async function isAutoTrackEnabled(): Promise<boolean> {
  return (await getSetting('auto_track_enabled')) !== 'false';
}

async function isPaused(): Promise<boolean> {
  const pauseUntil = await getSetting('pause_until');
  if (!pauseUntil) return false;
  return new Date(pauseUntil) > new Date();
}

async function autoStopMs(): Promise<number> {
  const raw = await getSetting('auto_stop_minutes');
  const minutes = raw ? parseInt(raw, 10) : 10;
  return (isNaN(minutes) || minutes <= 0 ? 10 : minutes) * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Snapshot persistence (crash recovery)
// ---------------------------------------------------------------------------

async function persistSnapshot(): Promise<void> {
  if (trip) {
    await setSetting(SNAPSHOT_KEY, JSON.stringify(trip));
  } else {
    await setSetting(SNAPSHOT_KEY, '');
  }
  pointsSinceSnapshot = 0;
}

async function restoreIfNeeded(): Promise<void> {
  if (restored) return;
  restored = true;

  const raw = await getSetting(SNAPSHOT_KEY);
  if (!raw) return;

  try {
    const snapshot = JSON.parse(raw) as TripSnapshot;
    const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (running) {
      // Process was killed mid-trip but the service kept running: resume.
      trip = snapshot;
      mode = 'recording';
    } else {
      // Service is gone; salvage what was captured as a finished trip.
      trip = snapshot;
      mode = 'recording';
      await finalizeTrip();
    }
  } catch {
    await setSetting(SNAPSHOT_KEY, '');
  }
}

// ---------------------------------------------------------------------------
// Trip lifecycle
// ---------------------------------------------------------------------------

async function beginRecording(seed: EnginePoint[], isManual: boolean): Promise<void> {
  const vehicle = await getDefaultVehicle();
  const defaultCategory = (await getSetting('default_category')) as TripCategory | null;
  const now = Date.now();
  const startedAt = seed.length > 0 ? seed[0].t : now;

  let km = 0;
  for (let i = 1; i < seed.length; i++) {
    km += haversineKm(seed[i - 1].lat, seed[i - 1].lng, seed[i].lat, seed[i].lng);
  }

  trip = {
    startedAt,
    lastMovementAt: now,
    isManual,
    category: defaultCategory ?? 'business',
    purpose: '',
    vehicleId: vehicle?.id ?? null,
    km,
    points: [...seed],
  };
  mode = 'recording';
  monitorBuffer = [];
  await persistSnapshot();

  try {
    await startUpdates(recordOptions());
  } catch (err) {
    console.error('[AutoTracking] Failed to switch to recording profile:', err);
  }
  emit();
}

async function finalizeTrip(): Promise<number | null> {
  if (!trip || finalizing) return null;
  finalizing = true;

  try {
    const current = trip;

    // Drop trailing points recorded after movement stopped (parked jitter).
    const cutoff = current.lastMovementAt + 30000;
    const points = current.points.filter((p) => p.t <= cutoff);

    const startPoint = points[0] ?? null;
    const endPoint = points.length > 1 ? points[points.length - 1] : null;
    const endTime = new Date(endPoint?.t ?? current.lastMovementAt);
    const startTime = new Date(current.startedAt);

    // Discard auto-detected noise trips; manual trips always save.
    if (!current.isManual && (current.km < MIN_AUTO_TRIP_KM || !startPoint)) {
      trip = null;
      await persistSnapshot();
      return null;
    }

    // Best-effort address lookup (rate-limited Nominatim; failures are fine).
    let startAddress: string | null = null;
    let endAddress: string | null = null;
    if (startPoint) {
      startAddress = await reverseGeocode(startPoint.lat, startPoint.lng).catch(() => null);
    }
    if (endPoint) {
      endAddress = await reverseGeocode(endPoint.lat, endPoint.lng).catch(() => null);
    }

    const tripId = await insertTrip({
      vehicle_id: current.vehicleId,
      date: startTime.toISOString().split('T')[0],
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      start_lat: startPoint?.lat ?? null,
      start_lng: startPoint?.lng ?? null,
      end_lat: endPoint?.lat ?? null,
      end_lng: endPoint?.lng ?? null,
      start_address: startAddress,
      end_address: endAddress,
      km: current.km,
      category: current.category,
      purpose: current.purpose || null,
      notes: null,
      client_name: null,
      rate_used: null,
      deductible: null,
      auto_tracked: current.isManual ? 0 : 1,
      inbox_status: 'unclassified',
    });

    if (points.length > 0) {
      await insertPoints(
        tripId,
        points.map((p) => ({
          latitude: p.lat,
          longitude: p.lng,
          speed: p.speed,
          timestamp: new Date(p.t).toISOString(),
        }))
      );
    }

    // Manual trips where the user picked a category are already classified;
    // otherwise run the auto-classifier (saved locations → work hours).
    if (startPoint) {
      const classified = await classifyTrip(
        tripId,
        startPoint.lat,
        startPoint.lng,
        endPoint?.lat ?? null,
        endPoint?.lng ?? null,
        startTime.toISOString()
      );
      if (classified) {
        await updateTrip(tripId, { category: classified, inbox_status: 'classified' });
      } else if (current.isManual) {
        await updateTrip(tripId, { inbox_status: 'classified' });
      }
    }

    notifyTripEnded(current.km).catch(() => {});

    trip = null;
    await persistSnapshot();
    return tripId;
  } finally {
    finalizing = false;

    // Return to the appropriate idle state.
    const shouldMonitor = (await isAutoTrackEnabled()) && !(await isPaused());
    try {
      if (shouldMonitor) {
        await startUpdates(monitorOptions());
        mode = 'monitoring';
      } else {
        await stopUpdates();
        mode = 'off';
      }
    } catch (err) {
      console.error('[AutoTracking] Failed to reset after trip:', err);
      mode = 'off';
    }
    emit();
  }
}

// ---------------------------------------------------------------------------
// Point processing — called by the TaskManager background task
// ---------------------------------------------------------------------------

function toEnginePoint(loc: Location.LocationObject): EnginePoint {
  const gpsSpeed = loc.coords.speed;
  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    speed: gpsSpeed != null && gpsSpeed >= 0 ? gpsSpeed * 3.6 : null,
    t: loc.timestamp,
  };
}

/** Speed in km/h between two points, from GPS if available else displacement. */
function effectiveSpeedKmh(prev: EnginePoint | null, point: EnginePoint): number {
  if (point.speed != null) return point.speed;
  if (!prev || point.t <= prev.t) return 0;
  const km = haversineKm(prev.lat, prev.lng, point.lat, point.lng);
  const hours = (point.t - prev.t) / 3600000;
  return hours > 0 ? km / hours : 0;
}

export async function handleLocationUpdates(
  locations: Location.LocationObject[]
): Promise<void> {
  await restoreIfNeeded();

  // Updates are flowing, so the service is on even if this is a fresh
  // headless process; without an active trip that means we're monitoring.
  if (mode === 'off') mode = 'monitoring';

  for (const loc of locations) {
    const point = toEnginePoint(loc);
    lastFixAt = point.t;

    if (mode === 'monitoring') {
      monitorBuffer.push(point);
      const cutoff = point.t - MONITOR_BUFFER_MS;
      monitorBuffer = monitorBuffer.filter((p) => p.t >= cutoff);

      // GPS doppler speed is reliable when present — one fast fix is enough.
      let driving = point.speed != null && point.speed >= SPEED_START_KMH;

      // Fallback for fixes without speed (or sparse updates): moved far
      // enough from any recent buffered point at a driving pace.
      if (!driving) {
        for (const old of monitorBuffer) {
          if (old.t >= point.t) continue;
          const km = haversineKm(old.lat, old.lng, point.lat, point.lng);
          const hours = (point.t - old.t) / 3600000;
          if (km >= START_DISPLACEMENT_KM && km / hours >= SPEED_START_KMH) {
            driving = true;
            break;
          }
        }
      }

      if (driving) {
        if (await isPaused()) continue;
        await beginRecording(monitorBuffer, false);
      }
    } else if (mode === 'recording' && trip) {
      const prev = trip.points[trip.points.length - 1] ?? null;

      // Filter parked GPS drift so it doesn't inflate distance.
      if (prev) {
        const meters = haversineKm(prev.lat, prev.lng, point.lat, point.lng) * 1000;
        if (meters < JITTER_MIN_M) {
          const speed = effectiveSpeedKmh(prev, point);
          if (speed >= SPEED_MOVING_KMH) trip.lastMovementAt = point.t;
          continue;
        }
        trip.km += meters / 1000;
      }

      trip.points.push(point);
      const speed = effectiveSpeedKmh(prev, point);
      if (speed >= SPEED_MOVING_KMH) {
        trip.lastMovementAt = point.t;
      }

      pointsSinceSnapshot++;
      if (pointsSinceSnapshot >= SNAPSHOT_EVERY_N_POINTS) {
        await persistSnapshot();
      }

      // Idle past the auto-stop timer → the trip ended when movement stopped.
      if (point.t - trip.lastMovementAt >= (await autoStopMs())) {
        await finalizeTrip();
        break;
      }
    }
  }

  emit();
}

// ---------------------------------------------------------------------------
// Public control API
// ---------------------------------------------------------------------------

/**
 * Start the always-on monitoring service (persistent notification).
 * Throws if permissions are missing and cannot be obtained.
 */
export async function startMonitoring(requestPermissions = false): Promise<void> {
  let granted = await hasTrackingPermissions();
  if (!granted && requestPermissions) {
    granted = await requestTrackingPermissions();
  }
  if (!granted) {
    throw new Error('Background location permission is required for auto-tracking.');
  }

  if (mode === 'recording') return; // already tracking a trip
  await startUpdates(monitorOptions());
  mode = 'monitoring';
  emit();
}

/** Stop the monitoring service entirely (removes the notification). */
export async function stopMonitoring(): Promise<void> {
  if (mode === 'recording') {
    await finalizeTrip();
  }
  await stopUpdates();
  mode = 'off';
  monitorBuffer = [];
  emit();
}

/** Manually start recording a trip right now. */
export async function manualStartTrip(): Promise<void> {
  await restoreIfNeeded();
  if (mode === 'recording') return;

  const granted = await hasTrackingPermissions();
  if (!granted) {
    const ok = await requestTrackingPermissions();
    if (!ok) {
      throw new Error('Location permission is required to track a trip.');
    }
  }

  await beginRecording([], true);
}

/** Manually stop the current trip. Returns the saved trip id (or null). */
export async function manualStopTrip(): Promise<number | null> {
  if (mode !== 'recording') return null;
  return finalizeTrip();
}

/**
 * Reconcile the service with settings: called at app launch and whenever
 * auto-track / pause settings change.
 */
export async function syncAutoTracking(requestPermissions = false): Promise<void> {
  await restoreIfNeeded();
  if (mode === 'recording') return; // never interrupt an active trip

  const shouldMonitor = (await isAutoTrackEnabled()) && !(await isPaused());
  if (shouldMonitor) {
    try {
      await startMonitoring(requestPermissions);
    } catch {
      // Permissions unavailable — stay off until the user grants them.
    }
  } else if (mode === 'monitoring') {
    await stopMonitoring();
  }
}

/**
 * App-launch initialization: recover any interrupted trip, then arm
 * monitoring. Requests permissions once on first ever launch.
 */
export async function initAutoTracking(): Promise<void> {
  const asked = await getSetting('permissions_requested');
  const firstRun = asked !== 'true';
  if (firstRun) {
    await setSetting('permissions_requested', 'true');
  }
  await syncAutoTracking(firstRun);
}
