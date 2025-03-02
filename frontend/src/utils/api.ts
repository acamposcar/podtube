// Use relative URL if VITE_API_URL is not set
export const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Helper function to ensure API calls work with both absolute and relative URLs
 * @param endpoint The API endpoint to call
 * @returns The full URL to use for the API call
 */
export const getApiUrl = (endpoint: string): string => {
  // If endpoint already starts with http, return it as is
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  
  // Make sure endpoint starts with a slash
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // If API_URL is empty, use the current origin
  if (!API_URL) {
    return formattedEndpoint;
  }
  
  // Return the full URL
  return `${API_URL}${formattedEndpoint}`;
}; 