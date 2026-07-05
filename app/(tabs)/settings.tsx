import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../contexts/ThemeContext';

interface SettingsRowProps {
  label: string;
  route: string;
  colors: ReturnType<typeof useThemeContext>['colors'];
  onPress: (route: string) => void;
}

function SettingsRow({ label, route, colors, onPress }: SettingsRowProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      onPress={() => onPress(route)}
    >
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>{'>'}</Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen(): React.JSX.Element {
  const { colors } = useThemeContext();
  const router = useRouter();

  const navigate = (route: string) => {
    router.push(route as never);
  };

  const sections = [
    { label: 'Profile', route: '/settings/profile' },
    { label: 'Vehicles', route: '/vehicles' },
    { label: 'Work Hours', route: '/work-hours' },
    { label: 'Saved Locations', route: '/locations' },
    { label: 'Tracking', route: '/settings/tracking' },
    { label: 'CRA Rates', route: '/settings/rates' },
    { label: 'Notifications', route: '/settings/notifications' },
    { label: 'Appearance', route: '/settings/appearance' },
    { label: 'Pause Tracking', route: '/settings/pause' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.section}>
        {sections.map((item) => (
          <SettingsRow
            key={item.route}
            label={item.label}
            route={item.route}
            colors={colors}
            onPress={navigate}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingVertical: 16,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '400',
  },
  chevron: {
    fontSize: 16,
    fontWeight: '300',
  },
});
