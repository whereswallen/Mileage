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
import { useRouter } from 'expo-router';
import { useThemeContext } from '../contexts/ThemeContext';
import { useWorkHours } from '../hooks/useWorkHours';
import type { WorkHourEntry } from '../db/queries/workHours';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface DayRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_enabled: number;
}

export default function WorkHoursScreen(): React.JSX.Element {
  const { colors } = useThemeContext();
  const { hours, loading, save } = useWorkHours();
  const router = useRouter();

  const [rows, setRows] = useState<DayRow[]>(
    Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      start_time: '09:00',
      end_time: '17:00',
      is_enabled: i >= 1 && i <= 5 ? 1 : 0,
    }))
  );

  useEffect(() => {
    if (hours.length > 0) {
      const mapped = Array.from({ length: 7 }, (_, i) => {
        const existing = hours.find((h) => h.day_of_week === i);
        if (existing) {
          return {
            day_of_week: existing.day_of_week,
            start_time: existing.start_time,
            end_time: existing.end_time,
            is_enabled: existing.is_enabled,
          };
        }
        return {
          day_of_week: i,
          start_time: '09:00',
          end_time: '17:00',
          is_enabled: 0,
        };
      });
      setRows(mapped);
    }
  }, [hours]);

  const updateRow = (index: number, field: keyof DayRow, value: string | number) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = async () => {
    await save(
      rows.map((r) => ({
        id: 0,
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
        is_enabled: r.is_enabled,
      }))
    );
    Alert.alert('Saved', 'Work hours updated');
    router.back();
  };

  // Reorder to show Mon-Sun (index 1-6, then 0)
  const orderedIndices = [1, 2, 3, 4, 5, 6, 0];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.explanation, { color: colors.textSecondary }]}>
        Set your typical work hours. Trips during work hours will be
        automatically classified as Business.
      </Text>

      {orderedIndices.map((dayIndex) => {
        const row = rows[dayIndex];
        return (
          <View
            key={dayIndex}
            style={[styles.dayRow, { backgroundColor: colors.surface }]}
          >
            <View style={styles.dayHeader}>
              <Text style={[styles.dayLabel, { color: colors.text }]}>
                {DAY_NAMES[dayIndex]}
              </Text>
              <Switch
                value={row.is_enabled === 1}
                onValueChange={(val) =>
                  updateRow(dayIndex, 'is_enabled', val ? 1 : 0)
                }
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
            {row.is_enabled === 1 && (
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.timeInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={row.start_time}
                  onChangeText={(val) => updateRow(dayIndex, 'start_time', val)}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={[styles.timeSep, { color: colors.textSecondary }]}>to</Text>
                <TextInput
                  style={[styles.timeInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={row.end_time}
                  onChangeText={(val) => updateRow(dayIndex, 'end_time', val)}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            )}
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary }]}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>Save</Text>
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
  explanation: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  dayRow: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  timeSep: {
    fontSize: 13,
  },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
