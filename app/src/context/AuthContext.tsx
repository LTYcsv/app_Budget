/**
 * AuthContext — токен хранится ТОЛЬКО в памяти (React state).
 *
 * SECURITY: localStorage доступен любому JS на странице — при XSS атаке
 * злоумышленник получил бы access token. Вместо этого:
 *  - Access token живёт в памяти (сбрасывается при закрытии вкладки)
 *  - Refresh token — httpOnly cookie (недоступен JS, 30 дней)
 *  - При перезагрузке страницы — тихий refresh через cookie
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

type AuthContextType = {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  return Date.now() >= expiry - 10_000;
}

async function fetchRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // отправляет httpOnly refresh cookie
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

async function callLogout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // ignore network errors on logout
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Токен живёт только здесь — в памяти JS.
  // XSS не может его прочитать через localStorage/document.cookie.
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(async () => {
    setToken(null);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    await callLogout(); // отзываем refresh token на сервере
  }, []);

  const login = useCallback((newToken: string) => {
    // Никакого localStorage — только state
    setToken(newToken);
  }, []);

  // При старте — пробуем тихий refresh через httpOnly cookie.
  // Если cookie нет/истёк — пользователь увидит экран логина.
  useEffect(() => {
    async function init() {
      const newToken = await fetchRefresh();
      if (newToken) setToken(newToken);
      setIsInitialized(true);
    }
    void init();
  }, []);

  // Планируем автообновление за 2 минуты до истечения токена
  useEffect(() => {
    if (!token) return;
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    if (isTokenExpired(token)) {
      void logout();
      return;
    }

    const expiry = getTokenExpiry(token);
    if (!expiry) return;

    const msUntilRefresh = expiry - Date.now() - 2 * 60 * 1000;
    if (msUntilRefresh <= 0) return;

    refreshTimerRef.current = setTimeout(async () => {
      const newToken = await fetchRefresh();
      if (newToken) {
        login(newToken);
      } else {
        void logout();
      }
    }, msUntilRefresh);

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [token, login, logout]);

  if (!isInitialized) return null;

  return (
    <AuthContext.Provider value={{ token, login, logout: () => void logout(), isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
