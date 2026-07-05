import { useState, useEffect, useCallback } from 'react';
import {
  getWorkHours,
  setWorkHours,
  type WorkHourEntry,
} from '../db/queries/workHours';

interface UseWorkHoursResult {
  hours: WorkHourEntry[];
  loading: boolean;
  save: (entries: WorkHourEntry[]) => Promise<void>;
}

export function useWorkHours(): UseWorkHoursResult {
  const [hours, setHours] = useState<WorkHourEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadHours = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getWorkHours();
      setHours(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHours();
  }, [loadHours]);

  const save = useCallback(
    async (entries: WorkHourEntry[]) => {
      await setWorkHours(
        entries.map((e) => ({
          day_of_week: e.day_of_week,
          start_time: e.start_time,
          end_time: e.end_time,
          is_enabled: e.is_enabled,
        }))
      );
      await loadHours();
    },
    [loadHours]
  );

  return { hours, loading, save };
}
