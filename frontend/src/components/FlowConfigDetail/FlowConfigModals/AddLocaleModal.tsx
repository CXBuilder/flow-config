import { useContext, useState } from 'react';
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
import SettingsContext from '../../../contexts/SettingsContext';

interface AddLocaleModalProps {
  visible: boolean;
  promptName: string;
  onDismiss: () => void;
  onAdd: (
    promptName: string,
    locale: string,
    voiceContent: string,
    chatContent?: string
  ) => void;
  existingLocales: string[];
}

export function AddLocaleModal({
  visible,
  promptName,
  onDismiss,
  onAdd,
  existingLocales,
}: AddLocaleModalProps) {
  const [voiceContent, setVoiceContent] = useState('');
  const [chatContent, setChatContent] = useState('');
  const [error, setError] = useState('');

  const locales = useContext(SettingsContext)?.locales || [];
  const localeOptions = locales.map((locale) => ({
    label: locale.name,
    value: locale.code,
  }));

  // Filter out locales that are already used for this prompt
  const availableLocaleOptions = localeOptions.filter(
    (option) => !existingLocales.includes(option.value)
  );

  // Set default to first available locale
  const [locale, setLocale] = useState(
    availableLocaleOptions.length > 0
      ? availableLocaleOptions[0]
      : { label: '', value: '' }
  );

  const handleAdd = () => {
    if (!voiceContent) {
      setError('Voice content is required');
      return;
    }
    if (!locale.value) {
      setError('Please select a locale');
      return;
    }

    onAdd(promptName, locale.value, voiceContent, chatContent);
    setLocale(
      availableLocaleOptions.length > 0
        ? availableLocaleOptions[0]
        : { label: '', value: '' }
    );
    setVoiceContent('');
    setChatContent('');
    setError('');
    onDismiss();
  };

  const handleDismiss = () => {
    setLocale(
      availableLocaleOptions.length > 0
        ? availableLocaleOptions[0]
        : { label: '', value: '' }
    );
    setVoiceContent('');
    setChatContent('');
    setError('');
    onDismiss();
  };

  return (
    <Modal
      onDismiss={handleDismiss}
      visible={visible}
      header={`Add Locale to "${promptName}"`}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={handleDismiss}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAdd}
              disabled={availableLocaleOptions.length === 0}
            >
              Add Locale
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween direction="vertical" size="m">
        {error && <Alert type="error">{error}</Alert>}
        {availableLocaleOptions.length === 0 ? (
          <Alert type="warning">
            All available locales have already been added to this prompt.
          </Alert>
        ) : (
          <>
            <FormField label="Locale">
              <Select
                selectedOption={locale}
                onChange={({ detail }) => {
                  if (
                    detail.selectedOption &&
                    detail.selectedOption.label &&
                    detail.selectedOption.value
                  ) {
                    setLocale(
                      detail.selectedOption as { label: string; value: string }
                    );
                  }
                }}
                options={availableLocaleOptions}
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
