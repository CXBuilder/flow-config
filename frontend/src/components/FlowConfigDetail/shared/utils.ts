import { VOICES_BY_LANGUAGE } from './constants';

// Default voice for each language
export const getDefaultVoice = (language: string): string => {
  const voices = VOICES_BY_LANGUAGE[language];
  return voices?.[0]?.value || 'Joanna';
};