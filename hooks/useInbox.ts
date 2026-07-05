import { useState, useEffect, useCallback } from 'react';
import {
  getInboxTrips,
  getInboxCount,
  classifyTrip as classifyTripDb,
  bulkClassify as bulkClassifyDb,
  type Trip,
} from '../db/queries/trips';

interface UseInboxResult {
  trips: Trip[];
  count: number;
  loading: boolean;
  refresh: () => void;
  classify: (id: number, category: string) => Promise<void>;
  bulkClassify: (ids: number[], category: string) => Promise<void>;
}

export function useInbox(): UseInboxResult {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    try {
      const [inboxTrips, inboxCount] = await Promise.all([
        getInboxTrips(),
        getInboxCount(),
      ]);
      setTrips(inboxTrips);
      setCount(inboxCount);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  const refresh = useCallback(() => {
    loadInbox();
  }, [loadInbox]);

  const classify = useCallback(
    async (id: number, category: string) => {
      await classifyTripDb(id, category as Trip['category']);
      setTrips((prev) => prev.filter((t) => t.id !== id));
      setCount((prev) => Math.max(0, prev - 1));
    },
    []
  );

  const bulkClassify = useCallback(
    async (ids: number[], category: string) => {
      await bulkClassifyDb(ids, category as Trip['category']);
      setTrips((prev) => prev.filter((t) => !ids.includes(t.id)));
      setCount((prev) => Math.max(0, prev - ids.length));
    },
    []
  );

  return { trips, count, loading, refresh, classify, bulkClassify };
}
