import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getStoredToken, setStoredToken } from "@/lib/api";
import { authService, SignInPayload } from "@/services/authService";
import type { AdminUser, Role } from "@/types";

interface AuthContextValue {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  signIn: (payload: SignInPayload) => Promise<void>;
  signOut: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(!!token);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const profile = await authService.getProfile();
        if (!cancelled) setUser(profile);
      } catch {
        if (!cancelled) {
          setStoredToken(null);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const signIn = useCallback(async (payload: SignInPayload) => {
    const { token: t, user: u } = await authService.signIn(payload);
    setToken(t);
    if (u) setUser(u);
    else {
      try {
        const profile = await authService.getProfile();
        setUser(profile);
      } catch {
        // profile fetch failure is non-fatal at sign-in time
      }
    }
  }, []);

  const signOut = useCallback(() => {
    authService.signOut();
    setToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]) => {
      if (!user) return false;
      if (roles.length === 0) return true;
      const userRoles = user.roles ?? (user.role ? [user.role] : []);
      return roles.some((r) => userRoles.includes(r));
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, signIn, signOut, hasRole }),
    [user, token, loading, signIn, signOut, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
