interface IWellKnownConfiguration {
  authorization_endpoint: string;
  end_session_endpoint: string;
  jwks_uri: string;
  revocation_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
}

/**
 * @implements {IEndpointProvider}
 */
export default class OpenIdEndpointProvider {
  private _configurationEndpoint: string;
  private _pendingLoad?: Promise<void>;
  private _configuration?: IWellKnownConfiguration;

  /**
   * @description Public constructor for OpenIdEndpointProvider class
   * @param {string} configurationEndpoint The URL for the OpenID well know configuration endpoint
   * @example https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ZULTvSoiE/.well-known/openid-configuration
   */
  constructor(configurationEndpoint: string) {
    this._configurationEndpoint = configurationEndpoint;
  }

  /**
   * @description Retrieves a URL for the authorization endpoint
   * @returns {Promise<string>} A promise that resolves to the value of the URL on completion
   * @exception Thrown if the configuration endpoint returns an error
   */
  async retrieveAuthorizationEndpoint() {
    if (!this._configuration?.authorization_endpoint) await this._loadConfiguration();
    return this._configuration?.authorization_endpoint;
  }

  /**
   * @description Retrieves a URL for the authorization endpoint
   * @returns {Promise<string>} A promise that resolves to the value of the URL on completion
   * @exception Thrown if the configuration endpoint returns an error
   */
  async retrieveTokenEndpoint() {
    if (!this._configuration?.token_endpoint) await this._loadConfiguration();
    return this._configuration?.token_endpoint;
  }

  /**
   * @description Retrieves a URL for the authorization endpoint
   * @returns {Promise<string>} A promise that resolves to the value of the URL on completion
   * @exception Thrown if the configuration endpoint returns an error
   */
  async retrieveUserInfoEndpoint(): Promise<string | undefined> {
    if (!this._configuration?.userinfo_endpoint) await this._loadConfiguration();
    return this._configuration?.userinfo_endpoint;
  }

  /**
   * @description Retrieves a URL for the token revocation endpoint
   * @returns {Promise<string | undefined>} A promise that resolves to the value of the URL on completion
   * @exception Thrown if the configuration endpoint returns an error
   */
  async retrieveTokenRevocationEndpoint(): Promise<string | undefined> {
    if (!this._configuration?.revocation_endpoint) await this._loadConfiguration();
    return this._configuration?.revocation_endpoint;
  }

  /**
   * @description Retrieves a URL for the end session endpoint
   * @returns {Promise<string | undefined>} A promise that resolves to the value of the URL on completion
   * @exception Thrown if the configuration endpoint returns an error
   */
  async retrieveEndSessionEndpoint(): Promise<string | undefined> {
    if (!this._configuration?.end_session_endpoint) await this._loadConfiguration();
    return this._configuration?.end_session_endpoint;
  }

  /**
   * @description Retrieves a URL for the  authorization endpoint
   * @returns {Promise<string | undefined>} A promise that resolves to the value of the URL on completion
   * @exception Thrown if the configuration endpoint returns an error
   */
  async retrieveJSONWebKeySetEndpoint(): Promise<string | undefined> {
    if (!this._configuration?.jwks_uri) await this._loadConfiguration();
    return this._configuration?.jwks_uri;
  }

  private async _loadConfiguration(): Promise<void> {
    try {
      if (this._pendingLoad) await this._pendingLoad;
      else {
        this._pendingLoad = (async () => {
          const response = await fetch(this._configurationEndpoint);
          this._configuration = await response.json();
        })();
        await this._pendingLoad;
        this._pendingLoad = undefined;
      }
    } catch (err) {
      throw 'Failed to load configuration endpoint: ' + err;
    }
  }
}
