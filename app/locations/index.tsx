import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useSavedLocations } from '../../hooks/useSavedLocations';
import { categories } from '../../constants/categories';
import type { SavedLocation } from '../../db/queries/savedLocations';

export default function LocationsScreen(): React.JSX.Element {
  const { colors } = useThemeContext();
  const { locations, loading, refresh } = useSavedLocations();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const getCategoryLabel = (cat: string | null): string => {
    if (!cat) return '';
    const found = categories.find((c) => c.key === cat);
    return found?.label ?? '';
  };

  const getCategoryColor = (cat: string | null): string => {
    if (!cat) return colors.textSecondary;
    const found = categories.find((c) => c.key === cat);
    return found?.color ?? colors.textSecondary;
  };

  const renderLocation = ({ item }: { item: SavedLocation }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.surface }]}
      onPress={() => router.push(`/locations/add?id=${item.id}`)}
    >
      <View style={styles.rowInfo}>
        <Text style={[styles.locationName, { color: colors.text }]}>
          {item.name}
        </Text>
        {item.address && (
          <Text style={[styles.locationAddress, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.address}
          </Text>
        )}
        <View style={styles.rowMeta}>
          {item.default_category && (
            <View style={[styles.catBadge, { backgroundColor: getCategoryColor(item.default_category) }]}>
              <Text style={styles.catBadgeText}>
                {getCategoryLabel(item.default_category)}
              </Text>
            </View>
          )}
          <Text style={[styles.visitCount, { color: colors.textSecondary }]}>
            {item.visit_count} visit{item.visit_count !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>{'>'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={locations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderLocation}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={refresh}
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/locations/add')}
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
  list: {
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
  rowInfo: {
    flex: 1,
    gap: 4,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '600',
  },
  locationAddress: {
    fontSize: 13,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  catBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  visitCount: {
    fontSize: 12,
  },
  chevron: {
    fontSize: 16,
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
});
