import { useState, useEffect } from 'react';
import { SpaceBetween, Alert } from '@cloudscape-design/components';
import { useApi } from '../../hooks/useApi';
import { usePermissions } from '../../hooks/usePermissions';
import { FlowConfigDetailProps, PromptData, PreviewData } from './shared/types';
import { FlowConfigActions } from './FlowConfigActions/FlowConfigActions';
import { FlowConfigPreview } from './FlowConfigActions/FlowConfigPreview';
import { FlowConfigForm } from './FlowConfigForm/FlowConfigForm';
import {
  AddVariableModal,
  AddPromptModal,
  AddLocaleModal,
} from './FlowConfigModals';
import { FlowConfig } from '../../shared';

export default function FlowConfigDetail({
  flowConfigId,
  onClose,
  onSave,
}: FlowConfigDetailProps) {
  const [flowConfig, setFlowConfig] = useState<FlowConfig>({
    id: '',
    description: '',
    variables: {},
    prompts: {},
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedVoices, setSelectedVoices] = useState<Record<string, string>>(
    {}
  );
  const [showAddPromptModal, setShowAddPromptModal] = useState(false);
  const [showAddVariableModal, setShowAddVariableModal] = useState(false);
  const [showAddLanguageModal, setShowAddLanguageModal] = useState<
    string | null
  >(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLang, setPreviewLang] = useState('en-US');
  const [previewChannel, setPreviewChannel] = useState('voice');

  const { apiFetch } = useApi();
  const { canEdit, canMakeStructuralChanges } = usePermissions();

  const isEditing = !!flowConfigId;
  const isReadOnly = !canEdit();
  const canSave = canEdit();

  // Load existing flow config if editing
  useEffect(() => {
    if (flowConfigId) {
      loadFlowConfig();
    }
  }, [flowConfigId]);

  const loadFlowConfig = async () => {
    try {
      const result = await apiFetch<FlowConfig>(
        'GET',
        `/api/flow-config/${flowConfigId}`
      );
      if (result) {
        setFlowConfig(result);
      }
    } catch (err) {
      setError('Failed to load flow configuration');
    }
  };

  const handleSave = async () => {
    if (!flowConfig.id || !flowConfig.description) {
      setError('ID and description are required');
      return;
    }

    setSaving(true);
    try {
      await apiFetch('POST', `/api/flow-config/${flowConfig.id}`, flowConfig);
      onSave();
    } catch (err) {
      setError('Failed to save flow configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariable = (key: string, value: string) => {
    setFlowConfig((prev) => ({
      ...prev,
      variables: {
        ...prev.variables,
        [key]: value,
      },
    }));
  };

  const handleAddPrompt = (promptData: PromptData) => {
    setFlowConfig((prev) => ({
      ...prev,
      prompts: {
        ...prev.prompts,
        [promptData.name]: promptData.languages,
      },
    }));
  };

  const handleAddLanguageToPrompt = (
    promptName: string,
    language: string,
    voiceContent: string,
    chatContent?: string
  ) => {
    setFlowConfig((prev) => ({
      ...prev,
      prompts: {
        ...prev.prompts,
        [promptName]: {
          ...prev.prompts[promptName],
          [language]: {
            voice: voiceContent,
            chat: chatContent || undefined,
          },
        },
      },
    }));
  };

  const handleVoiceChange = (language: string, voiceId: string) => {
    setSelectedVoices((prev) => ({
      ...prev,
      [language]: voiceId,
    }));
  };

  const handlePreview = async () => {
    // Validate required fields for preview
    if (!flowConfig.id || !flowConfig.description) {
      setError('ID and description are required for preview');
      return;
    }

    setPreviewLoading(true);
    setError('');

    try {
      const result = await apiFetch<PreviewData>(
        'POST',
        '/api/flow-config/preview',
        {
          flowConfig: flowConfig,
          lang: previewLang,
          channel: previewChannel,
        }
      );

      setPreviewData(result || null);
      setShowPreviewModal(true);
    } catch (err) {
      setError('Failed to generate preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUpdate = (updates: Partial<FlowConfig>) => {
    setFlowConfig((prev) => ({ ...prev, ...updates }));
  };

  // Can preview if we have minimum required fields
  const canPreview = !!(flowConfig.id && flowConfig.description);

  return (
    <SpaceBetween direction="vertical" size="l">
      <FlowConfigActions
        isEditing={isEditing}
        saving={saving}
        previewLoading={previewLoading}
        flowConfigId={flowConfig.id}
        canPreview={canPreview}
        canSave={canSave}
        onClose={onClose}
        onSave={handleSave}
        onPreview={handlePreview}
      />

      {error && (
        <Alert type="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      <FlowConfigForm
        flowConfig={flowConfig}
        isEditing={isEditing}
        selectedVoices={selectedVoices}
        onUpdate={isReadOnly ? () => {} : handleUpdate}
        onAddVariable={
          isReadOnly ? () => {} : () => setShowAddVariableModal(true)
        }
        onAddPrompt={isReadOnly ? () => {} : () => setShowAddPromptModal(true)}
        onAddLanguage={
          isReadOnly
            ? () => {}
            : (promptName) => setShowAddLanguageModal(promptName)
        }
        onVoiceChange={handleVoiceChange}
        canMakeStructuralChanges={canMakeStructuralChanges()}
        isReadOnly={isReadOnly}
      />

      {/* Modals - Only show for users with edit permissions */}
      {!isReadOnly && (
        <>
          <AddVariableModal
            visible={showAddVariableModal}
            onDismiss={() => setShowAddVariableModal(false)}
            onAdd={handleAddVariable}
            existingKeys={Object.keys(flowConfig.variables)}
          />

          <AddPromptModal
            visible={showAddPromptModal}
            onDismiss={() => setShowAddPromptModal(false)}
            onAdd={handleAddPrompt}
            existingPrompts={Object.keys(flowConfig.prompts)}
          />

          {showAddLanguageModal && (
            <AddLocaleModal
              visible={!!showAddLanguageModal}
              promptName={showAddLanguageModal}
              onDismiss={() => setShowAddLanguageModal(null)}
              onAdd={handleAddLanguageToPrompt}
              existingLocales={Object.keys(
                flowConfig.prompts[showAddLanguageModal] || {}
              )}
            />
          )}
        </>
      )}

      <FlowConfigPreview
        visible={showPreviewModal}
        onDismiss={() => setShowPreviewModal(false)}
        previewData={previewData}
        lang={previewLang}
        channel={previewChannel}
        onLangChange={setPreviewLang}
        onChannelChange={setPreviewChannel}
        onRefresh={handlePreview}
        refreshLoading={previewLoading}
      />
    </SpaceBetween>
  );
}
