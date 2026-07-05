import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useSettings } from '../../hooks/useSettings';

export default function ProfileScreen(): React.JSX.Element {
  const { colors } = useThemeContext();
  const { settings, updateSetting, refresh } = useSettings();
  const router = useRouter();

  const [driverName, setDriverName] = useState('');
  const [orgName, setOrgName] = useState('');

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  React.useEffect(() => {
    setDriverName(settings['driver_name'] ?? '');
    setOrgName(settings['organization_name'] ?? '');
  }, [settings]);

  const handleSave = async () => {
    await updateSetting('driver_name', driverName);
    await updateSetting('organization_name', orgName);
    Alert.alert('Saved', 'Profile updated');
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Driver Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          value={driverName}
          onChangeText={setDriverName}
          placeholder="Your name"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Organization Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          value={orgName}
          onChangeText={setOrgName}
          placeholder="Company / Organization"
          placeholderTextColor={colors.textSecondary}
        />

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
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
