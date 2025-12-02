import { useState } from 'react';
import {
  Modal,
  Box,
  SpaceBetween,
  Button,
  FormField,
  Textarea,
  Alert,
} from '@cloudscape-design/components';

interface SelectOptionsModalProps {
  visible: boolean;
  variableName: string;
  currentOptions: string[];
  onDismiss: () => void;
  onSave: (options: string[]) => void;
}

export function SelectOptionsModal({
  visible,
  variableName,
  currentOptions,
  onDismiss,
  onSave,
}: SelectOptionsModalProps) {
  const [optionsText, setOptionsText] = useState(currentOptions.join('\n'));
  const [error, setError] = useState('');

  const handleSave = () => {
    const options = optionsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (options.length === 0) {
      setError('At least one option is required');
      return;
    }

    // Remove duplicates
    const uniqueOptions = [...new Set(options)];

    // Clear error on successful validation
    setError('');

    onSave(uniqueOptions);
  };

  const handleDismiss = () => {
    setOptionsText(currentOptions.join('\n'));
    setError('');
    onDismiss();
  };

  return (
    <Modal
      onDismiss={handleDismiss}
      visible={visible}
      header={`Options for ${variableName}`}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={handleDismiss}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween direction="vertical" size="m">
        {error && <Alert type="error">{error}</Alert>}
        <FormField
          label="Options"
          description="Enter one option per line. These are the values a non-admin user can select."
        >
          <Textarea
            value={optionsText}
            onChange={({ detail }) => {
              setOptionsText(detail.value);
              // Clear error when user starts typing
              if (error) setError('');
            }}
            placeholder="yes&#10;no&#10;maybe"
            rows={6}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}