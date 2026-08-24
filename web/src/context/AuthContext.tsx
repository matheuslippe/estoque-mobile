"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, login as apiLogin, logout as apiLogout, setSessionExpiredHandler } from "@/lib/api";

interface AuthContextValue {
  loading: boolean;
  signedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
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

  const logout = useCallback(() => {
    apiLogout();
    setSignedIn(false);
    router.replace("/login");
  }, [router]);

  return <AuthContext.Provider value={{ loading, signedIn, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
