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

export default function RatesScreen(): React.JSX.Element {
  const { colors } = useThemeContext();
  const { settings, updateSetting, refresh } = useSettings();
  const router = useRouter();

  const [tier1Rate, setTier1Rate] = useState('0.70');
  const [tier2Rate, setTier2Rate] = useState('0.64');
  const [threshold, setThreshold] = useState('5000');

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  React.useEffect(() => {
    setTier1Rate(settings['cra_rate_tier1'] ?? '0.70');
    setTier2Rate(settings['cra_rate_tier2'] ?? '0.64');
    setThreshold(settings['tier1_threshold'] ?? '5000');
  }, [settings]);

  const handleSave = async () => {
    const r1 = parseFloat(tier1Rate);
    const r2 = parseFloat(tier2Rate);
    const t = parseFloat(threshold);

    if (isNaN(r1) || isNaN(r2) || isNaN(t)) {
      Alert.alert('Error', 'Please enter valid numbers');
      return;
    }

    await updateSetting('cra_rate_tier1', tier1Rate);
    await updateSetting('cra_rate_tier2', tier2Rate);
    await updateSetting('tier1_threshold', threshold);
    Alert.alert('Saved', 'Rates updated');
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Tier 1 Rate ($/km)
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          value={tier1Rate}
          onChangeText={setTier1Rate}
          keyboardType="decimal-pad"
          placeholder="0.70"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Tier 2 Rate ($/km)
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          value={tier2Rate}
          onChangeText={setTier2Rate}
          keyboardType="decimal-pad"
          placeholder="0.64"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Tier 1 Threshold (km)
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          value={threshold}
          onChangeText={setThreshold}
          keyboardType="number-pad"
          placeholder="5000"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          CRA rates for the current tax year. Tier 1 rate applies for the first
          {' '}{threshold} km of business driving, Tier 2 for the remainder.
        </Text>

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
  helpText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 16,
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
