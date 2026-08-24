import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { isAuthenticated, login as apiLogin, logout as apiLogout } from "../api/auth";
import { setSessionExpiredHandler } from "../api/client";

interface AuthContextValue {
  loading: boolean;
  signedIn: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isAuthenticated().then((v) => {
      setSignedIn(v);
      setLoading(false);
    });
    setSessionExpiredHandler(() => setSignedIn(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    try {
      await apiLogin(username, password);
      setSignedIn(true);
    } catch {
      setError("Usuario ou senha invalidos.");
      throw new Error("invalid_credentials");
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setSignedIn(false);
  }, []);

  return (
    <AuthContext.Provider value={{ loading, signedIn, error, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
