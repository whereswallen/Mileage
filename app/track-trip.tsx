import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../contexts/ThemeContext';
import { useTripTracker } from '../contexts/TripTrackerContext';
import { categories } from '../constants/categories';
import { formatDuration } from '../utils/time';

export default function TrackTripScreen(): React.JSX.Element {
  const { colors } = useThemeContext();
  const { tripState, startTrip, stopTrip, setCategory, setPurpose } = useTripTracker();
  const router = useRouter();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!tripState.isTracking) {
      const doStart = async () => {
        await startTrip();
      };
      doStart();
    }
  }, []);

  useEffect(() => {
    if (tripState.isTracking && tripState.startTime) {
      const update = () => {
        const now = new Date().getTime();
        const start = new Date(tripState.startTime!).getTime();
        setElapsedSeconds(Math.floor((now - start) / 1000));
      };
      update();
      intervalRef.current = setInterval(update, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [tripState.isTracking, tripState.startTime]);

  const handleStop = async () => {
    await stopTrip();
    router.back();
  };

  if (!tripState.isTracking) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.startingText, { color: colors.text }]}>Starting...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.statsArea}>
        <Text style={[styles.distanceValue, { color: colors.text }]}>
          {tripState.currentKm.toFixed(2)}
        </Text>
        <Text style={[styles.distanceUnit, { color: colors.textSecondary }]}>km</Text>

        <View style={styles.secondaryStats}>
          <View style={styles.statBlock}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatDuration(elapsedSeconds)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Duration</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {tripState.currentSpeed.toFixed(0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>km/h</Text>
          </View>
        </View>
      </View>

      <View style={styles.controls}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
        <View style={styles.categoryRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.catButton,
                {
                  backgroundColor:
                    tripState.category === cat.key ? cat.color : colors.surface,
                  borderColor: cat.color,
                  borderWidth: 1,
                },
              ]}
              onPress={() => setCategory(cat.key as 'business' | 'personal' | 'medical' | 'charity')}
            >
              <Text
                style={{
                  color: tripState.category === cat.key ? '#FFFFFF' : cat.color,
                  fontSize: 12,
                  fontWeight: '600',
                }}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>
          Purpose
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          value={tripState.purpose}
          onChangeText={setPurpose}
          placeholder="Trip purpose"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <TouchableOpacity
        style={[styles.stopButton, { backgroundColor: colors.error }]}
        onPress={handleStop}
      >
        <Text style={styles.stopButtonText}>Stop Trip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  startingText: {
    fontSize: 20,
    fontWeight: '500',
  },
  statsArea: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  distanceValue: {
    fontSize: 64,
    fontWeight: '700',
  },
  distanceUnit: {
    fontSize: 18,
    marginTop: -4,
  },
  secondaryStats: {
    flexDirection: 'row',
    gap: 40,
    marginTop: 24,
  },
  statBlock: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  catButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  stopButton: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
