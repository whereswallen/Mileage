import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Switch,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useSettings } from '../../hooks/useSettings';
import {
  startMonitoring,
  stopMonitoring,
  getDiagnostics,
  injectTestDrivingFixes,
  hasTrackingPermissions,
  requestTrackingPermissions,
} from '../../services/autoTracking';

interface DiagView {
  updatesReceived: number;
  lastFixAt: number | null;
  lastLat: number | null;
  lastLng: number | null;
  lastSpeedKmh: number | null;
  lastAccuracyM: number | null;
  lastError: string | null;
  serviceRunning: boolean;
  servicesEnabled: boolean;
  precise: 'fine' | 'coarse' | 'none' | null;
  mode: string;
}

function ageText(ts: number | null): string {
  if (!ts) return 'never';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function TrackingSettingsScreen(): React.JSX.Element {
  const { colors } = useThemeContext();
  const { settings, updateSetting, refresh } = useSettings();

  const [autoTrack, setAutoTrack] = useState(true);
  const [autoStopMinutes, setAutoStopMinutes] = useState('10');
  const [diag, setDiag] = useState<DiagView | null>(null);
  const [permission, setPermission] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    setAutoTrack(settings['auto_track_enabled'] !== 'false');
    setAutoStopMinutes(settings['auto_stop_minutes'] ?? '10');
  }, [settings]);

  // Poll diagnostics live so a real drive shows fixes arriving in real time.
  useEffect(() => {
    let active = true;
    const tick = async () => {
      const d = await getDiagnostics();
      const perm = await hasTrackingPermissions();
      if (active) {
        setDiag(d);
        setPermission(perm);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleAutoTrackChange = async (value: boolean) => {
    setAutoTrack(value);
    await updateSetting('auto_track_enabled', value.toString());

    if (value) {
      try {
        await startMonitoring(true);
      } catch {
        setAutoTrack(false);
        await updateSetting('auto_track_enabled', 'false');
        Alert.alert(
          'Permission needed',
          'Auto-tracking needs location access set to "Allow all the time". Enable it in system settings, then turn auto-track back on.'
        );
      }
    } else {
      await stopMonitoring();
    }
  };

  const handleAutoStopChange = async (value: string) => {
    setAutoStopMinutes(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) {
      await updateSetting('auto_stop_minutes', num.toString());
    }
  };

  const handleTestDetection = async () => {
    const result = await injectTestDrivingFixes();
    if (result.triggered) {
      Alert.alert(
        'Detection works ✓',
        `The engine correctly started and recorded a ${result.kmRecorded.toFixed(1)} km test trip from synthetic driving fixes (saved to your trips — you can delete it).\n\nSince the logic is healthy, if real drives aren't detected the cause is GPS delivery: make sure location permission is "Allow all the time" AND battery usage is set to Unrestricted for this app in system settings.`
      );
    } else {
      Alert.alert(
        'Detection did NOT trigger ✗',
        `The synthetic driving fixes did not start a trip${result.error ? `\n\nError: ${result.error}` : ''}. This points to a bug in the detection logic — please send this message to the developer.`
      );
    }
  };

  const handleRequestPermission = async () => {
    const ok = await requestTrackingPermissions();
    setPermission(ok);
    if (!ok) {
      Alert.alert(
        'Permission not granted',
        'Open system Settings → Apps → Mileage Tracker → Permissions → Location and choose "Allow all the time".'
      );
    }
  };

  const modeColor =
    diag?.mode === 'recording'
      ? colors.success
      : diag?.mode === 'monitoring'
        ? colors.primary
        : colors.error;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.row, { backgroundColor: colors.surface }]}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>Auto-track trips</Text>
        <Switch
          value={autoTrack}
          onValueChange={handleAutoTrackChange}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>

      <View style={[styles.row, { backgroundColor: colors.surface }]}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>
          Auto-stop timer (minutes)
        </Text>
        <TextInput
          style={[styles.numberInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={autoStopMinutes}
          onChangeText={handleAutoStopChange}
          keyboardType="number-pad"
        />
      </View>

      <View style={[styles.infoRow, { backgroundColor: colors.surface }]}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>Speed threshold</Text>
        <Text style={[styles.infoValue, { color: colors.textSecondary }]}>10 km/h</Text>
      </View>

      <Text style={[styles.helpText, { color: colors.textSecondary }]}>
        Auto-track starts recording when driving speed is detected. Auto-stop
        ends the trip after the specified idle time.
      </Text>

      {/* Diagnostics */}
      <Text style={[styles.sectionHeader, { color: colors.text }]}>Diagnostics</Text>

      <View style={[styles.diagCard, { backgroundColor: colors.surface }]}>
        <View style={styles.diagRow}>
          <Text style={[styles.diagKey, { color: colors.textSecondary }]}>Status</Text>
          <View style={styles.diagValWrap}>
            <View style={[styles.dot, { backgroundColor: modeColor }]} />
            <Text style={[styles.diagVal, { color: colors.text }]}>
              {diag?.mode ?? '…'}
            </Text>
          </View>
        </View>
        <View style={styles.diagRow}>
          <Text style={[styles.diagKey, { color: colors.textSecondary }]}>
            Service running
          </Text>
          <Text style={[styles.diagVal, { color: diag?.serviceRunning ? colors.success : colors.error }]}>
            {diag ? (diag.serviceRunning ? 'yes' : 'no') : '…'}
          </Text>
        </View>
        <View style={styles.diagRow}>
          <Text style={[styles.diagKey, { color: colors.textSecondary }]}>
            Permission (all the time)
          </Text>
          <Text style={[styles.diagVal, { color: permission ? colors.success : colors.error }]}>
            {permission === null ? '…' : permission ? 'granted' : 'missing'}
          </Text>
        </View>
        <View style={styles.diagRow}>
          <Text style={[styles.diagKey, { color: colors.textSecondary }]}>
            Precise location
          </Text>
          <Text
            style={[
              styles.diagVal,
              { color: diag?.precise === 'fine' ? colors.success : colors.error },
            ]}
          >
            {diag?.precise == null
              ? '…'
              : diag.precise === 'fine'
                ? 'precise'
                : diag.precise === 'coarse'
                  ? 'APPROXIMATE'
                  : 'none'}
          </Text>
        </View>
        <View style={styles.diagRow}>
          <Text style={[styles.diagKey, { color: colors.textSecondary }]}>
            Location services
          </Text>
          <Text style={[styles.diagVal, { color: diag?.servicesEnabled ? colors.success : colors.error }]}>
            {diag ? (diag.servicesEnabled ? 'on' : 'OFF') : '…'}
          </Text>
        </View>
        <View style={styles.diagRow}>
          <Text style={[styles.diagKey, { color: colors.textSecondary }]}>
            GPS fixes received
          </Text>
          <Text style={[styles.diagVal, { color: colors.text, fontWeight: '700' }]}>
            {diag?.updatesReceived ?? 0}
          </Text>
        </View>
        <View style={styles.diagRow}>
          <Text style={[styles.diagKey, { color: colors.textSecondary }]}>Last fix</Text>
          <Text style={[styles.diagVal, { color: colors.text }]}>
            {ageText(diag?.lastFixAt ?? null)}
          </Text>
        </View>
        <View style={styles.diagRow}>
          <Text style={[styles.diagKey, { color: colors.textSecondary }]}>Last speed</Text>
          <Text style={[styles.diagVal, { color: colors.text }]}>
            {diag?.lastSpeedKmh != null ? `${diag.lastSpeedKmh.toFixed(0)} km/h` : 'no speed'}
          </Text>
        </View>
        <View style={styles.diagRow}>
          <Text style={[styles.diagKey, { color: colors.textSecondary }]}>Fix accuracy</Text>
          <Text style={[styles.diagVal, { color: colors.text }]}>
            {diag?.lastAccuracyM != null ? `±${diag.lastAccuracyM.toFixed(0)} m` : '—'}
          </Text>
        </View>
        {diag?.lastLat != null && (
          <View style={styles.diagRow}>
            <Text style={[styles.diagKey, { color: colors.textSecondary }]}>Last coords</Text>
            <Text style={[styles.diagVal, { color: colors.text }]}>
              {diag.lastLat.toFixed(4)}, {diag.lastLng?.toFixed(4)}
            </Text>
          </View>
        )}
        {diag?.lastError && (
          <View style={styles.diagRow}>
            <Text style={[styles.diagKey, { color: colors.error }]}>Last error</Text>
            <Text style={[styles.diagVal, { color: colors.error, flex: 1, textAlign: 'right' }]} numberOfLines={2}>
              {diag.lastError}
            </Text>
          </View>
        )}
      </View>

      {diag?.precise === 'coarse' && (
        <View style={[styles.warnCard, { backgroundColor: colors.error }]}>
          <Text style={styles.warnTitle}>Precise location is OFF</Text>
          <Text style={styles.warnBody}>
            Android is only giving this app approximate location (~2 km), so
            driving can never be detected. Fix: open system Settings → Apps →
            Mileage Tracker → Permissions → Location and turn ON "Use precise
            location".
          </Text>
        </View>
      )}

      {diag?.servicesEnabled === false && (
        <View style={[styles.warnCard, { backgroundColor: colors.error }]}>
          <Text style={styles.warnTitle}>Location services are OFF</Text>
          <Text style={styles.warnBody}>
            Turn on Location in your phone's quick settings.
          </Text>
        </View>
      )}

      {permission === false && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleRequestPermission}
        >
          <Text style={styles.buttonText}>Grant location permission</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={handleTestDetection}
      >
        <Text style={styles.buttonText}>Test detection</Text>
      </TouchableOpacity>

      <Text style={[styles.helpText, { color: colors.textSecondary }]}>
        During a drive, "GPS fixes received" should climb. If it stays at 0,
        Android isn't delivering location (check permission is "Allow all the
        time" and battery is unrestricted for this app). "Test detection"
        forces a trip start to verify the detection logic itself.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
  },
  rowLabel: {
    fontSize: 15,
    flex: 1,
  },
  numberInput: {
    width: 60,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
  },
  infoValue: {
    fontSize: 14,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 4,
  },
  diagCard: {
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diagKey: {
    fontSize: 13,
  },
  diagValWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  diagVal: {
    fontSize: 13,
    fontWeight: '500',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  warnCard: {
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  warnTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  warnBody: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
