import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

type LocationCallback = (locations: Location.LocationObject[]) => void;

let locationCallback: LocationCallback | null = null;

/**
 * Set the callback that will be invoked when new location data arrives.
 */
export function setLocationCallback(callback: LocationCallback | null): void {
  locationCallback = callback;
}

/**
 * Define the background location task.
 * Must be called at the top level (outside of any component).
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[LocationTask] Error:', error.message);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locationCallback && locations.length > 0) {
      locationCallback(locations);
    }
  }
});

/**
 * Start background location updates with high accuracy.
 */
export async function startBackgroundLocationUpdates(): Promise<void> {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    throw new Error('Foreground location permission not granted');
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    throw new Error('Background location permission not granted');
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,
    distanceInterval: 5,
    foregroundService: {
      notificationTitle: 'Mileage Tracker Active',
      notificationBody: 'Recording your trip...',
    },
    showsBackgroundLocationIndicator: true,
  });
}

/**
 * Stop background location updates.
 */
export async function stopBackgroundLocationUpdates(): Promise<void> {
  const isTracking = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (isTracking) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}
