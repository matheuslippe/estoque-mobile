import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// expo-secure-store nao tem implementacao web (so iOS/Android nativos).
// No navegador cai pra localStorage; no app real (Expo Go / build) usa o SecureStore.
const storage = {
  async getItem(key: string) {
    return Platform.OS === "web" ? localStorage.getItem(key) : SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    return Platform.OS === "web" ? localStorage.setItem(key, value) : SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string) {
    return Platform.OS === "web" ? localStorage.removeItem(key) : SecureStore.deleteItemAsync(key);
  },
};

// Emulador Android nao enxerga "localhost" da maquina host - usa o alias 10.0.2.2.
// iOS Simulator e Expo Go num device fisico (mesma rede) usam o IP normal.
// Configuravel via EXPO_PUBLIC_API_URL no .env do mobile.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

const ACCESS_KEY = "estoque_access_token";
const REFRESH_KEY = "estoque_refresh_token";

export const tokenStorage = {
  async getAccess() {
    return storage.getItem(ACCESS_KEY);
  },
  async getRefresh() {
    return storage.getItem(REFRESH_KEY);
  },
  async save(access: string, refresh: string) {
    await storage.setItem(ACCESS_KEY, access);
    await storage.setItem(REFRESH_KEY, refresh);
  },
  async saveAccess(access: string) {
    await storage.setItem(ACCESS_KEY, access);
  },
  async clear() {
    await storage.deleteItem(ACCESS_KEY);
    await storage.deleteItem(REFRESH_KEY);
  },
};

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStorage.getAccess();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

// Fila simples pra nao disparar N refreshes em paralelo quando varias
// chamadas tomam 401 ao mesmo tempo (ex.: a Home carrega itens + lista de
// compras juntas).
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await tokenStorage.getRefresh();
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${API_URL}/token/refresh/`, { refresh });
    await tokenStorage.saveAccess(data.access);
    return data.access as string;
  } catch {
    await tokenStorage.clear();
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
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
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
