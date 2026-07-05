import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  startBackgroundLocationUpdates,
  stopBackgroundLocationUpdates,
  setLocationCallback,
} from '../tasks/locationTask';
import { insertTrip } from '../db/queries/trips';
import { insertPoints } from '../db/queries/tripPoints';
import { classifyTrip } from '../services/autoClassification';
import { getSetting } from '../db/queries/settings';
import * as Location from 'expo-location';

type TripCategory = 'business' | 'personal' | 'medical' | 'charity';

interface RoutePoint {
  lat: number;
  lng: number;
}

interface ActiveTripState {
  isTracking: boolean;
  startTime: Date | null;
  currentKm: number;
  currentSpeed: number;
  routePoints: RoutePoint[];
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

const initialState: ActiveTripState = {
  isTracking: false,
  startTime: null,
  currentKm: 0,
  currentSpeed: 0,
  routePoints: [],
  category: 'business',
  purpose: '',
  vehicleId: null,
};

const TripTrackerContext = createContext<TripTrackerContextValue>({
  tripState: initialState,
  startTrip: async () => {},
  stopTrip: async () => null,
  setCategory: () => {},
  setPurpose: () => {},
});

function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface TripTrackerProviderProps {
  children: ReactNode;
}

export function TripTrackerProvider({ children }: TripTrackerProviderProps): React.JSX.Element {
  const [tripState, setTripState] = useState<ActiveTripState>(initialState);
  const tripStateRef = useRef<ActiveTripState>(initialState);

  useEffect(() => {
    tripStateRef.current = tripState;
  }, [tripState]);

  useEffect(() => {
    setLocationCallback((locations: Location.LocationObject[]) => {
      const current = tripStateRef.current;
      if (!current.isTracking) return;

      const newPoints: RoutePoint[] = locations.map((loc) => ({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      }));

      let addedKm = 0;
      const existingPoints = current.routePoints;
      let prevPoint = existingPoints.length > 0 ? existingPoints[existingPoints.length - 1] : null;

      for (const point of newPoints) {
        if (prevPoint) {
          addedKm += haversineDistanceKm(prevPoint.lat, prevPoint.lng, point.lat, point.lng);
        }
        prevPoint = point;
      }

      const latestLocation = locations[locations.length - 1];
      const speed = latestLocation.coords.speed ?? 0;

      setTripState((prev) => ({
        ...prev,
        routePoints: [...prev.routePoints, ...newPoints],
        currentKm: prev.currentKm + addedKm,
        currentSpeed: Math.max(0, speed * 3.6), // m/s to km/h
      }));
    });

    return () => {
      setLocationCallback(null);
    };
  }, []);

  const startTrip = useCallback(async () => {
    const defaultCategory = (await getSetting('default_category')) as TripCategory | null;

    await startBackgroundLocationUpdates();

    setTripState({
      isTracking: true,
      startTime: new Date(),
      currentKm: 0,
      currentSpeed: 0,
      routePoints: [],
      category: defaultCategory ?? 'business',
      purpose: '',
      vehicleId: tripStateRef.current.vehicleId,
    });
  }, []);

  const stopTrip = useCallback(async (): Promise<number | null> => {
    const current = tripStateRef.current;
    if (!current.isTracking || !current.startTime) return null;

    await stopBackgroundLocationUpdates();

    const endTime = new Date();
    const startPoint = current.routePoints.length > 0 ? current.routePoints[0] : null;
    const endPoint =
      current.routePoints.length > 1
        ? current.routePoints[current.routePoints.length - 1]
        : null;

    const tripId = await insertTrip({
      vehicle_id: current.vehicleId,
      date: current.startTime.toISOString().split('T')[0],
      start_time: current.startTime.toISOString(),
      end_time: endTime.toISOString(),
      start_lat: startPoint?.lat ?? null,
      start_lng: startPoint?.lng ?? null,
      end_lat: endPoint?.lat ?? null,
      end_lng: endPoint?.lng ?? null,
      start_address: null,
      end_address: null,
      km: current.currentKm,
      category: current.category,
      purpose: current.purpose || null,
      notes: null,
      client_name: null,
      rate_used: null,
      deductible: null,
      auto_tracked: 1,
      inbox_status: 'unclassified',
    });

    // Save route points
    if (current.routePoints.length > 0) {
      const points = current.routePoints.map((point, index) => ({
        latitude: point.lat,
        longitude: point.lng,
        speed: null,
        timestamp: new Date(
          current.startTime!.getTime() + index * 5000
        ).toISOString(),
      }));
      await insertPoints(tripId, points);
    }

    // Run auto-classification
    if (startPoint) {
      const classifiedCategory = await classifyTrip(
        tripId,
        startPoint.lat,
        startPoint.lng,
        endPoint?.lat ?? null,
        endPoint?.lng ?? null,
        current.startTime.toISOString()
      );

      if (classifiedCategory) {
        const { updateTrip } = await import('../db/queries/trips');
        await updateTrip(tripId, {
          category: classifiedCategory,
          inbox_status: 'classified',
        });
      }
    }

    setTripState(initialState);
    return tripId;
  }, []);

  const setCategory = useCallback((category: TripCategory) => {
    setTripState((prev) => ({ ...prev, category }));
  }, []);

  const setPurpose = useCallback((purpose: string) => {
    setTripState((prev) => ({ ...prev, purpose }));
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
