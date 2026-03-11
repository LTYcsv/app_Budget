import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

type AuthContextType = {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'chek_access_token';
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

// Декодируем JWT без библиотек — просто читаем payload
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // в миллисекундах
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  const login = useCallback((newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  }, []);

  // Автообновление токена за 2 минуты до истечения
  const scheduleRefresh = useCallback((currentToken: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    const expiry = getTokenExpiry(currentToken);
    if (!expiry) return;

    const msUntilRefresh = expiry - Date.now() - 2 * 60 * 1000; // за 2 мин до истечения
    if (msUntilRefresh <= 0) {
      // Токен уже истёк или истекает — обновляем сразу
      doRefresh();
      return;
    }

    refreshTimerRef.current = setTimeout(() => doRefresh(), msUntilRefresh);
  }, []); // eslint-disable-line

  async function doRefresh() {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // отправляет httpOnly cookie с refresh token
      });
      if (!res.ok) {
        logout();
        return;
      }
      const data = await res.json();
      login(data.access_token);
    } catch {
      logout();
    }
  }

  useEffect(() => {
    if (token) scheduleRefresh(token);
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [token, scheduleRefresh]);

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
