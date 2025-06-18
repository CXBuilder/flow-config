import { useState } from 'react';
import {
  Modal,
  Box,
  SpaceBetween,
  Button,
  FormField,
  Input,
  Alert,
} from '@cloudscape-design/components';

interface AddVariableModalProps {
  visible: boolean;
  onDismiss: () => void;
  onAdd: (key: string, value: string) => void;
  existingKeys: string[];
}

export function AddVariableModal({ visible, onDismiss, onAdd, existingKeys }: AddVariableModalProps) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    if (!key || !value) {
      setError('Both key and value are required');
      return;
    }
    if (existingKeys.includes(key)) {
      setError('This variable key already exists');
      return;
    }
    
    onAdd(key, value);
    setKey('');
    setValue('');
    setError('');
    onDismiss();
  };

  const handleDismiss = () => {
    setKey('');
    setValue('');
    setError('');
    onDismiss();
  };

  return (
    <Modal
      onDismiss={handleDismiss}
      visible={visible}
      header="Add Variable"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={handleDismiss}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdd}>
              Add Variable
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween direction="vertical" size="m">
        {error && <Alert type="error">{error}</Alert>}
        <FormField label="Variable Name">
          <Input
            value={key}
            onChange={({ detail }) => setKey(detail.value)}
            placeholder="e.g., priority"
          />
        </FormField>
        <FormField label="Value">
          <Input
            value={value}
            onChange={({ detail }) => setValue(detail.value)}
            placeholder="e.g., high"
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}