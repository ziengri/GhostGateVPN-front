import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

import { api } from "../api/client";
import type { TokenResponse, User } from "../types";

const ACCESS_KEY = "ghostgate.access_token";
const REFRESH_KEY = "ghostgate.refresh_token";
const USER_KEY = "ghostgate.user";

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setSession: (session: TokenResponse) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readUser());
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(ACCESS_KEY));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem(REFRESH_KEY));

  const clearSession = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  const setSession = useCallback((session: TokenResponse) => {
    localStorage.setItem(ACCESS_KEY, session.access_token);
    localStorage.setItem(REFRESH_KEY, session.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    setAccessToken(session.access_token);
    setRefreshToken(session.refresh_token);
    setUser(session.user);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_KEY);
    if (!token) return;
    const nextUser = await api.me(token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem(REFRESH_KEY);
    if (token) {
      try {
        await api.logout(token);
      } catch {
        // The local session must be cleared even if the server token is already invalid.
      }
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: Boolean(user && accessToken),
      setSession,
      refreshUser,
      logout,
    }),
    [accessToken, logout, refreshToken, refreshUser, setSession, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

