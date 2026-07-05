import * as Notifications from 'expo-notifications';

/**
 * Request notification permissions and configure the notification handler.
 */
export async function setupNotifications(): Promise<void> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Show notification that a trip has started recording.
 */
export async function notifyTripStarted(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Trip Started',
      body: 'Mileage Tracker is recording your trip.',
    },
    trigger: null,
  });
}

/**
 * Show notification that a trip has ended with the distance recorded.
 */
export async function notifyTripEnded(km: number): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Trip Ended',
      body: `Trip recorded: ${km.toFixed(1)} km`,
    },
    trigger: null,
  });
}

/**
 * Notify the user they may have forgotten to stop tracking.
 */
export async function notifyForgotToStop(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Still Tracking',
      body: 'Did you forget to stop your trip? Tap to review.',
    },
    trigger: null,
  });
}

/**
 * Remind the user to classify unclassified trips.
 */
export async function notifyClassificationReminder(count: number): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Trips to Classify',
      body: `You have ${count} unclassified trip${count === 1 ? '' : 's'}. Tap to categorize.`,
    },
    trigger: null,
  });
}

/**
 * Remind the user to record an odometer reading.
 */
export async function notifyOdometerReminder(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Odometer Reminder',
      body: 'Time to record your odometer reading for accurate records.',
    },
    trigger: null,
  });
}
