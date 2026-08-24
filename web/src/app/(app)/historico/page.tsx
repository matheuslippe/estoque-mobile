"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarHistorico } from "@/lib/historico";
import { listarItens } from "@/lib/itens";
import { TipoMovimentacao } from "@/lib/types";
import { baixarCsv } from "@/lib/csv";

const PERIODOS = [
  { label: "7 dias", dias: 7 },
  { label: "30 dias", dias: 30 },
  { label: "90 dias", dias: 90 },
  { label: "Tudo", dias: null as number | null },
];

const TIPO_LABEL: Record<TipoMovimentacao, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saida",
  AJUSTE: "Ajuste",
  CADASTRO: "Cadastro",
  EXCLUSAO: "Exclusao",
};

function corTipo(tipo: TipoMovimentacao) {
  if (tipo === "ENTRADA" || tipo === "CADASTRO") return "text-emerald-600";
  if (tipo === "SAIDA" || tipo === "EXCLUSAO") return "text-red-600";
  return "text-amber-600";
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function HistoricoPage() {
  const [periodo, setPeriodo] = useState(PERIODOS[1]);
  const [itemFiltro, setItemFiltro] = useState<number | null>(null);

  const { data: itens = [] } = useQuery({ queryKey: ["itens"], queryFn: () => listarItens() });

  const params = useMemo(() => {
    const p: { item?: number; data_inicio?: string } = {};
    if (itemFiltro) p.item = itemFiltro;
    if (periodo.dias) {
      const desde = new Date();
      desde.setDate(desde.getDate() - periodo.dias);
      p.data_inicio = desde.toISOString().slice(0, 10);
    }
    return p;
  }, [itemFiltro, periodo]);

  const { data: movs = [], isLoading } = useQuery({
    queryKey: ["historico", params],
    queryFn: () => listarHistorico(params),
  });

  function exportarCsv() {
    baixarCsv(
      "historico.csv",
      ["Item", "Tipo", "Quantidade", "Data/Hora", "Origem", "Observacao"],
      movs.map((m) => [m.item_nome, TIPO_LABEL[m.tipo], m.quantidade, formatarData(m.data_hora), m.origem, m.obs ?? ""])
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">Historico</h1>
        <button
          onClick={exportarCsv}
          disabled={movs.length === 0}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.label}
            onClick={() => setPeriodo(p)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              p.dias === periodo.dias ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setItemFiltro(null)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            itemFiltro === null ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Todos os itens
        </button>
        {itens.map((item) => (
          <button
            key={item.id}
            onClick={() => setItemFiltro(item.id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              itemFiltro === item.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.nome}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-slate-400">Carregando...</p>
      ) : movs.length === 0 ? (
        <p className="py-10 text-center text-slate-400">Nenhuma movimentacao no periodo.</p>
      ) : (
        <div className="space-y-2">
          {movs.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full bg-current ${corTipo(m.tipo)}`} />
                <div>
                  <p className="text-sm font-medium text-slate-900">{m.item_nome}</p>
                  <p className="text-xs text-slate-500">
                    {TIPO_LABEL[m.tipo]} · {formatarData(m.data_hora)}
                    {m.obs ? ` · ${m.obs}` : ""}
                  </p>
                </div>
              </div>
              <span className={`text-sm font-bold ${corTipo(m.tipo)}`}>
                {m.tipo === "SAIDA" || m.tipo === "EXCLUSAO" ? "-" : "+"}
                {m.quantidade}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
