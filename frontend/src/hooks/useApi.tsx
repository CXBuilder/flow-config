import { useAlert } from '../contexts/AlertProvider';
import { useTokenContext } from '../contexts/CognitoAuthenticationProvider';
import { getApiUrl } from '../utils/paths';

export function useApi() {
  const { setAlert } = useAlert();
  const tokenProvider = useTokenContext();

  /**
   * Utility for calling the api with authentication and basic error handling
   */
  async function apiFetch<TResult>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE', 
    path: string, 
    body?: unknown
  ): Promise<TResult | undefined> {
    try {
      const accessToken = await tokenProvider.getIdToken();

      const requestInit: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      };

      if (body && method !== 'GET') {
        requestInit.body = JSON.stringify(body);
      }

      const response = await fetch(getApiUrl(path), requestInit);

      // Handle 204 No Content responses
      if (response.status === 204) {
        return undefined;
      }

      const data = await response.json();
      if (response.status >= 200 && response.status <= 299) {
        return data as TResult;
      } else {
        if (data.message) {
          setAlert(data.message, 'error');
        } else {
          setAlert(`HTTP: ${response.status}. ${data}`, 'error');
        }
      }
    } catch (e) {
      setAlert((e as Error).message, 'error');
    }
  }

  return {
    apiFetch
  };
}
