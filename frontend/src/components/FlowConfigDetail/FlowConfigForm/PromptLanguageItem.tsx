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
import { VOICES_BY_LANGUAGE } from '../shared/constants';
import { getDefaultVoice } from '../shared/utils';

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
}

export function PromptLanguageItem({
  promptName,
  language,
  content,
  selectedVoices,
  onUpdatePrompt,
  onVoiceChange,
}: PromptLanguageItemProps) {
  const getSelectedVoice = (language: string): string => {
    return selectedVoices[language] || getDefaultVoice(language);
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
          />
        </FormField>
        <FormField label="Chat Content (Optional)" stretch>
          <Textarea
            value={content.chat || ''}
            onChange={({ detail }) => {
              onUpdatePrompt(promptName, language, { chat: detail.value });
            }}
            rows={2}
          />
        </FormField>
        <ColumnLayout columns={2}>
          <FormField label="Preview Voice">
            <Select
              selectedOption={{
                label:
                  VOICES_BY_LANGUAGE[language]?.find(
                    (v) => v.value === getSelectedVoice(language)
                  )?.label || 'Joanna (Female)',
                value: getSelectedVoice(language),
              }}
              onChange={({ detail }) => {
                if (detail.selectedOption?.value) {
                  onVoiceChange(language, detail.selectedOption.value);
                }
              }}
              options={
                VOICES_BY_LANGUAGE[language] || [
                  { label: 'Joanna (Female)', value: 'Joanna' },
                ]
              }
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
