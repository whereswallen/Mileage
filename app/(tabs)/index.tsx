import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useTripTracker } from '../../contexts/TripTrackerContext';
import { useDashboardStats } from '../../hooks/useDashboardStats';

function formatFixAge(fixAt: Date): string {
  const seconds = Math.floor((Date.now() - fixAt.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ago`;
}

export default function DashboardScreen(): React.JSX.Element {
  const { colors } = useThemeContext();
  const { tripState } = useTripTracker();
  const stats = useDashboardStats();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      // Stats hook auto-loads on mount; no manual refresh needed here
    }, [])
  );

  const maxBarKm = Math.max(...stats.weeklyData.map((d) => d.km), 1);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {tripState.isTracking && (
        <TouchableOpacity
          style={[styles.activeBanner, { backgroundColor: colors.success }]}
          onPress={() => router.push('/track-trip')}
        >
          <Text style={styles.bannerTitle}>Active Trip</Text>
          <Text style={styles.bannerKm}>
            {tripState.currentKm.toFixed(1)} km
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.trackerStatusCard, { backgroundColor: colors.surface }]}
        onPress={() => router.push('/settings/tracking')}
      >
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor:
                tripState.mode === 'recording'
                  ? colors.success
                  : tripState.mode === 'monitoring'
                    ? colors.primary
                    : colors.error,
            },
          ]}
        />
        <View style={styles.statusTextWrap}>
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            {tripState.mode === 'recording'
              ? 'Recording trip'
              : tripState.mode === 'monitoring'
                ? 'Auto-tracking on — waiting for trip'
                : 'Auto-tracking off'}
          </Text>
          {tripState.mode !== 'off' && (
            <Text style={[styles.statusSub, { color: colors.textSecondary }]}>
              {tripState.lastFixAt
                ? `Last GPS fix ${formatFixAge(tripState.lastFixAt)}`
                : 'No GPS fix yet'}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats.thisWeekKm.toFixed(1)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            This Week (km)
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats.thisMonthKm.toFixed(1)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            This Month (km)
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            ${stats.totalDeductible.toFixed(0)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            YTD Deductible
          </Text>
        </View>
      </View>

      <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          This Week
        </Text>
        <View style={styles.chartContainer}>
          {stats.weeklyData.map((day) => (
            <View key={day.day} style={styles.barColumn}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${(day.km / maxBarKm) * 100}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, { color: colors.textSecondary }]}>
                {day.day}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {stats.inboxCount > 0 && (
        <TouchableOpacity
          style={[styles.inboxCard, { backgroundColor: colors.accent }]}
          onPress={() => router.push('/(tabs)/inbox')}
        >
          <Text style={styles.inboxText}>
            {stats.inboxCount} trip{stats.inboxCount !== 1 ? 's' : ''} need
            classification
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  activeBanner: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bannerKm: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  trackerStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusTextWrap: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusSub: {
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  chartCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 120,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    width: '60%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  inboxCard: {
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  inboxText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
