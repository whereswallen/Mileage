import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getAllVehicles, getDefaultVehicle, type Vehicle } from '../db/queries/vehicles';

interface VehicleContextValue {
  vehicles: Vehicle[];
  selectedVehicleId: number | null;
  setSelectedVehicle: (id: number) => void;
  refreshVehicles: () => void;
}

const VehicleContext = createContext<VehicleContextValue>({
  vehicles: [],
  selectedVehicleId: null,
  setSelectedVehicle: () => {},
  refreshVehicles: () => {},
});

interface VehicleProviderProps {
  children: ReactNode;
}

export function VehicleProvider({ children }: VehicleProviderProps): React.JSX.Element {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

  const loadVehicles = useCallback(async () => {
    const allVehicles = await getAllVehicles();
    setVehicles(allVehicles);

    const defaultVehicle = await getDefaultVehicle();
    if (defaultVehicle) {
      setSelectedVehicleId(defaultVehicle.id);
    } else if (allVehicles.length > 0) {
      setSelectedVehicleId(allVehicles[0].id);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const setSelectedVehicle = useCallback((id: number) => {
    setSelectedVehicleId(id);
  }, []);

  const refreshVehicles = useCallback(() => {
    loadVehicles();
  }, [loadVehicles]);

  return (
    <VehicleContext.Provider
      value={{ vehicles, selectedVehicleId, setSelectedVehicle, refreshVehicles }}
    >
      {children}
    </VehicleContext.Provider>
  );
}

export function useVehicleContext(): VehicleContextValue {
  return useContext(VehicleContext);
}

export { VehicleContext };
