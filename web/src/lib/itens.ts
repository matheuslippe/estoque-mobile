import { api } from "./api";
import { AnaliseItem, Item } from "./types";

export async function listarItens(params?: { categoria?: string; busca?: string }) {
  const { data } = await api.get<Item[]>("/itens/", { params });
  return data;
}

export async function obterItem(id: number) {
  const { data } = await api.get<Item>(`/itens/${id}/`);
  return data;
}

export async function criarItem(payload: { nome: string; categoria: string; qtd: number; qtd_minima: number }) {
  const { data } = await api.post<Item>("/itens/", payload);
  return data;
}

export async function ajustarItem(
  id: number,
  payload: Partial<{ nome: string; categoria: string; qtd: number; qtd_minima: number }>
) {
  const { data } = await api.patch<Item>(`/itens/${id}/`, payload);
  return data;
}

export async function excluirItem(id: number) {
  await api.delete(`/itens/${id}/`);
}

export async function movimentarItem(id: number, tipo: "ENTRADA" | "SAIDA", qtd: number, obs?: string) {
  const { data } = await api.post<Item>(`/itens/${id}/movimentar/`, { tipo, qtd, obs });
  return data;
}

export async function analiseItem(id: number, dias = 30) {
  const { data } = await api.get<AnaliseItem>(`/itens/${id}/analise/`, { params: { dias } });
  return data;
}
