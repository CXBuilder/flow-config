import { useEffect, useState, ReactNode } from 'react';
import ConfigurationContext from './ConfigurationContext';
import { useAlert } from './AlertProvider';
import { getApiUrl } from '../utils/paths';
import logger from 'loglevel';
import { InitResponse } from '../shared';

function ConfigurationProvider({ children }: { children: ReactNode }) {
  const [configuration, setConfiguration] = useState<InitResponse | undefined>(
    undefined
  );
  const [initialized, setInitialized] = useState<boolean>(false);

  const { setAlert } = useAlert();

  useEffect(() => {
    fetch(getApiUrl('/api/init'))
      .then((response) => response.json())
      .then((data) => {
        setConfiguration(data);
        setInitialized(true);
      })
      .catch((error) => {
        logger.error(error);
        setAlert('Error fetching configuration', 'error');
      });
  }, []);

  return (
    <ConfigurationContext.Provider value={configuration}>
      {initialized ? children : <div>Initializing Config...</div>}
    </ConfigurationContext.Provider>
  );
}

export default ConfigurationProvider;
