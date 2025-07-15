import { components } from './schema';

// Export types to make it easier to consume
export type InitResponse = components['schemas']['InitResponse'];
export type User = components['schemas']['User'];
export type FlowConfig = components['schemas']['FlowConfig'];
export type FlowConfigList = components['schemas']['FlowConfigList'];
export type FlowConfigSummary = components['schemas']['FlowConfigSummary'];
export type SpeechPreviewRequest =
  components['schemas']['SpeechPreviewRequest'];
export type Locale = components['schemas']['Locale'];
export type Settings = components['schemas']['Settings'];
export type IError = components['schemas']['Error'];
