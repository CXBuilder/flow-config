import {
  Container,
  ExpandableSection,
  Button,
  Box,
  SpaceBetween,
} from '@cloudscape-design/components';
import { PromptLanguageItem } from './PromptLanguageItem';
import { FlowConfig } from '../../../shared';

interface PromptsSectionProps {
  flowConfig: FlowConfig;
  selectedVoices: Record<string, string>;
  onUpdate: (updates: Partial<FlowConfig>) => void;
  onAddPrompt: () => void;
  onAddLanguage: (promptName: string) => void;
  onRemovePrompt: (promptName: string) => void;
  onVoiceChange: (language: string, voiceId: string) => void;
}

export function PromptsSection({
  flowConfig,
  selectedVoices,
  onUpdate,
  onAddPrompt,
  onAddLanguage,
  onRemovePrompt,
  onVoiceChange,
}: PromptsSectionProps) {
  const handleUpdatePrompt = (
    promptName: string,
    language: string,
    updates: { voice?: string; chat?: string }
  ) => {
    const currentPrompt = flowConfig.prompts[promptName][language];
    onUpdate({
      prompts: {
        ...flowConfig.prompts,
        [promptName]: {
          ...flowConfig.prompts[promptName],
          [language]: {
            ...currentPrompt,
            ...updates,
          },
        },
      },
    });
  };

  return (
    <ExpandableSection
      headerText="Prompts"
      headerCounter={`(${Object.keys(flowConfig.prompts).length})`}
      headerActions={
        <Button onClick={onAddPrompt} iconName="add-plus">
          Add Prompt
        </Button>
      }
      defaultExpanded={true}
    >
      <Container>
        <SpaceBetween direction="vertical" size="s">
          {Object.entries(flowConfig.prompts).length === 0 ? (
            <Box textAlign="center" color="inherit">
              <b>No prompts</b>
              <Box variant="p" color="inherit">
                Click "Add Prompt" to add voice and chat content.
              </Box>
            </Box>
          ) : (
            Object.entries(flowConfig.prompts).map(
              ([promptName, promptData]) => (
                <ExpandableSection
                  key={promptName}
                  headerText={promptName}
                  headerCounter={`(${
                    Object.keys(promptData).length
                  } languages)`}
                  headerActions={
                    <SpaceBetween direction="horizontal" size="xs">
                      <Button
                        onClick={() => onAddLanguage(promptName)}
                        iconName="add-plus"
                        variant="icon"
                        ariaLabel={`Add language to ${promptName}`}
                      />
                      <Button
                        variant="icon"
                        iconName="remove"
                        onClick={() => onRemovePrompt(promptName)}
                        ariaLabel={`Remove prompt ${promptName}`}
                      />
                    </SpaceBetween>
                  }
                  defaultExpanded={false}
                >
                  <SpaceBetween direction="vertical" size="s">
                    {Object.entries(promptData).map(([language, content]) => (
                      <PromptLanguageItem
                        key={language}
                        promptName={promptName}
                        language={language}
                        content={content}
                        selectedVoices={selectedVoices}
                        onUpdatePrompt={handleUpdatePrompt}
                        onVoiceChange={onVoiceChange}
                      />
                    ))}
                  </SpaceBetween>
                </ExpandableSection>
              )
            )
          )}
        </SpaceBetween>
      </Container>
    </ExpandableSection>
  );
}
