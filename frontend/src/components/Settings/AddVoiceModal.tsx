import { useState } from 'react';
import {
  Modal,
  Box,
  SpaceBetween,
  Button,
  FormField,
  Input,
  Alert,
  Link,
} from '@cloudscape-design/components';

interface AddVoiceModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (voiceId: string) => void;
  localeName: string;
  existingVoices: string[];
}

export default function AddVoiceModal({
  visible,
  onDismiss,
  onSubmit,
  localeName,
  existingVoices,
}: AddVoiceModalProps) {
  const [voiceId, setVoiceId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);

    // Validation
    if (!voiceId.trim()) {
      setError('Voice ID is required');
      return;
    }

    // Check for duplicates
    if (existingVoices.includes(voiceId)) {
      setError('This voice ID already exists for this locale');
      return;
    }

    onSubmit(voiceId);
    handleClose();
  };

  const handleClose = () => {
    setVoiceId('');
    setError(null);
    onDismiss();
  };

  return (
    <Modal
      onDismiss={handleClose}
      visible={visible}
      header={`Add Voice to ${localeName}`}
      size="large"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              Add Voice
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween direction="vertical" size="l">
        {error && <Alert type="error">{error}</Alert>}

        <FormField
          label="Voice ID"
          description={
            <Box>
              Enter an Amazon Polly voice ID.
              <Link
                external
                href="https://docs.aws.amazon.com/polly/latest/dg/available-voices.html"
              >
                View all available voices
              </Link>
            </Box>
          }
        >
          <Input
            value={voiceId}
            onChange={({ detail }) => setVoiceId(detail.value)}
            placeholder="Joanna"
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}
