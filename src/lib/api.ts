import axios, { AxiosError, AxiosInstance } from "axios";

const TOKEN_KEY = "kiwoo.admin.token";
const BASE_URL_KEY = "kiwoo.admin.baseUrl";

export function getStoredBaseUrl(): string {
  return (
    localStorage.getItem(BASE_URL_KEY) ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3000/"
  );
}

export function setStoredBaseUrl(url: string) {
  const normalized = url.endsWith("/") ? url : `${url}/`;
  localStorage.setItem(BASE_URL_KEY, normalized);
  api.defaults.baseURL = normalized;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export const api: AxiosInstance = axios.create({
  baseURL: getStoredBaseUrl(),
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      setStoredToken(null);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(err: unknown): string {
  const e = err as AxiosError<{ message?: string | string[] }>;
  const data = e?.response?.data;
  if (data?.message) {
    return Array.isArray(data.message) ? data.message.join(", ") : data.message;
  }
  return e?.message || "Unknown error";
}
