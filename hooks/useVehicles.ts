import { useState, useEffect, useCallback } from 'react';
import {
  getAllVehicles,
  insertVehicle,
  updateVehicle as updateVehicleDb,
  deleteVehicle as deleteVehicleDb,
  setDefaultVehicle,
  type Vehicle,
} from '../db/queries/vehicles';

interface UseVehiclesResult {
  vehicles: Vehicle[];
  loading: boolean;
  refresh: () => void;
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'created_at'>) => Promise<number>;
  updateVehicle: (id: number, partial: Partial<Omit<Vehicle, 'id' | 'created_at'>>) => Promise<void>;
  deleteVehicle: (id: number) => Promise<void>;
  setDefault: (id: number) => Promise<void>;
}

export function useVehicles(): UseVehiclesResult {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAllVehicles();
      setVehicles(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const refresh = useCallback(() => {
    loadVehicles();
  }, [loadVehicles]);

  const addVehicle = useCallback(
    async (vehicle: Omit<Vehicle, 'id' | 'created_at'>): Promise<number> => {
      const id = await insertVehicle(vehicle);
      await loadVehicles();
      return id;
    },
    [loadVehicles]
  );

  const updateVehicle = useCallback(
    async (id: number, partial: Partial<Omit<Vehicle, 'id' | 'created_at'>>) => {
      await updateVehicleDb(id, partial);
      await loadVehicles();
    },
    [loadVehicles]
  );

  const deleteVehicle = useCallback(
    async (id: number) => {
      await deleteVehicleDb(id);
      await loadVehicles();
    },
    [loadVehicles]
  );

  const setDefault = useCallback(
    async (id: number) => {
      await setDefaultVehicle(id);
      await loadVehicles();
    },
    [loadVehicles]
  );

  return { vehicles, loading, refresh, addVehicle, updateVehicle, deleteVehicle, setDefault };
}
