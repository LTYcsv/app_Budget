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
  return Date.now() >= expiry - 10_000; // считаем истёкшим за 10 сек до
}

async function fetchRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
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

  // При старте — проверяем токен из localStorage
  useEffect(() => {
    async function init() {
      const stored = localStorage.getItem(TOKEN_KEY);

      if (!stored) {
        setIsInitialized(true);
        return;
      }

      if (!isTokenExpired(stored)) {
        // Токен живой — используем сразу
        setToken(stored);
        setIsInitialized(true);
        return;
      }

      // Токен истёк — пробуем рефреш через cookie
      const newToken = await fetchRefresh();
      if (newToken) {
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
      setIsInitialized(true);
    }

    void init();
  }, []); // только при монтировании

  // Планируем автообновление когда токен меняется
  useEffect(() => {
    if (!token) return;

    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    const expiry = getTokenExpiry(token);
    if (!expiry) return;

    const msUntilRefresh = expiry - Date.now() - 2 * 60 * 1000;
    if (msUntilRefresh <= 0) return; // init уже обработал этот кейс

    refreshTimerRef.current = setTimeout(async () => {
      const newToken = await fetchRefresh();
      if (newToken) {
        login(newToken);
      } else {
        logout();
      }
    }, msUntilRefresh);

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [token, login, logout]);

  // Показываем пустой экран пока не проверили токен
  if (!isInitialized) return null;

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
