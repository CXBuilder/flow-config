import { useState, ReactNode, createContext, useMemo, useContext } from 'react';
import FlashBar from '../components/FlashBar';
import logger from 'loglevel';

type AlertType = 'success' | 'warning' | 'info' | 'error' | 'in-progress';

interface IAlertContext {
  /**
   *
   * @param content
   * @param type @default success
   * @returns
   */
  setAlert: (content: React.ReactNode, type?: AlertType) => void;
}

const AlertContext = createContext<IAlertContext>({
  setAlert: () => {
    return undefined;
  }
});

interface Alert {
  type: AlertType;
  content: React.ReactNode;
}

/**
 * Provides a standard mechanism for alerting the user
 */
export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<Alert>();

  const ctx: IAlertContext = useMemo(
    () => ({
      setAlert: (content: React.ReactNode, type: AlertType = 'success') => {
        if (content) {
          if (typeof content === 'string') {
            if (type === 'error') {
              logger.error(content);
            } else if (type === 'warning') {
              logger.warn(content);
            }
          }

          setAlert({ content, type });
        } else {
          setAlert(undefined);
        }
      }
    }),
    []
  );

  return (
    <AlertContext.Provider value={ctx}>
      {alert && <FlashBar type={alert.type}>{alert.content}</FlashBar>}
      {children}
    </AlertContext.Provider>
  );
}

export const useAlert = () => useContext(AlertContext);
