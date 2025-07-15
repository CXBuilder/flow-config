import { useState, useEffect } from 'react';
import {
  Table,
  Header,
  Pagination,
  TextFilter,
  Button,
  ButtonDropdown,
  SpaceBetween,
  Box,
  Modal,
  Alert,
} from '@cloudscape-design/components';
import { useApi } from '../hooks/useApi';
import { usePermissions } from '../hooks/usePermissions';
import FlowConfigDetail from './FlowConfigDetail';
import {
  FlowConfigSummary,
  FlowConfigList as FlowConfigListType,
  FlowConfig,
} from '../shared';
import SettingsProvider from '../contexts/SettingsProvider';

export default function FlowConfigList() {
  const [flowConfigs, setFlowConfigs] = useState<FlowConfigSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<FlowConfigSummary[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [filteringText, setFilteringText] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [editingFlowConfigId, setEditingFlowConfigId] = useState<
    string | undefined
  >();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [alert, setAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<FlowConfig[]>([]);
  const [importing, setImporting] = useState(false);

  const { apiFetch } = useApi();
  const { hasAccess, isAdmin } = usePermissions();

  const loadFlowConfigs = async () => {
    setLoading(true);
    try {
      const result = await apiFetch<FlowConfigListType>(
        'GET',
        '/api/flow-config'
      );
      if (result) {
        setFlowConfigs(result.items || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingFlowConfigId(undefined);
    setShowDetail(true);
  };

  const handleEdit = (flowConfig: FlowConfigSummary) => {
    setEditingFlowConfigId(flowConfig.id);
    setShowDetail(true);
  };

  const handleDelete = async () => {
    if (selectedItems.length === 0) return;

    setDeleting(true);
    try {
      for (const item of selectedItems) {
        await apiFetch('DELETE', `/api/flow-config/${item.id}`);
      }
      setAlert({
        type: 'success',
        message: `Successfully deleted ${selectedItems.length} flow configuration(s)`,
      });
      setSelectedItems([]);
      await loadFlowConfigs();
    } catch (err) {
      setAlert({
        type: 'error',
        message: 'Failed to delete flow configuration(s)',
      });
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleDetailClose = () => {
    setShowDetail(false);
    setEditingFlowConfigId(undefined);
  };

  const handleDetailSave = async () => {
    setAlert({
      type: 'success',
      message: 'Flow configuration saved successfully',
    });
    setShowDetail(false);
    setEditingFlowConfigId(undefined);
    await loadFlowConfigs();
  };

  const handleExport = async () => {
    if (selectedItems.length === 0) {
      setAlert({
        type: 'error',
        message: 'Please select at least one flow configuration to export.',
      });
      return;
    }

    try {
      // Fetch full details for each selected flow config
      const exportPromises = selectedItems.map(async (item) => {
        const result = await apiFetch<FlowConfig>(
          'GET',
          `/api/flow-config/${item.id}`
        );
        return result;
      });

      const fullFlowConfigs = await Promise.all(exportPromises);

      // Filter out any failed requests
      const validConfigs = fullFlowConfigs.filter(
        (config) => config !== null && config !== undefined
      );

      if (validConfigs.length === 0) {
        setAlert({
          type: 'error',
          message: 'Failed to fetch flow configuration details for export.',
        });
        return;
      }

      // Create filename with timestamp and count
      const now = new Date();
      const timestamp = now
        .toISOString()
        .slice(0, 16)
        .replace('T', '-')
        .replace(':', '');
      const filename = `flow-configs-${validConfigs.length}-items-${timestamp}.json`;

      // Create and download file as simple array
      const blob = new Blob([JSON.stringify(validConfigs, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setAlert({
        type: 'success',
        message: `Successfully exported ${validConfigs.length} flow configuration(s) to ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      setAlert({
        type: 'error',
        message:
          'Failed to export selected flow configurations. Please try again.',
      });
    }
  };

  const handleImport = () => {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsedData = JSON.parse(text);

        // Validate import data structure - expect simple array or legacy format
        let flowConfigs: any[];

        if (Array.isArray(parsedData)) {
          // New format: simple array
          flowConfigs = parsedData;
        } else if (
          parsedData.flowConfigs &&
          Array.isArray(parsedData.flowConfigs)
        ) {
          // Legacy format: wrapped in metadata object
          flowConfigs = parsedData.flowConfigs;
        } else {
          throw new Error(
            'Invalid import file format. Expected a JSON array of flow configurations.'
          );
        }

        if (flowConfigs.length === 0) {
          throw new Error('Import file contains no flow configurations.');
        }

        // Additional validation for FlowConfig structure
        const hasValidStructure = flowConfigs.every(
          (config: any) =>
            config.id &&
            config.description !== undefined &&
            config.variables !== undefined &&
            config.prompts !== undefined
        );

        if (!hasValidStructure) {
          throw new Error(
            'Invalid flow configuration structure in import file.'
          );
        }

        // Store validated data and show confirmation modal
        setImportData(flowConfigs as FlowConfig[]);
        setShowImportModal(true);
      } catch (error) {
        console.error('Import error:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to process import file';
        setAlert({
          type: 'error',
          message: `Import failed: ${errorMessage}`,
        });
      }
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

  const handleConfirmImport = async () => {
    setImporting(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      for (const config of importData) {
        try {
          await apiFetch<FlowConfig>(
            'POST',
            `/api/flow-config/${config.id}`,
            config
          );
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(
            `Failed to import "${config.id}": ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
          console.error(`Import error for ${config.id}:`, error);
        }
      }

      // Show results
      if (successCount > 0 && errorCount === 0) {
        setAlert({
          type: 'success',
          message: `Successfully imported ${successCount} flow configuration(s).`,
        });
      } else if (successCount > 0 && errorCount > 0) {
        setAlert({
          type: 'error',
          message: `Imported ${successCount} flow configuration(s) successfully, but ${errorCount} failed. Check console for details.`,
        });
      } else {
        setAlert({
          type: 'error',
          message: `Import failed: ${errorCount} flow configuration(s) could not be imported. Check console for details.`,
        });
      }

      // Log detailed errors for debugging
      if (errors.length > 0) {
        console.error('Import errors:', errors);
      }

      // Refresh the list to show imported items
      await loadFlowConfigs();
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Import process failed. Please try again.',
      });
      console.error('Import process error:', error);
    } finally {
      setImporting(false);
      setShowImportModal(false);
      setImportData([]);
    }
  };

  useEffect(() => {
    loadFlowConfigs();
  }, []);

  // Filter items based on search text
  const filteredItems = flowConfigs.filter(
    (item) =>
      item.id!.toLowerCase().includes(filteringText.toLowerCase()) ||
      item.description?.toLowerCase().includes(filteringText.toLowerCase())
  );

  // Sort items alphabetically by ID
  const sortedItems = filteredItems.sort((a, b) => a.id!.localeCompare(b.id!));

  // Pagination
  const pageSize = 10;
  const startIndex = (currentPageIndex - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = sortedItems.slice(startIndex, endIndex);

  const columnDefinitions = [
    {
      id: 'id',
      header: 'ID',
      cell: (item: FlowConfigSummary) => (
        <Button variant="link" onClick={() => handleEdit(item)}>
          {item.id}
        </Button>
      ),
      sortingField: 'id',
      isRowHeader: true,
      minWidth: 150,
      maxWidth: 200,
    },
    {
      id: 'description',
      header: 'Description',
      cell: (item: FlowConfigSummary) => item.description || '',
      sortingField: 'description',
      minWidth: 200,
      maxWidth: 300,
    },
    {
      id: 'accessLevel',
      header: 'Access Level',
      cell: (item: FlowConfigSummary) => item.accessLevel || '',
      sortingField: 'accessLevel',
      minWidth: 100,
      maxWidth: 150,
    },
  ];

  return (
    <SettingsProvider>
      <Table
        columnDefinitions={columnDefinitions}
        items={paginatedItems}
        loading={loading}
        loadingText="Loading flow configurations..."
        selectedItems={selectedItems}
        onSelectionChange={({ detail }) =>
          setSelectedItems(detail.selectedItems)
        }
        selectionType="multi"
        ariaLabels={{
          selectionGroupLabel: 'Flow configuration selection',
          allItemsSelectionLabel: ({ selectedItems }) =>
            `${selectedItems.length} ${
              selectedItems.length === 1 ? 'item' : 'items'
            } selected`,
          itemSelectionLabel: ({ selectedItems }, item) => {
            const isItemSelected = selectedItems.filter(
              (i) => i.id === item.id
            ).length;
            return `${item.id} is ${isItemSelected ? '' : 'not'} selected`;
          },
        }}
        header={
          <Header
            counter={`(${sortedItems.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                {isAdmin() && (
                  <Button variant="primary" onClick={handleCreate}>
                    Create
                  </Button>
                )}
                {hasAccess('Edit') && (
                  <Button
                    disabled={selectedItems.length !== 1}
                    onClick={() => handleEdit(selectedItems[0])}
                  >
                    Edit
                  </Button>
                )}
                {isAdmin() && (
                  <Button
                    disabled={selectedItems.length === 0}
                    onClick={() => setShowDeleteModal(true)}
                  >
                    Delete
                  </Button>
                )}
                {isAdmin() && (
                  <ButtonDropdown
                    items={[
                      {
                        text: 'Export Selected',
                        id: 'export',
                        iconName: 'download',
                        disabled: selectedItems.length === 0,
                      },
                      {
                        text: 'Import',
                        id: 'import',
                        iconName: 'upload',
                      },
                    ]}
                    variant="normal"
                    onItemClick={({ detail }) => {
                      if (detail.id === 'export') {
                        handleExport();
                      } else if (detail.id === 'import') {
                        handleImport();
                      }
                    }}
                  >
                    More Actions
                  </ButtonDropdown>
                )}
              </SpaceBetween>
            }
          >
            Flow Configurations
          </Header>
        }
        filter={
          <TextFilter
            filteringText={filteringText}
            filteringPlaceholder="Find flow configurations"
            filteringAriaLabel="Filter flow configurations"
            onChange={({ detail }) => {
              setFilteringText(detail.filteringText);
              setCurrentPageIndex(1); // Reset to first page when filtering
            }}
          />
        }
        pagination={
          <Pagination
            currentPageIndex={currentPageIndex}
            pagesCount={Math.ceil(filteredItems.length / pageSize)}
            onChange={({ detail }) =>
              setCurrentPageIndex(detail.currentPageIndex)
            }
            ariaLabels={{
              nextPageLabel: 'Next page',
              previousPageLabel: 'Previous page',
              pageLabel: (pageNumber) => `Page ${pageNumber} of all pages`,
            }}
          />
        }
        empty={
          <Box margin={{ vertical: 'xs' }} textAlign="center" color="inherit">
            <SpaceBetween size="m">
              <b>No flow configurations</b>
              {isAdmin() && (
                <Button onClick={handleCreate}>
                  Create flow configuration
                </Button>
              )}
            </SpaceBetween>
          </Box>
        }
      />

      {/* Alert Messages */}
      {alert && (
        <Alert type={alert.type} dismissible onDismiss={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Detail View - Full Screen Modal */}
      <Modal
        onDismiss={handleDetailClose}
        visible={showDetail}
        size="max"
        header={
          editingFlowConfigId
            ? `Edit: ${editingFlowConfigId}`
            : 'Create Flow Configuration'
        }
      >
        {showDetail && (
          <FlowConfigDetail
            flowConfigId={editingFlowConfigId}
            onClose={handleDetailClose}
            onSave={handleDetailSave}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        onDismiss={() => setShowDeleteModal(false)}
        visible={showDeleteModal}
        header="Delete Flow Configuration"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={deleting}
                onClick={handleDelete}
              >
                Delete
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween direction="vertical" size="m">
          <Box variant="span">
            Are you sure you want to delete {selectedItems.length} flow
            configuration{selectedItems.length > 1 ? 's' : ''}?
          </Box>
          {selectedItems.length > 0 && (
            <Box>
              <strong>Items to be deleted:</strong>
              <ul>
                {selectedItems.map((item) => (
                  <li key={item.id}>
                    {item.id} - {item.description}
                  </li>
                ))}
              </ul>
            </Box>
          )}
        </SpaceBetween>
      </Modal>

      {/* Import Confirmation Modal */}
      <Modal
        visible={showImportModal}
        onDismiss={() => setShowImportModal(false)}
        header="Import Flow Configurations"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowImportModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={importing}
                onClick={handleConfirmImport}
              >
                Import
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween direction="vertical" size="m">
          <Alert type="warning">
            <strong>Warning:</strong> Importing will overwrite any existing flow
            configurations with the same IDs.
          </Alert>
          <Box variant="span">
            Are you sure you want to import {importData.length} flow
            configuration{importData.length > 1 ? 's' : ''}?
          </Box>
          {importData.length > 0 && (
            <Box>
              <strong>Items to be imported:</strong>
              <ul>
                {importData.map((config) => (
                  <li key={config.id}>
                    {config.id} - {config.description}
                  </li>
                ))}
              </ul>
            </Box>
          )}
        </SpaceBetween>
      </Modal>
    </SettingsProvider>
  );
}
