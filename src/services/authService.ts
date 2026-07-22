import { api, setStoredToken } from "@/lib/api";
import type { AdminUser } from "@/types";

export interface SignInPayload {
  phone?: string;
  email?: string;
  password: string;
}

/**
 * Backend response shape for POST /auth/signin (Kiwoo's successWrapper):
 *   { statusCode, message, data: { id, auth_token, name, email, role, balances } }
 */
interface SignInResponse {
  statusCode?: number;
  message?: string[];
  data?: {
    id?: number;
    auth_token?: string;
    name?: string;
    email?: string;
    role?: string;
    balances?: unknown[];
  };
  // Defensive: also accept flat / alt token names in case the envelope changes.
  token?: string;
  access_token?: string;
  accessToken?: string;
  user?: AdminUser;
}

function extractToken(res: SignInResponse): string | undefined {
  return res.data?.auth_token ?? res.token ?? res.access_token ?? res.accessToken;
}

function extractUser(res: SignInResponse): AdminUser | undefined {
  if (res.user) return res.user;
  const d = res.data;
  if (!d || d.id === undefined) return undefined;
  return {
    id: d.id,
    name: d.name,
    email: d.email,
    role: d.role,
  };
}

export const authService = {
  async signIn(payload: SignInPayload): Promise<{ token: string; user?: AdminUser }> {
    // The mobile API requires `notification_token` (used for FCM push delivery
    // on the phone). The admin web doesn't receive pushes — send a stable
    // marker so the backend's `@IsNotEmpty` check passes without polluting
    // the mobile notification routing.
    const body = {
      ...payload,
      notification_token: "kiwoo-admin-web",
    };
    const { data } = await api.post<SignInResponse>("auth/signin", body);
    const token = extractToken(data);
    if (!token) throw new Error("No token returned from /auth/signin");
    setStoredToken(token);
    return { token, user: extractUser(data) };
  },

  async getProfile(): Promise<AdminUser> {
    // Admin RBAC profile (id, email, phone, role, roles, permissions).
    // Falls back to /user/profile if /admin/me is unavailable.
    try {
      const { data } = await api.get<AdminUser>("admin/me");
      return data;
    } catch {
      const { data } = await api.get<AdminUser>("user/profile");
      return data;
    }
  },

  signOut() {
    setStoredToken(null);
  },
};
