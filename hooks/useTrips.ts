import { useState, useEffect, useCallback } from 'react';
import {
  getAllTrips,
  getTripsInDateRange,
  deleteTrip as deleteTripDb,
  type Trip,
} from '../db/queries/trips';

interface UseTripsOptions {
  startDate?: string;
  endDate?: string;
  category?: string;
  vehicleId?: number;
}

interface UseTripsResult {
  trips: Trip[];
  loading: boolean;
  refresh: () => void;
  deleteTrip: (id: number) => void;
}

export function useTrips(options?: UseTripsOptions): UseTripsResult {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      let result: Trip[];

      if (options?.startDate && options?.endDate) {
        result = await getTripsInDateRange(options.startDate, options.endDate, {
          category: options.category as Trip['category'] | undefined,
          vehicle_id: options.vehicleId,
        });
      } else {
        result = await getAllTrips();

        if (options?.category) {
          result = result.filter((t) => t.category === options.category);
        }
        if (options?.vehicleId !== undefined) {
          result = result.filter((t) => t.vehicle_id === options.vehicleId);
        }
      }

      setTrips(result);
    } finally {
      setLoading(false);
    }
  }, [options?.startDate, options?.endDate, options?.category, options?.vehicleId]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const refresh = useCallback(() => {
    loadTrips();
  }, [loadTrips]);

  const deleteTrip = useCallback(
    async (id: number) => {
      await deleteTripDb(id);
      setTrips((prev) => prev.filter((t) => t.id !== id));
    },
    []
  );

  return { trips, loading, refresh, deleteTrip };
}
