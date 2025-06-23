import {
  Alert,
  Box,
  SpaceBetween,
  TextContent,
} from '@cloudscape-design/components';

interface NoPermissionsProps {
  userName?: string;
}

export function NoPermissions({ userName }: NoPermissionsProps) {
  return (
    <Box padding="xl">
      <SpaceBetween direction="vertical" size="l">
        <Alert type="warning" header="Access Denied">
          <SpaceBetween direction="vertical" size="m">
            <TextContent>
              <p>
                <strong>
                  You are authenticated but do not have permission to access
                  FlowConfig.
                </strong>
              </p>
              {userName && (
                <p>
                  User: <strong>{userName}</strong>
                </p>
              )}
              <p>
                To access this application, you must be assigned to one of the
                following groups:
              </p>
              <ul>
                <li>
                  <strong>FlowConfigAdmin</strong> - Full access to create,
                  edit, and delete flow configurations
                </li>
                <li>
                  <strong>FlowConfigEdit</strong> - Edit variable values and
                  prompt content in existing flow configurations
                </li>
                <li>
                  <strong>FlowConfigRead</strong> - Read-only access to view
                  flow configurations
                </li>
              </ul>
              <p>
                Please contact your administrator to request access to the
                appropriate group.
              </p>
            </TextContent>
          </SpaceBetween>
        </Alert>
      </SpaceBetween>
    </Box>
  );
}
