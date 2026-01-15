/**
 * Authentication token utilities
 *
 * Token jest ustawiany po poprawnym zalogowaniu przez /login
 */

const TOKEN_STORAGE_KEY = 'auth_token';

/**
 * Get the authentication token from localStorage
 * Zwraca null jeśli użytkownik nie jest zalogowany
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null; // SSR - no token available
  }

  return localStorage.getItem(TOKEN_STORAGE_KEY);
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
