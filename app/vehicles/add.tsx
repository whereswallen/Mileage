import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useVehicles } from '../../hooks/useVehicles';
import { getVehicleById } from '../../db/queries/vehicles';
import type { Vehicle } from '../../db/queries/vehicles';

export default function AddVehicleScreen(): React.JSX.Element {
  const { colors } = useThemeContext();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { addVehicle, updateVehicle, deleteVehicle, setDefault } = useVehicles();
  const router = useRouter();

  const isEditing = !!id;
  const [name, setName] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loaded, setLoaded] = useState(!isEditing);

  useEffect(() => {
    if (id) {
      const load = async () => {
        const vehicle = await getVehicleById(parseInt(id, 10));
        if (vehicle) {
          setName(vehicle.name);
          setMake(vehicle.make ?? '');
          setModel(vehicle.model ?? '');
          setYear(vehicle.year?.toString() ?? '');
          setLicensePlate(vehicle.license_plate ?? '');
          setIsDefault(vehicle.is_default === 1);
        }
        setLoaded(true);
      };
      load();
    }
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Vehicle name is required');
      return;
    }

    const yearNum = year ? parseInt(year, 10) : null;

    if (isEditing && id) {
      const vehicleId = parseInt(id, 10);
      await updateVehicle(vehicleId, {
        name: name.trim(),
        make: make || null,
        model: model || null,
        year: yearNum,
        license_plate: licensePlate || null,
      });
      if (isDefault) {
        await setDefault(vehicleId);
      }
    } else {
      const newId = await addVehicle({
        name: name.trim(),
        make: make || null,
        model: model || null,
        year: yearNum,
        license_plate: licensePlate || null,
        is_default: isDefault ? 1 : 0,
      });
      if (isDefault) {
        await setDefault(newId);
      }
    }
    router.back();
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert('Delete Vehicle', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteVehicle(parseInt(id, 10));
          router.back();
        },
      },
    ]);
  };

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={name}
        onChangeText={setName}
        placeholder="e.g. My Car"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Make</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={make}
        onChangeText={setMake}
        placeholder="e.g. Toyota"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Model</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={model}
        onChangeText={setModel}
        placeholder="e.g. Camry"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Year</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={year}
        onChangeText={setYear}
        placeholder="e.g. 2022"
        placeholderTextColor={colors.textSecondary}
        keyboardType="number-pad"
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>License Plate</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={licensePlate}
        onChangeText={setLicensePlate}
        placeholder="e.g. ABC 1234"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="characters"
      />

      <View style={styles.switchRow}>
        <Text style={[styles.switchLabel, { color: colors.text }]}>Set as default</Text>
        <Switch
          value={isDefault}
          onValueChange={setIsDefault}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary }]}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>
          {isEditing ? 'Save Changes' : 'Add Vehicle'}
        </Text>
      </TouchableOpacity>

      {isEditing && (
        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: colors.error }]}
          onPress={handleDelete}
        >
          <Text style={[styles.deleteButtonText, { color: colors.error }]}>
            Delete Vehicle
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 15,
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
