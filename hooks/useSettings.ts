import { useState, useEffect, useCallback } from 'react';
import {
  getAllSettings,
  getSetting as getSettingDb,
  setSetting,
} from '../db/queries/settings';

interface UseSettingsResult {
  settings: Record<string, string>;
  loading: boolean;
  getSetting: (key: string) => string | null;
  updateSetting: (key: string, value: string) => Promise<void>;
  refresh: () => void;
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAllSettings();
      setSettings(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const getSetting = useCallback(
    (key: string): string | null => {
      return settings[key] ?? null;
    },
    [settings]
  );

  const updateSetting = useCallback(
    async (key: string, value: string) => {
      await setSetting(key, value);
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const refresh = useCallback(() => {
    loadSettings();
  }, [loadSettings]);

  return { settings, loading, getSetting, updateSetting, refresh };
}
