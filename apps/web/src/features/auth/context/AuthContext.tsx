'use client';

/**
 * Authentication Context
 * Zarządza stanem zalogowanego użytkownika
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, LoginInput, AuthContextValue } from '../types';
import { loginApi, logoutApi, getCurrentUserApi } from '../api/authApi';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'auth_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Pobierz token z localStorage
   * Jeśli nie ma w localStorage ale jest w cookies, synchronizuj
   */
  const getToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;

    const localToken = localStorage.getItem(TOKEN_KEY);
    if (localToken) return localToken;

    // Sprawdź czy token jest w cookies (middleware go widzi)
    const cookieToken = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${TOKEN_KEY}=`))
      ?.split('=')[1];

    if (cookieToken) {
      // Synchronizuj - skopiuj z cookie do localStorage
      localStorage.setItem(TOKEN_KEY, cookieToken);
      return cookieToken;
    }

    return null;
  }, []);

  /**
   * Zapisz token do localStorage i cookies
   */
  const setToken = useCallback((token: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
    // Zapisz też do cookies dla middleware (30 dni)
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
  }, []);

  /**
   * Usuń token z localStorage i cookies
   */
  const removeToken = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    // Usuń z cookies
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  }, []);

  /**
   * Pobierz aktualnego użytkownika z API
   */
  const refetchUser = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setUser(null);
      setIsLoading(false);

      // Jeśli nie ma tokenu i nie jesteśmy na /login, przekieruj
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        const currentPath = window.location.pathname;
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
      return;
    }

    try {
      const userData = await getCurrentUserApi(token);
      setUser(userData);
    } catch (error) {
      console.error('Błąd pobierania użytkownika:', error);
      // Token nieprawidłowy/wygasł - wyloguj
      removeToken();
      setUser(null);

      // Przekieruj na login
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        const currentPath = window.location.pathname;
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    } finally {
      setIsLoading(false);
    }
  }, [getToken, removeToken]);

  /**
   * Logowanie użytkownika
   */
  const login = useCallback(async (input: LoginInput) => {
    try {
      const response = await loginApi(input);
      setToken(response.token);
      setUser(response.user);
      // Przekieruj na dashboard
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Błąd logowania:', error);
      throw error;
    }
  }, [setToken]);

  /**
   * Wylogowanie użytkownika
   */
  const logout = useCallback(async () => {
    const token = getToken();

    try {
      if (token) {
        await logoutApi(token);
      }
    } catch (error) {
      console.error('Błąd wylogowania:', error);
    } finally {
      removeToken();
      setUser(null);
      // Przekieruj na login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, [getToken, removeToken]);

  /**
   * Przy starcie aplikacji - sprawdź czy użytkownik jest zalogowany
   */
  useEffect(() => {
    refetchUser();
  }, [refetchUser]);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook do używania AuthContext
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
