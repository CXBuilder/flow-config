import { createContext } from 'react';
import { Settings } from '../shared';

const SettingsContext = createContext<Settings | undefined>(undefined);

export default SettingsContext;
