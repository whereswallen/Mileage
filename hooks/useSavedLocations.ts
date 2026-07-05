import { useState, useEffect, useCallback } from 'react';
import {
  getAllLocations,
  insertLocation,
  updateLocation as updateLocationDb,
  deleteLocation as deleteLocationDb,
  type SavedLocation,
} from '../db/queries/savedLocations';

interface UseSavedLocationsResult {
  locations: SavedLocation[];
  loading: boolean;
  refresh: () => void;
  add: (location: Omit<SavedLocation, 'id' | 'visit_count'>) => Promise<number>;
  update: (id: number, partial: Partial<Omit<SavedLocation, 'id' | 'visit_count'>>) => Promise<void>;
  delete: (id: number) => Promise<void>;
}

export function useSavedLocations(): UseSavedLocationsResult {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadLocations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAllLocations();
      setLocations(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const refresh = useCallback(() => {
    loadLocations();
  }, [loadLocations]);

  const add = useCallback(
    async (location: Omit<SavedLocation, 'id' | 'visit_count'>): Promise<number> => {
      const id = await insertLocation(location);
      await loadLocations();
      return id;
    },
    [loadLocations]
  );

  const update = useCallback(
    async (id: number, partial: Partial<Omit<SavedLocation, 'id' | 'visit_count'>>) => {
      await updateLocationDb(id, partial);
      await loadLocations();
    },
    [loadLocations]
  );

  const del = useCallback(
    async (id: number) => {
      await deleteLocationDb(id);
      await loadLocations();
    },
    [loadLocations]
  );

  return { locations, loading, refresh, add, update, delete: del };
}
