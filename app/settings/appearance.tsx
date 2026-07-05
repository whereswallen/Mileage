import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useThemeContext } from '../../contexts/ThemeContext';

type ThemeMode = 'system' | 'light' | 'dark';

export default function AppearanceScreen(): React.JSX.Element {
  const { colors, theme, setThemeMode } = useThemeContext();

  const options: { key: ThemeMode; label: string }[] = [
    { key: 'system', label: 'System' },
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
  ];

  // Determine which is currently active based on the resolved theme
  // We need to check the stored mode, but we only have the resolved theme.
  // We'll use local state to track the mode selection.
  const [selectedMode, setSelectedMode] = React.useState<ThemeMode>('system');

  React.useEffect(() => {
    // Load the stored mode from settings
    const loadMode = async () => {
      const { getSetting } = await import('../../db/queries/settings');
      const stored = await getSetting('dark_mode');
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setSelectedMode(stored);
      }
    };
    loadMode();
  }, []);

  const handleSelect = (mode: ThemeMode) => {
    setSelectedMode(mode);
    setThemeMode(mode);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.option, { backgroundColor: colors.surface }]}
            onPress={() => handleSelect(opt.key)}
          >
            <Text style={[styles.optionLabel, { color: colors.text }]}>
              {opt.label}
            </Text>
            <View
              style={[
                styles.radio,
                { borderColor: colors.primary },
                selectedMode === opt.key && {
                  backgroundColor: colors.primary,
                },
              ]}
            >
              {selectedMode === opt.key && (
                <View style={styles.radioInner} />
              )}
            </View>
          </TouchableOpacity>
        ))}
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
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
  },
  optionLabel: {
    fontSize: 15,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
});
