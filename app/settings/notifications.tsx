import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useSettings } from '../../hooks/useSettings';

export default function NotificationsScreen(): React.JSX.Element {
  const { colors } = useThemeContext();
  const { settings, updateSetting, refresh } = useSettings();

  const [classificationReminder, setClassificationReminder] = useState(true);
  const [reportReminder, setReportReminder] = useState(false);
  const [odometerFrequency, setOdometerFrequency] = useState('monthly');

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  React.useEffect(() => {
    setClassificationReminder(settings['classification_reminder_enabled'] !== 'false');
    setReportReminder(settings['report_reminder_enabled'] === 'true');
    setOdometerFrequency(settings['odometer_reminder_frequency'] ?? 'monthly');
  }, [settings]);

  const handleClassificationChange = async (value: boolean) => {
    setClassificationReminder(value);
    await updateSetting('classification_reminder_enabled', value.toString());
  };

  const handleReportChange = async (value: boolean) => {
    setReportReminder(value);
    await updateSetting('report_reminder_enabled', value.toString());
  };

  const handleOdometerFrequency = async (freq: string) => {
    setOdometerFrequency(freq);
    await updateSetting('odometer_reminder_frequency', freq);
  };

  const frequencies = ['weekly', 'monthly', 'never'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.row, { backgroundColor: colors.surface }]}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Classification reminder
          </Text>
          <Switch
            value={classificationReminder}
            onValueChange={handleClassificationChange}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

        <View style={[styles.row, { backgroundColor: colors.surface }]}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Report reminder
          </Text>
          <Switch
            value={reportReminder}
            onValueChange={handleReportChange}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Odometer Reminder
        </Text>
        <View style={styles.frequencyRow}>
          {frequencies.map((freq) => (
            <TouchableOpacity
              key={freq}
              style={[
                styles.freqButton,
                {
                  backgroundColor:
                    odometerFrequency === freq ? colors.primary : colors.surface,
                },
              ]}
              onPress={() => handleOdometerFrequency(freq)}
            >
              <Text
                style={{
                  color: odometerFrequency === freq ? '#FFFFFF' : colors.text,
                  fontSize: 13,
                  fontWeight: '500',
                  textTransform: 'capitalize',
                }}
              >
                {freq}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
  },
  rowLabel: {
    fontSize: 15,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 10,
    marginBottom: 4,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
});
