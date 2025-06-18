export interface PromptData {
  name: string;
  languages: {
    [language: string]: {
      voice: string;
      chat?: string;
    };
  };
}

export interface FlowConfigDetailProps {
  flowConfigId?: string;
  onClose: () => void;
  onSave: () => void;
}

export type PreviewData = Record<string, string>;