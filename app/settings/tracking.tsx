import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Switch,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useSettings } from '../../hooks/useSettings';

export default function TrackingSettingsScreen(): React.JSX.Element {
  const { colors } = useThemeContext();
  const { settings, updateSetting, refresh } = useSettings();

  const [autoTrack, setAutoTrack] = useState(true);
  const [autoStopMinutes, setAutoStopMinutes] = useState('10');

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  React.useEffect(() => {
    setAutoTrack(settings['auto_track_enabled'] !== 'false');
    setAutoStopMinutes(settings['auto_stop_minutes'] ?? '10');
  }, [settings]);

  const handleAutoTrackChange = async (value: boolean) => {
    setAutoTrack(value);
    await updateSetting('auto_track_enabled', value.toString());
  };

  const handleAutoStopChange = async (value: string) => {
    setAutoStopMinutes(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) {
      await updateSetting('auto_stop_minutes', num.toString());
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
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
      </View>
    </View>
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
});
