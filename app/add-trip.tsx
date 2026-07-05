import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../contexts/ThemeContext';
import { useVehicleContext } from '../contexts/VehicleContext';
import { usePurposes } from '../hooks/usePurposes';
import { useSettings } from '../hooks/useSettings';
import { insertTrip } from '../db/queries/trips';
import { calculateRouteDistance } from '../services/routing';
import { forwardGeocode } from '../services/geocoding';
import { categories } from '../constants/categories';
import { getCurrentDateISO } from '../utils/time';

export default function AddTripScreen(): React.JSX.Element {
  const { colors } = useThemeContext();
  const { vehicles, selectedVehicleId } = useVehicleContext();
  const { purposes } = usePurposes();
  const { settings } = useSettings();
  const router = useRouter();

  const [vehicleId, setVehicleId] = useState<number | null>(selectedVehicleId);
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [distance, setDistance] = useState('');
  const [date, setDate] = useState(getCurrentDateISO());
  const [category, setCategory] = useState<string>('business');
  const [purpose, setPurpose] = useState('');
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  const [calculating, setCalculating] = useState(false);

  const handleCalculateDistance = async () => {
    if (!startAddress.trim() || !endAddress.trim()) {
      Alert.alert('Error', 'Enter both start and end addresses');
      return;
    }
    setCalculating(true);
    try {
      const startCoords = await forwardGeocode(startAddress);
      const endCoords = await forwardGeocode(endAddress);
      if (!startCoords || !endCoords) {
        Alert.alert('Error', 'Could not geocode one or both addresses');
        return;
      }
      const result = await calculateRouteDistance(
        startCoords.lat,
        startCoords.lng,
        endCoords.lat,
        endCoords.lng
      );
      if (result) {
        setDistance(result.distanceKm.toFixed(1));
      } else {
        Alert.alert('Error', 'Could not calculate route distance');
      }
    } catch {
      Alert.alert('Error', 'Failed to calculate distance');
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async () => {
    const km = parseFloat(distance);
    if (isNaN(km) || km <= 0) {
      Alert.alert('Error', 'Enter a valid distance');
      return;
    }

    const rateTier1 = parseFloat(settings['cra_rate_tier1'] ?? '0.70');
    const rateTier2 = parseFloat(settings['cra_rate_tier2'] ?? '0.64');
    const threshold = parseFloat(settings['tier1_threshold'] ?? '5000');

    let deductible: number | null = null;
    if (category === 'business') {
      const tier1 = Math.min(km, threshold);
      const tier2 = Math.max(0, km - threshold);
      deductible = tier1 * rateTier1 + tier2 * rateTier2;
    }

    await insertTrip({
      vehicle_id: vehicleId,
      date,
      start_time: null,
      end_time: null,
      start_lat: null,
      start_lng: null,
      end_lat: null,
      end_lng: null,
      start_address: startAddress || null,
      end_address: endAddress || null,
      km,
      category: category as 'business' | 'personal' | 'medical' | 'charity',
      purpose: purpose || null,
      notes: notes || null,
      client_name: clientName || null,
      rate_used: category === 'business' ? rateTier1 : null,
      deductible,
      auto_tracked: 0,
      inbox_status: 'classified',
    });

    router.back();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>Vehicle</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll}>
        {vehicles.map((v) => (
          <TouchableOpacity
            key={v.id}
            style={[
              styles.vehicleChip,
              {
                backgroundColor: vehicleId === v.id ? colors.primary : colors.surface,
              },
            ]}
            onPress={() => setVehicleId(v.id)}
          >
            <Text
              style={{
                color: vehicleId === v.id ? '#FFFFFF' : colors.text,
                fontSize: 13,
              }}
            >
              {v.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Start Address</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={startAddress}
        onChangeText={setStartAddress}
        placeholder="Start address"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>End Address</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={endAddress}
        onChangeText={setEndAddress}
        placeholder="End address"
        placeholderTextColor={colors.textSecondary}
      />

      <TouchableOpacity
        style={[styles.calcButton, { backgroundColor: colors.primary }]}
        onPress={handleCalculateDistance}
        disabled={calculating}
      >
        <Text style={styles.calcButtonText}>
          {calculating ? 'Calculating...' : 'Calculate Distance'}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Distance (km)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={distance}
        onChangeText={setDistance}
        placeholder="0.0"
        placeholderTextColor={colors.textSecondary}
        keyboardType="decimal-pad"
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textSecondary}
      />

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
      {purposes.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.purposeScroll}>
          {purposes.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.purposeChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setPurpose(p.label)}
            >
              <Text style={{ color: colors.text, fontSize: 12 }}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Text style={[styles.label, { color: colors.textSecondary }]}>Client Name</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={clientName}
        onChangeText={setClientName}
        placeholder="Client name (optional)"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Notes</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Additional notes"
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary }]}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>Save Trip</Text>
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
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 14,
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
  vehicleScroll: {
    maxHeight: 40,
  },
  vehicleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  calcButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  calcButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  purposeScroll: {
    marginTop: 8,
    maxHeight: 36,
  },
  purposeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
