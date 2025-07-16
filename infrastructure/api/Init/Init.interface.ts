export interface InitEnv {
  stackName: string;
  userPoolId?: string;
  AWS_REGION?: string;
  /**
   * true/false flag to enable/disable CXBuilder branding in the web app.
   */
  branding: string;
}
