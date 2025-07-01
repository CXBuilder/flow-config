import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import TokenProvider from '../auth/AuthorizationCodeTokenProvider';
import EndpointProvider from '../auth/OpenIdEndpointProvider';
import { Button, SpaceBetween } from '@cloudscape-design/components';
import { getAppUrl } from '../utils/paths';
import ConfigurationContext from './ConfigurationContext';
import logger from 'loglevel';
import { useAlert } from './AlertProvider';

export const CognitoAuthenticationContext = createContext<TokenProvider>(
  null as any
);
export const useTokenContext = () => useContext(CognitoAuthenticationContext);

function CognitoAuthenticationProvider({ children }: { children: ReactNode }) {
  const { setAlert } = useAlert();
  const config = useContext(ConfigurationContext);

  const REDIRECT_URL = getAppUrl('/popup.html');

  const [tokenProvider, setTokenProvider] = useState<TokenProvider | undefined>(
    undefined
  );

  const [initialized, setInitialized] = useState<boolean>(false);
  const [popupBlocked, setPopupBlocked] = useState<boolean>(false);
  const [codeVerifier, setCodeVerifier] = useState('');

  // Check if Cognito is configured
  const cognitoConfigured = config?.userPoolId && config?.clientId;

  useEffect(() => {
    if (config) {
      if (cognitoConfigured) {
        // Cognito is configured - create token provider
        const tokenProvider = new TokenProvider(
          new EndpointProvider(
            `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}/.well-known/openid-configuration`
          ),
          config.clientId ?? '',
          REDIRECT_URL
        );
        setTokenProvider(tokenProvider);
      } else {
        // Cognito is not configured - skip authentication
        setInitialized(true);
      }
    }
  }, [config, cognitoConfigured]);

  useEffect(() => {
    if (tokenProvider && !codeVerifier) {
      const verifier = tokenProvider.generateCodeVerifier();
      setCodeVerifier(verifier);
      tokenProvider.getAuthorizationUrl(verifier).then((authorizeUrl) => {
        const popup = window.open(
          authorizeUrl,
          'authentication',
          'height=600,width=400'
        );
        if (!popup) {
          setPopupBlocked(true);
        }
        window.addEventListener('message', (e) => {
          if (e.origin === window.location.origin && e.data.name === 'auth') {
            logger.debug('Auth Popup PostBack', { data: e.data });
            popup?.close();
            const code = e.data.code;
            tokenProvider
              .validateCode(verifier, code)
              .then(() => {
                tokenProvider.getIdTokenPayload().then((claims) => {
                  logger.debug({ claims });
                  // updateAuthUser({
                  //   username: claims['cognito:username'],
                  //   groups: claims['cognito:groups'],
                  //   email: claims.email
                  // });

                  setInitialized(true);
                });
              })
              .catch((e) => {
                logger.error(e);
                setAlert(e.message, 'error');
              });
          }
        });
      });
    }
  }, [tokenProvider]);

  const message = popupBlocked
    ? 'Login popup was blocked. Please allow popups on this site and try again.'
    : 'Authenticating...';

  const status = (
    <SpaceBetween direction="vertical" size="l">
      <p>{message}</p>
      {popupBlocked && (
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      )}
    </SpaceBetween>
  );

  return (
    <>
      {initialized ? (
        <CognitoAuthenticationContext.Provider value={tokenProvider!}>
          {children}
        </CognitoAuthenticationContext.Provider>
      ) : (
        status
      )}
    </>
  );
}

export default CognitoAuthenticationProvider;
