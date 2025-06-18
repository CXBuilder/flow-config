import { useState } from 'react';
import {
  Modal,
  Box,
  SpaceBetween,
  Button,
  FormField,
  Textarea,
  Select,
  Alert,
} from '@cloudscape-design/components';
import { LANGUAGE_OPTIONS } from '../shared/constants';

interface AddLanguageModalProps {
  visible: boolean;
  promptName: string;
  onDismiss: () => void;
  onAdd: (promptName: string, language: string, voiceContent: string, chatContent?: string) => void;
  existingLanguages: string[];
}

export function AddLanguageModal({ visible, promptName, onDismiss, onAdd, existingLanguages }: AddLanguageModalProps) {
  const [voiceContent, setVoiceContent] = useState('');
  const [chatContent, setChatContent] = useState('');
  const [error, setError] = useState('');

  // Filter out languages that are already used for this prompt
  const availableLanguageOptions = LANGUAGE_OPTIONS.filter(
    option => !existingLanguages.includes(option.value)
  );

  // Set default to first available language
  const [language, setLanguage] = useState(
    availableLanguageOptions.length > 0 
      ? availableLanguageOptions[0] 
      : { label: '', value: '' }
  );

  const handleAdd = () => {
    if (!voiceContent) {
      setError('Voice content is required');
      return;
    }
    if (!language.value) {
      setError('Please select a language');
      return;
    }
    
    onAdd(promptName, language.value, voiceContent, chatContent);
    setLanguage(availableLanguageOptions.length > 0 ? availableLanguageOptions[0] : { label: '', value: '' });
    setVoiceContent('');
    setChatContent('');
    setError('');
    onDismiss();
  };

  const handleDismiss = () => {
    setLanguage(availableLanguageOptions.length > 0 ? availableLanguageOptions[0] : { label: '', value: '' });
    setVoiceContent('');
    setChatContent('');
    setError('');
    onDismiss();
  };

  return (
    <Modal
      onDismiss={handleDismiss}
      visible={visible}
      header={`Add Language to "${promptName}"`}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={handleDismiss}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleAdd}
              disabled={availableLanguageOptions.length === 0}
            >
              Add Language
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween direction="vertical" size="m">
        {error && <Alert type="error">{error}</Alert>}
        {availableLanguageOptions.length === 0 ? (
          <Alert type="warning">
            All available languages have already been added to this prompt.
          </Alert>
        ) : (
          <>
            <FormField label="Language">
              <Select
                selectedOption={language}
                onChange={({ detail }) => {
                  if (detail.selectedOption && detail.selectedOption.label && detail.selectedOption.value) {
                    setLanguage(detail.selectedOption as { label: string; value: string });
                  }
                }}
                options={availableLanguageOptions}
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
          </>
        )}
      </SpaceBetween>
    </Modal>
  );
}