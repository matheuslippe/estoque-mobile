import { api } from "./client";
import { ItemEmFalta } from "../types";

export async function listaCompras() {
  const { data } = await api.get<ItemEmFalta[]>("/lista-compras/");
  return data;
}

export async function reporFaltantes() {
  const { data } = await api.post<{ detail: string; repostos: number }>("/reposicao-lote/");
  return data;
}
