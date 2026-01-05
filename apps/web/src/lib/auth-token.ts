/**
 * Authentication token utilities
 *
 * NOTE: This is a simplified implementation for development.
 * In production, tokens should come from a proper authentication system.
 */

const TOKEN_STORAGE_KEY = 'akrobud_auth_token';

/**
 * Get the authentication token from localStorage
 * For development, fetches a demo token from the API if none exists
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null; // SSR - no token available
  }

  // Try to get existing token from localStorage
  const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (storedToken) {
    return storedToken;
  }

  // For development: fetch a demo token from the API
  // This should be replaced with actual login flow in production
  try {
    const token = await fetchDemoToken();
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      return token;
    }
  } catch (error) {
    console.error('Failed to fetch demo token:', error);
  }

  return null;
}

/**
 * Get the authentication token synchronously from localStorage
 * Returns null if no token is stored
 */
export function getAuthTokenSync(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Set authentication token
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

/**
 * Clear authentication token
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Fetch a demo JWT token from the API for development
 *
 * IMPORTANT: This is ONLY for development. In production, tokens must come
 * from a secure authentication endpoint with proper user credentials.
 */
async function fetchDemoToken(): Promise<string | null> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  try {
    // Timeout po 3 sekundach aby nie blokować aplikacji
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${API_URL}/api/auth/demo-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch demo token: ${response.status}`);
    }

    const data = await response.json();
    return data.token || null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Demo token fetch timed out after 3s');
    } else {
      console.error('Error fetching demo token:', error);
    }
    return null;
  }
}
