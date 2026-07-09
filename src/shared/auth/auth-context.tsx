"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  clearStoredInternalSession,
  getStoredInternalSession,
  setStoredInternalSession,
} from "./session-storage";
import {
  getInternalMe,
  loginInternal,
  logoutInternal,
  normalizeInternalSession,
} from "./auth-service";
import type { InternalSession, InternalUser, LoginInput } from "./types";

type AuthContextValue = {
  session: InternalSession | null;
  user: InternalUser | null;
  permissions: string[];
  roles: string[];
  isHydrated: boolean;
  isRefreshingProfile: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<InternalSession | null>;
  restoreSessionFromServer: () => Promise<InternalSession | null>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [session, setSession] = useState<InternalSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);

  useEffect(() => {
    setSession(getStoredInternalSession());
    setIsHydrated(true);
  }, []);

  const setAndStoreSession = useCallback((nextSession: InternalSession) => {
    setStoredInternalSession(nextSession);
    setSession(nextSession);
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      setAndStoreSession(await loginInternal(input));
    },
    [setAndStoreSession],
  );

  const logout = useCallback(async () => {
    const refreshToken = session?.refreshToken;
    clearStoredInternalSession();
    setSession(null);
    try {
      await logoutInternal(refreshToken);
    } catch {
      // Logout local siempre debe completarse. No se imprimen tokens ni payloads sensibles.
    }
  }, [session?.refreshToken]);

  const restoreSessionFromServer = useCallback(async () => {
    setIsRefreshingProfile(true);
    try {
      const profile = await getInternalMe();
      const nextSession = normalizeInternalSession(profile);
      setAndStoreSession(nextSession);
      return nextSession;
    } catch (error) {
      clearStoredInternalSession();
      setSession(null);
      if (isAtlasApiError(error) && [401, 403].includes(error.status)) {
        return null;
      }
      throw error;
    } finally {
      setIsRefreshingProfile(false);
    }
  }, [setAndStoreSession]);

  const refreshProfile = useCallback(async () => {
    const current = getStoredInternalSession();
    if (!current) return restoreSessionFromServer();
    setIsRefreshingProfile(true);
    try {
      const profile = await getInternalMe();
      const nextSession = normalizeInternalSession({ ...current, ...profile });
      setAndStoreSession(nextSession);
      return nextSession;
    } catch (error) {
      if (
        isAtlasApiError(error) &&
        (error.status === 401 || error.status === 403)
      ) {
        clearStoredInternalSession();
        setSession(null);
        return null;
      }
      throw error;
    } finally {
      setIsRefreshingProfile(false);
    }
  }, [restoreSessionFromServer, setAndStoreSession]);

  const value = useMemo<AuthContextValue>(() => {
    const permissions = session?.user.permissions ?? [];
    const roles = session?.user.roles ?? [];

    return {
      session,
      user: session?.user ?? null,
      permissions,
      roles,
      isHydrated,
      isRefreshingProfile,
      login,
      logout,
      refreshProfile,
      restoreSessionFromServer,
      hasPermission: (permission: string) => permissions.includes(permission),
      hasAnyPermission: (required: string[]) =>
        required.length === 0 ||
        required.some((permission) => permissions.includes(permission)),
    };
  }, [
    session,
    isHydrated,
    isRefreshingProfile,
    login,
    logout,
    refreshProfile,
    restoreSessionFromServer,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return context;
}
