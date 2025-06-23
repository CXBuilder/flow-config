import { useState, useEffect } from 'react';
import {
  Table,
  Header,
  Pagination,
  TextFilter,
  Button,
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
} from '../shared';

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

  useEffect(() => {
    loadFlowConfigs();
  }, []);

  // Filter items based on search text
  const filteredItems = flowConfigs.filter(
    (item) =>
      item.id!.toLowerCase().includes(filteringText.toLowerCase()) ||
      item.description?.toLowerCase().includes(filteringText.toLowerCase())
  );

  // Pagination
  const pageSize = 10;
  const startIndex = (currentPageIndex - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

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
    <>
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
            counter={`(${filteredItems.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                {isAdmin() && (
                  <Button
                    disabled={selectedItems.length === 0}
                    onClick={() => setShowDeleteModal(true)}
                  >
                    Delete
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
                  <Button variant="primary" onClick={handleCreate}>
                    Create
                  </Button>
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
                <Button onClick={handleCreate}>Create flow configuration</Button>
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
    </>
  );
}
