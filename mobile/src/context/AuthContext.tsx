import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  getStoredUsername,
  isAuthenticated,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from "../api/auth";
import { setSessionExpiredHandler } from "../api/client";

interface AuthContextValue {
  loading: boolean;
  signedIn: boolean;
  username: string | null;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([isAuthenticated(), getStoredUsername()]).then(([v, storedUsername]) => {
      setSignedIn(v);
      setUsername(storedUsername);
      setLoading(false);
    });
    setSessionExpiredHandler(() => setSignedIn(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    try {
      await apiLogin(username, password);
      setSignedIn(true);
      setUsername(username);
    } catch {
      setError("Usuario ou senha invalidos.");
      throw new Error("invalid_credentials");
    }
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    setError(null);
    // Deixa o erro do backend (usuario ja existe, senha fraca, etc) subir
    // como esta — a tela de login mostra a mensagem certa por campo.
    await apiRegister(username, password);
    setSignedIn(true);
    setUsername(username);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setSignedIn(false);
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{ loading, signedIn, username, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
