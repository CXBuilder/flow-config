// API configuration
export function getApiUrl(path: string): string {
  // Ensure path starts with /api/
  const apiPath = path.startsWith('/api/') ? path : `/api${path.startsWith('/') ? '' : '/'}${path}`;
  
  if (import.meta.env.MODE === 'production') {
    // In production, prepend /prod to the API path since we're served from /prod/
    return `/prod${apiPath}`;
  } else {
    // In development, use the proxy (relative paths work)
    return apiPath;
  }
}