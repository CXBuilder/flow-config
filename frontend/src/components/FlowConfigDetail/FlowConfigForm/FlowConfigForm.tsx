import { Form, SpaceBetween } from '@cloudscape-design/components';
import { BasicInfoSection } from './BasicInfoSection';
import { VariablesSection } from './VariablesSection';
import { PromptsSection } from './PromptsSection';
import { FlowConfig } from '../../../shared';

interface FlowConfigFormProps {
  flowConfig: FlowConfig;
  isEditing: boolean;
  selectedVoices: Record<string, string>;
  onUpdate: (updates: Partial<FlowConfig>) => void;
  onAddVariable: () => void;
  onAddPrompt: () => void;
  onAddLanguage: (promptName: string) => void;
  onVoiceChange: (language: string, voiceId: string) => void;
  canMakeStructuralChanges?: boolean;
}

export function FlowConfigForm({
  flowConfig,
  isEditing,
  selectedVoices,
  onUpdate,
  onAddVariable,
  onAddPrompt,
  onAddLanguage,
  onVoiceChange,
  canMakeStructuralChanges = true,
}: FlowConfigFormProps) {
  const handleRemovePrompt = (promptName: string) => {
    const newPrompts = { ...flowConfig.prompts };
    delete newPrompts[promptName];
    onUpdate({ prompts: newPrompts });
  };

  return (
    <Form>
      <SpaceBetween direction="vertical" size="l">
        <BasicInfoSection
          flowConfig={flowConfig}
          isEditing={isEditing}
          onUpdate={onUpdate}
          readOnly={!canMakeStructuralChanges}
        />

        <VariablesSection
          flowConfig={flowConfig}
          onUpdate={onUpdate}
          onAddVariable={onAddVariable}
          canAddVariables={canMakeStructuralChanges}
        />

        <PromptsSection
          flowConfig={flowConfig}
          selectedVoices={selectedVoices}
          onUpdate={onUpdate}
          onAddPrompt={onAddPrompt}
          onAddLanguage={onAddLanguage}
          onRemovePrompt={handleRemovePrompt}
          onVoiceChange={onVoiceChange}
        />
      </SpaceBetween>
    </Form>
  );
}
