import { api, tokenStorage } from "./client";

export async function login(username: string, password: string) {
  const { data } = await api.post("/token/", { username, password });
  await tokenStorage.save(data.access, data.refresh, username);
}

export async function register(username: string, password: string) {
  const { data } = await api.post("/register/", { username, password });
  await tokenStorage.save(data.access, data.refresh, username);
}

export async function logout() {
  await tokenStorage.clear();
}

export async function isAuthenticated() {
  return (await tokenStorage.getAccess()) !== null;
}

export async function getStoredUsername() {
  return tokenStorage.getUsername();
}
