import { api, tokenStorage } from "./client";

export async function login(username: string, password: string) {
  const { data } = await api.post("/token/", { username, password });
  await tokenStorage.save(data.access, data.refresh);
}

export async function logout() {
  await tokenStorage.clear();
}

export async function isAuthenticated() {
  return (await tokenStorage.getAccess()) !== null;
}
