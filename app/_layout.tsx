import '../tasks/locationTask';

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { ThemeProvider, useThemeContext } from '../contexts/ThemeContext';
import { VehicleProvider } from '../contexts/VehicleContext';
import { TripTrackerProvider } from '../contexts/TripTrackerContext';
import { getDatabase } from '../db/schema';
import { setupNotifications } from '../services/notification';
import { initAutoTracking } from '../services/autoTracking';

function RootStack(): React.JSX.Element {
  const { colors } = useThemeContext();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add-trip" options={{ title: 'Add Trip' }} />
      <Stack.Screen name="track-trip" options={{ title: 'Track Trip' }} />
      <Stack.Screen name="trip/[id]" options={{ title: 'Trip Details' }} />
      <Stack.Screen name="vehicles/index" options={{ title: 'Vehicles' }} />
      <Stack.Screen name="vehicles/add" options={{ title: 'Vehicle' }} />
      <Stack.Screen name="locations/index" options={{ title: 'Saved Locations' }} />
      <Stack.Screen name="locations/add" options={{ title: 'Location' }} />
      <Stack.Screen name="work-hours" options={{ title: 'Work Hours' }} />
      <Stack.Screen name="settings/profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="settings/tracking" options={{ title: 'Tracking' }} />
      <Stack.Screen name="settings/rates" options={{ title: 'CRA Rates' }} />
      <Stack.Screen name="settings/notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="settings/appearance" options={{ title: 'Appearance' }} />
      <Stack.Screen name="settings/pause" options={{ title: 'Pause Tracking' }} />
    </Stack>
  );
}

export default function RootLayout(): React.JSX.Element {
  useEffect(() => {
    const init = async () => {
      await getDatabase();
      await setupNotifications();
      await initAutoTracking();
    };
    init();
  }, []);

  return (
    <ThemeProvider>
      <VehicleProvider>
        <TripTrackerProvider>
          <RootStack />
        </TripTrackerProvider>
      </VehicleProvider>
    </ThemeProvider>
  );
}
