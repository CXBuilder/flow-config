import {
  Container,
  ExpandableSection,
  Button,
  Table,
  Box,
  Input,
} from '@cloudscape-design/components';
import { FlowConfig } from '../../../shared';

interface VariablesSectionProps {
  flowConfig: FlowConfig;
  onUpdate: (updates: Partial<FlowConfig>) => void;
  onAddVariable: () => void;
  canAddVariables?: boolean;
}

export function VariablesSection({
  flowConfig,
  onUpdate,
  onAddVariable,
  canAddVariables = true,
}: VariablesSectionProps) {
  const variableItems = Object.entries(flowConfig.variables).map(
    ([key, value]) => ({
      key,
      value,
    })
  );

  const handleUpdateVariableValue = (key: string, newValue: string) => {
    onUpdate({
      variables: {
        ...flowConfig.variables,
        [key]: newValue,
      },
    });
  };

  const handleRemoveVariable = (key: string) => {
    const newVariables = { ...flowConfig.variables };
    delete newVariables[key];
    onUpdate({ variables: newVariables });
  };

  const variableColumnDefinitions = [
    {
      id: 'key',
      header: 'Variable Name',
      cell: (item: { key: string; value: string }) => item.key,
    },
    {
      id: 'value',
      header: 'Value',
      cell: (item: { key: string; value: string }) => (
        <Input
          value={item.value}
          onChange={({ detail }) =>
            handleUpdateVariableValue(item.key, detail.value)
          }
          placeholder="Variable value"
        />
      ),
    },
    ...(canAddVariables ? [{
      id: 'actions',
      header: 'Actions',
      cell: (item: { key: string; value: string }) => (
        <Button
          variant="icon"
          iconName="remove"
          onClick={() => handleRemoveVariable(item.key)}
          ariaLabel={`Remove variable ${item.key}`}
        />
      ),
    }] : []),
  ];

  return (
    <ExpandableSection
      headerText="Variables"
      headerCounter={`(${variableItems.length})`}
      headerActions={
        canAddVariables && (
          <Button onClick={onAddVariable} iconName="add-plus">
            Add Variable
          </Button>
        )
      }
      defaultExpanded={variableItems.length > 0}
    >
      <Container>
        <Table
          columnDefinitions={variableColumnDefinitions}
          items={variableItems}
          empty={
            <Box textAlign="center" color="inherit">
              <b>No variables</b>
              <Box variant="p" color="inherit">
                Click "Add Variable" to add configurable variables.
              </Box>
            </Box>
          }
        />
      </Container>
    </ExpandableSection>
  );
}
