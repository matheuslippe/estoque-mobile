import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

const ACCESS_KEY = "estoque_access_token";
const REFRESH_KEY = "estoque_refresh_token";

function isBrowser() {
  return typeof window !== "undefined";
}

export const tokenStorage = {
  getAccess: () => (isBrowser() ? localStorage.getItem(ACCESS_KEY) : null),
  getRefresh: () => (isBrowser() ? localStorage.getItem(REFRESH_KEY) : null),
  save(access: string, refresh: string) {
    if (!isBrowser()) return;
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  saveAccess(access: string) {
    if (isBrowser()) localStorage.setItem(ACCESS_KEY, access);
  },
  clear() {
    if (!isBrowser()) return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${API_URL}/token/refresh/`, { refresh });
    tokenStorage.saveAccess(data.access);
    return data.access as string;
  } catch {
    tokenStorage.clear();
    return null;
  }
}

let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.set("Authorization", `Bearer ${newToken}`);
        return api(original);
      }
      onSessionExpired?.();
    }
    return Promise.reject(error);
  }
);

export async function login(username: string, password: string) {
  const { data } = await api.post("/token/", { username, password });
  tokenStorage.save(data.access, data.refresh);
}

export async function register(username: string, password: string) {
  const { data } = await api.post("/register/", { username, password });
  tokenStorage.save(data.access, data.refresh);
}

export async function requestPasswordReset(username: string) {
  await api.post("/password-reset/request/", { username });
}

export async function confirmPasswordReset(username: string, code: string, newPassword: string) {
  const { data } = await api.post("/password-reset/confirm/", {
    username,
    code,
    new_password: newPassword,
  });
  tokenStorage.save(data.access, data.refresh);
}

export async function telegramLinkStatus() {
  const { data } = await api.get<{ linked: boolean }>("/telegram/link/status/");
  return data.linked;
}

export async function requestTelegramLink() {
  const { data } = await api.post<{ code: string; expires_in_minutes: number }>("/telegram/link/request/");
  return data;
}

export function logout() {
  tokenStorage.clear();
}

export function isAuthenticated() {
  return tokenStorage.getAccess() !== null;
}
