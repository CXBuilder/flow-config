import { useState } from 'react';
import {
  Modal,
  Box,
  SpaceBetween,
  Button,
  FormField,
  Input,
  Textarea,
  Select,
  Alert,
} from '@cloudscape-design/components';
import { LANGUAGE_OPTIONS } from '../shared/constants';
import { PromptData } from '../shared/types';

interface AddPromptModalProps {
  visible: boolean;
  onDismiss: () => void;
  onAdd: (promptData: PromptData) => void;
  existingPrompts: string[];
}

export function AddPromptModal({ visible, onDismiss, onAdd, existingPrompts }: AddPromptModalProps) {
  const [name, setName] = useState('');
  const [language, setLanguage] = useState({ label: 'English (US)', value: 'en-US' });
  const [voiceContent, setVoiceContent] = useState('');
  const [chatContent, setChatContent] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    if (!name || !voiceContent) {
      setError('Prompt name and voice content are required');
      return;
    }
    if (existingPrompts.includes(name)) {
      setError('This prompt name already exists');
      return;
    }
    
    const promptData: PromptData = {
      name,
      languages: {
        [language.value]: {
          voice: voiceContent,
          chat: chatContent || undefined,
        },
      },
    };
    
    onAdd(promptData);
    setName('');
    setLanguage({ label: 'English (US)', value: 'en-US' });
    setVoiceContent('');
    setChatContent('');
    setError('');
    onDismiss();
  };

  const handleDismiss = () => {
    setName('');
    setLanguage({ label: 'English (US)', value: 'en-US' });
    setVoiceContent('');
    setChatContent('');
    setError('');
    onDismiss();
  };

  return (
    <Modal
      onDismiss={handleDismiss}
      visible={visible}
      header="Add Prompt"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={handleDismiss}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdd}>
              Add Prompt
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween direction="vertical" size="m">
        {error && <Alert type="error">{error}</Alert>}
        <FormField label="Prompt Name">
          <Input
            value={name}
            onChange={({ detail }) => setName(detail.value)}
            placeholder="e.g., welcome"
          />
        </FormField>
        <FormField label="Language">
          <Select
            selectedOption={language}
            onChange={({ detail }) => {
              if (detail.selectedOption && detail.selectedOption.label && detail.selectedOption.value) {
                setLanguage(detail.selectedOption as { label: string; value: string });
              }
            }}
            options={LANGUAGE_OPTIONS}
          />
        </FormField>
        <FormField label="Voice Content" stretch>
          <Textarea
            value={voiceContent}
            onChange={({ detail }) => setVoiceContent(detail.value)}
            placeholder="Voice content (may include SSML tags)"
            rows={3}
          />
        </FormField>
        <FormField label="Chat Content (Optional)" stretch>
          <Textarea
            value={chatContent}
            onChange={({ detail }) => setChatContent(detail.value)}
            placeholder="Chat content (plain text)"
            rows={2}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}