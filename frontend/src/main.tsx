import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import ConfigurationProvider from './contexts/ConfigurationProvider.tsx';
import CognitoAuthenticationProvider from './contexts/CognitoAuthenticationProvider.tsx';
import { applyConnectTheme } from '@amazon-connect/theme';
import { AlertProvider } from './contexts/AlertProvider.tsx';
import logger from 'loglevel';

// Set default log level to 'error'
logger.setDefaultLevel('error');
// Set log level to 'debug' if running on localhost
if (location.hostname === 'localhost') {
  logger.setLevel('debug');
}
// Set log level from query string if present
const logLevelParam = new URLSearchParams(window.location.search).get(
  'loglevel'
);
if (logLevelParam) {
  logger.setLevel(logLevelParam as logger.LogLevelDesc);
}

applyConnectTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlertProvider>
      <ConfigurationProvider>
        <CognitoAuthenticationProvider>
          <App />
        </CognitoAuthenticationProvider>
      </ConfigurationProvider>
    </AlertProvider>
  </StrictMode>
);
