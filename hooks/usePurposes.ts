import { useState, useEffect, useCallback } from 'react';
import {
  getPurposes,
  addPurpose as addPurposeDb,
  deletePurpose as deletePurposeDb,
  type Purpose,
} from '../db/queries/purposes';

interface UsePurposesResult {
  purposes: Purpose[];
  add: (label: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export function usePurposes(): UsePurposesResult {
  const [purposes, setPurposes] = useState<Purpose[]>([]);

  const loadPurposes = useCallback(async () => {
    const result = await getPurposes();
    setPurposes(result);
  }, []);

  useEffect(() => {
    loadPurposes();
  }, [loadPurposes]);

  const add = useCallback(
    async (label: string) => {
      await addPurposeDb(label);
      await loadPurposes();
    },
    [loadPurposes]
  );

  const remove = useCallback(
    async (id: number) => {
      await deletePurposeDb(id);
      await loadPurposes();
    },
    [loadPurposes]
  );

  return { purposes, add, remove };
}
