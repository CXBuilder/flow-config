export interface ICognitoIdToken {
  token_use: string;
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  auth_time: number;
  jti: string;
  origin_jti: string;
  at_hash: string;
  'cognito:username': string;
  'cognito:groups': string[];
  given_name: string;
  family_name: string;
  email: string;
  email_verified: boolean;
}
