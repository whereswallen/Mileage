import { useState, useEffect, useCallback } from 'react';
import { getTripsInDateRange, getInboxCount, type Trip } from '../db/queries/trips';
import { getSetting } from '../db/queries/settings';

interface WeeklyDataPoint {
  day: string;
  km: number;
}

interface DashboardStats {
  thisWeekKm: number;
  thisMonthKm: number;
  thisYearKm: number;
  businessKm: number;
  personalKm: number;
  totalDeductible: number;
  tripCount: number;
  inboxCount: number;
  weeklyData: WeeklyDataPoint[];
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function useDashboardStats(): DashboardStats {
  const [stats, setStats] = useState<DashboardStats>({
    thisWeekKm: 0,
    thisMonthKm: 0,
    thisYearKm: 0,
    businessKm: 0,
    personalKm: 0,
    totalDeductible: 0,
    tripCount: 0,
    inboxCount: 0,
    weeklyData: DAY_NAMES.map((day) => ({ day, km: 0 })),
  });

  const calculateStats = useCallback(async () => {
    const now = new Date();
    const year = now.getFullYear();

    // Date ranges
    const weekStart = getStartOfWeek(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const monthStart = new Date(year, now.getMonth(), 1);
    const monthEnd = new Date(year, now.getMonth() + 1, 0);

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    // Fetch data
    const [weekTrips, monthTrips, yearTrips, inbox] = await Promise.all([
      getTripsInDateRange(formatDate(weekStart), formatDate(weekEnd)),
      getTripsInDateRange(formatDate(monthStart), formatDate(monthEnd)),
      getTripsInDateRange(formatDate(yearStart), formatDate(yearEnd)),
      getInboxCount(),
    ]);

    // Calculate weekly data
    const weeklyData: WeeklyDataPoint[] = DAY_NAMES.map((day, index) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + index);
      const dateStr = formatDate(dayDate);
      const dayKm = weekTrips
        .filter((t) => t.date === dateStr)
        .reduce((sum, t) => sum + t.km, 0);
      return { day, km: Math.round(dayKm * 10) / 10 };
    });

    // Calculate deductible
    const rateTier1Str = await getSetting('cra_rate_tier1');
    const rateTier2Str = await getSetting('cra_rate_tier2');
    const thresholdStr = await getSetting('tier1_threshold');

    const rateTier1 = parseFloat(rateTier1Str ?? '0.70');
    const rateTier2 = parseFloat(rateTier2Str ?? '0.64');
    const threshold = parseFloat(thresholdStr ?? '5000');

    const businessKm = yearTrips
      .filter((t) => t.category === 'business')
      .reduce((sum, t) => sum + t.km, 0);

    const tier1Km = Math.min(businessKm, threshold);
    const tier2Km = Math.max(0, businessKm - threshold);
    const totalDeductible = tier1Km * rateTier1 + tier2Km * rateTier2;

    setStats({
      thisWeekKm: Math.round(weekTrips.reduce((sum, t) => sum + t.km, 0) * 10) / 10,
      thisMonthKm: Math.round(monthTrips.reduce((sum, t) => sum + t.km, 0) * 10) / 10,
      thisYearKm: Math.round(yearTrips.reduce((sum, t) => sum + t.km, 0) * 10) / 10,
      businessKm: Math.round(businessKm * 10) / 10,
      personalKm: Math.round(
        yearTrips
          .filter((t) => t.category === 'personal')
          .reduce((sum, t) => sum + t.km, 0) * 10
      ) / 10,
      totalDeductible: Math.round(totalDeductible * 100) / 100,
      tripCount: yearTrips.length,
      inboxCount: inbox,
      weeklyData,
    });
  }, []);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  return stats;
}
