/**
 * Path utilities for handling environment-specific URLs
 */

// Determine base path based on environment
const basePath = import.meta.env.MODE === 'production' ? '/prod' : '';

/**
 * Get API URL with correct base path
 */
export function getApiUrl(path: string): string {
  const apiPath = path.startsWith('/api/') ? path : `/api${path.startsWith('/') ? '' : '/'}${path}`;
  return `${basePath}${apiPath}`;
}

/**
 * Get app URL with correct base path and origin
 */
export function getAppUrl(path: string): string {
  const appPath = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${basePath}${appPath}`;
}

/**
 * Get the base path for the current environment
 */
export function getBasePath(): string {
  return basePath;
}