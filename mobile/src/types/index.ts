export type StatusItem = "ok" | "baixo" | "zerado";

export interface Item {
  id: number;
  nome: string;
  categoria: string;
  qtd: number;
  qtd_minima: number;
  status: StatusItem;
  percentual: number;
  qtd_a_comprar: number;
}

export type TipoMovimentacao = "ENTRADA" | "SAIDA" | "AJUSTE" | "CADASTRO" | "EXCLUSAO";
export type OrigemMovimentacao = "app" | "bot";

export interface Movimentacao {
  id: number;
  item: number | null;
  item_nome: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  data_hora: string;
  origem: OrigemMovimentacao;
  obs: string | null;
}

export interface ItemEmFalta {
  id: number;
  nome: string;
  categoria: string;
  qtd: number;
  qtd_minima: number;
  qtd_a_comprar: number;
  zerado: boolean;
}

export interface AnaliseItem {
  item: string;
  categoria: string;
  qtd: number;
  consumo_total: number;
  consumo_diario: number;
  dias_restantes: number | null;
  dias_obs: number;
  por_dia: { data: string; retiradas: number }[];
}
