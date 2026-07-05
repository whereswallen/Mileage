import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  getLiveTripState,
  subscribeTracking,
  manualStartTrip,
  manualStopTrip,
  setLiveCategory,
  setLivePurpose,
} from '../services/autoTracking';

type TripCategory = 'business' | 'personal' | 'medical' | 'charity';

interface ActiveTripState {
  isTracking: boolean;
  startTime: Date | null;
  currentKm: number;
  currentSpeed: number;
  category: TripCategory;
  purpose: string;
  vehicleId: number | null;
}

interface TripTrackerContextValue {
  tripState: ActiveTripState;
  startTrip: () => Promise<void>;
  stopTrip: () => Promise<number | null>;
  setCategory: (category: TripCategory) => void;
  setPurpose: (purpose: string) => void;
}

function readEngineState(): ActiveTripState {
  const live = getLiveTripState();
  return {
    isTracking: live.isTracking,
    startTime: live.startTime,
    currentKm: live.currentKm,
    currentSpeed: live.currentSpeed,
    category: live.category,
    purpose: live.purpose,
    vehicleId: live.vehicleId,
  };
}

const TripTrackerContext = createContext<TripTrackerContextValue>({
  tripState: readEngineState(),
  startTrip: async () => {},
  stopTrip: async () => null,
  setCategory: () => {},
  setPurpose: () => {},
});

interface TripTrackerProviderProps {
  children: ReactNode;
}

/**
 * Thin UI bridge over the auto-tracking engine. The engine owns all trip
 * state and persistence (it runs in the background task, independent of the
 * React tree); this context just mirrors it for screens to render.
 */
export function TripTrackerProvider({ children }: TripTrackerProviderProps): React.JSX.Element {
  const [tripState, setTripState] = useState<ActiveTripState>(readEngineState);

  useEffect(() => {
    const unsubscribe = subscribeTracking(() => {
      setTripState(readEngineState());
    });
    return unsubscribe;
  }, []);

  const startTrip = useCallback(async () => {
    await manualStartTrip();
    setTripState(readEngineState());
  }, []);

  const stopTrip = useCallback(async (): Promise<number | null> => {
    const tripId = await manualStopTrip();
    setTripState(readEngineState());
    return tripId;
  }, []);

  const setCategory = useCallback((category: TripCategory) => {
    setLiveCategory(category);
  }, []);

  const setPurpose = useCallback((purpose: string) => {
    setLivePurpose(purpose);
  }, []);

  return (
    <TripTrackerContext.Provider value={{ tripState, startTrip, stopTrip, setCategory, setPurpose }}>
      {children}
    </TripTrackerContext.Provider>
  );
}

export function useTripTracker(): TripTrackerContextValue {
  return useContext(TripTrackerContext);
}

export { TripTrackerContext };
