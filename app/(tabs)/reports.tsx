import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useTrips } from '../../hooks/useTrips';
import { useSettings } from '../../hooks/useSettings';
import { exportAndShareCsv } from '../../utils/export';
import { generateAndSharePDF } from '../../services/pdfExport';

type Period = 'week' | 'month' | 'quarter' | 'year' | 'custom';

function getDateRange(period: Period): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case 'week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(year, month, diff);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
      };
    }
    case 'month': {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      return {
        start: monthStart.toISOString().split('T')[0],
        end: monthEnd.toISOString().split('T')[0],
      };
    }
    case 'quarter': {
      const q = Math.floor(month / 3);
      const qStart = new Date(year, q * 3, 1);
      const qEnd = new Date(year, q * 3 + 3, 0);
      return {
        start: qStart.toISOString().split('T')[0],
        end: qEnd.toISOString().split('T')[0],
      };
    }
    case 'year': {
      return { start: `${year}-01-01`, end: `${year}-12-31` };
    }
    default:
      return { start: `${year}-01-01`, end: now.toISOString().split('T')[0] };
  }
}

export default function ReportsScreen(): React.JSX.Element {
  const { colors } = useThemeContext();
  const { settings } = useSettings();
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const dateRange = useMemo(() => {
    if (period === 'custom' && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    return getDateRange(period);
  }, [period, customStart, customEnd]);

  const { trips, refresh } = useTrips({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const totalKm = trips.reduce((sum, t) => sum + t.km, 0);
  const businessKm = trips
    .filter((t) => t.category === 'business')
    .reduce((sum, t) => sum + t.km, 0);
  const personalKm = trips
    .filter((t) => t.category === 'personal')
    .reduce((sum, t) => sum + t.km, 0);

  const rateTier1 = parseFloat(settings['cra_rate_tier1'] ?? '0.70');
  const rateTier2 = parseFloat(settings['cra_rate_tier2'] ?? '0.64');
  const threshold = parseFloat(settings['tier1_threshold'] ?? '5000');

  const tier1Km = Math.min(businessKm, threshold);
  const tier2Km = Math.max(0, businessKm - threshold);
  const deductible = tier1Km * rateTier1 + tier2Km * rateTier2;

  const businessPercent = totalKm > 0 ? (businessKm / totalKm) * 100 : 0;
  const personalPercent = totalKm > 0 ? (personalKm / totalKm) * 100 : 0;

  // Monthly breakdown
  const monthlyBreakdown = useMemo(() => {
    const map = new Map<string, { trips: number; km: number; business: number }>();
    for (const trip of trips) {
      const monthKey = trip.date.substring(0, 7); // YYYY-MM
      const current = map.get(monthKey) ?? { trips: 0, km: 0, business: 0 };
      current.trips += 1;
      current.km += trip.km;
      if (trip.category === 'business') current.business += trip.km;
      map.set(monthKey, current);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));
  }, [trips]);

  const periods: { key: Period; label: string }[] = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'quarter', label: 'Quarter' },
    { key: 'year', label: 'Year' },
    { key: 'custom', label: 'Custom' },
  ];

  const handleExportCsv = async () => {
    await exportAndShareCsv(trips);
  };

  const handleExportPdf = async () => {
    await generateAndSharePDF(trips, {
      driverName: settings['driver_name'] ?? '',
      orgName: settings['organization_name'] ?? '',
      vehicleName: '',
      licensePlate: '',
      startDate: dateRange.start,
      endDate: dateRange.end,
      totalKm,
      businessKm,
      personalKm,
      totalDeductible: deductible,
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.periodRow}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[
              styles.periodButton,
              {
                backgroundColor:
                  period === p.key ? colors.primary : colors.surface,
              },
            ]}
            onPress={() => setPeriod(p.key)}
          >
            <Text
              style={[
                styles.periodText,
                { color: period === p.key ? '#FFFFFF' : colors.text },
              ]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {period === 'custom' && (
        <View style={styles.dateInputRow}>
          <TextInput
            style={[styles.dateInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textSecondary}
            value={customStart}
            onChangeText={setCustomStart}
          />
          <Text style={[styles.dateSeparator, { color: colors.textSecondary }]}>to</Text>
          <TextInput
            style={[styles.dateInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textSecondary}
            value={customEnd}
            onChangeText={setCustomEnd}
          />
        </View>
      )}

      <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>
        {dateRange.start} to {dateRange.end}
      </Text>

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {trips.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Total Trips
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {totalKm.toFixed(1)}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Total km
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryValue, { color: colors.businessColor }]}>
            {businessKm.toFixed(1)}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Business km
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryValue, { color: colors.personalColor }]}>
            {personalKm.toFixed(1)}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Personal km
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            ${deductible.toFixed(2)}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Deductible
          </Text>
        </View>
      </View>

      <View style={[styles.percentBarCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Split</Text>
        <View style={styles.percentBar}>
          <View
            style={[
              styles.percentSegment,
              {
                flex: businessPercent || 1,
                backgroundColor: colors.businessColor,
              },
            ]}
          />
          <View
            style={[
              styles.percentSegment,
              {
                flex: personalPercent || 1,
                backgroundColor: colors.personalColor,
              },
            ]}
          />
        </View>
        <View style={styles.percentLegend}>
          <Text style={[styles.legendText, { color: colors.businessColor }]}>
            Business {businessPercent.toFixed(0)}%
          </Text>
          <Text style={[styles.legendText, { color: colors.personalColor }]}>
            Personal {personalPercent.toFixed(0)}%
          </Text>
        </View>
      </View>

      {monthlyBreakdown.length > 0 && (
        <View style={[styles.tableCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Monthly Breakdown
          </Text>
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>Month</Text>
            <Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>Trips</Text>
            <Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>km</Text>
            <Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>Business</Text>
          </View>
          {monthlyBreakdown.map((row) => (
            <View key={row.month} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.tableCell, { color: colors.text }]}>{row.month}</Text>
              <Text style={[styles.tableCell, { color: colors.text }]}>{row.trips}</Text>
              <Text style={[styles.tableCell, { color: colors.text }]}>{row.km.toFixed(1)}</Text>
              <Text style={[styles.tableCell, { color: colors.text }]}>{row.business.toFixed(1)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.exportRow}>
        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: colors.primary }]}
          onPress={handleExportCsv}
        >
          <Text style={styles.exportButtonText}>Export CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: colors.primary }]}
          onPress={handleExportPdf}
        >
          <Text style={styles.exportButtonText}>Export PDF</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  dateSeparator: {
    fontSize: 13,
  },
  rangeLabel: {
    fontSize: 12,
    marginBottom: 14,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    width: '48%',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    flexGrow: 1,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  percentBarCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  percentBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  percentSegment: {
    height: '100%',
  },
  percentLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tableCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
  },
  exportRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  exportButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
