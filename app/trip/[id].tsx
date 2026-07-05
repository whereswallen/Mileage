import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useThemeContext } from '../../contexts/ThemeContext';
import { getTripById, updateTrip, deleteTrip } from '../../db/queries/trips';
import { categories } from '../../constants/categories';
import { formatDate, formatTime, formatDuration } from '../../utils/time';
import type { Trip } from '../../db/queries/trips';

export default function TripDetailScreen(): React.JSX.Element {
  const { colors } = useThemeContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('business');
  const [purpose, setPurpose] = useState('');
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');

  const loadTrip = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const data = await getTripById(parseInt(id, 10));
    if (data) {
      setTrip(data);
      setCategory(data.category);
      setPurpose(data.purpose ?? '');
      setClientName(data.client_name ?? '');
      setNotes(data.notes ?? '');
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadTrip();
    }, [loadTrip])
  );

  const getDuration = (): string => {
    if (trip?.start_time && trip?.end_time) {
      const start = new Date(trip.start_time).getTime();
      const end = new Date(trip.end_time).getTime();
      const seconds = Math.round((end - start) / 1000);
      return formatDuration(seconds);
    }
    return 'N/A';
  };

  const handleSave = async () => {
    if (!trip) return;
    await updateTrip(trip.id, {
      category: category as Trip['category'],
      purpose: purpose || null,
      client_name: clientName || null,
      notes: notes || null,
      inbox_status: 'classified',
    });
    Alert.alert('Saved', 'Trip updated successfully');
    router.back();
  };

  const handleDelete = () => {
    if (!trip) return;
    Alert.alert('Delete Trip', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTrip(trip.id);
          router.back();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Trip not found
        </Text>
      </View>
    );
  }

  const catDef = categories.find((c) => c.key === trip.category);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {formatDate(trip.date)}
          </Text>
        </View>
        {trip.start_time && (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Time</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {formatTime(trip.start_time)}
              {trip.end_time ? ` - ${formatTime(trip.end_time)}` : ''}
            </Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Duration</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{getDuration()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Distance</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {trip.km.toFixed(1)} km
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>From</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {trip.start_address ?? 'Unknown'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>To</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {trip.end_address ?? 'Unknown'}
          </Text>
        </View>
        {trip.deductible != null && trip.deductible > 0 && (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Deductible</Text>
            <Text style={[styles.infoValue, { color: colors.success }]}>
              ${trip.deductible.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
      <View style={styles.categoryRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.catButton,
              {
                backgroundColor: category === cat.key ? cat.color : colors.surface,
                borderColor: cat.color,
                borderWidth: 1,
              },
            ]}
            onPress={() => setCategory(cat.key)}
          >
            <Text
              style={{
                color: category === cat.key ? '#FFFFFF' : cat.color,
                fontSize: 13,
                fontWeight: '600',
              }}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Purpose</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={purpose}
        onChangeText={setPurpose}
        placeholder="Trip purpose"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Client Name</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={clientName}
        onChangeText={setClientName}
        placeholder="Client name"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Notes</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes"
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={3}
      />

      <View style={[styles.mapPlaceholder, { backgroundColor: colors.surface }]}>
        <Text style={[styles.mapText, { color: colors.textSecondary }]}>
          Route map coming soon
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary }]}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.deleteButton, { borderColor: colors.error }]}
        onPress={handleDelete}
      >
        <Text style={[styles.deleteButtonText, { color: colors.error }]}>Delete Trip</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  infoCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 14,
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
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  mapPlaceholder: {
    borderRadius: 10,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  mapText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
