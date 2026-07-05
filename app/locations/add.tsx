import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useSavedLocations } from '../../hooks/useSavedLocations';
import { getAllLocations } from '../../db/queries/savedLocations';
import { categories } from '../../constants/categories';
import { forwardGeocode } from '../../services/geocoding';

export default function AddLocationScreen(): React.JSX.Element {
  const { colors } = useThemeContext();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { add, update, delete: deleteLocation } = useSavedLocations();
  const router = useRouter();

  const isEditing = !!id;
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [radius, setRadius] = useState('200');
  const [loaded, setLoaded] = useState(!isEditing);

  useEffect(() => {
    if (id) {
      const load = async () => {
        const locations = await getAllLocations();
        const location = locations.find((l) => l.id === parseInt(id, 10));
        if (location) {
          setName(location.name);
          setAddress(location.address ?? '');
          setCategory(location.default_category);
          setRadius(location.radius_meters.toString());
        }
        setLoaded(true);
      };
      load();
    }
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Location name is required');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Error', 'Address is required');
      return;
    }

    // Geocode the address to get coordinates
    const geocoded = await forwardGeocode(address);
    if (!geocoded) {
      Alert.alert('Error', 'Could not geocode the address. Please check and try again.');
      return;
    }

    const radiusMeters = parseInt(radius, 10) || 200;

    if (isEditing && id) {
      await update(parseInt(id, 10), {
        name: name.trim(),
        address: address.trim(),
        latitude: geocoded.lat,
        longitude: geocoded.lng,
        radius_meters: radiusMeters,
        default_category: category as 'business' | 'personal' | 'medical' | 'charity' | null,
      });
    } else {
      await add({
        name: name.trim(),
        address: address.trim(),
        latitude: geocoded.lat,
        longitude: geocoded.lng,
        radius_meters: radiusMeters,
        default_category: category as 'business' | 'personal' | 'medical' | 'charity' | null,
      });
    }
    router.back();
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert('Delete Location', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteLocation(parseInt(id, 10));
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
        placeholder="e.g. Office, Home"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Address</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={address}
        onChangeText={setAddress}
        placeholder="Street address"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Default Category</Text>
      <View style={styles.categoryRow}>
        <TouchableOpacity
          style={[
            styles.catButton,
            {
              backgroundColor: category === null ? colors.primary : colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
          onPress={() => setCategory(null)}
        >
          <Text
            style={{
              color: category === null ? '#FFFFFF' : colors.text,
              fontSize: 12,
              fontWeight: '500',
            }}
          >
            None
          </Text>
        </TouchableOpacity>
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
                fontSize: 12,
                fontWeight: '500',
              }}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Radius (meters): {radius}m
      </Text>
      <View style={styles.radiusRow}>
        <TouchableOpacity
          style={[styles.radiusButton, { backgroundColor: colors.surface }]}
          onPress={() => setRadius('100')}
        >
          <Text style={{ color: radius === '100' ? colors.primary : colors.text, fontSize: 13 }}>100</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radiusButton, { backgroundColor: colors.surface }]}
          onPress={() => setRadius('200')}
        >
          <Text style={{ color: radius === '200' ? colors.primary : colors.text, fontSize: 13 }}>200</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radiusButton, { backgroundColor: colors.surface }]}
          onPress={() => setRadius('300')}
        >
          <Text style={{ color: radius === '300' ? colors.primary : colors.text, fontSize: 13 }}>300</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radiusButton, { backgroundColor: colors.surface }]}
          onPress={() => setRadius('500')}
        >
          <Text style={{ color: radius === '500' ? colors.primary : colors.text, fontSize: 13 }}>500</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary }]}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>
          {isEditing ? 'Save Changes' : 'Add Location'}
        </Text>
      </TouchableOpacity>

      {isEditing && (
        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: colors.error }]}
          onPress={handleDelete}
        >
          <Text style={[styles.deleteButtonText, { color: colors.error }]}>
            Delete Location
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
  categoryRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  catButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
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
