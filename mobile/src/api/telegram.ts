import { api } from "./client";

export async function telegramLinkStatus() {
  const { data } = await api.get<{ linked: boolean }>("/telegram/link/status/");
  return data.linked;
}

export async function requestTelegramLink() {
  const { data } = await api.post<{ code: string; expires_in_minutes: number }>("/telegram/link/request/");
  return data;
}
