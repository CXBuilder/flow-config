// Available voices for different languages (Amazon Polly voices)
export const VOICES_BY_LANGUAGE: Record<string, Array<{ label: string; value: string }>> = {
  'en-US': [
    { label: 'Joanna (Female)', value: 'Joanna' },
    { label: 'Matthew (Male)', value: 'Matthew' },
    { label: 'Ivy (Child)', value: 'Ivy' },
    { label: 'Justin (Male)', value: 'Justin' },
    { label: 'Kendra (Female)', value: 'Kendra' },
    { label: 'Kimberly (Female)', value: 'Kimberly' },
    { label: 'Salli (Female)', value: 'Salli' },
    { label: 'Joey (Male)', value: 'Joey' },
  ],
  'en-GB': [
    { label: 'Emma (Female)', value: 'Emma' },
    { label: 'Brian (Male)', value: 'Brian' },
    { label: 'Amy (Female)', value: 'Amy' },
  ],
  'es-US': [
    { label: 'Lupe (Female)', value: 'Lupe' },
    { label: 'Miguel (Male)', value: 'Miguel' },
    { label: 'Penelope (Female)', value: 'Penelope' },
  ],
  'es-ES': [
    { label: 'Conchita (Female)', value: 'Conchita' },
    { label: 'Enrique (Male)', value: 'Enrique' },
    { label: 'Lucia (Female)', value: 'Lucia' },
  ],
  'fr-FR': [
    { label: 'Celine (Female)', value: 'Celine' },
    { label: 'Mathieu (Male)', value: 'Mathieu' },
    { label: 'Lea (Female)', value: 'Lea' },
  ],
  'fr-CA': [
    { label: 'Chantal (Female)', value: 'Chantal' },
  ],
  'de-DE': [
    { label: 'Marlene (Female)', value: 'Marlene' },
    { label: 'Hans (Male)', value: 'Hans' },
    { label: 'Vicki (Female)', value: 'Vicki' },
  ],
  'it-IT': [
    { label: 'Carla (Female)', value: 'Carla' },
    { label: 'Giorgio (Male)', value: 'Giorgio' },
    { label: 'Bianca (Female)', value: 'Bianca' },
  ],
  'pt-BR': [
    { label: 'Camila (Female)', value: 'Camila' },
    { label: 'Ricardo (Male)', value: 'Ricardo' },
    { label: 'Vitoria (Female)', value: 'Vitoria' },
  ],
  'ja-JP': [
    { label: 'Mizuki (Female)', value: 'Mizuki' },
    { label: 'Takumi (Male)', value: 'Takumi' },
  ],
  'ko-KR': [
    { label: 'Seoyeon (Female)', value: 'Seoyeon' },
  ],
  'zh-CN': [
    { label: 'Zhiyu (Female)', value: 'Zhiyu' },
  ],
};

export const LANGUAGE_OPTIONS = [
  { label: 'English (US)', value: 'en-US' },
  { label: 'Spanish (US)', value: 'es-US' },
  { label: 'French (Canada)', value: 'fr-CA' },
  { label: 'German', value: 'de-DE' },
  { label: 'Italian', value: 'it-IT' },
  { label: 'Portuguese (Brazil)', value: 'pt-BR' },
  { label: 'Japanese', value: 'ja-JP' },
  { label: 'Korean', value: 'ko-KR' },
  { label: 'Chinese (Simplified)', value: 'zh-CN' },
  { label: 'Dutch', value: 'nl-NL' },
];

export const CHANNEL_OPTIONS = [
  { label: 'Voice', value: 'voice' },
  { label: 'Chat', value: 'chat' },
];