import { useEffect, useState, ReactNode } from 'react';
import { useAlert } from './AlertProvider';
import logger from 'loglevel';
import { Settings } from '../shared';
import { useApi } from '../hooks/useApi';
import SettingsContext from './SettingsContext';

function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);

  const { apiFetch } = useApi();
  const { setAlert } = useAlert();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const fetchedSettings = await apiFetch<Settings>(
          'GET',
          '/api/settings'
        );
        setSettings(fetchedSettings);
      } catch (error) {
        logger.error('Failed to load settings:', error);
        setAlert('Error loading settings', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {loading ? <div>Loading Settings...</div> : children}
    </SettingsContext.Provider>
  );
}

export default SettingsProvider;
