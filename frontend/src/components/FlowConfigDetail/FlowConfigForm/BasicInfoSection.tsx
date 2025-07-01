import {
  Container,
  Header,
  SpaceBetween,
  FormField,
  Input,
  ColumnLayout,
} from '@cloudscape-design/components';
import { FlowConfig } from '../../../shared';

interface BasicInfoSectionProps {
  flowConfig: FlowConfig;
  isEditing: boolean;
  onUpdate: (updates: Partial<FlowConfig>) => void;
  readOnly?: boolean;
}

export function BasicInfoSection({
  flowConfig,
  isEditing,
  onUpdate,
  readOnly = false,
}: BasicInfoSectionProps) {
  return (
    <Container header={<Header variant="h2">Basic Information</Header>}>
      <SpaceBetween direction="vertical" size="m">
        <ColumnLayout columns={2}>
          <FormField
            label="ID"
            description="Unique identifier for this flow configuration"
            errorText={!flowConfig.id ? 'ID is required' : ''}
          >
            <Input
              value={flowConfig.id}
              onChange={({ detail }) => onUpdate({ id: detail.value })}
              placeholder="e.g., customer-service-queue"
              disabled={isEditing}
            />
          </FormField>

          <FormField
            label="Description"
            description="Human-readable description"
            errorText={!flowConfig.description ? 'Description is required' : ''}
          >
            <Input
              value={flowConfig.description}
              onChange={({ detail }) => onUpdate({ description: detail.value })}
              placeholder="e.g., Main customer service configuration"
              readOnly={readOnly}
            />
          </FormField>
        </ColumnLayout>
      </SpaceBetween>
    </Container>
  );
}
