import {
  Container,
  Header,
  SpaceBetween,
  FormField,
  Textarea,
  ColumnLayout,
  Select,
  Box,
} from '@cloudscape-design/components';
import { PreviewButton } from '../../PreviewButton';
import { useContext } from 'react';
import SettingsContext from '../../../contexts/SettingsContext';

interface PromptLanguageItemProps {
  promptName: string;
  language: string;
  content: {
    voice: string;
    chat?: string;
  };
  selectedVoices: Record<string, string>;
  onUpdatePrompt: (
    promptName: string,
    language: string,
    updates: { voice?: string; chat?: string }
  ) => void;
  onVoiceChange: (language: string, voiceId: string) => void;
  isReadOnly?: boolean;
}

export function PromptLanguageItem({
  promptName,
  language,
  content,
  selectedVoices,
  onUpdatePrompt,
  onVoiceChange,
  isReadOnly = false,
}: PromptLanguageItemProps) {
  const locales = useContext(SettingsContext)?.locales || [];

  const voiceOptions = (code: string) => {
    const localeSettings = locales.find((l) => l.code === code);
    return (localeSettings ? localeSettings.voices : []).map((voice) => ({
      label: voice,
      value: voice,
    }));
  };

  const getSelectedVoice = (language: string): string => {
    return selectedVoices[language] || '';
  };

  return (
    <Container key={language} header={<Header variant="h3">{language}</Header>}>
      <SpaceBetween direction="vertical" size="s">
        <FormField label="Voice Content" stretch>
          <Textarea
            value={content.voice}
            onChange={({ detail }) => {
              onUpdatePrompt(promptName, language, { voice: detail.value });
            }}
            rows={3}
            readOnly={isReadOnly}
          />
        </FormField>
        <FormField label="Chat Content (Optional)" stretch>
          <Textarea
            value={content.chat || ''}
            onChange={({ detail }) => {
              onUpdatePrompt(promptName, language, { chat: detail.value });
            }}
            rows={2}
            readOnly={isReadOnly}
          />
        </FormField>
        <ColumnLayout columns={2}>
          <FormField label="Preview Voice">
            <Select
              selectedOption={{
                label: getSelectedVoice(language),
                value: getSelectedVoice(language),
              }}
              onChange={({ detail }) => {
                if (detail.selectedOption?.value) {
                  onVoiceChange(language, detail.selectedOption.value);
                }
              }}
              options={voiceOptions(language)}
              placeholder="Select voice"
            />
          </FormField>
          <Box padding={{ top: 'l' }}>
            <PreviewButton
              text={content.voice}
              languageCode={language}
              voiceId={getSelectedVoice(language)}
            />
          </Box>
        </ColumnLayout>
      </SpaceBetween>
    </Container>
  );
}
