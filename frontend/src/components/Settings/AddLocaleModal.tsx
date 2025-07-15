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

interface AddLocaleModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (locale: { code: string; name: string }) => void;
  existingLocales: string[];
}

export default function AddLocaleModal({
  visible,
  onDismiss,
  onSubmit,
  existingLocales,
}: AddLocaleModalProps) {
  const [localeCode, setLocaleCode] = useState('');
  const [localeName, setLocaleName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);

    // Validation
    if (!localeCode.trim()) {
      setError('Locale code is required');
      return;
    }

    if (!localeName.trim()) {
      setError('Display name is required');
      return;
    }

    // Check for valid Amazon Polly language code format
    // Supports: 2-letter (da), 3-letter (arb), 2-letter + region (en-US), 3-letter + region (cmn-CN),
    // and special cases like en-GB-WLS
    const localePattern = /^([a-z]{2,3}(-[A-Z]{2})?(-[A-Z]{3})?|arb)$/;
    if (!localePattern.test(localeCode)) {
      setError(
        'Invalid language code format. Must be a valid Amazon Polly language code (e.g., "en-US", "arb", "cmn-CN")'
      );
      return;
    }

    // Check for duplicates
    if (existingLocales.includes(localeCode)) {
      setError('This locale code already exists');
      return;
    }

    onSubmit({ code: localeCode, name: localeName });
    handleClose();
  };

  const handleClose = () => {
    setLocaleCode('');
    setLocaleName('');
    setError(null);
    onDismiss();
  };

  return (
    <Modal
      onDismiss={handleClose}
      visible={visible}
      header="Add New Locale"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              Add Locale
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween direction="vertical" size="m">
        {error && <Alert type="error">{error}</Alert>}

        <FormField
          label="Language Code"
          description={
            <Box>
              Amazon Polly language code (e.g., en-US, arb, cmn-CN).
              <Link
                external
                href="https://docs.aws.amazon.com/polly/latest/dg/available-voices.html"
              >
                View all supported language codes
              </Link>
            </Box>
          }
        >
          <Input
            value={localeCode}
            onChange={({ detail }) => setLocaleCode(detail.value)}
            placeholder="en-US"
          />
        </FormField>

        <FormField
          label="Display Name"
          description="Human-readable name for this locale"
        >
          <Input
            value={localeName}
            onChange={({ detail }) => setLocaleName(detail.value)}
            placeholder="English (United States)"
          />
        </FormField>

        <Alert type="info">
          <Box variant="small">
            <strong>Common Amazon Polly language codes:</strong>
            <ul>
              <li>en-US - English (United States)</li>
              <li>en-GB - English (United Kingdom)</li>
              <li>es-US - Spanish (United States)</li>
              <li>es-ES - Spanish (Spain)</li>
              <li>fr-FR - French (France)</li>
              <li>de-DE - German (Germany)</li>
              <li>arb - Arabic</li>
              <li>cmn-CN - Chinese Mandarin</li>
              <li>da-DK - Danish</li>
              <li>pt-BR - Portuguese (Brazil)</li>
            </ul>
            <Link
              external
              href="https://docs.aws.amazon.com/polly/latest/dg/available-voices.html"
            >
              See complete list of supported language codes
            </Link>
          </Box>
        </Alert>
      </SpaceBetween>
    </Modal>
  );
}
