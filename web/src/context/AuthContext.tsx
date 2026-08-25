"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmPasswordReset as apiConfirmPasswordReset,
  isAuthenticated,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  setSessionExpiredHandler,
} from "@/lib/api";

interface AuthContextValue {
  loading: boolean;
  signedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  confirmPasswordReset: (username: string, code: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setSignedIn(isAuthenticated());
    setLoading(false);
    setSessionExpiredHandler(() => {
      setSignedIn(false);
      router.replace("/login");
    });
  }, [router]);

  const login = useCallback(async (username: string, password: string) => {
    await apiLogin(username, password);
    setSignedIn(true);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    await apiRegister(username, password);
    setSignedIn(true);
  }, []);

  const confirmPasswordReset = useCallback(async (username: string, code: string, newPassword: string) => {
    await apiConfirmPasswordReset(username, code, newPassword);
    setSignedIn(true);
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setSignedIn(false);
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ loading, signedIn, login, register, confirmPasswordReset, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
