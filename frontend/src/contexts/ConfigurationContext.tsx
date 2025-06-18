import { createContext } from 'react';
import { InitResponse } from '../shared';

const ConfigurationContext = createContext<InitResponse | undefined>(undefined);

export default ConfigurationContext;
