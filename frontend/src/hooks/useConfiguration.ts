import { useContext } from 'react';
import ConfigurationContext from '../contexts/ConfigurationContext';

/**
 * Hook to access the application configuration and path utilities
 */
export function useConfiguration() {
  const config = useContext(ConfigurationContext);
  
  if (!config) {
    throw new Error('useConfiguration must be used within a ConfigurationProvider');
  }
  
  return config;
}