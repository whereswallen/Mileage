import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useTrips } from '../../hooks/useTrips';
import { categories } from '../../constants/categories';
import { formatDate } from '../../utils/time';
import type { Trip } from '../../db/queries/trips';

type FilterCategory = 'all' | 'business' | 'personal' | 'medical' | 'charity';

export default function TripsScreen(): React.JSX.Element {
  const { colors } = useThemeContext();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [showFabMenu, setShowFabMenu] = useState(false);

  const options = filter === 'all' ? undefined : { category: filter };
  const { trips, loading, refresh, deleteTrip } = useTrips(options);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleDelete = (id: number) => {
    Alert.alert('Delete Trip', 'Are you sure you want to delete this trip?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteTrip(id),
      },
    ]);
  };

  const getCategoryColor = (category: string): string => {
    const cat = categories.find((c) => c.key === category);
    return cat?.color ?? colors.textSecondary;
  };

  const filters: { key: FilterCategory; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'business', label: 'Business' },
    { key: 'personal', label: 'Personal' },
    { key: 'medical', label: 'Medical' },
    { key: 'charity', label: 'Charity' },
  ];

  const renderTrip = ({ item }: { item: Trip }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.surface }]}
      onPress={() => router.push(`/trip/${item.id}`)}
      onLongPress={() => handleDelete(item.id)}
    >
      <View style={styles.rowLeft}>
        <View
          style={[styles.dot, { backgroundColor: getCategoryColor(item.category) }]}
        />
        <View style={styles.rowInfo}>
          <Text style={[styles.rowDate, { color: colors.textSecondary }]}>
            {formatDate(item.date)}
          </Text>
          <Text style={[styles.rowAddress, { color: colors.text }]} numberOfLines={1}>
            {item.start_address ?? 'Unknown'} → {item.end_address ?? 'Unknown'}
          </Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowKm, { color: colors.text }]}>
          {item.km.toFixed(1)} km
        </Text>
        {item.deductible != null && item.deductible > 0 && (
          <Text style={[styles.rowDeductible, { color: colors.success }]}>
            ${item.deductible.toFixed(2)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  filter === f.key ? colors.primary : colors.surface,
              },
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === f.key ? '#FFFFFF' : colors.text },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={trips}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTrip}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={refresh}
      />

      {showFabMenu && (
        <View style={[styles.fabMenu, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setShowFabMenu(false);
              router.push('/add-trip');
            }}
          >
            <Text style={[styles.fabMenuText, { color: colors.text }]}>
              Manual Entry
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setShowFabMenu(false);
              router.push('/track-trip');
            }}
          >
            <Text style={[styles.fabMenuText, { color: colors.text }]}>
              Start Trip
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowFabMenu(!showFabMenu)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterScroll: {
    maxHeight: 52,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  list: {
    padding: 16,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 2,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowDate: {
    fontSize: 12,
  },
  rowAddress: {
    fontSize: 14,
    fontWeight: '500',
  },
  rowRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  rowKm: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowDeductible: {
    fontSize: 12,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '400',
    marginTop: -2,
  },
  fabMenu: {
    position: 'absolute',
    bottom: 84,
    right: 20,
    borderRadius: 10,
    padding: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fabMenuText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
