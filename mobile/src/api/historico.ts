import { api } from "./client";
import { Movimentacao } from "../types";

export async function listarHistorico(params?: { item?: number; data_inicio?: string; data_fim?: string }) {
  const { data } = await api.get<Movimentacao[]>("/movimentacoes/", { params });
  return data;
}
