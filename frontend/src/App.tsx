import '@cloudscape-design/global-styles/index.css';
import './App.css';
import {
  ContentLayout,
  Box,
  SpaceBetween,
  Link,
  TextContent,
} from '@cloudscape-design/components';
import FlowConfigList from './components/FlowConfigList';
import { NoPermissions } from './components/NoPermissions';
import { usePermissions } from './hooks/usePermissions';
import { useContext, useState, useEffect } from 'react';
import { CognitoAuthenticationContext } from './contexts/CognitoAuthenticationProvider';

function App() {
  const { hasAnyAccess } = usePermissions();
  const tokenProvider = useContext(CognitoAuthenticationContext);
  const [userName, setUserName] = useState<string>();

  useEffect(() => {
    if (tokenProvider) {
      tokenProvider.getIdTokenPayload().then((token) => {
        setUserName(token['cognito:username'] || token.email);
      }).catch((error) => {
        console.error('Failed to get user name:', error);
      });
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
              <FlowConfigList />
            ) : (
              <NoPermissions userName={userName} />
            )}
          </ContentLayout>
        </Box>
      </div>

      {/* Footer - sticks to bottom */}
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
    </div>
  );
}

export default App;
