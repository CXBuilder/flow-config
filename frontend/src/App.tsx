import '@cloudscape-design/global-styles/index.css';
import './App.css';
import {
  ContentLayout,
  Box,
  SpaceBetween,
  Link,
  TextContent,
  Tabs,
} from '@cloudscape-design/components';
import FlowConfigList from './components/FlowConfigList';
import { NoPermissions } from './components/NoPermissions';
import { AdminSettings } from './components/Settings';
import { usePermissions } from './hooks/usePermissions';
import { useContext, useState, useEffect } from 'react';
import { CognitoAuthenticationContext } from './contexts/CognitoAuthenticationProvider';
import { useConfiguration } from './hooks/useConfiguration';

function App() {
  const { hasAnyAccess, isAdmin } = usePermissions();
  const tokenProvider = useContext(CognitoAuthenticationContext);
  const { branding } = useConfiguration();
  const [userName, setUserName] = useState<string>();
  const [activeTab, setActiveTab] = useState('flow-configs');

  useEffect(() => {
    if (tokenProvider) {
      tokenProvider
        .getIdTokenPayload()
        .then((token) => {
          setUserName(token['cognito:username'] || token.email);
        })
        .catch((error) => {
          console.error('Failed to get user name:', error);
        });
    } else {
      // Cognito not configured - use a default name for demo
      setUserName('Demo User');
    }
  }, [tokenProvider]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Main content area */}
      <div style={{ flex: 1 }}>
        <Box padding="l">
          <ContentLayout>
            {hasAnyAccess() ? (
              isAdmin() ? (
                <Tabs
                  activeTabId={activeTab}
                  onChange={({ detail }) => setActiveTab(detail.activeTabId)}
                  tabs={[
                    {
                      label: 'Flow Configurations',
                      id: 'flow-configs',
                      content: <FlowConfigList />,
                    },
                    {
                      label: 'Settings',
                      id: 'settings',
                      content: <AdminSettings />,
                    },
                  ]}
                />
              ) : (
                <FlowConfigList />
              )
            ) : (
              <NoPermissions userName={userName} />
            )}
          </ContentLayout>
        </Box>
      </div>

      {/* Footer - sticks to bottom */}
      {branding && (
        <Box textAlign="center" padding="l">
          <TextContent>
            <Box variant="small" color="text-body-secondary">
              <SpaceBetween direction="horizontal" size="m" alignItems="center">
                <span>Built by</span>
                <Link
                  external
                  href="https://www.cxbuilder.ai"
                  ariaLabel="Visit CXBuilder website"
                >
                  CXBuilder
                </Link>
                <span>•</span>
                <Link
                  external
                  href="https://github.com/CXBuilder/flow-config"
                  ariaLabel="View source code on GitHub"
                >
                  @cxbuilder/flow-config
                </Link>
              </SpaceBetween>
            </Box>
          </TextContent>
        </Box>
      )}
    </div>
  );
}

export default App;
