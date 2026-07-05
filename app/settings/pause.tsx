import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useSettings } from '../../hooks/useSettings';

export default function PauseTrackingScreen(): React.JSX.Element {
  const { colors } = useThemeContext();
  const { settings, updateSetting, refresh } = useSettings();

  const [isPaused, setIsPaused] = useState(false);
  const [pauseUntil, setPauseUntil] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  React.useEffect(() => {
    const stored = settings['pause_until'] ?? '';
    if (stored && new Date(stored) > new Date()) {
      setIsPaused(true);
      setPauseUntil(stored);
    } else {
      setIsPaused(false);
      setPauseUntil(null);
    }
  }, [settings]);

  const handleToggle = async (value: boolean) => {
    if (!value) {
      // Resume
      setIsPaused(false);
      setPauseUntil(null);
      await updateSetting('pause_until', '');
    } else {
      // Pause for 1 day by default
      await pauseFor(1);
    }
  };

  const pauseFor = async (days: number) => {
    const until = new Date();
    until.setDate(until.getDate() + days);
    const isoStr = until.toISOString().split('T')[0];
    setIsPaused(true);
    setPauseUntil(isoStr);
    await updateSetting('pause_until', isoStr);
  };

  const handleResume = async () => {
    setIsPaused(false);
    setPauseUntil(null);
    await updateSetting('pause_until', '');
  };

  const durations = [
    { label: '1 day', days: 1 },
    { label: '3 days', days: 3 },
    { label: '1 week', days: 7 },
    { label: '2 weeks', days: 14 },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.row, { backgroundColor: colors.surface }]}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Pause auto-tracking
          </Text>
          <Switch
            value={isPaused}
            onValueChange={handleToggle}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

        {isPaused && pauseUntil && (
          <View style={[styles.pauseInfo, { backgroundColor: colors.surface }]}>
            <Text style={[styles.pausedText, { color: colors.text }]}>
              Paused until {pauseUntil}
            </Text>
            <TouchableOpacity
              style={[styles.resumeButton, { backgroundColor: colors.success }]}
              onPress={handleResume}
            >
              <Text style={styles.resumeText}>Resume</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Pause duration
        </Text>
        <View style={styles.durationRow}>
          {durations.map((d) => (
            <TouchableOpacity
              key={d.days}
              style={[styles.durationButton, { backgroundColor: colors.surface }]}
              onPress={() => pauseFor(d.days)}
            >
              <Text style={[styles.durationText, { color: colors.text }]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          While paused, automatic trip detection will not start new trips.
          You can still manually start trips.
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
    gap: 12,
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
  },
  pauseInfo: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    gap: 10,
  },
  pausedText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resumeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resumeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  durationButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 13,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
});
