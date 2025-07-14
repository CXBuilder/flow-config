import {
  Modal,
  Box,
  SpaceBetween,
  Button,
  FormField,
  Select,
  Container,
  Header,
  ColumnLayout,
  Table,
} from '@cloudscape-design/components';
import { LANGUAGE_OPTIONS, CHANNEL_OPTIONS } from '../shared/constants';
import { PreviewData } from '../shared/types';

interface FlowConfigPreviewProps {
  visible: boolean;
  onDismiss: () => void;
  previewData: PreviewData | null;
  lang: string;
  channel: string;
  onLangChange: (lang: string) => void;
  onChannelChange: (channel: string) => void;
  onRefresh: () => void;
  refreshLoading: boolean;
}

export function FlowConfigPreview({
  visible,
  onDismiss,
  previewData,
  lang,
  channel,
  onLangChange,
  onChannelChange,
  onRefresh,
  refreshLoading,
}: FlowConfigPreviewProps) {
  return (
    <Modal
      onDismiss={onDismiss}
      visible={visible}
      header="Flow Config Preview"
      size="large"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={onRefresh}
              loading={refreshLoading}
              iconName="refresh"
            >
              Refresh
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween direction="vertical" size="l">
        {/* Controls */}
        <Container header={<Header variant="h3">Preview Settings</Header>}>
          <ColumnLayout columns={2}>
            <FormField label="Language">
              <Select
                selectedOption={LANGUAGE_OPTIONS.find(opt => opt.value === lang) || null}
                onChange={({ detail }) => {
                  if (detail.selectedOption?.value) {
                    onLangChange(detail.selectedOption.value);
                  }
                }}
                options={LANGUAGE_OPTIONS}
              />
            </FormField>
            <FormField label="Channel">
              <Select
                selectedOption={CHANNEL_OPTIONS.find(opt => opt.value === channel) || null}
                onChange={({ detail }) => {
                  if (detail.selectedOption?.value) {
                    onChannelChange(detail.selectedOption.value);
                  }
                }}
                options={CHANNEL_OPTIONS}
              />
            </FormField>
          </ColumnLayout>
        </Container>

        {/* Preview Results */}
        {previewData && (
          <Container 
            header={
              <Header 
                variant="h3"
                description="These are the exact key-value pairs that will be returned when Amazon Connect contact flows call the GetConfig Lambda function with the selected language and channel."
              >
                Flow Config Data
              </Header>
            }
          >
            {Object.keys(previewData).length === 0 ? (
              <Box textAlign="center" color="inherit">
                <b>No data</b>
                <Box variant="p" color="inherit">
                  No data available for {lang} {channel} channel
                </Box>
              </Box>
            ) : (
              <Table
                columnDefinitions={[
                  {
                    id: 'key',
                    header: 'Key',
                    cell: (item: { key: string; value: string }) => item.key,
                  },
                  {
                    id: 'value',
                    header: 'Value',
                    cell: (item: { key: string; value: string }) => (
                      <Box>
                        <div style={{ 
                          maxWidth: '400px', 
                          wordWrap: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {item.value}
                        </div>
                      </Box>
                    ),
                  },
                ]}
                items={Object.entries(previewData).map(([key, value]) => ({
                  key,
                  value: value as string,
                }))}
                empty={
                  <Box textAlign="center" color="inherit">
                    No data available
                  </Box>
                }
              />
            )}
          </Container>
        )}
      </SpaceBetween>
    </Modal>
  );
}