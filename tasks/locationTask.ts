import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import {
  BACKGROUND_LOCATION_TASK,
  handleLocationUpdates,
} from '../services/autoTracking';

export { BACKGROUND_LOCATION_TASK };

/**
 * Background location task. Defined at module top level so it registers
 * even when Android launches the app headless (process killed, foreground
 * service still running). All trip detection and persistence happens in
 * services/autoTracking — nothing here depends on the React tree.
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[LocationTask] Error:', error.message);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations.length > 0) {
      try {
        await handleLocationUpdates(locations);
      } catch (err) {
        console.error('[LocationTask] Failed to process locations:', err);
      }
    }
  }
});
