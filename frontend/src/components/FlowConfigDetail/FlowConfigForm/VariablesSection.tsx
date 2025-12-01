import { useState } from 'react';
import {
  Container,
  ExpandableSection,
  Button,
  Table,
  Box,
  Input,
  Select,
  Checkbox,
  SpaceBetween,
} from '@cloudscape-design/components';
import { FlowConfig } from '../../../shared';
import { usePermissions } from '../../../hooks/usePermissions';
import { SelectOptionsModal } from '../FlowConfigModals/SelectOptionsModal';

type SchemaType = 'text' | 'number' | 'boolean' | 'select';

interface VariablesSectionProps {
  flowConfig: FlowConfig;
  onUpdate: (updates: Partial<FlowConfig>) => void;
  onAddVariable: () => void;
  canAddVariables?: boolean;
  isReadOnly?: boolean;
}

export function VariablesSection({
  flowConfig,
  onUpdate,
  onAddVariable,
  canAddVariables = true,
  isReadOnly = false,
}: VariablesSectionProps) {
  const { isAdmin } = usePermissions();
  const [optionsModalKey, setOptionsModalKey] = useState<string | null>(null);

  const variableItems = Object.entries(flowConfig.variables)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      key,
      value,
      schema: flowConfig.schema?.[key] || { type: 'text' as SchemaType },
    }));

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

    const newSchema = { ...flowConfig.schema };
    delete newSchema[key];

    onUpdate({ variables: newVariables, schema: newSchema });
  };

  const handleSchemaTypeChange = (key: string, newType: SchemaType) => {
    const currentSchema = flowConfig.schema || {};
    const newSchema = {
      ...currentSchema,
      [key]: {
        ...currentSchema[key],
        type: newType,
        // Clear options if not select type
        options: newType === 'select' ? (currentSchema[key]?.options || []) : undefined,
      },
    };

    // Reset value based on new type
    let newValue = flowConfig.variables[key];
    if (newType === 'boolean') {
      newValue = 'false';
    } else if (newType === 'number') {
      newValue = '0';
    } else if (newType === 'select') {
      newValue = '';  // Clear value for select - user must choose from options
    }

    onUpdate({
      schema: newSchema,
      variables: {
        ...flowConfig.variables,
        [key]: newValue,
      },
    });
  };

  const handleOptionsChange = (key: string, options: string[]) => {
    const currentSchema = flowConfig.schema || {};
    onUpdate({
      schema: {
        ...currentSchema,
        [key]: {
          ...currentSchema[key],
          type: 'select',
          options,
        },
      },
    });
    setOptionsModalKey(null);
  };

  const renderValueControl = (item: { key: string; value: string; schema: { type: SchemaType; options?: string[] } }) => {
    const { key, value, schema } = item;

    switch (schema.type) {
      case 'boolean':
        return (
          <Checkbox
            checked={value === 'true'}
            onChange={({ detail }) =>
              handleUpdateVariableValue(key, detail.checked ? 'true' : 'false')
            }
            disabled={isReadOnly}
          >
            <span style={{ color: value === 'true' ? '#0972d3' : '#d91515' }}>
              {value === 'true' ? 'true' : 'false'}
            </span>
          </Checkbox>
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={({ detail }) => handleUpdateVariableValue(key, detail.value)}
            placeholder="0"
            readOnly={isReadOnly}
          />
        );

        case 'select':
          const options = schema.options || [];
          if (options.length === 0) {
            return (
              <span style={{ color: '#d91515', fontStyle: 'italic' }}>
                Add options →
              </span>
            );
          }
          return (
            <div style={{ position: 'relative', zIndex: 1000 }}>
              <Select
                selectedOption={value ? { label: value, value } : null}
                onChange={({ detail }) =>
                  handleUpdateVariableValue(key, detail.selectedOption?.value || '')
                }
                options={options.map((opt) => ({ label: opt, value: opt }))}
                placeholder="Select a value"
                disabled={isReadOnly}
                expandToViewport={true}
              />
            </div>
          );

      case 'text':
      default:
        return (
          <Input
            value={value}
            onChange={({ detail }) => handleUpdateVariableValue(key, detail.value)}
            placeholder="Variable value"
            readOnly={isReadOnly}
          />
        );
    }
  };

  const schemaTypeOptions = [
    { label: 'Text', value: 'text' },
    { label: 'Number', value: 'number' },
    { label: 'Boolean', value: 'boolean' },
    { label: 'Select', value: 'select' },
  ];

  const variableColumnDefinitions = [
    {
      id: 'key',
      header: 'Variable Name',
      cell: (item: { key: string; value: string; schema: { type: SchemaType; options?: string[] } }) => item.key,
    },
    // Schema column - only visible to admins
    ...(isAdmin() ? [{
      id: 'schema',
      header: 'Schema',
      width: 200,
      cell: (item: { key: string; value: string; schema: { type: SchemaType; options?: string[] } }) => (
        <SpaceBetween direction="horizontal" size="xs">
          <div style={{ position: 'relative', zIndex: 1000 }}>
            <Select
              selectedOption={schemaTypeOptions.find(opt => opt.value === item.schema.type) || schemaTypeOptions[0]}
              onChange={({ detail }) =>
                handleSchemaTypeChange(item.key, detail.selectedOption.value as SchemaType)
              }
              options={schemaTypeOptions}
              disabled={isReadOnly}
              expandToViewport={true}
            />
          </div>
          {item.schema.type === 'select' && (
            <Button
              variant="inline-link"
              onClick={() => setOptionsModalKey(item.key)}
              disabled={isReadOnly}
            >
              Options ({item.schema.options?.length || 0})
            </Button>
          )}
        </SpaceBetween>
      ),
    }] : []),
    {
      id: 'value',
      header: 'Value',
      cell: (item: { key: string; value: string; schema: { type: SchemaType; options?: string[] } }) =>
        renderValueControl(item),
    },
    ...(canAddVariables ? [{
      id: 'actions',
      header: 'Actions',
      cell: (item: { key: string; value: string; schema: { type: SchemaType; options?: string[] } }) => (
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
    <>
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

      {/* Options Modal for Select type */}
      {optionsModalKey && (
        <SelectOptionsModal
          visible={!!optionsModalKey}
          variableName={optionsModalKey}
          currentOptions={flowConfig.schema?.[optionsModalKey]?.options || []}
          onDismiss={() => setOptionsModalKey(null)}
          onSave={(options: string[]) => handleOptionsChange(optionsModalKey, options)}
        />
      )}
    </>
  );
}