import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "dex_auth_token";
const EXPIRES_KEY = "dex_auth_expires";

interface AuthContextValue {
  token: string | null;
  expiresAt: string | null;
  login: (token: string, expiresAt: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [expiresAt, setExpiresAt] = useState<string | null>(() => localStorage.getItem(EXPIRES_KEY));

  const login = useCallback((newToken: string, newExpiresAt: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(EXPIRES_KEY, newExpiresAt);
    setToken(newToken);
    setExpiresAt(newExpiresAt);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    setToken(null);
    setExpiresAt(null);
  }, []);

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));
    return () => setAuthTokenGetter(null);
  }, []);

  const isAuthenticated = Boolean(token);

  return (
    <AuthContext.Provider value={{ token, expiresAt, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
