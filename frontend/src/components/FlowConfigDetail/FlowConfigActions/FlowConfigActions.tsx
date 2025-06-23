import { Box, SpaceBetween, Button } from '@cloudscape-design/components';

interface FlowConfigActionsProps {
  isEditing: boolean;
  saving: boolean;
  previewLoading: boolean;
  flowConfigId?: string;
  canPreview: boolean;
  canSave?: boolean;
  onClose: () => void;
  onSave: () => void;
  onPreview: () => void;
}

export function FlowConfigActions({
  isEditing,
  saving,
  previewLoading,
  canPreview,
  canSave = true,
  onClose,
  onSave,
  onPreview,
}: FlowConfigActionsProps) {
  return (
    <Box float="right">
      <SpaceBetween direction="horizontal" size="xs">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          iconName="external"
          loading={previewLoading}
          onClick={onPreview}
          disabled={!canPreview}
        >
          Preview
        </Button>
        {canSave && (
          <Button variant="primary" loading={saving} onClick={onSave}>
            {isEditing ? 'Save Changes' : 'Create'}
          </Button>
        )}
      </SpaceBetween>
    </Box>
  );
}
