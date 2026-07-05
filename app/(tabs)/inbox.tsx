import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useInbox } from '../../hooks/useInbox';
import { categories } from '../../constants/categories';
import { formatDuration, formatDate } from '../../utils/time';
import type { Trip } from '../../db/queries/trips';

export default function InboxScreen(): React.JSX.Element {
  const { colors } = useThemeContext();
  const { trips, loading, refresh, classify, bulkClassify } = useInbox();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [classifyingId, setClassifyingId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
      setSelectedIds([]);
    }, [refresh])
  );

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === trips.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(trips.map((t) => t.id));
    }
  };

  const handleClassify = async (id: number, category: string) => {
    await classify(id, category);
    setClassifyingId(null);
  };

  const handleBulkClassify = async (category: string) => {
    await bulkClassify(selectedIds, category);
    setSelectedIds([]);
  };

  const getDuration = (trip: Trip): string => {
    if (trip.start_time && trip.end_time) {
      const start = new Date(trip.start_time).getTime();
      const end = new Date(trip.end_time).getTime();
      const seconds = Math.round((end - start) / 1000);
      return formatDuration(seconds);
    }
    return '';
  };

  const renderTrip = ({ item }: { item: Trip }) => {
    const isSelected = selectedIds.includes(item.id);
    const isClassifying = classifyingId === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.row,
          { backgroundColor: colors.surface },
          isSelected && { borderColor: colors.primary, borderWidth: 2 },
        ]}
        onPress={() => {
          if (selectedIds.length > 0) {
            toggleSelect(item.id);
          } else {
            setClassifyingId(isClassifying ? null : item.id);
          }
        }}
        onLongPress={() => toggleSelect(item.id)}
      >
        <View style={styles.rowContent}>
          <Text style={[styles.rowDate, { color: colors.textSecondary }]}>
            {formatDate(item.date)}
          </Text>
          <Text style={[styles.rowAddress, { color: colors.text }]} numberOfLines={1}>
            {item.start_address ?? 'Unknown'} → {item.end_address ?? 'Unknown'}
          </Text>
          <View style={styles.rowMeta}>
            <Text style={[styles.rowKm, { color: colors.text }]}>
              {item.km.toFixed(1)} km
            </Text>
            {getDuration(item) !== '' && (
              <Text style={[styles.rowDuration, { color: colors.textSecondary }]}>
                {getDuration(item)}
              </Text>
            )}
          </View>
        </View>

        {isClassifying && (
          <View style={styles.categoryRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.catButton, { backgroundColor: cat.color }]}
                onPress={() => handleClassify(item.id, cat.key)}
              >
                <Text style={styles.catButtonText}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (trips.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          All caught up!
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={selectAll}>
          <Text style={[styles.selectAllText, { color: colors.primary }]}>
            {selectedIds.length === trips.length ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {trips.length} trip{trips.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTrip}
        contentContainerStyle={styles.list}
      />

      {selectedIds.length > 0 && (
        <View style={[styles.bulkBar, { backgroundColor: colors.surface }]}>
          <Text style={[styles.bulkLabel, { color: colors.text }]}>
            Classify {selectedIds.length} as:
          </Text>
          <View style={styles.bulkButtons}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.bulkCatButton, { backgroundColor: cat.color }]}
                onPress={() => handleBulkClassify(cat.key)}
              >
                <Text style={styles.bulkCatText}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  countText: {
    fontSize: 13,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  row: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 2,
  },
  rowContent: {
    gap: 4,
  },
  rowDate: {
    fontSize: 12,
  },
  rowAddress: {
    fontSize: 14,
    fontWeight: '500',
  },
  rowMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  rowKm: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowDuration: {
    fontSize: 13,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  catButton: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  catButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bulkBar: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  bulkLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  bulkButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkCatButton: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  bulkCatText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
