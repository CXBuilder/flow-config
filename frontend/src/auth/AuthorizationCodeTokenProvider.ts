import { ICognitoIdToken } from './ICognitoIdToken';
import OpenIdEndpointProvider from './OpenIdEndpointProvider';

/**
 * @implements {ITokenProvider}
 */
export default class AuthorizationCodeTokenProvider {
  private readonly endpointProvider: OpenIdEndpointProvider;
  private readonly clientId: string;
  private readonly redirectUrl: string;
  private pendingRefresh?: Promise<void>;

  /**
   * @description Public constructor for AuthorizationCodeGrantTokenProvider class
   * @param {IEndpointProvider} endpointProvider An endpoint provider that provides the URL for the authorization and token endpoints
   * @param {string} clientKey The consumer key for the calling application
   * @param {string} redirectUrl The URL to which the browser should redirect after successfully authenticating a user
   */
  constructor(endpointProvider: OpenIdEndpointProvider, clientId: string, redirectUrl: string) {
    this.endpointProvider = endpointProvider;
    this.clientId = clientId;
    this.redirectUrl = redirectUrl;
  }

  generateCodeVerifier(length = 128) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~';
    let codeVerifier = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      codeVerifier += charset.charAt(randomIndex);
    }
    return codeVerifier;
  }

  private async generateCodeChallenge(codeVerifier: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hash = await crypto.subtle.digest('SHA-256', data);

    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * @description Get a redirect URL for Trimble Identity
   * @param {string} state A code verifier maintained by the caller and later passed to the token endpoint
   * @param {string} state An optional state parameter that will be passed back to the caller via the redirect URL
   * @returns {Promise<string>} A promise that resolves to the redirect URL
   * @exception Thrown when an authorization endpoint is not provided by the endpoint provider
   */
  async getAuthorizationUrl(verifier: string, state?: string): Promise<string> {
    const challenge = await this.generateCodeChallenge(verifier);
    let url =
      (await this.endpointProvider.retrieveAuthorizationEndpoint())! +
      '?response_type=code' +
      `&client_id=${encodeURIComponent(this.clientId)}` +
      '&scope=openid%20profile%20email' +
      `&redirect_uri=${encodeURIComponent(this.redirectUrl)}` +
      `&code_challenge=${encodeURIComponent(challenge)}` +
      '&code_challenge_method=S256';

    if (state) {
      url = url + '&state=' + encodeURIComponent(state);
    }

    // todo: include IdP name if provided (i.e. redirect to SAML provider)
    return url;
  }

  private async refreshTokens(): Promise<void> {
    if (this.pendingRefresh) await this.pendingRefresh;
    else {
      this.pendingRefresh = (async () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('id_token');
        localStorage.removeItem('tokens_expires_at');

        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const payload = {
            grant_type: 'refresh_token',
            client_id: this.clientId,
            refresh_token: refreshToken,
          };
          const response = await fetch((await this.endpointProvider.retrieveTokenEndpoint())!, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(payload),
          });
          const data = await response.json();
          if (!data.access_token) {
            throw new Error('Failed to refresh token');
          }
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('id_token', data.id_token);
          localStorage.setItem('tokens_expire_at', (Date.now() + data.expires_in * 1000).toString());
        }
      })();

      await this.pendingRefresh;
      this.pendingRefresh = undefined;
    }
  }

  /**
   * @description Validate the query parameters passed back to the application
   * @param {string} state A code verifier maintained by the caller that was used to initiate the authentication
   * @param {string} code The code from the query string in the URL
   * @returns {Promise<void>} A promise that resolves to true if the query string is valid
   * @exception Thrown when a token endpoint is not provided by the endpoint provider
   * @exception Thrown when a call to the token endpoint fails
   */
  async validateCode(verifier: string, code: string): Promise<void> {
    const payload = {
      grant_type: 'authorization_code',
      client_id: this.clientId,
      code: code,
      redirect_uri: this.redirectUrl,
      code_verifier: verifier,
    };
    const response = await fetch((await this.endpointProvider.retrieveTokenEndpoint())!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(payload),
    });
    const data = await response.json();
    if (!data.access_token) {
      throw new Error('Failed to get tokens');
    }
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('access_token_expires_at', String(Date.now() + data.expires_in * 1000));
    localStorage.setItem('id_token', data.id_token);
    localStorage.setItem('refresh_token', data.refresh_token);
  }

  /**
   * @description Retrieves an access token for the authenticated user
   * @returns {Promise<string>} A promise that resolves to the value of the access token on completion
   * @exception Thrown when a token endpoint is not provided by the endpoint provider
   * @exception Thrown when a call to the token endpoint fails
   */
  async getAccessToken(): Promise<string> {
    // check for an existing access_token
    const tokenExpiresAt = localStorage.getItem('tokens_expire_at');
    const timestampWithBuffer = Date.now() + 5 * 60000; // five minutes in the future
    if (!tokenExpiresAt || Number.parseInt(tokenExpiresAt) < timestampWithBuffer) {
      await this.refreshTokens();
    }

    // return the token if it exists
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      throw new Error('Failed to get access token');
    }
    return accessToken;
  }

  /**
   * @description Retrieves an ID token for the authenticated user
   * @returns {Promise<string>} A promise that resolves to the value of the ID token on completion
   * @exception Thrown when a token endpoint is not provided by the endpoint provider
   * @exception Thrown when a call to the token endpoint fails
   */
  async getIdToken(): Promise<string> {
    // check for an existing id_token
    const tokenExpiresAt = localStorage.getItem('tokens_expire_at');
    const timestampWithBuffer = Date.now() + 5 * 60000; // five minutes in the future
    if (!tokenExpiresAt || Number.parseInt(tokenExpiresAt) < timestampWithBuffer) {
      await this.refreshTokens();
    }

    // return the token if it exists
    const idToken = localStorage.getItem('id_token');
    if (!idToken) {
      throw new Error('Failed to get ID token');
    }
    return idToken;
  }

  async getIdTokenPayload(): Promise<ICognitoIdToken> {
    const idToken = await this.getIdToken();
    const payload = idToken.split('.')[1];
    return JSON.parse(atob(payload));
  }
}
